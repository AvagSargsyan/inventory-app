import pg from "pg";
import type { Pool, PoolClient } from "pg";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not set. Copy api/.env.example to api/.env first.");
}

export const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

// An idle connection can die with no request in flight — a managed Postgres
// suspending its compute, or a network drop. Unhandled, that event ends the
// process; handled, the pool discards the client and the next query reconnects.
pool.on("error", (error) => {
  console.error("Idle client error:", error.message);
});

// Repositories take either the pool or a checked-out client, so the same
// function can run standalone or inside a transaction.
export type Queryable = Pool | PoolClient;
