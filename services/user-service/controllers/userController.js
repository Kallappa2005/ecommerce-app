import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import validator from 'validator';
import userModel from '../models/userModel.js';
import { createToken } from '../services/authService.js';
import { publishUserRegistered } from '../services/eventPublisher.js';
import { sendSuccess, sendError } from '../../../shared/utils/responseHelper.js';
import { asyncHandler } from '../../../shared/utils/errorHandler.js';

/**
 * Authenticates an existing user by email and password, returning a signed JWT
 * on success or a descriptive error when credentials are invalid.
 */
const loginUser = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const user = await userModel.findOne({ email });
  if (!user) {
    return sendError(res, 'User does not exist', 404);
  }

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    return sendError(res, 'Invalid credentials', 401);
  }

  const token = createToken(user._id);
  return sendSuccess(res, { token }, 'Login successful');
});

/**
 * Registers a new user account after validating the email format and
 * password strength, then publishes a USER_REGISTERED event.
 */
const registerUser = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;

  const exists = await userModel.findOne({ email });
  if (exists) {
    return sendError(res, 'User already exists', 409);
  }

  if (!validator.isEmail(email)) {
    return sendError(res, 'Please enter a valid email address', 400);
  }

  if (password.length < 8) {
    return sendError(res, 'Password must be at least 8 characters long', 400);
  }

  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(password, salt);

  const newUser = new userModel({ name, email, password: hashedPassword });
  const user = await newUser.save();

  const token = createToken(user._id);

  await publishUserRegistered({ name, email });

  return sendSuccess(res, { token }, 'Registration successful', 201);
});

/**
 * Validates hardcoded admin credentials from environment variables
 * and issues a JWT on success.
 */
const adminLogin = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (
    email === process.env.ADMIN_EMAIL &&
    password === process.env.ADMIN_PASSWORD
  ) {
    const token = jwt.sign(email + password, process.env.JWT_SECRET);
    return sendSuccess(res, { token }, 'Admin login successful');
  }

  return sendError(res, 'Invalid admin credentials', 401);
});

export { loginUser, registerUser, adminLogin };
