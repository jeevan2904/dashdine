/**
 * Common types used across ALL services and BFF gateways.
 * These define the standard "shape" of API communication.
 */

// ═══ API Response Envelope ═══

/** Standard success response */
export interface ApiResponse<T> {
  success: true;
  data: T;
  meta?: ResponseMeta;
}

/** Standard error response */
export interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: FieldError[];
    requestId: string;
  };
}

export interface FieldError {
  field: string;
  message: string;
}

export interface ResponseMeta {
  pagination?: PaginationMeta;
  cacheHit?: boolean;
  requestId: string;
}

// ═══ Pagination ═══

/** Offset-based pagination (for most list endpoints) */
export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

/** Standard pagination query params */
export interface PaginationParams {
  page?: number;
  limit?: number;
}

// ═══ Domain Events (RabbitMQ) ═══

/**
 * Base event shape for all async events published to RabbitMQ.
 * Every event includes metadata for tracing and idempotency.
 */
export interface DomainEvent<T = unknown> {
  /** Unique event ID (for idempotency) */
  eventId: string;
  /** Event type (e.g., 'order.placed', 'payment.completed') */
  eventType: string;
  /** ID of the aggregate root (e.g., orderId, userId) */
  aggregateId: string;
  /** Event payload */
  data: T;
  /** Request ID that triggered this event (for distributed tracing) */
  correlationId: string;
  /** When the event occurred */
  timestamp: string;
  /** Which service published this event */
  source: string;
}

// ═══ Utility Types ═══

/** Make specific fields optional in a type */
export type PartialBy<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

/** Make specific fields required in a type */
export type RequiredBy<T, K extends keyof T> = Omit<T, K> & Required<Pick<T, K>>;

/** Extract the data type from an ApiResponse */
export type ExtractData<T> = T extends ApiResponse<infer D> ? D : never;
