import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';

// Helper to sign JWT
const signToken = (user) => {
  return jwt.sign(
    { id: user._id, name: user.name, email: user.email },
    process.env.JWT_SECRET || 'ruta_secret_key',
    { expiresIn: '7d' }
  );
};

export const signup = async (req, res) => {
  const { name, email, password } = req.body;

  // Simple validation
  if (!name || !email || !password) {
    return res.status(400).json({ msg: 'Please enter all fields' });
  }

  if (password.length < 6) {
    return res.status(400).json({ msg: 'Password must be at least 6 characters long' });
  }

  try {
    // Check for existing user
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ msg: 'User already exists' });
    }

    // Create new user instance
    const newUser = new User({
      name,
      email,
      password,
    });

    // Hash password
    const salt = await bcrypt.genSalt(10);
    newUser.password = await bcrypt.hash(password, salt);

    // Save user
    const savedUser = await newUser.save();

    // Create token
    const token = signToken(savedUser);

    return res.status(201).json({
      token,
      user: {
        id: savedUser._id,
        name: savedUser.name,
        email: savedUser.email,
      },
    });
  } catch (err) {
    console.error('Signup error:', err);
    return res.status(500).json({ msg: 'Server error during registration' });
  }
};

export const login = async (req, res) => {
  const { email, password } = req.body;

  // Simple validation
  if (!email || !password) {
    return res.status(400).json({ msg: 'Please enter all fields' });
  }

  try {
    // Check for user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ msg: 'Invalid credentials' });
    }

    // Validate password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ msg: 'Invalid credentials' });
    }

    // Create token
    const token = signToken(user);

    return res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
      },
    });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ msg: 'Server error during login' });
  }
};

export const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) {
      return res.status(404).json({ msg: 'User not found' });
    }
    return res.json(user);
  } catch (err) {
    console.error('Get profile error:', err);
    return res.status(500).json({ msg: 'Server error fetching user profile' });
  }
};
