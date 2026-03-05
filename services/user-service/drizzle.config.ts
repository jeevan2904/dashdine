import { defineConfig } from 'drizzle-kit';

import { env } from './src/config/env';

export default defineConfig({
  schema: './src/db/schema.ts',
  out: './src/db/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: env['DATABASE_URL'] ?? 'postgresql://dashdine:dev_password@localhost:5432/dashdine_users',
  },
  verbose: true,
  strict: true,
});
