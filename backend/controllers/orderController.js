import orderModel from "../models/orderModel.js";
import userModel from "../models/usermodel.js";
import Stripe from "stripe";
import logger from "../utils/logger.js";
import {
  publishOrderPlaced,
  publishPaymentDone,
  publishOrderStatusUpdated,
} from "../services/eventPublisher.js";

const currency = "inr";
const deliveryCharge = 10;

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const STATUS_EMAIL_TRIGGERS = [
  "Shipped",
  "Out for delivery",
  "Delivered",
];

const getUserEmailPayload = async (userId) => {
  const user = await userModel.findById(userId);
  if (!user) return null;
  return { email: user.email, name: user.name };
};

const sendOrderPlacedEmail = async (userId, order) => {
  const user = await getUserEmailPayload(userId);
  if (!user) return;

  await publishOrderPlaced({
    ...user,
    orderId: order._id.toString(),
    amount: order.amount,
    paymentMethod: order.paymentMethod,
    items: order.items,
  });
};

const placeOrder = async (req, res) => {
  try {
    const { userId, items, amount, address } = req.body;

    const orderData = {
      userId,
      items,
      address,
      amount,
      paymentMethod: "COD",
      payment: false,
      date: Date.now(),
    };

    const newOrder = new orderModel(orderData);
    await newOrder.save();

    await userModel.findByIdAndUpdate(userId, { cartData: {} });
    await sendOrderPlacedEmail(userId, newOrder);

    res.json({ success: true, message: "Order Placed" });
  } catch (error) {
    logger.error("placeOrder failed", { error: error.message });
    res.json({ success: false, message: error.message });
  }
};

const placeOrderStripe = async (req, res) => {
  try {
    const { userId, items, amount, address } = req.body;
    const { origin } = req.headers;

    const orderData = {
      userId,
      items,
      address,
      amount,
      paymentMethod: "Stripe",
      payment: false,
      date: Date.now(),
    };

    const newOrder = new orderModel(orderData);
    await newOrder.save();

    await sendOrderPlacedEmail(userId, newOrder);

    const line_items = items.map((item) => ({
      price_data: {
        currency: currency,
        product_data: {
          name: item.name,
        },
        unit_amount: item.price * 100,
      },
      quantity: item.quantity,
    }));

    line_items.push({
      price_data: {
        currency: currency,
        product_data: {
          name: "Delivery Charges",
        },
        unit_amount: deliveryCharge * 100,
      },
      quantity: 1,
    });

    const session = await stripe.checkout.sessions.create({
      success_url: `${origin}/verify?success=true&orderId=${newOrder._id}`,
      cancel_url: `${origin}/verify?success=false&orderId=${newOrder._id}`,
      line_items,
      mode: "payment",
    });

    res.json({ success: true, session_url: session.url });
  } catch (error) {
    logger.error("placeOrderStripe failed", { error: error.message });
    res.json({ success: false, message: error.message });
  }
};

const verifyStripe = async (req, res) => {
  const { orderId, success, userId } = req.body;

  try {
    if (success === "true") {
      const order = await orderModel.findByIdAndUpdate(
        orderId,
        { payment: true },
        { new: true }
      );
      await userModel.findByIdAndUpdate(userId, { cartData: {} });

      const user = await getUserEmailPayload(userId);
      if (user && order) {
        await publishPaymentDone({
          ...user,
          orderId: order._id.toString(),
          amount: order.amount,
          paymentMethod: "Stripe",
        });
      }

      res.json({ success: true });
    } else {
      await orderModel.findByIdAndDelete(orderId);
      res.json({ success: false });
    }
  } catch (error) {
    logger.error("verifyStripe failed", { error: error.message });
    res.json({ success: false, message: error.message });
  }
};

const placeOrderRazorpay = async (req, res) => {};

const allOrders = async (req, res) => {
  try {
    const orders = await orderModel.find({});
    res.json({ success: true, orders });
  } catch (error) {
    logger.error("allOrders failed", { error: error.message });
    res.json({ success: false, message: error.message });
  }
};

const userOrders = async (req, res) => {
  try {
    const { userId } = req.body;
    const orders = await orderModel.find({ userId });
    res.json({ success: true, orders });
  } catch (error) {
    logger.error("userOrders failed", { error: error.message });
    res.json({ success: false, message: error.message });
  }
};

const updateStatus = async (req, res) => {
  try {
    const { orderId, status } = req.body;
    const order = await orderModel.findByIdAndUpdate(
      orderId,
      { status },
      { new: true }
    );

    if (order && STATUS_EMAIL_TRIGGERS.includes(status)) {
      const user = await getUserEmailPayload(order.userId);
      if (user) {
        await publishOrderStatusUpdated({
          ...user,
          orderId: order._id.toString(),
          status,
          amount: order.amount,
        });
      }
    }

    res.json({ success: true, message: "Status Updated" });
  } catch (error) {
    logger.error("updateStatus failed", { error: error.message });
    res.json({ success: false, message: error.message });
  }
};

export {
  verifyStripe,
  placeOrder,
  placeOrderStripe,
  placeOrderRazorpay,
  allOrders,
  userOrders,
  updateStatus,
};
