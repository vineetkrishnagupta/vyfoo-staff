const express = require('express');
const { protect } = require('../middleware/auth');
const { updateLiveOrderAction } = require('../controllers/alertifyController');


const router = express.Router();

router.put('/updateLiveOrderAction', protect, updateLiveOrderAction);


module.exports = router; 

