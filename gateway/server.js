/**
 * server.js — API Gateway entry point.
 *
 * The ONLY component that clients (frontend, admin, mobile) talk to.
 * Responsibilities:
 *   1. CORS — allow configured origins
 *   2. Rate limiting — protect auth and general routes
 *   3. Request logging — unique request ID on every call
 *   4. JWT auth — verify token and inject identity headers
 *   5. Reverse proxy — forward to correct microservice
 *   6. Health check — /health endpoint for Docker and load balancers
 */

import express from "express";
import cors from "cors";
import "dotenv/config";

import requestLogger from "./src/middleware/requestLogger.js";
import authMiddleware from "./src/middleware/authMiddleware.js";
import { generalLimiter } from "./src/middleware/rateLimiter.js";
import setupRoutes from "./src/routes/index.js";
import { createLogger } from "../shared/utils/logger.js";

const logger = createLogger("gateway");
const app = express();
const PORT = process.env.PORT || 3000;

// ── CORS ─────────────────────────────────────────────────────────────────────
// Allow only configured origins (comma-separated in CORS_ORIGINS env var)
const allowedOrigins = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(",").map((o) => o.trim())
  : ["http://localhost:5173", "http://localhost:5174"]; // frontend + admin dev defaults

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (curl, Postman) in development
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      logger.warn("CORS rejected origin", { origin });
      callback(new Error(`CORS: origin ${origin} not allowed`));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "token"],
  })
);

// ── Core Middleware ───────────────────────────────────────────────────────────

// Parse JSON bodies (needed before auth reads req.body)
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Assign request ID + log every request
app.use(requestLogger);

// Apply general rate limit to all routes
app.use(generalLimiter);

// ── Health Check ─────────────────────────────────────────────────────────────
// Bypasses auth — used by Docker health checks and load balancers
app.get("/health", (req, res) => {
  res.json({
    success: true,
    service: "api-gateway",
    status: "ok",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// ── JWT Authentication ────────────────────────────────────────────────────────
// Runs after health check so /health stays public
// Injects x-user-id, x-user-role, x-gateway-verified headers for services
app.use(authMiddleware);

// ── Proxy Routes ─────────────────────────────────────────────────────────────
// Mounts all service proxy routes
setupRoutes(app);

// ── Catch-all for undefined routes ───────────────────────────────────────────
app.use("*", (req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.method} ${req.originalUrl} not found on this gateway.`,
  });
});

// ── Global Error Handler ─────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  logger.error("Gateway unhandled error", { error: err.message, stack: err.stack });
  res.status(500).json({ success: false, message: "Gateway internal error." });
});

// ── Start ─────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  logger.info(`API Gateway running on port ${PORT}`, {
    env: process.env.NODE_ENV || "development",
    cors: allowedOrigins,
  });
});

// ── Graceful Shutdown ─────────────────────────────────────────────────────────
const shutdown = () => {
  logger.info("API Gateway shutting down...");
  process.exit(0);
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

export default app;
