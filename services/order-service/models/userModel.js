/**
 * userModel.js — Lightweight cross-service user model for the order-service.
 * Uses a separate mongoose connection to the ecommerce-users database so order-service
 * can clear cartData and retrieve user email without owning the users DB.
 */

import mongoose from 'mongoose';

/**
 * usersConnection — A dedicated Mongoose connection pointing to ecommerce-users DB.
 * Separate from the default connection (ecommerce-orders) used by orderModel.
 */
const usersConnection = mongoose.createConnection(process.env.MONGODB_URI, {
  dbName: 'ecommerce-users',
});

usersConnection.on('connected', () => {
  // Connection established to ecommerce-users DB
  console.log('[order-service] usersConnection: connected to ecommerce-users');
});

usersConnection.on('error', (err) => {
  console.error('[order-service] usersConnection error:', err.message);
});

/**
 * UserInOrder — Mongoose model bound to the ecommerce-users connection.
 * Only exposes the fields needed by order-service: name, email, cartData.
 */
const UserInOrder = usersConnection.model(
  'user',
  new mongoose.Schema(
    {
      name: { type: String },
      email: { type: String },
      cartData: { type: Object, default: {} },
    },
    { minimize: false }
  )
);

export default UserInOrder;
