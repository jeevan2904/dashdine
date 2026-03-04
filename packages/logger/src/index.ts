import pino, { type Logger as PinoLogger, type LoggerOptions } from 'pino';

/**
 * @dashdine/logger
 *
 * Structured JSON logging for all DashDine services.
 *
 * Why structured logging (not console.log)?
 * -----------------------------------------
 * console.log("Order created " + orderId)
 *   → Output: "Order created ord_abc123"
 *   → Can you search for all logs from order ord_abc123? No.
 *   → Can you filter by log level? No.
 *   → Can you correlate with other service logs? No.
 *
 * logger.info({ orderId, customerId, amount }, "Order created")
 *   → Output: {"level":"info","orderId":"ord_abc123","customerId":"usr_xyz",
 *              "amount":45000,"msg":"Order created","time":1709000000,"service":"order-service"}
 *   → Searchable, filterable, correlatable in ELK Stack.
 *
 * Usage:
 *   import { createLogger } from '@dashdine/logger';
 *
 *   const logger = createLogger({ service: 'order-service' });
 *
 *   logger.info({ orderId, amount }, 'Order created');
 *   logger.error({ err, orderId }, 'Failed to create order');
 *
 *   // Create a child logger with request context
 *   const reqLogger = logger.child({ requestId: 'req_abc', userId: 'usr_xyz' });
 *   reqLogger.info('Processing request'); // automatically includes requestId and userId
 */

export interface CreateLoggerOptions {
  /** Service name (e.g., 'order-service', 'auth-service') */
  service: string;
  /** Log level: 'debug' | 'info' | 'warn' | 'error' | 'fatal'. Default: based on NODE_ENV */
  level?: string;
  /** Additional default fields to include in every log line */
  defaultFields?: Record<string, unknown>;
}

export type Logger = PinoLogger;

/**
 * Creates a configured Pino logger instance for a DashDine service.
 *
 * In development: pretty-prints logs for readability.
 * In production: outputs raw JSON for ELK Stack ingestion.
 */
export function createLogger(options: CreateLoggerOptions): Logger {
  const { service, level, defaultFields = {} } = options;
  const isDev = process.env['NODE_ENV'] !== 'production';

  const pinoOptions: LoggerOptions = {
    // Log level: debug in dev, info in production
    level: level ?? (isDev ? 'debug' : 'info'),

    // Base fields included in every single log line
    base: {
      service,
      env: process.env['NODE_ENV'] ?? 'development',
      ...defaultFields,
    },

    // Use ISO timestamp format (readable and parseable)
    timestamp: pino.stdTimeFunctions.isoTime,

    // Format error objects properly (include stack trace)
    serializers: {
      err: pino.stdSerializers.err,
      error: pino.stdSerializers.err,
    },

    // In development, use pino-pretty for human-readable output
    // In production, output raw JSON (no pretty printing overhead)
    ...(isDev
      ? {
          transport: {
            target: 'pino-pretty',
            options: {
              colorize: true,
              translateTime: 'HH:MM:ss.l',
              ignore: 'pid,hostname,env',
              messageFormat: '{msg}',
            },
          },
        }
      : {}),
  };

  return pino(pinoOptions);
}

/**
 * Creates a silent logger (for testing).
 * All log calls are no-ops — nothing is printed.
 */
export function createSilentLogger(): Logger {
  return pino({ level: 'silent' });
}
