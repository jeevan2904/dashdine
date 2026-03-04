/**
 * Auth-related types shared across Auth Service, BFF gateways,
 * and any service that needs to verify user identity.
 */

/** What the JWT access token contains after decoding */
export interface JwtPayload {
  /** User ID (CUID2) */
  sub: string;
  /** User's role in the platform */
  role: UserRole;
  /** User's email (if available) */
  email?: string;
  /** City the user is operating in (for riders/restaurants) */
  cityId?: string;
  /** Token issued at (unix timestamp) */
  iat: number;
  /** Token expires at (unix timestamp) */
  exp: number;
  /** Unique token identifier (for revocation) */
  jti: string;
}

/** All possible user roles in the platform */
export type UserRole = 'CUSTOMER' | 'RIDER' | 'RESTAURANT_OWNER' | 'RESTAURANT_STAFF' | 'ADMIN';

/** Account status */
export type AccountStatus = 'ACTIVE' | 'SUSPENDED' | 'BANNED' | 'PENDING_VERIFICATION';

/** OAuth providers we support */
export type OAuthProvider = 'GOOGLE' | 'APPLE' | 'FACEBOOK';

/** Shape of the tokens returned after authentication */
export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

/** Response after successful login/register */
export interface AuthResponse {
  user: {
    id: string;
    email?: string;
    phone?: string;
    firstName: string;
    role: UserRole;
  };
  tokens: AuthTokens;
  isNewUser?: boolean;
}
