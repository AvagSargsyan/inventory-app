import pg from "pg";
import type { Pool, PoolClient } from "pg";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not set. Copy api/.env.example to api/.env first.");
}

export const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

// Repositories take either the pool or a checked-out client, so the same
// function can run standalone or inside a transaction.
export type Queryable = Pool | PoolClient;
