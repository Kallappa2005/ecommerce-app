import mongoose from 'mongoose';

/**
 * User schema mirroring the user-service model.
 * The cart-service only reads and writes the cartData field,
 * but the full schema is required for Mongoose to interact with
 * the existing collection correctly.
 */
const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    cartData: { type: Object, default: {} },
  },
  { minimize: false }
);

const userModel = mongoose.models.user || mongoose.model('user', userSchema);

export default userModel;
