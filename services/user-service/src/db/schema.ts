/**
 * User Service — Database Schema
 *
 * Two tables:
 * - user_profiles: Core user information (name, avatar, preferences)
 * - addresses: Delivery addresses (each user can have multiple)
 *
 * IMPORTANT: The user_profiles.id is the SAME as auth_credentials.id.
 * This is a 1:1 relationship across service boundaries. When Auth Service
 * creates a user, User Service creates a profile with the same ID.
 * This makes cross-service joins unnecessary — any service that has a
 * user ID can look up the profile directly.
 */

import {
  boolean,
  date,
  decimal,
  index,
  pgEnum,
  pgTable,
  timestamp,
  varchar,
} from 'drizzle-orm/pg-core';

// ═══ Enums ═══

export const genderEnum = pgEnum('gender', ['MALE', 'FEMALE', 'OTHER', 'PREFER_NOT_TO_SAY']);

// ═══ Tables ═══

export const userProfiles = pgTable(
  'user_profiles',
  {
    /**
     * Same ID as auth_credentials.id (shared CUID2).
     * NOT auto-generated — we receive this from Auth Service.
     */
    id: varchar('id', { length: 36 }).primaryKey(),

    firstName: varchar('first_name', { length: 100 }).notNull(),
    lastName: varchar('last_name', { length: 100 }),
    displayName: varchar('display_name', { length: 200 }),

    /** Profile image URL (from Media Service / S3) */
    avatarUrl: varchar('avatar_url', { length: 500 }),

    dateOfBirth: date('date_of_birth'),
    gender: genderEnum('gender'),

    /** Currently selected delivery address */
    defaultAddressId: varchar('default_address_id', { length: 36 }),

    preferredLanguage: varchar('preferred_language', { length: 5 }).notNull().default('en'),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index('idx_profile_name').on(table.firstName, table.lastName)],
);

export const addresses = pgTable(
  'addresses',
  {
    id: varchar('id', { length: 36 }).primaryKey(),

    userId: varchar('user_id', { length: 36 })
      .notNull()
      .references(() => userProfiles.id, { onDelete: 'cascade' }),

    /** Label: Home, Work, Other */
    label: varchar('label', { length: 50 }).notNull(),

    addressLine1: varchar('address_line_1', { length: 255 }).notNull(),
    addressLine2: varchar('address_line_2', { length: 255 }),
    city: varchar('city', { length: 100 }).notNull(),
    state: varchar('state', { length: 100 }).notNull(),
    postalCode: varchar('postal_code', { length: 10 }).notNull(),
    country: varchar('country', { length: 2 }).notNull().default('IN'),

    /** GPS coordinates for delivery distance calculation */
    latitude: decimal('latitude', { precision: 10, scale: 7 }).notNull(),
    longitude: decimal('longitude', { precision: 10, scale: 7 }).notNull(),

    isDefault: boolean('is_default').notNull().default(false),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index('idx_address_user').on(table.userId), index('idx_address_city').on(table.city)],
);

// ═══ Inferred Types ═══

export type UserProfile = typeof userProfiles.$inferSelect;
export type NewUserProfile = typeof userProfiles.$inferInsert;
export type Address = typeof addresses.$inferSelect;
export type NewAddress = typeof addresses.$inferInsert;
