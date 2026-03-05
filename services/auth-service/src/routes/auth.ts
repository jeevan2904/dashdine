/**
 * Auth Routes — HTTP endpoints for authentication.
 *
 * These routes are THIN — they handle HTTP concerns only:
 * 1. Parse and validate request body (via Zod schemas)
 * 2. Extract metadata (IP address, user agent)
 * 3. Call the appropriate service function
 * 4. Format and return the response
 *
 * All business logic lives in auth.service.ts.
 */

import { type FastifyInstance } from 'fastify';

import { registerSchema, loginSchema, refreshTokenSchema } from '@dashdine/validators';

import { AppError, ValidationError } from '../lib/errors.js';
import {
  registerUser,
  loginWithEmail,
  refreshAccessToken,
  logout,
} from '../services/auth.service.js';

/**
 * Helper: Convert Zod errors to our standard validation error format.
 */
function zodToValidationError(zodError: {
  issues: Array<{ path: Array<string | number>; message: string }>;
}): ValidationError {
  const details = zodError.issues.map((issue) => ({
    field: issue.path.join('.') || 'body',
    message: issue.message,
  }));
  return new ValidationError(details);
}

/**
 * Extract request metadata for security tracking.
 */
function getRequestMeta(request: {
  ip: string;
  headers: Record<string, string | string[] | undefined>;
}): {
  ipAddress: string;
  deviceInfo: string;
} {
  return {
    ipAddress: request.ip,
    deviceInfo: (request.headers['user-agent'] as string) ?? 'unknown',
  };
}

export async function authRoutes(app: FastifyInstance): Promise<void> {
  /**
   * POST /register — Create a new customer account
   */
  app.post(
    '/register',
    {
      schema: {
        description: 'Register a new customer account',
        tags: ['Auth'],
        body: {
          type: 'object',
          properties: {
            email: { type: 'string' },
            phone: { type: 'string' },
            password: { type: 'string' },
            firstName: { type: 'string' },
            lastName: { type: 'string' },
          },
        },
        response: {
          201: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: {
                type: 'object',
                properties: {
                  user: {
                    type: 'object',
                    properties: {
                      id: { type: 'string' },
                      email: { type: 'string' },
                      phone: { type: 'string' },
                      firstName: { type: 'string' },
                      role: { type: 'string' },
                    },
                  },
                  tokens: {
                    type: 'object',
                    properties: {
                      accessToken: { type: 'string' },
                      refreshToken: { type: 'string' },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    async (request, reply) => {
      // Validate request body with Zod
      const parsed = registerSchema.safeParse(request.body);
      if (!parsed.success) {
        throw zodToValidationError(parsed.error);
      }

      const meta = getRequestMeta(request);
      const result = await registerUser(parsed.data, meta);

      return reply.status(201).send({
        success: true,
        data: result,
      });
    },
  );

  /**
   * POST /login — Login with email and password
   */
  app.post(
    '/login',
    {
      schema: {
        description: 'Login with email and password',
        tags: ['Auth'],
        body: {
          type: 'object',
          required: ['email', 'password'],
          properties: {
            email: { type: 'string' },
            password: { type: 'string' },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: {
                type: 'object',
                properties: {
                  user: {
                    type: 'object',
                    properties: {
                      id: { type: 'string' },
                      email: { type: 'string' },
                      phone: { type: 'string' },
                      firstName: { type: 'string' },
                      role: { type: 'string' },
                    },
                  },
                  tokens: {
                    type: 'object',
                    properties: {
                      accessToken: { type: 'string' },
                      refreshToken: { type: 'string' },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    async (request, reply) => {
      const parsed = loginSchema.safeParse(request.body);
      if (!parsed.success) {
        throw zodToValidationError(parsed.error);
      }

      const meta = getRequestMeta(request);
      const result = await loginWithEmail(parsed.data, meta);

      return reply.send({
        success: true,
        data: result,
      });
    },
  );

  /**
   * POST /refresh — Get new access token using refresh token
   */
  app.post(
    '/refresh',
    {
      schema: {
        description: 'Refresh access token using refresh token',
        tags: ['Auth'],
        body: {
          type: 'object',
          required: ['refreshToken'],
          properties: {
            refreshToken: { type: 'string' },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: {
                type: 'object',
                properties: {
                  accessToken: { type: 'string' },
                  refreshToken: { type: 'string' },
                },
              },
            },
          },
        },
      },
    },
    async (request, reply) => {
      const parsed = refreshTokenSchema.safeParse(request.body);
      if (!parsed.success) {
        throw zodToValidationError(parsed.error);
      }

      const meta = getRequestMeta(request);
      const result = await refreshAccessToken(parsed.data.refreshToken, meta);

      return reply.send({
        success: true,
        data: result,
      });
    },
  );

  /**
   * POST /logout — Revoke refresh token
   */
  app.post(
    '/logout',
    {
      schema: {
        description: 'Logout and revoke refresh token',
        tags: ['Auth'],
        body: {
          type: 'object',
          required: ['refreshToken'],
          properties: {
            refreshToken: { type: 'string' },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
            },
          },
        },
      },
    },
    async (request, reply) => {
      const parsed = refreshTokenSchema.safeParse(request.body);
      if (!parsed.success) {
        throw zodToValidationError(parsed.error);
      }

      await logout(parsed.data.refreshToken);

      return reply.send({ success: true });
    },
  );
}
