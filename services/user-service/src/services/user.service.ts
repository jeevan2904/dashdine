/**
 * User Service — Business Logic Layer
 *
 * Handles user profile management and delivery addresses.
 *
 * KEY DESIGN DECISION:
 * Profile creation happens in two ways:
 * 1. Via RabbitMQ event: Auth Service publishes 'user.registered',
 *    User Service consumes it and auto-creates a minimal profile.
 * 2. Via API: User updates their profile with additional details.
 *
 * This means profile creation is EVENTUAL — there's a tiny delay
 * between registration and profile availability. In practice this
 * is milliseconds, and the BFF handles it gracefully.
 */

import { eq, and } from 'drizzle-orm';

import { generateId } from '@dashdine/utils';

import { db } from '../db/index.js';
import { userProfiles, addresses, type UserProfile, type Address } from '../db/schema.js';
import { NotFoundError, AppError } from '../lib/errors.js';

// ═══ Profile Operations ═══

/**
 * Create a user profile.
 * Called when we receive a 'user.registered' event from Auth Service,
 * or can be called directly for initial profile setup.
 */
export async function createProfile(data: {
  id: string;
  firstName: string;
  lastName?: string;
}): Promise<UserProfile> {
  // Check if profile already exists (idempotency)
  const existing = await db
    .select()
    .from(userProfiles)
    .where(eq(userProfiles.id, data.id))
    .limit(1);

  if (existing[0]) {
    return existing[0];
  }

  const result = await db
    .insert(userProfiles)
    .values({
      id: data.id,
      firstName: data.firstName,
      lastName: data.lastName ?? null,
    })
    .returning();

  const profile = result[0];
  if (!profile) {
    throw new AppError('Failed to create profile');
  }

  return profile;
}

/**
 * Get a user profile by ID.
 */
export async function getProfile(userId: string): Promise<UserProfile> {
  const results = await db.select().from(userProfiles).where(eq(userProfiles.id, userId)).limit(1);

  const profile = results[0];
  if (!profile) {
    throw new NotFoundError('Profile', userId);
  }

  return profile;
}

/**
 * Update a user profile.
 * Only updates fields that are provided (partial update).
 */
export async function updateProfile(
  userId: string,
  data: {
    firstName?: string;
    lastName?: string;
    displayName?: string;
    avatarUrl?: string;
    dateOfBirth?: string;
    gender?: 'MALE' | 'FEMALE' | 'OTHER' | 'PREFER_NOT_TO_SAY';
    preferredLanguage?: string;
  },
): Promise<UserProfile> {
  // Verify profile exists
  await getProfile(userId);

  // Build update object with only provided fields
  const updateData: Record<string, unknown> = { updatedAt: new Date() };

  if (data.firstName !== undefined) updateData['firstName'] = data.firstName;
  if (data.lastName !== undefined) updateData['lastName'] = data.lastName;
  if (data.displayName !== undefined) updateData['displayName'] = data.displayName;
  if (data.avatarUrl !== undefined) updateData['avatarUrl'] = data.avatarUrl;
  if (data.dateOfBirth !== undefined) updateData['dateOfBirth'] = data.dateOfBirth;
  if (data.gender !== undefined) updateData['gender'] = data.gender;
  if (data.preferredLanguage !== undefined)
    updateData['preferredLanguage'] = data.preferredLanguage;

  const result = await db
    .update(userProfiles)
    .set(updateData)
    .where(eq(userProfiles.id, userId))
    .returning();

  const updated = result[0];
  if (!updated) {
    throw new AppError('Failed to update profile');
  }

  return updated;
}

// ═══ Address Operations ═══

/**
 * Get all addresses for a user.
 */
export async function getUserAddresses(userId: string): Promise<Address[]> {
  return db
    .select()
    .from(addresses)
    .where(eq(addresses.userId, userId))
    .orderBy(addresses.createdAt);
}

/**
 * Add a new delivery address.
 *
 * If is_default is true, unset default on all other addresses first.
 * This ensures at most one default address per user.
 */
export async function addAddress(
  userId: string,
  data: {
    label: string;
    addressLine1: string;
    addressLine2?: string;
    city: string;
    state: string;
    postalCode: string;
    latitude: number;
    longitude: number;
    isDefault?: boolean;
  },
): Promise<Address> {
  // Verify user exists
  await getProfile(userId);

  const addressId = generateId();

  // If this is the default, unset all other defaults
  if (data.isDefault) {
    await db.update(addresses).set({ isDefault: false }).where(eq(addresses.userId, userId));
  }

  // Check if this is the user's first address — make it default automatically
  const existingAddresses = await getUserAddresses(userId);
  const shouldBeDefault = data.isDefault ?? existingAddresses.length === 0;

  const result = await db
    .insert(addresses)
    .values({
      id: addressId,
      userId,
      label: data.label,
      addressLine1: data.addressLine1,
      addressLine2: data.addressLine2 ?? null,
      city: data.city,
      state: data.state,
      postalCode: data.postalCode,
      latitude: data.latitude.toFixed(7),
      longitude: data.longitude.toFixed(7),
      isDefault: shouldBeDefault,
    })
    .returning();

  const address = result[0];
  if (!address) {
    throw new AppError('Failed to create address');
  }

  // Update user's default address if needed
  if (shouldBeDefault) {
    await db
      .update(userProfiles)
      .set({ defaultAddressId: addressId, updatedAt: new Date() })
      .where(eq(userProfiles.id, userId));
  }

  return address;
}

/**
 * Delete an address.
 * If it was the default, we don't auto-assign a new default —
 * the user must explicitly choose one.
 */
export async function deleteAddress(userId: string, addressId: string): Promise<void> {
  const result = await db
    .delete(addresses)
    .where(and(eq(addresses.id, addressId), eq(addresses.userId, userId)))
    .returning({ id: addresses.id });

  if (result.length === 0) {
    throw new NotFoundError('Address', addressId);
  }

  // If deleted address was the default, clear the reference
  const profile = await getProfile(userId);
  if (profile.defaultAddressId === addressId) {
    await db
      .update(userProfiles)
      .set({ defaultAddressId: null, updatedAt: new Date() })
      .where(eq(userProfiles.id, userId));
  }
}
