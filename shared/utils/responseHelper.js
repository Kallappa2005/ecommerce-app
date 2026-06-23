/**
 * responseHelper.js — Standardised API response helpers.
 * Every service uses these to ensure a consistent JSON response shape.
 *
 * Response shape:
 *   { success: true,  data: {...},   message: "..."  }  — success
 *   { success: false, error: "...",  message: "..."  }  — failure
 */

/**
 * sendSuccess — Sends a 2xx JSON response with data and optional message.
 * @param {import('express').Response} res
 * @param {*} data - Payload to include in response
 * @param {string} message - Human-readable success message
 * @param {number} statusCode - HTTP status (default 200)
 */
export const sendSuccess = (res, data = {}, message = "Success", statusCode = 200) => {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
  });
};

/**
 * sendError — Sends a 4xx/5xx JSON response with an error message.
 * @param {import('express').Response} res
 * @param {string} message - Error description shown to client
 * @param {number} statusCode - HTTP status (default 400)
 * @param {*} details - Optional extra details (only included in non-production)
 */
export const sendError = (res, message = "Something went wrong", statusCode = 400, details = null) => {
  const body = { success: false, message };

  if (details && process.env.NODE_ENV !== "production") {
    body.details = details;
  }

  return res.status(statusCode).json(body);
};

/**
 * sendUnauthorized — Convenience wrapper for 401 responses.
 */
export const sendUnauthorized = (res, message = "Not Authorized. Please login again.") => {
  return sendError(res, message, 401);
};

/**
 * sendForbidden — Convenience wrapper for 403 responses (authenticated but not permitted).
 */
export const sendForbidden = (res, message = "Forbidden. Insufficient permissions.") => {
  return sendError(res, message, 403);
};

/**
 * sendNotFound — Convenience wrapper for 404 responses.
 */
export const sendNotFound = (res, message = "Resource not found.") => {
  return sendError(res, message, 404);
};

/**
 * sendServerError — Convenience wrapper for 500 responses.
 */
export const sendServerError = (res, message = "Internal server error.") => {
  return sendError(res, message, 500);
};
