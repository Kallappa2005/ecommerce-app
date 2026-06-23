import { publishEvent } from "../config/rabbitmq.js";
import logger from "../utils/logger.js";

export const EVENTS = {
  USER_REGISTERED: "user.registered",
  ORDER_PLACED: "order.placed",
  PAYMENT_DONE: "payment.done",
  ORDER_STATUS_UPDATED: "order.status_updated",
};

const safePublish = async (routingKey, payload) => {
  try {
    await publishEvent(routingKey, payload);
  } catch (error) {
    logger.error("Failed to publish event", {
      routingKey,
      error: error.message,
    });
  }
};

export const publishUserRegistered = (data) =>
  safePublish(EVENTS.USER_REGISTERED, data);

export const publishOrderPlaced = (data) =>
  safePublish(EVENTS.ORDER_PLACED, data);

export const publishPaymentDone = (data) =>
  safePublish(EVENTS.PAYMENT_DONE, data);

export const publishOrderStatusUpdated = (data) =>
  safePublish(EVENTS.ORDER_STATUS_UPDATED, data);
