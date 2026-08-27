import { Router } from 'express';
import { body } from 'express-validator';
import { pool } from '../db/pool.js';
import { HttpError, RESTRICT_VIOLATION } from '../middleware/errorHandler.js';
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

categoriesRouter.delete('/:id', requireIdParam, async (req, res) => {
  try {
    const { rowCount } = await pool.query('DELETE FROM categories WHERE id = $1', [req.params.id]);
    if (rowCount === 0) throw new HttpError(404, 'Category not found');
    res.status(204).end();
  } catch (error) {
    if (error.code !== RESTRICT_VIOLATION) throw error;

    // The category is not empty. Report how many products block the delete so
    // the client can offer to reassign them.
    const { rows } = await pool.query(
      'SELECT COUNT(*)::int AS product_count FROM products WHERE category_id = $1',
      [req.params.id],
    );
    const count = rows[0].product_count;
    res.status(409).json({
      error: `Category still has ${count} product${count === 1 ? '' : 's'}.`,
      product_count: count,
    });
  }
});
