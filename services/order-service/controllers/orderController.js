/**
 * orderController.js — Business logic for all order-service endpoints.
 * Handles order placement (COD), listing, status updates, and payment status sync.
 */

import Order from '../models/orderModel.js';
import UserInOrder from '../models/userModel.js';
import { publishOrderPlaced, publishOrderStatusUpdated } from '../services/eventPublisher.js';
import { sendSuccess, sendError, sendNotFound, sendServerError } from '../../../shared/utils/responseHelper.js';
import { createLogger } from '../../../shared/utils/logger.js';

const logger = createLogger('order-service');

/**
 * STATUS_EMAIL_TRIGGERS — Order statuses that warrant sending an email notification to the customer.
 */
const STATUS_EMAIL_TRIGGERS = ['Shipped', 'Out for delivery', 'Delivered'];

// ── Controllers ───────────────────────────────────────────────────────────────

/**
 * placeOrder — Creates a new COD order, clears the user's cart, and publishes an ORDER_PLACED event.
 * Expects userId, items, amount, and address in req.body (userId injected by authUser middleware).
 */
const placeOrder = async (req, res) => {
  try {
    const { userId, items, amount, address } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return sendError(res, 'Order must contain at least one item.', 400);
    }

    if (!amount || amount <= 0) {
      return sendError(res, 'Order amount must be a positive number.', 400);
    }

    if (!address) {
      return sendError(res, 'Delivery address is required.', 400);
    }

    // Build and persist the order
    const orderData = {
      userId,
      items,
      address,
      amount,
      paymentMethod: 'COD',
      payment: false,
      date: Date.now(),
    };

    const newOrder = new Order(orderData);
    await newOrder.save();

    logger.info('Order placed (COD)', { orderId: newOrder._id.toString(), userId, amount });

    // Clear the user's cart after order is saved (non-blocking on failure)
    try {
      await UserInOrder.findByIdAndUpdate(userId, { cartData: {} });
    } catch (cartErr) {
      logger.warn('Failed to clear cart after order placement', { userId, error: cartErr.message });
    }

    // Fetch user details for the event payload
    let userEmail = '';
    let userName = '';
    try {
      const user = await UserInOrder.findById(userId).select('email name');
      if (user) {
        userEmail = user.email;
        userName = user.name;
      }
    } catch (userErr) {
      logger.warn('Failed to fetch user for ORDER_PLACED event', { userId, error: userErr.message });
    }

    // Publish ORDER_PLACED event for email-service to consume
    await publishOrderPlaced({
      email: userEmail,
      name: userName,
      orderId: newOrder._id.toString(),
      amount,
      paymentMethod: 'COD',
      items,
    });

    return sendSuccess(res, {}, 'Order Placed');
  } catch (error) {
    logger.error('placeOrder failed', { error: error.message });
    return sendServerError(res, 'Failed to place order. Please try again.');
  }
};

/**
 * allOrders — Admin endpoint that returns every order in the database.
 * Sorted by date descending so newest orders appear first.
 */
const allOrders = async (req, res) => {
  try {
    const orders = await Order.find({}).sort({ date: -1 });
    return sendSuccess(res, { orders }, 'Orders fetched successfully');
  } catch (error) {
    logger.error('allOrders failed', { error: error.message });
    return sendServerError(res, 'Failed to fetch orders.');
  }
};

/**
 * userOrders — Returns all orders belonging to the authenticated user.
 * userId is injected into req.body by the authUser middleware.
 */
const userOrders = async (req, res) => {
  try {
    const { userId } = req.body;

    const orders = await Order.find({ userId }).sort({ date: -1 });
    return sendSuccess(res, { orders }, 'User orders fetched successfully');
  } catch (error) {
    logger.error('userOrders failed', { error: error.message });
    return sendServerError(res, 'Failed to fetch user orders.');
  }
};

/**
 * updateStatus — Admin endpoint to update an order's delivery status.
 * Publishes an ORDER_STATUS_UPDATED event when the status is a key milestone.
 */
const updateStatus = async (req, res) => {
  try {
    const { orderId, status } = req.body;

    if (!orderId || !status) {
      return sendError(res, 'orderId and status are required.', 400);
    }

    const order = await Order.findByIdAndUpdate(
      orderId,
      { status },
      { new: true }
    );

    if (!order) {
      return sendNotFound(res, 'Order not found.');
    }

    logger.info('Order status updated', { orderId, status });

    // Publish status email only for key milestone statuses
    if (STATUS_EMAIL_TRIGGERS.includes(status)) {
      let userEmail = '';
      let userName = '';
      try {
        const user = await UserInOrder.findById(order.userId).select('email name');
        if (user) {
          userEmail = user.email;
          userName = user.name;
        }
      } catch (userErr) {
        logger.warn('Failed to fetch user for ORDER_STATUS_UPDATED event', {
          userId: order.userId,
          error: userErr.message,
        });
      }

      await publishOrderStatusUpdated({
        email: userEmail,
        name: userName,
        orderId: order._id.toString(),
        status,
        items: order.items,
      });
    }

    return sendSuccess(res, {}, 'Status Updated');
  } catch (error) {
    logger.error('updateStatus failed', { error: error.message });
    return sendServerError(res, 'Failed to update order status.');
  }
};

/**
 * updatePaymentStatus — Internal service-to-service endpoint called by payment-service.
 * Verifies the x-gateway-verified header, updates payment flag, and clears cart on success.
 * Route: GET /api/order/payment-status/:orderId?paid=true|false
 */
const updatePaymentStatus = async (req, res) => {
  try {
    // Guard: only allow requests originating from trusted internal services
    const gatewayVerified = req.headers['x-gateway-verified'];
    if (!gatewayVerified) {
      return sendError(res, 'Unauthorized: internal endpoint only.', 401);
    }

    const { orderId } = req.params;
    const paid = req.query.paid === 'true';

    if (!orderId) {
      return sendError(res, 'orderId is required.', 400);
    }

    const updateFields = { payment: paid };

    // Mark as paid and set status if payment succeeded
    if (paid) {
      updateFields.status = 'Payment Confirmed';
    }

    const order = await Order.findByIdAndUpdate(orderId, updateFields, { new: true });

    if (!order) {
      return sendNotFound(res, 'Order not found.');
    }

    logger.info('Payment status updated', { orderId, paid });

    // Clear cart when payment is confirmed
    if (paid) {
      try {
        await UserInOrder.findByIdAndUpdate(order.userId, { cartData: {} });
      } catch (cartErr) {
        logger.warn('Failed to clear cart after payment confirmation', {
          userId: order.userId,
          error: cartErr.message,
        });
      }
    }

    return sendSuccess(res, { order }, 'Payment status updated');
  } catch (error) {
    logger.error('updatePaymentStatus failed', { error: error.message });
    return sendServerError(res, 'Failed to update payment status.');
  }
};

export { placeOrder, allOrders, userOrders, updateStatus, updatePaymentStatus };
