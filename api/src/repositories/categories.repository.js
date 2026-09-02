import { pool } from "../db/pool.js";

const COLUMNS = "id, name, description, created_at, updated_at";

const SELECT_WITH_COUNT = `
  SELECT c.id, c.name, c.description, c.created_at, c.updated_at,
         COUNT(p.id)::int AS product_count
    FROM categories c
    LEFT JOIN products p ON p.category_id = c.id`;

export async function findAll() {
  const { rows } = await pool.query(`${SELECT_WITH_COUNT} GROUP BY c.id ORDER BY c.name`);
  return rows;
}

export async function findById(id) {
  const { rows } = await pool.query(`${SELECT_WITH_COUNT} WHERE c.id = $1 GROUP BY c.id`, [id]);
  return rows[0] ?? null;
}

export async function exists(id, db = pool) {
  const { rowCount } = await db.query("SELECT 1 FROM categories WHERE id = $1", [id]);
  return rowCount > 0;
}

// FOR UPDATE conflicts with the FOR KEY SHARE lock an INSERT into products
// takes, so no product can join this category mid-transaction.
export async function existsForUpdate(id, db) {
  const { rowCount } = await db.query("SELECT 1 FROM categories WHERE id = $1 FOR UPDATE", [id]);
  return rowCount > 0;
}

export async function insert({ name, description }) {
  const { rows } = await pool.query(
    `INSERT INTO categories (name, description)
     VALUES ($1, $2)
     RETURNING ${COLUMNS}`,
    [name, description],
  );
  return rows[0];
}

export async function update(id, { name, description }) {
  const { rows } = await pool.query(
    `UPDATE categories
        SET name = $1, description = $2, updated_at = now()
      WHERE id = $3
      RETURNING ${COLUMNS}`,
    [name, description, id],
  );
  return rows[0] ?? null;
}

export async function remove(id, db = pool) {
  const { rowCount } = await db.query("DELETE FROM categories WHERE id = $1", [id]);
  return rowCount > 0;
}
