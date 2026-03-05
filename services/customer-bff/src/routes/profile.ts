/**
 * Customer BFF — Profile Routes (Protected)
 *
 * All routes here require authentication (JWT access token).
 * The user ID comes from the decoded JWT — the frontend never
 * sends a userId, it's extracted from the token automatically.
 *
 * This is a key security principle: the frontend can't pretend
 * to be another user because the userId comes from the signed token.
 */

import { type FastifyInstance } from 'fastify';

import { addressSchema } from '@dashdine/validators';

import { requireAuth } from '../lib/auth-middleware.js';
import { UnauthorizedError, ValidationError } from '../lib/errors.js';
import { type UserClient } from '../services/user-client.js';

interface BffProfileRoutesOptions {
  userClient: UserClient;
}

export async function bffProfileRoutes(
  app: FastifyInstance,
  opts: BffProfileRoutesOptions,
): Promise<void> {
  const { userClient } = opts;

  // All routes in this plugin require authentication
  app.addHook('preHandler', requireAuth);

  /**
   * GET /profile — Get current user's profile
   * The userId comes from the JWT token, not a path parameter.
   */
  app.get(
    '/profile',
    {
      schema: {
        description: "Get the authenticated user's profile",
        tags: ['Profile'],
        security: [{ bearerAuth: [] }],
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
    async (request) => {
      if (!request.user) throw new UnauthorizedError();

      const profile = await userClient.getProfile(request.user.sub);

      return {
        success: true,
        data: profile,
      };
    },
  );

  /**
   * PUT /profile — Update current user's profile
   */
  app.put(
    '/profile',
    {
      schema: {
        description: "Update the authenticated user's profile",
        tags: ['Profile'],
        security: [{ bearerAuth: [] }],
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
    async (request) => {
      if (!request.user) throw new UnauthorizedError();

      const body = request.body as Record<string, unknown>;
      const profile = await userClient.updateProfile(
        request.user.sub,
        body as Parameters<typeof userClient.updateProfile>[1],
      );

      return {
        success: true,
        data: profile,
      };
    },
  );

  // ═══ Addresses ═══

  /**
   * GET /addresses — List current user's delivery addresses
   */
  app.get(
    '/addresses',
    {
      schema: {
        description: "List authenticated user's delivery addresses",
        tags: ['Addresses'],
        security: [{ bearerAuth: [] }],
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: { type: 'array', items: { type: 'object', additionalProperties: true } },
            },
          },
        },
      },
    },
    async (request) => {
      if (!request.user) throw new UnauthorizedError();

      const addresses = await userClient.getAddresses(request.user.sub);

      return {
        success: true,
        data: addresses,
      };
    },
  );

  /**
   * POST /addresses — Add a new delivery address
   */
  app.post(
    '/addresses',
    {
      schema: {
        description: 'Add a new delivery address',
        tags: ['Addresses'],
        security: [{ bearerAuth: [] }],
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
      if (!request.user) throw new UnauthorizedError();

      const parsed = addressSchema.safeParse(request.body);
      if (!parsed.success) {
        throw new ValidationError(
          parsed.error.issues.map((i) => ({ field: i.path.join('.'), message: i.message })),
        );
      }

      const address = await userClient.addAddress(request.user.sub, parsed.data);

      return reply.status(201).send({
        success: true,
        data: address,
      });
    },
  );

  /**
   * DELETE /addresses/:addressId — Delete a delivery address
   */
  app.delete(
    '/addresses/:addressId',
    {
      schema: {
        description: 'Delete a delivery address',
        tags: ['Addresses'],
        security: [{ bearerAuth: [] }],
        response: {
          200: {
            type: 'object',
            properties: { success: { type: 'boolean' } },
          },
        },
      },
    },
    async (request) => {
      if (!request.user) throw new UnauthorizedError();

      const { addressId } = request.params as { addressId: string };
      await userClient.deleteAddress(request.user.sub, addressId);

      return { success: true };
    },
  );
}
