const express = require('express');
const { protect } = require('../middleware/auth');
const { getAllProducts, getRealtimeTableData, GetAllProductsName } = require('../controllers/productsController');

const router = express.Router();

// Protected route to get all products
router.get('/all', protect, getAllProducts);
router.get('/realtimetabledata', protect, getRealtimeTableData);
router.get('/GetAllProductsName', protect, GetAllProductsName);

module.exports = router; 