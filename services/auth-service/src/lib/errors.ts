/**
 * Custom error classes for the Auth Service.
 *
 * WHY CUSTOM ERRORS?
 * ------------------
 * JavaScript's built-in Error class only has a `message` property.
 * In an API, we need richer error information:
 * - HTTP status code (400, 401, 404, etc.)
 * - Machine-readable error code ("AUTH_INVALID_OTP")
 * - Field-level validation details
 *
 * By creating custom error classes, our error handler can look at
 * the error type and automatically construct the right API response.
 *
 * USAGE:
 *   throw new AppError('Invalid OTP', 401, 'AUTH_INVALID_OTP');
 *   throw new ValidationError([{ field: 'email', message: 'Invalid format' }]);
 *   throw new NotFoundError('Order', 'ord_abc123');
 */

import { type ErrorCode } from '@dashdine/constants';

/**
 * Base application error with status code and error code.
 * All other custom errors extend this.
 */
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: ErrorCode | string;
  public readonly isOperational: boolean;

  constructor(
    message: string,
    statusCode: number = 500,
    code: ErrorCode | string = 'INTERNAL_ERROR',
  ) {
    super(message);

    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code;

    // Operational errors are expected (bad input, not found, etc.)
    // vs programming errors (null reference, type error, etc.)
    // We only show operational error details to clients.
    this.isOperational = true;

    // Maintains proper stack trace in V8 (Node.js)
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Validation error with field-level details.
 * Used when request body fails Zod schema validation.
 */
export class ValidationError extends AppError {
  public readonly details: Array<{ field: string; message: string }>;

  constructor(details: Array<{ field: string; message: string }>) {
    super('Validation failed', 422, 'VALIDATION_ERROR');
    this.name = 'ValidationError';
    this.details = details;
  }
}

/**
 * Resource not found error.
 * Example: NotFoundError('Order', 'ord_abc123')
 * → "Order with ID ord_abc123 not found"
 */
export class NotFoundError extends AppError {
  constructor(resource: string, id?: string) {
    const message = id ? `${resource} with ID ${id} not found` : `${resource} not found`;
    super(message, 404, 'NOT_FOUND');
    this.name = 'NotFoundError';
  }
}

/**
 * Authentication error — user is not logged in or token is invalid.
 */
export class UnauthorizedError extends AppError {
  constructor(message: string = 'Authentication required', code?: ErrorCode | string) {
    super(message, 401, code ?? 'AUTH_UNAUTHORIZED');
    this.name = 'UnauthorizedError';
  }
}

/**
 * Authorization error — user is logged in but doesn't have permission.
 */
export class ForbiddenError extends AppError {
  constructor(message: string = 'Insufficient permissions') {
    super(message, 403, 'AUTH_FORBIDDEN');
    this.name = 'ForbiddenError';
  }
}

/**
 * Conflict error — resource already exists or operation conflicts.
 * Example: trying to register with an email that's already taken.
 */
export class ConflictError extends AppError {
  constructor(message: string, code?: ErrorCode | string) {
    super(message, 409, code ?? 'CONFLICT');
    this.name = 'ConflictError';
  }
}

/**
 * Rate limit error — too many requests.
 */
export class RateLimitError extends AppError {
  public readonly retryAfter: number;

  constructor(retryAfterSeconds: number = 60) {
    super('Too many requests. Please try again later.', 429, 'RATE_LIMITED');
    this.name = 'RateLimitError';
    this.retryAfter = retryAfterSeconds;
  }
}
