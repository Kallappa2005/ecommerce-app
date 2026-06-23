/**
 * notificationConsumer.js — RabbitMQ consumer for app-level notifications.
 *
 * Consumes events from the 'app.notifications' queue.
 * Currently: logs structured notification data (ready for WebSocket/push extension).
 *
 * Subscribed events:
 *   - order.status_updated  → Notify user their order status changed
 *   - payment.done          → Notify user payment was confirmed
 */

import amqp from "amqplib";
import { EXCHANGE_NAME, QUEUES, QUEUE_BINDINGS } from "../../shared/events/eventKeys.js";
import { createLogger } from "../../shared/utils/logger.js";

const logger = createLogger("notification-consumer");

const QUEUE_NAME = QUEUES.APP_NOTIFICATIONS;
const BASE_DELAY_MS = 2000;
let reconnectAttempts = 0;

/**
 * getReconnectDelay — Exponential backoff, capped at 60 seconds.
 */
const getReconnectDelay = (attempt) =>
  Math.min(BASE_DELAY_MS * Math.pow(2, attempt), 60000);

/**
 * buildNotification — Transforms a raw event payload into a structured notification object.
 * @param {string} routingKey - RabbitMQ routing key
 * @param {object} payload - Event payload
 * @returns {object|null} Notification object or null if event is not handled
 */
const buildNotification = (routingKey, payload) => {
  const base = {
    routingKey,
    userId: payload.userId || null,
    email: payload.email || null,
    timestamp: new Date().toISOString(),
  };

  switch (routingKey) {
    case "order.status_updated":
      return {
        ...base,
        type: "ORDER_STATUS",
        title: `Order #${payload.orderId} — ${payload.status}`,
        message: getStatusMessage(payload.status),
        orderId: payload.orderId,
        status: payload.status,
      };

    case "payment.done":
      return {
        ...base,
        type: "PAYMENT_CONFIRMED",
        title: "Payment Confirmed",
        message: `Your payment of ₹${payload.amount} was successful.`,
        orderId: payload.orderId,
        amount: payload.amount,
      };

    default:
      return null;
  }
};

/**
 * getStatusMessage — Returns a human-readable notification message for each order status.
 */
const getStatusMessage = (status) => {
  const messages = {
    "Shipped":           "Your order has been shipped and is on its way!",
    "Out for delivery":  "Your order is out for delivery — expect it today!",
    "Delivered":         "Your order has been delivered. Enjoy your purchase!",
    "Cancelled":         "Your order has been cancelled.",
  };
  return messages[status] || `Your order status has been updated to: ${status}`;
};

/**
 * processNotification — Processes a single notification event message.
 * Builds a structured notification and logs it. Can be extended to write to DB or push.
 */
const processNotification = async (channel, message) => {
  if (!message) return;

  const routingKey = message.fields.routingKey;

  try {
    const payload = JSON.parse(message.content.toString());
    const notification = buildNotification(routingKey, payload);

    if (!notification) {
      logger.warn("No notification handler for routing key", { routingKey });
      channel.ack(message);
      return;
    }

    // ── Persist / dispatch notification ──────────────────────────────────────
    // Currently: structured log (ready to extend with WebSocket, FCM, etc.)
    logger.info("Notification dispatched", {
      type: notification.type,
      title: notification.title,
      userId: notification.userId,
      email: notification.email,
    });

    // TODO: Extend here for WebSocket push:
    // io.to(notification.userId).emit('notification', notification);

    // TODO: Extend here for mobile push (Firebase):
    // await fcm.send({ token: userFCMToken, notification: { title, body } });

    channel.ack(message);

  } catch (error) {
    logger.error("Failed to process notification", {
      routingKey,
      error: error.message,
    });
    // nack without requeue — prevent infinite retry loops
    channel.nack(message, false, false);
  }
};

/**
 * startNotificationConsumer — Connects to RabbitMQ and begins consuming notification events.
 * Automatically reconnects with exponential backoff on connection loss.
 */
const startNotificationConsumer = async () => {
  const url = process.env.RABBITMQ_URL || "amqp://localhost";

  try {
    const connection = await amqp.connect(url);
    const channel = await connection.createChannel();

    reconnectAttempts = 0;

    // Assert main exchange
    await channel.assertExchange(EXCHANGE_NAME, "topic", { durable: true });

    // Assert notification queue (durable)
    await channel.assertQueue(QUEUE_NAME, { durable: true });

    // Bind to all event routing keys that this service handles
    const bindingKeys = QUEUE_BINDINGS[QUEUE_NAME];
    for (const key of bindingKeys) {
      await channel.bindQueue(QUEUE_NAME, EXCHANGE_NAME, key);
      logger.info("Queue binding registered", { queue: QUEUE_NAME, key });
    }

    // Process one message at a time
    channel.prefetch(1);

    logger.info("Notification consumer started — waiting for events", { queue: QUEUE_NAME });

    channel.consume(
      QUEUE_NAME,
      (msg) => processNotification(channel, msg),
      { noAck: false }
    );

    connection.on("error", (err) => {
      logger.error("RabbitMQ connection error", { error: err.message });
      scheduleReconnect();
    });

    connection.on("close", () => {
      logger.warn("RabbitMQ connection closed. Reconnecting...");
      scheduleReconnect();
    });

  } catch (error) {
    logger.error("Failed to connect to RabbitMQ", { error: error.message });
    scheduleReconnect();
  }
};

/**
 * scheduleReconnect — Schedules reconnection with exponential backoff delay.
 */
const scheduleReconnect = () => {
  const delay = getReconnectDelay(reconnectAttempts);
  reconnectAttempts++;
  logger.info(`Reconnecting in ${delay}ms (attempt ${reconnectAttempts})`);
  setTimeout(startNotificationConsumer, delay);
};

export default startNotificationConsumer;
