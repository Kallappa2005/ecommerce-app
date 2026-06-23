/**
 * orderRoutes.js — Express router for all order-service endpoints.
 * User routes are protected by authUser; admin routes by adminAuth.
 * The payment-status endpoint is internal-only (no JWT — relies on x-gateway-verified header).
 */

import express from 'express';
import authUser from '../../../shared/middlewares/auth.js';
import adminAuth from '../../../shared/middlewares/adminAuth.js';
import {
  placeOrder,
  allOrders,
  userOrders,
  updateStatus,
  updatePaymentStatus,
} from '../controllers/orderController.js';

const router = express.Router();

// ── User Routes (JWT-protected) ───────────────────────────────────────────────

/** POST /api/order/place — Place a new COD order for the authenticated user */
router.post('/place', authUser, placeOrder);

/** POST /api/order/userorders — Fetch all orders for the authenticated user */
router.post('/userorders', authUser, userOrders);

// ── Admin Routes (Admin JWT-protected) ────────────────────────────────────────

/** POST /api/order/list — Admin: retrieve all orders across all users */
router.post('/list', adminAuth, allOrders);

/** POST /api/order/status — Admin: update the delivery status of an order */
router.post('/status', adminAuth, updateStatus);

// ── Internal Service-to-Service Routes ────────────────────────────────────────

/**
 * GET /api/order/payment-status/:orderId — Internal endpoint called by payment-service.
 * No JWT auth — guarded by x-gateway-verified header check inside the controller.
 */
router.get('/payment-status/:orderId', updatePaymentStatus);

export default router;
