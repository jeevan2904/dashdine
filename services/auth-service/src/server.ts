/**
 * Auth Service — Main Server Entry Point
 *
 * This file does four things:
 * 1. Creates a Fastify instance with plugins (CORS, helmet, swagger)
 * 2. Registers a global error handler
 * 3. Registers route plugins (health, auth, etc.)
 * 4. Starts the HTTP server
 *
 * STARTUP FLOW:
 *   env.ts validates environment → logger is created → Fastify starts →
 *   plugins register → routes register → server listens on PORT
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
import { closeDatabase } from './db/index.js';
import { AppError, ValidationError } from './lib/errors.js';
import { authRoutes } from './routes/auth.js';
import { healthRoutes } from './routes/health.js';

// ═══ Create Logger ═══
const logger = createLogger({
  service: 'auth-service',
  level: env.LOG_LEVEL,
});

// ═══ Create Fastify Instance ═══
const app = fastify({
  // Use our Pino logger (Fastify has built-in Pino support!)
  logger: false, // We handle logging ourselves for more control

  // Generate unique request IDs for distributed tracing
  genReqId: () => `req_${generateId()}`,

  // Increase body size limit for file uploads (profile images, documents)
  bodyLimit: 10 * 1024 * 1024, // 10MB
});

// ═══ Register Plugins ═══

/**
 * CORS — Cross-Origin Resource Sharing
 * Allows the frontend (running on a different port/domain) to call this API.
 */
await app.register(cors, {
  origin: env.CORS_ORIGIN.split(','), // Support multiple origins: "http://localhost:5173,http://localhost:5174"
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-Id'],
  credentials: true, // Allow cookies and Authorization headers
});

/**
 * Helmet — Security Headers
 * Adds headers like X-Content-Type-Options, X-Frame-Options, etc.
 */
await app.register(helmet, {
  contentSecurityPolicy: false, // Disable CSP for API (no HTML served)
});

/**
 * Sensible — Error Utilities
 * Adds reply.notFound(), reply.badRequest(), etc.
 */
await app.register(sensible);

/**
 * Swagger — Auto-generated API Documentation
 * Visit http://localhost:3001/docs to see interactive API docs.
 */
await app.register(swagger, {
  openapi: {
    info: {
      title: 'DashDine Auth Service',
      description: 'Authentication and Authorization API',
      version: '1.0.0',
    },
    servers: [{ url: `http://localhost:${env.PORT}`, description: 'Local development' }],
    tags: [
      { name: 'Health', description: 'Health check endpoints' },
      { name: 'Auth', description: 'Authentication endpoints' },
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
  uiConfig: {
    docExpansion: 'list',
    deepLinking: true,
  },
});

// ═══ Global Error Handler ═══

/**
 * This catches ALL errors thrown in any route handler.
 * It converts them to our standard API error response format.
 *
 * This is why we created custom error classes — we can check the
 * error type and build the appropriate response automatically.
 */
app.setErrorHandler((error: unknown, request, reply) => {
  const requestId = (request.id as string) ?? `req_${generateId()}`;

  // Handle our custom AppError and its subclasses
  if (error instanceof AppError) {
    logger.warn(
      {
        requestId,
        code: error.code,
        statusCode: error.statusCode,
        path: request.url,
        method: request.method,
      },
      error.message,
    );

    const response: Record<string, unknown> = {
      success: false,
      error: {
        code: error.code,
        message: error.message,
        requestId,
      },
    };

    // Add field-level details for validation errors
    if (error instanceof ValidationError) {
      (response['error'] as Record<string, unknown>)['details'] = error.details;
    }

    return reply.status(error.statusCode).send(response);
  }

  // Handle Fastify's built-in errors (validation, 404, etc.)
  // Fastify errors have statusCode and validation properties
  if (error instanceof Error && 'statusCode' in error) {
    const fastifyError = error as Error & {
      statusCode: number;
      validation?: Array<{ instancePath: string; message?: string }>;
    };

    if (fastifyError.validation) {
      logger.warn(
        { requestId, validation: fastifyError.validation, path: request.url },
        'Schema validation failed',
      );

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

    // Other Fastify errors (404, 413 body too large, etc.)
    return reply.status(fastifyError.statusCode).send({
      success: false,
      error: {
        code: 'REQUEST_ERROR',
        message: error.message,
        requestId,
      },
    });
  }

  // Handle unknown/programming errors
  // NEVER expose internal error details to clients
  logger.error(
    {
      requestId,
      err: error instanceof Error ? error : new Error(String(error)),
      path: request.url,
      method: request.method,
    },
    'Unhandled error',
  );

  return reply.status(500).send({
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred',
      requestId,
    },
  });
});

// ═══ Request Logging Hook ═══

/**
 * Log every incoming request and its response time.
 * This gives us observability into API performance.
 */
app.addHook('onRequest', (request, _reply, done) => {
  logger.info(
    {
      requestId: request.id,
      method: request.method,
      url: request.url,
      userAgent: request.headers['user-agent'],
    },
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
await app.register(authRoutes, { prefix: '/api/v1/auth' });

// ═══ Start Server ═══

async function start(): Promise<void> {
  try {
    await app.listen({
      port: env.PORT,
      host: env.HOST,
    });

    logger.info(
      {
        port: env.PORT,
        env: env.NODE_ENV,
        docs: `http://localhost:${env.PORT}/docs`,
      },
      `🚀 Auth Service is running`,
    );
  } catch (error) {
    logger.fatal({ err: error }, 'Failed to start server');
    process.exit(1);
  }
}

// ═══ Graceful Shutdown ═══

/**
 * When the process receives a shutdown signal (SIGTERM from K8s, Ctrl+C),
 * close the server gracefully: finish processing current requests,
 * close database connections, then exit.
 */
async function shutdown(signal: string): Promise<void> {
  logger.info({ signal }, 'Shutdown signal received, closing server...');

  try {
    await app.close();
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

// Start!
await start();
