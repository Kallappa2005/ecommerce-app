/**
 * adminAuth.js — Admin JWT authentication middleware (shared).
 *
 * Verifies that the request is from a valid admin session.
 * Admin tokens are signed with `email + password` (matching existing logic).
 * Only the product-service (add/remove) and order-service (list/status) need this.
 */

import jwt from "jsonwebtoken";
import { sendUnauthorized } from "../utils/responseHelper.js";
import { createLogger } from "../utils/logger.js";

const logger = createLogger("admin-auth-middleware");

/**
 * adminAuth — Express middleware that validates an admin JWT token.
 * Decodes the token and checks it matches ADMIN_EMAIL + ADMIN_PASSWORD.
 * Returns 401 if token is missing, invalid, or not an admin token.
 */
const adminAuth = async (req, res, next) => {
  const token = req.headers["token"] || req.headers["authorization"]?.replace("Bearer ", "");

  if (!token) {
    return sendUnauthorized(res, "Admin access token is required.");
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Admin token payload is the raw string "email + password" (not an object with id)
    const expectedPayload = process.env.ADMIN_EMAIL + process.env.ADMIN_PASSWORD;

    if (decoded !== expectedPayload) {
      logger.warn("Admin auth rejected — payload mismatch");
      return sendUnauthorized(res, "Not Authorized. Admin access only.");
    }

    // Mark this request as coming from admin for downstream use
    req.isAdmin = true;
    next();
  } catch (error) {
    logger.warn("Admin JWT verification failed", { error: error.message });
    return sendUnauthorized(res, "Invalid or expired admin token.");
  }
};

export default adminAuth;
