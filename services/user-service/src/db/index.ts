import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

import { env } from '../config/env.js';
import * as schema from './schema.js';

const connection = postgres(env.DATABASE_URL, {
  max: 10,
  idle_timeout: 30,
  connect_timeout: 10,
});

export const db = drizzle(connection, { schema });

export async function closeDatabase(): Promise<void> {
  await connection.end();
}

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
