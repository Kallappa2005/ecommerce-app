/**
 * server.js — Entry point for the product-service microservice.
 * Connects to MongoDB (ecommerce-products) and starts the Express server on port 4002.
 */

import express from 'express';
import cors from 'cors';
import 'dotenv/config';
import connectDB from '../../shared/config/mongodb.js';
import { createLogger } from '../../shared/utils/logger.js';
import { errorHandler, notFoundHandler } from '../../shared/utils/errorHandler.js';
import productRoutes from './routes/productRoutes.js';

const logger = createLogger('product-service');
const app = express();
const PORT = process.env.PORT || 4002;

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json());

// ── Routes ────────────────────────────────────────────────────────────────────
app.use('/api/product', productRoutes);

/**
 * GET /health — Liveness probe endpoint used by Docker and load balancers.
 */
app.get('/health', (req, res) => {
  res.json({
    success: true,
    service: 'product-service',
    status: 'ok',
    timestamp: new Date().toISOString(),
  });
});

// ── Error handling ────────────────────────────────────────────────────────────
app.use(notFoundHandler);
app.use(errorHandler);

/**
 * startServer — Connects to MongoDB then starts the HTTP server.
 */
const startServer = async () => {
  await connectDB('ecommerce-products');
  app.listen(PORT, () => logger.info(`product-service running on port ${PORT}`));
};

startServer().catch((err) => {
  logger.error('Failed to start product-service', { error: err.message });
  process.exit(1);
});

/**
 * shutdown — Gracefully shuts down the server on SIGINT/SIGTERM.
 */
const shutdown = async () => {
  logger.info('Shutting down product-service...');
  process.exit(0);
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
