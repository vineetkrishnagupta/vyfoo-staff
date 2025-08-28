const express = require('express');
const authRoutes = require('./auth');
const productsRoutes = require('./products');
const kotRoutes = require('./kot');
const orderRouter = require('./order');
const paymentRouter = require('./payment');
const staffRouter = require('./staff');
const reportRouter = require('./report');
const eaterRouter = require('./eatersRouter');
const tableRouter = require('./table');
const splitBillRouter = require('./splitbillRouter'); // Importing the split bill routes
const alertifyRouter = require('./alertifyRouter'); // Importing the alertify routes


const router = express.Router();

// Health check route
router.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Server is running',
    timestamp: new Date().toISOString()
  });
});

// Mount routes
router.use('/auth', authRoutes);
router.use('/products', productsRoutes);
router.use('/kot', kotRoutes);
router.use('/order', orderRouter);
router.use('/payment', paymentRouter);
router.use('/staff', staffRouter);
router.use('/report', reportRouter);
router.use('/eaters', eaterRouter);
router.use('/table', tableRouter); // Importing the table routes
router.use('/splitbill', splitBillRouter); // Mounting the split bill routes
router.use('/alertify', alertifyRouter); // Mounting the alertify routes

module.exports = router; 