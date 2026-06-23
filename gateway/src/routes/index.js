/**
 * index.js — Gateway route configuration.
 *
 * Maps public API paths to internal microservice URLs using http-proxy-middleware.
 * The frontend NEVER changes — it still calls /api/user, /api/product etc.
 * The gateway rewrites internally where needed (e.g. /api/order/stripe → payment-service).
 *
 * Service URL environment variables:
 *   USER_SERVICE_URL     = http://user-service:4001
 *   PRODUCT_SERVICE_URL  = http://product-service:4002
 *   CART_SERVICE_URL     = http://cart-service:4003
 *   ORDER_SERVICE_URL    = http://order-service:4004
 *   PAYMENT_SERVICE_URL  = http://payment-service:4005
 */

import { createProxyMiddleware } from "http-proxy-middleware";
import { createLogger } from "../../../shared/utils/logger.js";
import { authLimiter, uploadLimiter } from "../middleware/rateLimiter.js";

const logger = createLogger("gateway-router");

/**
 * createServiceProxy — Factory that creates a configured proxy middleware for a target service.
 * Adds error handling, timeout, and path rewriting support.
 *
 * @param {string} target - The base URL of the target microservice
 * @param {object} options - Additional proxy options (e.g. pathRewrite)
 */
const createServiceProxy = (target, options = {}) => {
  return createProxyMiddleware({
    target,
    changeOrigin: true,  // Rewrite the Host header to match target (required for Docker networks)
    timeout: 30000,      // 30s timeout before gateway returns 504

    on: {
      // Log each successful proxy
      proxyReq: (proxyReq, req) => {
        logger.info("Proxying request", {
          method: req.method,
          path: req.path,
          target,
          requestId: req.headers["x-request-id"],
        });
      },

      // Log proxy errors and return a friendly response
      error: (err, req, res) => {
        logger.error("Proxy error", {
          target,
          path: req.path,
          error: err.message,
          requestId: req.headers["x-request-id"],
        });

        // Guard against sending headers twice if response already started
        if (!res.headersSent) {
          res.status(502).json({
            success: false,
            message: `Service temporarily unavailable. Please try again.`,
            requestId: req.headers["x-request-id"],
          });
        }
      },
    },

    ...options,
  });
};

/**
 * setupRoutes — Mounts all proxy routes onto the Express app.
 * Order matters: more specific paths must be declared before catch-all paths.
 *
 * @param {import('express').Application} app
 */
const setupRoutes = (app) => {
  const userServiceUrl     = process.env.USER_SERVICE_URL     || "http://localhost:4001";
  const productServiceUrl  = process.env.PRODUCT_SERVICE_URL  || "http://localhost:4002";
  const cartServiceUrl     = process.env.CART_SERVICE_URL     || "http://localhost:4003";
  const orderServiceUrl    = process.env.ORDER_SERVICE_URL    || "http://localhost:4004";
  const paymentServiceUrl  = process.env.PAYMENT_SERVICE_URL  || "http://localhost:4005";

  // ── User Service (/api/user/*) ────────────────────────────────────────────
  // Apply strict rate limit only on auth endpoints
  app.use("/api/user/register", authLimiter);
  app.use("/api/user/login",    authLimiter);
  app.use("/api/user/admin",    authLimiter);

  app.use(
    "/api/user",
    createServiceProxy(userServiceUrl)
  );

  // ── Product Service (/api/product/*) ─────────────────────────────────────
  // Apply upload limiter on the add endpoint (handles image uploads)
  app.use("/api/product/add", uploadLimiter);

  app.use(
    "/api/product",
    createServiceProxy(productServiceUrl)
  );

  // ── Cart Service (/api/cart/*) ────────────────────────────────────────────
  app.use(
    "/api/cart",
    createServiceProxy(cartServiceUrl)
  );

  // ── Payment routes (live inside /api/order/stripe etc.) ──────────────────
  // The frontend calls /api/order/stripe and /api/order/razorpay which belong
  // to the payment-service. We proxy these BEFORE the general order routes.
  app.use(
    ["/api/order/stripe", "/api/order/razorpay", "/api/order/verifyStripe", "/api/order/verifyRazorpay"],
    createServiceProxy(paymentServiceUrl, {
      pathRewrite: (path) => {
        // Rewrite /api/order/stripe → /api/payment/stripe etc.
        return path.replace("/api/order/", "/api/payment/");
      },
    })
  );

  // ── Order Service (/api/order/*) ──────────────────────────────────────────
  app.use(
    "/api/order",
    createServiceProxy(orderServiceUrl)
  );

  logger.info("Gateway routes registered", {
    routes: ["/api/user", "/api/product", "/api/cart", "/api/order", "payment-rewrites"],
  });
};

export default setupRoutes;
