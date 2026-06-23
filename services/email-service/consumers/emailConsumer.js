/**
 * emailConsumer.js — Enhanced RabbitMQ consumer for the email-service.
 *
 * Improvements over the original:
 *  - Exponential backoff reconnection (won't crash on RabbitMQ restart)
 *  - Per-message retry logic (up to 3 attempts before dead-lettering)
 *  - Dead-letter queue for permanently failed messages
 *  - Binding to all relevant routing keys via eventKeys constants
 */

import amqp from "amqplib";
import { sendEmail } from "../config/ses.js";
import { buildEmailFromEvent } from "../templates/emailTemplates.js";
import { createLogger } from "../utils/logger.js";
import { EXCHANGE_NAME, QUEUES, QUEUE_BINDINGS } from "../../shared/events/eventKeys.js";

const logger = createLogger("email-consumer");

const QUEUE_NAME = QUEUES.EMAIL_NOTIFICATIONS;
const DLX_NAME   = "ecommerce.events.dlx";    // Dead-letter exchange name
const DLQ_NAME   = "email.notifications.dlq";  // Dead-letter queue name
const MAX_RETRIES = 3;                         // Max send attempts before DLQ

// ── Reconnection config ───────────────────────────────────────────────────────
const BASE_DELAY_MS = 2000;
let reconnectAttempts = 0;

/**
 * getReconnectDelay — Exponential backoff capped at 60 seconds.
 */
const getReconnectDelay = (attempt) =>
  Math.min(BASE_DELAY_MS * Math.pow(2, attempt), 60000);

/**
 * processMessage — Processes a single RabbitMQ message.
 * Attempts to send the email, retrying up to MAX_RETRIES times.
 * On permanent failure, nacks without requeue (message goes to DLQ).
 *
 * @param {amqp.Channel} channel
 * @param {amqp.ConsumeMessage} message
 */
const processMessage = async (channel, message) => {
  if (!message) return;

  const routingKey = message.fields.routingKey;
  // Track retry count via custom header
  const retryCount = (message.properties.headers?.["x-retry-count"] || 0);

  let lastError;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const payload = JSON.parse(message.content.toString());
      const emailContent = buildEmailFromEvent(routingKey, payload);

      if (!emailContent) {
        logger.warn("No email template for routing key — skipping", { routingKey });
        channel.ack(message); // Acknowledge to prevent redelivery of intentionally unhandled events
        return;
      }

      await sendEmail(emailContent);

      logger.info("Email sent successfully", {
        routingKey,
        to: emailContent.to,
        subject: emailContent.subject,
        attempt,
      });

      channel.ack(message); // Acknowledge on success
      return;

    } catch (error) {
      lastError = error;
      logger.warn(`Email send attempt ${attempt}/${MAX_RETRIES} failed`, {
        routingKey,
        error: error.message,
      });

      // Wait before retrying (except on last attempt)
      if (attempt < MAX_RETRIES) {
        await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
      }
    }
  }

  // All retries exhausted — send to dead-letter queue
  logger.error("Email permanently failed after max retries — dead-lettering", {
    routingKey,
    error: lastError?.message,
    retryCount: retryCount + MAX_RETRIES,
  });

  // nack with requeue=false → message goes to DLX/DLQ
  channel.nack(message, false, false);
};

/**
 * setupQueues — Asserts exchange, DLX, DLQ, main queue, and bindings.
 * Configures the main queue with a dead-letter exchange for failed messages.
 *
 * @param {amqp.Channel} channel
 */
const setupQueues = async (channel) => {
  // Assert main exchange (topic, durable)
  await channel.assertExchange(EXCHANGE_NAME, "topic", { durable: true });

  // Assert dead-letter exchange and queue
  await channel.assertExchange(DLX_NAME, "direct", { durable: true });
  await channel.assertQueue(DLQ_NAME, { durable: true });
  await channel.bindQueue(DLQ_NAME, DLX_NAME, QUEUE_NAME);

  // Assert main queue with DLX configuration
  await channel.assertQueue(QUEUE_NAME, {
    durable: true,
    arguments: {
      "x-dead-letter-exchange": DLX_NAME,
      "x-dead-letter-routing-key": QUEUE_NAME,
    },
  });

  // Bind queue to all relevant routing keys from eventKeys constants
  const bindingKeys = QUEUE_BINDINGS[QUEUE_NAME];
  for (const key of bindingKeys) {
    await channel.bindQueue(QUEUE_NAME, EXCHANGE_NAME, key);
    logger.info("Queue binding registered", { queue: QUEUE_NAME, key });
  }

  // Process one message at a time (fair dispatch)
  channel.prefetch(1);
};

/**
 * startConsumer — Connects to RabbitMQ and begins consuming email events.
 * Reconnects automatically if the connection is lost.
 */
const startConsumer = async () => {
  const url = process.env.RABBITMQ_URL || "amqp://localhost";

  try {
    const connection = await amqp.connect(url);
    const channel = await connection.createChannel();

    reconnectAttempts = 0; // Reset on successful connect

    await setupQueues(channel);

    logger.info("Email consumer started — waiting for events", { queue: QUEUE_NAME });

    channel.consume(QUEUE_NAME, (msg) => processMessage(channel, msg), { noAck: false });

    // Handle connection errors with reconnection
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
 * scheduleReconnect — Schedules a reconnection attempt with exponential backoff.
 */
const scheduleReconnect = () => {
  const delay = getReconnectDelay(reconnectAttempts);
  reconnectAttempts++;
  logger.info(`Reconnecting in ${delay}ms (attempt ${reconnectAttempts})`);
  setTimeout(startConsumer, delay);
};

export default startConsumer;
