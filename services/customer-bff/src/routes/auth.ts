/**
 * Customer BFF — Auth Routes
 *
 * These are the routes the frontend actually calls.
 * They orchestrate calls to Auth Service and User Service,
 * then return a unified response shaped for the frontend.
 *
 * KEY DIFFERENCE FROM AUTH SERVICE ROUTES:
 * - Auth Service routes handle raw authentication logic
 * - BFF routes aggregate data from multiple services for the frontend
 *
 * Example: /register calls Auth Service to create credentials + tokens,
 * then waits briefly for the event to propagate, then calls User Service
 * to get the profile, and returns everything in one response.
 */

import { type FastifyInstance } from 'fastify';

import { registerSchema, loginSchema, refreshTokenSchema } from '@dashdine/validators';
import { sleep } from '@dashdine/utils';

import { ValidationError } from '../lib/errors.js';
import { type AuthClient } from '../services/auth-client.js';
import { type UserClient } from '../services/user-client.js';

function zodToValidationError(zodError: {
  issues: Array<{ path: Array<string | number>; message: string }>;
}): ValidationError {
  return new ValidationError(
    zodError.issues.map((issue) => ({
      field: issue.path.join('.') || 'body',
      message: issue.message,
    })),
  );
}

interface BffAuthRoutesOptions {
  authClient: AuthClient;
  userClient: UserClient;
}

export async function bffAuthRoutes(
  app: FastifyInstance,
  opts: BffAuthRoutesOptions,
): Promise<void> {
  const { authClient, userClient } = opts;

  /**
   * POST /auth/register — Customer registration
   *
   * Orchestration:
   * 1. Validate input
   * 2. Call Auth Service to create credentials + tokens
   * 3. Wait briefly for user.registered event to propagate
   * 4. Call User Service to get the auto-created profile
   * 5. Return unified response: { user, profile, tokens }
   */
  app.post(
    '/auth/register',
    {
      schema: {
        description: 'Register a new customer account',
        tags: ['Auth'],
        response: {
          201: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: { type: 'object', additionalProperties: true },
            },
          },
        },
      },
    },
    async (request, reply) => {
      const parsed = registerSchema.safeParse(request.body);
      if (!parsed.success) throw zodToValidationError(parsed.error);

      // Step 1: Register with Auth Service
      const authResult = await authClient.register(parsed.data);

      // Step 2: Wait for event propagation (profile auto-creation)
      // In production, the BFF would retry the profile fetch instead of sleeping.
      // For MVP, a small delay handles the typical case.
      await sleep(500);

      // Step 3: Try to get the profile (may not exist yet if event is slow)
      let profile = null;
      try {
        profile = await userClient.getProfile(authResult.user.id);
      } catch {
        // Profile not ready yet — that's OK, frontend can fetch later
      }

      return reply.status(201).send({
        success: true,
        data: {
          user: {
            id: authResult.user.id,
            email: authResult.user.email,
            phone: authResult.user.phone,
            firstName: authResult.user.firstName,
            role: authResult.user.role,
            profile,
          },
          tokens: authResult.tokens,
        },
      });
    },
  );

  /**
   * POST /auth/login — Customer login
   */
  app.post(
    '/auth/login',
    {
      schema: {
        description: 'Login with email and password',
        tags: ['Auth'],
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: { type: 'object', additionalProperties: true },
            },
          },
        },
      },
    },
    async (request, reply) => {
      const parsed = loginSchema.safeParse(request.body);
      if (!parsed.success) throw zodToValidationError(parsed.error);

      // Step 1: Login with Auth Service
      const authResult = await authClient.login(parsed.data);

      // Step 2: Get user profile (should always exist for existing users)
      let profile = null;
      try {
        profile = await userClient.getProfile(authResult.user.id);
      } catch {
        // Profile might not exist in edge cases
      }

      return reply.send({
        success: true,
        data: {
          user: {
            id: authResult.user.id,
            email: authResult.user.email,
            phone: authResult.user.phone,
            firstName: authResult.user.firstName,
            role: authResult.user.role,
            profile,
          },
          tokens: authResult.tokens,
        },
      });
    },
  );

  /**
   * POST /auth/refresh — Refresh access token
   */
  app.post(
    '/auth/refresh',
    {
      schema: {
        description: 'Refresh access token',
        tags: ['Auth'],
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: { type: 'object', additionalProperties: true },
            },
          },
        },
      },
    },
    async (request, reply) => {
      const parsed = refreshTokenSchema.safeParse(request.body);
      if (!parsed.success) throw zodToValidationError(parsed.error);

      const result = await authClient.refresh(parsed.data);

      return reply.send({
        success: true,
        data: result,
      });
    },
  );

  /**
   * POST /auth/logout — Revoke refresh token
   */
  app.post(
    '/auth/logout',
    {
      schema: {
        description: 'Logout and revoke refresh token',
        tags: ['Auth'],
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
      if (!parsed.success) throw zodToValidationError(parsed.error);

      await authClient.logout(parsed.data);

      return reply.send({ success: true });
    },
  );
}
