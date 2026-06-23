import Stripe from 'stripe';

/**
 * Creates a Stripe Checkout session for the given cart items and delivery charge,
 * returning the session object containing the redirect URL.
 *
 * @param {Object} params - Session parameters
 * @param {Array}  params.items         - Cart items with { name, price, quantity }
 * @param {number} params.deliveryCharge - Flat delivery fee in INR
 * @param {string} params.successUrl    - Redirect URL on successful payment
 * @param {string} params.cancelUrl     - Redirect URL on cancelled payment
 * @returns {Promise<Object>} Stripe session object
 */
const createStripeSession = async ({ items, deliveryCharge, successUrl, cancelUrl }) => {
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

  const lineItems = items.map((item) => ({
    price_data: {
      currency: 'inr',
      product_data: {
        name: item.name,
      },
      unit_amount: Math.round(item.price * 100),
    },
    quantity: item.quantity,
  }));

  // Add delivery charge as a separate line item
  lineItems.push({
    price_data: {
      currency: 'inr',
      product_data: {
        name: 'Delivery Charge',
      },
      unit_amount: Math.round(deliveryCharge * 100),
    },
    quantity: 1,
  });

  const session = await stripe.checkout.sessions.create({
    success_url: successUrl,
    cancel_url: cancelUrl,
    line_items: lineItems,
    mode: 'payment',
  });

  return session;
};

export { createStripeSession };
