/**
 * Environment variable validation and configuration.
 *
 * WHY THIS FILE EXISTS:
 * --------------------
 * Without this, your app might start successfully, process 100 requests,
 * and then crash when it first tries to connect to the database because
 * DATABASE_URL is misspelled in your .env file. By validating at startup,
 * we fail FAST with a clear error message.
 *
 * HOW IT WORKS:
 * 1. Reads process.env
 * 2. Validates with Zod (type-safe!)
 * 3. Exports a typed `env` object that the rest of the service uses
 * 4. If any variable is missing or invalid, the service refuses to start
 *
 * USAGE:
 *   import { env } from './config/env.js';
 *   console.log(env.PORT); // number, guaranteed to exist
 */

import { z } from 'zod';

/**
 * Schema that defines every environment variable this service needs.
 * Zod validates them AND converts types (e.g., PORT from string "3001" to number 3001).
 */
const envSchema = z.object({
  // Server
  NODE_ENV: z.enum(['development', 'staging', 'production', 'test']).default('development'),
  PORT: z.string().transform(Number).pipe(z.number().int().min(1).max(65535)).default('3001'),
  HOST: z.string().default('0.0.0.0'),

  // Database
  DATABASE_URL: z
    .string()
    .url('DATABASE_URL must be a valid PostgreSQL connection string')
    .startsWith('postgresql://', 'DATABASE_URL must start with postgresql://')
    .default('postgresql://dashdine:dev_password@localhost:5432/dashdine_auth'),

  // Redis
  REDIS_URL: z.string().default('redis://localhost:6379'),

  // RabbitMQ
  RABBITMQ_URL: z.string().default('amqp://dashdine:dev_password@localhost:5672'),

  // JWT
  JWT_ACCESS_SECRET: z
    .string()
    .min(16, 'JWT_ACCESS_SECRET must be at least 16 characters')
    .default('dev-access-secret-change-in-production'),
  JWT_REFRESH_SECRET: z
    .string()
    .min(16, 'JWT_REFRESH_SECRET must be at least 16 characters')
    .default('dev-refresh-secret-change-in-production'),

  // Google OAuth (optional in development)
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),

  // CORS
  CORS_ORIGIN: z.string().default('http://localhost:5173'),

  // Logging
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error', 'fatal']).default('debug'),
});

/** Type derived from the schema — gives us autocomplete for env.PORT, env.DATABASE_URL, etc. */
export type Env = z.infer<typeof envSchema>;

/**
 * Parse and validate environment variables.
 * If validation fails, prints a clear error and exits.
 */
function loadEnv(): Env {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    const errors = result.error.issues.map(
      (issue) => `  - ${issue.path.join('.')}: ${issue.message}`,
    );

    // Using console.error here (not the logger) because the logger
    // might not be initialized yet — it needs env vars to configure!
    // eslint-disable-next-line no-console
    console.error('\n❌ Invalid environment variables:\n');
    // eslint-disable-next-line no-console
    console.error(errors.join('\n'));
    // eslint-disable-next-line no-console
    console.error('\nCheck your .env.local file against .env.example\n');

    process.exit(1);
  }

  return result.data;
}

/**
 * Validated environment variables.
 * Import this in any file that needs config values:
 *
 *   import { env } from '../config/env.js';
 *   const port = env.PORT; // typed as number
 */
export const env = loadEnv();
