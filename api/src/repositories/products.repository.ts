import { pool } from "../db/pool.ts";
import type { Queryable } from "../db/pool.ts";

// Mirrors the products table. Returned by the queries that do not join
// categories — GET /api/categories/:id/products, where the category is
// already the resource being viewed.
export type ProductRow = {
  id: number;
  category_id: number;
  name: string;
  price_cents: number;
  stock_quantity: number;
  image_url: string | null;
  created_at: Date;
  updated_at: Date;
};

export type ProductWithCategoryRow = ProductRow & { category_name: string };

export type ProductRowInput = {
  categoryId: string | number;
  name: string;
  priceCents: number;
  stockQuantity: string | number;
  imageUrl: string | null;
};

export type SortKey = keyof typeof SORT_OPTIONS;

export type ProductQuery = {
  categoryId: number | undefined;
  search: string;
  sort: SortKey;
};

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
} as const satisfies Record<string, string>;

export const isSortKey = (value: string): value is SortKey => value in SORT_OPTIONS;

export async function findAll({
  categoryId,
  search,
  sort,
}: ProductQuery): Promise<ProductWithCategoryRow[]> {
  const conditions: string[] = [];
  const values: unknown[] = [];

  if (categoryId !== undefined) {
    values.push(categoryId);
    conditions.push(`p.category_id = $${values.length}`);
  }
  if (search) {
    values.push(search);
    conditions.push(`p.name ILIKE '%' || $${values.length} || '%'`);
  }

  const { rows } = await pool.query<ProductWithCategoryRow>(
    `SELECT ${COLUMNS}
       ${FROM_WITH_CATEGORY}
      ${conditions.length ? `WHERE ${conditions.join(" AND ")}` : ""}
      ORDER BY ${SORT_OPTIONS[sort]}`,
    values,
  );
  return rows;
}

export async function findById(id: string | number): Promise<ProductWithCategoryRow | null> {
  const { rows } = await pool.query<ProductWithCategoryRow>(
    `SELECT ${COLUMNS} ${FROM_WITH_CATEGORY} WHERE p.id = $1`,
    [id],
  );
  return rows[0] ?? null;
}

// Without the category name, matching what GET /api/categories/:id/products
// has always returned.
export async function findByCategory(categoryId: string | number): Promise<ProductRow[]> {
  const { rows } = await pool.query<ProductRow>(
    `SELECT id, category_id, name, price_cents, stock_quantity, image_url, created_at, updated_at
       FROM products
      WHERE category_id = $1
      ORDER BY name`,
    [categoryId],
  );
  return rows;
}

export async function findImage(
  id: string | number,
): Promise<Pick<ProductRow, "image_url"> | null> {
  const { rows } = await pool.query<Pick<ProductRow, "image_url">>(
    "SELECT image_url FROM products WHERE id = $1",
    [id],
  );
  return rows[0] ?? null;
}

export async function countByCategory(categoryId: string | number): Promise<number> {
  const { rows } = await pool.query<{ count: number }>(
    "SELECT COUNT(*)::int AS count FROM products WHERE category_id = $1",
    [categoryId],
  );
  return rows[0]?.count ?? 0;
}

export async function namesSharedWith(sourceId: number, targetId: number): Promise<string[]> {
  const { rows } = await pool.query<Pick<ProductRow, "name">>(
    `SELECT s.name
       FROM products s
      WHERE s.category_id = $1
        AND EXISTS (SELECT 1 FROM products t WHERE t.category_id = $2 AND t.name = s.name)
      ORDER BY s.name`,
    [sourceId, targetId],
  );
  return rows.map((row) => row.name);
}

export async function insert({
  categoryId,
  name,
  priceCents,
  stockQuantity,
  imageUrl,
}: ProductRowInput): Promise<ProductWithCategoryRow | null> {
  const { rows } = await pool.query<Pick<ProductRow, "id">>(
    `INSERT INTO products (category_id, name, price_cents, stock_quantity, image_url)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id`,
    [categoryId, name, priceCents, stockQuantity, imageUrl],
  );
  // RETURNING cannot reach the joined category name, so read the row back.
  return findById(rows[0]!.id);
}

export async function update(
  id: string | number,
  { categoryId, name, priceCents, stockQuantity, imageUrl }: ProductRowInput,
): Promise<ProductWithCategoryRow | null> {
  const { rowCount } = await pool.query(
    `UPDATE products
        SET category_id = $1, name = $2, price_cents = $3,
            stock_quantity = $4, image_url = $5, updated_at = now()
      WHERE id = $6`,
    [categoryId, name, priceCents, stockQuantity, imageUrl, id],
  );
  return (rowCount ?? 0) > 0 ? findById(id) : null;
}

export async function remove(id: string | number): Promise<Pick<ProductRow, "image_url"> | null> {
  const { rows } = await pool.query<Pick<ProductRow, "image_url">>(
    "DELETE FROM products WHERE id = $1 RETURNING image_url",
    [id],
  );
  return rows[0] ?? null;
}

export async function moveToCategory(
  sourceId: number,
  targetId: number,
  db: Queryable = pool,
): Promise<void> {
  await db.query(
    "UPDATE products SET category_id = $1, updated_at = now() WHERE category_id = $2",
    [targetId, sourceId],
  );
}
