import { pool } from "../db/pool.ts";
import type { Queryable } from "../db/pool.ts";

// Mirrors the categories table. pg parses TIMESTAMPTZ into a Date; the JSON
// response turns it into an ISO string.
export type CategoryRow = {
  id: number;
  name: string;
  description: string | null;
  created_at: Date;
  updated_at: Date;
};

// product_count is a number only because the query casts ::int — pg maps
// bigint to string to avoid losing precision.
export type CategoryWithCountRow = CategoryRow & { product_count: number };

// The columns insert and update write. Structurally identical to the service's
// CategoryInput today, but it describes the table rather than the request.
export type CategoryRowInput = {
  name: string;
  description: string | null;
};

const COLUMNS = "id, name, description, created_at, updated_at";

const SELECT_WITH_COUNT = `
  SELECT c.id, c.name, c.description, c.created_at, c.updated_at,
         COUNT(p.id)::int AS product_count
    FROM categories c
    LEFT JOIN products p ON p.category_id = c.id`;

export async function findAll(): Promise<CategoryWithCountRow[]> {
  const { rows } = await pool.query<CategoryWithCountRow>(
    `${SELECT_WITH_COUNT} GROUP BY c.id ORDER BY c.name`,
  );
  return rows;
}

export async function findById(id: string | number): Promise<CategoryWithCountRow | null> {
  const { rows } = await pool.query<CategoryWithCountRow>(
    `${SELECT_WITH_COUNT} WHERE c.id = $1 GROUP BY c.id`,
    [id],
  );
  return rows[0] ?? null;
}

export async function exists(id: string | number, db: Queryable = pool): Promise<boolean> {
  const { rowCount } = await db.query("SELECT 1 FROM categories WHERE id = $1", [id]);
  return (rowCount ?? 0) > 0;
}

// FOR UPDATE conflicts with the FOR KEY SHARE lock an INSERT into products
// takes, so no product can join this category mid-transaction.
export async function existsForUpdate(id: number, db: Queryable): Promise<boolean> {
  const { rowCount } = await db.query("SELECT 1 FROM categories WHERE id = $1 FOR UPDATE", [id]);
  return (rowCount ?? 0) > 0;
}

export async function insert({ name, description }: CategoryRowInput): Promise<CategoryRow> {
  const { rows } = await pool.query<CategoryRow>(
    `INSERT INTO categories (name, description)
     VALUES ($1, $2)
     RETURNING ${COLUMNS}`,
    [name, description],
  );
  // INSERT ... RETURNING always yields exactly one row.
  return rows[0]!;
}

export async function update(
  id: string | number,
  { name, description }: CategoryRowInput,
): Promise<CategoryRow | null> {
  const { rows } = await pool.query<CategoryRow>(
    `UPDATE categories
        SET name = $1, description = $2, updated_at = now()
      WHERE id = $3
      RETURNING ${COLUMNS}`,
    [name, description, id],
  );
  return rows[0] ?? null;
}

export async function remove(id: string | number, db: Queryable = pool): Promise<boolean> {
  const { rowCount } = await db.query("DELETE FROM categories WHERE id = $1", [id]);
  return (rowCount ?? 0) > 0;
}
