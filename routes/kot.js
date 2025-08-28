const express = require('express');
const { protect } = require('../middleware/auth');
const { generateKOT, afterKotGenerateUpdateNewItem, removeItems, increaseItemQuantityAfterKotGenerate, decreaseItemQuantityAfterKotGenerate, kotDetails, getOrderKotDetails, updateKOTOrderAction } = require('../controllers/kotController');

const router = express.Router();

// Generate KOT
router.post('/generate', protect, generateKOT);
router.post('/afterkot-update-item', protect, afterKotGenerateUpdateNewItem);
// Remove items after KOT
router.post('/remove-item', protect, removeItems);

router.post('/increase-item-quantity', protect, increaseItemQuantityAfterKotGenerate);
router.post('/decrease-item-quantity', protect, decreaseItemQuantityAfterKotGenerate);

router.get('/get-today-kot', protect, kotDetails);

// Get KOT details
router.post('/get-order-kot', protect, getOrderKotDetails);

router.put('/updatekotstatus', protect, updateKOTOrderAction);

module.exports = router;

