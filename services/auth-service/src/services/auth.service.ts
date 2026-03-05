/**
 * Auth Service — Business Logic Layer
 *
 * This file contains ALL the authentication business logic.
 * Routes call these functions — they don't contain logic themselves.
 *
 * WHY SEPARATE BUSINESS LOGIC FROM ROUTES?
 * -----------------------------------------
 * 1. Testability: You can test registerUser() without HTTP
 * 2. Reusability: Multiple routes could call the same function
 * 3. Clarity: Routes handle HTTP concerns, service handles business rules
 * 4. Future-proofing: If we switch from Fastify to another framework,
 *    only the routes change — business logic stays the same
 */

import { eq } from 'drizzle-orm';

import { type AuthTokens, type UserRole } from '@dashdine/types';
import { generateId } from '@dashdine/utils';
import { DEFAULTS } from '@dashdine/constants';
import { type RegisterInput, type LoginInput } from '@dashdine/validators';

import { db } from '../db/index.js';
import { authCredentials, refreshTokens, type AuthCredential } from '../db/schema.js';
import { hashPassword, comparePassword } from '../lib/password.js';
import { generateTokenPair, hashRefreshToken } from '../lib/jwt.js';
import { AppError, ConflictError, UnauthorizedError } from '../lib/errors.js';

// ═══ Types ═══

interface RegisterResult {
  user: {
    id: string;
    email?: string;
    phone?: string;
    firstName: string;
    role: UserRole;
  };
  tokens: AuthTokens;
}

interface LoginResult {
  user: {
    id: string;
    email?: string;
    phone?: string;
    firstName: string;
    role: UserRole;
  };
  tokens: AuthTokens;
}

interface RefreshResult {
  accessToken: string;
  refreshToken: string;
}

// ═══ Register ═══

/**
 * Register a new customer.
 *
 * Business rules:
 * 1. Either email or phone must be provided (validated by Zod schema)
 * 2. If email is provided, it must not be already registered
 * 3. If phone is provided, it must not be already registered
 * 4. Password is hashed with bcrypt before storage
 * 5. Access + refresh token pair is generated and returned
 */
export async function registerUser(
  input: RegisterInput,
  meta: { ipAddress?: string; deviceInfo?: string },
): Promise<RegisterResult> {
  // Check if email is already taken
  if (input.email) {
    const existing = await db
      .select({ id: authCredentials.id })
      .from(authCredentials)
      .where(eq(authCredentials.email, input.email))
      .limit(1);

    if (existing.length > 0) {
      throw new ConflictError('An account with this email already exists');
    }
  }

  // Check if phone is already taken
  if (input.phone) {
    const existing = await db
      .select({ id: authCredentials.id })
      .from(authCredentials)
      .where(eq(authCredentials.phone, input.phone))
      .limit(1);

    if (existing.length > 0) {
      throw new ConflictError('An account with this phone number already exists');
    }
  }

  // Hash password (if provided)
  const passwordHash = input.password ? await hashPassword(input.password) : null;

  // Create user record
  const userId = generateId();

  await db.insert(authCredentials).values({
    id: userId,
    email: input.email ?? null,
    phone: input.phone ?? null,
    passwordHash,
    role: 'CUSTOMER',
    status: 'ACTIVE', // For MVP, skip email verification
    emailVerified: false,
    phoneVerified: false,
  });

  // Generate tokens
  const tokenPair = generateTokenPair({
    id: userId,
    role: 'CUSTOMER',
    email: input.email,
  });

  // Store refresh token hash in database
  await storeRefreshToken(userId, tokenPair.refreshTokenRaw, meta);

  return {
    user: {
      id: userId,
      email: input.email,
      phone: input.phone,
      firstName: input.firstName,
      role: 'CUSTOMER',
    },
    tokens: {
      accessToken: tokenPair.accessToken,
      refreshToken: tokenPair.refreshToken,
    },
  };
}

// ═══ Login ═══

/**
 * Login with email and password.
 *
 * Business rules:
 * 1. Find user by email
 * 2. Check if account is locked (too many failed attempts)
 * 3. Compare password hash
 * 4. On failure: increment failed attempts, lock if threshold reached
 * 5. On success: reset failed attempts, generate tokens
 */
export async function loginWithEmail(
  input: LoginInput,
  meta: { ipAddress?: string; deviceInfo?: string },
): Promise<LoginResult> {
  // Find user by email
  const users = await db
    .select()
    .from(authCredentials)
    .where(eq(authCredentials.email, input.email))
    .limit(1);

  const user = users[0];

  if (!user) {
    // Don't reveal whether the email exists or not (security)
    throw new UnauthorizedError('Invalid email or password', 'AUTH_INVALID_CREDENTIALS');
  }

  // Check if account is locked
  if (user.lockedUntil && user.lockedUntil > new Date()) {
    throw new AppError(
      'Account is temporarily locked. Please try again later.',
      423,
      'AUTH_ACCOUNT_LOCKED',
    );
  }

  // Check if account is suspended/banned
  if (user.status === 'SUSPENDED') {
    throw new AppError('Account is suspended', 403, 'AUTH_ACCOUNT_SUSPENDED');
  }
  if (user.status === 'BANNED') {
    throw new AppError('Account is banned', 403, 'AUTH_ACCOUNT_SUSPENDED');
  }

  // Verify password
  if (!user.passwordHash) {
    // User registered via OAuth only — no password set
    throw new UnauthorizedError(
      'This account uses social login. Please sign in with Google.',
      'AUTH_INVALID_CREDENTIALS',
    );
  }

  const isPasswordValid = await comparePassword(input.password, user.passwordHash);

  if (!isPasswordValid) {
    // Increment failed attempts
    await handleFailedLogin(user);
    throw new UnauthorizedError('Invalid email or password', 'AUTH_INVALID_CREDENTIALS');
  }

  // Success! Reset failed attempts and update last login
  await db
    .update(authCredentials)
    .set({
      failedLoginAttempts: 0,
      lockedUntil: null,
      lastLoginAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(authCredentials.id, user.id));

  // Generate tokens
  const tokenPair = generateTokenPair({
    id: user.id,
    role: user.role,
    email: user.email ?? undefined,
  });

  await storeRefreshToken(user.id, tokenPair.refreshTokenRaw, meta);

  return {
    user: {
      id: user.id,
      email: user.email ?? undefined,
      phone: user.phone ?? undefined,
      firstName: '', // Will come from User Service profile
      role: user.role,
    },
    tokens: {
      accessToken: tokenPair.accessToken,
      refreshToken: tokenPair.refreshToken,
    },
  };
}

// ═══ Refresh Token ═══

/**
 * Refresh an access token using a refresh token.
 *
 * Implements REFRESH TOKEN ROTATION:
 * 1. Find the refresh token hash in the database
 * 2. If not found or revoked → token was stolen, revoke ALL user tokens
 * 3. If expired → return error
 * 4. Revoke the old refresh token
 * 5. Issue a new access token + new refresh token
 */
export async function refreshAccessToken(
  rawRefreshToken: string,
  meta: { ipAddress?: string; deviceInfo?: string },
): Promise<RefreshResult> {
  const tokenHash = hashRefreshToken(rawRefreshToken);

  // Find the token in database
  const tokens = await db
    .select()
    .from(refreshTokens)
    .where(eq(refreshTokens.tokenHash, tokenHash))
    .limit(1);

  const storedToken = tokens[0];

  if (!storedToken) {
    // Token not found — might have been revoked or never existed
    throw new UnauthorizedError('Invalid refresh token', 'AUTH_TOKEN_REVOKED');
  }

  // Check if already revoked (TOKEN REUSE DETECTION)
  // If a revoked token is being used, someone might have stolen the old token
  if (storedToken.revokedAt) {
    // Security: revoke ALL tokens for this user (nuclear option)
    await db
      .update(refreshTokens)
      .set({ revokedAt: new Date() })
      .where(eq(refreshTokens.userId, storedToken.userId));

    throw new UnauthorizedError(
      'Token reuse detected. All sessions have been revoked for security.',
      'AUTH_TOKEN_REVOKED',
    );
  }

  // Check if expired
  if (storedToken.expiresAt < new Date()) {
    throw new UnauthorizedError('Refresh token expired', 'AUTH_TOKEN_EXPIRED');
  }

  // Revoke the old refresh token (rotation)
  await db
    .update(refreshTokens)
    .set({ revokedAt: new Date() })
    .where(eq(refreshTokens.id, storedToken.id));

  // Get user details for new token
  const users = await db
    .select()
    .from(authCredentials)
    .where(eq(authCredentials.id, storedToken.userId))
    .limit(1);

  const user = users[0];
  if (!user) {
    throw new UnauthorizedError('User not found', 'AUTH_TOKEN_REVOKED');
  }

  // Generate new token pair
  const tokenPair = generateTokenPair({
    id: user.id,
    role: user.role,
    email: user.email ?? undefined,
  });

  await storeRefreshToken(user.id, tokenPair.refreshTokenRaw, meta);

  return {
    accessToken: tokenPair.accessToken,
    refreshToken: tokenPair.refreshToken,
  };
}

// ═══ Logout ═══

/**
 * Logout by revoking a specific refresh token.
 */
export async function logout(rawRefreshToken: string): Promise<void> {
  const tokenHash = hashRefreshToken(rawRefreshToken);

  await db
    .update(refreshTokens)
    .set({ revokedAt: new Date() })
    .where(eq(refreshTokens.tokenHash, tokenHash));
}

// ═══ Helpers ═══

/**
 * Store a hashed refresh token in the database.
 */
async function storeRefreshToken(
  userId: string,
  rawToken: string,
  meta: { ipAddress?: string; deviceInfo?: string },
): Promise<void> {
  const expiresAt = new Date();
  expiresAt.setSeconds(expiresAt.getSeconds() + DEFAULTS.REFRESH_TOKEN_EXPIRY);

  await db.insert(refreshTokens).values({
    id: generateId(),
    userId,
    tokenHash: hashRefreshToken(rawToken),
    deviceInfo: meta.deviceInfo ?? null,
    ipAddress: meta.ipAddress ?? null,
    expiresAt,
  });
}

/**
 * Handle a failed login attempt.
 * Increments the counter and locks the account if threshold is reached.
 */
async function handleFailedLogin(user: AuthCredential): Promise<void> {
  const newAttempts = user.failedLoginAttempts + 1;

  const updateData: Record<string, unknown> = {
    failedLoginAttempts: newAttempts,
    updatedAt: new Date(),
  };

  // Lock the account if too many failed attempts
  if (newAttempts >= DEFAULTS.MAX_LOGIN_ATTEMPTS) {
    const lockUntil = new Date();
    lockUntil.setSeconds(lockUntil.getSeconds() + DEFAULTS.LOCKOUT_DURATION);
    updateData['lockedUntil'] = lockUntil;
  }

  await db.update(authCredentials).set(updateData).where(eq(authCredentials.id, user.id));
}
