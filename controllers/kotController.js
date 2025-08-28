// const config = require('../config.json');
const pool = require('../config/db');
const db = require('../config/db');
const { getTableItems } = require('../utils/getTableItems');
const socketManager = require('../socketManager');
// const { v4: uuidv4 } = require('uuid');

// Helper for unique KOT number (adapted from reference)
async function generateUniqueAlphanumericID(length, connection) {
  function generateAlphanumericID(length) {
    let characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    let charactersLength = characters.length;
    for (let i = 0; i < length; i++) {
      result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return result;
  }
  const kot_unique_number = generateAlphanumericID(length);
  const [existingRecords] = await connection.query(
    'SELECT kot_unique_number FROM fooders_kot WHERE kot_unique_number = ?',
    [kot_unique_number]
  );
  if (existingRecords.length === 0) {
    return kot_unique_number;
  } else {
    return generateUniqueAlphanumericID(length, connection);
  }
}

// Function to update order amounts after KOT generation and change qty
const updateOrderAmount = async (fooderId, orderId, connection) => {
  const [orderItems] = await connection.query(
    "SELECT id, order_id, quantity, product_price, product_proprice, item_tax_type, item_tax_percent, packaging_fee FROM order_items WHERE fooder_id = ? AND order_id = ? AND is_cancelled = 0", [fooderId, orderId]
  );


  const [[order]] = await connection.query("SELECT * from orders WHERE id = ? AND fooder_id = ?", [orderId, fooderId]);
  const serviceChargeDetails = JSON.parse(order.service_charge_details);

  if (!serviceChargeDetails.percentage) {
    serviceChargeDetails.percentage = 0
  }

  let withOutTaxPrice = 0
  let subTotal = 0;
  let tempDiscount = 0;
  let tempDiscountRow = 0;


  let tempServicCharge = 0;
  let tempServicChargeRow = 0;

  let tempTax = 0;
  let packingCharges = 0;

  let withOutTaxPriceForAmount = 0
  let subTotalForAmount = 0;
  let discountRateForAmount = 0;




  if (order.discount_type === 1) {
    orderItems.forEach((i) => {
      if (i.product_proprice) {
        withOutTaxPriceForAmount = parseInt(i.item_tax_type) === 0 ? parseFloat(i.product_proprice) : (parseFloat(i.product_proprice) * parseFloat(100)) / (parseFloat(100) + parseFloat(i.item_tax_percent))
      } else {
        withOutTaxPriceForAmount = parseInt(i.item_tax_type) === 0 ? parseFloat(i.product_price) : (parseFloat(i.product_price) * parseFloat(100)) / (parseFloat(100) + parseFloat(i.item_tax_percent))
      }
      subTotalForAmount += (i.quantity) * withOutTaxPriceForAmount
    })
    discountRateForAmount = (parseFloat(order.discount_rate) * 100) / subTotalForAmount
  }
  // end


  orderItems.forEach((i) => {
    packingCharges += i.quantity * parseFloat(i.packaging_fee)
    if (i.product_proprice) {
      withOutTaxPrice = parseInt(i.item_tax_type) === 0 ? parseFloat(i.product_proprice) : (parseFloat(i.product_proprice) * parseFloat(100)) / (parseFloat(100) + parseFloat(i.item_tax_percent))
    } else {
      withOutTaxPrice = parseInt(i.item_tax_type) === 0 ? parseFloat(i.product_price) : (parseFloat(i.product_price) * parseFloat(100)) / (parseFloat(100) + parseFloat(i.item_tax_percent))
    }
    subTotal += (i.quantity) * withOutTaxPrice
    if (order.discount_type === 0) {
      tempDiscount += (((i.quantity) * withOutTaxPrice) * parseFloat(order.discount_rate)) / 100
      tempDiscountRow = (((i.quantity) * withOutTaxPrice) * parseFloat(order.discount_rate)) / 100
    } else {
      tempDiscount += (((i.quantity) * withOutTaxPrice) * parseFloat(discountRateForAmount)) / 100
      tempDiscountRow = (((i.quantity) * withOutTaxPrice) * parseFloat(discountRateForAmount)) / 100
    }
    tempServicCharge += ((((i.quantity) * withOutTaxPrice) - tempDiscountRow) * parseFloat(serviceChargeDetails.percentage)) / 100
    tempServicChargeRow = ((((i.quantity) * withOutTaxPrice) - tempDiscountRow) * parseFloat(serviceChargeDetails.percentage)) / 100
    tempTax += ((((i.quantity) * withOutTaxPrice) + tempServicChargeRow - tempDiscountRow) * parseFloat(i.item_tax_percent)) / 100
  })


  var grandTotal = 0
  if (order.order_type != "dine_in") {
    grandTotal = (parseFloat(subTotal + tempServicCharge - tempDiscount + tempTax) + parseFloat(packingCharges) + order.round_up_amount).toFixed(2)
  } else {
    grandTotal = (subTotal + tempServicCharge - tempDiscount + tempTax + order.round_up_amount).toFixed(2);
  }

  await connection.query("UPDATE orders SET subtotal = ?, service_charge = ?, tax_amount = ?, total = ?  WHERE id = ? AND fooder_id = ?",
    [subTotal, tempServicCharge, tempTax, grandTotal, orderId, fooderId]);








  return true;
};

// exports.generateKOT = async (req, res) => {
//   let kot_details, all_kots, connection, kot_no, kot_unique_number, kot_prefix, fooder_id, today_date, time, status, tableId, staffDetails;
//   try {
//     kot_details = req.body;
//     all_kots = req.body[0].all_kots;
//     staffDetails = req.body[0].staffDetails; // get staffDetails from frontend
//     kot_details.forEach((item) => {
//       if (item.order_type === 'DINE IN') item.order_type = 'dine_in';
//       else if (item.order_type === 'TAKE AWAY') item.order_type = 'take_away';
//       else if (item.order_type === 'DELIVERY') item.order_type = 'delivery';
//     });
//     connection = await pool.getConnection();
//     kot_unique_number = await generateUniqueAlphanumericID(12, connection);
//     kot_prefix = 'KOT';
//     fooder_id = req.staff.fooder_id;
//     today_date = new Date().toISOString().slice(0, 10);
//     time = Math.floor(Date.now() / 1000);
//     status = 0;
//     tableId = kot_details[0].table_id;

//     // validation check if tableId is valid
//     // Only validate tableId for DINE IN orders
//     if (kot_details[0].order_type === 'dine_in') {
//       if (!tableId) {
//       connection.release();
//       return res.status(400).send({ status: 'fail', message: 'Invalid table ID for DINE IN order' });
//       }
//     }

//     // Check if all kot_details products exist in fooders_products for this fooder
//     const productIds = kot_details.map(item => item.product_id);
//     if (productIds.length > 0) {
//       const [products] = await connection.query(
//         `SELECT id FROM fooders_products WHERE fooder_id = ? AND id IN (?)`,
//         [fooder_id, productIds]
//       );
//       const foundIds = products.map(p => p.id);
//       const missingIds = productIds.filter(id => !foundIds.includes(id));
//       if (missingIds.length > 0) {
//         connection.release();
//         return res.status(401).send({
//           status: 'fail',
//           message: `Some products do not exist for this fooder: ${missingIds.join(', ')}`
//         });
//       }
//     }
//   } catch (error) {
//     if (connection) connection.release();
//     return res.status(500).json({ message: 'Error initializing KOT data', errors: error.toString() });
//   }
//   try {
//     if (all_kots.length <= 0) {
//       const tableCommittedSql = `SELECT COUNT(*) as is_booked FROM fooders_tables WHERE id = ? and is_booked  = 1 and fooder_id = ?;`;
//       const [[order_committed_results]] = await connection.query(tableCommittedSql, [kot_details[0].table_id, fooder_id]);
//       if (order_committed_results.is_booked != 0) {
//         connection.release();
//         return res.status(400).send({ status: 'fail', message: 'Table already Booked!!!' });
//       }
//     }
//     if (kot_details.length > 0 && kot_details[0].order_id) {
//       const [ordersRes] = await connection.query(
//         'SELECT payment_status, is_cancelled FROM orders WHERE id = ?',
//         [kot_details[0].order_id]
//       );
//       if (ordersRes.length > 0) {
//         if (ordersRes[0].payment_status != 0) {
//           connection.release();
//           return res.status(400).send({ status: 'fail', message: 'Order already paid, So you can\'t add more items' });
//         }
//         if (ordersRes[0].is_cancelled != 0) {
//           connection.release();
//           return res.status(400).send({ status: 'fail', message: 'Order already cancelled!!!' });
//         }
//       }
//     }
//     // Only insert booked_by if all_kots is empty and after all validations
//     if (all_kots.length <= 0 && staffDetails && tableId) {
//       console.log("Inserting booked_by for table:", tableId);
//       await connection.query(
//         "UPDATE `fooders_tables` SET `booked_by` = ? WHERE `id` = ? AND `fooder_id` = ?",
//         [JSON.stringify(staffDetails), tableId, req.staff.fooder_id]
//       );
//     }
//     const [KOTExists] = await connection.query(
//       'SELECT * FROM `fooders_kot` WHERE `fooder_id` = ? AND `kot_date` = ?',
//       [fooder_id, today_date]
//     );
//     if (KOTExists.length > 0) {
//       const [maxIdResult] = await connection.query(
//         'SELECT MAX(`kot_number`) AS max_id FROM `fooders_kot` WHERE `fooder_id` = ? AND `kot_date` = ?',
//         [fooder_id, today_date]
//       );
//       const max_id = maxIdResult[0].max_id || 0;
//       kot_no = max_id + 1;
//     } else {
//       kot_no = 1;
//     }
//     const [generateKot] = await connection.query(
//       'insert into fooders_kot (fooder_id,kot_number,kot_date,kot_prefix,kot_unique_number,kot_details,status,table_id,created_date,ip,created_by) values(?,?,?,?,?,?,?,?,?,?,?)',
//       [
//         fooder_id,
//         kot_no,
//         today_date,
//         kot_prefix,
//         kot_unique_number,
//         JSON.stringify(kot_details),
//         status,
//         tableId,
//         time,
//         req.ipAddress,
//         staffDetails ? JSON.stringify(staffDetails) : null // insert staffDetails as JSON
//       ]
//     );
//     if (generateKot) {
//       await connection.query('UPDATE fooders_tables SET is_booked = 1 WHERE id = ? and fooder_id = ?', [kot_details[0].table_id, fooder_id]);
//       // check if order generated or not on that table
//       if (!kot_details[0].order_id) {
//         // Order is not generated, you can perform actions related to the order here
//         console.log(`No Order ID is associated with the KOT. Means order is not generated.`);
//         // get refresh data from getTableItems function
//         const tableItems = await getTableItems(connection, fooder_id, kot_details[0].table_id);
//         // Emit to fooder room
//         const fooderID = req.staff.fooder_id;
//         const event = 'kot-update';
//         const data = {
//           message: `KOT generated successfully for table ${kot_details[0].table_id}`,
//           fooderID: fooderID,
//           tableItems: tableItems,
//           tableId: kot_details[0].table_id,
//           // kot_no: `${kot_prefix}-${kot_no}`,
//           // kot_id: generateKot.insertId,
//           // kot_unique_number: kot_unique_number,
//           // kot_details: kot_details,
//           staffDetails: staffDetails // include staff details in the data
//         };
//         // Emit to fooder room
//         socketManager.emitToFooder(fooderID, event, data);
//       }
//       connection.release();
//       return res.status(200).send({
//         status: 'success',
//         message: 'KOT generate successfully!!!',
//         id: generateKot.insertId,
//         KOT_no: `${kot_prefix}-${kot_no}`,
//       });
//     } else {
//       if (connection) connection.release();
//       return res.status(400).send({ status: 'fail', message: 'something went wrong' });
//     }
//   } catch (error) {
//     if (connection) connection.release();
//     console.log(error)
//     res.status(500).json({ message: 'Internal server error', errors: error.toString() });
//   }
// };


exports.generateKOT = async (req, res) => {
  let kot_details, all_kots, connection, kot_no, kot_unique_number, kot_prefix, fooder_id, today_date, time, status, tableId, staffDetails;
  try {
    kot_details = req.body;
    all_kots = req.body[0].all_kots || []; // Ensure all_kots is always an array
    staffDetails = req.body[0].staffDetails;

    const orderType = kot_details[0].order_type;
    // Convert order types to lowercase
    kot_details.forEach((item) => {
      if (item.order_type === 'DINE IN') item.order_type = 'dine_in';
      else if (item.order_type === 'TAKE AWAY') item.order_type = 'take_away';
      else if (item.order_type === 'DELIVERY') item.order_type = 'delivery';
    });


    connection = await pool.getConnection();
    kot_unique_number = await generateUniqueAlphanumericID(12, connection);
    kot_prefix = 'KOT';
    fooder_id = req.staff.fooder_id;
    today_date = new Date().toISOString().slice(0, 10);
    time = Math.floor(Date.now() / 1000);
    status = 0;
    tableId = kot_details[0].table_id;

    // Validation for DINE IN orders
    if (kot_details[0].order_type === 'dine_in') {
      if (!tableId) {
        connection.release();
        return res.status(400).send({ status: 'fail', message: 'Invalid table ID for DINE IN order' });
      }

      // Get current table items from database
      const tableItemsToverify = await getTableItems(connection, fooder_id, kot_details[0].table_id);

      // console.log(tableItemsToverify);
      // Enhanced KOT validation logic
      if (tableItemsToverify.items.length >= 0) {
        // Create map of KOT IDs and their item counts from frontend
        const frontendKotMap = {};
        all_kots.forEach(kotId => {
          frontendKotMap[kotId] = (frontendKotMap[kotId] || 0) + 1;
        });

        // Create map of KOT IDs and their item counts from database
        const dbKotMap = {};
        tableItemsToverify.items.forEach(item => {
          if (item.KOT_id) {
            dbKotMap[item.KOT_id] = (dbKotMap[item.KOT_id] || 0) + 1;
          }
        });

        // Check 1: All KOTs in frontend must exist in database with same item count
        for (const kotId in frontendKotMap) {
          if (!dbKotMap[kotId] || dbKotMap[kotId] !== frontendKotMap[kotId]) {
            connection.release();
            return res.status(400).send({
              status: 'fail',
              message: 'Cart outdated. KOT items do not match server data. Please refresh the page.',
              details: {
                kotId: kotId,
                frontendCount: frontendKotMap[kotId],
                databaseCount: dbKotMap[kotId] || 0
              }
            });
          }
        }

        // Check 2: All KOTs in database must exist in frontend
        for (const kotId in dbKotMap) {
          if (!frontendKotMap[kotId]) {
            connection.release();
            return res.status(400).send({
              status: 'fail',
              message: 'Cart outdated. Please refresh the page.',
              details: {
                pendingKotId: kotId,
                itemCount: dbKotMap[kotId]
              }
            });
          }
        }

        // Additional check for order_id consistency
        if (kot_details[0].order_id && tableItemsToverify.is_kot_only_committed) {
          connection.release();
          return res.status(400).send({
            status: 'fail',
            message: 'Order exists but table has KOT-only items. Please refresh the page.'
          });
        }
      }
    }

    // Product validation
    const productIds = kot_details.map(item => item.product_id);
    if (productIds.length > 0) {
      const [products] = await connection.query(
        `SELECT id FROM fooders_products WHERE fooder_id = ? AND id IN (?)`,
        [fooder_id, productIds]
      );
      const foundIds = products.map(p => p.id);
      const missingIds = productIds.filter(id => !foundIds.includes(id));
      if (missingIds.length > 0) {
        connection.release();
        return res.status(401).send({
          status: 'fail',
          message: `Some products do not exist for this fooder: ${missingIds.join(', ')}`
        });
      }
    }

    // Table booking validation
    if (all_kots.length <= 0) {
      const [[order_committed_results]] = await connection.query(
        `SELECT COUNT(*) as is_booked FROM fooders_tables WHERE id = ? and is_booked = 1 and fooder_id = ?;`,
        [kot_details[0].table_id, fooder_id]
      );
      if (order_committed_results.is_booked != 0) {
        connection.release();
        return res.status(400).send({ status: 'fail', message: 'Table already Booked!!!' });
      }
    }

    // Order validation
    if (kot_details.length > 0 && kot_details[0].order_id) {
      const [ordersRes] = await connection.query(
        'SELECT payment_status, is_cancelled FROM orders WHERE id = ?',
        [kot_details[0].order_id]
      );
      if (ordersRes.length > 0) {
        if (ordersRes[0].payment_status != 0) {
          connection.release();
          return res.status(400).send({ status: 'fail', message: 'Order already paid, So you can\'t add more items' });
        }
        if (ordersRes[0].is_cancelled != 0) {
          connection.release();
          return res.status(400).send({ status: 'fail', message: 'Order already cancelled!!!' });
        }
      }
    }

    // Set booked_by if needed
    if (all_kots.length <= 0 && staffDetails && tableId) {
      await connection.query(
        "UPDATE `fooders_tables` SET `booked_by` = ? WHERE `id` = ? AND `fooder_id` = ?",
        [JSON.stringify(staffDetails), tableId, req.staff.fooder_id]
      );
    }

    // Generate KOT number
    const [KOTExists] = await connection.query(
      'SELECT * FROM `fooders_kot` WHERE `fooder_id` = ? AND `kot_date` = ?',
      [fooder_id, today_date]
    );
    kot_no = KOTExists.length > 0 ? 
      ((await connection.query('SELECT MAX(`kot_number`) AS max_id FROM `fooders_kot` WHERE `fooder_id` = ? AND `kot_date` = ?',
        [fooder_id, today_date]))[0][0].max_id || 0) + 1 : 1;

    // Insert KOT
    const [generateKot] = await connection.query(
      'INSERT INTO fooders_kot (fooder_id,kot_number,kot_date,kot_prefix,kot_unique_number,kot_details,status,table_id,created_date,ip,created_by) VALUES (?,?,?,?,?,?,?,?,?,?,?)',
      [
        fooder_id,
        kot_no,
        today_date,
        kot_prefix,
        kot_unique_number,
        JSON.stringify(kot_details),
        status,
        tableId,
        time,
        req.ipAddress,
        staffDetails ? JSON.stringify(staffDetails) : null
      ]
    );

    if (generateKot) {
      await connection.query('UPDATE fooders_tables SET is_booked = 1 WHERE id = ? and fooder_id = ?', 
        [kot_details[0].table_id, fooder_id]);

      if (orderType === "DINE IN" && !kot_details[0].order_id) {
        const tableItems = await getTableItems(connection, fooder_id, kot_details[0].table_id);
        socketManager.emitToFooder(req.staff.fooder_id, 'kot-update', {
          message: `KOT generated for table ${kot_details[0].table_id}`,
          fooderID: req.staff.fooder_id,
          tableItems: tableItems,
          tableId: kot_details[0].table_id,
          staffDetails: staffDetails
        });
      }

      const [tableDetails] = await connection.query(
      `select type,table_no,table_name from fooders_tables where id = ?`,
      [kot_details[0].table_id]
    );

    let table_no;
    if (tableDetails.length > 0) {
      const type = tableDetails[0].type;
      if (type === 0 || type === 2) {
        if (tableDetails[0].table_name) {
          table_no = `${tableDetails[0].table_name}-${tableDetails[0].table_no}`;
        } else {
          table_no = `Table No - ${tableDetails[0].table_no}`;
        }
      } else {
        table_no = `${tableDetails[0].table_no}`;
      }
    }

      connection.release();
      return res.status(200).send({
        status: 'success',
        message: 'KOT generated successfully!!!',
        id: generateKot.insertId,
        KOT_no: `${kot_prefix}-${kot_no}`,
        table_no: table_no,
        orderType: orderType,
      });
    } else {
      connection.release();
      return res.status(400).send({ status: 'fail', message: 'Failed to generate KOT' });
    }
  } catch (error) {
    if (connection) connection.release();
    console.error('KOT generation error:', error);
    res.status(500).json({ message: 'Internal server error', errors: error.toString() });
  }
};


exports.increaseItemQuantityAfterKotGenerate = async (req, res) => {
  const { id, product_id, is_bill, local_id, newQuantity, orderId, tableId } = req.body;
  // console.log(`Increase Item Quantity: id=${id}, product_id=${product_id}, local_id=${local_id}, orderId=${orderId}, is_bill=${is_bill} tableId=${tableId} newQuantity=${newQuantity}`);
  const connection = await pool.getConnection();
  try {
    if (orderId) {
      const [ordersRes] = await connection.query(
        "SELECT payment_status, is_cancelled FROM orders WHERE id = ?",
        [orderId]
      );
      if (ordersRes.length > 0) {
        if (ordersRes[0].payment_status != 0) {
          connection.release();
          return res.status(400).send({ status: "fail", message: "Order already paid" });
        }
        if (ordersRes[0].is_cancelled != 0) {
          connection.release();
          return res.status(400).send({ status: "fail", message: "Order already cancelled!!!" });
        }
      }
    }
    const [kotResult] = await connection.query(
      "SELECT kot_details FROM fooders_kot WHERE id = ?",
      [id]
    );
    if (kotResult.length === 0) {
      connection.release();
      return res.status(404).send({ status: "fail", message: "KOT not found." });
    }
    const kotDetails = JSON.parse(kotResult[0].kot_details);
    let updated = false;
    kotDetails.forEach((item) => {
      // console.log(`Checking product_id: ${item.product_id}, local_id: ${item.local_id} against input product_id: ${product_id}, local_id: ${local_id}`);
      if (parseInt(item.product_id) == parseInt(product_id) && parseInt(item.local_id) == parseInt(local_id)) {
        item.quantity = parseInt(item.quantity || 0) + 1;
        updated = true;
      }
    });
    if (!updated) {
      connection.release();
      return res.status(400).send({ status: "fail", message: `Product with ID ${product_id} not found in KOT.` });
    }
    const updateQuery = "UPDATE fooders_kot SET kot_details = ? WHERE id = ? AND fooder_id = ?";
    await connection.query(updateQuery, [JSON.stringify(kotDetails), id, req.staff.fooder_id]);
    if (orderId && is_bill) {
      await connection.query("UPDATE order_items SET quantity = ? WHERE order_id = ? AND local_time = ?  AND fooder_id = ?", [newQuantity, orderId, local_id, req.staff.fooder_id]);
      if (typeof updateOrderAmount === 'function') {
        await updateOrderAmount(req.staff.fooder_id, orderId, connection);
      }
    }
    connection.release();
    return res.status(200).send({ status: "success", message: "Quantity updated successfully." });
  } catch (error) {
    if (connection) connection.release();
    res.status(500).json({ message: "Internal server error", errors: error.toString() });
  }
};

exports.decreaseItemQuantityAfterKotGenerate = async (req, res) => {
  const { id, product_id, is_bill, local_id, newQuantity, orderId, tableId } = req.body;
  const connection = await pool.getConnection();
  try {
    if (orderId) {
      const [ordersRes] = await connection.query(
        "SELECT payment_status, is_cancelled FROM orders WHERE id = ?",
        [orderId]
      );
      if (ordersRes.length > 0) {
        if (ordersRes[0].payment_status != 0) {
          connection.release();
          return res.status(400).send({ status: "fail", message: "Order already paid" });
        }
        if (ordersRes[0].is_cancelled != 0) {
          connection.release();
          return res.status(400).send({ status: "fail", message: "Order already cancelled!!!" });
        }
      }
    }
    const [kotResult] = await connection.query(
      "SELECT kot_details FROM fooders_kot WHERE id = ?",
      [id]
    );
    if (kotResult.length === 0) {
      connection.release();
      return res.status(404).send({ status: "fail", message: "KOT not found." });
    }
    const kotDetails = JSON.parse(kotResult[0].kot_details);
    let updated = false;
    kotDetails.forEach((item) => {
      if (parseInt(item.product_id) == parseInt(product_id) && parseInt(item.local_id) == parseInt(local_id)) {
        if (parseInt(item.quantity || 0) > 1) {
          item.quantity = parseInt(item.quantity || 0) - 1;
          updated = true;
        } else {
          connection.release();
          return res.status(400).send({ status: "fail", message: `Quantity for product with ID ${product_id} is already 1. Cannot decrease further.` });
        }
      }
    });
    if (!updated) {
      connection.release();
      return res.status(400).send({ status: "fail", message: `Product with ID ${product_id} not found in KOT.` });
    }
    const updateQuery = "UPDATE fooders_kot SET kot_details = ? WHERE id = ? AND fooder_id = ?";
    await connection.query(updateQuery, [JSON.stringify(kotDetails), id, req.staff.fooder_id]);
    if (orderId && is_bill) {
      await connection.query("UPDATE order_items SET quantity = ? WHERE order_id = ? AND local_time = ?  AND fooder_id = ?", [newQuantity, orderId, local_id, req.staff.fooder_id]);
      if (typeof updateOrderAmount === 'function') {
        await updateOrderAmount(req.staff.fooder_id, orderId, connection);
      }
    }
    connection.release();
    return res.status(200).send({ status: "success", message: "Quantity updated successfully." });
  } catch (error) {
    if (connection) connection.release();
    res.status(500).json({ message: "Internal server error", errors: error.toString() });
  }
};

// soft delete items, order, kot error: dont remove kot items after order generated
// exports.removeItems = async (req, res) => {
//   const { kot_id, remove_item, orderId, is_bill, tableId, local_id, is_booked } = req.body;
//   const connection = await pool.getConnection();

//   try {
//     if (orderId) {
//       const [ordersRes] = await connection.query(
//         "SELECT payment_status, is_cancelled FROM orders WHERE id = ?",
//         [orderId]
//       );

//       if (ordersRes.length > 0) {
//         if (ordersRes[0].payment_status != 0) {
//           connection.release();
//           return res.status(400).send({
//             status: "fail",
//             message: "Order already paid",
//           });
//         }
//         if (ordersRes[0].is_cancelled != 0) {
//           connection.release();
//           return res.status(400).send({
//             status: "fail",
//             message: "Order already cancelled!!!",
//           });
//         }
//       }
//     }

//     // define table_id_value_get early so it can be reused everywhere
//   const table_id_value_get =
//     typeof tableId === 'object' && tableId !== null && 'id' in tableId
//       ? tableId.id
//       : tableId;

//     // Fetch the current remove_item and kot details from the database
//     const [fetchResult] = await connection.query(
//       "SELECT remove_items, kot_details FROM fooders_kot WHERE id = ?",
//       [kot_id]
//     );

//     const existingRemoveItems = JSON.parse(fetchResult[0].remove_items || "[]");
//     const existingItems = JSON.parse(fetchResult[0].kot_details || "[]");

//     // Add the new item to remove list
//     existingRemoveItems.push(remove_item);
//     const updatedRemoveItems = JSON.stringify(existingRemoveItems);

//     // Update remove_items in fooders_kot
//     const [updateResult] = await connection.query(
//       "UPDATE fooders_kot SET remove_items = ? WHERE id = ?",
//       [updatedRemoveItems, kot_id]
//     );

//     if (updateResult && updateResult.affectedRows === 0) {
//       connection.release();
//       return res.status(400).send({
//         status: "fail",
//         message: "Item not removed, something went wrong",
//       });
//     }

//     // If all items removed, mark KOT as cancelled
//     if (existingRemoveItems.length === existingItems.length) {
//       await connection.query(
//         "UPDATE fooders_kot SET is_cancelled = 1 WHERE id = ? AND fooder_id = ?",
//         [kot_id, req.staff.fooder_id]
//       );
//     }

//     // Unbook table if needed
//     if (is_booked === 0) {
//       const table_id_value = typeof tableId === 'object' && tableId !== null && 'id' in tableId ? tableId.id : tableId;
//       await connection.query(
//         `UPDATE fooders_tables SET is_booked = 0, booked_by = ? WHERE id = ? AND fooder_id = ?`,
//         [JSON.stringify({}), table_id_value, req.staff.fooder_id]
//       );
//     }

//     // Update order_items if billed
//     if (orderId && is_bill) {
//       await connection.query(
//         `UPDATE order_items SET item_kot_status = 4, is_cancelled = 1
//          WHERE order_id = ? AND product_id = ? AND fooder_id = ? AND local_time = ?`,
//         [orderId, remove_item.product_id, req.staff.fooder_id, local_id]
//       );

//       const [[itemCount]] = await connection.query(
//         `SELECT COUNT(*) AS count FROM order_items 
//          WHERE fooder_id = ? AND order_id = ? AND is_cancelled = 0`,
//         [req.staff.fooder_id, orderId]
//       );

//       if (itemCount.count === 0) {
//         const table_id_value_get = typeof tableId === 'object' && tableId !== null && 'id' in tableId ? tableId.id : tableId;
//         // Cancel the order (is_cancelled = 1)
//         await connection.query(
//           "UPDATE orders SET is_cancelled = 1 WHERE id = ? AND fooder_id = ?",
//           [orderId, req.staff.fooder_id]
//         );

//         await connection.query(
//           `UPDATE fooders_tables SET is_booked = 0, booked_by = ? WHERE id = ? AND fooder_id = ?`,
//           [JSON.stringify({}), table_id_value_get, req.staff.fooder_id]
//         );
//         const fooderID = req.staff.fooder_id;

//         // const tableItems = await getTableItems(connection, fooderID, table_id_value_get);

//         connection.release();
//          // Emit to fooder room
//         const event = 'kot_deleted';
//         const data = {
//         message: `KOT and order both deleted successfully`,
//         order: false, // indicate order is cancelled
//         fooderID: fooderID,
//         tableItems: [],
//         table_id: table_id_value_get,
//         // kot_no: `${kot_prefix}-${kot_no}`,
//         // kot_id: generateKot.insertId,
//         // kot_unique_number: kot_unique_number,
//         // kot_details: kot_details,
//         // staffDetails: staffDetails // include staff details in the data
//         };
//       // Emit to fooder room
//       // socketManager.emitToFooder(fooderID, event, data);

//         return res.status(200).send({
//           status: "success",
//           message: "Order Cancelled Successfully...",
//           code: "ORDER_CANCELLED"
//         });
//       } else {
//         if (typeof updateOrderAmount === 'function') {
//           await updateOrderAmount(req.staff.fooder_id, orderId, connection);
//         }
//       }
//     }


//     const fooderID = req.staff.fooder_id;

//         const tableItems = await getTableItems(connection, fooderID, table_id_value_get);

//         connection.release();
//          // Emit to fooder room
//         const event = 'kot_deleted';
//         const data = {
//         message: `KOT deleted successfully`,
//         order: true, // indicate order is not cancelled
//         fooderID: fooderID,
//         tableItems: tableItems,
//         table_id: table_id_value_get,
//         // kot_no: `${kot_prefix}-${kot_no}`,
//         // kot_id: generateKot.insertId,
//         // kot_unique_number: kot_unique_number,
//         // kot_details: kot_details,
//         // staffDetails: staffDetails // include staff details in the data
//         };
//       // Emit to fooder room
//       // socketManager.emitToFooder(fooderID, event, data);

//     // connection.release();
//     return res.status(200).send({
//       status: "success",
//       message: "Item removed successfully...",
//     });

//   } catch (error) {
//     console.log(error);
//     if (connection) {
//       connection.release();
//     }
//     res.status(500).json({
//       message: "Internal server error",
//       errors: error.toString(),
//     });
//   }
// };

// socket get datat even after all kot delete
// exports.removeItems = async (req, res) => {
//   const { kot_id, remove_item, orderId, is_bill, tableId, local_id, is_booked } = req.body;
//   const connection = await pool.getConnection();

//   try {
//     if (orderId) {
//       const [ordersRes] = await connection.query(
//         "SELECT payment_status, is_cancelled FROM orders WHERE id = ?",
//         [orderId]
//       );

//       if (ordersRes.length > 0) {
//         if (ordersRes[0].payment_status != 0) {
//           connection.release();
//           return res.status(400).send({
//             status: "fail",
//             message: "Order already paid",
//           });
//         }
//         if (ordersRes[0].is_cancelled != 0) {
//           connection.release();
//           return res.status(400).send({
//             status: "fail",
//             message: "Order already cancelled!!!",
//           });
//         }
//       }
//     }

//     // define table_id_value_get early so it can be reused everywhere
//     const table_id_value_get =
//       typeof tableId === "object" && tableId !== null && "id" in tableId
//         ? tableId.id
//         : tableId;

//     // Fetch the current remove_item and kot details from the database
//     const [fetchResult] = await connection.query(
//       "SELECT remove_items, kot_details FROM fooders_kot WHERE id = ?",
//       [kot_id]
//     );

//     const existingRemoveItems = JSON.parse(fetchResult[0].remove_items || "[]");
//     const existingItems = JSON.parse(fetchResult[0].kot_details || "[]");

//     // Ensure local_id is always stored as number in remove_items
//     const newRemoveItem = {
//       ...remove_item,
//       local_id: Number(remove_item.local_id)
//     };

//     // Add the new item to remove list
//     existingRemoveItems.push(newRemoveItem);
//     const updatedRemoveItems = JSON.stringify(existingRemoveItems);

//     // Update remove_items in fooders_kot
//     const [updateResult] = await connection.query(
//       "UPDATE fooders_kot SET remove_items = ? WHERE id = ?",
//       [updatedRemoveItems, kot_id]
//     );

//     if (updateResult && updateResult.affectedRows === 0) {
//       connection.release();
//       return res.status(400).send({
//         status: "fail",
//         message: "Item not removed, something went wrong",
//       });
//     }

//     // If all items removed, mark KOT as cancelled
//     if (existingRemoveItems.length === existingItems.length) {
//       await connection.query(
//         "UPDATE fooders_kot SET is_cancelled = 1 WHERE id = ? AND fooder_id = ?",
//         [kot_id, req.staff.fooder_id]
//       );
//     }

//     // Unbook table if needed
//     if (is_booked === 0) {
//       await connection.query(
//         `UPDATE fooders_tables SET is_booked = 0, booked_by = ? WHERE id = ? AND fooder_id = ?`,
//         [JSON.stringify({}), table_id_value_get, req.staff.fooder_id]
//       );
//     }

//     // Update order_items if billed
//     if (orderId && is_bill) {
//       await connection.query(
//         `UPDATE order_items SET item_kot_status = 4, is_cancelled = 1
//          WHERE order_id = ? AND product_id = ? AND fooder_id = ? AND local_time = ?`,
//         [
//           orderId,
//           remove_item.product_id,
//           req.staff.fooder_id,
//           Number(local_id) // ensure numeric comparison
//         ]
//       );

//       const [[itemCount]] = await connection.query(
//         `SELECT COUNT(*) AS count FROM order_items 
//          WHERE fooder_id = ? AND order_id = ? AND is_cancelled = 0`,
//         [req.staff.fooder_id, orderId]
//       );

//       if (itemCount.count === 0) {
//         // Cancel the order (is_cancelled = 1)
//         await connection.query(
//           "UPDATE orders SET is_cancelled = 1 WHERE id = ? AND fooder_id = ?",
//           [orderId, req.staff.fooder_id]
//         );

//         await connection.query(
//           `UPDATE fooders_tables SET is_booked = 0, booked_by = ? WHERE id = ? AND fooder_id = ?`,
//           [JSON.stringify({}), table_id_value_get, req.staff.fooder_id]
//         );

//         const fooderID = req.staff.fooder_id;
//         const event = "kot_deleted";
//         const data = {
//           message: `KOT and order both deleted successfully`,
//           order: false, // indicate order is cancelled
//           fooderID: fooderID,
//           tableItems: [],
//           table_id: table_id_value_get
//         };

//         socketManager.emitToFooder(fooderID, event, data);

//         connection.release();
//         return res.status(200).send({
//           status: "success",
//           message: "Order Cancelled Successfully...",
//           code: "ORDER_CANCELLED"
//         });
//       } else {
//         if (typeof updateOrderAmount === "function") {
//           await updateOrderAmount(req.staff.fooder_id, orderId, connection);
//         }
//       }
//     }

//     const fooderID = req.staff.fooder_id;
//     const tableItems = await getTableItems(connection, fooderID, table_id_value_get);

//     connection.release();

//     const event = "kot_deleted";
//     const data = {
//       message: `KOT deleted successfully`,
//       order: true, // indicate order is not cancelled
//       fooderID: fooderID,
//       tableItems: tableItems,
//       table_id: table_id_value_get
//     };

//     socketManager.emitToFooder(fooderID, event, data);

//     return res.status(200).send({
//       status: "success",
//       message: "Item removed successfully..."
//     });

//   } catch (error) {
//     console.log(error);
//     if (connection) {
//       connection.release();
//     }
//     res.status(500).json({
//       message: "Internal server error",
//       errors: error.toString(),
//     });
//   }
// };


// exports.removeItems = async (req, res) => {
//   const { kot_id, remove_item, orderId, is_bill, tableId, local_id, is_booked } = req.body;
//   const connection = await pool.getConnection();

//   try {
//     if (orderId) {
//       const [ordersRes] = await connection.query(
//         "SELECT payment_status, is_cancelled FROM orders WHERE id = ?",
//         [orderId]
//       );

//       if (ordersRes.length > 0) {
//         if (ordersRes[0].payment_status != 0) {
//           connection.release();
//           return res.status(400).send({
//             status: "fail",
//             message: "Order already paid",
//           });
//         }
//         if (ordersRes[0].is_cancelled != 0) {
//           connection.release();
//           return res.status(400).send({
//             status: "fail",
//             message: "Order already cancelled!!!",
//           });
//         }
//       }
//     }

//     // Table ID
//     const table_id_value_get =
//       typeof tableId === "object" && tableId !== null && "id" in tableId
//         ? tableId.id
//         : tableId;

//     // Fetch current KOT details
//     const [fetchResult] = await connection.query(
//       "SELECT remove_items, kot_details FROM fooders_kot WHERE id = ?",
//       [kot_id]
//     );

//     const existingRemoveItems = JSON.parse(fetchResult[0].remove_items || "[]");
//     const existingItems = JSON.parse(fetchResult[0].kot_details || "[]");

//     // Ensure local_id stored as number
//     const newRemoveItem = {
//       ...remove_item,
//       local_id: Number(remove_item.local_id)
//     };

//     // Add to remove list
//     existingRemoveItems.push(newRemoveItem);
//     const updatedRemoveItems = JSON.stringify(existingRemoveItems);

//     // Update KOT remove_items
//     const [updateResult] = await connection.query(
//       "UPDATE fooders_kot SET remove_items = ? WHERE id = ? AND fooder_id = ?",
//       [updatedRemoveItems, kot_id, req.staff.fooder_id]
//     );

//     if (updateResult && updateResult.affectedRows === 0) {
//       connection.release();
//       return res.status(400).send({
//         status: "fail",
//         message: "Item not removed, something went wrong",
//       });
//     }

//     // CASE: All KOT items removed
//     if (existingRemoveItems.length === existingItems.length) {
//       // Cancel KOT
//       await connection.query(
//         "UPDATE fooders_kot SET is_cancelled = 1 WHERE id = ? AND fooder_id = ?",
//         [kot_id, req.staff.fooder_id]
//       );

//       // Unbook table
//       await connection.query(
//         `UPDATE fooders_tables SET is_booked = 0, booked_by = ? WHERE id = ? AND fooder_id = ?`,
//         [JSON.stringify({}), table_id_value_get, req.staff.fooder_id]
//       );

//       // Cancel order if exists
//       if (orderId) {
//         await connection.query(
//           "UPDATE orders SET is_cancelled = 1 WHERE id = ? AND fooder_id = ?",
//           [orderId, req.staff.fooder_id]
//         );
//       }

//       // Emit socket
//       const fooderID = req.staff.fooder_id;
//       const event = "kot_deleted";
//       const data = {
//         message: `KOT and order both deleted successfully`,
//         order: false, // cancelled
//         fooderID: fooderID,
//         tableItems: [],
//         table_id: table_id_value_get
//       };

//       // socketManager.emitToFooder(fooderID, event, data);

//       connection.release();
//       return res.status(200).send({
//         status: "success",
//         message: "Order Cancelled Successfully...",
//         code: "ORDER_CANCELLED"
//       });
//     }

//     // CASE: Only part of the KOT removed
//     if (is_booked === 0) {
//       await connection.query(
//         `UPDATE fooders_tables SET is_booked = 0, booked_by = ? WHERE id = ? AND fooder_id = ?`,
//         [JSON.stringify({}), table_id_value_get, req.staff.fooder_id]
//       );
//     }

//     // If billed, update order_items
//     if (orderId && is_bill) {
//       await connection.query(
//         `UPDATE order_items SET item_kot_status = 4, is_cancelled = 1
//          WHERE order_id = ? AND product_id = ? AND fooder_id = ? AND local_time = ?`,
//         [
//           orderId,
//           remove_item.product_id,
//           req.staff.fooder_id,
//           Number(local_id)
//         ]
//       );

//       const [[itemCount]] = await connection.query(
//         `SELECT COUNT(*) AS count FROM order_items 
//          WHERE fooder_id = ? AND order_id = ? AND is_cancelled = 0`,
//         [req.staff.fooder_id, orderId]
//       );

//       if (itemCount.count === 0) {
//         // Cancel order & free table
//         await connection.query(
//           "UPDATE orders SET is_cancelled = 1 WHERE id = ? AND fooder_id = ?",
//           [orderId, req.staff.fooder_id]
//         );

//         await connection.query(
//           `UPDATE fooders_tables SET is_booked = 0, booked_by = ? WHERE id = ? AND fooder_id = ?`,
//           [JSON.stringify({}), table_id_value_get, req.staff.fooder_id]
//         );

//         const fooderID = req.staff.fooder_id;
//         const event = "kot_deleted";
//         const data = {
//           message: `KOT and order both deleted successfully`,
//           order: false,
//           fooderID: fooderID,
//           tableItems: [],
//           table_id: table_id_value_get
//         };

//         // socketManager.emitToFooder(fooderID, event, data);

//         connection.release();
//         return res.status(200).send({
//           status: "success",
//           message: "Order Cancelled Successfully...",
//           code: "ORDER_CANCELLED"
//         });
//       } else {
//         if (typeof updateOrderAmount === "function") {
//           await updateOrderAmount(req.staff.fooder_id, orderId, connection);
//         }
//       }
//     }

//     // Send updated table items if not fully cancelled
//     const fooderID = req.staff.fooder_id;
//     const tableItems = await getTableItems(connection, fooderID, table_id_value_get);

//     connection.release();

//     const event = "kot_deleted";
//     const data = {
//       message: `KOT deleted successfully`,
//       order: true, // not cancelled
//       fooderID: fooderID,
//       tableItems: tableItems,
//       table_id: table_id_value_get
//     };

//     // socketManager.emitToFooder(fooderID, event, data);

//     return res.status(200).send({
//       status: "success",
//       message: "Item removed successfully..."
//     });

//   } catch (error) {
//     console.log(error);
//     if (connection) {
//       connection.release();
//     }
//     res.status(500).json({
//       message: "Internal server error",
//       errors: error.toString(),
//     });
//   }
// };



// exports.removeItems = async (req, res) => {
//   const { kot_id, remove_item, orderId, is_bill, tableId, local_id, is_booked } = req.body;
//   const connection = await pool.getConnection();

//   try {
//     if (orderId) {
//       const [ordersRes] = await connection.query(
//         "SELECT payment_status, is_cancelled FROM orders WHERE id = ?",
//         [orderId]
//       );

//       if (ordersRes.length > 0) {
//         if (ordersRes[0].payment_status != 0) {
//           connection.release();
//           return res.status(400).send({
//             status: "fail",
//             message: "Order already paid",
//           });
//         }
//         if (ordersRes[0].is_cancelled != 0) {
//           connection.release();
//           return res.status(400).send({
//             status: "fail",
//             message: "Order already cancelled!!!",
//           });
//         }
//       }
//     }

//     // Table ID
//     const table_id_value_get =
//       typeof tableId === "object" && tableId !== null && "id" in tableId
//         ? tableId.id
//         : tableId;

//     // Fetch current KOT details
//     const [fetchResult] = await connection.query(
//       "SELECT remove_items, kot_details FROM fooders_kot WHERE id = ?",
//       [kot_id]
//     );

//     const existingRemoveItems = JSON.parse(fetchResult[0].remove_items || "[]");
//     const existingItems = JSON.parse(fetchResult[0].kot_details || "[]");

//     // Ensure local_id stored as number
//     const newRemoveItem = {
//       ...remove_item,
//       local_id: Number(remove_item.local_id)
//     };

//     // Add to remove list
//     existingRemoveItems.push(newRemoveItem);
//     const updatedRemoveItems = JSON.stringify(existingRemoveItems);

//     // Update KOT remove_items
//     const [updateResult] = await connection.query(
//       "UPDATE fooders_kot SET remove_items = ? WHERE id = ? AND fooder_id = ?",
//       [updatedRemoveItems, kot_id, req.staff.fooder_id]
//     );

//     if (updateResult && updateResult.affectedRows === 0) {
//       connection.release();
//       return res.status(400).send({
//         status: "fail",
//         message: "Item not removed, something went wrong",
//       });
//     }

//     // CASE: All KOT items removed
//     if (existingRemoveItems.length === existingItems.length) {
//       // Cancel KOT
//       await connection.query(
//         "UPDATE fooders_kot SET is_cancelled = 1 WHERE id = ? AND fooder_id = ?",
//         [kot_id, req.staff.fooder_id]
//       );

//       // Unbook table
//       // await connection.query(
//       //   `UPDATE fooders_tables SET is_booked = 0, booked_by = ? WHERE id = ? AND fooder_id = ?`,
//       //   [JSON.stringify({}), table_id_value_get, req.staff.fooder_id]
//       // );

//       // Cancel order if exists
//       // if (orderId) {
//       //   await connection.query(
//       //     "UPDATE orders SET is_cancelled = 1 WHERE id = ? AND fooder_id = ?",
//       //     [orderId, req.staff.fooder_id]
//       //   );
//       // }

//       // Emit socket
//       const fooderID = req.staff.fooder_id;
//       const event = "kot_deleted";
//       const data = {
//         message: `KOT and order both deleted successfully`,
//         order: false, // cancelled
//         fooderID: fooderID,
//         tableItems: [],
//         table_id: table_id_value_get
//       };

//       socketManager.emitToFooder(fooderID, event, data);

//       connection.release();
//       return res.status(200).send({
//         status: "success",
//         message: "KOT Cancelled Successfully...",
//         code: "ORDER_CANCELLED"
//       });
//     }

//     // CASE: Only part of the KOT removed
//     if (is_booked === 0) {
//       await connection.query(
//         `UPDATE fooders_tables SET is_booked = 0, booked_by = ? WHERE id = ? AND fooder_id = ?`,
//         [JSON.stringify({}), table_id_value_get, req.staff.fooder_id]
//       );
//     }

//     // If billed, update order_items
//     if (orderId && is_bill) {
//       await connection.query(
//         `UPDATE order_items SET item_kot_status = 4, is_cancelled = 1
//          WHERE order_id = ? AND product_id = ? AND fooder_id = ? AND local_time = ?`,
//         [
//           orderId,
//           remove_item.product_id,
//           req.staff.fooder_id,
//           Number(local_id)
//         ]
//       );

//       const [[itemCount]] = await connection.query(
//         `SELECT COUNT(*) AS count FROM order_items 
//          WHERE fooder_id = ? AND order_id = ? AND is_cancelled = 0`,
//         [req.staff.fooder_id, orderId]
//       );

//       if (itemCount.count === 0) {
//         // Cancel order & free table
//         await connection.query(
//           "UPDATE orders SET is_cancelled = 1 WHERE id = ? AND fooder_id = ?",
//           [orderId, req.staff.fooder_id]
//         );

//         await connection.query(
//           `UPDATE fooders_tables SET is_booked = 0, booked_by = ? WHERE id = ? AND fooder_id = ?`,
//           [JSON.stringify({}), table_id_value_get, req.staff.fooder_id]
//         );

//         const fooderID = req.staff.fooder_id;
//         const event = "kot_deleted";
//         const data = {
//           message: `KOT and order both deleted successfully`,
//           order: false,
//           fooderID: fooderID,
//           tableItems: [],
//           table_id: table_id_value_get
//         };

//         socketManager.emitToFooder(fooderID, event, data);

//         connection.release();
//         return res.status(200).send({
//           status: "success",
//           message: "Order Cancelled Successfully...",
//           code: "ORDER_CANCELLED"
//         });
//       } else {
//         if (typeof updateOrderAmount === "function") {
//           await updateOrderAmount(req.staff.fooder_id, orderId, connection);
//         }
//       }
//     }

//     // Send updated table items if not fully cancelled
//     const fooderID = req.staff.fooder_id;
//     const tableItems = await getTableItems(connection, fooderID, table_id_value_get);

//     connection.release();

//     const event = "kot_deleted";
//     const data = {
//       message: `KOT deleted successfully`,
//       order: true, // not cancelled
//       fooderID: fooderID,
//       tableItems: tableItems,
//       table_id: table_id_value_get
//     };

//     socketManager.emitToFooder(fooderID, event, data);

//     return res.status(200).send({
//       status: "success",
//       message: "Item removed successfully..."
//     });

//   } catch (error) {
//     console.log(error);
//     if (connection) {
//       connection.release();
//     }
//     res.status(500).json({
//       message: "Internal server error",
//       errors: error.toString(),
//     });
//   }
// };

// works but not set if all items in remove items and items are equal
// exports.removeItems = async (req, res) => {
//   const { kot_id, remove_item, orderId, is_bill, tableId, local_id, is_booked } = req.body;
//   const connection = await pool.getConnection();

//   try {
//     // Table ID safe extract
//     const table_id_value_get =
//       typeof tableId === "object" && tableId !== null && "id" in tableId
//         ? tableId.id
//         : tableId;

//     const fooderID = req.staff.fooder_id;

//     // Step 1: Fetch existing KOT details
//     const [[kotData]] = await connection.query(
//       "SELECT remove_items, kot_details FROM fooders_kot WHERE id = ? AND fooder_id = ?",
//       [kot_id, fooderID]
//     );

//     if (!kotData) {
//       connection.release();
//       return res.status(404).send({ status: "fail", message: "KOT not found" });
//     }

//     const existingRemoveItems = JSON.parse(kotData.remove_items || "[]");
//     const existingItems = JSON.parse(kotData.kot_details || "[]");

//     // Step 2: Add new removed item
//     const newRemoveItem = { ...remove_item, local_id: Number(remove_item.local_id) };
//     existingRemoveItems.push(newRemoveItem);

//     // Step 3: Update remove_items in KOT
//     await connection.query(
//       "UPDATE fooders_kot SET remove_items = ? WHERE id = ? AND fooder_id = ?",
//       [JSON.stringify(existingRemoveItems), kot_id, fooderID]
//     );

//     // -------------------------
//     // CASE 1: Order Generated
//     // -------------------------
//     if (orderId) {
//       // Cancel that item in order_items
//       await connection.query(
//         `UPDATE order_items SET is_cancelled = 1, item_kot_status = 4
//          WHERE order_id = ? AND product_id = ? AND fooder_id = ? AND local_time = ?`,
//         [orderId, remove_item.product_id, fooderID, Number(local_id)]
//       );

//       // Check if any active items remain
//       const [[itemCount]] = await connection.query(
//         `SELECT COUNT(*) AS count FROM order_items
//          WHERE order_id = ? AND fooder_id = ? AND is_cancelled = 0`,
//         [orderId, fooderID]
//       );

//       if (itemCount.count === 0) {
//         // Cancel order & free table
//         await connection.query(
//           "UPDATE orders SET is_cancelled = 1 WHERE id = ? AND fooder_id = ?",
//           [orderId, fooderID]
//         );
//         await connection.query(
//           `UPDATE fooders_tables SET is_booked = 0, booked_by = '{}' WHERE id = ? AND fooder_id = ?`,
//           [table_id_value_get, fooderID]
//         );

//         socketManager.emitToFooder(fooderID, "kot_deleted", {
//           message: "Order cancelled successfully",
//           order: false,
//           fooderID,
//           tableItems: [],
//           table_id: table_id_value_get
//         });

//         connection.release();
//         return res.status(200).send({ status: "success", code: "ORDER_CANCELLED" });
//       } else {
//         // Send updated table items
//         const tableItems = await getTableItems(connection, fooderID, table_id_value_get);
//         socketManager.emitToFooder(fooderID, "kot_deleted", {
//           message: "Item removed successfully",
//           order: true,
//           fooderID,
//           tableItems,
//           table_id: table_id_value_get
//         });
//       }
//     }

//     // -------------------------
//     // CASE 2: No Order Generated
//     // -------------------------
//     if (!orderId) {
//       const tableItems = await getTableItems(connection, fooderID, table_id_value_get);

//       if (!tableItems.items || tableItems.items.length === 0) {
//         await connection.query(
//           `UPDATE fooders_tables SET is_booked = 0, booked_by = '{}' WHERE id = ? AND fooder_id = ?`,
//           [table_id_value_get, fooderID]
//         );
//         socketManager.emitToFooder(fooderID, "kot_deleted", {
//           message: "All KOT removed, table freed",
//           order: false,
//           fooderID,
//           tableItems: [],
//           table_id: table_id_value_get
//         });
//       } else {
//         socketManager.emitToFooder(fooderID, "kot_deleted", {
//           message: "Item removed successfully",
//           order: true,
//           fooderID,
//           tableItems,
//           table_id: table_id_value_get
//         });
//       }
//     }

//     connection.release();
//     return res.status(200).send({ status: "success", message: "Item removed" });

//   } catch (error) {
//     console.error(error);
//     connection.release();
//     res.status(500).json({ status: "error", message: error.message });
//   }
// };

exports.removeItems = async (req, res) => {
  const { kot_id, remove_item, orderId, is_bill, tableId, local_id } = req.body;
  const connection = await pool.getConnection();

  try {
    const table_id_value_get =
      typeof tableId === "object" && tableId !== null && "id" in tableId
        ? tableId.id
        : tableId;

    const fooderID = req.staff.fooder_id;

    // Validate: If table_id is provided, check if KOT exists for that table
    if (table_id_value_get) {
      const [kotTableRows] = await connection.query(
        "SELECT id FROM fooders_kot WHERE id = ? AND fooder_id = ? AND JSON_EXTRACT(kot_details, '$[0].table_id') = ?",
        [kot_id, fooderID, table_id_value_get]
      );
      if (!kotTableRows || kotTableRows.length === 0) {
        connection.release();
        return res.status(400).send({
          status: "fail",
          message: "No KOT found for this table. Please refresh the page."
        });
      }
    }

    // If orderId exists, check if bill is split and payment status and is_cancelled
    if (orderId) {
      const [[orderRow]] = await connection.query(
        "SELECT is_split, payment_status, is_cancelled FROM orders WHERE id = ? AND fooder_id = ?",
        [orderId, fooderID]
      );
      if (orderRow && orderRow.is_split && parseInt(orderRow.is_split) !== 0) {
        connection.release();
        return res.status(400).send({
          status: "fail",
          message: "Cannot remove items after bill is splitted."
        });
      }
      if (orderRow && orderRow.payment_status !== 0) {
        connection.release();
        return res.status(400).send({
          status: "fail",
          message: "Payment settled for this order, you can't change items."
        });
      }
      if (orderRow && orderRow.is_cancelled && parseInt(orderRow.is_cancelled) === 1) {
        connection.release();
        return res.status(400).send({
          status: "fail",
          message: "Order is already cancelled."
        });
      }
    }

    // Step 1: Fetch existing KOT details and cancellation status
    const [[kotData]] = await connection.query(
      "SELECT remove_items, kot_details, is_cancelled FROM fooders_kot WHERE id = ? AND fooder_id = ?",
      [kot_id, fooderID]
    );

    if (!kotData) {
      connection.release();
      return res.status(404).send({ status: "fail", message: "KOT not found" });
    }

    // Validation: If KOT is already cancelled, show message
    if (kotData.is_cancelled && parseInt(kotData.is_cancelled) === 1) {
      connection.release();
      return res.status(400).send({ status: "fail", message: "KOT is already removed or cancelled." });
    }

    const existingRemoveItems = JSON.parse(kotData.remove_items || "[]");
    const existingItems = JSON.parse(kotData.kot_details || "[]");

    // Check if item is already in removed items (use both product_id and local_id)
    const isAlreadyRemoved = existingRemoveItems.some(
      i => Number(i.local_id) === Number(remove_item.local_id) && Number(i.product_id) === Number(remove_item.product_id)
    );
    if (isAlreadyRemoved) {
      connection.release();
      return res.status(400).send({ status: "fail", message: "KOT is already removed or cancelled." });
    }

    // Validation: If all items already removed, show message
    if (existingRemoveItems.length === existingItems.length) {
      connection.release();
      return res.status(400).send({ status: "fail", message: "KOT is already removed or cancelled." });
    }

    // Step 2: Add new removed item
    const newRemoveItem = { ...remove_item, local_id: Number(remove_item.local_id), product_id: Number(remove_item.product_id) };
    existingRemoveItems.push(newRemoveItem);

    // Step 3: Update remove_items in KOT
    await connection.query(
      "UPDATE fooders_kot SET remove_items = ? WHERE id = ? AND fooder_id = ?",
      [JSON.stringify(existingRemoveItems), kot_id, fooderID]
    );

    // Step 4: Cancel KOT if all items removed
    if (existingRemoveItems.length === existingItems.length) {
      await connection.query(
        "UPDATE fooders_kot SET is_cancelled = 1 WHERE id = ? AND fooder_id = ?",
        [kot_id, fooderID]
      );
    }

    // -------------------------
    // CASE 1: Order Generated
    // -------------------------
    if (orderId) {
      // Cancel that item in order_items
      await connection.query(
        `UPDATE order_items SET is_cancelled = 1
         WHERE order_id = ? AND product_id = ? AND fooder_id = ? AND local_time = ?`,
        [orderId, remove_item.product_id, fooderID, Number(local_id)]
      );

      // Check if any active items remain
      const [[itemCount]] = await connection.query(
        `SELECT COUNT(*) AS count FROM order_items
         WHERE order_id = ? AND fooder_id = ? AND is_cancelled = 0`,
        [orderId, fooderID]
      );

      if (itemCount.count === 0) {
        // Cancel order & free table
        await connection.query(
          "UPDATE orders SET is_cancelled = 1 WHERE id = ? AND fooder_id = ?",
          [orderId, fooderID]
        );
        await connection.query(
          `UPDATE fooders_tables SET is_booked = 0, booked_by = '{}' WHERE id = ? AND fooder_id = ?`,
          [table_id_value_get, fooderID]
        );

        socketManager.emitToFooder(fooderID, "kot_deleted", {
          message: "Order cancelled successfully",
          order: false,
          fooderID,
          tableItems: [],
          table_id: table_id_value_get
        });

        connection.release();
        return res.status(200).send({ status: "success", code: "ORDER_CANCELLED", message: "Item removed successfully" });
      } else {
        // Send updated table items
        const tableItems = await getTableItems(connection, fooderID, table_id_value_get);
        socketManager.emitToFooder(fooderID, "kot_deleted", {
          message: "Item removed successfully",
          order: true,
          fooderID,
          tableItems,
          table_id: table_id_value_get
        });
      }

      connection.release();
      return res.status(200).send({ status: "success", message: "Item removed" });
    }

    // -------------------------
    // CASE 2: No Order Generated
    // -------------------------
    if (!orderId) {
      const tableItems = await getTableItems(connection, fooderID, table_id_value_get);

      if (!tableItems.items || tableItems.items.length === 0) {
        await connection.query(
          `UPDATE fooders_tables SET is_booked = 0, booked_by = '{}' WHERE id = ? AND fooder_id = ?`,
          [table_id_value_get, fooderID]
        );
        socketManager.emitToFooder(fooderID, "kot_deleted", {
          message: "All KOT removed, table freed",
          order: false,
          fooderID,
          tableItems: [],
          table_id: table_id_value_get
        });
      } else {
        socketManager.emitToFooder(fooderID, "kot_deleted", {
          message: "Item removed successfully",
          order: true,
          fooderID,
          tableItems,
          table_id: table_id_value_get
        });
      }

      connection.release();
      return res.status(200).send({ status: "success", message: "Item removed" });
    }

  } catch (error) {
    console.error(error);
    if (connection) connection.release();
    res.status(500).json({ status: "error", message: error.message });
  }
};



exports.afterKotGenerateUpdateNewItem = async (req, res) => {
  const {
    order_id,
    details,
    subtotal,
    service_charge,
    tax_amount,
    total,
    discount_type,
    discount_rate,
    cart_packing_charges,
    service_charge_details
  } = req.body;
  const connection = await pool.getConnection();

  try {
    const [ordersRes] = await connection.query(
      "SELECT payment_status, is_cancelled FROM orders WHERE id = ?",
      [order_id]
    );

    if (ordersRes.length > 0) {
      if (ordersRes[0].payment_status != 0) {
        connection.release();
        return res.status(400).send({
          status: "fail",
          message: "Order already paid, So you can't add more items",
        });
      }
      if (ordersRes[0].is_cancelled != 0) {
        connection.release();
        return res.status(400).send({
          status: "fail",
          message: "Order already cancelled!!!",
        });
      }
    }

    // 1. Query existing order items for the order
    const [existingOrderItems] = await connection.query(
      "SELECT * FROM order_items WHERE order_id = ?",
      [order_id]
    );

    // Extract the KOT_id values from existing order items
    const existingKOTIds = existingOrderItems.map(
      (item) => item.product_kot_id
    );

    // 2. Filter new items based on KOT_id
    const newItemsToAdd = details.filter(
      (item) => !existingKOTIds.includes(item.KOT_id)
    );

    if (newItemsToAdd.length === 0) {
      let fields = [];
      let values = [];
      if (subtotal !== null && subtotal !== undefined) {
        fields.push("subtotal = ?");
        values.push(subtotal);
      }
      if (service_charge !== null && service_charge !== undefined) {
        fields.push("service_charge = ?");
        values.push(service_charge);
      }
      if (tax_amount !== null && tax_amount !== undefined) {
        fields.push("tax_amount = ?");
        values.push(tax_amount);
      }
      if (total !== null && total !== undefined) {
        fields.push("total = ?");
        values.push(total);
      }
      if (discount_type !== null && discount_type !== undefined) {
        fields.push("discount_type = ?");
        values.push(discount_type);
      }
      if (discount_rate !== null && discount_rate !== undefined) {
        fields.push("discount_rate = ?");
        values.push(discount_rate);
      }
      if (service_charge_details !== null && service_charge_details !== undefined) {
        fields.push("service_charge_details = ?");
        values.push(JSON.stringify(service_charge_details));
      }
      values.push(order_id);
      // Only run update if there are fields to update
      if (fields.length > 0) {
        const query = `UPDATE orders SET ${fields.join(", ")} WHERE id = ? AND fooder_id = ?`;
        await connection.query(query, [...values, req.staff.fooder_id]);
      }
      connection.release();
      return res.status(200).send({
        status: "success",
        message: "No new items to add to the order...",
      });
    }

    const saveorderItemesQuery = `insert into order_items (order_id, fooder_id, product_kot_id, fooder_name, phone, table_id, menu_id, product_id, product_type, product_name, quantity, product_price, product_proprice, product_special_note, batchid, ip, creation_date,item_tax_percent,item_tax_type,variant_id,variant_details,addons_items_details,packaging_fee, local_time) values (?,?,?,?,?,?,?,?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

    const time = Math.floor(Date.now() / 1000);

    const newItems = newItemsToAdd.map((item) => [
      order_id,
      req.staff.fooder_id,
      item.KOT_id,
      req.staff.fooder_name,
      existingOrderItems.length > 0 ? existingOrderItems[0].phone : "",
      item.table_id,
      item.menu_id,
      item.product_id,
      item.product_type,
      item.product_name,
      item.quantity,
      item.product_price,
      item.product_proprice,
      item.product_special_note,
      time,
      req.ipAddress,
      time,
      item.tax_percent,
      item.tax_type,
      item.selectedvariants && item.selectedvariants.variantId
        ? JSON.stringify(item.selectedvariants.variantId)
        : 0,
      item.selectedvariants ? JSON.stringify(item.selectedvariants) : null,
      item.selectedAddons ? JSON.stringify(item.selectedAddons) : null,
      cart_packing_charges ? cart_packing_charges : 0,
      item.local_id,
    ]);
    let savedData;
    for (const itemData of newItems) {
      [savedData] = await connection.query(saveorderItemesQuery, itemData);
    }

    let fields = [];
    let values = [];
    if (details !== null && details !== undefined) {
      fields.push("details = ?");
      values.push(JSON.stringify(details));
    }
    if (subtotal !== null && subtotal !== undefined) {
      fields.push("subtotal = ?");
      values.push(subtotal);
    }
    if (service_charge !== null && service_charge !== undefined) {
      fields.push("service_charge = ?");
      values.push(service_charge);
    }
    if (tax_amount !== null && tax_amount !== undefined) {
      fields.push("tax_amount = ?");
      values.push(tax_amount);
    }
    if (total !== null && total !== undefined) {
      fields.push("total = ?");
      values.push(total);
    }
    if (discount_type !== null && discount_type !== undefined) {
      fields.push("discount_type = ?");
      values.push(discount_type);
    }
    if (discount_rate !== null && discount_rate !== undefined) {
      fields.push("discount_rate = ?");
      values.push(discount_rate);
    }
    if (service_charge_details !== null && service_charge_details !== undefined) {
      if (fields.length > 0) {
        values.push(order_id);
        // Prevent SQL syntax error by ensuring no leading/trailing commas
        const query = `UPDATE orders SET ${fields.join(", ")} WHERE id = ? AND fooder_id = ?`;
        await connection.query(query, [...values, req.staff.fooder_id]);
      }
      const query = `UPDATE orders SET ${fields.join(", ")} WHERE id = ? AND fooder_id = ?`;
      await connection.query(query, [...values, req.staff.fooder_id]);
    }
    connection.release();
    return res.status(200).send({
      status: "success",
      message: "New items added to the order successfully!",
    });
  } catch (error) {
    if (connection) connection.release();
    res.status(500).json({
      message: "Internal server error",
      errors: error.toString(),
    });
  }
};



exports.kotDetails = async (req, res) => {
  const connection = await db.getConnection();

  try {
    // Optimized query with subquery to avoid duplicates
    const [rows] = await connection.query(
      `
      SELECT 
        fk.id,
        fk.kot_number,
        fk.kot_prefix,
        fk.kot_details,
        fk.kot_date,
        fk.remove_items,
        fk.status,
        fk.created_date,
        oi.order_id,
        o.order_number_qrcode AS order_number,
        ft.type AS table_type,
        ft.table_no,
        ft.table_name
      FROM fooders_kot fk
      LEFT JOIN (
        SELECT product_kot_id, MIN(order_id) AS order_id
        FROM order_items
        GROUP BY product_kot_id
      ) oi ON fk.id = oi.product_kot_id
      LEFT JOIN orders o 
        ON oi.order_id = o.id
      LEFT JOIN fooders_tables ft 
        ON JSON_EXTRACT(fk.kot_details, '$[0].table_id') = ft.id
      WHERE fk.fooder_id = ?
        AND fk.kot_date >= CURDATE()
        AND fk.kot_date < CURDATE() + INTERVAL 1 DAY
        AND fk.status NOT IN (3, 5)
        AND (fk.is_cancelled IS NULL OR fk.is_cancelled != 1)
      ORDER BY fk.kot_number
      `,
      [req.staff.fooder_id]
    );

    // Transform results
    const transformedData = rows.map((entry) => {
      const kotDetails = JSON.parse(entry.kot_details || "[]");
      const removeItems = new Set(
        JSON.parse(entry.remove_items || "[]").map((i) => i.local_id)
      );

      const kotDetailsWithTableNo = kotDetails.map((item) => {
        let tableNo = null;
        if (entry.table_type !== null) {
          tableNo =
            entry.table_type === 0
              ? entry.table_name && entry.table_name !== ""
                ? `${entry.table_name}-${entry.table_no}`
                : `Table No- ${entry.table_no}`
              : `${entry.table_no}`;
        }
        return { ...item, table_no: tableNo };
      });

      const groupedDetails = {};
      kotDetailsWithTableNo.forEach((item) => {
        if (!groupedDetails[item.order_type]) {
          groupedDetails[item.order_type] = [];
        }
        if (!removeItems.has(item.local_id)) {
          groupedDetails[item.order_type].push(item);
        }
      });

      return Object.keys(groupedDetails).map((order_type) => {
        const formattedOrderType = order_type
          .replace(/_/g, " ")
          .toUpperCase();

        const createdDate = new Date(entry.created_date * 1000);
        const formattedTime = createdDate
          .toLocaleString("en-IN", {
            timeZone: "Asia/Kolkata",
            hour: "numeric",
            minute: "numeric",
            hour12: true,
          })
          .toUpperCase();

        return {
          id: entry.id,
          kot: `${entry.kot_prefix} - ${entry.kot_number}`,
          order_type:
            formattedOrderType === "TAKE AWAY" ? "Take Away" : formattedOrderType,
          order_number: entry.order_number || (order_type === "DINE IN" ? "" : null),
          table_no: groupedDetails[order_type][0]?.table_no || null,
          time: formattedTime,
          status: entry.status,
          final_kot_details: groupedDetails[order_type],
        };
      })[0];
    }).filter(item => item && item.final_kot_details.length > 0);

    connection.release();
    return res.status(200).send({
      status: "success",
      data: transformedData
    });

  } catch (error) {
    console.error(error);
    if (connection) connection.release();
    res.status(500).json({
      message: "Internal server error",
      errors: error.toString(),
    });
  }
};




exports.getOrderKotDetails = async (req, res) => {
  const { table_id } = req.body;
  const fooder_id = req.staff.fooder_id;

  if (!table_id) {
    return res.status(400).json({ status: 'fail', message: 'table_id is required' });
  }

  const connection = await pool.getConnection();
  try {
    // Check if table is booked
    const [[tableRow]] = await connection.query(
      `SELECT is_booked FROM fooders_tables WHERE id = ? AND fooder_id = ?`,
      [table_id, fooder_id]
    );

    if (!tableRow || tableRow.is_booked != 1) {
      connection.release();
      return res.status(400).send({
        status: "fail",
        message: "Table is already free"
      });
    }

    const kot_details = await getTableItems(connection, fooder_id, table_id);

    connection.release();

    return res.status(200).json({
      status: 'success',
      kot_details
    });

  } catch (error) {
    if (connection) connection.release();
    return res.status(500).json({ status: 'fail', message: 'Internal server error', error: error.toString() });
  }
};

exports.updateKOTOrderAction = async (req, res) => {
  const { id, status } = req.body;

  const condition = status === 5 ? '' : 'AND status != 4 AND fooder_id = ?';
  const statusUpdateQuery = ` UPDATE fooders_kot SET status = ? where id = ? ${condition}`;
  const connection = await db.getConnection();

  try {
    // const connection = await db.getConnection();

    const [statusUpdateResult] = await connection.query(statusUpdateQuery, [
      status,
      id,
      req.staff.fooder_id
    ]);
    connection.release();

    //console.log("updateProductResult===========>", updateProductResult);
    if (statusUpdateResult && statusUpdateResult.affectedRows === 0) {
      return res.status(400).send({
        status: "fail",
        message: "Status not Updated!!!, something went wrong!!!",
      });
    }
    return res.status(200).send({
      status: "success",
      message: "Status updated successfully...",
    });
  } catch (error) {
    if (connection) {
      connection.release();
    }
    res.status(500).json({
      message: "Internal server error",
      errors: error.toString(),
    });
  }
};
