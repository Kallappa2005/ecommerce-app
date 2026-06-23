/**
 * mongodb.js — Shared MongoDB connection factory.
 * Each microservice calls connectDB(dbName) with its own database name,
 * connecting to the same Atlas cluster but isolated to its own DB namespace.
 *
 * Usage in a service:
 *   import connectDB from '../../shared/config/mongodb.js';
 *   await connectDB('ecommerce-users');
 */

import mongoose from "mongoose";
import { createLogger } from "../utils/logger.js";

const logger = createLogger("mongodb");

/**
 * connectDB — Establishes a Mongoose connection to MongoDB Atlas.
 * @param {string} dbName - The database name for this service (e.g. 'ecommerce-users')
 * @returns {Promise<void>}
 */
const connectDB = async (dbName) => {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    throw new Error("MONGODB_URI environment variable is not set.");
  }

  if (!dbName) {
    throw new Error("connectDB requires a dbName argument.");
  }

  // Log connection events once (only attach if not already listening)
  if (mongoose.connection.listenerCount("connected") === 0) {
    mongoose.connection.on("connected", () => {
      logger.info("MongoDB connected", { dbName });
    });

    mongoose.connection.on("disconnected", () => {
      logger.warn("MongoDB disconnected", { dbName });
    });

    mongoose.connection.on("error", (err) => {
      logger.error("MongoDB connection error", { dbName, error: err.message });
    });
  }

  await mongoose.connect(uri, {
    dbName,                   // Each service gets its own database
    maxPoolSize: 10,          // Maintain up to 10 socket connections
    serverSelectionTimeoutMS: 5000,  // Give up connecting after 5 seconds
    socketTimeoutMS: 45000,   // Close sockets after 45s of inactivity
  });
};

export default connectDB;
