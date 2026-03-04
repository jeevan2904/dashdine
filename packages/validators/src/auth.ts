/**
 * Auth-related Zod validation schemas.
 *
 * These schemas serve DUAL purpose:
 * 1. Runtime validation: validate API request bodies at the service boundary
 * 2. TypeScript types: derive types with z.infer<> (single source of truth)
 *
 * Example:
 *   import { registerSchema, type RegisterInput } from '@dashdine/validators';
 *
 *   // In your route handler:
 *   const parsed = registerSchema.safeParse(req.body);
 *   if (!parsed.success) return res.status(400).send(parsed.error);
 *   const data: RegisterInput = parsed.data; // fully typed!
 */

import { z } from 'zod';

// ═══ Reusable field schemas ═══

export const emailSchema = z
  .string()
  .email('Invalid email format')
  .max(255, 'Email too long')
  .transform((val) => val.toLowerCase().trim());

export const phoneSchema = z
  .string()
  .regex(/^\+[1-9]\d{7,14}$/, 'Phone must include country code (e.g., +919876543210)')
  .max(20, 'Phone number too long');

export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password too long')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number');

export const nameSchema = z.string().min(1, 'Name is required').max(100, 'Name too long').trim();

export const cuidSchema = z.string().min(1, 'ID is required');

// ═══ Auth Schemas ═══

export const registerSchema = z
  .object({
    email: emailSchema.optional(),
    phone: phoneSchema.optional(),
    password: passwordSchema.optional(),
    firstName: nameSchema,
    lastName: nameSchema.optional(),
  })
  .refine((data) => data.email !== undefined || data.phone !== undefined, {
    message: 'Either email or phone is required',
  })
  .refine(
    (data) => {
      // If email is provided, password is required
      if (data.email !== undefined && data.password === undefined) return false;
      return true;
    },
    { message: 'Password is required when registering with email' },
  );

export type RegisterInput = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required'),
});

export type LoginInput = z.infer<typeof loginSchema>;

export const sendOtpSchema = z.object({
  phone: phoneSchema,
  purpose: z.enum(['LOGIN', 'REGISTER']),
});

export type SendOtpInput = z.infer<typeof sendOtpSchema>;

export const verifyOtpSchema = z.object({
  phone: phoneSchema,
  otp: z.string().length(6, 'OTP must be 6 digits').regex(/^\d+$/, 'OTP must be numeric'),
  purpose: z.enum(['LOGIN', 'REGISTER']),
});

export type VerifyOtpInput = z.infer<typeof verifyOtpSchema>;

export const googleOAuthSchema = z.object({
  idToken: z.string().min(1, 'Google ID token is required'),
});

export type GoogleOAuthInput = z.infer<typeof googleOAuthSchema>;

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});

export type RefreshTokenInput = z.infer<typeof refreshTokenSchema>;
