/**
 * rateLimiter.js — Express rate limiting middleware for the API Gateway.
 *
 * Two separate limiters:
 *  1. `authLimiter`    — Strict: 10 requests per 15 minutes (login/register routes)
 *  2. `generalLimiter` — Relaxed: 300 requests per 15 minutes (all other routes)
 *
 * Prevents brute-force attacks on auth endpoints and protects the whole API
 * from DoS abuse.
 */

import rateLimit from "express-rate-limit";
import { createLogger } from "../../shared/utils/logger.js";

const logger = createLogger("rate-limiter");

/**
 * createLimiter — Factory function for creating a configured rate limiter.
 * @param {number} max - Maximum number of requests allowed in the window
 * @param {number} windowMinutes - Time window in minutes
 * @param {string} message - Error message returned when limit is exceeded
 */
const createLimiter = (max, windowMinutes, message) =>
  rateLimit({
    windowMs: windowMinutes * 60 * 1000,
    max,
    message: { success: false, message },
    standardHeaders: true,   // Return rate limit info in `RateLimit-*` headers
    legacyHeaders: false,     // Disable the `X-RateLimit-*` legacy headers

    // Log when someone hits the rate limit
    handler: (req, res, next, options) => {
      logger.warn("Rate limit exceeded", {
        ip: req.ip,
        path: req.path,
        limit: max,
        window: `${windowMinutes}min`,
      });
      res.status(options.statusCode).json(options.message);
    },
  });

/**
 * authLimiter — Strict limiter for authentication routes.
 * Limits to 10 requests per 15 minutes per IP.
 * Applied only on: /api/user/login, /api/user/register, /api/user/admin
 */
export const authLimiter = createLimiter(
  10,
  15,
  "Too many authentication attempts. Please try again after 15 minutes."
);

/**
 * generalLimiter — Relaxed limiter for all other API routes.
 * Limits to 300 requests per 15 minutes per IP.
 */
export const generalLimiter = createLimiter(
  300,
  15,
  "Too many requests. Please slow down."
);

/**
 * uploadLimiter — Special limiter for file upload endpoints.
 * Limits to 30 uploads per 15 minutes per IP (more lenient than auth, stricter than general).
 */
export const uploadLimiter = createLimiter(
  30,
  15,
  "Too many upload requests. Please try again later."
);
