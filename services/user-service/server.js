import express from 'express';
import cors from 'cors';
import 'dotenv/config';
import connectDB from '../../shared/config/mongodb.js';
import { connectRabbitMQ, closeRabbitMQ } from '../../shared/config/rabbitmq.js';
import { createLogger } from '../../shared/utils/logger.js';
import { errorHandler, notFoundHandler } from '../../shared/utils/errorHandler.js';
import userRoutes from './routes/userRoutes.js';

const logger = createLogger('user-service');
const app = express();
const PORT = process.env.PORT || 4001;

app.use(cors());
app.use(express.json());

app.use('/api/user', userRoutes);

/** Health check endpoint for container orchestration and load balancers. */
app.get('/health', (req, res) => {
  res.json({
    success: true,
    service: 'user-service',
    status: 'ok',
    timestamp: new Date().toISOString(),
  });
});

app.use(notFoundHandler);
app.use(errorHandler);

/** Initialises DB and RabbitMQ connections then starts the HTTP server. */
const startServer = async () => {
  await connectDB('ecommerce-users');
  await connectRabbitMQ('user-service');
  app.listen(PORT, () => logger.info(`user-service running on port ${PORT}`));
};

startServer().catch((err) => {
  logger.error('Failed to start user-service', { error: err.message });
  process.exit(1);
});

/** Graceful shutdown handler — closes RabbitMQ before exiting. */
const shutdown = async () => {
  logger.info('Shutting down user-service...');
  await closeRabbitMQ();
  process.exit(0);
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
