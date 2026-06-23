import express from 'express';
import authUser from '../../shared/middlewares/auth.js';
import { addToCart, updateCart, getUserCart } from '../controllers/cartController.js';

/** Express router for all cart-related endpoints */
const router = express.Router();

/** POST /api/cart/get — Fetch the authenticated user's cart */
router.post('/get', authUser, getUserCart);

/** POST /api/cart/add — Add an item to the authenticated user's cart */
router.post('/add', authUser, addToCart);

/** POST /api/cart/update — Update quantity of an item in the authenticated user's cart */
router.post('/update', authUser, updateCart);

export default router;
