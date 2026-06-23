import mongoose from 'mongoose';

/**
 * Separate MongoDB connection to ecommerce-users DB to look up user email/name
 * for publishing payment events without coupling to the user-service database.
 */
const usersConnection = mongoose.createConnection(process.env.MONGODB_URI, {
  dbName: 'ecommerce-users',
});

const UserInPayment = usersConnection.model(
  'user',
  new mongoose.Schema(
    {
      name: String,
      email: String,
      cartData: { type: Object, default: {} },
    },
    { minimize: false }
  )
);

export default UserInPayment;
