import "dotenv/config";
import logger from "./utils/logger.js";
import { initSES } from "./config/ses.js";
import startEmailConsumer from "./consumers/emailConsumer.js";

const start = async () => {
  try {
    initSES();
    await startEmailConsumer();
    logger.info("Email service started");
  } catch (error) {
    logger.error("Email service failed to start", { error: error.message });
    process.exit(1);
  }
};

start();
