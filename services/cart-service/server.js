import express from 'express';
import cors from 'cors';
import 'dotenv/config';
import connectDB from '../../shared/config/mongodb.js';
import { connectRabbitMQ, closeRabbitMQ } from '../../shared/config/rabbitmq.js';
import { createLogger } from '../../shared/utils/logger.js';
import { errorHandler, notFoundHandler } from '../../shared/utils/errorHandler.js';
import cartRoutes from './routes/cartRoutes.js';

const logger = createLogger('cart-service');
const app = express();
const PORT = process.env.PORT || 4003;

app.use(cors());
app.use(express.json());

/** Mount cart routes */
app.use('/api/cart', cartRoutes);

/** Health check endpoint */
app.get('/health', (req, res) => {
  res.json({
    success: true,
    service: 'cart-service',
    status: 'ok',
    timestamp: new Date().toISOString(),
  });
});

app.use(notFoundHandler);
app.use(errorHandler);

/**
 * Starts the server by connecting to MongoDB and RabbitMQ,
 * then begins listening on the configured port.
 */
const startServer = async () => {
  await connectDB('ecommerce-users');
  await connectRabbitMQ('cart-service');
  app.listen(PORT, () => logger.info(`cart-service running on port ${PORT}`));
};

startServer().catch((err) => {
  logger.error('Failed to start cart-service', { error: err.message });
  process.exit(1);
});

/**
 * Gracefully shuts down the server on SIGINT or SIGTERM signals,
 * closing RabbitMQ connections before exit.
 */
const shutdown = async () => {
  logger.info('Shutting down cart-service...');
  await closeRabbitMQ();
  process.exit(0);
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
