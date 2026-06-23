/**
 * authMiddleware.js — Gateway-level JWT verification.
 *
 * The gateway intercepts every request, verifies the JWT (if present),
 * and injects identity headers (x-user-id, x-user-role) into the proxied
 * request so downstream services don't need to repeat token verification.
 *
 * Public routes (no token needed) are explicitly whitelisted.
 */

import jwt from "jsonwebtoken";
import { createLogger } from "../../shared/utils/logger.js";

const logger = createLogger("gateway-auth");

/**
 * PUBLIC_ROUTES — List of route patterns that do NOT require a JWT token.
 * These are freely accessible endpoints.
 */
const PUBLIC_ROUTES = [
  { method: "POST", path: "/api/user/register" },
  { method: "POST", path: "/api/user/login" },
  { method: "POST", path: "/api/user/admin" },
  { method: "GET",  path: "/api/product/list" },
  { method: "POST", path: "/api/product/single" },
  { method: "GET",  path: "/health" },
];

/**
 * isPublicRoute — Checks if a request matches any of the public route definitions.
 * Allows the request to proceed without a token.
 */
const isPublicRoute = (method, path) => {
  return PUBLIC_ROUTES.some(
    (route) => route.method === method && route.path === path
  );
};

/**
 * authMiddleware — Verifies JWT for protected routes.
 * On success: injects `x-user-id` header so downstream services can trust the identity.
 * On failure: returns 401 immediately without proxying.
 * On public routes: passes through without any token check.
 */
const authMiddleware = (req, res, next) => {
  const { method, path } = req;

  // Allow public routes through without auth check
  if (isPublicRoute(method, path)) {
    return next();
  }

  const token =
    req.headers["token"] ||
    req.headers["authorization"]?.replace("Bearer ", "");

  if (!token) {
    return res.status(401).json({
      success: false,
      message: "Access token is required. Please login.",
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Inject identity headers — downstream services trust these instead of re-verifying
    req.headers["x-user-id"] = decoded.id || "";
    req.headers["x-user-role"] = decoded.role || "user";
    req.headers["x-gateway-verified"] = "true"; // Proof that gateway already verified

    next();
  } catch (error) {
    logger.warn("JWT verification failed at gateway", {
      path,
      error: error.message,
    });
    return res.status(401).json({
      success: false,
      message: "Invalid or expired token. Please login again.",
    });
  }
};

export default authMiddleware;
