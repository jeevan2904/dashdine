/**
 * Health check endpoints.
 *
 * These exist for two reasons:
 *
 * 1. KUBERNETES PROBES:
 *    - Liveness probe (GET /health): "Is the process alive?"
 *      If this fails, K8s kills the pod and starts a new one.
 *
 *    - Readiness probe (GET /health/ready): "Can this pod serve traffic?"
 *      If this fails, K8s stops sending traffic to this pod (but doesn't kill it).
 *      This is important during startup when the DB connection isn't ready yet.
 *
 * 2. MONITORING:
 *    Load balancers, uptime monitors, and deployment scripts check these
 *    endpoints to verify the service is healthy.
 *
 * USAGE:
 *   In your Fastify app:
 *     import { healthRoutes } from './routes/health.js';
 *     app.register(healthRoutes);
 */

import { type FastifyInstance } from 'fastify';

/**
 * Register health check routes as a Fastify plugin.
 *
 * Fastify uses a plugin-based architecture. Everything is a plugin:
 * routes, middleware, database connections. This is a plugin that
 * registers two routes.
 */
export async function healthRoutes(app: FastifyInstance): Promise<void> {
  /**
   * GET /health — Liveness probe
   *
   * Returns 200 if the Node.js process is alive and responding.
   * This should NEVER check external dependencies (database, Redis).
   * Why? Because if the database is down, we don't want K8s to kill
   * our pod — we want the pod to stay alive and retry the connection.
   * Killing it would just create a restart loop.
   */
  app.get(
    '/health',
    {
      schema: {
        description: 'Liveness probe — is the process alive?',
        tags: ['Health'],
        response: {
          200: {
            type: 'object',
            properties: {
              status: { type: 'string' },
              service: { type: 'string' },
              timestamp: { type: 'string' },
              uptime: { type: 'number' },
            },
          },
        },
      },
    },
    async (_request, _reply) => {
      return {
        status: 'ok',
        service: 'auth-service',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
      };
    },
  );

  /**
   * GET /health/ready — Readiness probe
   *
   * Returns 200 only if ALL critical dependencies are reachable.
   * If any dependency is down, returns 503 (Service Unavailable).
   *
   * K8s uses this to decide whether to send traffic to this pod.
   * During startup, this will return 503 until DB and Redis connect.
   *
   * NOTE: We'll add actual database and Redis checks in the next step
   * when we set up those connections. For now, it just returns ok.
   */
  app.get(
    '/health/ready',
    {
      schema: {
        description: 'Readiness probe — can this pod serve traffic?',
        tags: ['Health'],
        response: {
          200: {
            type: 'object',
            properties: {
              status: { type: 'string' },
              checks: {
                type: 'object',
                properties: {
                  database: {
                    type: 'object',
                    properties: {
                      status: { type: 'string' },
                      latencyMs: { type: 'number' },
                    },
                  },
                  redis: {
                    type: 'object',
                    properties: {
                      status: { type: 'string' },
                      latencyMs: { type: 'number' },
                    },
                  },
                },
              },
            },
          },
          503: {
            type: 'object',
            properties: {
              status: { type: 'string' },
              checks: {
                type: 'object',
                properties: {
                  database: {
                    type: 'object',
                    properties: {
                      status: { type: 'string' },
                      latencyMs: { type: 'number' },
                    },
                  },
                  redis: {
                    type: 'object',
                    properties: {
                      status: { type: 'string' },
                      latencyMs: { type: 'number' },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    async (_request, reply) => {
      // TODO: Add actual dependency checks when we set up DB and Redis
      // For now, just return ok

      const checks = {
        database: { status: 'ok' as const, latencyMs: 0 },
        redis: { status: 'ok' as const, latencyMs: 0 },
      };

      // If any check failed, return 503
      const allHealthy = Object.values(checks).every((check) => check.status === 'ok');

      if (!allHealthy) {
        return reply.status(503).send({
          status: 'not_ready',
          checks,
        });
      }

      return {
        status: 'ready',
        checks,
      };
    },
  );
}
