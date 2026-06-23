import express from 'express';
import authUser from '../../../shared/middlewares/auth.js';
import {
  placeOrderStripe,
  verifyStripe,
  placeOrderRazorpay,
  verifyRazorpay,
} from '../controllers/paymentController.js';

/** Express router mounting all payment-related endpoints under /api/payment. */
const router = express.Router();

// Stripe payment routes
router.post('/stripe', authUser, placeOrderStripe);
router.post('/verifyStripe', authUser, verifyStripe);

// Razorpay payment routes
router.post('/razorpay', authUser, placeOrderRazorpay);
router.post('/verifyRazorpay', authUser, verifyRazorpay);

export default router;
