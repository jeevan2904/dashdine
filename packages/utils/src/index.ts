/**
 * @dashdine/utils
 *
 * Shared utility functions used across all DashDine services.
 * These are pure functions with no side effects — easy to test and reason about.
 */

import { createId, isCuid } from '@paralleldrive/cuid2';

// ═══ ID Generation ═══

/**
 * Generate a CUID2 identifier.
 *
 * CUID2 is our primary key strategy across all services because:
 * - Collision-resistant (safe for distributed systems)
 * - Sortable by creation time (keeps database indexes efficient)
 * - URL-friendly (no special characters)
 * - 24 characters (shorter than UUID's 36)
 *
 * Example output: "clx8f9k2g0001abc123def456"
 */
export function generateId(): string {
  return createId();
}

/**
 * Validate if a string is a valid CUID2.
 * Useful for validating path params and request bodies.
 */
export function isValidId(id: string): boolean {
  return isCuid(id);
}

// ═══ Money Utilities ═══
// All monetary values in DashDine are stored as integers in PAISE
// (smallest currency unit). ₹250.50 is stored as 25050.
// This avoids floating-point precision bugs.

/**
 * Convert rupees (decimal) to paise (integer).
 * Example: rupeesToPaise(250.50) → 25050
 */
export function rupeesToPaise(rupees: number): number {
  return Math.round(rupees * 100);
}

/**
 * Convert paise (integer) to rupees (decimal).
 * Example: paiseToRupees(25050) → 250.50
 */
export function paiseToRupees(paise: number): number {
  return paise / 100;
}

/**
 * Format paise as a human-readable rupee string.
 * Example: formatMoney(25050) → "₹250.50"
 */
export function formatMoney(paise: number): string {
  const rupees = paiseToRupees(paise);
  return `\u20B9${rupees.toFixed(2)}`;
}

/**
 * Calculate percentage of an amount.
 * Returns value in paise (integer).
 * Example: calculatePercentage(100000, 0.20) → 20000 (₹200 = 20% of ₹1000)
 */
export function calculatePercentage(amountInPaise: number, rate: number): number {
  return Math.round(amountInPaise * rate);
}

// ═══ Date Utilities ═══

/**
 * Get current ISO timestamp string.
 * Used as default value for createdAt/updatedAt fields.
 */
export function nowISO(): string {
  return new Date().toISOString();
}

/**
 * Check if a date string is in the past.
 */
export function isPast(dateString: string): boolean {
  return new Date(dateString) < new Date();
}

/**
 * Check if a date string is in the future.
 */
export function isFuture(dateString: string): boolean {
  return new Date(dateString) > new Date();
}

/**
 * Add minutes to current time and return ISO string.
 * Useful for setting token expiry, OTP expiry, etc.
 */
export function addMinutesFromNow(minutes: number): string {
  const date = new Date();
  date.setMinutes(date.getMinutes() + minutes);
  return date.toISOString();
}

/**
 * Add seconds to current time and return ISO string.
 */
export function addSecondsFromNow(seconds: number): string {
  const date = new Date();
  date.setSeconds(date.getSeconds() + seconds);
  return date.toISOString();
}

// ═══ String Utilities ═══

/**
 * Generate a URL-friendly slug from a string.
 * Example: slugify("Pizza Palace - Hyderabad") → "pizza-palace-hyderabad"
 */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '') // Remove non-word chars (except spaces and hyphens)
    .replace(/[\s_]+/g, '-') // Replace spaces and underscores with hyphens
    .replace(/-+/g, '-') // Collapse multiple hyphens
    .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens
}

/**
 * Generate a random numeric OTP of specified length.
 * Example: generateOTP(6) → "482917"
 */
export function generateOTP(length: number = 6): string {
  const digits = '0123456789';
  let otp = '';
  for (let i = 0; i < length; i++) {
    otp += digits[Math.floor(Math.random() * digits.length)];
  }
  return otp;
}

/**
 * Mask a phone number for display.
 * Example: maskPhone("+919876543210") → "+91****3210"
 */
export function maskPhone(phone: string): string {
  if (phone.length < 6) return phone;
  const visible = 4;
  const start = phone.slice(0, phone.length - visible - 4);
  const end = phone.slice(-visible);
  return `${start}****${end}`;
}

/**
 * Mask an email for display.
 * Example: maskEmail("john.doe@gmail.com") → "jo****@gmail.com"
 */
export function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (!local || !domain) return email;
  const visibleChars = Math.min(2, local.length);
  const masked = local.slice(0, visibleChars) + '****';
  return `${masked}@${domain}`;
}

// ═══ Geo Utilities ═══

/**
 * Calculate distance between two coordinates using Haversine formula.
 * Returns distance in kilometers.
 *
 * Used for estimating delivery distance and rider proximity.
 */
export function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 100) / 100; // Round to 2 decimal places
}

function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

// ═══ Async Utilities ═══

/**
 * Sleep for a specified duration.
 * Useful for retry logic with backoff.
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

/**
 * Retry an async function with exponential backoff.
 * Useful for external API calls that might fail transiently.
 *
 * Example: await retry(() => callRazorpayAPI(), { maxAttempts: 3 });
 */
export async function retry<T>(
  fn: () => Promise<T>,
  options: { maxAttempts?: number; baseDelayMs?: number } = {},
): Promise<T> {
  const { maxAttempts = 3, baseDelayMs = 1000 } = options;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (attempt === maxAttempts) throw error;
      const delay = baseDelayMs * Math.pow(2, attempt - 1);
      await sleep(delay);
    }
  }

  // TypeScript needs this even though it's unreachable
  throw new Error('Retry failed');
}

function setTimeout(resolve: (value: void | PromiseLike<void>) => void, ms: number) {
  throw new Error('Function not implemented.');
}
