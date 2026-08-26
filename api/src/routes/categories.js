import { Router } from 'express';
import { pool } from '../db/pool.js';

export const categoriesRouter = Router();

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
