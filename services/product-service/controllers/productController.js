/**
 * productController.js — Business logic for product CRUD operations.
 * Handles image uploads to S3, product creation, listing, removal, and single fetch.
 */

import { createLogger } from '../../../shared/utils/logger.js';
import { sendSuccess, sendError, sendNotFound, sendServerError } from '../../../shared/utils/responseHelper.js';
import { uploadToS3 } from '../../../shared/utils/s3Upload.js';
import productModel from '../models/productModel.js';

const logger = createLogger('product-service');

/**
 * addProduct — Creates a new product, uploading all provided images to S3 first.
 * Requires at least one image; parses sizes from JSON string in request body.
 */
const addProduct = async (req, res) => {
  try {
    const { name, description, price, category, subCategory, sizes, bestseller } = req.body;

    // Extract up to 4 optional image files from the multipart upload
    const image1 = req.files?.image1?.[0];
    const image2 = req.files?.image2?.[0];
    const image3 = req.files?.image3?.[0];
    const image4 = req.files?.image4?.[0];

    // Filter out any undefined (not provided) image slots
    const imageFiles = [image1, image2, image3, image4].filter(Boolean);

    if (imageFiles.length === 0) {
      return sendError(res, 'At least one image is required', 400);
    }

    // Upload all images concurrently to S3 under the 'products' folder
    logger.info('Uploading product images to S3', { count: imageFiles.length });
    const imageUrls = await Promise.all(
      imageFiles.map((file) => uploadToS3(file, 'products'))
    );

    // Build the product document
    const productData = {
      name,
      description,
      price: Number(price),
      image: imageUrls,
      category,
      subCategory,
      sizes: JSON.parse(sizes),
      bestseller: bestseller === 'true',
      date: Date.now(),
    };

    const product = new productModel(productData);
    await product.save();

    logger.info('Product added successfully', { productId: product._id, name });
    return sendSuccess(res, { product }, 'Product added');
  } catch (error) {
    logger.error('Failed to add product', { error: error.message });
    return sendServerError(res, 'Failed to add product');
  }
};

/**
 * listProduct — Retrieves all products from the database.
 * Returns an array of product documents without any filtering.
 */
const listProduct = async (req, res) => {
  try {
    const products = await productModel.find({});
    return sendSuccess(res, { products }, 'Products retrieved');
  } catch (error) {
    logger.error('Failed to list products', { error: error.message });
    return sendServerError(res, 'Failed to retrieve products');
  }
};

/**
 * removeProduct — Deletes a single product by its MongoDB ID.
 * Expects { id } in the request body.
 */
const removeProduct = async (req, res) => {
  try {
    const { id } = req.body;

    const deleted = await productModel.findByIdAndDelete(id);

    if (!deleted) {
      return sendNotFound(res, 'Product not found');
    }

    logger.info('Product removed', { productId: id });
    return sendSuccess(res, {}, 'Product removed');
  } catch (error) {
    logger.error('Failed to remove product', { error: error.message });
    return sendServerError(res, 'Failed to remove product');
  }
};

/**
 * singleProduct — Fetches a single product by its MongoDB ID.
 * Expects { productId } in the request body.
 */
const singleProduct = async (req, res) => {
  try {
    const { productId } = req.body;

    const product = await productModel.findById(productId);

    if (!product) {
      return sendNotFound(res, 'Product not found');
    }

    return sendSuccess(res, { product }, 'Product retrieved');
  } catch (error) {
    logger.error('Failed to fetch single product', { error: error.message });
    return sendServerError(res, 'Failed to retrieve product');
  }
};

export { addProduct, listProduct, removeProduct, singleProduct };
