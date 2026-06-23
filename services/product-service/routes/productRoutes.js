/**
 * productRoutes.js — Express router for all product-related endpoints.
 * Admin-protected routes use adminAuth middleware; public routes are unrestricted.
 */

import express from 'express';
import adminAuth from '../../../shared/middlewares/adminAuth.js';
import upload from '../middleware/multer.js';
import {
  addProduct,
  listProduct,
  removeProduct,
  singleProduct,
} from '../controllers/productController.js';

const router = express.Router();

/**
 * POST /api/product/add — Admin-only route to create a new product with up to 4 images.
 * Requires a valid admin JWT token and multipart/form-data with image fields.
 */
router.post(
  '/add',
  adminAuth,
  upload.fields([
    { name: 'image1', maxCount: 1 },
    { name: 'image2', maxCount: 1 },
    { name: 'image3', maxCount: 1 },
    { name: 'image4', maxCount: 1 },
  ]),
  addProduct
);

/**
 * POST /api/product/remove — Admin-only route to delete a product by ID.
 */
router.post('/remove', adminAuth, removeProduct);

/**
 * POST /api/product/single — Public route to fetch a single product by ID.
 */
router.post('/single', singleProduct);

/**
 * GET /api/product/list — Public route to retrieve all products.
 */
router.get('/list', listProduct);

export default router;
