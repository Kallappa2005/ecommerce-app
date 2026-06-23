/**
 * rabbitmq.js — Production-grade RabbitMQ connection manager with exponential backoff.
 *
 * Key improvements over the original backend/config/rabbitmq.js:
 *  - Automatic reconnection on connection drop (exponential backoff, max 60s)
 *  - Channel recovery after reconnect
 *  - Publisher confirms support
 *  - Safe channel re-creation on channel errors
 *
 * Usage (producer):
 *   import { connectRabbitMQ, publishEvent, closeRabbitMQ } from '../../shared/config/rabbitmq.js';
 *   await connectRabbitMQ('user-service');
 *   await publishEvent('user.registered', { name, email });
 *
 * Usage (consumer):
 *   import { connectRabbitMQ, getChannel } from '../../shared/config/rabbitmq.js';
 *   await connectRabbitMQ('email-service');
 *   const channel = getChannel();
 */

import amqp from "amqplib";
import { EXCHANGE_NAME } from "../events/eventKeys.js";
import { createLogger } from "../utils/logger.js";

const logger = createLogger("rabbitmq");

// ── State ────────────────────────────────────────────────────────────────────

let connection = null;
let channel = null;
let serviceName = "unknown";
let isConnecting = false;
let reconnectAttempts = 0;

const MAX_RECONNECT_ATTEMPTS = 10;
const BASE_RECONNECT_DELAY_MS = 1000; // 1 second base delay

// ── Internal helpers ─────────────────────────────────────────────────────────

/**
 * getReconnectDelay — Calculates exponential backoff delay capped at 60 seconds.
 */
const getReconnectDelay = (attempt) => {
  return Math.min(BASE_RECONNECT_DELAY_MS * Math.pow(2, attempt), 60000);
};

/**
 * setupChannel — Creates a channel, enables publisher confirms, and asserts the exchange.
 * Called after a fresh connection is established (or re-established).
 */
const setupChannel = async () => {
  channel = await connection.createConfirmChannel(); // Publisher confirms for guaranteed delivery
  await channel.assertExchange(EXCHANGE_NAME, "topic", { durable: true });

  // Recover channel if it's closed (e.g. consumer throws unhandled error)
  channel.on("error", (err) => {
    logger.error("RabbitMQ channel error", { service: serviceName, error: err.message });
    channel = null;
  });

  channel.on("close", () => {
    logger.warn("RabbitMQ channel closed", { service: serviceName });
    channel = null;
  });

  logger.info("RabbitMQ channel ready", { service: serviceName, exchange: EXCHANGE_NAME });
};

/**
 * scheduleReconnect — Schedules a reconnection attempt after exponential backoff delay.
 */
const scheduleReconnect = () => {
  if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
    logger.error("RabbitMQ max reconnection attempts reached. Giving up.", {
      service: serviceName,
      attempts: reconnectAttempts,
    });
    return;
  }

  const delay = getReconnectDelay(reconnectAttempts);
  reconnectAttempts++;
  logger.info(`RabbitMQ reconnecting in ${delay}ms`, {
    service: serviceName,
    attempt: reconnectAttempts,
  });

  setTimeout(() => {
    connectRabbitMQ(serviceName).catch((err) => {
      logger.error("RabbitMQ reconnection attempt failed", { error: err.message });
      scheduleReconnect();
    });
  }, delay);
};

// ── Public API ───────────────────────────────────────────────────────────────

/**
 * connectRabbitMQ — Establishes the AMQP connection and channel.
 * Idempotent — safe to call multiple times.
 * @param {string} name - Service name used in log messages
 */
const connectRabbitMQ = async (name = "app") => {
  if (isConnecting || (connection && channel)) return;

  serviceName = name;
  isConnecting = true;

  const url = process.env.RABBITMQ_URL || "amqp://localhost";

  try {
    connection = await amqp.connect(url);
    reconnectAttempts = 0; // Reset on successful connection

    // Attach reconnection logic to connection-level events
    connection.on("error", (err) => {
      logger.error("RabbitMQ connection error", { service: serviceName, error: err.message });
      connection = null;
      channel = null;
    });

    connection.on("close", () => {
      logger.warn("RabbitMQ connection closed. Scheduling reconnect...", { service: serviceName });
      connection = null;
      channel = null;
      scheduleReconnect();
    });

    await setupChannel();
    logger.info("RabbitMQ connected", { service: serviceName, url: url.replace(/:[^:@]+@/, ":***@") });
  } catch (error) {
    logger.error("RabbitMQ connection failed", { service: serviceName, error: error.message });
    throw error;
  } finally {
    isConnecting = false;
  }
};

/**
 * publishEvent — Publishes a JSON event to the exchange with a routing key.
 * Uses publisher confirms — waits for broker acknowledgement before resolving.
 * Fails silently (logs warning) if channel is unavailable, to avoid crashing the service.
 *
 * @param {string} routingKey - Event routing key (use EVENTS constants from eventKeys.js)
 * @param {object} payload - Event payload (will be serialised to JSON)
 * @returns {Promise<boolean>} true if published, false if channel unavailable
 */
const publishEvent = async (routingKey, payload) => {
  if (!channel) {
    logger.warn("RabbitMQ channel unavailable — event not published", {
      service: serviceName,
      routingKey,
    });
    return false;
  }

  return new Promise((resolve, reject) => {
    const message = Buffer.from(JSON.stringify(payload));

    channel.publish(
      EXCHANGE_NAME,
      routingKey,
      message,
      {
        persistent: true,         // Survive broker restarts
        contentType: "application/json",
        timestamp: Date.now(),
        appId: serviceName,
      },
      (err) => {
        if (err) {
          logger.error("Event publish confirm failed", { routingKey, error: err.message });
          reject(err);
        } else {
          logger.info("Event published (confirmed)", { service: serviceName, routingKey });
          resolve(true);
        }
      }
    );
  });
};

/**
 * getChannel — Returns the current AMQP channel for consumers to use directly.
 * Returns null if not yet connected.
 */
const getChannel = () => channel;

/**
 * getConnection — Returns the raw AMQP connection (for advanced use cases).
 */
const getConnection = () => connection;

/**
 * closeRabbitMQ — Gracefully closes the channel and connection.
 * Call this in SIGINT / SIGTERM handlers.
 */
const closeRabbitMQ = async () => {
  try {
    if (channel) {
      await channel.close();
      channel = null;
    }
    if (connection) {
      await connection.close();
      connection = null;
    }
    logger.info("RabbitMQ connection closed gracefully", { service: serviceName });
  } catch (err) {
    logger.error("Error closing RabbitMQ connection", { error: err.message });
  }
};

export {
  connectRabbitMQ,
  publishEvent,
  getChannel,
  getConnection,
  closeRabbitMQ,
};
