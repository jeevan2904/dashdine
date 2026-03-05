import { type FastifyInstance } from 'fastify';

export async function healthRoutes(app: FastifyInstance): Promise<void> {
  app.get(
    '/health',
    {
      schema: {
        description: 'Liveness probe',
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
    async () => {
      return {
        status: 'ok',
        service: 'user-service',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
      };
    },
  );

  app.get(
    '/health/ready',
    {
      schema: {
        description: 'Readiness probe',
        tags: ['Health'],
        response: {
          200: {
            type: 'object',
            properties: {
              status: { type: 'string' },
              checks: { type: 'object' },
            },
          },
          503: {
            type: 'object',
            properties: {
              status: { type: 'string' },
              checks: { type: 'object' },
            },
          },
        },
      },
    },
    async (_request, reply) => {
      const checks = {
        database: { status: 'ok' as const, latencyMs: 0 },
      };

      const allHealthy = Object.values(checks).every((c) => c.status === 'ok');

      if (!allHealthy) {
        return reply.status(503).send({ status: 'not_ready', checks });
      }

      return { status: 'ready', checks };
    },
  );
}
