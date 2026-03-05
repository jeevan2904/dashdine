/**
 * Database connection setup using Drizzle ORM + Postgres.js driver.
 *
 * HOW THIS WORKS:
 * 1. postgres() creates a connection pool to PostgreSQL
 * 2. drizzle() wraps it with Drizzle's type-safe query builder
 * 3. We export `db` which is used everywhere: db.select(), db.insert(), etc.
 *
 * CONNECTION POOLING:
 * postgres.js maintains a pool of connections automatically.
 * When you do db.select(), it borrows a connection, runs the query,
 * and returns the connection to the pool. No manual pool management needed.
 *
 * USAGE:
 *   import { db } from '../db/index.js';
 *   import { authCredentials } from '../db/schema.js';
 *
 *   const users = await db.select().from(authCredentials).where(...);
 */

import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

import { env } from '../config/env.js';
import * as schema from './schema.js';

/**
 * Create the postgres.js connection.
 *
 * postgres() automatically creates a connection pool.
 * The max connections default is 10, which is fine for a single service instance.
 * In production, each K8s pod gets its own pool.
 */
const connection = postgres(env.DATABASE_URL, {
  // Maximum number of connections in the pool
  max: 10,

  // Close idle connections after 30 seconds
  idle_timeout: 30,

  // Connection timeout: fail fast if DB is unreachable
  connect_timeout: 10,
});

/**
 * Drizzle ORM instance with full schema awareness.
 *
 * Passing `schema` gives us access to Drizzle's relational query API:
 *   db.query.authCredentials.findFirst({ where: ... })
 *
 * Without the schema, you'd only have the raw SQL-like API:
 *   db.select().from(authCredentials).where(...)
 *
 * Both work — relational queries are more convenient for simple lookups,
 * while the SQL-like API gives more control for complex queries.
 */
export const db = drizzle(connection, { schema });

/**
 * Close the database connection pool.
 * Called during graceful shutdown.
 */
export async function closeDatabase(): Promise<void> {
  await connection.end();
}

/**
 * Check if the database is reachable.
 * Used by the readiness probe in health.ts.
 * Returns latency in milliseconds.
 */
export async function checkDatabaseHealth(): Promise<{
  status: 'ok' | 'error';
  latencyMs: number;
}> {
  const start = Date.now();
  try {
    await connection`SELECT 1`;
    return { status: 'ok', latencyMs: Date.now() - start };
  } catch {
    return { status: 'error', latencyMs: Date.now() - start };
  }
}
