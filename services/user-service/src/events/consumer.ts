/**
 * Event Consumer — Listens for events from other services via RabbitMQ.
 *
 * This is the "reactive" side of our microservices architecture.
 * Instead of the Auth Service calling the User Service directly,
 * Auth publishes an event and User Service reacts to it.
 *
 * WHAT HAPPENS:
 * 1. Auth Service publishes "user.registered" to RabbitMQ
 * 2. RabbitMQ routes it to our queue: "user-service.user.registered"
 * 3. This consumer picks it up and calls createProfile()
 * 4. If it succeeds → ACK (message deleted from queue)
 * 5. If it fails → NACK (message goes to dead letter queue for inspection)
 *
 * IDEMPOTENCY:
 * createProfile() checks if the profile already exists before creating.
 * So if the same event is processed twice (e.g., after a retry), it's safe.
 * This is critical in distributed systems where "at-least-once" delivery
 * means you might get duplicate messages.
 */

import { type EventBus, EXCHANGES } from '@dashdine/queue';
import { EVENTS } from '@dashdine/constants';

import { createProfile } from '../services/user.service.js';

/** Shape of the data in a user.registered event */
interface UserRegisteredData {
  userId: string;
  email?: string;
  phone?: string;
  firstName: string;
  lastName?: string;
  role: string;
}

/**
 * Register all event subscriptions for the User Service.
 * Called once during server startup.
 */
export async function registerEventConsumers(
  eventBus: EventBus,
  logger: { info: (obj: Record<string, unknown>, msg: string) => void },
): Promise<void> {
  // Subscribe to user.registered events
  await eventBus.subscribe<UserRegisteredData>(
    EXCHANGES.USERS,
    EVENTS.USER_REGISTERED,
    async (event) => {
      const { userId, firstName, lastName } = event.data;

      logger.info(
        { userId, eventId: event.eventId },
        'Received user.registered event — creating profile',
      );

      // Create the user profile (idempotent — safe to call multiple times)
      await createProfile({
        id: userId,
        firstName,
        lastName,
      });

      logger.info({ userId, eventId: event.eventId }, 'Profile created successfully from event');
    },
  );
}
