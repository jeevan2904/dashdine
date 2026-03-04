/**
 * Common validation schemas reused across multiple domains.
 */

import { z } from 'zod';

import { DEFAULTS } from '@dashdine/constants';

// ═══ Pagination ═══

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(DEFAULTS.MAX_PAGE_SIZE).default(DEFAULTS.PAGE_SIZE),
});

export type PaginationInput = z.infer<typeof paginationSchema>;

// ═══ Geo / Location ═══

export const coordinatesSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
});

export type CoordinatesInput = z.infer<typeof coordinatesSchema>;

// ═══ Address ═══

export const addressSchema = z.object({
  label: z.enum(['Home', 'Work', 'Other']),
  addressLine1: z.string().min(1).max(255),
  addressLine2: z.string().max(255).optional(),
  city: z.string().min(1).max(100),
  state: z.string().min(1).max(100),
  postalCode: z.string().min(1).max(10),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  isDefault: z.boolean().default(false),
});

export type AddressInput = z.infer<typeof addressSchema>;
