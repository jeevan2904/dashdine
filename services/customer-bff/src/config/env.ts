import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'staging', 'production', 'test']).default('development'),
  PORT: z.string().transform(Number).pipe(z.number().int().min(1).max(65535)).default('3010'),
  HOST: z.string().default('0.0.0.0'),

  // Microservice URLs
  AUTH_SERVICE_URL: z.string().url().default('http://localhost:3001'),
  USER_SERVICE_URL: z.string().url().default('http://localhost:3002'),

  // JWT (BFF verifies access tokens — needs same secret as Auth Service)
  JWT_ACCESS_SECRET: z.string().min(16).default('dev-access-secret-change-in-production'),

  CORS_ORIGIN: z.string().default('http://localhost:5173'),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error', 'fatal']).default('debug'),
});

export type Env = z.infer<typeof envSchema>;

function loadEnv(): Env {
  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    // eslint-disable-next-line no-console
    console.error('\n❌ Invalid environment variables:\n');
    // eslint-disable-next-line no-console
    console.error(
      result.error.issues.map((i) => `  - ${i.path.join('.')}: ${i.message}`).join('\n'),
    );
    process.exit(1);
  }
  return result.data;
}

export const env = loadEnv();
