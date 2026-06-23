/**
 * errorHandler.js — Centralised Express error-handling middleware.
 *
 * Usage: Mount LAST in every service's Express app:
 *   app.use(errorHandler);
 *
 * Also exports `asyncHandler` — a wrapper that catches promise rejections
 * inside route handlers and forwards them to the error middleware, eliminating
 * the need for try/catch blocks in every controller.
 */

import { createLogger } from "./logger.js";

const logger = createLogger("error-handler");

/**
 * asyncHandler — Wraps an async route handler and automatically forwards
 * any rejected promise to Express's `next(err)` error pipeline.
 * @param {Function} fn - Async express route handler
 */
export const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

/**
 * notFoundHandler — Catches requests to undefined routes and passes a 404 error
 * downstream to the main error handler.
 */
export const notFoundHandler = (req, res, next) => {
  const error = new Error(`Route not found: ${req.method} ${req.originalUrl}`);
  error.statusCode = 404;
  next(error);
};

/**
 * errorHandler — Global Express error middleware.
 * Logs the error and returns a standardised JSON error response.
 * In production, stack traces are hidden from the client.
 */
export const errorHandler = (err, req, res, next) => {
  const statusCode = err.statusCode || err.status || 500;
  const message = err.message || "Internal Server Error";

  logger.error("Unhandled error", {
    method: req.method,
    url: req.originalUrl,
    statusCode,
    message,
    stack: err.stack,
  });

  const response = {
    success: false,
    message,
  };

  // Include stack trace only in development mode
  if (process.env.NODE_ENV !== "production") {
    response.stack = err.stack;
  }

  return res.status(statusCode).json(response);
};
