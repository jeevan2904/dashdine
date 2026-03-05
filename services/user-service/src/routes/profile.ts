/**
 * Profile & Address Routes
 *
 * These routes require authentication — the userId comes from the JWT token.
 * For now (until we build the BFF and auth middleware), we'll accept
 * userId as a path parameter. The BFF will inject it from the JWT later.
 *
 * Routes:
 *   POST   /profiles               — Create profile (called by event handler or directly)
 *   GET    /profiles/:userId       — Get profile
 *   PUT    /profiles/:userId       — Update profile
 *   GET    /profiles/:userId/addresses       — List addresses
 *   POST   /profiles/:userId/addresses       — Add address
 *   DELETE /profiles/:userId/addresses/:id   — Delete address
 */

import { type FastifyInstance } from 'fastify';

import { addressSchema } from '@dashdine/validators';

import { ValidationError } from '../lib/errors.js';
import {
  createProfile,
  getProfile,
  updateProfile,
  getUserAddresses,
  addAddress,
  deleteAddress,
} from '../services/user.service.js';

export async function profileRoutes(app: FastifyInstance): Promise<void> {
  // ═══ Profile Routes ═══

  /**
   * POST /profiles — Create a new user profile
   * Typically called by the RabbitMQ event consumer when a user registers.
   * Can also be called directly for testing.
   */
  app.post(
    '/profiles',
    {
      schema: {
        description: 'Create a user profile',
        tags: ['Profiles'],
        body: {
          type: 'object',
          required: ['id', 'firstName'],
          properties: {
            id: { type: 'string' },
            firstName: { type: 'string' },
            lastName: { type: 'string' },
          },
        },
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
      const body = request.body as { id: string; firstName: string; lastName?: string };
      const profile = await createProfile(body);

      return reply.status(201).send({
        success: true,
        data: profile,
      });
    },
  );

  /**
   * GET /profiles/:userId — Get user profile
   */
  app.get(
    '/profiles/:userId',
    {
      schema: {
        description: 'Get a user profile by ID',
        tags: ['Profiles'],
        params: {
          type: 'object',
          required: ['userId'],
          properties: {
            userId: { type: 'string' },
          },
        },
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
      const { userId } = request.params as { userId: string };
      const profile = await getProfile(userId);

      return {
        success: true,
        data: profile,
      };
    },
  );

  /**
   * PUT /profiles/:userId — Update user profile
   */
  app.put(
    '/profiles/:userId',
    {
      schema: {
        description: 'Update a user profile',
        tags: ['Profiles'],
        params: {
          type: 'object',
          required: ['userId'],
          properties: {
            userId: { type: 'string' },
          },
        },
        body: {
          type: 'object',
          properties: {
            firstName: { type: 'string' },
            lastName: { type: 'string' },
            displayName: { type: 'string' },
            avatarUrl: { type: 'string' },
            dateOfBirth: { type: 'string' },
            gender: { type: 'string', enum: ['MALE', 'FEMALE', 'OTHER', 'PREFER_NOT_TO_SAY'] },
            preferredLanguage: { type: 'string' },
          },
        },
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
      const { userId } = request.params as { userId: string };
      const body = request.body as Record<string, unknown>;

      const profile = await updateProfile(userId, body as Parameters<typeof updateProfile>[1]);

      return {
        success: true,
        data: profile,
      };
    },
  );

  // ═══ Address Routes ═══

  /**
   * GET /profiles/:userId/addresses — List all addresses
   */
  app.get(
    '/profiles/:userId/addresses',
    {
      schema: {
        description: 'List all delivery addresses for a user',
        tags: ['Addresses'],
        params: {
          type: 'object',
          required: ['userId'],
          properties: {
            userId: { type: 'string' },
          },
        },
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
      const { userId } = request.params as { userId: string };
      const userAddresses = await getUserAddresses(userId);

      return {
        success: true,
        data: userAddresses,
      };
    },
  );

  /**
   * POST /profiles/:userId/addresses — Add a new address
   */
  app.post(
    '/profiles/:userId/addresses',
    {
      schema: {
        description: 'Add a new delivery address',
        tags: ['Addresses'],
        params: {
          type: 'object',
          required: ['userId'],
          properties: {
            userId: { type: 'string' },
          },
        },
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
      const { userId } = request.params as { userId: string };

      // Validate with Zod
      const parsed = addressSchema.safeParse(request.body);
      if (!parsed.success) {
        const details = parsed.error.issues.map((issue) => ({
          field: issue.path.join('.') || 'body',
          message: issue.message,
        }));
        throw new ValidationError(details);
      }

      const address = await addAddress(userId, parsed.data);

      return reply.status(201).send({
        success: true,
        data: address,
      });
    },
  );

  /**
   * DELETE /profiles/:userId/addresses/:addressId — Delete an address
   */
  app.delete(
    '/profiles/:userId/addresses/:addressId',
    {
      schema: {
        description: 'Delete a delivery address',
        tags: ['Addresses'],
        params: {
          type: 'object',
          required: ['userId', 'addressId'],
          properties: {
            userId: { type: 'string' },
            addressId: { type: 'string' },
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
    async (request) => {
      const { userId, addressId } = request.params as { userId: string; addressId: string };

      await deleteAddress(userId, addressId);

      return { success: true };
    },
  );
}
