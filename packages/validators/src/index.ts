/**
 * @dashdine/validators
 *
 * Shared Zod validation schemas for the DashDine platform.
 *
 * Usage:
 *   import { registerSchema, type RegisterInput } from '@dashdine/validators';
 *
 *   const result = registerSchema.safeParse(requestBody);
 *   if (!result.success) {
 *     // result.error contains field-level validation errors
 *   }
 */

// Re-export Zod for convenience (so consumers don't need to install zod separately)
export { z } from 'zod';

export * from './auth.js';
export * from './common.js';
export * from './order.js';
