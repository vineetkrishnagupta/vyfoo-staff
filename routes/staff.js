const express = require('express');
const router = express.Router();
const staffController = require('../controllers/staffController');
const { protect } = require('../middleware/auth');

// POST /staff/details - get staff details by pass_code
router.post('/details', protect, staffController.getStaffDetails);

module.exports = router; 