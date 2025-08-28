const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const tableController = require('../controllers/tablecontroller');


// router.put("/switchTablePos",protect, tableController.switchTablePos);
// router.put("/switchtablekotupdate", protect,tableController.switchTableKOTUpdate);
// router.post("/switchtablefromtableview", protect, tableController.switchTableFromTableView);



router.post('/refreshtableitems', protect, tableController.getTableItemsrefresh);
router.post("/switchtablefromtableview", protect, tableController.switchTableFromTableView);
router.put("/switchtable", protect, tableController.switchTable);




module.exports = router; 