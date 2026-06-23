import userModel from '../models/userModel.js';
import { sendSuccess, sendError, sendNotFound, sendServerError } from '../../shared/utils/responseHelper.js';
import { createLogger } from '../../shared/utils/logger.js';

const logger = createLogger('cart-service');

/**
 * Adds an item (by itemId and size) to the user's cart.
 * Increments quantity if the item+size combination already exists,
 * otherwise initialises it to 1.
 */
const addToCart = async (req, res) => {
  try {
    const { userId, itemId, size } = req.body;

    const user = await userModel.findById(userId);
    if (!user) {
      return sendNotFound(res, 'User not found');
    }

    // Clone to avoid direct mutation of mongoose document internals
    const cartData = structuredClone(user.cartData ?? {});

    if (cartData[itemId]) {
      if (cartData[itemId][size]) {
        cartData[itemId][size] += 1;
      } else {
        cartData[itemId][size] = 1;
      }
    } else {
      cartData[itemId] = { [size]: 1 };
    }

    await userModel.findByIdAndUpdate(userId, { cartData });

    logger.info('Item added to cart', { userId, itemId, size });
    return sendSuccess(res, { message: 'Added to Cart' });
  } catch (error) {
    logger.error('Error adding to cart', { error: error.message });
    return sendServerError(res, 'Failed to add item to cart');
  }
};

/**
 * Updates the quantity of a specific item+size combination in the user's cart.
 * A quantity of 0 effectively removes that size entry.
 */
const updateCart = async (req, res) => {
  try {
    const { userId, itemId, size, quantity } = req.body;

    const user = await userModel.findById(userId);
    if (!user) {
      return sendNotFound(res, 'User not found');
    }

    const cartData = structuredClone(user.cartData ?? {});

    if (!cartData[itemId]) {
      cartData[itemId] = {};
    }
    cartData[itemId][size] = quantity;

    await userModel.findByIdAndUpdate(userId, { cartData });

    logger.info('Cart updated', { userId, itemId, size, quantity });
    return sendSuccess(res, { message: 'Cart Updated' });
  } catch (error) {
    logger.error('Error updating cart', { error: error.message });
    return sendServerError(res, 'Failed to update cart');
  }
};

/**
 * Retrieves the full cartData object for the specified user.
 */
const getUserCart = async (req, res) => {
  try {
    const { userId } = req.body;

    const user = await userModel.findById(userId);
    if (!user) {
      return sendNotFound(res, 'User not found');
    }

    const cartData = user.cartData ?? {};

    logger.info('Cart fetched', { userId });
    return sendSuccess(res, { cartData });
  } catch (error) {
    logger.error('Error fetching cart', { error: error.message });
    return sendServerError(res, 'Failed to fetch cart');
  }
};

export { addToCart, updateCart, getUserCart };
