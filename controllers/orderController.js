const db = require('../config/db');
const pool = db;
const config = require('../config/config');
const { getAndValidateStaff } = require('../utils/GetAndValidateStaff');
const { getOrderItemsByOrderIdUtils, getOrderItemsByOrderIdUtils2 } = require('../utils/getOrderItems');
const { getTableItems } = require('../utils/getTableItems');
const socketManager = require('../socketManager');


const updateOrderAmount = async (fooderId, orderId, connection) => {
  const [orderItems] = await connection.query(
    "SELECT id, order_id, quantity, product_price, product_proprice, item_tax_type, item_tax_percent, packaging_fee FROM order_items WHERE fooder_id = ? AND order_id = ?", [fooderId, orderId]
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

// Helper to get the next invoice number for a fooder for the current financial year
const getInvoiceNumber = async (fooderId, prefix) => {
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth() + 1; // Month is zero-based

  // Determine the starting date for the current financial year (assuming April 1st is the start)
  const yearStart = currentMonth < 4 ? currentYear - 1 : currentYear;
  const startDate = `${yearStart}-04-01`;

  const connection = await pool.getConnection();

  try {
    // Check if there is an existing invoice for the current financial year
    const [result] = await connection.query(
      `SELECT MAX(CAST(invoice_no AS UNSIGNED)) as maxInvoiceNumber FROM orders WHERE fooder_id = ? AND order_date >= ?`,
      [fooderId, startDate]
    );

    let maxInvoiceNumber = result[0].maxInvoiceNumber;
    if (
      maxInvoiceNumber === null ||
      maxInvoiceNumber === undefined ||
      maxInvoiceNumber === ''
    ) {
      // No existing invoices for the current financial year, start from 1001
      maxInvoiceNumber = 1001;
    } else {
      // Extract the numeric part and convert it to an integer
      maxInvoiceNumber = maxInvoiceNumber + 1;
    }

    // Increment and format the invoice number with leading zeros
    const formattedInvoiceNumber = `${prefix}-${String(maxInvoiceNumber)}`;
    return formattedInvoiceNumber;
  } catch (error) {
    throw error;
  } finally {
    connection.release();
  }
};

// working ok but in below code db validation added
// exports.createOrder = async (req, res) => {
//   let no_of_eaters,
//     details = [],
//     order_type,
//     subtotal,
//     service_charge,
//     service_charge_details,
//     tax_amount,
//     tax_details,
//     total,
//     table_id,
//     eater_suggestions,
//     discount_type,
//     discount_rate,
//     address,
//     waiter_id,
//     cart_packing_charges,
//     is_NC,
//     round_off_amount;

//   try {
//     ({
//       no_of_eaters,
//       details,
//       order_type,
//       subtotal,
//       service_charge,
//       service_charge_details,
//       tax_amount,
//       tax_details,
//       total,
//       table_id,
//       eater_suggestions,
//       discount_type,
//       discount_rate,
//       address,
//       waiter_id,
//       cart_packing_charges,
//       is_NC,
//       round_off_amount
//     } = req.body);
//   } catch (err) {
//     return res.status(400).send({ status: 'fail', message: 'Invalid request body' });
//   }

//   const eater_name = (req.body.eater_name || '').trim();
//   const eater_phonenumber = (req.body.eater_phonenumber || '').trim();
//   const time = Math.floor(Date.now() / 1000);
//   const order_number = 'OD' + time;
//   const today_date = new Date().toISOString().slice(0, 10);
//   const fooder_id = req.staff.fooder_id;
//   let order_number_qrcode;
//   let eater_id = 0;
//   let status = 1;
//   let delivery_charge = 0;
//   let delivery_guy_id = 0;

//   // Handle is_NC for orders.is_nc
//   const is_nc_value = is_NC ? 1 : 0;

//   // Handle round_off_amount for orders.round_up_amount
//   let round_up_amount = 0;
//   if (typeof round_off_amount !== "undefined" && round_off_amount !== null) {
//     let val = Number(round_off_amount);
//     round_up_amount = isNaN(val) ? 0 : Number(val.toFixed(2));
//   }

//   const connection = await pool.getConnection();

//   try {
//     if (!Array.isArray(details) || details.length === 0 || typeof details[0] !== 'object' || !('KOT_id' in details[0])) {
//       if (table_id) {
//         const [[order_committed_results]] = await connection.query(
//           `SELECT COUNT(*) as is_booked FROM fooders_tables WHERE id = ? AND is_booked = 1 AND fooder_id = ?;`,
//           [table_id, fooder_id]
//         );
//         if (order_committed_results.is_booked != 0) {
//           connection.release();
//           return res.status(400).send({ status: 'fail', message: 'Table already Booked!!' });
//         }
//       }
//     }

//     if (eater_name !== '') {
//       if (eater_phonenumber !== '') {
//         const [rows] = await connection.query('SELECT eater_id FROM eaters WHERE mobile = ?', [eater_phonenumber]);
//         if (rows.length > 0) {
//           eater_id = rows[0].eater_id;
//         } else {
//           const [result] = await connection.query(
//             'INSERT INTO eaters (name, mobile, joining_date, joining_ip) VALUES (?, ?, ?, ?)',
//             [eater_name, eater_phonenumber, time, req.ip]
//           );
//           eater_id = result.insertId;
//         }
//       } else {
//         eater_id = 0;
//       }
//     }

//     const [orderExists] = await connection.query(
//       'SELECT * FROM `orders` WHERE `fooder_id` = ? AND `order_date` = ?',
//       [fooder_id, today_date]
//     );
//     if (orderExists.length > 0) {
//       const [maxIdResult] = await connection.query(
//         'SELECT MAX(`order_number_qrcode`) AS max_id FROM `orders` WHERE `fooder_id` = ? AND `order_date` = ?',
//         [fooder_id, today_date]
//       );
//       order_number_qrcode = maxIdResult[0].max_id || 100;
//       order_number_qrcode++;
//     } else {
//       order_number_qrcode = 101;
//     }

//     // Generate invoice number and extract numeric part for DB, prefix for response
//     const invoiceNumber = await getInvoiceNumber(fooder_id, config.invoice_number_prefix);
//     // Example: "Bill No.-4285" or "BillNo-4285"
//     const pattern = /^([A-Za-z\s\.]+)-?(\d+)$/;
//     const matchResult = invoiceNumber.match(pattern);
//     let invoiceNumberValue = '', purcheseOrderPrefix = '';
//     if (matchResult) {
//       purcheseOrderPrefix = matchResult[1].replace(/\s+/g, '').replace(/\./g, ''); // Remove spaces/dots for prefix
//       invoiceNumberValue = matchResult[2]; // Only numeric part for DB
//     }
//     // Save only numeric part in DB, send "Bill No.4285" in response

//     // Add is_nc and round_up_amount to orders table
//     const saveOrderSQL = `
//       INSERT INTO orders (
//         fooder_id, order_number, order_number_qrcode, order_date, eater_id, waiter_id,
//         eater_name, eater_phonenumber, no_of_eaters, address, cookie, details, fooder_name,
//         order_type, subtotal, service_charge, service_charge_details, tax_amount, tax_details,
//         total, payment_type, status, status_details, ip, creation_date, order_mode, table_id,
//         eater_suggestions, discount_type, discount_rate, delivery_guy_id, delivery_charge,
//         invoice_no, unpaid_reason, fooder_view, cancelled_reason, is_nc, round_up_amount
//       ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`;

//     const [saveOrderResult] = await connection.query(saveOrderSQL, [
//       fooder_id, order_number, order_number_qrcode, today_date, eater_id, waiter_id,
//       eater_name, eater_phonenumber, no_of_eaters, address, ' ', JSON.stringify(details), req.staff.fooder_name,
//       order_type ? order_type.toLowerCase().replace(/\s+/g, '_') : 'dine_in', subtotal, service_charge,
//       JSON.stringify(service_charge_details), tax_amount, JSON.stringify(tax_details), parseFloat(total).toFixed(2),
//       ' ', status, ' ', req.ip, time, 4, table_id, eater_suggestions, discount_type, discount_rate,
//       delivery_guy_id, delivery_charge, invoiceNumberValue, ' ', 0, ' ', is_nc_value, round_up_amount
//     ]);

//     const saveItemSQL = `
//       INSERT INTO order_items (
//         order_id, fooder_id, product_kot_id, fooder_name, phone, table_id,
//         menu_id, product_id, product_type, product_name, quantity, product_price,
//         product_proprice, product_special_note, batchid, ip, creation_date,
//         item_tax_percent, item_tax_type, variant_details, addons_items_details,
//         variant_id, packaging_fee, local_time, cookie_basket, is_cancelled
//       ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`;

//     for (const item of details) {
//       await connection.query(saveItemSQL, [
//         saveOrderResult.insertId,
//         fooder_id,
//         item.KOT_id,
//         req.staff.fooder_name,
//         eater_phonenumber,
//         table_id,
//         item.menu_id,
//         item.product_id,
//         item.product_type,
//         item.product_name,
//         item.quantity,
//         item.product_price,
//         item.product_proprice,
//         item.product_special_note,
//         time,
//         req.ip,
//         time,
//         item.tax_percent,
//         item.tax_type,
//         item.selectedvariants ? JSON.stringify(item.selectedvariants) : null,
//         item.selectedAddons ? JSON.stringify(item.selectedAddons) : null,
//         item.selectedvariants?.variantId || 0,
//         cart_packing_charges || 0,
//         item.local_id,
//         ' ',
//         0
//       ]);
//     }

//     await connection.query('UPDATE eaters SET name = ?, address = ?, mobile = ? WHERE eater_id = ?', [
//       eater_name,
//       address,
//       eater_phonenumber,
//       eater_id
//     ]);
//     connection.release();

//     const event = 'order_created';
//     const data = {
//       order_id: saveOrderResult.insertId,
//       order_number: order_number_qrcode,
//       creation_date: time,
//       invoice_number: `${purcheseOrderPrefix}${invoiceNumberValue}`,
//       table_id: table_id,
//     };

//     socketManager.emitToFooder(fooder_id, event, data);

//     return res.status(200).send({
//       status: 'success',
//       message: 'Order saved successfully',
//       order_id: saveOrderResult.insertId,
//       order_number: order_number_qrcode,
//       creation_date: time,
//       invoice_number: `${purcheseOrderPrefix}${invoiceNumberValue}`
//     });
//   } catch (error) {
//     if (connection) connection.release();
//     console.error('Error creating order:', error);
//     return res.status(500).json({ message: 'Internal server error', errors: error.toString() });
//   }
// };

exports.createOrder = async (req, res) => {
  let no_of_eaters,
    details = [],
    order_type,
    subtotal,
    service_charge,
    service_charge_details,
    tax_amount,
    tax_details,
    total,
    table_id,
    eater_suggestions,
    discount_type,
    discount_rate,
    address,
    waiter_id,
    cart_packing_charges,
    is_NC,
    round_off_amount;

  try {
    ({
      no_of_eaters,
      details,
      order_type,
      subtotal,
      service_charge,
      service_charge_details,
      tax_amount,
      tax_details,
      total,
      table_id,
      eater_suggestions,
      discount_type,
      discount_rate,
      address,
      waiter_id,
      cart_packing_charges,
      is_NC,
      round_off_amount,
      // socketID
    } = req.body);
  } catch (err) {
    return res.status(400).send({ status: 'fail', message: 'Invalid request body' });
  }

  // const socketToExclude = socketID;
  // console.error("Socket to exclude:", socketToExclude);

  const eater_name = (req.body.eater_name || '').trim();
  const eater_phonenumber = (req.body.eater_phonenumber || '').trim();
  const time = Math.floor(Date.now() / 1000);
  const order_number = 'OD' + time;
  const today_date = new Date().toISOString().slice(0, 10);
  const fooder_id = req.staff.fooder_id;
  let order_number_qrcode;
  let eater_id = 0;
  let status = 1;
  let delivery_charge = 0;
  let delivery_guy_id = 0;
  const is_nc_value = is_NC ? 1 : 0;

  let round_up_amount = 0;
  if (typeof round_off_amount !== "undefined" && round_off_amount !== null) {
    let val = Number(round_off_amount);
    round_up_amount = isNaN(val) ? 0 : Number(val.toFixed(2));
  }

  const connection = await pool.getConnection();

  try {
    if (!table_id) {
      connection.release();
      return res.status(400).send({ status: 'fail', message: 'Table ID is required' });
    }

    // Validation 1: Check for pending orders on the table
    if (table_id) {
      const [pendingOrders] = await connection.query(
        `SELECT id FROM orders 
         WHERE fooder_id = ? 
         AND table_id = ? 
         AND payment_status = 0 
         AND status != 4
         AND is_cancelled = 0
         AND id > ?
         ORDER BY CAST(creation_date AS UNSIGNED) DESC
       LIMIT 1`, // config.lastorderid should be defined
        [fooder_id, table_id, config.lastorderid]
      );

      if (pendingOrders.length > 0) {
        connection.release();
        // console.log(`order ${pendingOrders[0].id} is pending on table ${table_id}`);
        return res.status(400).send({
          status: 'fail',
          message: 'There is already a pending order on this table'
        });
      }
    }

    // Validation 2: Get current table items and verify against frontend data
    const tableItemsFromDB = await getTableItems(connection, fooder_id, table_id);

    // Create a map of frontend items by product_id and local_id
    const frontendItemsMap = {};
    details.forEach(item => {
      const key = `${item.product_id}_${item.local_id}`;
      frontendItemsMap[key] = {
        product_id: item.product_id,
        local_id: item.local_id,
        quantity: item.quantity,
        variant: item.selectedvariants,
        addons: item.selectedAddons
      };
    });

    // Create a map of database items by product_id and local_id
    const dbItemsMap = {};
    tableItemsFromDB.items.forEach(item => {
      const key = `${item.id}_${item.local_id}`;
      dbItemsMap[key] = {
        product_id: item.id,
        local_id: item.local_id,
        quantity: item.quantity,
        variant: item.selectedvariants,
        addons: item.addons
      };
    });

    // Compare frontend and database items
    let mismatchFound = false;
    const mismatchDetails = [];

    // Check all frontend items exist in database with same details
    for (const key in frontendItemsMap) {
      if (!dbItemsMap[key]) {
        mismatchFound = true;
        mismatchDetails.push(`Product ${frontendItemsMap[key].product_id} with local ID ${frontendItemsMap[key].local_id} not found in database`);
        continue;
      }

      const frontendItem = frontendItemsMap[key];
      const dbItem = dbItemsMap[key];

      if (frontendItem.quantity !== dbItem.quantity) {
        mismatchFound = true;
        mismatchDetails.push(`Quantity mismatch for product ${frontendItem.product_id} (Frontend: ${frontendItem.quantity}, DB: ${dbItem.quantity})`);
      }

      // Compare variants if they exist
      // if (frontendItem.variant || dbItem.variant) {
      //   const frontendVariant = frontendItem.variant ? JSON.stringify(frontendItem.variant) : null;
      //   const dbVariant = dbItem.variant ? JSON.stringify(dbItem.variant) : null;
      //   if (frontendVariant !== dbVariant) {
      //     mismatchFound = true;
      //     mismatchDetails.push(`Variant mismatch for product ${frontendItem.product_id}`);
      //   }
      // }

      // Compare addons if they exist
      // if (frontendItem.addons || dbItem.addons) {
      //   const frontendAddons = frontendItem.addons ? JSON.stringify(frontendItem.addons.sort()) : null;
      //   const dbAddons = dbItem.addons ? JSON.stringify(dbItem.addons.sort()) : null;
      //   if (frontendAddons !== dbAddons) {
      //     mismatchFound = true;
      //     mismatchDetails.push(`Addons mismatch for product ${frontendItem.product_id}`);
      //   }
      // }
    }

    // Check all database items exist in frontend
    for (const key in dbItemsMap) {
      if (!frontendItemsMap[key]) {
        mismatchFound = true;
        mismatchDetails.push(`Product ${dbItemsMap[key].product_id} with local ID ${dbItemsMap[key].local_id} exists in database but not in frontend`);
      }
    }

    if (mismatchFound) {
      connection.release();
      return res.status(400).send({
        status: 'fail',
        message: 'Cart items do not match with server data. Please refresh your cart.',
        details: mismatchDetails
      });
    }

    // Rest of the original order creation logic
    if (eater_name !== '') {
      if (eater_phonenumber !== '') {
        const [rows] = await connection.query('SELECT eater_id FROM eaters WHERE mobile = ?', [eater_phonenumber]);
        if (rows.length > 0) {
          eater_id = rows[0].eater_id;
        } else {
          const [result] = await connection.query(
            'INSERT INTO eaters (name, mobile, joining_date, joining_ip) VALUES (?, ?, ?, ?)',
            [eater_name, eater_phonenumber, time, req.ipAddress]
          );
          eater_id = result.insertId;
        }
      } else {
        eater_id = 0;
      }
    }

    const [orderExists] = await connection.query(
      'SELECT * FROM `orders` WHERE `fooder_id` = ? AND `order_date` = ?',
      [fooder_id, today_date]
    );
    if (orderExists.length > 0) {
      const [maxIdResult] = await connection.query(
        'SELECT MAX(`order_number_qrcode`) AS max_id FROM `orders` WHERE `fooder_id` = ? AND `order_date` = ?',
        [fooder_id, today_date]
      );
      order_number_qrcode = maxIdResult[0].max_id || 100;
      order_number_qrcode++;
    } else {
      order_number_qrcode = 101;
    }

    const invoiceNumber = await getInvoiceNumber(fooder_id, config.invoice_number_prefix);
    const pattern = /^([A-Za-z\s\.]+)-?(\d+)$/;
    const matchResult = invoiceNumber.match(pattern);
    let invoiceNumberValue = '', purcheseOrderPrefix = '';
    if (matchResult) {
      purcheseOrderPrefix = matchResult[1].replace(/\s+/g, '').replace(/\./g, '');
      invoiceNumberValue = matchResult[2];
    }

    const saveOrderSQL = `
      INSERT INTO orders (
        fooder_id, order_number, order_number_qrcode, order_date, eater_id, waiter_id,
        eater_name, eater_phonenumber, no_of_eaters, address, cookie, details, fooder_name,
        order_type, subtotal, service_charge, service_charge_details, tax_amount, tax_details,
        total, payment_type, status, status_details, ip, creation_date, order_mode, table_id,
        eater_suggestions, discount_type, discount_rate, delivery_guy_id, delivery_charge,
        invoice_no, unpaid_reason, fooder_view, cancelled_reason, is_nc, round_up_amount
      ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`;

    const [saveOrderResult] = await connection.query(saveOrderSQL, [
      fooder_id, order_number, order_number_qrcode, today_date, eater_id, waiter_id,
      eater_name, eater_phonenumber, no_of_eaters, address, ' ', JSON.stringify(details), req.staff.fooder_name,
      order_type ? order_type.toLowerCase().replace(/\s+/g, '_') : 'dine_in', subtotal, service_charge,
      JSON.stringify(service_charge_details), tax_amount, JSON.stringify(tax_details), parseFloat(total).toFixed(2),
      ' ', status, ' ', req.ipAddress, time, 4, table_id, eater_suggestions, discount_type, discount_rate,
      delivery_guy_id, delivery_charge, invoiceNumberValue, ' ', 0, ' ', is_nc_value, round_up_amount
    ]);

    const saveItemSQL = `
      INSERT INTO order_items (
        order_id, fooder_id, product_kot_id, fooder_name, phone, table_id,
        menu_id, product_id, product_type, product_name, quantity, product_price,
        product_proprice, product_special_note, batchid, ip, creation_date,
        item_tax_percent, item_tax_type, variant_details, addons_items_details,
        variant_id, packaging_fee, local_time, cookie_basket, is_cancelled
      ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`;

    for (const item of details) {
      await connection.query(saveItemSQL, [
        saveOrderResult.insertId,
        fooder_id,
        item.KOT_id,
        req.staff.fooder_name,
        eater_phonenumber,
        table_id,
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
        item.selectedvariants ? JSON.stringify(item.selectedvariants) : null,
        item.selectedAddons ? JSON.stringify(item.selectedAddons) : null,
        item.selectedvariants?.variantId || 0,
        cart_packing_charges || 0,
        item.local_id,
        ' ',
        0
      ]);
    }

    await connection.query('UPDATE eaters SET name = ?, address = ?, mobile = ? WHERE eater_id = ?', [
      eater_name,
      address,
      eater_phonenumber,
      eater_id
    ]);

    const [tableDetails] = await connection.query(
      `select type,table_no,table_name from fooders_tables where id = ?`,
      [table_id]
    );

    let table_no;

    // if (tableDetails.length > 0) {
    //   const type = tableDetails[0].type;
    //   if (type === 0 || type === 2) {
    //     if (tableDetails[0].table_name) {
    //       table_no = `${tableDetails[0].table_name}-${tableDetails[0].table_no}`;
    //     }
    //   } else {
    //     if (tableDetails[0].table_name) {
    //       table_no = `${tableDetails[0].table_name}-${tableDetails[0].table_no}`;
    //     }
    //   }
    // }

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

    const event = 'order_created';
    const data = {
      order_id: saveOrderResult.insertId,
      order_number: order_number_qrcode,
      creation_date: time,
      invoice_number: `${purcheseOrderPrefix}${invoiceNumberValue}`,
      table_id: table_id,
      table_no: table_no,
    };

    socketManager.emitToFooder(fooder_id, event, data);
    // socketManager.emitToFooder(fooder_id, event, data, socketToExclude);

    return res.status(200).send({
      status: 'success',
      message: 'Order saved successfully',
      order_id: saveOrderResult.insertId,
      order_number: order_number_qrcode,
      creation_date: time,
      invoice_number: `${purcheseOrderPrefix}.${invoiceNumberValue}`,
      table_no: table_no
    });
  } catch (error) {
    if (connection) connection.release();
    console.error('Error creating order:', error);
    return res.status(500).json({ message: 'Internal server error', errors: error.toString() });
  }
};


// exports.afterOrderGenerateUpdateNewItem = async (req, res) => {
//   const {
//     order_id,
//     details,
//     subtotal,
//     service_charge,
//     tax_amount,
//     total,
//     discount_type,
//     discount_rate,
//     cart_packing_charges,
//     service_charge_details,
//     is_NC,
//     round_up_amount
//   } = req.body;
//   const connection = await pool.getConnection();

//   try {
//     // Check order status
//     const [ordersRes] = await connection.query(
//       "SELECT payment_status, is_cancelled, order_number, order_number_qrcode, creation_date, invoice_no FROM orders WHERE id = ?",
//       [order_id]
//     );

//     if (ordersRes.length > 0) {
//       if (ordersRes[0].payment_status != 0) {
//         connection.release();
//         return res.status(400).send({
//           status: "fail",
//           message: "Order already paid, So you can't add more items",
//         });
//       }
//       if (ordersRes[0].is_cancelled != 0) {
//         connection.release();
//         return res.status(400).send({
//           status: "fail",
//           message: "Order already cancelled!!!",
//         });
//       }
//     }

//     // 1. Query existing order items for the order
//     const [existingOrderItems] = await connection.query(
//       "SELECT * FROM order_items WHERE order_id = ?",
//       [order_id]
//     );

//     // Extract the KOT_id values from existing order items
//     const existingKOTIds = existingOrderItems.map(
//       (item) => item.product_kot_id
//     );

//     // 2. Filter new items based on KOT_id
//     const newItemsToAdd = details.filter(
//       (item) => !existingKOTIds.includes(item.KOT_id)
//     );

//     // Prepare fields for update
//     let fields = [];
//     let values = [];

//     if (details !== null && details !== undefined) {
//       fields.push("details = ?");
//       values.push(JSON.stringify(details));
//     }
//     if (subtotal !== null && subtotal !== undefined) {
//       fields.push("subtotal = ?");
//       values.push(subtotal);
//     }
//     if (service_charge !== null && service_charge !== undefined) {
//       fields.push("service_charge = ?");
//       values.push(service_charge);
//     }
//     if (tax_amount !== null && tax_amount !== undefined) {
//       fields.push("tax_amount = ?");
//       values.push(tax_amount);
//     }
//     if (total !== null && total !== undefined) {
//       fields.push("total = ?");
//       values.push(total);
//     }
//     if (discount_type !== null && discount_type !== undefined) {
//       fields.push("discount_type = ?");
//       values.push(discount_type);
//     }
//     if (discount_rate !== null && discount_rate !== undefined) {
//       fields.push("discount_rate = ?");
//       values.push(discount_rate);
//     }
//     if (service_charge_details !== null && service_charge_details !== undefined) {
//       fields.push("service_charge_details = ?");
//       values.push(JSON.stringify(service_charge_details));
//     }
//     // Handle is_NC for orders.is_nc
//     if (typeof is_NC !== "undefined") {
//       fields.push("is_nc = ?");
//       values.push(is_NC ? 1 : 0);
//     }
//     // Handle round_up_amount for orders.round_up_amount
//     if (typeof round_up_amount !== "undefined" && round_up_amount !== null) {
//       let val = Number(round_up_amount);
//       if (!isNaN(val)) {
//         fields.push("round_up_amount = ?");
//         values.push(Number(val.toFixed(2)));
//       }
//     }

//     if (newItemsToAdd.length === 0) {
//       if (fields.length > 0) {
//         values.push(order_id);
//         const query = `UPDATE orders SET ${fields.join(", ")} WHERE id = ? AND fooder_id = ?`;
//         await connection.query(query, [...values, req.staff.fooder_id]);
//       }
//       // Prepare invoice_number with prefix
//       const invoice_number = ordersRes[0].invoice_no
//         ? `${config.invoice_number_prefix}${ordersRes[0].invoice_no}`
//         : "";
//       connection.release();
//       return res.status(200).send({
//         status: "success",
//         message: "No new items to add to the order...",
//         order_number: ordersRes[0].order_number_qrcode,
//         creation_date: ordersRes[0].creation_date,
//         invoice_number: invoice_number
//       });
//     }

//     const saveorderItemesQuery = `insert into order_items (order_id, fooder_id, product_kot_id, fooder_name, phone, table_id, menu_id, product_id, product_type, product_name, quantity, product_price, product_proprice, product_special_note, batchid, ip, creation_date, item_tax_percent, item_tax_type, variant_id, variant_details, addons_items_details, packaging_fee, local_time, cookie_basket) values (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`;

//     const time = Math.floor(Date.now() / 1000);

//     const newItems = newItemsToAdd.map((item) => [
//       order_id,
//       req.staff.fooder_id,
//       item.KOT_id,
//       req.staff.fooder_name,
//       existingOrderItems.length > 0 ? existingOrderItems[0].phone : "",
//       item.table_id,
//       item.menu_id,
//       item.product_id,
//       item.product_type,
//       item.product_name,
//       item.quantity,
//       item.product_price,
//       item.product_proprice,
//       item.product_special_note,
//       time,
//       req.ipAddress,
//       time,
//       item.tax_percent,
//       item.tax_type,
//       item.selectedvariants && item.selectedvariants.variantId
//         ? JSON.stringify(item.selectedvariants.variantId)
//         : 0,
//       item.selectedvariants ? JSON.stringify(item.selectedvariants) : null,
//       item.selectedAddons ? JSON.stringify(item.selectedAddons) : null,
//       cart_packing_charges ? cart_packing_charges : 0,
//       item.local_id,
//       ' ',
//     ]);
//     // 3. Insert the new items
//     for (const itemData of newItems) {
//       await connection.query(saveorderItemesQuery, itemData);
//     }

//     // Update order with new fields
//     if (fields.length > 0) {
//       values.push(order_id);
//       const query = `UPDATE orders SET ${fields.join(", ")} WHERE id = ? AND fooder_id = ?`;
//       await connection.query(query, [...values, req.staff.fooder_id]);
//     }

//     // send latest order items to fooder
//     const [[table_id]] = await connection.query(
//       'SELECT table_id FROM orders WHERE id = ? AND fooder_id = ? LIMIT 1',
//       [order_id, req.staff.fooder_id]
//     );
//     const tableItems = await getTableItems(connection, req.staff.fooder_id, table_id.table_id);

//     // Prepare invoice_number with prefix
//     const invoice_number = ordersRes[0].invoice_no
//       ? `${config.invoice_number_prefix}${ordersRes[0].invoice_no}`
//       : "";

//     connection.release();

//     const event = 'order_items_updated';
//     const data = {
//       order_id: order_id,
//       table_id: table_id.table_id,
//       tableItems: tableItems,
//     };

//     socketManager.emitToFooder(req.staff.fooder_id, event, data);

//     // Return success response
//     return res.status(200).send({
//       status: "success",
//       message: "New items added to the order successfully!",
//       order_number: ordersRes[0].order_number_qrcode,
//       creation_date: ordersRes[0].creation_date,
//       invoice_number: invoice_number
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


// const fetchOrderItemsData = async (fooderId, orderId, connection) => {
//   const [rows] = await connection.query(
//     `SELECT oi.id, oi.order_id, oi.quantity, oi.product_price, oi.product_proprice, oi.item_tax_type, oi.item_tax_percent, oi.packaging_fee, oi.menu_id, fm.name AS menu_name
//      FROM order_items oi
//      INNER JOIN fooders_menus fm ON oi.menu_id = fm.id
//      WHERE oi.fooder_id = ? AND oi.order_id = ?`,
//     [fooderId, orderId]
//   );

//   return rows;
// };

exports.afterOrderGenerateUpdateNewItem = async (req, res) => {
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
    service_charge_details,
    is_NC,
    round_up_amount
  } = req.body;
  const connection = await pool.getConnection();

  try {
    // Check order status
    const [ordersRes] = await connection.query(
      "SELECT payment_status, is_cancelled, order_number, order_number_qrcode, creation_date, invoice_no, table_id FROM orders WHERE id = ?",
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

    // Prepare fields for update
    let fields = [];
    let values = [];

    // Only allow waiter (type=0) to update details, not other fields
    if (details !== null && details !== undefined) {
      fields.push("details = ?");
      values.push(JSON.stringify(details));
    }

    // If not waiter, allow updating other fields
    if (req.staff.type !== 0) {
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
      // Handle is_NC for orders.is_nc
      if (typeof is_NC !== "undefined") {
        fields.push("is_nc = ?");
        values.push(is_NC ? 1 : 0);
      }
      // Handle round_up_amount for orders.round_up_amount
      if (typeof round_up_amount !== "undefined" && round_up_amount !== null) {
        let val = Number(round_up_amount);
        if (!isNaN(val)) {
          fields.push("round_up_amount = ?");
          values.push(Number(val.toFixed(2)));
        }
      }
    }

    if (newItemsToAdd.length === 0) {
      // Perform validation when there are no new items to add
      const [[table_id]] = await connection.query(
        'SELECT table_id FROM orders WHERE id = ? AND fooder_id = ? LIMIT 1',
        [order_id, req.staff.fooder_id]
      );

      const tableItemsFromDB = await getTableItems(connection, req.staff.fooder_id, table_id.table_id);

      // Create a map of frontend items by product_id and local_id
      const frontendItemsMap = {};
      details.forEach(item => {
        const key = `${item.product_id}_${item.local_id}`;
        frontendItemsMap[key] = {
          product_id: item.product_id,
          local_id: item.local_id,
          quantity: item.quantity,
          variant: item.selectedvariants,
          addons: item.selectedAddons
        };
      });

      // Create a map of database items by product_id and local_id
      const dbItemsMap = {};
      tableItemsFromDB.items.forEach(item => {
        const key = `${item.id}_${item.local_id}`;
        dbItemsMap[key] = {
          product_id: item.id,
          local_id: item.local_id,
          quantity: item.quantity,
          variant: item.selectedvariants,
          addons: item.addons
        };
      });

      // Compare frontend and database items
      let mismatchFound = false;
      const mismatchDetails = [];

      // Check all frontend items exist in database with same details
      for (const key in frontendItemsMap) {
        if (!dbItemsMap[key]) {
          mismatchFound = true;
          mismatchDetails.push(`Product ${frontendItemsMap[key].product_id} with local ID ${frontendItemsMap[key].local_id} not found in database`);
          continue;
        }

        const frontendItem = frontendItemsMap[key];
        const dbItem = dbItemsMap[key];

        if (frontendItem.quantity !== dbItem.quantity) {
          mismatchFound = true;
          mismatchDetails.push(`Quantity mismatch for product ${frontendItem.product_id} (Frontend: ${frontendItem.quantity}, DB: ${dbItem.quantity})`);
        }
      }

      // Check all database items exist in frontend
      for (const key in dbItemsMap) {
        if (!frontendItemsMap[key]) {
          mismatchFound = true;
          mismatchDetails.push(`Product ${dbItemsMap[key].product_id} with local ID ${dbItemsMap[key].local_id} exists in database but not in frontend`);
        }
      }

      if (mismatchFound) {
        connection.release();
        return res.status(400).send({
          status: 'fail',
          message: 'Cart items do not match with server data. Please refresh your cart.',
          details: mismatchDetails
        });
      }

      // If no mismatches, proceed with updating order fields if any
      if (fields.length > 0) {
        values.push(order_id);
        const query = `UPDATE orders SET ${fields.join(", ")} WHERE id = ? AND fooder_id = ?`;
        await connection.query(query, [...values, req.staff.fooder_id]);
      }

      // Prepare invoice_number with prefix
      const invoice_number = ordersRes[0].invoice_no
        ? `${config.invoice_number_prefix}${ordersRes[0].invoice_no}`
        : "";

      const [tableDetails] = await connection.query(
        `select type,table_no,table_name from fooders_tables where id = ?`,
        [ordersRes[0].table_id]
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
        status: "success",
        message: "No new items to add to the order...",
        order_number: ordersRes[0].order_number_qrcode,
        creation_date: ordersRes[0].creation_date,
        invoice_number: invoice_number,
        table_no: table_no
      });
    }

    const saveorderItemesQuery = `insert into order_items (order_id, fooder_id, product_kot_id, fooder_name, phone, table_id, menu_id, product_id, product_type, product_name, quantity, product_price, product_proprice, product_special_note, batchid, ip, creation_date, item_tax_percent, item_tax_type, variant_id, variant_details, addons_items_details, packaging_fee, local_time, cookie_basket) values (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`;

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
      ' ',
    ]);
    // 3. Insert the new items
    for (const itemData of newItems) {
      await connection.query(saveorderItemesQuery, itemData);
    }

    // Update order with new fields
    if (fields.length > 0) {
      values.push(order_id);
      const query = `UPDATE orders SET ${fields.join(", ")} WHERE id = ? AND fooder_id = ?`;
      await connection.query(query, [...values, req.staff.fooder_id]);
    }

    // send latest order items to fooder
    const [[table_id]] = await connection.query(
      'SELECT table_id FROM orders WHERE id = ? AND fooder_id = ? LIMIT 1',
      [order_id, req.staff.fooder_id]
    );
    const tableItems = await getTableItems(connection, req.staff.fooder_id, table_id.table_id);

    // Prepare invoice_number with prefix
    const invoice_number = ordersRes[0].invoice_no
      ? `${config.invoice_number_prefix}${ordersRes[0].invoice_no}`
      : "";

    const [tableDetails] = await connection.query(
      `select type,table_no,table_name from fooders_tables where id = ?`,
      [ordersRes[0].table_id]
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

    const event = 'order_items_updated';
    const data = {
      order_id: order_id,
      table_id: table_id.table_id,
      tableItems: tableItems,
    };

    socketManager.emitToFooder(req.staff.fooder_id, event, data);

    // Return success response
    return res.status(200).send({
      status: "success",
      message: "New items added to the order successfully!",
      order_number: ordersRes[0].order_number_qrcode,
      creation_date: ordersRes[0].creation_date,
      invoice_number: invoice_number,
      table_no: table_no,
    });
  } catch (error) {
    console.log(error);
    if (connection) {
      connection.release();
    }
    res.status(500).json({
      message: "Internal server error",
      errors: error.toString(),
    });
  }
};



const fetchOrderItemsData = async (fooderId, orderId, connection) => {
  const [rows] = await connection.query(
    `SELECT oi.id, oi.order_id, oi.quantity, oi.product_price, oi.product_proprice, oi.item_tax_type, oi.item_tax_percent, oi.packaging_fee, oi.menu_id, fm.name AS menu_name
     FROM order_items oi
     INNER JOIN fooders_menus fm ON oi.menu_id = fm.id
     WHERE oi.fooder_id = ? AND oi.order_id = ? AND oi.is_cancelled = 0`,
    [fooderId, orderId]
  );

  return rows;
};


// live order today without foodercp open close time
// exports.getLiveOrder = async (req, res) => {
//   const time = Math.floor(Date.now() / 1000);
//   const connection = await db.getConnection();

//   try {
//     // console.log("getLiveOrder: staff.fooder_id", req.staff.fooder_id);

//     // Get today's date in YYYY-MM-DD format
//     const todayDate = new Date().toISOString().slice(0, 10);
//     // console.log("getLiveOrder: todayDate used in query:", todayDate);

//     // const getLiveOrderQuery = ` SELECT 
//     //   o.id,
//     //   o.order_number_qrcode,
//     //   o.order_number,
//     //   o.table_id,
//     //   CASE 
//     //       WHEN type = 0 THEN 
//     //           CASE 
//     //               WHEN table_name IS NOT NULL AND table_name != '' THEN 
//     //                   CONCAT(table_name, IF(table_no != '', CONCAT('-', table_no), ''))
//     //               ELSE
//     //                   CONCAT('Table No- ', table_no)
//     //           END
//     //       ELSE table_no 
//     //   END AS table_no,
//     //   ft.table_name,
//     //   o.creation_date,
//     //   o.order_date,
//     //   o.eater_name,
//     //   o.eater_phonenumber,
//     //   o.total,
//     //   o.payment_status,
//     //   o.payment_type,
//     //   o.status,
//     //   o.order_mode,
//     //   o.subtotal,
//     //   o.service_charge_details,
//     //   o.tax_details,
//     //   o.discount_type,
//     //   o.round_up_amount,
//     //   o.discount_rate,
//     //   o.packaging_fee,
//     //   o.delivery_charge,
//     //   o.order_type,
//     //   o.created_by,
//     //   JSON_ARRAYAGG(
//     //       JSON_OBJECT(
//     //           'item_id', oi.id,
//     //           'product_name', oi.product_name,
//     //           'quantity', oi.quantity,
//     //           'product_price', oi.product_price 
//     //       )
//     //   ) AS details
//     // FROM 
//     //   orders o 
//     // LEFT JOIN 
//     //   fooders_tables ft 
//     //   ON ft.id = o.table_id 
//     // LEFT JOIN
//     //   order_items oi
//     //   ON oi.order_id = o.id
//     // WHERE  
//     //   o.fooder_id = ? 
//     //   AND DATE(o.order_date) = ? 
//     //   AND o.status != 4 
//     //   AND o.is_cancelled = 0
//     // GROUP BY 
//     //   o.id, o.order_number_qrcode, o.order_number, o.table_id, ft.table_name, o.creation_date, o.order_date, 
//     //   o.eater_name, o.eater_phonenumber, o.total, o.payment_status, o.payment_type, o.status, o.order_mode, 
//     //   o.subtotal, o.service_charge_details, o.tax_details, o.discount_type, o.round_up_amount, o.discount_rate, 
//     //   o.packaging_fee, o.delivery_charge, o.order_type
//     // ORDER BY 
//     //   o.creation_date DESC;
//     // `;

//     const getLiveOrderQuery = ` SELECT 
//   o.id,
//   o.order_number_qrcode,
//   o.order_number,
//   o.table_id,
//   CASE 
//       WHEN type = 0 THEN 
//           CASE 
//               WHEN table_name IS NOT NULL AND table_name != '' THEN 
//                   CONCAT(table_name, IF(table_no != '', CONCAT('-', table_no), ''))
//               ELSE
//                   CONCAT('Table No- ', table_no)
//           END
//       ELSE table_no 
//   END AS table_no,
//   ft.table_name,
//   o.creation_date,
//   o.order_date,
//   o.eater_name,
//   o.eater_phonenumber,
//   o.total,
//   o.payment_status,
//   o.payment_type,
//   o.status,
//   o.order_mode,
//   o.subtotal,
//   o.service_charge_details,
//   o.tax_details,
//   o.discount_type,
//   o.round_up_amount,
//   o.discount_rate,
//   o.packaging_fee,
//   o.delivery_charge,
//   o.order_type,
//   o.created_by,
//   JSON_ARRAYAGG(
//       CASE 
//           WHEN oi.is_cancelled = 0 THEN 
//               JSON_OBJECT(
//                   'item_id', oi.id,
//                   'product_name', oi.product_name,
//                   'quantity', oi.quantity,
//                   'product_price', oi.product_price 
//               )
//           ELSE NULL
//       END
//   ) AS details
// FROM 
//   orders o 
// LEFT JOIN 
//   fooders_tables ft 
//   ON ft.id = o.table_id 
// LEFT JOIN
//   order_items oi
//   ON oi.order_id = o.id AND oi.is_cancelled = 0
// WHERE  
//   o.fooder_id = ? 
//   AND DATE(o.order_date) = ? 
//   AND o.status != 4 
//   AND o.is_cancelled = 0
// GROUP BY 
//   o.id, o.order_number_qrcode, o.order_number, o.table_id, ft.table_name, o.creation_date, o.order_date, 
//   o.eater_name, o.eater_phonenumber, o.total, o.payment_status, o.payment_type, o.status, o.order_mode, 
//   o.subtotal, o.service_charge_details, o.tax_details, o.discount_type, o.round_up_amount, o.discount_rate, 
//   o.packaging_fee, o.delivery_charge, o.order_type
// ORDER BY 
//   o.creation_date DESC;
// `;


//     const [getLiveOrderResult] = await connection.query(getLiveOrderQuery, [
//       req.staff.fooder_id,
//       todayDate,
//     ]);
//     // console.log("getLiveOrderResult length:", getLiveOrderResult.length);
//     if (getLiveOrderResult.length === 0) {
//       connection.release();
//       // console.log("No live orders found for fooder_id:", req.staff.fooder_id, "on date:", todayDate);
//       return res
//         .status(200)
//         .send({ status: "success", message: "Data Not Available.." });
//     }

//     const modifiedData = await Promise.all(
//       getLiveOrderResult.map(async (order) => {
//         // console.log("Processing order id:", order.id);
//         const orderItems = await fetchOrderItemsData(
//           req.staff.fooder_id,
//           order.id,
//           connection
//         );
//         // console.log("OrderItems for order id", order.id, ":", orderItems);

//         let serviceChargeDetails = { percentage: 0 };
//         if (order.service_charge_details !== null) {
//           try {
//             serviceChargeDetails = JSON.parse(order.service_charge_details);
//           } catch (e) {
//             // console.log("Error parsing service_charge_details for order id", order.id, e);
//             serviceChargeDetails = { percentage: 0 };
//           }
//           if (!serviceChargeDetails.percentage) {
//             serviceChargeDetails.percentage = 0;
//           }
//         } else {
//           serviceChargeDetails = { percentage: 0 };
//         }

//         let withOutTaxPrice = 0;
//         let subTotal = 0;
//         let tempDiscount = 0;
//         let tempDiscountRow = 0;
//         let tempServicCharge = 0;
//         let tempServicChargeRow = 0;
//         let tempTax = 0;
//         let packingCharges = 0;

//         let withOutTaxPriceForAmount = 0;
//         let subTotalForAmount = 0;
//         let discountRateForAmount = 0;

//         if (order.discount_type === 1) {
//           orderItems.forEach((i) => {
//             if (i.product_proprice) {
//               withOutTaxPriceForAmount = parseInt(i.item_tax_type) === 0 ? parseFloat(i.product_proprice) : (parseFloat(i.product_proprice) * parseFloat(100)) / (parseFloat(100) + parseFloat(i.item_tax_percent));
//             } else {
//               withOutTaxPriceForAmount = parseInt(i.item_tax_type) === 0 ? parseFloat(i.product_price) : (parseFloat(i.product_price) * parseFloat(100)) / (parseFloat(100) + parseFloat(i.item_tax_percent));
//             }
//             subTotalForAmount += (i.quantity) * withOutTaxPriceForAmount;
//           });
//           discountRateForAmount = (parseFloat(order.discount_rate) * 100) / subTotalForAmount;
//         }

//         orderItems.forEach((i) => {
//           packingCharges += i.quantity * parseFloat(i.packaging_fee);

//           if (i.product_proprice) {
//             withOutTaxPrice = parseInt(i.item_tax_type) === 0 ? parseFloat(i.product_proprice) : (parseFloat(i.product_proprice) * parseFloat(100)) / (parseFloat(100) + parseFloat(i.item_tax_percent));
//           } else {
//             withOutTaxPrice = parseInt(i.item_tax_type) === 0 ? parseFloat(i.product_price) : (parseFloat(i.product_price) * parseFloat(100)) / (parseFloat(100) + parseFloat(i.item_tax_percent));
//           }

//           subTotal += (i.quantity) * withOutTaxPrice;

//           if (order.discount_type === 0) {
//             tempDiscount += (((i.quantity) * withOutTaxPrice) * parseFloat(order.discount_rate)) / 100;
//             tempDiscountRow = (((i.quantity) * withOutTaxPrice) * parseFloat(order.discount_rate)) / 100;
//           } else {
//             tempDiscount += (((i.quantity) * withOutTaxPrice) * parseFloat(discountRateForAmount)) / 100;
//             tempDiscountRow = (((i.quantity) * withOutTaxPrice) * parseFloat(discountRateForAmount)) / 100;
//           }

//           tempServicCharge += ((((i.quantity) * withOutTaxPrice) - tempDiscountRow) * parseFloat(serviceChargeDetails.percentage)) / 100;
//           tempServicChargeRow = ((((i.quantity) * withOutTaxPrice) - tempDiscountRow) * parseFloat(serviceChargeDetails.percentage)) / 100;

//           tempTax += ((((i.quantity) * withOutTaxPrice) + tempServicChargeRow - tempDiscountRow) * parseFloat(i.item_tax_percent)) / 100;
//         });

//         var grandTotal = 0;
//         if (order.order_type != "dine_in") {
//           grandTotal = (parseFloat(subTotal + tempServicCharge - tempDiscount + tempTax) + parseFloat(packingCharges) + order.round_up_amount).toFixed(2);
//         } else {
//           grandTotal = (subTotal + tempServicCharge - tempDiscount + tempTax + order.round_up_amount).toFixed(2);
//         }

//         order.total = grandTotal;
//         if (order.created_by && typeof order.created_by === 'string') {
//           try {
//             order.created_by = JSON.parse(order.created_by);
//           } catch (e) {
//             order.created_by = {};
//           }
//         } else if (typeof order.created_by !== 'object' || order.created_by === null) {
//           order.created_by = {};
//         }

//         if (order.status === 0) {
//           order.order_status_lable = "Pending";
//         } else if (order.status === 1) {
//           order.order_status_lable = "Accept and prepare order";
//         } else if (order.status === 2) {
//           order.order_status_lable = "Order Ready";
//         } else if (order.status === 3) {
//           order.order_status_lable = "Delivered and paid";
//         } else if (order.status === 4) {
//           order.order_status_lable = "Reject";
//         }

//         if (order.order_mode === 0) {
//           order.order_mode_label = "QR Code";
//         } else if (order.order_mode === 1) {
//           order.order_mode_label = "Online";
//           order.table_no = "";
//         } else if (order.order_mode === 2) {
//           order.order_mode_label = "POS";
//         } else if (order.order_mode === 3) {
//           order.order_mode_label = "MOBILE POS";
//         } else if (order.order_mode === 4) {
//           order.order_mode_label = "POS";
//         }

//         if (order.payment_status === 0) {
//           order.payment_status_label = "Unpaid";
//         } else {
//           order.payment_status_label = `Paid by ${order.payment_type ? order.payment_type.toUpperCase() : ""}`;
//         }
//         return order;
//       })
//     );

//     // console.log("modifiedData length:", modifiedData.length);
//     connection.release();
//     return res.status(200).send({
//       status: "success",
//       data: modifiedData,
//     });
//   } catch (error) {
//     if (connection) {
//       connection.release();
//     }
//     // console.log("getLiveOrder error:", error);
//     res.status(500).json({
//       message: "Internal server error",
//       errors: error.toString(),
//     });
//   }
// };


// view orderdetails on live order page
// live order by time opening closing working tested
exports.getLiveOrder = async (req, res) => {
  const connection = await db.getConnection();

  try {
    // Get open and close time from user/staff
    const openTime = req.staff.open_time;   // e.g. "22:00:00"
    const closeTime = req.staff.close_time; // e.g. "06:00:00"

    // Current date and next date (for cross midnight handling)
    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);
    const tomorrowStr = new Date(now.getTime() + 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10);

    // Parse open and close DateTimes (IST +5:30)
    const openDateTime = new Date(`${todayStr}T${openTime}+05:30`);
    let closeDateTime = new Date(`${todayStr}T${closeTime}+05:30`);

    // If close is earlier or equal to open, it means close is on next day
    if (closeDateTime <= openDateTime) {
      closeDateTime = new Date(`${tomorrowStr}T${closeTime}+05:30`);
    }

    // Convert to UNIX timestamps (seconds)
    const openTimestamp = Math.floor(openDateTime.getTime() / 1000);
    const closeTimestamp = Math.floor(closeDateTime.getTime() / 1000);

    const getLiveOrderQuery = `
      SELECT 
        o.id,
        o.order_number_qrcode,
        o.order_number,
        o.table_id,
        o.is_split,
        o.payment_status,
        CASE 
          WHEN type IN (0, 2) THEN 
            CASE 
              WHEN table_name IS NOT NULL AND table_name != '' THEN 
                CONCAT(table_name, IF(table_no != '', CONCAT('-', table_no), ''))
              ELSE
                CONCAT('Table No- ', table_no)
            END
          ELSE table_no 
        END AS table_no,
        ft.table_name,
        o.creation_date,
        o.order_date,
        o.eater_name,
        o.eater_phonenumber,
        o.total,
        o.payment_type,
        o.status,
        o.order_mode,
        o.subtotal,
        o.service_charge_details,
        o.tax_details,
        o.discount_type,
        o.round_up_amount,
        o.discount_rate,
        o.packaging_fee,
        o.delivery_charge,
        o.order_type,
        o.created_by,
        JSON_ARRAYAGG(
          CASE 
            WHEN oi.is_cancelled = 0 THEN 
              JSON_OBJECT(
                'item_id', oi.id,
                'product_name', oi.product_name,
                'quantity', oi.quantity,
                'product_price', oi.product_price 
              )
            ELSE NULL
          END
        ) AS details
      FROM 
        orders o 
      LEFT JOIN 
        fooders_tables ft 
        ON ft.id = o.table_id 
      LEFT JOIN
        order_items oi
        ON oi.order_id = o.id AND oi.is_cancelled = 0
      WHERE  
        o.fooder_id = ? 
        AND o.creation_date BETWEEN ? AND ?
        AND o.status != 4 
        AND o.is_cancelled = 0
      GROUP BY 
        o.id, o.order_number_qrcode, o.order_number, o.table_id, ft.table_name, o.creation_date, o.order_date, 
        o.eater_name, o.eater_phonenumber, o.total, o.payment_status, o.payment_type, o.status, o.order_mode, 
        o.subtotal, o.service_charge_details, o.tax_details, o.discount_type, o.round_up_amount, o.discount_rate, 
        o.packaging_fee, o.delivery_charge, o.order_type, o.is_split
      ORDER BY 
        o.creation_date DESC;
    `;

    const [getLiveOrderResult] = await connection.query(getLiveOrderQuery, [
      req.staff.fooder_id,
      openTimestamp,
      closeTimestamp,
    ]);

    if (getLiveOrderResult.length === 0) {
      connection.release();
      return res.status(200).send({ status: "success", message: "Data Not Available.." });
    }

    // Helper to get total tax for split bills
    async function getTotalTax(order_id, fooder_id, connection) {
      const [rows] = await connection.query(
        `SELECT total_tax FROM orders_bills WHERE order_id = ? AND fooder_id = ?`,
        [order_id, fooder_id]
      );
      let totaltax = 0;
      for (const row of rows) {
        totaltax += Number(row.total_tax || 0);
      }
      return totaltax;
    }

    // Helper for status labels
    function getOrderStatusLabel(status) {
      if (status === 0) return "Pending";
      if (status === 1) return "Accept and prepare order";
      if (status === 2) return "Order Ready";
      if (status === 3) return "Delivered and paid";
      if (status === 4) return "Reject";
      return "";
    }
    function getOrderModeLabel(order_mode) {
      if (order_mode === 0) return "QR Code";
      if (order_mode === 1) return "Online";
      if (order_mode === 2) return "POS";
      if (order_mode === 3) return "MOBILE POS";
      if (order_mode === 4) return "POS";
      return "";
    }
    function getPaymentStatusLabel(payment_status, payment_type) {
      if (payment_status === 0) return "Unpaid";
      if (payment_status === 1) return `Paid by ${payment_type ? payment_type.toUpperCase() : ""}`;
      if (payment_status === 2) return "Hold";
      if (payment_status === 3) return "Partial";
      return "";
    }

    const modifiedData = [];
    for (const order of getLiveOrderResult) {
      // Don't send data if bill is split and payment_status !== 1
      if (order.is_split == 1 && order.payment_status != 1) {
        continue;
      }

      // If is_split == 1 and paid, only send data + totaltax + labels, and do NOT calculate taxes
      if (order.is_split == 1 && order.payment_status == 1) {
        const totaltax = await getTotalTax(order.id, req.staff.fooder_id, connection);
        // For split bill, do not recalculate taxes, just add totaltax
        modifiedData.push({
          ...order,
          totaltax,
          order_status_lable: getOrderStatusLabel(order.status),
          order_mode_label: getOrderModeLabel(order.order_mode),
          payment_status_label: getPaymentStatusLabel(order.payment_status, order.payment_type)
        });
        continue;
      }

      // Normal calculation for non-split or unpaid split
      const orderItems = await fetchOrderItemsData(
        req.staff.fooder_id,
        order.id,
        connection
      );

      let serviceChargeDetails = { percentage: 0 };
      if (order.service_charge_details !== null) {
        try {
          serviceChargeDetails = JSON.parse(order.service_charge_details);
        } catch (e) {
          serviceChargeDetails = { percentage: 0 };
        }
        if (!serviceChargeDetails.percentage) {
          serviceChargeDetails.percentage = 0;
        }
      } else {
        serviceChargeDetails = { percentage: 0 };
      }

      let withOutTaxPrice = 0;
      let subTotal = 0;
      let tempDiscount = 0;
      let tempDiscountRow = 0;
      let tempServicCharge = 0;
      let tempServicChargeRow = 0;
      let tempTax = 0;
      let packingCharges = 0;

      let withOutTaxPriceForAmount = 0;
      let subTotalForAmount = 0;
      let discountRateForAmount = 0;

      if (order.discount_type === 1) {
        orderItems.forEach((i) => {
          if (i.product_proprice) {
            withOutTaxPriceForAmount =
              parseInt(i.item_tax_type) === 0
                ? parseFloat(i.product_proprice)
                : (parseFloat(i.product_proprice) * parseFloat(100)) /
                (parseFloat(100) + parseFloat(i.item_tax_percent));
          } else {
            withOutTaxPriceForAmount =
              parseInt(i.item_tax_type) === 0
                ? parseFloat(i.product_price)
                : (parseFloat(i.product_price) * parseFloat(100)) /
                (parseFloat(100) + parseFloat(i.item_tax_percent));
          }
          subTotalForAmount += i.quantity * withOutTaxPriceForAmount;
        });
        discountRateForAmount = (parseFloat(order.discount_rate) * 100) / subTotalForAmount;
      }

      orderItems.forEach((i) => {
        packingCharges += i.quantity * parseFloat(i.packaging_fee);

        if (i.product_proprice) {
          withOutTaxPrice =
            parseInt(i.item_tax_type) === 0
              ? parseFloat(i.product_proprice)
              : (parseFloat(i.product_proprice) * parseFloat(100)) /
              (parseFloat(100) + parseFloat(i.item_tax_percent));
        } else {
          withOutTaxPrice =
            parseInt(i.item_tax_type) === 0
              ? parseFloat(i.product_price)
              : (parseFloat(i.product_price) * parseFloat(100)) /
              (parseFloat(100) + parseFloat(i.item_tax_percent));
        }

        subTotal += i.quantity * withOutTaxPrice;

        if (order.discount_type === 0) {
          tempDiscount += ((i.quantity * withOutTaxPrice) * parseFloat(order.discount_rate)) / 100;
          tempDiscountRow = ((i.quantity * withOutTaxPrice) * parseFloat(order.discount_rate)) / 100;
        } else {
          tempDiscount += ((i.quantity * withOutTaxPrice) * parseFloat(discountRateForAmount)) / 100;
          tempDiscountRow = ((i.quantity * withOutTaxPrice) * parseFloat(discountRateForAmount)) / 100;
        }

        tempServicCharge += (((i.quantity * withOutTaxPrice) - tempDiscountRow) * parseFloat(serviceChargeDetails.percentage)) / 100;
        tempServicChargeRow = (((i.quantity * withOutTaxPrice) - tempDiscountRow) * parseFloat(serviceChargeDetails.percentage)) / 100;

        tempTax += (((i.quantity * withOutTaxPrice) + tempServicChargeRow - tempDiscountRow) * parseFloat(i.item_tax_percent)) / 100;
      });

      let grandTotal = 0;
      if (order.order_type != "dine_in") {
        grandTotal = (
          parseFloat(subTotal + tempServicCharge - tempDiscount + tempTax) +
          parseFloat(packingCharges) +
          order.round_up_amount
        ).toFixed(2);
      } else {
        grandTotal = (subTotal + tempServicCharge - tempDiscount + tempTax + order.round_up_amount).toFixed(2);
      }

      order.total = grandTotal;

      if (order.created_by && typeof order.created_by === "string") {
        try {
          order.created_by = JSON.parse(order.created_by);
        } catch (e) {
          order.created_by = {};
        }
      } else if (typeof order.created_by !== "object" || order.created_by === null) {
        order.created_by = {};
      }

      // Always send labels
      order.order_status_lable = getOrderStatusLabel(order.status);
      order.order_mode_label = getOrderModeLabel(order.order_mode);
      order.payment_status_label = getPaymentStatusLabel(order.payment_status, order.payment_type);

      modifiedData.push(order);
    }

    connection.release();
    return res.status(200).send({
      status: "success",
      data: modifiedData,
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



exports.getOrderDetails = async (req, res) => {
  let order_mode_label;
  let tax_details;
  let delivery_charge;
  let delivery_guy = [];
  let payment_type;
  let discount_type;
  let order_status_lable;
  const connection = await db.getConnection();

  try {
    const oDetailsQuery = `select * from orders where id = ? and fooder_id = ?`;
    const fooderDetailsQuery = `SELECT 
      f.address, 
      f.landline, 
      f.city,
      f.zipcode,
      f.billing_notes,
      name2,
      CASE
          WHEN s.name IS NULL THEN ''
          ELSE COALESCE(s.name, 'Unknown')
      END AS state
    FROM fooders f
    LEFT JOIN states s ON f.state = s.id
    WHERE f.fooder_id = ?
    `;
    const [fDetailsResult] = await connection.query(fooderDetailsQuery, [
      req.staff.fooder_id,
    ]);

    const [oDetailsResult] = await connection.query(oDetailsQuery, [
      req.query.id,
      req.staff.fooder_id,
    ]);

    const [tableDetails] = await connection.query(
      `select type,table_no,table_name from fooders_tables where id = ?`,
      [oDetailsResult[0].table_id]
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

    if (oDetailsResult[0].delivery_guy_id > 0) {
      const deliveryGuyQuery = `select id,name,phone_number from delivery_guys where id =?`;
      const [deliveryGuyResult] = await connection.query(deliveryGuyQuery, [
        oDetailsResult[0].delivery_guy_id,
      ]);
      if (deliveryGuyResult.length > 0) {
        delivery_guy = deliveryGuyResult;
      }
    }

    if (oDetailsResult[0].order_mode === 0) {
      order_mode_label = "QR Code";
    } else if (oDetailsResult[0].order_mode === 1) {
      order_mode_label = "Online";
      table_no = "";
    } else if (oDetailsResult[0].order_mode === 2) {
      order_mode_label = "POS";
    } else if (oDetailsResult[0].order_mode === 3) {
      order_mode_label = "MOBILE POS";
    } else if (oDetailsResult[0].order_mode === 4) {
      order_mode_label = "POS";
    }

    if (oDetailsResult[0].discount_type === 0) {
      discount_type = "percent";
    } else {
      discount_type = "amount";
    }

    if (oDetailsResult[0].status === 0) {
      order_status_lable = "Pending";
    } else if (oDetailsResult[0].status === 1) {
      order_status_lable = "Accept and prepare order";
    } else if (oDetailsResult[0].status === 2) {
      order_status_lable = "Order Ready";
    } else if (oDetailsResult[0].status === 3) {
      order_status_lable = "Delivered and paid";
    } else if (oDetailsResult[0].status === 4) {
      order_status_lable = "Reject";
    }

    ////////////////////////////////////////////////////////////////////////////////
    // Add this query to retrieve order items
    const orderItemsQuery = `SELECT * FROM order_items WHERE order_id = ?  ORDER BY id ASC`;
    const [orderItemsResult] = await connection.query(orderItemsQuery, [
      oDetailsResult[0].id,
    ]);

    const service_charge_details = JSON.parse(
      oDetailsResult[0].service_charge_details
    );
    const taxParseData = oDetailsResult[0].tax_details;
    tax_details =
      oDetailsResult[0].tax_details !== ""
        ? JSON.parse(oDetailsResult[0].tax_details)
        : taxParseData;

    if (oDetailsResult[0].delivery_charge == 0) {
      delivery_charge = "FREE";
    } else {
      delivery_charge = oDetailsResult[0].delivery_charge;
    }

    if (oDetailsResult[0].payment_type !== "") {
      payment_type = oDetailsResult[0].payment_type;
    } else {
      payment_type = "";
    }

    const [partialPaymentDetails] = await connection.query(
      `select id, paid_amount,payment_type,txn_refrence_number from orders_payment where order_id = ?`,
      [req.query.id]
    );
    const modifiedPaymentDetails = partialPaymentDetails.map((payment) => ({
      id: payment.id,
      paidAmount: payment.paid_amount,
      paymentType: payment.payment_type,
      txnReferenceNumber: payment.txn_reference_number,
    }));
    let payment_status_label;
    if (oDetailsResult[0].payment_status === 0) {
      payment_status_label = "Unpaid";
    } else if (oDetailsResult[0].payment_status === 1) {
      payment_status_label = `Paid`;
    } else if (oDetailsResult[0].payment_status === 2) {
      payment_status_label = `Hold`;
    } else if (oDetailsResult[0].payment_status === 3) {
      payment_status_label = `Partial`;
    }

    const [splitBills] = await connection.query(
      `SELECT order_id, bill_no, payment_data, amount_data, items_data, customer_data, total_tax 
       FROM orders_bills 
       WHERE fooder_id = ? AND order_id = ?`,
      [req.staff.fooder_id, req.query.id]
    );

    const is_split = splitBills.length > 0;

    // Parse JSON fields for each row with proper null checks
    const splitBillsNew = splitBills.map(row => ({
      items_details: row.items_data ? JSON.parse(row.items_data) : null,
      payment_details: row.payment_data ? JSON.parse(row.payment_data) : null,
      amount_details: row.amount_data ? JSON.parse(row.amount_data) : null,
      customer_details: row.customer_data ? JSON.parse(row.customer_data) : null,
      bill_number: row.bill_no
    }));

    // Calculate totaltax if is_split
    let totaltax = 0;
    if (is_split) {
      for (const row of splitBills) {
        totaltax += Number(row.total_tax || 0);
      }
    }

    const [getFoodersDetails] = await connection.query(
      `SELECT logo as fooder_logo 
       FROM fooders_details 
       WHERE fooder_id = ? `,
      [req.staff.fooder_id]
    );

    connection.release();

    if (oDetailsResult) {
      const responseData = {
        fooder_id: oDetailsResult[0].fooder_id,
        fooders_name: oDetailsResult[0].fooder_name,
        order_type: oDetailsResult[0].order_type,
        id: oDetailsResult[0].id,
        table_id: oDetailsResult[0].table_id,
        table_no: table_no,
        fooders_gstin: req.staff.gstin,
        fooders_fssai_number: req.staff.fssai_number,
        status: oDetailsResult[0].status,
        status_lable: order_status_lable,
        creation_date: oDetailsResult[0].creation_date,
        details: orderItemsResult,
        address: oDetailsResult[0].address,
        eater_name: oDetailsResult[0].eater_name
          ? oDetailsResult[0].eater_name
          : "",
        eater_phonenumber: oDetailsResult[0].eater_phonenumber
          ? oDetailsResult[0].eater_phonenumber
          : "",
        eater_suggestions: oDetailsResult[0].eater_suggestions,
        order_number: oDetailsResult[0].order_number,
        order_number_qrcode: oDetailsResult[0].order_number_qrcode,
        order_mode_label: order_mode_label,
        service_charge: oDetailsResult[0].service_charge,
        service_charge_details: service_charge_details,
        subtotal: oDetailsResult[0].subtotal,
        round_up_amount: oDetailsResult[0].round_up_amount,
        tax_details: tax_details,
        delivery_charge: delivery_charge,
        delivery_guy: delivery_guy,
        payment_type: payment_type,
        payment_status: oDetailsResult[0].payment_status,
        payment_status_label: payment_status_label,
        discount_rate: oDetailsResult[0].discount_rate,
        coupon_code: oDetailsResult[0].coupon_code,
        is_cancelled: oDetailsResult[0].is_cancelled,
        cancelled_reason: oDetailsResult[0].cancelled_reason,
        discount_type: discount_type,
        packaging_fee: oDetailsResult[0].packaging_fee,
        f_address: fDetailsResult[0].address ? fDetailsResult[0].address : "",
        f_landline: fDetailsResult[0].landline
          ? fDetailsResult[0].landline
          : "",
        f_city: fDetailsResult[0].city ? fDetailsResult[0].city : "",
        f_state: fDetailsResult[0].state ? fDetailsResult[0].state : "",
        f_zipcode: fDetailsResult[0].zipcode ? fDetailsResult[0].zipcode : "",
        billing_notes: fDetailsResult[0].billing_notes
          ? fDetailsResult[0].billing_notes
          : "",
        fooder_logo: getFoodersDetails[0].fooder_logo
          ? `${config.IMAGE_PATH}/fooders/${req.staff.fooder_id}/logo/${getFoodersDetails[0].fooder_logo}`
          : "",
        Fooder_name2: fDetailsResult[0].name2 ? fDetailsResult[0].name2 : "",
        invoice_number: oDetailsResult[0].invoice_no
          ? `${config.invoice_number_prefix}${oDetailsResult[0].invoice_no}`
          : "",
        totalPerson: oDetailsResult[0].no_of_eaters
          ? oDetailsResult[0].no_of_eaters
          : "",
        partialPaymentDetail: modifiedPaymentDetails
          ? modifiedPaymentDetails
          : [],
        holdReason: oDetailsResult[0].unpaid_reason
          ? oDetailsResult[0].unpaid_reason
          : "",
        splitBillsData: splitBillsNew,
        is_split
      };
      // If is_split, add totaltax
      if (is_split) {
        responseData.totaltax = totaltax;
      }
      return res.status(200).send({
        status: "success",
        data: responseData,
      });
    }
  } catch (error) {
    if (connection) {
      connection.release();
    }
    console.log(error);
    res.status(500).json({
      message: "Internal server error",
      errors: error.toString(),
    });
  }
};


/**
 * Void bill controller by fooder_id and table_id.
 * If order is generated, mark order and items as cancelled.
 * If only KOT is generated, mark all KOTs as cancelled.
 */
exports.voidBillByTable = async (req, res) => {
  const { fooder_id, table_id, passcode } = req.body;

  if (fooder_id !== req.staff.fooder_id) {
    return res.status(403).send({
      status: "fail",
      message: "Fooder Id is missing from frontend"
    });
  }
  const connection = await db.getConnection();

  try {
    // Validate passcode
    const staffResult = await getAndValidateStaff(req, connection, passcode);
    if (staffResult.error) {
      connection.release();
      return res.status(staffResult.error.code).json({ status: 'fail', message: staffResult.error.message });
    }
    const staff = staffResult.staff;
    const void_passcode = staff.staff_id;
    const void_login = req.staff.id;
    // Get current date/time in IST (Indian Standard Time)
    const istDate = new Date(Date.now());
    const pad = n => n < 10 ? '0' + n : n;
    const void_date = `${istDate.getFullYear()}-${pad(istDate.getMonth() + 1)}-${pad(istDate.getDate())} ${pad(istDate.getHours())}:${pad(istDate.getMinutes())}:${pad(istDate.getSeconds())}`;

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

    // 1. Check for KOTs not assigned to any order
    const [kotRows] = await connection.query(
      `SELECT id FROM fooders_kot 
         WHERE fooder_id = ? AND table_id = ? 
           AND status NOT IN (4,5) AND is_deleted = 0 AND is_cancelled = 0
           AND id NOT IN (SELECT product_kot_id FROM order_items)`,
      [fooder_id, table_id]
    );

    if (kotRows.length > 0) {
      // Cancel all KOTs
      const kotIds = kotRows.map(k => k.id);
      await connection.query(
        `UPDATE fooders_kot SET is_cancelled = 1, void_passcode = ?, void_login = ?, void_date = ? WHERE id IN (${kotIds.join(",")}) AND fooder_id = ?`,
        [void_passcode, void_login, void_date, fooder_id]
      );
      // Free the table
      await connection.query(
        `UPDATE fooders_tables SET is_booked = 0, booked_by = '{}' WHERE id = ? AND fooder_id = ?`,
        [table_id, fooder_id]
      );
      connection.release();
      return res.status(200).send({
        status: "success",
        message: "KOT has been voided successfully",
        kot_ids: kotIds
      });
    } else {
      // No KOTs, check for active order on this table
      const [orderRows] = await connection.query(
        `SELECT id, is_split, order_number_qrcode FROM orders 
         WHERE fooder_id = ? AND table_id = ? AND is_cancelled = 0 AND status !=4 AND status != 5
         ORDER BY CAST(creation_date AS UNSIGNED) DESC LIMIT 1`,
        [fooder_id, table_id]
      );

      if (orderRows.length > 0) {
        const orderId = orderRows[0].id;
        // if splitted then check split bills payment status
        if (orderRows[0].is_split) {
          const [splitBills] = await connection.query(
            `SELECT payment_id FROM orders_bills WHERE order_id = ? AND fooder_id = ?`,
            [orderId, fooder_id]
          );
          // If any split bill is paid (payment_id !== 0), do not void
          const paidSplitBill = splitBills.find(bill => bill.payment_id && bill.payment_id !== 0);
          if (paidSplitBill) {
            connection.release();
            return res.status(400).send({
              status: "fail",
              message: "One or more split bills are already paid. Cannot void bill."
            });
          }
          // All split bills unpaid, delete them
          await connection.query(
            `DELETE FROM orders_bills WHERE order_id = ? AND fooder_id = ?`,
            [orderId, fooder_id]
          );
        }

        // Order exists, cancel order and its items
        await connection.query(
          `UPDATE orders SET is_cancelled = 1, cancelled_reason = 'Voided by staff', void_passcode = ?, void_login = ?, void_date = ? WHERE id = ? AND fooder_id = ?`,
          [void_passcode, void_login, void_date, orderId, fooder_id]
        );
        await connection.query(
          `UPDATE order_items SET is_cancelled = 1 WHERE order_id = ? AND fooder_id = ?`,
          [orderId, fooder_id]
        );
        // Also cancel all KOTs linked to this order's items
        const [kotIdsResult] = await connection.query(
          `SELECT DISTINCT product_kot_id FROM order_items WHERE order_id = ? AND product_kot_id IS NOT NULL AND product_kot_id != 0`,
          [orderId]
        );
        const kotIdsToCancel = kotIdsResult.map(row => row.product_kot_id).filter(Boolean);
        if (kotIdsToCancel.length > 0) {
          await connection.query(
            `UPDATE fooders_kot SET is_cancelled = 1, void_passcode = ?, void_login = ?, void_date = ? WHERE id IN (${kotIdsToCancel.join(",")}) AND fooder_id = ?`,
            [void_passcode, void_login, void_date, fooder_id]
          );
        }
        // Free the table
        await connection.query(
          `UPDATE fooders_tables SET is_booked = 0, booked_by = '{}' WHERE id = ? AND fooder_id = ?`,
          [table_id, fooder_id]
        );
        connection.release();
        return res.status(200).send({
          status: "success",
          message: `Order No.${orderRows[0].order_number_qrcode} has been voided successfully`,
          order_id: orderId,
          kot_ids: kotIdsToCancel
        });
      } else {
        // Free the table anyway (no order/KOT, but was booked)
        await connection.query(
          `UPDATE fooders_tables SET is_booked = 0, booked_by = '{}' WHERE id = ? AND fooder_id = ?`,
          [table_id, fooder_id]
        );
        connection.release();
        return res.status(404).send({
          status: "success",
          message: "No active order or KOT found, but table is now free"
        });
      }
    }
  } catch (error) {
    if (connection) connection.release();
    console.error("❌ Error in voidBillByTable:", error);
    return res.status(500).json({
      status: "fail",
      message: "Internal server error",
      errors: error.toString()
    });
  }
};




async function calculateStock(id, connection, fooder_id) {
  const [result] = await connection.query(
    `
    SELECT dish_recipes.id as dish_recipes_id, order_items.product_id, order_items.quantity,
    dish_recipes_item.raw_material_id, dish_recipes_item.quantity as item_quantity, dish_recipes_item.unit, dish_recipes_item.order_type,measurement_units.unit_name,measurement_units.unit_code
    FROM order_items
    JOIN dish_recipes ON order_items.product_id = dish_recipes.product_id
    AND order_items.variant_id = dish_recipes.variant_id
    JOIN dish_recipes_item ON dish_recipes.id = dish_recipes_item.dish_recipes_id
    JOIN measurement_units ON measurement_units.id = dish_recipes_item.unit
    WHERE order_items.order_id = ?
    `,
    [id]
  );

  const transformedResult = {};
  result.forEach((row) => {
    const {
      dish_recipes_id,
      product_id,
      quantity,
      raw_material_id,
      item_quantity,
      unit,
      order_type,
      unit_name,
      unit_code,
    } = row;

    if (!transformedResult[dish_recipes_id]) {
      transformedResult[dish_recipes_id] = {
        dish_recipes_id,
        product_id,
        quantity,
        recipe_items: [],
      };
    }

    transformedResult[dish_recipes_id].recipe_items.push({
      raw_material_id,
      item_quantity,
      unit,
      order_type,
      unit_name,
      unit_code,
    });
  });
  //console.log("transformedResult",transformedResult);

  const [stockList] = await connection.query(
    `SELECT fi.id,fi.raw_material_id,fi.raw_material_name,fi.opening_stock,fi.purchase,fi.sales,fi.closing_stock,rm.measurement_unit,rm.conversion_rate, mu.unit_name FROM fooders_inventory fi JOIN raw_materials as rm ON fi.raw_material_id = rm.id JOIN measurement_units mu ON mu.id = rm.measurement_unit_id WHERE fi.fooder_id = ? order by fi.id DESC`,
    [fooder_id]
  );

  const formattedResults = stockList.map((item) => ({
    ...item,
    raw_material_name: `${item.raw_material_name} (${item.measurement_unit})`,
  }));

  //console.log("formattedResults",formattedResults);

  // Calculate total unit based on material_data.recipe_items.raw_material_id
  const totalUnits = {};

  Object.values(transformedResult).forEach((materialItem) => {
    materialItem.recipe_items.forEach((recipeItem) => {
      const { raw_material_id, item_quantity, unit_name, unit_code } =
        recipeItem;

      const totalQuantity = item_quantity * materialItem.quantity;

      if (!totalUnits[raw_material_id]) {
        totalUnits[raw_material_id] = {
          raw_material_id,
          total_quantity: 0,
          unit_name,
          unit_code,
        };
      }

      totalUnits[raw_material_id].total_quantity += totalQuantity;
    });
  });

  ///////////////////////////////////////////////////// Fetch opening stock unit for each raw material///////////////////////////////////////////////////////////////////////////////////////////////////
  const openingStockUnits = {};
  formattedResults.forEach((item) => {
    openingStockUnits[item.raw_material_id] = {
      unit_name: item.unit_name,
      unit_code: item.unit_code,
      conversion_rate: item.conversion_rate,
    };
  });

  // Convert total_quantity to opening_stock unit
  const convertedUnits = Object.values(totalUnits).map((unit) => {
    const openingStockUnit = openingStockUnits[unit.raw_material_id];

    // Check if openingStockUnit is defined before accessing its properties
    if (openingStockUnit) {
      const convertedQuantity =
        unit.total_quantity / openingStockUnit.conversion_rate;

      return {
        raw_material_id: unit.raw_material_id,
        opening_stock_quantity: openingStockUnit.opening_stock,
        total_quantity: convertedQuantity,
      };
    } else {
      // Handle the case where openingStockUnit is undefined (optional)
      console.error(
        `Opening stock unit not found for raw_material_id ${unit.raw_material_id}`
      );
      return null;
    }
  });

  // Filter out null values (if any) from the mapped array
  const filteredConvertedUnits = convertedUnits.filter((unit) => unit !== null);

  const data = {
    stock_data: formattedResults,
    material_data: filteredConvertedUnits,
  };
  // console.log("data",data);
  let stock_data = data.stock_data;
  let material_data = data.material_data;
  let updated_stock_data = [];

  for (let stockItem of stock_data) {
    for (let materialItem of material_data) {
      if (stockItem.raw_material_id === materialItem.raw_material_id) {
        let closingStock = parseFloat(stockItem.closing_stock);
        let salesStock = parseFloat(stockItem.sales);
        let totalQuantity = materialItem.total_quantity;
        let originalClosingStock = parseFloat(stockItem.closing_stock);

        // Calculate the new closing_stock
        let newClosingStock = closingStock - totalQuantity;
        let newSalesStock = salesStock + totalQuantity;

        // Check if the closing_stock has changed significantly
        if (Math.abs(newClosingStock - originalClosingStock) > 0) {
          updated_stock_data.push({
            ...stockItem,
            closing_stock: parseFloat(newClosingStock),
            sales: parseFloat(newSalesStock),
          });
        }
      }
    }
  }
  //console.log("updated_stock_data", updated_stock_data);
  if (updated_stock_data.length > 0) {
    await connection.query(`
 UPDATE fooders_inventory
  SET 
    closing_stock = CASE
      ${updated_stock_data
        .map((item) => `WHEN id = ${item.id} THEN ${item.closing_stock}`)
        .join(" ")}
      ELSE closing_stock
    END,
    sales = CASE
      ${updated_stock_data
        .map((item) => `WHEN id = ${item.id} THEN ${item.sales}`)
        .join(" ")}
      ELSE sales
    END
  WHERE id IN (${updated_stock_data.map((item) => item.id).join(", ")}) AND fooder_id = ${fooder_id}
`);
  }

  //   connection.release();
};


// for delivery and take away orders, generate order and save bill
// exports.generateOrderAndSaveBill = async (req, res) => {
//   const {
//     details,
//     order_type,
//     subtotal,
//     service_charge,
//     service_charge_details,
//     tax_amount,
//     tax_details,
//     total,
//     table_id,
//     eater_suggestions,
//     discount_type,
//     discount_rate,
//     address,
//     cart_packing_charges,
//     eater_name,
//     eater_phonenumber,
//     delivery_guy_id,
//     order_mode,
//     delivery_charge,
//   } = req.body;

//   const time = Math.floor(Date.now() / 1000);
//   const order_number = "OD" + time;
//   const today_date = new Date().toISOString().slice(0, 10);
//   const fooder_id = req.staff.fooder_id;
//   let order_number_qrcode;
//   let eater_id = 0;
//   let status = 1;

//   const invoiceNumber = await getInvoiceNumber(fooder_id, "IN");
//   let invoiceNumberValue = invoiceNumber.split('-')[1] || invoiceNumber;
//   const connection = await pool.getConnection();

//   try {
//     if (eater_name && eater_phonenumber) {
//       const [rows] = await connection.query(
//         "SELECT eater_id FROM eaters WHERE mobile = ?",
//         [eater_phonenumber.trim()]
//       );
//       if (rows.length > 0) {
//         eater_id = rows[0].eater_id;
//       } else {
//         const [result] = await connection.query(
//           "INSERT INTO eaters (name, mobile, joining_date, joining_ip) VALUES (?, ?, ?, ?)",
//           [eater_name.trim(), eater_phonenumber.trim(), time, req.ipAddress || req.ip]
//         );
//         eater_id = result.insertId;
//       }
//     }

//     const [orderExists] = await connection.query(
//       "SELECT * FROM `orders` WHERE `fooder_id` = ? AND `order_date` = ?",
//       [fooder_id, today_date]
//     );
//     if (orderExists.length > 0) {
//       const [maxIdResult] = await connection.query(
//         "SELECT MAX(`order_number_qrcode`) AS max_id FROM `orders` WHERE `fooder_id` = ? AND `order_date` = ?",
//         [fooder_id, today_date]
//       );
//       const max_id = maxIdResult[0].max_id || 0;
//       order_number_qrcode = max_id + 1;
//     } else {
//       order_number_qrcode = config.qordernumber;
//     }

//     const safeOrderType = typeof order_type === "string" ? order_type.toLowerCase().replace(/\s+/g, "_") : "";
//     const savePosDetailsQuery = `insert into orders (fooder_id,order_number,order_number_qrcode,order_date,eater_id,eater_name,eater_phonenumber,address,details,fooder_name,order_type,subtotal,service_charge,service_charge_details,tax_amount,tax_details,total,status,ip,creation_date,order_mode,table_id,eater_suggestions,discount_type,discount_rate,delivery_guy_id,delivery_charge,invoice_no) values(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`;
//     const [savePosDetailsResult] = await connection.query(savePosDetailsQuery, [
//       fooder_id,
//       order_number,
//       order_number_qrcode,
//       today_date,
//       eater_id,
//       eater_name,
//       eater_phonenumber,
//       address,
//       JSON.stringify(details),
//       req.staff.fooder_name,
//       safeOrderType,
//       subtotal,
//       service_charge,
//       JSON.stringify(service_charge_details),
//       tax_amount,
//       JSON.stringify(tax_details),
//       total,
//       status,
//       req.ipAddress || req.ip,
//       time,
//       4,
//       table_id,
//       eater_suggestions,
//       discount_type,
//       discount_rate,
//       delivery_guy_id,
//       delivery_charge || 0,
//       invoiceNumberValue,
//     ]);

//     const saveorderItemesQuery = `insert into order_items (order_id,fooder_id,product_kot_id,fooder_name,phone,table_id,menu_id,product_id,product_type,product_name,quantity,product_price,product_proprice,product_special_note,batchid,ip,creation_date,item_tax_percent,item_tax_type,variant_id,variant_details,addons_items_details,packaging_fee, local_time) values (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`;
//     let saveorderItemesResult;
//     for (const item of details) {
//       [saveorderItemesResult] = await connection.query(saveorderItemesQuery, [
//         savePosDetailsResult.insertId,
//         fooder_id,
//         item.KOT_id,
//         req.staff.fooder_name,
//         eater_phonenumber,
//         table_id,
//         item.menu_id,
//         item.id,
//         item.product_type,
//         item.name,
//         item.quantity,
//         item.product_price,
//         item.product_proprice,
//         item.product_special_note,
//         time,
//         req.ipAddress || "127.0.0.1",
//         time,
//         item.tax_percent,
//         item.tax_type,
//         item.selectedvariants && item.selectedvariants.variantId
//           ? JSON.stringify(item.selectedvariants.variantId)
//           : 0,
//         item.selectedvariants ? JSON.stringify(item.selectedvariants) : null,
//         item.selectedAddons ? JSON.stringify(item.selectedAddons) : null,
//         item.packaging_charges ? Number(item.packaging_charges) : 0,
//         item.local_id,
//       ]);
//     }

//     const saveEaterTableDataQuery = `update eaters set name = ?,address=?,mobile = ? where eater_id = ?`;
//     await connection.query(
//       saveEaterTableDataQuery,
//       [eater_name, address, eater_phonenumber, eater_id]
//     );

//     await calculateStock(
//       savePosDetailsResult.insertId,
//       connection,
//       req.staff.fooder_id
//     );

//     connection.release();
//     if (savePosDetailsResult && saveorderItemesResult) {
//       return res.status(200).send({
//         status: "success",
//         message: `Order saved successfully`,
//         order_id: savePosDetailsResult.insertId,
//         order_number: order_number_qrcode,
//         invoice_number: `${config.invoice_number_prefix}${invoiceNumberValue}`,
//       });
//     }
//     return res
//       .status(400)
//       .send({ status: "fail", message: "something went wrong!!!" });
//   } catch (error) {
//     if (connection) {
//       connection.release();
//     }
//     res.status(500).json({
//       message: "Internal server error",
//       errors: error.toString(),
//     });
//   }
// };

exports.generateOrderAndSaveBill = async (req, res) => {
  const {
    details,
    order_type,
    subtotal,
    service_charge,
    service_charge_details,
    tax_amount,
    tax_details,
    total,
    table_id,
    eater_suggestions,
    discount_type,
    discount_rate,
    address,
    cart_packing_charges, // already present
    eater_name,
    eater_phonenumber,
    delivery_guy_id,
    order_mode,
    delivery_charge,
    round_up_amount // ✅ new field
  } = req.body;

  const time = Math.floor(Date.now() / 1000);
  const order_number = "OD" + time;
  const today_date = new Date().toISOString().slice(0, 10);
  const fooder_id = req.staff.fooder_id;
  let order_number_qrcode;
  let eater_id = 0;
  let status = 1;

  const invoiceNumber = await getInvoiceNumber(fooder_id, config.invoice_number_prefix);
  let invoiceNumberValue = invoiceNumber.split('-')[1];
  const connection = await pool.getConnection();

  try {
    if (eater_name && eater_phonenumber) {
      const [rows] = await connection.query(
        "SELECT eater_id FROM eaters WHERE mobile = ?",
        [eater_phonenumber.trim()]
      );
      if (rows.length > 0) {
        eater_id = rows[0].eater_id;
      } else {
        const [result] = await connection.query(
          "INSERT INTO eaters (name, mobile, joining_date, joining_ip) VALUES (?, ?, ?, ?)",
          [eater_name.trim(), eater_phonenumber.trim(), time, req.ipAddress]
        );
        eater_id = result.insertId;
      }
    }

    const [orderExists] = await connection.query(
      "SELECT * FROM `orders` WHERE `fooder_id` = ? AND `order_date` = ?",
      [fooder_id, today_date]
    );
    if (orderExists.length > 0) {
      const [maxIdResult] = await connection.query(
        "SELECT MAX(`order_number_qrcode`) AS max_id FROM `orders` WHERE `fooder_id` = ? AND `order_date` = ?",
        [fooder_id, today_date]
      );
      const max_id = maxIdResult[0].max_id || 0;
      order_number_qrcode = max_id + 1;
    } else {
      order_number_qrcode = config.qordernumber;
    }

    const safeOrderType = typeof order_type === "string" ? order_type.toLowerCase().replace(/\s+/g, "_") : "";

    // ✅ Added round_up_amount & packaging_fee (cart_packing_charges) in insert query
    const savePosDetailsQuery = `
      INSERT INTO orders (
        fooder_id, order_number, order_number_qrcode, order_date, eater_id, eater_name, eater_phonenumber, address, details,
        fooder_name, order_type, subtotal, service_charge, service_charge_details, tax_amount, tax_details, total, status,
        ip, creation_date, order_mode, table_id, eater_suggestions, discount_type, discount_rate, delivery_guy_id, delivery_charge,
        invoice_no, round_up_amount, packaging_fee
      ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
    `;

    const [savePosDetailsResult] = await connection.query(savePosDetailsQuery, [
      fooder_id,
      order_number,
      order_number_qrcode,
      today_date,
      eater_id,
      eater_name,
      eater_phonenumber,
      address,
      JSON.stringify(details),
      req.staff.fooder_name,
      safeOrderType,
      subtotal,
      service_charge,
      JSON.stringify(service_charge_details),
      tax_amount,
      JSON.stringify(tax_details),
      total,
      status,
      req.ipAddress,
      time,
      4,
      table_id,
      eater_suggestions,
      discount_type,
      discount_rate,
      delivery_guy_id,
      delivery_charge || 0,
      invoiceNumberValue,
      round_up_amount ? Number(round_up_amount).toFixed(2) : 0, // ✅ two decimal fix
      cart_packing_charges || 0 // ✅ packaging_fee value
    ]);

    const saveorderItemesQuery = `
      INSERT INTO order_items (
        order_id, fooder_id, product_kot_id, fooder_name, phone, table_id, menu_id, product_id, product_type, product_name, quantity,
        product_price, product_proprice, product_special_note, batchid, ip, creation_date, item_tax_percent, item_tax_type,
        variant_id, variant_details, addons_items_details, packaging_fee, local_time
      ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
    `;

    let saveorderItemesResult;
    for (const item of details) {
      [saveorderItemesResult] = await connection.query(saveorderItemesQuery, [
        savePosDetailsResult.insertId,
        fooder_id,
        item.KOT_id,
        req.staff.fooder_name,
        eater_phonenumber,
        table_id,
        item.menu_id,
        item.id,
        item.product_type,
        item.name,
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
        item.packaging_charges ? Number(item.packaging_charges) : 0,
        item.local_id,
      ]);
    }

    await connection.query(
      `UPDATE eaters SET name = ?, address = ?, mobile = ? WHERE eater_id = ?`,
      [eater_name, address, eater_phonenumber, eater_id]
    );

    await calculateStock(savePosDetailsResult.insertId, connection, req.staff.fooder_id);

    const [tableDetails] = await connection.query(
      `select type,table_no,table_name from fooders_tables where id = ?`,
      [table_id]
    );

    let table_no;

    // if (tableDetails.length > 0) {
    //   const type = tableDetails[0].type;
    //   if (type === 0 || type === 2) {
    //     if (tableDetails[0].table_name) {
    //       table_no = `${tableDetails[0].table_name}-${tableDetails[0].table_no}`;
    //     }
    //   } else {
    //     if (tableDetails[0].table_name) {
    //       table_no = `${tableDetails[0].table_name}-${tableDetails[0].table_no}`;
    //     }
    //   }
    // }


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
    if (savePosDetailsResult && saveorderItemesResult) {
      return res.status(200).send({
        status: "success",
        message: `Order saved successfully`,
        order_id: savePosDetailsResult.insertId,
        order_number: order_number_qrcode,
        invoice_number: `${config.invoice_number_prefix}${invoiceNumberValue}`,
        table_no: table_no,
      });
    }
    return res.status(400).send({ status: "fail", message: "something went wrong!!!" });
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



exports.getOrderItemsByOrderId = async (req, res) => {
  try {
    const order_id = req.query.id; // Get from query parameter (?id=858)
    const fooder_id = req.staff?.fooder_id; // Get from authenticated staff

    if (!fooder_id) {
      return res.status(400).json({
        success: false,
        message: 'Staff authentication failed - missing fooder_id'
      });
    }

    if (!order_id) {
      return res.status(400).json({
        success: false,
        message: 'Order ID is required as query parameter'
      });
    }

    // Get database connection from pool
    const connection = await db.getConnection();

    try {
      const result = await getOrderItemsByOrderIdUtils(connection, fooder_id, order_id);

      // Fetch table_no using table_id
      // console.log('result:', result);
      const table_id = result.table_id;
      let table_no = '';
      if (table_id) {
        const [tableRows] = await connection.query(
          `SELECT type, table_no, table_name FROM fooders_tables WHERE id = ?`,
          [table_id]
        );
        if (tableRows.length > 0) {
          const table = tableRows[0];
          if (table.type === 0 || table.type === 2) {
            table_no = table.table_name
              ? `${table.table_name}-${table.table_no}`
              : `Table No - ${table.table_no}`;
          } else {
            table_no = `${table.table_no}`;
          }
        }
      }

      if (result.items.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'No items found for this order'
        });
      }

      return res.status(200).json({
        success: true,
        data: result,
        table_no: table_no,
        message: 'Order items retrieved successfully'
      });
    } finally {
      // Release the connection back to the pool
      if (connection) connection.release();
    }
  } catch (error) {
    console.error('Error in getOrderItemsHandler:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

exports.updateLiveOrderAction = async (req, res) => {
  const { id, status, order_preparation_time } = req.body;
  const fooder_id = req.staff.fooder_id;
  const connection = await db.getConnection();

  try {
    // Check if order exists
    const [[currentIdResult]] = await connection.query(
      `SELECT id FROM orders WHERE id = ?`,
      [id]
    );

    if (!currentIdResult) {
      connection.release();
      return res.status(400).send({
        status: "error",
        message: "Order does not exist",
      });
    }

    // Check current order status
    const [[currentStatusResult]] = await connection.query(
      `SELECT status FROM orders WHERE id = ?`,
      [id]
    );

    // Prevent duplicate status updates
    if (currentStatusResult.status === 1 && (status === 1 || status === 4)) {
      connection.release();
      return res.status(200).send({
        status: "info",
        message: "Order is already accepted",
      });
    } else if (currentStatusResult.status === 4 && (status === 1 || status === 4)) {
      connection.release();
      return res.status(200).send({
        status: "info",
        message: "Order is already rejected",
      });
    }

    // Prepare update query based on whether preparation time is provided
    let statusUpdateQuery, statusUpdateQueryArray;
    if (order_preparation_time) {
      statusUpdateQuery = `UPDATE orders SET status = ?, order_preparation_time = ? WHERE id = ? AND fooder_id = ?`;
      statusUpdateQueryArray = [status, order_preparation_time, id, fooder_id];
    } else {
      statusUpdateQuery = `UPDATE orders SET status = ? WHERE id = ? AND fooder_id = ?`;
      statusUpdateQueryArray = [status, id, fooder_id];
    }

    // Get order details for reference
    const [[orderDetails]] = await connection.query(
      `SELECT table_id, eater_id, order_number_qrcode FROM orders WHERE id = ?`,
      [id]
    );

    // Handle different status updates
    if (status === 4) { // Rejected status
      const [statusUpdateResult] = await connection.query(
        statusUpdateQuery,
        statusUpdateQueryArray
      );

      if (statusUpdateResult.affectedRows === 0) {
        connection.release();
        return res.status(400).send({
          status: "fail",
          message: "Status not updated",
        });
      }

      // Release table if it's a dine-in order
      if (orderDetails.table_id) {
        await connection.query(
          `UPDATE fooders_tables ft 
           SET ft.is_booked = 0, ft.booked_by = '{}' 
           WHERE ft.id = ? AND ft.fooder_id = ?`,
          [orderDetails.table_id, req.staff.fooder_id]
        );
      }

      connection.release();
      return res.status(200).send({
        status: "success",
        message: `Order #${orderDetails.order_number_qrcode} rejected successfully`,
      });

    } else if (status === 1) { // Accepted status
      // Generate KOT for accepted orders
      const kot_unique_number = await generateUniqueAlphanumericID(12, connection);
      const kot_prefix = "KOT";
      const today_date = new Date().toISOString().slice(0, 10);
      const time = Math.floor(Date.now() / 1000);

      // Get order items for KOT
      const [orderItems] = await connection.query(
        `SELECT * FROM order_items WHERE order_id = ?`,
        [id]
      );

      // Generate KOT number
      const [KOTExists] = await connection.query(
        "SELECT * FROM fooders_kot WHERE fooder_id = ? AND kot_date = ?",
        [req.staff.fooder_id, today_date]
      );

      let kot_no = KOTExists.length > 0
        ? (await connection.query(
          "SELECT MAX(kot_number) AS max_id FROM fooders_kot WHERE fooder_id = ? AND kot_date = ?",
          [req.staff.fooder_id, today_date]
        ))[0][0].max_id + 1
        : config.kotnumber;

      // Insert KOT record
      const [generateKot] = await connection.query(
        `INSERT INTO fooders_kot 
         (fooder_id, kot_number, kot_date, kot_prefix, kot_unique_number, 
          kot_details, status, created_date, ip) 
         VALUES(?,?,?,?,?,?,?,?,?)`,
        [
          req.staff.fooder_id,
          kot_no,
          today_date,
          kot_prefix,
          kot_unique_number,
          JSON.stringify(orderItems),
          0, // Kotstatus
          time,
          req.ipAddress,
        ]
      );

      // Update order items with KOT ID
      await connection.query(
        `UPDATE order_items SET product_kot_id = ? WHERE order_id = ? AND fooder_id = ?`,
        [generateKot.insertId, id, fooder_id]
      );

      // Update order status
      const [statusUpdateResult] = await connection.query(
        statusUpdateQuery,
        statusUpdateQueryArray
      );

      if (statusUpdateResult.affectedRows === 0) {
        connection.release();
        return res.status(400).send({
          status: "fail",
          message: "Status not updated",
        });
      }

      connection.release();
      return res.status(200).send({
        status: "success",
        message: `Order #${orderDetails.order_number_qrcode} accepted successfully`,
      });

    } else if (status === 2) { // Ready status
      const [statusUpdateResult] = await connection.query(
        statusUpdateQuery,
        statusUpdateQueryArray
      );

      if (statusUpdateResult.affectedRows === 0) {
        connection.release();
        return res.status(400).send({
          status: "fail",
          message: "Status not updated",
        });
      }

      // Check if it's a dine-in order
      const [[orderTypeResult]] = await connection.query(
        `SELECT order_type FROM orders WHERE id = ?`,
        [id]
      );

      // Update KOT and item status if not dine-in
      if (orderTypeResult.order_type !== "dine_in") {
        await connection.query(
          `UPDATE fooders_kot fk
           JOIN order_items oi ON oi.product_kot_id = fk.id
           SET fk.status = 3 
           WHERE fk.status NOT IN (4, 5) 
           AND oi.fooder_id = ? 
           AND oi.order_id = ?`,
          [req.staff.fooder_id, id]
        );

        await connection.query(
          `UPDATE order_items 
           SET item_kot_status = 2 
           WHERE item_kot_status NOT IN (3, 4) 
           AND fooder_id = ? 
           AND order_id = ?`,
          [req.staff.fooder_id, id]
        );
      }

      connection.release();
      return res.status(200).send({
        status: "success",
        message: `Order #${orderDetails.order_number_qrcode} is ready`,
      });

    } else { // Other status updates
      const [statusUpdateResult] = await connection.query(
        statusUpdateQuery,
        statusUpdateQueryArray
      );

      if (statusUpdateResult.affectedRows === 0) {
        connection.release();
        return res.status(400).send({
          status: "fail",
          message: "Status not updated",
        });
      }

      connection.release();
      return res.status(200).send({
        status: "success",
        message: "Status updated successfully",
      });
    }
  } catch (error) {
    if (connection) connection.release();
    res.status(500).json({
      message: "Internal server error",
      errors: error.toString(),
    });
  }
};

// exports.discountApply = async (req, res) => {

//   const { id, discount_type, discount_rate } = req.body;
//   const connection = await db.getConnection();
//   try {

//     if (
//       !id ||
//       discount_type === undefined ||
//       !(discount_type === 0 || discount_type === 1) || // Only 0 or 1 allowed
//       discount_rate === undefined ||
//       discount_rate === null ||
//       discount_rate === '' ||
//       (typeof discount_rate === 'string' && discount_rate.trim() === '') ||
//       isNaN(discount_rate)
//     ) {
//       connection.release();
//       return res.status(400).send({
//         status: "fail",
//         message: "Valid Order ID, discount type (0 or 1), and numeric discount rate are required",
//       });
//     }


//     const [ordersCheckStatus] = await connection.query(
//       "SELECT payment_status, is_cancelled FROM orders WHERE id = ?",
//       [id]
//     );

//     if (ordersCheckStatus.length > 0) {
//       if (ordersCheckStatus[0].payment_status === 1 || ordersCheckStatus[0].payment_status === 3) {
//         connection.release();
//         return res.status(400).send({
//           status: "fail",
//           message: "Order already paid",
//         });
//       }
//       if (ordersCheckStatus[0].is_cancelled != 0) {
//         connection.release();
//         return res.status(400).send({
//           status: "fail",
//           message: "Order already cancelled!!!",
//         });
//       }
//     }

//     const updateDiscountQuery = `UPDATE orders SET discount_type = ?,discount_rate =?, round_up_amount = 0 WHERE id = ? AND fooder_id = ? AND is_cancelled = 0 AND payment_status != 1`;
//     const [result] = await connection.query(updateDiscountQuery, [
//       discount_type,
//       discount_rate,
//       id,
//       req.staff.fooder_id
//     ]);






// const [[order]] = await connection.query(
//       "SELECT * FROM orders WHERE id = ?",
//       [id]
//     );

// const orderItems = await fetchOrderItemsData(
//                req.staff.fooder_id,
//        id,
//           connection
//         );





//         let serviceChargeDetails = { percentage: 0 };

//         if (order.service_charge_details !== null) {
//           serviceChargeDetails = JSON.parse(order.service_charge_details);

//           if (!serviceChargeDetails.percentage) {
//             serviceChargeDetails.percentage = 0
//           }

//         } else {
//           serviceChargeDetails = { percentage: 0 }
//         }



//         let withOutTaxPrice = 0
//         let subTotal = 0;
//         let tempDiscount = 0;
//         let tempDiscountRow = 0;


//         let tempServicCharge = 0;
//         let tempServicChargeRow = 0;

//         let tempTax = 0;
//         // let tempTaxRow = 0;


//         let packingCharges = 0;




//         //  for flate amount discount

//         let withOutTaxPriceForAmount = 0
//         let subTotalForAmount = 0;
//         let discountRateForAmount = 0;

//         if (order.discount_type === 1) {
//           orderItems.forEach((i) => {
//             if (i.product_proprice) {
//               withOutTaxPriceForAmount = parseInt(i.item_tax_type) === 0 ? parseFloat(i.product_proprice) : (parseFloat(i.product_proprice) * parseFloat(100)) / (parseFloat(100) + parseFloat(i.item_tax_percent))
//             } else {
//               withOutTaxPriceForAmount = parseInt(i.item_tax_type) === 0 ? parseFloat(i.product_price) : (parseFloat(i.product_price) * parseFloat(100)) / (parseFloat(100) + parseFloat(i.item_tax_percent))
//             }
//             subTotalForAmount += (i.quantity) * withOutTaxPriceForAmount
//           })
//           discountRateForAmount = (parseFloat(order.discount_rate) * 100) / subTotalForAmount
//         }
//         // end


//         orderItems.forEach((i) => {
//           packingCharges += i.quantity * parseFloat(i.packaging_fee)



//           if (i.product_proprice) {
//             withOutTaxPrice = parseInt(i.item_tax_type) === 0 ? parseFloat(i.product_proprice) : (parseFloat(i.product_proprice) * parseFloat(100)) / (parseFloat(100) + parseFloat(i.item_tax_percent))

//           } else {
//             withOutTaxPrice = parseInt(i.item_tax_type) === 0 ? parseFloat(i.product_price) : (parseFloat(i.product_price) * parseFloat(100)) / (parseFloat(100) + parseFloat(i.item_tax_percent))
//           }


//           subTotal += (i.quantity) * withOutTaxPrice



//           if (order.discount_type === 0) {
//             tempDiscount += (((i.quantity) * withOutTaxPrice) * parseFloat(order.discount_rate)) / 100
//             tempDiscountRow = (((i.quantity) * withOutTaxPrice) * parseFloat(order.discount_rate)) / 100
//           } else {
//             // tempDiscount += (((i.quantity) * withOutTaxPrice) - parseFloat(order.discount_rate))
//             // tempDiscountRow = (((i.quantity) * withOutTaxPrice) - parseFloat(order.discount_rate))
//             // tempDiscount += ((i.quantity * withOutTaxPrice) - ((i.quantity * withOutTaxPrice) - parseFloat(order.discount_rate))) * i.quantity
//             // tempDiscountRow = ((i.quantity * withOutTaxPrice) - ((i.quantity * withOutTaxPrice) - parseFloat(order.discount_rate))) * i.quantity
//             tempDiscount += (((i.quantity) * withOutTaxPrice) * parseFloat(discountRateForAmount)) / 100
//             tempDiscountRow = (((i.quantity) * withOutTaxPrice) * parseFloat(discountRateForAmount)) / 100
//           }


//           tempServicCharge += ((((i.quantity) * withOutTaxPrice) - tempDiscountRow) * parseFloat(serviceChargeDetails.percentage)) / 100
//           tempServicChargeRow = ((((i.quantity) * withOutTaxPrice) - tempDiscountRow) * parseFloat(serviceChargeDetails.percentage)) / 100



//           tempTax += ((((i.quantity) * withOutTaxPrice) + tempServicChargeRow - tempDiscountRow) * parseFloat(i.item_tax_percent)) / 100
//         })



//         var grandTotal = 0

//         if (order.order_type != "dine_in") {
//           grandTotal = (parseFloat(subTotal + tempServicCharge - tempDiscount + tempTax) + parseFloat(packingCharges) + order.round_up_amount).toFixed(2)
//         } else {
//           grandTotal = (subTotal + tempServicCharge - tempDiscount + tempTax + order.round_up_amount).toFixed(2);
//         }



//         console.log(grandTotal)
//         console.log("grandTotal")
       
 
//   let afterPoint = Math.round(grandTotal) - grandTotal
 

//         console.log(afterPoint)
//         console.log("afterPoint")
       
 
//       await connection.query(`UPDATE orders SET round_up_amount = ?  WHERE id = ? AND fooder_id = ?  `, [
//       afterPoint,
      
//       id,
//       req.staff.fooder_id
//     ]);




//     if (result && result.affectedRows === 0) {
//       connection.release();

//       return res
//         .status(400)
//         .send({ message: "Discount not applied, something went wrong" });
//     }

//     updateOrderAmount(req.staff.fooder_id, id, connection)
//     connection.release();

//     return res.status(200).send({
//       status: "success",
//       message: "Discount applied successfully",
//     });
//   } catch (error) {
//     connection.release();
//     if (connection) {
//       connection.release();
//     }
//     console.log(error);
//     res.status(500).json({
//       message: "Internal server error",
//       errors: error.toString(),
//     });
//   }
// };

// exports.getAllBillsToPrint = async (req, res) => {
//   try {
//     const { order_id } = req.query;
//     const fooder_id = req.staff.fooder_id;

//     if (!fooder_id || !order_id) {
//       return res.status(400).json({
//         status: 'error',
//         message: 'fooder_id and order_id are required'
//       });
//     }

//     const connection = await pool.getConnection();

//     try {
//       const [orderRows] = await connection.query(
//         `SELECT id, invoice_no,order_number_qrcode, is_split, discount_type, discount_rate, service_charge_details, table_id, payment_status, eater_name, eater_phonenumber, no_of_eaters, address, order_type 
//          FROM orders 
//          WHERE id = ? AND fooder_id = ? AND is_cancelled = 0 AND status != 4 LIMIT 1`,
//         [order_id, fooder_id]
//       );

//       if (orderRows.length === 0) {
//         return res.status(404).json({
//           status: 'error',
//           message: 'Order not found'
//         });
//       }

//       const order = orderRows[0];
//       const is_split = order.is_split == 1;
//       const invoiceNumber = order.invoice_no;
//       const { items: allItems } = await getOrderItemsByOrderIdUtils(connection, fooder_id, order.id);

//       // Fetch table_no using table_id
//       let table_no = '';
//       if (order.table_id) {
//         const [tableRows] = await connection.query(
//           `SELECT type, table_no, table_name FROM fooders_tables WHERE id = ?`,
//           [order.table_id]
//         );
//         if (tableRows.length > 0) {
//           const table = tableRows[0];
//           if (table.type === 0) {
//             table_no = table.table_name
//               ? `${table.table_name}-${table.table_no}`
//               : `Table No - ${table.table_no}`;
//           } else {
//             table_no = `${table.table_no}`;
//           }
//         }
//       }

//       const calculateBillSummary = (items, amountData = null) => {
//         if (amountData) {
//           const {
//             subTotal = 0,
//             discountDetails = {},
//             schDetails = {},
//             schAmount = 0,
//             taxDetails = [],
//             taxAmount = 0,
//             packingCharges = 0,
//             total = 0
//           } = amountData;

//           const taxSlabs = {};
//           for (const tax of taxDetails || []) {
//             const slabKey = `${tax.percentage}%`;
//             taxSlabs[slabKey] = (taxSlabs[slabKey] || 0) + Number(tax.amount || 0);
//           }

//           return {
//             subTotal: Number(subTotal),
//             discount: Number(discountDetails.discountAmount || 0),
//             schDetails: schDetails || { name: "SCH", percentage: 0 },
//             schAmount: Number(schAmount),
//             taxSlabs,
//             taxAmount: Number(taxAmount),
//             packingCharges: Number(packingCharges),
//             total: Number(total)
//           };
//         }

//         let subtotal = 0;
//         let packingCharges = 0;
//         const itemsWithTaxInfo = [];

//         // First pass: Calculate subtotal and individual item taxes
//         for (const item of items) {
//           const price = Number(item.price);
//           const taxPercent = Number(item.tax_percent || 0);
//           const quantity = Number(item.quantity || 1);
//           const taxType = Number(item.tax_type || 0);
//           const packaging = Number(item.packaging_fee || 0);

//           let itemSubtotal = 0;
//           let itemTaxAmount = 0;

//           if (taxType === 0) {
//             // Tax excluded - simple calculation
//             itemSubtotal = price * quantity;
//             itemTaxAmount = (itemSubtotal * taxPercent) / 100;
//           } else {
//             // Tax included - need to extract tax from price
//             const basePrice = price / (1 + taxPercent / 100);
//             itemSubtotal = basePrice * quantity;
//             itemTaxAmount = price * quantity - itemSubtotal;
//           }

//           subtotal += itemSubtotal;
//           packingCharges += packaging * quantity;

//           itemsWithTaxInfo.push({
//             ...item,
//             itemSubtotal,
//             itemTaxAmount,
//             taxPercent,
//             taxType
//           });
//         }

//         // Calculate discount
//         let discount = 0;
//         if (order.discount_type === 0) {
//           discount = (order.discount_rate / 100) * subtotal;
//         } else if (order.discount_type === 1) {
//           discount = order.discount_rate;
//         }
//         discount = Math.min(discount, subtotal);
//         const subtotalAfterDiscount = subtotal - discount;

//         // Calculate Service Charge (SCH)
//         let schAmount = 0;
//         let schDetails = { name: "SCH", percentage: 0 };
//         try {
//           const sch = typeof order.service_charge_details === 'string' 
//             ? JSON.parse(order.service_charge_details)
//             : order.service_charge_details;

//           if (sch?.percentage) {
//             schAmount = (subtotalAfterDiscount * sch.percentage) / 100;
//             schDetails = sch;
//           }
//         } catch (_) {}

//         // Group items by tax percentage
//         const taxGroups = {};
//         itemsWithTaxInfo.forEach(item => {
//           if (!taxGroups[item.taxPercent]) {
//             taxGroups[item.taxPercent] = [];
//           }
//           taxGroups[item.taxPercent].push(item);
//         });

//         const taxSlabs = {};
//         let taxAmount = 0;

//         // Calculate taxes for each group
//         for (const [percentStr, groupItems] of Object.entries(taxGroups)) {
//           const taxPercent = Number(percentStr);
//           let groupTax = 0;

//           // Calculate tax for tax-excluded items
//           const taxExcludedItems = groupItems.filter(i => i.taxType === 0);
//           if (taxExcludedItems.length > 0) {
//             const taxExcludedSubtotal = taxExcludedItems.reduce((sum, i) => sum + i.itemSubtotal, 0);
//             const taxExcludedDiscount = subtotal > 0 ? (taxExcludedSubtotal / subtotal) * discount : 0;
//             const taxExcludedAfterDiscount = taxExcludedSubtotal - taxExcludedDiscount;
//             const taxExcludedSCH = subtotalAfterDiscount > 0 ? (taxExcludedAfterDiscount / subtotalAfterDiscount) * schAmount : 0;
//             groupTax += (taxExcludedAfterDiscount + taxExcludedSCH) * (taxPercent / 100);
//           }

//           // Calculate tax for tax-included items
//           const taxIncludedItems = groupItems.filter(i => i.taxType === 1);
//           if (taxIncludedItems.length > 0) {
//             // For tax-included items, we need to calculate the tax on the original price plus SCH portion
//             const taxIncludedSubtotal = taxIncludedItems.reduce((sum, i) => sum + i.price * i.quantity, 0);
//             const taxIncludedItemSubtotal = taxIncludedItems.reduce((sum, i) => sum + i.itemSubtotal, 0);
//             const taxIncludedDiscount = subtotal > 0 ? (taxIncludedItemSubtotal / subtotal) * discount : 0;
//             const taxIncludedAfterDiscount = taxIncludedSubtotal - taxIncludedDiscount;
//             const taxIncludedSCH = subtotalAfterDiscount > 0 ? 
//               (taxIncludedItemSubtotal / subtotalAfterDiscount) * schAmount : 0;

//             // Calculate the effective tax base (original price + SCH)
//             const taxBase = taxIncludedAfterDiscount + taxIncludedSCH;

//             // Calculate tax amount (this ensures the tax is calculated on the total amount including SCH)
//             groupTax += taxBase - (taxBase / (1 + taxPercent / 100));
//           }

//           if (groupTax > 0) {
//             const slabKey = `${taxPercent}%`;
//             taxSlabs[slabKey] = (taxSlabs[slabKey] || 0) + groupTax;
//             taxAmount += groupTax;
//           }
//         }

//         const total = subtotalAfterDiscount + schAmount + packingCharges + taxAmount;

//         return {
//           subTotal: Number(subtotal.toFixed(2)),
//           discount: Number(discount.toFixed(2)),
//           schDetails,
//           schAmount: Number(schAmount.toFixed(2)),
//           taxSlabs: Object.fromEntries(
//             Object.entries(taxSlabs).map(([k, v]) => [k, Number(v.toFixed(2))])
//           ),
//           taxAmount: Number(taxAmount.toFixed(2)),
//           packingCharges: Number(packingCharges.toFixed(2)),
//           total: Number(total.toFixed(2)),
//         };
//       };

//       // Main bill payment status from orders.payment_status
//       let mainPaymentStatus = 'Unpaid';
//       if (order.payment_status === 1) mainPaymentStatus = 'Paid';
//       else if (order.payment_status === 3) mainPaymentStatus = 'Partial';
//       else if (order.payment_status === 2) mainPaymentStatus = 'Hold';

//       const mainBillSummary = calculateBillSummary(allItems);

//       // Add eater_details for main bill
//       const eater_details = {
//         eater_name: order.eater_name || "",
//         eater_phonenumber: order.eater_phonenumber || "",
//         no_of_eaters: order.no_of_eaters || "",
//         address: order.address || ""
//       };

//       const bills = [{
//         bill_type: 'main',
//         bill_no: invoiceNumber,
//         items: allItems,
//         summary: mainBillSummary,
//         payment_status: mainPaymentStatus,
//         eater_details, // <-- added here
//         order_type: order.order_type // <-- send order_type for main bill
//       }];

//       if (is_split) {
//         const [splitBills] = await connection.query(
//           `SELECT * FROM orders_bills WHERE order_id = ? AND fooder_id = ?`,
//           [order.id, fooder_id]
//         );

//         for (const split of splitBills) {
//           let items_data = [];
//           let amount_data = null;

//           try {
//             items_data = JSON.parse(split.items_data || '[]');
//           } catch (_) {}

//           try {
//             amount_data = JSON.parse(split.amount_data || '{}');
//           } catch (_) {}

//           const sanitizedItems = items_data.map((item) => ({
//             id: item.product_id || item.id,
//             name: item.product_name || item.name,
//             quantity: Number(item.quantity),
//             price: Number(item.product_price || item.price || 0),
//             tax_percent: Number(item.item_tax_percent || item.tax_percent || 0),
//             tax_type: Number(item.item_tax_type || item.tax_type || 0),
//             packaging_fee: Number(item.packaging_fee || 0)
//           }));

//           const splitSummary = calculateBillSummary(sanitizedItems, amount_data);

//           // Split bill payment status: paid if payment_id !== 0
//           let splitPaymentStatus = 'Unpaid';
//           if (split.payment_id && split.payment_id !== 0) splitPaymentStatus = 'Paid';

//           bills.push({
//             bill_type: 'split',
//             bill_no: split.bill_no,
//             items: sanitizedItems,
//             summary: splitSummary,
//             payment_status: splitPaymentStatus,
//             eater_details,   // <-- change here for split bills
//             order_type: order.order_type // <-- send order_type for split bill
//           });
//         }
//       }

//       return res.status(200).json({
//         status: 'success',
//         order_id: order.id,
//         order_no: order.order_number_qrcode,
//         table_no, // <-- Added table_no to response
//         is_split,
//         bills
//       });

//     } finally {
//       connection.release();
//     }

//   } catch (err) {
//     console.error('Error in getAllBillsToPrint:', err);
//     return res.status(500).json({
//       status: 'error',
//       message: 'Internal server error'
//     });
//   }
// };


exports.discountApply = async (req, res) => {
  const { id, discount_type, discount_rate } = req.body;
  const connection = await db.getConnection();

  try {
    // ---------- Input Validation ----------
    if (
      !id ||
      !(discount_type === 0 || discount_type === 1) ||
      discount_rate === undefined ||
      discount_rate === null ||
      discount_rate === '' ||
      (typeof discount_rate === 'string' && discount_rate.trim() === '') ||
      isNaN(discount_rate)
    ) {
      return res.status(400).send({
        status: "fail",
        message:
          "Valid Order ID, discount type (0 or 1), and numeric discount rate are required",
      });
    }

    // ---------- Check Order Status ----------
    const [ordersCheckStatus] = await connection.query(
      "SELECT payment_status, is_cancelled FROM orders WHERE id = ?",
      [id]
    );

    if (ordersCheckStatus.length > 0) {
      const { payment_status, is_cancelled } = ordersCheckStatus[0];

      if ([1, 3].includes(payment_status)) {
        return res.status(400).send({
          status: "fail",
          message: "Order already paid",
        });
      }

      if (is_cancelled !== 0) {
        return res.status(400).send({
          status: "fail",
          message: "Order already cancelled!!!",
        });
      }
    }

    // ---------- Apply Discount ----------
    const updateDiscountQuery = `
      UPDATE orders 
      SET discount_type = ?, discount_rate = ?, round_up_amount = 0
      WHERE id = ? AND fooder_id = ? AND is_cancelled = 0 AND payment_status != 1
    `;
    const [result] = await connection.query(updateDiscountQuery, [
      discount_type,
      discount_rate,
      id,
      req.staff.fooder_id,
    ]);

    if (!result || result.affectedRows === 0) {
      return res.status(400).send({
        status: "fail",
        message: "Discount not applied, something went wrong",
      });
    }

    // ---------- Fetch Order + Items ----------
    const [[order]] = await connection.query(
      "SELECT * FROM orders WHERE id = ?",
      [id]
    );

    const orderItems = await fetchOrderItemsData(
      req.staff.fooder_id,
      id,
      connection
    );

    // ---------- Service Charge ----------
    let serviceChargeDetails = { percentage: 0 };
    if (order.service_charge_details) {
      try {
        serviceChargeDetails = JSON.parse(order.service_charge_details);
        if (!serviceChargeDetails.percentage) {
          serviceChargeDetails.percentage = 0;
        }
      } catch {
        serviceChargeDetails = { percentage: 0 };
      }
    }

    // ---------- Totals Calculation ----------
    let subTotal = 0,
      tempDiscount = 0,
      packingCharges = 0,
      tempServiceCharge = 0,
      tempTax = 0;

    // Flat Amount Discount adjustment
    let discountRateForAmount = 0;
    if (order.discount_type === 1) {
      let subTotalForAmount = 0;
      orderItems.forEach((item) => {
        const basePrice = parseInt(item.item_tax_type) === 0
          ? parseFloat(item.product_proprice || item.product_price)
          : (parseFloat(item.product_proprice || item.product_price) * 100) /
            (100 + parseFloat(item.item_tax_percent));

        subTotalForAmount += item.quantity * basePrice;
      });
      discountRateForAmount =
        (parseFloat(order.discount_rate) * 100) / subTotalForAmount;
    }

    // ---------- Loop through Items ----------
    orderItems.forEach((item) => {
      packingCharges += item.quantity * parseFloat(item.packaging_fee);

      const basePrice = parseInt(item.item_tax_type) === 0
        ? parseFloat(item.product_proprice || item.product_price)
        : (parseFloat(item.product_proprice || item.product_price) * 100) /
          (100 + parseFloat(item.item_tax_percent));

      subTotal += item.quantity * basePrice;

      // Apply Discount
      const discountRow =
        order.discount_type === 0
          ? ((item.quantity * basePrice) * parseFloat(order.discount_rate)) / 100
          : ((item.quantity * basePrice) * parseFloat(discountRateForAmount)) / 100;

      tempDiscount += discountRow;

      // Service Charge
      const serviceChargeRow =
        ((item.quantity * basePrice - discountRow) *
          parseFloat(serviceChargeDetails.percentage)) /
        100;
      tempServiceCharge += serviceChargeRow;

      // Tax
      tempTax +=
        ((item.quantity * basePrice + serviceChargeRow - discountRow) *
          parseFloat(item.item_tax_percent)) /
        100;
    });

    // ---------- Grand Total ----------
    let grandTotal = 0;
    if (order.order_type !== "dine_in") {
      grandTotal = (
        subTotal +
        tempServiceCharge -
        tempDiscount +
        tempTax +
        packingCharges +
        order.round_up_amount
      ).toFixed(2);
    } else {
      grandTotal = (
        subTotal +
        tempServiceCharge -
        tempDiscount +
        tempTax +
        order.round_up_amount
      ).toFixed(2);
    }

    // ---------- Round-Off ----------
    const afterPoint = Math.round(grandTotal) - grandTotal;

    await connection.query(
      `UPDATE orders SET round_up_amount = ? WHERE id = ? AND fooder_id = ?`,
      [afterPoint, id, req.staff.fooder_id]
    );

    // ---------- Final Update ----------
    await updateOrderAmount(req.staff.fooder_id, id, connection);

    return res.status(200).send({
      status: "success",
      message: "Discount applied successfully",
    });
  } catch (error) {
    console.error("discountApply error:", error);
    return res.status(500).json({
      status: "error",
      message: "Internal server error",
      errors: error.toString(),
    });
  } finally {
    if (connection) connection.release();
  }
};



exports.getAllBillsToPrint = async (req, res) => {
  try {
    const { order_id } = req.query;
    const fooder_id = req.staff.fooder_id;

    if (!fooder_id || !order_id) {
      return res.status(400).json({
        status: 'error',
        message: 'fooder_id and order_id are required'
      });
    }

    const connection = await pool.getConnection();

    try {
      const [orderRows] = await connection.query(
        `SELECT id, invoice_no, order_number_qrcode, is_split, discount_type, discount_rate, 
                service_charge_details, table_id, payment_status, eater_name, eater_phonenumber, 
                no_of_eaters, address, order_type, creation_date, round_up_amount
         FROM orders 
         WHERE id = ? AND fooder_id = ? AND is_cancelled = 0 AND status != 4 LIMIT 1`,
        [order_id, fooder_id]
      );

      if (orderRows.length === 0) {
        return res.status(404).json({
          status: 'error',
          message: 'Order not found'
        });
      }

      const order = orderRows[0];
      const is_split = order.is_split == 1;
      const invoiceNumber = order.invoice_no;
      const { items: allItems } = await getOrderItemsByOrderIdUtils2(connection, fooder_id, order.id);

      
      // Fetch table_no using table_id
      let table_no = '';
      if (order.table_id) {
        const [tableRows] = await connection.query(
          `SELECT type, table_no, table_name FROM fooders_tables WHERE id = ?`,
          [order.table_id]
        );
        if (tableRows.length > 0) {
          const table = tableRows[0];
          if (table.type === 0 || table.type === 2) {
            table_no = table.table_name
              ? `${table.table_name}-${table.table_no}`
              : `Table No - ${table.table_no}`;
          } else {
            table_no = `${table.table_no}`;
          }
        }
      }

      const calculateBillSummary = (items, amountData = null, isSplitBill = false) => {
        if (amountData) {
          const {
            subTotal = 0,
            discountDetails = {},
            schDetails = {},
            schAmount = 0,
            taxDetails = [],
            taxAmount = 0,
            packingCharges = 0,
            total = 0,
            round_off_amount = 0 // <-- get round_off_amount from amountData
          } = amountData;

          const taxSlabs = {};
          for (const tax of taxDetails || []) {
            // Multiply percentage by 2 for split bills
            const slabPercent = isSplitBill ? Number(tax.percentage) * 2 : Number(tax.percentage);
            const slabKey = `${slabPercent}%`;
            taxSlabs[slabKey] = (taxSlabs[slabKey] || 0) + Number(tax.amount || 0);
          }

          return {
            subTotal: Number(subTotal),
            discount: Number(discountDetails.discountAmount || 0),
            schDetails: schDetails || { name: "SCH", percentage: 0 },
            schAmount: Number(schAmount),
            taxSlabs,
            taxAmount: Number(taxAmount),
            packingCharges: Number(packingCharges),
            total: Number(total),
            round_up_amount: Number(round_off_amount) // <-- send round_up_amount in split bill
          };
        }

        let subtotal = 0;
        let packingCharges = 0;
        const itemsWithTaxInfo = [];

        // First pass: Calculate subtotal and individual item taxes
        for (const item of items) {
          const price = Number(item.price);
          const taxPercent = Number(item.tax_percent || 0);
          const quantity = Number(item.quantity || 1);
          const taxType = Number(item.tax_type || 0);
          const packaging = Number(item.packaging_fee || 0);

          let itemSubtotal = 0;
          let itemTaxAmount = 0;

          if (taxType === 0) {
            itemSubtotal = price * quantity;
            itemTaxAmount = (itemSubtotal * taxPercent) / 100;
          } else {
            const basePrice = price / (1 + taxPercent / 100);
            itemSubtotal = basePrice * quantity;
            itemTaxAmount = price * quantity - itemSubtotal;
          }

          subtotal += itemSubtotal;
          packingCharges += packaging * quantity;

          itemsWithTaxInfo.push({
            ...item,
            itemSubtotal,
            itemTaxAmount,
            taxPercent,
            taxType
          });
        }

        // Calculate discount
        let discount = 0;
        if (order.discount_type === 0) {
          discount = (order.discount_rate / 100) * subtotal;
        } else if (order.discount_type === 1) {
          discount = order.discount_rate;
        }
        discount = Math.min(discount, subtotal);
        const subtotalAfterDiscount = subtotal - discount;

        // Calculate Service Charge (SCH)
        let schAmount = 0;
        let schDetails = { name: "SCH", percentage: 0 };
        try {
          const sch = typeof order.service_charge_details === 'string'
            ? JSON.parse(order.service_charge_details)
            : order.service_charge_details;

          if (sch?.percentage) {
            schAmount = (subtotalAfterDiscount * sch.percentage) / 100;
            schDetails = sch;
          }
        } catch (_) { }

        // Group items by tax percentage
        const taxGroups = {};
        itemsWithTaxInfo.forEach(item => {
          if (!taxGroups[item.taxPercent]) {
            taxGroups[item.taxPercent] = [];
          }
          taxGroups[item.taxPercent].push(item);
        });

        const taxSlabs = {};
        let taxAmount = 0;

        for (const [percentStr, groupItems] of Object.entries(taxGroups)) {
          const taxPercent = Number(percentStr);
          let groupTax = 0;

          const taxExcludedItems = groupItems.filter(i => i.taxType === 0);
          if (taxExcludedItems.length > 0) {
            const taxExcludedSubtotal = taxExcludedItems.reduce((sum, i) => sum + i.itemSubtotal, 0);
            const taxExcludedDiscount = subtotal > 0 ? (taxExcludedSubtotal / subtotal) * discount : 0;
            const taxExcludedAfterDiscount = taxExcludedSubtotal - taxExcludedDiscount;
            const taxExcludedSCH = subtotalAfterDiscount > 0 ? (taxExcludedAfterDiscount / subtotalAfterDiscount) * schAmount : 0;
            groupTax += (taxExcludedAfterDiscount + taxExcludedSCH) * (taxPercent / 100);
          }

          const taxIncludedItems = groupItems.filter(i => i.taxType === 1);
          if (taxIncludedItems.length > 0) {
            // const taxIncludedSubtotal = taxIncludedItems.reduce((sum, i) => sum + i.price * i.quantity, 0);
            // const taxIncludedItemSubtotal = taxIncludedItems.reduce((sum, i) => sum + i.itemSubtotal, 0);
            // const taxIncludedDiscount = subtotal > 0 ? (taxIncludedItemSubtotal / subtotal) * discount : 0;
            // const taxIncludedAfterDiscount = taxIncludedSubtotal - taxIncludedDiscount;
            // const taxIncludedSCH = subtotalAfterDiscount > 0 ?
            //   (taxIncludedItemSubtotal / subtotalAfterDiscount) * schAmount : 0;
            // const taxBase = taxIncludedAfterDiscount + taxIncludedSCH;
            // groupTax += taxBase - (taxBase / (1 + taxPercent / 100));

 

            // Calculate base price (without tax) per item
            const taxIncludedItemsWithBase = taxIncludedItems.map(i => {
              const basePrice = i.price / (1 + taxPercent / 100); // remove tax from price
              return {
                ...i,
                basePrice,
                itemSubtotalBase: basePrice * i.quantity
              };
            });

            const taxExcludedSubtotal = taxIncludedItemsWithBase.reduce((sum, i) => sum + i.itemSubtotalBase, 0);
            const taxExcludedDiscount = subtotal > 0 ? (taxExcludedSubtotal / subtotal) * discount : 0;
            const taxExcludedAfterDiscount = taxExcludedSubtotal - taxExcludedDiscount;
            const taxExcludedSCH = subtotalAfterDiscount > 0 ? (taxExcludedAfterDiscount / subtotalAfterDiscount) * schAmount : 0;
            groupTax += (taxExcludedAfterDiscount + taxExcludedSCH) * (taxPercent / 100);

          }

          if (groupTax > 0) {
            // Multiply percentage by 2 for split bills
            const slabPercent = isSplitBill ? taxPercent * 2 : taxPercent;
            const slabKey = `${slabPercent}%`;
            taxSlabs[slabKey] = (taxSlabs[slabKey] || 0) + groupTax;
            taxAmount += groupTax;
          }
        }

        const total = subtotalAfterDiscount + schAmount + packingCharges + taxAmount;

        return {
          subTotal: Number(subtotal.toFixed(2)),
          discount: Number(discount.toFixed(2)),
          schDetails,
          schAmount: Number(schAmount.toFixed(2)),
          taxSlabs: Object.fromEntries(
            Object.entries(taxSlabs).map(([k, v]) => [k, Number(v.toFixed(2))])
          ),
          taxAmount: Number(taxAmount.toFixed(2)),
          packingCharges: Number(packingCharges.toFixed(2)),
          total: Number(total.toFixed(2)),
          round_up_amount: Number(order.round_up_amount || 0) // <-- send round_up_amount in main bill
        };
      };

      let mainPaymentStatus = 'Unpaid';
      if (order.payment_status === 1) mainPaymentStatus = 'Paid';
      else if (order.payment_status === 3) mainPaymentStatus = 'Partial';
      else if (order.payment_status === 2) mainPaymentStatus = 'Hold';

      const mainBillSummary = calculateBillSummary(allItems);

      const eater_details = {
        eater_name: order.eater_name || "",
        eater_phonenumber: order.eater_phonenumber || "",
        no_of_eaters: order.no_of_eaters || "",
        address: order.address || ""
      };

      const bills = [{
        bill_type: 'main',
        bill_no: invoiceNumber,
        items: allItems,
        summary: mainBillSummary,
        payment_status: mainPaymentStatus,
        eater_details,
        order_type: order.order_type,
        creation_date: order.creation_date,
        discount_type: order.discount_type,
        discount_rate: order.discount_rate,
        round_up_amount: Number(order.round_up_amount || 0) // <-- send round_up_amount in main bill
      }];

      if (is_split) {
        const [splitBills] = await connection.query(
          `SELECT * FROM orders_bills WHERE order_id = ? AND fooder_id = ?`,
          [order.id, fooder_id]
        );

        for (const split of splitBills) {
          let items_data = [];
          let amount_data = null;
          let split_eater_details = eater_details;

          try {
            items_data = JSON.parse(split.items_data || '[]');
          } catch (_) { }

          try {
            amount_data = JSON.parse(split.amount_data || '{}');
          } catch (_) { }

          // Get eater_details from orders_bills.eater_details if present
          if (split.customer_data) {
            try {
              const ed = JSON.parse(split.customer_data);
              split_eater_details = {
                eater_name: ed.name || "",
                eater_phonenumber: ed.mobile || "",
                address: ed.address || "",
                no_of_eaters: "" // not available in split bill eater_details
              };
            } catch (_) {
              // fallback to default
              split_eater_details = eater_details;
            }
          }

          const sanitizedItems = items_data.map((item) => ({
            id: item.product_id || item.id,
            name: item.product_name || item.name,
            quantity: Number(item.quantity),
            price: Number(item.product_price || item.price || 0),
            tax_percent: Number(item.item_tax_percent || item.tax_percent || 0),
            tax_type: Number(item.item_tax_type || item.tax_type || 0),
            packaging_fee: Number(item.packaging_charges || item.packaging_fee || 0),
            selected_variants: item.selected_variants || null,
            selected_addons: item.selected_addons || null
          }));

          const splitPaymentStatus = split.payment_id && split.payment_id !== 0 ? 'Paid' : 'Unpaid';

          // Pass isSplitBill=true for split bills
          const splitSummary = calculateBillSummary(sanitizedItems, amount_data, true);

          // Get discount_type and discount_rate from amount_data.discountDetails if available
          let split_discount_type = order.discount_type;
          let split_discount_rate = order.discount_rate;
          if (amount_data && amount_data.discountDetails) {
            split_discount_type = typeof amount_data.discountDetails.discountType !== 'undefined'
              ? amount_data.discountDetails.discountType
              : split_discount_type;
            split_discount_rate = typeof amount_data.discountDetails.discountRate !== 'undefined'
              ? amount_data.discountDetails.discountRate
              : split_discount_rate;
          }

          bills.push({
            bill_type: 'split',
            split_bill_no: split.bill_no,
            bill_no: invoiceNumber,
            items: sanitizedItems,
            summary: splitSummary,
            payment_status: splitPaymentStatus,
            eater_details: split_eater_details,
            order_type: order.order_type,
            creation_date: split.creation_date,
            discount_type: split_discount_type,
            discount_rate: split_discount_rate,
            round_up_amount: typeof amount_data?.round_off_amount !== 'undefined'
              ? Number(amount_data.round_off_amount)
              : 0 // <-- send round_up_amount from split bill amount_data
          });
        }
      }

      return res.status(200).json({
        status: 'success',
        order_id: order.id,
        order_no: order.order_number_qrcode,
        table_no,
        is_split,
        bills
      });

    } finally {
      connection.release();
    }

  } catch (err) {
    console.error('Error in getAllBillsToPrint:', err);
    return res.status(500).json({
      status: 'error',
      message: 'Internal server error'
    });
  }
};



exports.liveOrderDuePaymentSubmit = async (req, res) => {
  const {
    id,
    total,
    payment_details,
    due_amount,
    payment_status,
    item,
    allPaymentDetail
  } = req.body;
  const connection = await db.getConnection();
  const time = Math.floor(Date.now() / 1000);

  try {
    const [[itemCount]] = await connection.query(
      `select COUNT(*) AS itemCount from order_items where fooder_id = ? and order_id = ? and is_cancelled = 0`,
      [req.staff.fooder_id, id]
    );

    // console.log("itemCount", itemCount.itemCount, "item.length", item.length);

    if (itemCount.itemCount !== item.length) {
      connection.release();
      return res.status(400).send({
        status: "fail",
        message: `Payment has not been settled. Please go back and refresh the page.`,
      });
    }

    for (const detail of allPaymentDetail) {
      const { id } = detail;
      if (id) {
        const [checkTransId] = await connection.query(
          `SELECT * FROM  orders_payment where id = ? and fooder_id = ?`,
          [id, req.staff.fooder_id]
        );

        if (checkTransId.length === 0) {
          connection.release();
          return res.status(400).send({
            status: "fail",
            message: `Payment has not been settled. Please go back and refresh the page.`,
          });
        }
      }
    }

    const { method } = payment_details;


    const query = `INSERT INTO orders_payment (fooder_id, order_id, payment_type, tip, paid_amount, payment_details, txn_refrence_number, created_date, ip)
    SELECT ?, ?, ?, ?, ?, ?, ?, ?, ?
    WHERE EXISTS (
        SELECT 1 FROM orders WHERE id = ? AND payment_status = 3
    )
    `;

    [result] = await connection.query(query, [
      req.staff.fooder_id,
      id,
      method.toLowerCase(),
      0,
      due_amount,
      JSON.stringify(payment_details),
      "",
      time,
      req.ipAddress,
      id,
    ]);

    if (result.affectedRows === 1) {
      const query = `UPDATE orders SET payment_type = ?, payment_status = ? WHERE id = ? AND payment_status = 3 AND fooder_id = ?`;
      [result] = await connection.query(query, ["paid", 1, id, req.staff.fooder_id]);

      // console.log(result)

      connection.release();
      if (result.affectedRows === 1) {
        return res.status(200).send({
          status: "success",
          message: "Payment settled successfully",
        });
      } else {
        return res.status(200).send({
          status: "success",
          message: "Order Already paid",
        });
      }
    }

    return res
      .status(200)
      .send({ status: "success", message: "Order Already paid" });

  } catch (error) {
    console.log(error);
    if (connection) {
      connection.release();
    }
    res.status(500).json({
      message: "Internal server error",
      errors: error.toString(),
    });
  }
};
