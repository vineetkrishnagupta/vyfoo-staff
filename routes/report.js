const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');
const { protect } = require('../middleware/auth');


// router.get('/settled-unsettled-report-daily', protect, reportController.getSettledUnsettledReportDaily);
// router.get('/sales-report-daily', protect, reportController.getSalesReportDaily);
//===================================================== Report Routes Start===========================================================
router.get("/gstReport", protect, reportController.getGstReportDetails);
router.get("/salesReportDaily", protect, reportController.getSalesReportDaily);
router.get("/getItemsReportDetails", protect, reportController.getItemsReportDetails);
router.get("/orderReport", protect, reportController.getOrderReportDetails);
router.get("/customisedSalesReport", protect, reportController.getCustomisedSalesReport);
router.get("/getOrderCopounReportDetails", protect, reportController.getOrderCopounReportDetails);
router.get("/GetAllCouponCodeName", protect, reportController.GetAllCouponCodeName);

// router.get("/getDueAmount", protect, reportController.dueAmountReport);
router.get("/getSettledUnsettledReportDaily", protect, reportController.getSettledUnsettledReportLatest);





module.exports = router; 