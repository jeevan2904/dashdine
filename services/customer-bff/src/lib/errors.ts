import { type ErrorCode } from '@dashdine/constants';

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
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  public readonly details: Array<{ field: string; message: string }>;
  constructor(details: Array<{ field: string; message: string }>) {
    super('Validation failed', 422, 'VALIDATION_ERROR');
    this.name = 'ValidationError';
    this.details = details;
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = 'Authentication required') {
    super(message, 401, 'AUTH_UNAUTHORIZED');
    this.name = 'UnauthorizedError';
  }
}
