const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const paymentController = require('../controllers/paymentController');

// POST /payment - create a new payment (partial/settle)
router.post('/partialpaymentfordinein', protect, paymentController.partialPaymentForDineIn);
router.post('/holdpaymentfordinein', protect, paymentController.posPaymentDetailsUpdateForDineIn);


// router.post('/posCashPaymentDetailsUpdateForDelivaryAndPickUp', protect, paymentController.posCashPaymentDetailsUpdateForDelivaryAndPickUp);
router.post('/posPaymentForDelivaryAndPickUp', protect, paymentController.updateOrderPayment);
router.post('/holdpaymentforcounteranddelivery', protect, paymentController.holdPaymentForExistingOrderCounterAndDelivery);


module.exports = router; 