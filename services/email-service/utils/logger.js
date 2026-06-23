/**
 * utils/logger.js — Logger for the email-service.
 * Thin wrapper that uses the shared logger factory, tagged as 'email-service'.
 */
import { createLogger } from "../../shared/utils/logger.js";

const logger = createLogger("email-service");

export default logger;
