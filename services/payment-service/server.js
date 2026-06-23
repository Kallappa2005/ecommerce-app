import express from 'express';
import cors from 'cors';
import 'dotenv/config';
import connectDB from '../../shared/config/mongodb.js';
import { connectRabbitMQ, closeRabbitMQ } from '../../shared/config/rabbitmq.js';
import { createLogger } from '../../shared/utils/logger.js';
import { errorHandler, notFoundHandler } from '../../shared/utils/errorHandler.js';
import paymentRoutes from './routes/paymentRoutes.js';

const logger = createLogger('payment-service');
const app = express();
const PORT = process.env.PORT || 4005;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/payment', paymentRoutes);

/**
 * Health check endpoint used by Docker and load-balancers to verify the service
 * is running and accepting requests.
 */
app.get('/health', (req, res) => {
  res.json({
    success: true,
    service: 'payment-service',
    status: 'ok',
    timestamp: new Date().toISOString(),
  });
});

// Error handling — must be registered after all routes
app.use(notFoundHandler);
app.use(errorHandler);

/**
 * Bootstraps the service by connecting to MongoDB (ecommerce-orders) and RabbitMQ
 * before starting the HTTP server.
 */
const startServer = async () => {
  await connectDB('ecommerce-orders');
  await connectRabbitMQ('payment-service');
  app.listen(PORT, () => logger.info(`payment-service running on port ${PORT}`));
};

startServer().catch((err) => {
  logger.error('Failed to start payment-service', { error: err.message });
  process.exit(1);
});

/**
 * Gracefully shuts down the service by closing the RabbitMQ connection before
 * the process exits, ensuring in-flight messages are not lost.
 */
const shutdown = async () => {
  logger.info('Shutting down payment-service...');
  await closeRabbitMQ();
  process.exit(0);
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
