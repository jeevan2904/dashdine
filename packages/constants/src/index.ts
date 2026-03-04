/**
 * @dashdine/constants
 *
 * Unlike @dashdine/types (compile-time only), these are RUNTIME values
 * that services use in their logic. Error codes, event names, config
 * defaults, etc.
 *
 * Why not just use string literals? Because:
 * 1. Typos in strings cause silent bugs: "order.placd" vs "order.placed"
 * 2. Constants give you autocomplete in your IDE
 * 3. Renaming a constant updates all usages automatically
 * 4. You can grep the codebase for all uses of a specific event/error
 */

// ═══ Error Codes ═══
// Namespaced by domain to avoid collisions

export const ERROR_CODES = {
  // Auth errors
  AUTH_INVALID_CREDENTIALS: 'AUTH_INVALID_CREDENTIALS',
  AUTH_INVALID_OTP: 'AUTH_INVALID_OTP',
  AUTH_OTP_EXPIRED: 'AUTH_OTP_EXPIRED',
  AUTH_ACCOUNT_LOCKED: 'AUTH_ACCOUNT_LOCKED',
  AUTH_ACCOUNT_SUSPENDED: 'AUTH_ACCOUNT_SUSPENDED',
  AUTH_TOKEN_EXPIRED: 'AUTH_TOKEN_EXPIRED',
  AUTH_TOKEN_REVOKED: 'AUTH_TOKEN_REVOKED',
  AUTH_OAUTH_FAILED: 'AUTH_OAUTH_FAILED',
  AUTH_UNAUTHORIZED: 'AUTH_UNAUTHORIZED',
  AUTH_FORBIDDEN: 'AUTH_FORBIDDEN',

  // Order errors
  ORDER_NOT_FOUND: 'ORDER_NOT_FOUND',
  ORDER_NOT_CANCELLABLE: 'ORDER_NOT_CANCELLABLE',
  ORDER_RESTAURANT_OFFLINE: 'ORDER_RESTAURANT_OFFLINE',
  ORDER_BELOW_MINIMUM: 'ORDER_BELOW_MINIMUM',
  ORDER_ITEMS_UNAVAILABLE: 'ORDER_ITEMS_UNAVAILABLE',
  ORDER_ALREADY_RATED: 'ORDER_ALREADY_RATED',

  // Payment errors
  PAYMENT_FAILED: 'PAYMENT_FAILED',
  PAYMENT_INVALID_SIGNATURE: 'PAYMENT_INVALID_SIGNATURE',
  PAYMENT_REFUND_FAILED: 'PAYMENT_REFUND_FAILED',
  PAYMENT_ALREADY_PROCESSED: 'PAYMENT_ALREADY_PROCESSED',

  // Delivery errors
  DELIVERY_BROADCAST_EXPIRED: 'DELIVERY_BROADCAST_EXPIRED',
  DELIVERY_ALREADY_ACCEPTED: 'DELIVERY_ALREADY_ACCEPTED',
  DELIVERY_INVALID_OTP: 'DELIVERY_INVALID_OTP',
  DELIVERY_RIDER_UNAVAILABLE: 'DELIVERY_RIDER_UNAVAILABLE',

  // Promo errors
  PROMO_INVALID_CODE: 'PROMO_INVALID_CODE',
  PROMO_EXPIRED: 'PROMO_EXPIRED',
  PROMO_USAGE_LIMIT_REACHED: 'PROMO_USAGE_LIMIT_REACHED',
  PROMO_MIN_ORDER_NOT_MET: 'PROMO_MIN_ORDER_NOT_MET',
  PROMO_NOT_APPLICABLE: 'PROMO_NOT_APPLICABLE',

  // Generic errors
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  NOT_FOUND: 'NOT_FOUND',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  RATE_LIMITED: 'RATE_LIMITED',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
} as const;

/** Type-safe error code type derived from the constant object */
export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];

// ═══ Domain Events ═══
// Event names used for RabbitMQ pub/sub

export const EVENTS = {
  // User events
  USER_REGISTERED: 'user.registered',
  USER_LOGGED_IN: 'user.logged_in',
  USER_PROFILE_UPDATED: 'user.profile_updated',

  // Order events
  ORDER_PLACED: 'order.placed',
  ORDER_CONFIRMED: 'order.confirmed',
  ORDER_PREPARING: 'order.preparing',
  ORDER_READY: 'order.ready',
  ORDER_PICKED_UP: 'order.picked_up',
  ORDER_DELIVERED: 'order.delivered',
  ORDER_CANCELLED: 'order.cancelled',

  // Payment events
  PAYMENT_INITIATED: 'payment.initiated',
  PAYMENT_COMPLETED: 'payment.completed',
  PAYMENT_FAILED: 'payment.failed',
  PAYMENT_REFUNDED: 'payment.refunded',

  // Delivery events
  DELIVERY_BROADCAST_SENT: 'delivery.broadcast_sent',
  DELIVERY_RIDER_ASSIGNED: 'delivery.rider_assigned',
  DELIVERY_COMPLETED: 'delivery.completed',

  // Restaurant events
  RESTAURANT_REGISTERED: 'restaurant.registered',
  RESTAURANT_APPROVED: 'restaurant.approved',
  RESTAURANT_MENU_UPDATED: 'restaurant.menu_updated',
  RESTAURANT_STATUS_CHANGED: 'restaurant.status_changed',

  // Settlement events
  SETTLEMENT_PROCESSED: 'settlement.processed',
  SETTLEMENT_FAILED: 'settlement.failed',

  // Notification events
  NOTIFICATION_SENT: 'notification.sent',
  NOTIFICATION_FAILED: 'notification.failed',
} as const;

export type EventName = (typeof EVENTS)[keyof typeof EVENTS];

// ═══ RabbitMQ Exchange & Queue Names ═══

export const EXCHANGES = {
  ORDERS: 'dashdine.orders',
  PAYMENTS: 'dashdine.payments',
  DELIVERY: 'dashdine.delivery',
  NOTIFICATIONS: 'dashdine.notifications',
  RESTAURANTS: 'dashdine.restaurants',
  USERS: 'dashdine.users',
  SETTLEMENTS: 'dashdine.settlements',
} as const;

// ═══ Configuration Defaults ═══

export const DEFAULTS = {
  /** Default pagination page size */
  PAGE_SIZE: 20,
  /** Maximum allowed page size */
  MAX_PAGE_SIZE: 50,
  /** JWT access token expiry in seconds (15 minutes) */
  ACCESS_TOKEN_EXPIRY: 900,
  /** JWT refresh token expiry in seconds (7 days) */
  REFRESH_TOKEN_EXPIRY: 604_800,
  /** OTP expiry in seconds (5 minutes) */
  OTP_EXPIRY: 300,
  /** Maximum failed login attempts before lockout */
  MAX_LOGIN_ATTEMPTS: 5,
  /** Account lockout duration in seconds (1 hour) */
  LOCKOUT_DURATION: 3600,
  /** Maximum OTP requests per phone per hour */
  MAX_OTP_REQUESTS_PER_HOUR: 5,
  /** Broadcast timeout in seconds (how long riders have to accept) */
  BROADCAST_TIMEOUT: 45,
  /** Initial broadcast radius in km */
  BROADCAST_INITIAL_RADIUS: 3,
  /** Maximum broadcast radius in km */
  BROADCAST_MAX_RADIUS: 10,
  /** Rider location update interval in seconds */
  RIDER_LOCATION_UPDATE_INTERVAL: 5,
  /** Rider location TTL in Redis (seconds) */
  RIDER_LOCATION_TTL: 60,
  /** Default restaurant commission rate */
  DEFAULT_COMMISSION_RATE: 0.2,
  /** Settlement cycle: weekly */
  SETTLEMENT_CYCLE_DAYS: 7,
  /** Minimum order value for delivery in paise (₹50) */
  MIN_ORDER_VALUE: 5000,
  /** Base delivery fee in paise (₹25) */
  BASE_DELIVERY_FEE: 2500,
  /** Per-km delivery fee in paise (₹8/km) */
  PER_KM_DELIVERY_FEE: 800,
} as const;

// ═══ HTTP Status Codes ═══

export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  GONE: 410,
  UNPROCESSABLE_ENTITY: 422,
  LOCKED: 423,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503,
} as const;

// ═══ Redis Key Prefixes ═══

export const REDIS_KEYS = {
  SESSION: 'session',
  OTP: 'otp',
  OTP_ATTEMPTS: 'otp:attempts',
  RATE_LIMIT: 'rate_limit',
  RATE_LIMIT_USER: 'rate_limit:user',
  CACHE_RESTAURANT: 'cache:restaurant',
  CACHE_MENU: 'cache:menu',
  CACHE_RESTAURANTS_CITY: 'cache:restaurants:city',
  RIDER_LOCATION: 'rider:location',
  RIDER_ONLINE: 'rider:online',
  BROADCAST_LOCK: 'broadcast:lock',
  BROADCAST_ACTIVE: 'broadcast:active',
  RIDER_ACTIVE_DELIVERY: 'rider:active_delivery',
  RESTAURANT_ACTIVE_ORDERS: 'restaurant:orders:active',
  SURGE: 'surge',
} as const;
