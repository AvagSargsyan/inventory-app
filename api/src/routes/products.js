import { Router } from 'express';
import { body } from 'express-validator';
import { pool } from '../db/pool.js';
import { FOREIGN_KEY_VIOLATION, HttpError } from '../middleware/errorHandler.js';
import { requireIdParam, validate } from '../middleware/validate.js';
import { toCents } from '../lib/money.js';

export const productsRouter = Router();

const PRODUCT_COLUMNS = `p.id, p.category_id, c.name AS category_name, p.name,
                         p.price_cents, p.stock_quantity, p.image_url,
                         p.created_at, p.updated_at`;

// Column names cannot be parameterised, so sort keys map to fixed SQL.
const SORT_OPTIONS = {
  name_asc: 'p.name ASC',
  name_desc: 'p.name DESC',
  price_asc: 'p.price_cents ASC',
  price_desc: 'p.price_cents DESC',
  stock_asc: 'p.stock_quantity ASC',
  stock_desc: 'p.stock_quantity DESC',
  newest: 'p.created_at DESC',
};

const productBody = [
  body('name')
    .trim()
    .notEmpty().withMessage('Name is required.')
    .bail()
    .isLength({ min: 2, max: 80 }).withMessage('Name must be between 2 and 80 characters.'),
  body('category_id')
    .notEmpty().withMessage('Category is required.')
    .bail()
    .isInt({ min: 1 }).withMessage('Category is required.'),
  body('price')
    .notEmpty().withMessage('Price is required.')
    .bail()
    .custom((value) => {
      if (!/^\d+(\.\d{1,2})?$/.test(String(value).trim())) {
        throw new Error('Price must be a non-negative number with at most 2 decimal places.');
      }
      if (Number(value) >= 1_000_000) {
        throw new Error('Price must be less than 1,000,000.');
      }
      return true;
    }),
  body('stock_quantity')
    .optional({ values: 'null' })
    .isInt({ min: 0, max: 99_999 }).withMessage('Stock quantity must be a whole number between 0 and 99,999.'),
  body('image_url')
    .optional({ values: 'null' })
    .trim()
    .isLength({ max: 500 }).withMessage('Image URL must be 500 characters or fewer.'),
];

// On insert or update a foreign key violation means the category does not
// exist, which is a validation failure rather than a conflict.
function asMissingCategory(error) {
  return error.code === FOREIGN_KEY_VIOLATION
    ? new HttpError(422, 'Validation failed', { category_id: 'Category does not exist.' })
    : error;
}

productsRouter.get('/', async (req, res) => {
  const conditions = [];
  const values = [];

  if (req.query.category !== undefined) {
    const categoryId = Number(req.query.category);
    if (!Number.isInteger(categoryId) || categoryId < 1) {
      throw new HttpError(400, 'Invalid category filter');
    }
    values.push(categoryId);
    conditions.push(`p.category_id = $${values.length}`);
  }

  const search = String(req.query.q ?? '').trim();
  if (search !== '') {
    values.push(search);
    conditions.push(`p.name ILIKE '%' || $${values.length} || '%'`);
  }

  const orderBy = SORT_OPTIONS[req.query.sort ?? 'name_asc'];
  if (!orderBy) {
    throw new HttpError(400, `Invalid sort. Allowed: ${Object.keys(SORT_OPTIONS).join(', ')}`);
  }

  const { rows } = await pool.query(
    `SELECT ${PRODUCT_COLUMNS}
       FROM products p
       JOIN categories c ON c.id = p.category_id
      ${conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''}
      ORDER BY ${orderBy}`,
    values,
  );
  res.json(rows);
});

productsRouter.get('/:id', requireIdParam, async (req, res) => {
  const { rows } = await pool.query(
    `SELECT ${PRODUCT_COLUMNS}
       FROM products p
       JOIN categories c ON c.id = p.category_id
      WHERE p.id = $1`,
    [req.params.id],
  );
  if (rows.length === 0) throw new HttpError(404, 'Product not found');
  res.json(rows[0]);
});

productsRouter.post('/', productBody, validate, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `INSERT INTO products (category_id, name, price_cents, stock_quantity, image_url)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id`,
      [
        req.body.category_id,
        req.body.name,
        toCents(req.body.price),
        req.body.stock_quantity ?? 0,
        req.body.image_url || null,
      ],
    );
    const created = await pool.query(
      `SELECT ${PRODUCT_COLUMNS}
         FROM products p JOIN categories c ON c.id = p.category_id
        WHERE p.id = $1`,
      [rows[0].id],
    );
    res.status(201).json(created.rows[0]);
  } catch (error) {
    throw asMissingCategory(error);
  }
});

productsRouter.put('/:id', requireIdParam, productBody, validate, async (req, res) => {
  try {
    const { rowCount } = await pool.query(
      `UPDATE products
          SET category_id = $1, name = $2, price_cents = $3,
              stock_quantity = $4, image_url = $5, updated_at = now()
        WHERE id = $6`,
      [
        req.body.category_id,
        req.body.name,
        toCents(req.body.price),
        req.body.stock_quantity ?? 0,
        req.body.image_url || null,
        req.params.id,
      ],
    );
    if (rowCount === 0) throw new HttpError(404, 'Product not found');

    const { rows } = await pool.query(
      `SELECT ${PRODUCT_COLUMNS}
         FROM products p JOIN categories c ON c.id = p.category_id
        WHERE p.id = $1`,
      [req.params.id],
    );
    res.json(rows[0]);
  } catch (error) {
    throw asMissingCategory(error);
  }
});

productsRouter.delete('/:id', requireIdParam, async (req, res) => {
  const { rowCount } = await pool.query('DELETE FROM products WHERE id = $1', [req.params.id]);
  if (rowCount === 0) throw new HttpError(404, 'Product not found');
  res.status(204).end();
});
