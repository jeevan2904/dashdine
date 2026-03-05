/**
 * @dashdine/queue — Shared RabbitMQ Event System
 *
 * HOW RABBITMQ WORKS (simplified):
 * ─────────────────────────────────
 *
 * Producer (Auth Service)
 *    │
 *    │ publishes message to an EXCHANGE
 *    ▼
 * ┌──────────────┐
 * │   Exchange    │  Receives messages and routes them to queues
 * │  (topic type) │  based on the routing key (e.g., "user.registered")
 * └──────┬───────┘
 *        │ routing key matches binding pattern
 *        ▼
 * ┌──────────────┐
 * │    Queue      │  Holds messages until a consumer picks them up
 * │ (per service) │  Messages survive RabbitMQ restarts (durable)
 * └──────┬───────┘
 *        │
 *        ▼
 * Consumer (User Service)
 *    Processes the message, then ACKs (acknowledges) it.
 *    If processing fails, the message is NACK'd and retried.
 *
 * KEY CONCEPTS:
 * - Exchange: Router. Decides which queues get which messages.
 * - Queue: Buffer. Stores messages until consumed.
 * - Routing Key: Address. "user.registered", "order.placed", etc.
 * - Binding: Rule. Connects an exchange to a queue with a pattern.
 * - ACK: "I processed this successfully, delete it."
 * - NACK: "I failed, put it back for retry."
 *
 * We use TOPIC exchanges because they support pattern matching:
 * - "user.*" matches "user.registered", "user.updated"
 * - "order.#" matches "order.placed", "order.status.changed"
 */

import amqplib, { type Channel, type ConsumeMessage } from 'amqplib';

import { type DomainEvent } from '@dashdine/types';
import { EXCHANGES, type EventName } from '@dashdine/constants';

// ═══ Types ═══

// amqplib.connect() returns a ChannelModel at runtime which has
// createChannel, on, and close methods. The @types/amqplib types
// don't perfectly match, so we define exactly what we use.
interface AmqpConnection {
  createChannel(): Promise<Channel>;
  on(event: string, listener: (...args: unknown[]) => void): this;
  close(): Promise<void>;
}

export interface QueueConfig {
  /** RabbitMQ connection URL */
  url: string;
  /** Service name (used for queue naming) */
  service: string;
  /** Logger interface (so we don't depend on @dashdine/logger directly) */
  logger: {
    info: (obj: Record<string, unknown>, msg: string) => void;
    error: (obj: Record<string, unknown>, msg: string) => void;
    warn: (obj: Record<string, unknown>, msg: string) => void;
  };
}

export interface EventHandler<T = unknown> {
  (event: DomainEvent<T>): Promise<void>;
}

// ═══ Event Bus Class ═══

/**
 * EventBus manages a single RabbitMQ connection and provides
 * publish() and subscribe() methods.
 *
 * Usage:
 *   const bus = new EventBus({ url: 'amqp://...', service: 'auth-service', logger });
 *   await bus.connect();
 *
 *   // Publish an event
 *   await bus.publish('dashdine.users', 'user.registered', {
 *     eventId: generateId(),
 *     eventType: 'user.registered',
 *     aggregateId: userId,
 *     data: { userId, email, firstName },
 *     correlationId: requestId,
 *     timestamp: new Date().toISOString(),
 *     source: 'auth-service',
 *   });
 *
 *   // Subscribe to events
 *   await bus.subscribe('dashdine.users', 'user.registered', async (event) => {
 *     await createProfile(event.data);
 *   });
 */
export class EventBus {
  private connection: AmqpConnection | null = null;
  private publishChannel: Channel | null = null;
  private consumeChannel: Channel | null = null;
  private readonly config: QueueConfig;
  private reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
  private isShuttingDown = false;

  constructor(config: QueueConfig) {
    this.config = config;
  }

  /**
   * Connect to RabbitMQ and create channels.
   *
   * We use TWO separate channels:
   * - publishChannel: for sending messages (publish)
   * - consumeChannel: for receiving messages (subscribe)
   *
   * Why separate? If the consume channel encounters an error (e.g.,
   * rejecting a malformed message), it doesn't affect publishing.
   */
  async connect(): Promise<void> {
    try {
      this.connection = (await amqplib.connect(this.config.url)) as unknown as AmqpConnection;
      this.publishChannel = await this.connection.createChannel();
      this.consumeChannel = await this.connection.createChannel();

      // Prefetch 1: only deliver one message at a time to each consumer.
      // The consumer must ACK before getting the next message.
      // This prevents a slow consumer from getting overwhelmed.
      await this.consumeChannel.prefetch(1);

      // Handle connection errors — auto-reconnect
      this.connection.on('error', (err) => {
        this.config.logger.error({ err }, 'RabbitMQ connection error');
        this.scheduleReconnect();
      });

      this.connection.on('close', () => {
        if (!this.isShuttingDown) {
          this.config.logger.warn({}, 'RabbitMQ connection closed unexpectedly');
          this.scheduleReconnect();
        }
      });

      this.config.logger.info({ url: this.config.url }, 'Connected to RabbitMQ');
    } catch (error) {
      this.config.logger.error(
        { err: error instanceof Error ? error : new Error(String(error)) },
        'Failed to connect to RabbitMQ',
      );
      this.scheduleReconnect();
    }
  }

  /**
   * Publish a domain event to an exchange.
   *
   * The exchange routes the message to all queues that have a
   * matching binding pattern. Multiple services can listen for
   * the same event — this is the "fan-out" pattern.
   */
  async publish<T>(
    exchange: string,
    routingKey: EventName | string,
    event: DomainEvent<T>,
  ): Promise<void> {
    if (!this.publishChannel) {
      this.config.logger.error({}, 'Cannot publish: not connected to RabbitMQ');
      return;
    }

    // Ensure the exchange exists (idempotent operation)
    await this.publishChannel.assertExchange(exchange, 'topic', {
      durable: true, // Exchange survives RabbitMQ restarts
    });

    const message = Buffer.from(JSON.stringify(event));

    this.publishChannel.publish(exchange, routingKey, message, {
      persistent: true, // Message survives RabbitMQ restarts
      contentType: 'application/json',
      messageId: event.eventId,
      timestamp: Date.now(),
      headers: {
        source: event.source,
        correlationId: event.correlationId,
      },
    });

    this.config.logger.info(
      {
        exchange,
        routingKey,
        eventId: event.eventId,
        aggregateId: event.aggregateId,
      },
      'Event published',
    );
  }

  /**
   * Subscribe to events matching a routing key pattern.
   *
   * Creates a durable queue named: "{service}.{routingKey}"
   * Example: "user-service.user.registered"
   *
   * The queue is DURABLE (survives restarts) and messages require
   * explicit ACK (acknowledged after successful processing).
   */
  async subscribe<T = unknown>(
    exchange: string,
    routingKey: EventName | string,
    handler: EventHandler<T>,
  ): Promise<void> {
    if (!this.consumeChannel) {
      this.config.logger.error({}, 'Cannot subscribe: not connected to RabbitMQ');
      return;
    }

    // Ensure the exchange exists
    await this.consumeChannel.assertExchange(exchange, 'topic', {
      durable: true,
    });

    // Create a queue for this service + event combination
    const queueName = `${this.config.service}.${routingKey}`;

    await this.consumeChannel.assertQueue(queueName, {
      durable: true, // Queue survives RabbitMQ restarts
      deadLetterExchange: `${exchange}.dlx`, // Failed messages go here
    });

    // Bind the queue to the exchange with the routing key pattern
    await this.consumeChannel.bindQueue(queueName, exchange, routingKey);

    // Also create the dead letter exchange + queue for failed messages
    await this.consumeChannel.assertExchange(`${exchange}.dlx`, 'topic', { durable: true });
    const dlqName = `${queueName}.dlq`;
    await this.consumeChannel.assertQueue(dlqName, { durable: true });
    await this.consumeChannel.bindQueue(dlqName, `${exchange}.dlx`, routingKey);

    // Start consuming messages
    await this.consumeChannel.consume(queueName, async (msg: ConsumeMessage | null) => {
      if (!msg) return;

      try {
        const event = JSON.parse(msg.content.toString()) as DomainEvent<T>;

        this.config.logger.info(
          {
            queue: queueName,
            eventId: event.eventId,
            eventType: event.eventType,
            aggregateId: event.aggregateId,
          },
          'Processing event',
        );

        // Call the handler
        await handler(event);

        // ACK: message processed successfully, remove from queue
        this.consumeChannel?.ack(msg);

        this.config.logger.info(
          { queue: queueName, eventId: event.eventId },
          'Event processed successfully',
        );
      } catch (error) {
        this.config.logger.error(
          {
            queue: queueName,
            err: error instanceof Error ? error : new Error(String(error)),
            messageId: msg.properties.messageId,
          },
          'Failed to process event',
        );

        // NACK: processing failed, send to dead letter queue
        // requeue: false means don't put it back in the main queue
        // (it goes to the dead letter queue instead)
        this.consumeChannel?.nack(msg, false, false);
      }
    });

    this.config.logger.info({ queue: queueName, exchange, routingKey }, 'Subscribed to events');
  }

  /**
   * Schedule a reconnection attempt with exponential backoff.
   */
  private scheduleReconnect(): void {
    if (this.isShuttingDown || this.reconnectTimeout) return;

    this.reconnectTimeout = setTimeout(async () => {
      this.reconnectTimeout = null;
      this.config.logger.info({}, 'Attempting to reconnect to RabbitMQ...');
      await this.connect();
    }, 5000); // Retry after 5 seconds
  }

  /**
   * Gracefully close the connection.
   * Called during service shutdown.
   */
  async close(): Promise<void> {
    this.isShuttingDown = true;

    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
    }

    try {
      if (this.publishChannel) await this.publishChannel.close();
      if (this.consumeChannel) await this.consumeChannel.close();
      if (this.connection) await this.connection.close();
      this.config.logger.info({}, 'RabbitMQ connection closed');
    } catch (error) {
      this.config.logger.error(
        { err: error instanceof Error ? error : new Error(String(error)) },
        'Error closing RabbitMQ connection',
      );
    }
  }
}

// Re-export types and constants for convenience
export { EXCHANGES };
export type { DomainEvent };
