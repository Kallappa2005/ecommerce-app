/**
 * emailTemplates.js — HTML email templates for all application events.
 *
 * Covers: Welcome, Email Verification, OTP/Password Reset,
 * Order Placed, Order Shipped, Order Out-for-Delivery, Order Delivered,
 * Order Cancelled, Payment Confirmed, Payment Failed.
 */

const appName = process.env.APP_NAME || "ShopSphere";
const primaryColor = "#6366f1"; // Indigo brand color

// ── Layout Wrapper ────────────────────────────────────────────────────────────

/**
 * wrapHtml — Wraps email body content in a branded HTML layout.
 * @param {string} title - Email section title
 * @param {string} body - HTML body content
 */
const wrapHtml = (title, body) => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>${title} | ${appName}</title>
</head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:Arial,sans-serif;color:#333;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:32px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">

        <!-- Header -->
        <tr>
          <td style="background:${primaryColor};padding:28px 32px;">
            <h1 style="color:#fff;margin:0;font-size:24px;font-weight:700;letter-spacing:-0.5px;">${appName}</h1>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:36px 32px;">
            <h2 style="margin:0 0 20px;color:#111;font-size:20px;">${title}</h2>
            ${body}
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:#f9fafb;padding:20px 32px;border-top:1px solid #e5e7eb;">
            <p style="margin:0;color:#6b7280;font-size:13px;">
              Thank you for shopping with <strong>${appName}</strong>.
              If you have any questions, reply to this email.
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;

// ── Helper: Order Items Table ─────────────────────────────────────────────────

/**
 * buildItemsTable — Renders an HTML table of order items for email display.
 */
const buildItemsTable = (items = []) => {
  if (!items.length) return "";
  const rows = items
    .map(
      (item) => `
      <tr>
        <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;">${item.name || "Item"}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:center;">${item.quantity || 1}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:right;">₹${item.price || 0}</td>
      </tr>`
    )
    .join("");

  return `
  <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5e7eb;border-radius:8px;margin:16px 0;border-collapse:collapse;">
    <thead>
      <tr style="background:#f3f4f6;">
        <th style="padding:8px 12px;text-align:left;font-size:12px;color:#6b7280;font-weight:600;">ITEM</th>
        <th style="padding:8px 12px;text-align:center;font-size:12px;color:#6b7280;font-weight:600;">QTY</th>
        <th style="padding:8px 12px;text-align:right;font-size:12px;color:#6b7280;font-weight:600;">PRICE</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>`;
};

// ── Templates ─────────────────────────────────────────────────────────────────

/**
 * welcomeEmail — Sent to new users immediately after registration.
 */
export const welcomeEmail = ({ name, email }) => ({
  to: email,
  subject: `Welcome to ${appName}! 🎉`,
  text: `Hi ${name}, welcome to ${appName}! Your account has been created successfully.`,
  html: wrapHtml(
    "Welcome aboard! 🎉",
    `<p>Hi <strong>${name}</strong>,</p>
     <p>Your <strong>${appName}</strong> account has been created successfully. You're all set to start shopping!</p>
     <ul style="color:#374151;line-height:1.8;">
       <li>Browse thousands of products</li>
       <li>Add items to your cart</li>
       <li>Pay securely with Stripe or Razorpay</li>
     </ul>
     <p style="margin-top:24px;">
       <a href="${process.env.FRONTEND_URL || '#'}" style="background:${primaryColor};color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;display:inline-block;">Start Shopping →</a>
     </p>`
  ),
});

/**
 * emailVerificationEmail — Sent when user requests email verification (OTP).
 */
export const emailVerificationEmail = ({ name, email, otp }) => ({
  to: email,
  subject: `Verify your ${appName} email — OTP: ${otp}`,
  text: `Hi ${name}, your email verification OTP is: ${otp}. It expires in 10 minutes.`,
  html: wrapHtml(
    "Verify your email address",
    `<p>Hi <strong>${name}</strong>,</p>
     <p>Use the OTP below to verify your email address. It expires in <strong>10 minutes</strong>.</p>
     <div style="text-align:center;margin:32px 0;">
       <div style="background:#f3f4f6;border:2px dashed ${primaryColor};border-radius:12px;padding:24px;display:inline-block;">
         <span style="font-size:36px;font-weight:800;letter-spacing:12px;color:${primaryColor};">${otp}</span>
       </div>
     </div>
     <p style="color:#6b7280;font-size:14px;">If you didn't request this, please ignore this email.</p>`
  ),
});

/**
 * passwordResetEmail — Sent when user requests a password reset OTP.
 */
export const passwordResetEmail = ({ name, email, otp }) => ({
  to: email,
  subject: `Password reset OTP for ${appName}`,
  text: `Hi ${name}, your password reset OTP is: ${otp}. It expires in 10 minutes.`,
  html: wrapHtml(
    "Reset your password",
    `<p>Hi <strong>${name}</strong>,</p>
     <p>We received a request to reset your password. Use the OTP below:</p>
     <div style="text-align:center;margin:32px 0;">
       <div style="background:#fef3c7;border:2px dashed #f59e0b;border-radius:12px;padding:24px;display:inline-block;">
         <span style="font-size:36px;font-weight:800;letter-spacing:12px;color:#d97706;">${otp}</span>
       </div>
     </div>
     <p style="color:#6b7280;font-size:14px;">This OTP expires in <strong>10 minutes</strong>. If you didn't request this, your account is safe — just ignore this email.</p>`
  ),
});

/**
 * orderPlacedEmail — Sent immediately after a COD or payment-initiated order.
 */
export const orderPlacedEmail = ({ name, email, orderId, amount, paymentMethod, items = [] }) => ({
  to: email,
  subject: `Order #${orderId} confirmed ✅`,
  text: `Hi ${name}, your order #${orderId} has been placed. Amount: ₹${amount}. Method: ${paymentMethod}.`,
  html: wrapHtml(
    "Order placed successfully ✅",
    `<p>Hi <strong>${name}</strong>,</p>
     <p>Your order has been placed and is being processed.</p>
     <table width="100%" cellpadding="0" cellspacing="0" style="margin:16px 0;">
       <tr><td style="color:#6b7280;padding:4px 0;">Order ID</td><td style="font-weight:600;">#${orderId}</td></tr>
       <tr><td style="color:#6b7280;padding:4px 0;">Total Amount</td><td style="font-weight:600;">₹${amount}</td></tr>
       <tr><td style="color:#6b7280;padding:4px 0;">Payment Method</td><td style="font-weight:600;">${paymentMethod}</td></tr>
     </table>
     ${buildItemsTable(items)}
     <p style="color:#6b7280;font-size:14px;margin-top:16px;">We'll send you another email when your order is shipped.</p>`
  ),
});

/**
 * paymentConfirmedEmail — Sent after successful online payment verification.
 */
export const paymentConfirmedEmail = ({ name, email, orderId, amount, paymentMethod }) => ({
  to: email,
  subject: `Payment confirmed for order #${orderId} 💳`,
  text: `Hi ${name}, your payment of ₹${amount} for order #${orderId} was confirmed.`,
  html: wrapHtml(
    "Payment confirmed 💳",
    `<p>Hi <strong>${name}</strong>,</p>
     <p>Your payment has been successfully processed.</p>
     <table width="100%" cellpadding="0" cellspacing="0" style="margin:16px 0;">
       <tr><td style="color:#6b7280;padding:4px 0;">Order ID</td><td style="font-weight:600;">#${orderId}</td></tr>
       <tr><td style="color:#6b7280;padding:4px 0;">Amount Paid</td><td style="font-weight:600;color:#10b981;">₹${amount}</td></tr>
       <tr><td style="color:#6b7280;padding:4px 0;">Payment Method</td><td style="font-weight:600;">${paymentMethod}</td></tr>
     </table>
     <p>Your order is now being prepared for shipment.</p>`
  ),
});

/**
 * orderStatusEmail — Sent whenever an admin updates the order status.
 * Handles: Shipped, Out for delivery, Delivered, Cancelled.
 */
export const orderStatusEmail = ({ name, email, orderId, status, amount }) => {
  const statusConfig = {
    "Shipped": {
      emoji: "📦",
      title: "Your order has been shipped!",
      message: "Your order is on its way. You can track it using the details from your courier.",
      color: "#3b82f6",
    },
    "Out for delivery": {
      emoji: "🚚",
      title: "Out for delivery!",
      message: "Your order is out for delivery and will arrive today. Please ensure someone is available to receive it.",
      color: "#f59e0b",
    },
    "Delivered": {
      emoji: "✅",
      title: "Order delivered!",
      message: "Your order has been delivered. We hope you love it! If there are any issues, please contact us.",
      color: "#10b981",
    },
    "Cancelled": {
      emoji: "❌",
      title: "Order cancelled",
      message: "Your order has been cancelled. If you paid online, your refund will be processed within 5-7 business days.",
      color: "#ef4444",
    },
  };

  const config = statusConfig[status] || {
    emoji: "ℹ️",
    title: `Order status updated: ${status}`,
    message: `Your order status has been updated to: ${status}`,
    color: primaryColor,
  };

  return {
    to: email,
    subject: `Order #${orderId} — ${status} ${config.emoji}`,
    text: `Hi ${name}, ${config.message} Order #${orderId}.`,
    html: wrapHtml(
      `${config.emoji} ${config.title}`,
      `<p>Hi <strong>${name}</strong>,</p>
       <p>${config.message}</p>
       <table width="100%" cellpadding="0" cellspacing="0" style="margin:16px 0;">
         <tr><td style="color:#6b7280;padding:4px 0;">Order ID</td><td style="font-weight:600;">#${orderId}</td></tr>
         <tr><td style="color:#6b7280;padding:4px 0;">Status</td><td><span style="background:${config.color}20;color:${config.color};padding:2px 10px;border-radius:20px;font-weight:600;font-size:14px;">${status}</span></td></tr>
         <tr><td style="color:#6b7280;padding:4px 0;">Order Value</td><td style="font-weight:600;">₹${amount}</td></tr>
       </table>`
    ),
  };
};

/**
 * paymentFailedEmail — Sent when payment fails or verification is unsuccessful.
 */
export const paymentFailedEmail = ({ name, email, orderId, amount }) => ({
  to: email,
  subject: `Payment failed for order #${orderId} ⚠️`,
  text: `Hi ${name}, your payment of ₹${amount} for order #${orderId} failed. Please try again.`,
  html: wrapHtml(
    "Payment failed ⚠️",
    `<p>Hi <strong>${name}</strong>,</p>
     <p>Unfortunately, your payment of <strong>₹${amount}</strong> for order <strong>#${orderId}</strong> could not be processed.</p>
     <p>Please try placing the order again. Your cart items are still saved.</p>
     <p style="margin-top:24px;">
       <a href="${process.env.FRONTEND_URL || '#'}" style="background:#ef4444;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;display:inline-block;">Try Again →</a>
     </p>
     <p style="color:#6b7280;font-size:14px;margin-top:16px;">If the issue persists, please contact our support team.</p>`
  ),
});

// ── Event Router ──────────────────────────────────────────────────────────────

/**
 * buildEmailFromEvent — Maps a RabbitMQ routing key to the correct email template function.
 * Returns null if no template is registered for the given routing key.
 *
 * @param {string} routingKey - RabbitMQ event routing key
 * @param {object} payload - Event payload from the message
 */
export const buildEmailFromEvent = (routingKey, payload) => {
  const templateMap = {
    "user.registered":      welcomeEmail,
    "user.password_reset":  passwordResetEmail,
    "user.verify_email":    emailVerificationEmail,
    "order.placed":         orderPlacedEmail,
    "order.status_updated": orderStatusEmail,
    "payment.done":         paymentConfirmedEmail,
    "payment.failed":       paymentFailedEmail,
  };

  const templateFn = templateMap[routingKey];

  if (!templateFn) return null;

  return templateFn(payload);
};
