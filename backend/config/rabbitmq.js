import amqp from "amqplib";
import logger from "../utils/logger.js";

const EXCHANGE_NAME = "ecommerce.events";

let connection = null;
let channel = null;

const connectRabbitMQ = async () => {
  const url = process.env.RABBITMQ_URL || "amqp://localhost";

  try {
    connection = await amqp.connect(url);
    channel = await connection.createChannel();
    await channel.assertExchange(EXCHANGE_NAME, "topic", { durable: true });
    logger.info("RabbitMQ connected", { exchange: EXCHANGE_NAME });
  } catch (error) {
    logger.error("RabbitMQ connection failed", { error: error.message });
    throw error;
  }
};

const publishEvent = async (routingKey, payload) => {
  if (!channel) {
    logger.warn("RabbitMQ channel unavailable, event not published", {
      routingKey,
    });
    return false;
  }

  const message = Buffer.from(JSON.stringify(payload));
  const published = channel.publish(EXCHANGE_NAME, routingKey, message, {
    persistent: true,
    contentType: "application/json",
  });

  if (published) {
    logger.info("Event published", { routingKey });
  } else {
    logger.warn("Event publish buffer full", { routingKey });
  }

  return published;
};

const closeRabbitMQ = async () => {
  try {
    if (channel) await channel.close();
    if (connection) await connection.close();
    logger.info("RabbitMQ connection closed");
  } catch (error) {
    logger.error("Error closing RabbitMQ connection", { error: error.message });
  }
};

export { connectRabbitMQ, publishEvent, closeRabbitMQ, EXCHANGE_NAME };
