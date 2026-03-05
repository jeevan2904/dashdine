/**
 * Service Client — Generic HTTP client for calling microservices.
 *
 * WHY NOT JUST USE fetch() DIRECTLY?
 * -----------------------------------
 * 1. Error mapping: If Auth Service returns 401, we need to forward that
 *    to the frontend as 401, not wrap it in a 500.
 * 2. Timeouts: If a service is slow, we don't want to hang forever.
 * 3. Logging: Every inter-service call should be logged for debugging.
 * 4. Consistency: One place to handle retries, headers, error formats.
 *
 * USAGE:
 *   const client = new ServiceClient('http://localhost:3001', logger);
 *   const result = await client.post('/api/v1/auth/register', { email, password });
 */

import { AppError } from './errors.js';

interface ServiceLogger {
  info: (obj: Record<string, unknown>, msg: string) => void;
  error: (obj: Record<string, unknown>, msg: string) => void;
  warn: (obj: Record<string, unknown>, msg: string) => void;
}

/** Response shape from our microservices (standard envelope) */
interface ServiceResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: Array<{ field: string; message: string }>;
    requestId?: string;
  };
}

export class ServiceClient {
  private readonly baseUrl: string;
  private readonly logger: ServiceLogger;
  private readonly timeoutMs: number;

  constructor(baseUrl: string, logger: ServiceLogger, timeoutMs: number = 10_000) {
    // Remove trailing slash
    this.baseUrl = baseUrl.replace(/\/$/, '');
    this.logger = logger;
    this.timeoutMs = timeoutMs;
  }

  /**
   * Make a GET request to a microservice.
   */
  async get<T = unknown>(path: string, headers?: Record<string, string>): Promise<T> {
    return this.request<T>('GET', path, undefined, headers);
  }

  /**
   * Make a POST request to a microservice.
   */
  async post<T = unknown>(
    path: string,
    body?: unknown,
    headers?: Record<string, string>,
  ): Promise<T> {
    return this.request<T>('POST', path, body, headers);
  }

  /**
   * Make a PUT request to a microservice.
   */
  async put<T = unknown>(
    path: string,
    body?: unknown,
    headers?: Record<string, string>,
  ): Promise<T> {
    return this.request<T>('PUT', path, body, headers);
  }

  /**
   * Make a DELETE request to a microservice.
   */
  async delete<T = unknown>(path: string, headers?: Record<string, string>): Promise<T> {
    return this.request<T>('DELETE', path, undefined, headers);
  }

  /**
   * Core request method. All HTTP methods go through here.
   */
  private async request<T>(
    method: string,
    path: string,
    body?: unknown,
    headers?: Record<string, string>,
  ): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const startTime = Date.now();

    this.logger.info({ method, url }, 'Service call started');

    try {
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...headers,
        },
        body: body ? JSON.stringify(body) : undefined,
        signal: AbortSignal.timeout(this.timeoutMs),
      });

      const durationMs = Date.now() - startTime;
      const responseData = (await response.json()) as ServiceResponse<T>;

      this.logger.info(
        { method, url, statusCode: response.status, durationMs },
        'Service call completed',
      );

      // If the downstream service returned an error, propagate it
      if (!response.ok || !responseData.success) {
        const error = responseData.error;
        throw new AppError(
          error?.message ?? `Service returned ${response.status}`,
          response.status,
          error?.code ?? 'SERVICE_ERROR',
        );
      }

      return responseData.data as T;
    } catch (error) {
      const durationMs = Date.now() - startTime;

      // If it's already our AppError, just rethrow
      if (error instanceof AppError) {
        throw error;
      }

      // Handle timeout
      if (error instanceof DOMException && error.name === 'TimeoutError') {
        this.logger.error({ method, url, durationMs }, 'Service call timed out');
        throw new AppError(
          'Service is not responding. Please try again.',
          503,
          'SERVICE_UNAVAILABLE',
        );
      }

      // Handle connection refused (service is down)
      if (
        error instanceof TypeError &&
        (error.message.includes('fetch failed') || error.message.includes('ECONNREFUSED'))
      ) {
        this.logger.error({ method, url, err: error }, 'Service is unreachable');
        throw new AppError(
          'Service is temporarily unavailable. Please try again.',
          503,
          'SERVICE_UNAVAILABLE',
        );
      }

      // Unknown error
      this.logger.error(
        { method, url, err: error instanceof Error ? error : new Error(String(error)), durationMs },
        'Service call failed',
      );
      throw new AppError('An unexpected error occurred', 500, 'INTERNAL_ERROR');
    }
  }
}
