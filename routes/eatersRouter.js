const express = require('express');
const { protect } = require('../middleware/auth');
const router = express.Router();

const { getEatersDetails, updateEaterDetails } = require('../controllers/eatersController');


// Get Eaters Details
router.get('/geteatersdetails', protect, getEatersDetails);
router.post('/updateeaterdetails', protect, updateEaterDetails);


module.exports = router;