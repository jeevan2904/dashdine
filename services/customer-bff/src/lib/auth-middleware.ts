/**
 * Authentication Middleware
 *
 * Verifies the JWT access token from the Authorization header.
 * If valid, attaches the decoded user info to the request.
 * If invalid/missing, returns 401.
 *
 * USAGE:
 *   // Protect a single route:
 *   app.get('/profile', { preHandler: [requireAuth] }, handler);
 *
 *   // Protect all routes in a plugin:
 *   app.addHook('preHandler', requireAuth);
 *
 * After middleware runs, access user info via:
 *   request.user.id     // User ID
 *   request.user.role   // 'CUSTOMER', 'RIDER', etc.
 *   request.user.email  // User's email
 */

import jwt from 'jsonwebtoken';
import { type FastifyRequest, type FastifyReply } from 'fastify';

import { type JwtPayload } from '@dashdine/types';

import { env } from '../config/env.js';
import { UnauthorizedError } from './errors.js';

// ═══ Extend Fastify's Request type to include 'user' ═══

declare module 'fastify' {
  interface FastifyRequest {
    user?: JwtPayload;
  }
}

/**
 * Middleware that requires a valid JWT access token.
 * Extracts the token from: Authorization: Bearer <token>
 */
export async function requireAuth(request: FastifyRequest, _reply: FastifyReply): Promise<void> {
  const authHeader = request.headers.authorization;

  if (!authHeader) {
    throw new UnauthorizedError('Missing Authorization header');
  }

  // Extract token from "Bearer <token>"
  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    throw new UnauthorizedError('Invalid Authorization header format. Expected: Bearer <token>');
  }

  const token = parts[1];
  if (!token) {
    throw new UnauthorizedError('Missing token');
  }

  try {
    const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET, {
      issuer: 'dashdine-auth',
      audience: 'dashdine-api',
    }) as JwtPayload;

    // Attach user to request — available in all subsequent handlers
    request.user = decoded;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new UnauthorizedError('Access token expired. Please refresh your token.');
    }
    if (error instanceof jwt.JsonWebTokenError) {
      throw new UnauthorizedError('Invalid access token');
    }
    throw new UnauthorizedError('Authentication failed');
  }
}
