import Razorpay from 'razorpay';
import crypto from 'crypto';

/**
 * Creates a Razorpay order with the specified amount and currency,
 * returning the order object containing the Razorpay order ID.
 *
 * @param {Object} params          - Order parameters
 * @param {number} params.amount   - Order total in INR (will be converted to paise)
 * @param {string} params.currency - Currency code, defaults to 'INR'
 * @returns {Promise<Object>} Razorpay order object
 */
const createRazorpayOrder = async ({ amount, currency }) => {
  const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
  });

  const order = await razorpay.orders.create({
    amount: Math.round(amount * 100), // convert to paise
    currency: currency || 'INR',
    receipt: 'receipt_' + Date.now(),
  });

  return order;
};

/**
 * Verifies the Razorpay payment signature using HMAC-SHA256 to confirm
 * the payment was genuinely processed by Razorpay.
 *
 * @param {Object} params                       - Verification parameters
 * @param {string} params.razorpay_order_id     - Razorpay order ID
 * @param {string} params.razorpay_payment_id   - Razorpay payment ID
 * @param {string} params.razorpay_signature    - Signature from Razorpay callback
 * @returns {boolean} True if signature is valid, false otherwise
 */
const verifyRazorpayPayment = ({ razorpay_order_id, razorpay_payment_id, razorpay_signature }) => {
  const body = razorpay_order_id + '|' + razorpay_payment_id;

  const expectedSignature = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
    .update(body)
    .digest('hex');

  return razorpay_signature === expectedSignature;
};

export { createRazorpayOrder, verifyRazorpayPayment };
