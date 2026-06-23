import jwt from 'jsonwebtoken';

/**
 * Signs and returns a JWT token containing the user's MongoDB ObjectId.
 * The token is signed with the JWT_SECRET environment variable.
 */
const createToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET);
};

export { createToken };
