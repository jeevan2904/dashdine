import { defineConfig } from 'drizzle-kit';

import { env } from './src/config/env';

export default defineConfig({
  // Path to the schema file(s)
  schema: './src/db/schema.ts',

  // Where to output migration SQL files
  out: './src/db/migrations',

  // Database driver
  dialect: 'postgresql',

  // Connection string (reads from environment)
  dbCredentials: {
    url: env['DATABASE_URL'] ?? 'postgresql://dashdine:dev_password@localhost:5432/dashdine_auth',
  },

  // Enable verbose logging during migrations
  verbose: true,

  // Strict mode: fail on warnings
  strict: true,
});
