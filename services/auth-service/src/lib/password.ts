/**
 * Password hashing and comparison using bcrypt.
 *
 * WHY BCRYPT?
 * -----------
 * bcrypt is specifically designed for password hashing. Unlike SHA-256 or MD5:
 * - It's intentionally SLOW (configurable via salt rounds)
 * - It includes a random salt in every hash (same password → different hash each time)
 * - It's resistant to rainbow table attacks
 *
 * The "salt rounds" parameter (12) controls how computationally expensive the
 * hash is. Each increment doubles the time. 12 rounds takes ~250ms, which is
 * perfectly fine for login (happens once) but makes brute-force attacks
 * impractical (attacker would need ~250ms per guess attempt).
 *
 * IMPORTANT SECURITY NOTE:
 * - NEVER store plaintext passwords
 * - NEVER use MD5/SHA-256 for passwords (too fast = easy to brute-force)
 * - NEVER log passwords (even hashed ones)
 */

import bcrypt from 'bcryptjs';

/** Number of salt rounds for bcrypt. 12 is a good balance of security and speed. */
const SALT_ROUNDS = 12;

/**
 * Hash a plaintext password.
 * Used during registration and password change.
 *
 * Example:
 *   const hash = await hashPassword('MySecureP@ss123');
 *   // hash: "$2a$12$LJ3m5..." (60 characters, different each time)
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

/**
 * Compare a plaintext password with a bcrypt hash.
 * Used during login to verify the password.
 *
 * Example:
 *   const isValid = await comparePassword('MySecureP@ss123', storedHash);
 *   // isValid: true or false
 */
export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}
