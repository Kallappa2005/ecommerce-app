/**
 * productModel.js — Mongoose model for the Product collection.
 * Represents a single product with images (stored as S3 URLs), pricing, category, and sizes.
 */

import mongoose from 'mongoose';

/**
 * productSchema — Defines the shape of a product document in MongoDB.
 * The `image` field holds an array of S3 URLs uploaded during product creation.
 */
const productSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  description: {
    type: String,
    required: true,
  },
  price: {
    type: Number,
    required: true,
  },
  image: {
    type: Array,
    required: true,
  },
  category: {
    type: String,
    required: true,
  },
  subCategory: {
    type: String,
    required: true,
  },
  sizes: {
    type: Array,
    required: true,
  },
  bestseller: {
    type: Boolean,
  },
  date: {
    type: Number,
    required: true,
  },
});

const productModel =
  mongoose.models.product || mongoose.model('product', productSchema);

export default productModel;
