/**
 * eventKeys.js — Centralised RabbitMQ routing key definitions.
 * Every producer and consumer imports from here to prevent typo-driven bugs.
 */

export const EXCHANGE_NAME = "ecommerce.events"; // Topic exchange used by every service

export const EVENTS = {
  // ── User Events ────────────────────────────────────────────────
  USER_REGISTERED: "user.registered",      // Fired after successful registration → email welcome
  USER_PASSWORD_RESET: "user.password_reset", // Fired on forgot-password request → OTP email

  // ── Order Events ───────────────────────────────────────────────
  ORDER_PLACED: "order.placed",            // Fired when order is created → email confirmation
  ORDER_STATUS_UPDATED: "order.status_updated", // Fired on admin status change → email + notification

  // ── Payment Events ─────────────────────────────────────────────
  PAYMENT_DONE: "payment.done",            // Fired after successful payment verification → email receipt
  PAYMENT_FAILED: "payment.failed",        // Fired when payment fails → email alert
};

// ── Queue Names ─────────────────────────────────────────────────────────────

export const QUEUES = {
  EMAIL_NOTIFICATIONS: "email.notifications",       // Consumed by email-service
  APP_NOTIFICATIONS: "app.notifications",           // Consumed by notification-service
};

// ── Routing key → queue binding map ─────────────────────────────────────────
// Defines which queues each event should be delivered to.
export const QUEUE_BINDINGS = {
  [QUEUES.EMAIL_NOTIFICATIONS]: [
    EVENTS.USER_REGISTERED,
    EVENTS.USER_PASSWORD_RESET,
    EVENTS.ORDER_PLACED,
    EVENTS.ORDER_STATUS_UPDATED,
    EVENTS.PAYMENT_DONE,
    EVENTS.PAYMENT_FAILED,
  ],
  [QUEUES.APP_NOTIFICATIONS]: [
    EVENTS.ORDER_STATUS_UPDATED,
    EVENTS.PAYMENT_DONE,
  ],
};
