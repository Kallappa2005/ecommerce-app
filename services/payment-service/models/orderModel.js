import mongoose from 'mongoose';

/**
 * Order schema mirroring the order-service model for reading and updating orders
 * within the shared ecommerce-orders database.
 */
const orderSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  items: { type: Array, required: true },
  amount: { type: Number, required: true },
  address: { type: Object, required: true },
  status: { type: String, required: true, default: 'Order Placed' },
  paymentMethod: { type: String, required: true },
  payment: { type: Boolean, required: true, default: false },
  date: { type: Number, required: true },
});

const Order = mongoose.model('order', orderSchema);

export default Order;
