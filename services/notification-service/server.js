/**
 * server.js — Notification Service entry point.
 *
 * This service is a pure RabbitMQ consumer with a minimal Express server
 * for health checks and observability. It listens for app notification events
 * and processes them (currently logging; extensible for WebSocket/push).
 */

import express from "express";
import "dotenv/config";
import { createLogger } from "../../shared/utils/logger.js";
import startNotificationConsumer from "./consumers/notificationConsumer.js";

const logger = createLogger("notification-service");
const app = express();
const PORT = process.env.PORT || 4007;

// ── Health Check ──────────────────────────────────────────────────────────────
// Allows Docker and load balancers to confirm this service is alive
app.get("/health", (req, res) => {
  res.json({
    success: true,
    service: "notification-service",
    status: "ok",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// ── Start ─────────────────────────────────────────────────────────────────────
const start = async () => {
  try {
    // Start HTTP server for health checks
    app.listen(PORT, () => {
      logger.info(`Notification service running on port ${PORT}`);
    });

    // Start the RabbitMQ consumer
    await startNotificationConsumer();

    logger.info("Notification service fully started");
  } catch (error) {
    logger.error("Failed to start notification service", { error: error.message });
    process.exit(1);
  }
};

start();

// ── Graceful Shutdown ─────────────────────────────────────────────────────────
const shutdown = () => {
  logger.info("Notification service shutting down...");
  process.exit(0);
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
