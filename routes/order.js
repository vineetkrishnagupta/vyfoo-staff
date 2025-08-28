const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const orderController = require('../controllers/orderController');

// POST /order - create a new order
router.post('/createorder', protect, orderController.createOrder);
// POST /order/afterOrderGenerateUpdateNewItem - update order with new items after order generation
router.post('/afterordergenerateupdatenewitem', protect, orderController.afterOrderGenerateUpdateNewItem);
// GET /order/liveorder - get live orders
router.get('/liveorder', protect, orderController.getLiveOrder);
router.get('/getorderdetails', protect, orderController.getOrderDetails);
router.post('/voidbill', protect, orderController.voidBillByTable);
router.post('/createorderfordeliveryandtakeaway', protect, orderController.generateOrderAndSaveBill);
router.get('/getorderitemsbyorderid', protect, orderController.getOrderItemsByOrderId);
router.patch('/updateliveorderaction', protect, orderController.updateLiveOrderAction);
router.patch('/applydiscount', protect, orderController.discountApply);
router.get('/getAllBillsToPrint', protect, orderController.getAllBillsToPrint);
router.put('/liveorderpartialpaidduepayment', protect, orderController.liveOrderDuePaymentSubmit);

module.exports = router;