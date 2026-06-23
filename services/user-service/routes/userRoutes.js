import express from 'express';
import { loginUser, registerUser, adminLogin } from '../controllers/userController.js';

/** Express router for all user authentication endpoints. */
const router = express.Router();

router.post('/register', registerUser);
router.post('/login', loginUser);
router.post('/admin', adminLogin);

export default router;
