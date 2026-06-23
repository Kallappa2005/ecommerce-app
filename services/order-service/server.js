/**
 * server.js — Entry point for the order-service microservice.
 * Bootstraps Express, connects to MongoDB (ecommerce-orders) and RabbitMQ,
 * then starts listening on PORT 4004.
 */

import express from 'express';
import cors from 'cors';
import 'dotenv/config';
import connectDB from '../../shared/config/mongodb.js';
import { connectRabbitMQ, closeRabbitMQ } from '../../shared/config/rabbitmq.js';
import { createLogger } from '../../shared/utils/logger.js';
import { errorHandler, notFoundHandler } from '../../shared/utils/errorHandler.js';
import orderRoutes from './routes/orderRoutes.js';

const logger = createLogger('order-service');
const app = express();
const PORT = process.env.PORT || 4004;

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json());

// ── Routes ────────────────────────────────────────────────────────────────────
app.use('/api/order', orderRoutes);

// ── Health Check ─────────────────────────────────────────────────────────────
/**
 * GET /health — Liveness probe for Docker/Kubernetes and load balancers.
 * Returns service name, status, and current timestamp.
 */
app.get('/health', (req, res) => {
  res.json({
    success: true,
    service: 'order-service',
    status: 'ok',
    timestamp: new Date().toISOString(),
  });
});

// ── Error Handling ────────────────────────────────────────────────────────────
app.use(notFoundHandler);
app.use(errorHandler);

// ── Server Startup ────────────────────────────────────────────────────────────
/**
 * startServer — Initialises DB and message broker connections, then starts HTTP server.
 * Exits with code 1 if any connection fails during startup.
 */
const startServer = async () => {
  await connectDB('ecommerce-orders');
  await connectRabbitMQ('order-service');
  app.listen(PORT, () => logger.info(`order-service running on port ${PORT}`));
};

startServer().catch((err) => {
  logger.error('Failed to start order-service', { error: err.message });
  process.exit(1);
});

// ── Graceful Shutdown ─────────────────────────────────────────────────────────
/**
 * shutdown — Closes RabbitMQ connection cleanly before process exit.
 * Triggered by SIGINT (Ctrl+C) or SIGTERM (Docker/K8s stop).
 */
const shutdown = async () => {
  logger.info('Shutting down order-service...');
  await closeRabbitMQ();
  process.exit(0);
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
