/**
 * auth.js — JWT authentication middleware (shared).
 *
 * Reads the `token` header from incoming requests, verifies it,
 * and injects `req.userId` for downstream controllers.
 *
 * Also exports `extractUserId` — used by the Gateway to inject
 * `x-user-id` header into proxied requests.
 */

import jwt from "jsonwebtoken";
import { sendUnauthorized } from "../utils/responseHelper.js";
import { createLogger } from "../utils/logger.js";

const logger = createLogger("auth-middleware");

/**
 * authUser — Express middleware that validates a user JWT token.
 * On success, attaches decoded userId to req.body.userId and req.userId.
 * On failure, returns 401 immediately.
 */
const authUser = async (req, res, next) => {
  // Support both lowercase and uppercase header names
  const token = req.headers["token"] || req.headers["authorization"]?.replace("Bearer ", "");

  if (!token) {
    return sendUnauthorized(res, "Access token is required. Please login.");
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.id;      // Attach to req for easy access
    req.body.userId = decoded.id; // Keep backward compat with existing controllers
    next();
  } catch (error) {
    logger.warn("JWT verification failed", { error: error.message });
    return sendUnauthorized(res, "Invalid or expired token. Please login again.");
  }
};

/**
 * extractUserId — Pure function (no response) to decode a token and return the userId.
 * Used by the API Gateway to extract the user ID before proxying the request.
 * @param {string} token - JWT token string
 * @returns {{ id: string } | null} Decoded payload or null if invalid
 */
const extractUserId = (token) => {
  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    return null;
  }
};

export { authUser, extractUserId };
export default authUser;
