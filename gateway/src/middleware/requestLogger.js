/**
 * requestLogger.js — HTTP request/response logger for the API Gateway.
 *
 * Logs every inbound request with:
 *   - A unique request ID (UUID v4)
 *   - HTTP method, path, status code, response time
 *   - Client IP address
 *
 * The request ID is also injected as `x-request-id` header
 * so it propagates to downstream services for distributed tracing.
 */

import { v4 as uuidv4 } from "uuid";
import { createLogger } from "../../shared/utils/logger.js";

const logger = createLogger("gateway");

/**
 * requestLogger — Express middleware that attaches a request ID and logs
 * every request/response cycle with timing information.
 */
const requestLogger = (req, res, next) => {
  // Generate a unique ID for this request (used for distributed tracing)
  const requestId = uuidv4();
  req.requestId = requestId;

  // Inject into headers so downstream services can log with the same ID
  req.headers["x-request-id"] = requestId;

  // Capture start time for response duration calculation
  const startTime = Date.now();

  // Log request entry
  logger.info("Incoming request", {
    requestId,
    method: req.method,
    path: req.path,
    ip: req.ip || req.connection?.remoteAddress,
    userAgent: req.headers["user-agent"],
  });

  // Intercept response finish to log the result
  res.on("finish", () => {
    const duration = Date.now() - startTime;
    const logLevel = res.statusCode >= 500 ? "error" : res.statusCode >= 400 ? "warn" : "info";

    logger[logLevel]("Request completed", {
      requestId,
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      durationMs: duration,
    });
  });

  next();
};

export default requestLogger;
