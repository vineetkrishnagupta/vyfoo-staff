const express = require('express');
const { body } = require('express-validator');
const { protect } = require('../middleware/auth');
const {
  login,
  getMe,
  logout
} = require('../controllers/authController');

const router = express.Router();

// Validation middleware
const loginValidation = [
  body('username')
    .notEmpty()
    .withMessage('Please enter a username'),
  body('password')
    // .isLength({ min: 6 })
    // .withMessage('Password must be at least 6 characters long')
    .exists()
    .withMessage('Password is required')
];

// Routes
router.post('/login', loginValidation, login);
router.get('/me', protect, getMe);
router.post('/logout', protect, logout);

module.exports = router; 