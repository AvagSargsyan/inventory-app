import { pool } from "../db/pool.js";

const COLUMNS = `p.id, p.category_id, c.name AS category_name, p.name,
                 p.price_cents, p.stock_quantity, p.image_url,
                 p.created_at, p.updated_at`;

const FROM_WITH_CATEGORY = "FROM products p JOIN categories c ON c.id = p.category_id";

// Column names cannot be parameterised, so sort keys map to fixed SQL.
export const SORT_OPTIONS = {
  name_asc: "p.name ASC",
  name_desc: "p.name DESC",
  price_asc: "p.price_cents ASC",
  price_desc: "p.price_cents DESC",
  stock_asc: "p.stock_quantity ASC",
  stock_desc: "p.stock_quantity DESC",
  newest: "p.created_at DESC",
};

export async function findAll({ categoryId, search, sort }) {
  const conditions = [];
  const values = [];

  if (categoryId !== undefined) {
    values.push(categoryId);
    conditions.push(`p.category_id = $${values.length}`);
  }
  if (search) {
    values.push(search);
    conditions.push(`p.name ILIKE '%' || $${values.length} || '%'`);
  }

  const { rows } = await pool.query(
    `SELECT ${COLUMNS}
       ${FROM_WITH_CATEGORY}
      ${conditions.length ? `WHERE ${conditions.join(" AND ")}` : ""}
      ORDER BY ${SORT_OPTIONS[sort]}`,
    values,
  );
  return rows;
}

export async function findById(id) {
  const { rows } = await pool.query(`SELECT ${COLUMNS} ${FROM_WITH_CATEGORY} WHERE p.id = $1`, [
    id,
  ]);
  return rows[0] ?? null;
}

// Without the category name, matching what GET /api/categories/:id/products
// has always returned.
export async function findByCategory(categoryId) {
  const { rows } = await pool.query(
    `SELECT id, category_id, name, price_cents, stock_quantity, image_url, created_at, updated_at
       FROM products
      WHERE category_id = $1
      ORDER BY name`,
    [categoryId],
  );
  return rows;
}

export async function findImage(id) {
  const { rows } = await pool.query("SELECT image_url FROM products WHERE id = $1", [id]);
  return rows[0] ?? null;
}

export async function countByCategory(categoryId) {
  const { rows } = await pool.query(
    "SELECT COUNT(*)::int AS count FROM products WHERE category_id = $1",
    [categoryId],
  );
  return rows[0].count;
}

export async function namesSharedWith(sourceId, targetId) {
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

export async function insert({ categoryId, name, priceCents, stockQuantity, imageUrl }) {
  const { rows } = await pool.query(
    `INSERT INTO products (category_id, name, price_cents, stock_quantity, image_url)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id`,
    [categoryId, name, priceCents, stockQuantity, imageUrl],
  );
  // RETURNING cannot reach the joined category name, so read the row back.
  return findById(rows[0].id);
}

export async function update(id, { categoryId, name, priceCents, stockQuantity, imageUrl }) {
  const { rowCount } = await pool.query(
    `UPDATE products
        SET category_id = $1, name = $2, price_cents = $3,
            stock_quantity = $4, image_url = $5, updated_at = now()
      WHERE id = $6`,
    [categoryId, name, priceCents, stockQuantity, imageUrl, id],
  );
  return rowCount > 0 ? findById(id) : null;
}

export async function remove(id) {
  const { rows } = await pool.query("DELETE FROM products WHERE id = $1 RETURNING image_url", [id]);
  return rows[0] ?? null;
}

export async function moveToCategory(sourceId, targetId, db = pool) {
  await db.query(
    "UPDATE products SET category_id = $1, updated_at = now() WHERE category_id = $2",
    [targetId, sourceId],
  );
}
