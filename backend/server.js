import express from "express";
import cors from "cors";
import "dotenv/config";
import connectDB from "./config/mongodb.js";
import { initS3 } from "./config/s3.js";
import { connectRabbitMQ, closeRabbitMQ } from "./config/rabbitmq.js";
import userRouter from "./routes/userRoute.js";
import productRouter from "./routes/productRoute.js";
import cartRouter from "./routes/cartRoute.js";
import orderRouter from "./routes/orderRoute.js";
import logger from "./utils/logger.js";

const app = express();
const port = process.env.PORT || 4000;

const allowedOrigins = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(",").map((origin) => origin.trim())
  : null;

app.use(
  cors(
    allowedOrigins
      ? {
          origin: allowedOrigins,
          credentials: true,
        }
      : undefined
  )
);
app.use(express.json());

app.use("/api/user", userRouter);
app.use("/api/product", productRouter);
app.use("/api/cart", cartRouter);
app.use("/api/order", orderRouter);

app.get("/", (req, res) => {
  res.send("API Working");
});

app.get("/health", (req, res) => {
  res.json({ status: "ok", service: "backend-api" });
});

const startServer = async () => {
  await connectDB();
  initS3();
  await connectRabbitMQ();

  app.listen(port, () => {
    logger.info(`Server listening on port ${port}`);
  });
};

startServer().catch((error) => {
  logger.error("Failed to start backend", { error: error.message });
  process.exit(1);
});

const shutdown = async () => {
  logger.info("Shutting down backend...");
  await closeRabbitMQ();
  process.exit(0);
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
