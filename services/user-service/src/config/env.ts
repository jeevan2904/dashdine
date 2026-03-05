import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'staging', 'production', 'test']).default('development'),
  PORT: z.string().transform(Number).pipe(z.number().int().min(1).max(65535)).default('3002'),
  HOST: z.string().default('0.0.0.0'),
  DATABASE_URL: z
    .string()
    .url()
    .startsWith('postgresql://')
    .default('postgresql://dashdine:dev_password@localhost:5432/dashdine_users'),
  RABBITMQ_URL: z.string().default('amqp://dashdine:dev_password@localhost:5672'),
  CORS_ORIGIN: z.string().default('http://localhost:5173'),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error', 'fatal']).default('debug'),
});

export type Env = z.infer<typeof envSchema>;

function loadEnv(): Env {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    const errors = result.error.issues.map(
      (issue) => `  - ${issue.path.join('.')}: ${issue.message}`,
    );
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

export const env = loadEnv();
