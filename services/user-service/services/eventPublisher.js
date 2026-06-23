import { publishEvent } from '../../../shared/config/rabbitmq.js';
import { EVENTS } from '../../../shared/events/eventKeys.js';
import { createLogger } from '../../../shared/utils/logger.js';

const logger = createLogger('user-service');

/**
 * Wraps publishEvent in a try/catch so that RabbitMQ failures
 * emit a warning instead of propagating an exception to the caller.
 */
const safePublish = async (event, data) => {
  try {
    await publishEvent(event, data);
  } catch (err) {
    logger.warn(`Failed to publish event "${event}"`, { error: err.message });
  }
};

/**
 * Publishes a USER_REGISTERED event with the new user's name and email.
 * Used by downstream services (e.g. email, analytics) to react to sign-ups.
 */
const publishUserRegistered = async (data) => {
  await safePublish(EVENTS.USER_REGISTERED, data);
};

/**
 * Publishes a USER_PASSWORD_RESET event carrying reset-related payload.
 * Consumed by the notification service to send reset emails.
 */
const publishPasswordReset = async (data) => {
  await safePublish(EVENTS.USER_PASSWORD_RESET, data);
};

export { publishUserRegistered, publishPasswordReset };
