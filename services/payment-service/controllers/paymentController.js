import { asyncHandler } from '../../../shared/utils/errorHandler.js';
import { sendSuccess, sendError, sendServerError } from '../../../shared/utils/responseHelper.js';
import { createLogger } from '../../../shared/utils/logger.js';
import Order from '../models/orderModel.js';
import UserInPayment from '../models/userModel.js';
import * as stripeService from '../services/stripeService.js';
import * as razorpayService from '../services/razorpayService.js';
import { publishPaymentDone, publishPaymentFailed } from '../services/eventPublisher.js';

const logger = createLogger('payment-service');

/** Flat delivery fee applied to every order (INR). */
const currency = 'inr';
const deliveryCharge = 10;

/**
 * Creates a new order record with Stripe as the payment method and returns a
 * Stripe-hosted Checkout session URL for the frontend to redirect the user to.
 */
const placeOrderStripe = asyncHandler(async (req, res) => {
  const { userId, items, amount, address } = req.body;
  const origin = req.headers.origin;

  // Persist the order before redirecting to Stripe
  const newOrder = await Order.create({
    userId,
    items,
    amount,
    address,
    paymentMethod: 'Stripe',
    payment: false,
    date: Date.now(),
  });

  const session = await stripeService.createStripeSession({
    items,
    deliveryCharge,
    successUrl: `${origin}/verify?success=true&orderId=${newOrder._id}`,
    cancelUrl: `${origin}/verify?success=false&orderId=${newOrder._id}`,
  });

  logger.info('Stripe session created', { orderId: newOrder._id });
  return sendSuccess(res, { session_url: session.url }, 'Stripe session created');
});

/**
 * Verifies the result of a Stripe Checkout session: marks the order as paid and
 * clears the user's cart on success, or deletes the order on cancellation/failure.
 */
const verifyStripe = asyncHandler(async (req, res) => {
  const { orderId, success, userId } = req.body;

  if (success === 'true') {
    // Mark order as paid
    await Order.findByIdAndUpdate(orderId, { payment: true });

    // Clear user cart
    await UserInPayment.findByIdAndUpdate(userId, { cartData: {} });

    // Fetch user details for event
    const user = await UserInPayment.findById(userId);
    const order = await Order.findById(orderId);

    await publishPaymentDone({
      email: user?.email,
      name: user?.name,
      orderId: orderId.toString(),
      amount: order?.amount,
      paymentMethod: 'Stripe',
    });

    logger.info('Stripe payment verified', { orderId, userId });
    return sendSuccess(res, {}, 'Payment verified successfully');
  } else {
    // Payment was cancelled — remove the pending order
    await Order.findByIdAndDelete(orderId);

    await publishPaymentFailed({ orderId: orderId.toString(), userId });

    logger.warn('Stripe payment cancelled', { orderId, userId });
    return sendError(res, 'Payment was cancelled', 400);
  }
});

/**
 * Creates a new order record with Razorpay as the payment method and returns a
 * Razorpay order object for the frontend SDK to open the payment modal.
 */
const placeOrderRazorpay = asyncHandler(async (req, res) => {
  const { userId, items, amount, address } = req.body;

  const newOrder = await Order.create({
    userId,
    items,
    amount,
    address,
    paymentMethod: 'Razorpay',
    payment: false,
    date: Date.now(),
  });

  const razorpayOrder = await razorpayService.createRazorpayOrder({
    amount,
    currency: 'INR',
  });

  logger.info('Razorpay order created', { orderId: newOrder._id, razorpayOrderId: razorpayOrder.id });
  return sendSuccess(
    res,
    { order: razorpayOrder, orderId: newOrder._id },
    'Razorpay order created'
  );
});

/**
 * Verifies the Razorpay payment signature; on success marks the order as paid,
 * clears the user's cart, and publishes a payment event. Returns failure otherwise.
 */
const verifyRazorpay = asyncHandler(async (req, res) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature, orderId, userId } = req.body;

  const isValid = razorpayService.verifyRazorpayPayment({
    razorpay_order_id,
    razorpay_payment_id,
    razorpay_signature,
  });

  if (isValid) {
    // Mark order as paid
    await Order.findByIdAndUpdate(orderId, { payment: true });

    // Clear user cart
    await UserInPayment.findByIdAndUpdate(userId, { cartData: {} });

    // Fetch user details for event
    const user = await UserInPayment.findById(userId);
    const order = await Order.findById(orderId);

    await publishPaymentDone({
      email: user?.email,
      name: user?.name,
      orderId: orderId.toString(),
      amount: order?.amount,
      paymentMethod: 'Razorpay',
    });

    logger.info('Razorpay payment verified', { orderId, userId });
    return sendSuccess(res, {}, 'Payment verified successfully');
  } else {
    logger.warn('Razorpay signature mismatch', { orderId, razorpay_order_id });
    return sendError(res, 'Payment verification failed', 400);
  }
});

export { placeOrderStripe, verifyStripe, placeOrderRazorpay, verifyRazorpay };
