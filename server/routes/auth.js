import express from 'express';
import auth from '../middleware/auth.js';
import { getMe, login, signup } from '../controllers/authController.js';

const router = express.Router();

// @route   POST /api/auth/signup
// @desc    Register a new user
// @access  Public
router.post('/signup', signup);

// @route   POST /api/auth/login
// @desc    Authenticate user & get token
// @access  Public
router.post('/login', login);

// @route   GET /api/auth/me
// @desc    Get user profile data
// @access  Private
router.get('/me', auth, getMe);

export default router;
