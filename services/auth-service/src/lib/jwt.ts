/**
 * JWT (JSON Web Token) management.
 *
 * HOW JWT AUTH WORKS IN DASHDINE:
 * --------------------------------
 * 1. User logs in → Auth Service creates an ACCESS TOKEN + REFRESH TOKEN
 * 2. Frontend stores both tokens
 * 3. Every API request includes: Authorization: Bearer <access_token>
 * 4. API Gateway (Kong) or BFF verifies the token and extracts user info
 * 5. Access token expires after 15 minutes → frontend uses refresh token to get new one
 * 6. Refresh token expires after 7 days → user must login again
 *
 * WHY TWO TOKENS?
 * ---------------
 * Access tokens are short-lived (15 min) so if stolen, damage is limited.
 * But forcing users to login every 15 minutes is terrible UX.
 *
 * Refresh tokens solve this: they're long-lived (7 days) and stored in
 * the database (so we can revoke them). When the access token expires,
 * the frontend sends the refresh token to get a new access token.
 *
 * The refresh token is ALSO rotated (old one revoked, new one issued)
 * on every use. This means if a refresh token is stolen and used by
 * an attacker, the legitimate user's next refresh will fail (because
 * the token was already used), alerting us to the theft.
 */

import { createHash } from 'node:crypto';

import jwt from 'jsonwebtoken';

import { type JwtPayload, type UserRole } from '@dashdine/types';
import { generateId } from '@dashdine/utils';
import { DEFAULTS } from '@dashdine/constants';

import { env } from '../config/env.js';

interface TokenUser {
  id: string;
  role: UserRole;
  email?: string;
  cityId?: string;
}

interface TokenPair {
  accessToken: string;
  refreshToken: string;
  /** The raw refresh token (before hashing) — only returned once, then discarded */
  refreshTokenRaw: string;
}

/**
 * Generate an access token + refresh token pair.
 *
 * Returns both tokens plus the raw refresh token string.
 * The raw string is sent to the client; we store only the HASH in the database.
 */
export function generateTokenPair(user: TokenUser): TokenPair {
  // Generate a unique ID for the access token (for revocation tracking)
  const jti = generateId();

  // Access token — contains user info, short-lived
  const accessToken = jwt.sign(
    {
      sub: user.id,
      role: user.role,
      email: user.email,
      cityId: user.cityId,
      jti,
    } satisfies Omit<JwtPayload, 'iat' | 'exp'>,
    env.JWT_ACCESS_SECRET,
    {
      expiresIn: DEFAULTS.ACCESS_TOKEN_EXPIRY, // 15 minutes
      issuer: 'dashdine-auth',
      audience: 'dashdine-api',
    },
  );

  // Refresh token — opaque string, long-lived
  // We use a random ID as the token value, not a JWT
  // (refresh tokens don't need to carry data — they're just lookup keys)
  const refreshTokenRaw = `rt_${generateId()}_${generateId()}`;

  return {
    accessToken,
    refreshToken: refreshTokenRaw, // This is what the client receives
    refreshTokenRaw,
  };
}

/**
 * Verify and decode an access token.
 * Returns the decoded payload or null if invalid/expired.
 */
export function verifyAccessToken(token: string): JwtPayload | null {
  try {
    const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET, {
      issuer: 'dashdine-auth',
      audience: 'dashdine-api',
    });

    return decoded as JwtPayload;
  } catch {
    return null;
  }
}

/**
 * Hash a refresh token for database storage.
 * We NEVER store the raw refresh token — only its SHA-256 hash.
 *
 * Why? If the database is breached, the attacker gets hashes,
 * not actual tokens. They can't use hashes to authenticate.
 */
export function hashRefreshToken(rawToken: string): string {
  return createHash('sha256').update(rawToken).digest('hex');
}
