/**
 * logger.js — Structured logger shared across all microservices.
 * Accepts an optional `serviceName` so log lines are tagged by service.
 * Format: [ISO timestamp] [LEVEL] [service-name] message {meta}
 */

/**
 * createLogger — Factory that returns a logger instance tagged with the given service name.
 * @param {string} serviceName - The name of the calling service (e.g. "user-service")
 */
const createLogger = (serviceName = "app") => {
  /**
   * formatMessage — Builds the final log string with timestamp, level, service tag, and optional metadata.
   */
  const formatMessage = (level, message, meta) => {
    const timestamp = new Date().toISOString();
    const metaStr = meta ? ` ${JSON.stringify(meta)}` : "";
    return `[${timestamp}] [${level.toUpperCase()}] [${serviceName}] ${message}${metaStr}`;
  };

  return {
    /** Logs informational messages (happy path). */
    info: (message, meta) => console.log(formatMessage("info", message, meta)),

    /** Logs non-critical warnings that should be investigated. */
    warn: (message, meta) => console.warn(formatMessage("warn", message, meta)),

    /** Logs errors that indicate something went wrong. */
    error: (message, meta) => console.error(formatMessage("error", message, meta)),

    /** Logs debug-level details (disabled in production via NODE_ENV check). */
    debug: (message, meta) => {
      if (process.env.NODE_ENV !== "production") {
        console.debug(formatMessage("debug", message, meta));
      }
    },
  };
};

// Default logger instance — used when a service doesn't call createLogger
const logger = createLogger("app");

export { createLogger };
export default logger;
