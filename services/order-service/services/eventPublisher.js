/**
 * eventPublisher.js — Order-service event publisher helpers.
 * Wraps publishEvent with order-specific routing keys and safe error handling
 * so event failures never crash the core order flow.
 */

import { publishEvent } from '../../../shared/config/rabbitmq.js';
import { EVENTS } from '../../../shared/events/eventKeys.js';
import { createLogger } from '../../../shared/utils/logger.js';

const logger = createLogger('order-service');

/**
 * safePublish — Publishes an event and swallows errors so the caller is never blocked.
 * Logs a warning if publishing fails (e.g. RabbitMQ channel temporarily unavailable).
 *
 * @param {string} routingKey - EVENTS constant routing key
 * @param {object} data - Event payload to serialise and publish
 */
const safePublish = async (routingKey, data) => {
  try {
    await publishEvent(routingKey, data);
  } catch (err) {
    logger.warn('Event publish failed — continuing without event', {
      routingKey,
      error: err.message,
    });
  }
};

/**
 * publishOrderPlaced — Publishes an ORDER_PLACED event after a successful COD order.
 * Consumed by email-service to send order confirmation email.
 *
 * @param {{ email: string, name: string, orderId: string, amount: number, paymentMethod: string, items: Array }} data
 */
export const publishOrderPlaced = async (data) => {
  await safePublish(EVENTS.ORDER_PLACED, data);
};

/**
 * publishOrderStatusUpdated — Publishes an ORDER_STATUS_UPDATED event when admin changes order status.
 * Consumed by email-service to notify the customer of their order progress.
 *
 * @param {{ email: string, name: string, orderId: string, status: string, items: Array }} data
 */
export const publishOrderStatusUpdated = async (data) => {
  await safePublish(EVENTS.ORDER_STATUS_UPDATED, data);
};
