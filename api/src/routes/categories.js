import { Router } from 'express';
import { body } from 'express-validator';
import { pool } from '../db/pool.js';
import { HttpError, RESTRICT_VIOLATION, UNIQUE_VIOLATION } from '../middleware/errorHandler.js';
import { requireIdParam, validate } from '../middleware/validate.js';

export const categoriesRouter = Router();

const CATEGORY_COLUMNS = 'id, name, description, created_at, updated_at';

const categoryBody = [
  body('name')
    .trim()
    .notEmpty().withMessage('Name is required.')
    .bail()
    .isLength({ min: 2, max: 60 }).withMessage('Name must be between 2 and 60 characters.'),
  body('description')
    .optional({ values: 'null' })
    .trim()
    .isLength({ max: 500 }).withMessage('Description must be 500 characters or fewer.'),
];

categoriesRouter.get('/', async (_req, res) => {
  const { rows } = await pool.query(
    `SELECT c.id, c.name, c.description, c.created_at, c.updated_at,
            COUNT(p.id)::int AS product_count
       FROM categories c
       LEFT JOIN products p ON p.category_id = c.id
      GROUP BY c.id
      ORDER BY c.name`,
  );
  res.json(rows);
});

categoriesRouter.get('/:id', requireIdParam, async (req, res) => {
  const { rows } = await pool.query(
    `SELECT c.id, c.name, c.description, c.created_at, c.updated_at,
            COUNT(p.id)::int AS product_count
       FROM categories c
       LEFT JOIN products p ON p.category_id = c.id
      WHERE c.id = $1
      GROUP BY c.id`,
    [req.params.id],
  );
  if (rows.length === 0) throw new HttpError(404, 'Category not found');
  res.json(rows[0]);
});

categoriesRouter.get('/:id/products', requireIdParam, async (req, res) => {
  const category = await pool.query('SELECT 1 FROM categories WHERE id = $1', [req.params.id]);
  if (category.rowCount === 0) throw new HttpError(404, 'Category not found');

  const { rows } = await pool.query(
    `SELECT id, category_id, name, price_cents, stock_quantity, image_url, created_at, updated_at
       FROM products
      WHERE category_id = $1
      ORDER BY name`,
    [req.params.id],
  );
  res.json(rows);
});

categoriesRouter.post('/', categoryBody, validate, async (req, res) => {
  const { rows } = await pool.query(
    `INSERT INTO categories (name, description)
     VALUES ($1, $2)
     RETURNING ${CATEGORY_COLUMNS}`,
    [req.body.name, req.body.description ?? null],
  );
  res.status(201).json(rows[0]);
});

categoriesRouter.put('/:id', requireIdParam, categoryBody, validate, async (req, res) => {
  const { rows } = await pool.query(
    `UPDATE categories
        SET name = $1, description = $2, updated_at = now()
      WHERE id = $3
      RETURNING ${CATEGORY_COLUMNS}`,
    [req.body.name, req.body.description ?? null, req.params.id],
  );
  if (rows.length === 0) throw new HttpError(404, 'Category not found');
  res.json(rows[0]);
});

// Moves every product into another category and deletes the original, as one
// unit. Runs on a single checked-out client: pool.query would hand each
// statement a different connection, leaving BEGIN and COMMIT on separate
// sessions.
async function reassignAndDelete(sourceId, targetId) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // FOR UPDATE conflicts with the FOR KEY SHARE lock an INSERT into products
    // takes, so no product can join this category mid-transaction.
    const source = await client.query('SELECT 1 FROM categories WHERE id = $1 FOR UPDATE', [sourceId]);
    if (source.rowCount === 0) throw new HttpError(404, 'Category not found');

    const target = await client.query('SELECT 1 FROM categories WHERE id = $1', [targetId]);
    if (target.rowCount === 0) {
      throw new HttpError(422, 'Validation failed', { reassign_to: 'Category does not exist.' });
    }

    await client.query(
      'UPDATE products SET category_id = $1, updated_at = now() WHERE category_id = $2',
      [targetId, sourceId],
    );
    await client.query('DELETE FROM categories WHERE id = $1', [sourceId]);

    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

async function describeNameCollisions(sourceId, targetId) {
  const { rows } = await pool.query(
    `SELECT s.name
       FROM products s
      WHERE s.category_id = $1
        AND EXISTS (SELECT 1 FROM products t WHERE t.category_id = $2 AND t.name = s.name)
      ORDER BY s.name`,
    [sourceId, targetId],
  );
  return rows.map((row) => row.name);
}

categoriesRouter.delete('/:id', requireIdParam, async (req, res) => {
  const sourceId = Number(req.params.id);

  if (req.query.reassign_to !== undefined) {
    const targetId = Number(req.query.reassign_to);
    if (!Number.isInteger(targetId) || targetId < 1) {
      throw new HttpError(400, 'Invalid reassign_to');
    }
    if (targetId === sourceId) {
      throw new HttpError(400, 'reassign_to must be a different category');
    }

    try {
      await reassignAndDelete(sourceId, targetId);
    } catch (error) {
      if (error.code !== UNIQUE_VIOLATION) throw error;
      const names = await describeNameCollisions(sourceId, targetId);
      throw new HttpError(
        409,
        `Cannot reassign: the target category already has ${names.map((n) => `"${n}"`).join(', ')}.`,
      );
    }
    return res.status(204).end();
  }

  try {
    const { rowCount } = await pool.query('DELETE FROM categories WHERE id = $1', [sourceId]);
    if (rowCount === 0) throw new HttpError(404, 'Category not found');
    res.status(204).end();
  } catch (error) {
    if (error.code !== RESTRICT_VIOLATION) throw error;

    // The category is not empty. Report how many products block the delete so
    // the client can offer to reassign them.
    const { rows } = await pool.query(
      'SELECT COUNT(*)::int AS product_count FROM products WHERE category_id = $1',
      [sourceId],
    );
    const count = rows[0].product_count;
    res.status(409).json({
      error: `Category still has ${count} product${count === 1 ? '' : 's'}.`,
      product_count: count,
    });
  }
});
