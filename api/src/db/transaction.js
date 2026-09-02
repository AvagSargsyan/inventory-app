import { pool } from './pool.js';

// Runs fn against one checked-out client so BEGIN and COMMIT share a session —
// pool.query would spread them across different connections. Repository
// functions take that client as their `db` argument to join the transaction.
export async function withTransaction(fn) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
