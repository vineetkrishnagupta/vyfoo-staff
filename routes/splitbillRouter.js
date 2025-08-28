const express = require('express');
const router = express.Router();
const splitBillController = require('../controllers/splitBillController');
const { protect } = require('../middleware/auth');

router.get('/getorderitems/:table_id', protect, splitBillController.getOrderItems);
router.post('/createbill', protect, splitBillController.createSplitBill);
router.post('/getsplitbillitems', protect, splitBillController.getSplitBillItems);
router.post('/marksplitbillpaid', protect, splitBillController.markSplitBillAsPaid);
router.post('/cancellbill', protect, splitBillController.cancellBill);

module.exports = router;