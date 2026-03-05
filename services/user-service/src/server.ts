/**
 * User Service — Main Server Entry Point
 *
 * Same pattern as Auth Service:
 * Fastify + plugins + error handler + request logging + graceful shutdown
 */

import fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import sensible from '@fastify/sensible';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';

import { createLogger } from '@dashdine/logger';
import { generateId } from '@dashdine/utils';
import { EventBus } from '@dashdine/queue';

import { env } from './config/env.js';
import { closeDatabase } from './db/index.js';
import { registerEventConsumers } from './events/consumer.js';
import { AppError, ValidationError } from './lib/errors.js';
import { healthRoutes } from './routes/health.js';
import { profileRoutes } from './routes/profile.js';

// ═══ Create Logger ═══
const logger = createLogger({
  service: 'user-service',
  level: env.LOG_LEVEL,
});

// ═══ Create Event Bus ═══
const eventBus = new EventBus({
  url: env.RABBITMQ_URL,
  service: 'user-service',
  logger,
});

// ═══ Create Fastify Instance ═══
const app = fastify({
  logger: false,
  genReqId: () => `req_${generateId()}`,
  bodyLimit: 10 * 1024 * 1024,
});

// ═══ Register Plugins ═══
await app.register(cors, {
  origin: env.CORS_ORIGIN.split(','),
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-Id'],
  credentials: true,
});

await app.register(helmet, { contentSecurityPolicy: false });
await app.register(sensible);

await app.register(swagger, {
  openapi: {
    info: {
      title: 'DashDine User Service',
      description: 'User Profiles and Addresses API',
      version: '1.0.0',
    },
    servers: [{ url: `http://localhost:${env.PORT}`, description: 'Local development' }],
    tags: [
      { name: 'Health', description: 'Health check endpoints' },
      { name: 'Profiles', description: 'User profile management' },
      { name: 'Addresses', description: 'Delivery address management' },
    ],
  },
});

await app.register(swaggerUi, {
  routePrefix: '/docs',
  uiConfig: { docExpansion: 'list', deepLinking: true },
});

// ═══ Global Error Handler ═══
app.setErrorHandler((error: unknown, request, reply) => {
  const requestId = (request.id as string) ?? `req_${generateId()}`;

  if (error instanceof AppError) {
    logger.warn(
      { requestId, code: error.code, statusCode: error.statusCode, path: request.url },
      error.message,
    );

    const response: Record<string, unknown> = {
      success: false,
      error: { code: error.code, message: error.message, requestId },
    };

    if (error instanceof ValidationError) {
      (response['error'] as Record<string, unknown>)['details'] = error.details;
    }

    return reply.status(error.statusCode).send(response);
  }

  if (error instanceof Error && 'statusCode' in error) {
    const fastifyError = error as Error & {
      statusCode: number;
      validation?: Array<{ instancePath: string; message?: string }>;
    };

    if (fastifyError.validation) {
      return reply.status(422).send({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Request validation failed',
          details: fastifyError.validation.map((v) => ({
            field: v.instancePath || 'body',
            message: v.message ?? 'Invalid value',
          })),
          requestId,
        },
      });
    }

    return reply.status(fastifyError.statusCode).send({
      success: false,
      error: { code: 'REQUEST_ERROR', message: error.message, requestId },
    });
  }

  logger.error(
    {
      requestId,
      err: error instanceof Error ? error : new Error(String(error)),
      path: request.url,
    },
    'Unhandled error',
  );

  return reply.status(500).send({
    success: false,
    error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred', requestId },
  });
});

// ═══ Request Logging ═══
app.addHook('onRequest', (request, _reply, done) => {
  logger.info(
    { requestId: request.id, method: request.method, url: request.url },
    'Incoming request',
  );
  done();
});

app.addHook('onResponse', (request, reply, done) => {
  logger.info(
    {
      requestId: request.id,
      method: request.method,
      url: request.url,
      statusCode: reply.statusCode,
      durationMs: reply.elapsedTime,
    },
    'Request completed',
  );
  done();
});

// ═══ Register Routes ═══
await app.register(healthRoutes);
await app.register(profileRoutes, { prefix: '/api/v1/users' });

// ═══ Start Server ═══
async function start(): Promise<void> {
  try {
    // Connect to RabbitMQ and register event consumers
    await eventBus.connect();
    await registerEventConsumers(eventBus, logger);

    await app.listen({ port: env.PORT, host: env.HOST });
    logger.info(
      { port: env.PORT, env: env.NODE_ENV, docs: `http://localhost:${env.PORT}/docs` },
      '🚀 User Service is running',
    );
  } catch (error) {
    logger.fatal({ err: error }, 'Failed to start server');
    process.exit(1);
  }
}

// ═══ Graceful Shutdown ═══
async function shutdown(signal: string): Promise<void> {
  logger.info({ signal }, 'Shutdown signal received');
  try {
    await app.close();
    await eventBus.close();
    await closeDatabase();
    logger.info('Server closed gracefully');
    process.exit(0);
  } catch (error) {
    logger.error({ err: error }, 'Error during shutdown');
    process.exit(1);
  }
}

process.on('SIGTERM', () => void shutdown('SIGTERM'));
process.on('SIGINT', () => void shutdown('SIGINT'));

await start();
