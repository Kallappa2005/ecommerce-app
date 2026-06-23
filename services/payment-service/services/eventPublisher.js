import { publishEvent } from '../../../shared/config/rabbitmq.js';
import { EVENTS } from '../../../shared/events/eventKeys.js';
import { createLogger } from '../../../shared/utils/logger.js';

const logger = createLogger('payment-service');

/**
 * Publishes a PAYMENT_DONE event to the message broker so downstream services
 * (e.g. notification-service) can react to a successful payment.
 *
 * @param {Object} data - Event payload containing email, name, orderId, amount, paymentMethod
 */
const publishPaymentDone = async (data) => {
  try {
    await publishEvent(EVENTS.PAYMENT_DONE, data);
    logger.info('Published PAYMENT_DONE event', { orderId: data.orderId });
  } catch (error) {
    logger.error('Failed to publish PAYMENT_DONE event', { error: error.message });
  }
};

/**
 * Publishes a PAYMENT_FAILED event to the message broker so downstream services
 * can handle failed or cancelled payment scenarios.
 *
 * @param {Object} data - Event payload containing orderId and any relevant metadata
 */
const publishPaymentFailed = async (data) => {
  try {
    await publishEvent(EVENTS.PAYMENT_FAILED, data);
    logger.info('Published PAYMENT_FAILED event', { orderId: data.orderId });
  } catch (error) {
    logger.error('Failed to publish PAYMENT_FAILED event', { error: error.message });
  }
};

export { publishPaymentDone, publishPaymentFailed };
