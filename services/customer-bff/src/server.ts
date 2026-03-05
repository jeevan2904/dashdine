/**
 * Customer BFF — Main Server Entry Point
 *
 * This is the gateway that the Customer frontend talks to.
 * It creates HTTP clients for each microservice and passes them
 * to the route handlers via Fastify's plugin options pattern.
 */

import fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import sensible from '@fastify/sensible';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';

import { createLogger } from '@dashdine/logger';
import { generateId } from '@dashdine/utils';

import { env } from './config/env.js';
import { AppError, ValidationError } from './lib/errors.js';
import { ServiceClient } from './lib/service-client.js';
import { healthRoutes } from './routes/health.js';
import { bffAuthRoutes } from './routes/auth.js';
import { bffProfileRoutes } from './routes/profile.js';
import { AuthClient } from './services/auth-client.js';
import { UserClient } from './services/user-client.js';

// ═══ Create Logger ═══
const logger = createLogger({
  service: 'customer-bff',
  level: env.LOG_LEVEL,
});

// ═══ Create Service Clients ═══
const authServiceClient = new ServiceClient(env.AUTH_SERVICE_URL, logger);
const userServiceClient = new ServiceClient(env.USER_SERVICE_URL, logger);
const authClient = new AuthClient(authServiceClient);
const userClient = new UserClient(userServiceClient);

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
      title: 'DashDine Customer API',
      description: 'Customer-facing API gateway — the single API the frontend talks to',
      version: '1.0.0',
    },
    servers: [{ url: `http://localhost:${env.PORT}`, description: 'Local development' }],
    tags: [
      { name: 'Health', description: 'Health check endpoints' },
      { name: 'Auth', description: 'Authentication (register, login, refresh, logout)' },
      { name: 'Profile', description: 'User profile management (requires auth)' },
      { name: 'Addresses', description: 'Delivery address management (requires auth)' },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
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
    const fastifyError = error as Error & { statusCode: number };
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
await app.register(
  async (instance) => {
    await bffAuthRoutes(instance, { authClient, userClient });
  },
  { prefix: '/api/v1/customer' },
);

await app.register(
  async (instance) => {
    await bffProfileRoutes(instance, { userClient });
  },
  { prefix: '/api/v1/customer' },
);

// ═══ Start Server ═══
async function start(): Promise<void> {
  try {
    await app.listen({ port: env.PORT, host: env.HOST });
    logger.info(
      {
        port: env.PORT,
        env: env.NODE_ENV,
        docs: `http://localhost:${env.PORT}/docs`,
        authService: env.AUTH_SERVICE_URL,
        userService: env.USER_SERVICE_URL,
      },
      '🚀 Customer BFF is running',
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
