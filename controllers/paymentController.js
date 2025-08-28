const pool = require('../config/db');
const config = require('../config/config');


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

// Function to handle partial / full payment for dine-in orders
// exports.partialPaymentForDineIn = async (req, res) => {
//   const {
//     id,
//     payment_type,
//     payment_status,
//     payment_details,
//     service_charge,
//     subtotal,
//     tax_amount,
//     total,
//     discount_type,
//     discount_rate,
//     unpaid_reason,
//     round_up_amount,
//     item,
//     service_charge_details
//   } = req.body;

//   let updateResult;
//   let productKotIds;
//   let result;
//   let result2;
//   const connection = await pool.getConnection();

//   try {
//     // Check if order is split
//     const [orderSplitStatus] = await connection.query(
//       `SELECT is_split, payment_status FROM orders WHERE id = ?`,
//       [id]
//     );
//     if (!orderSplitStatus.length) {
//       connection.release();
//       return res.status(404).send({
//         status: "fail",
//         message: "Order not found",
//       });
//     }
//     if (orderSplitStatus[0].is_split === 1) {
//       connection.release();
//       return res.status(400).send({
//         status: "fail",
//         message: "You have already split this bill. Use split bill for settlement.",
//       });
//     }

//     if (
//       orderSplitStatus[0].payment_status === 1 ||
//       orderSplitStatus[0].payment_status === 3
//     ) {
//       connection.release();
//       return res.status(200).send({
//         status: "fail",
//         message: `Order already paid`,
//       });
//     }

//     const [checkOrderStatus] = await connection.query(
//       `select is_cancelled from orders where id = ?`,
//       [id]
//     );
//     if (checkOrderStatus[0].is_cancelled === 1) {
//       connection.release();
//       return res.status(200).send({
//         status: "fail",
//         message: "Order is already rejected!!!",
//       });
//     }

//     const [[itemCount]] = await connection.query(
//       `select COUNT(*) AS itemCount from order_items where fooder_id = ? and order_id = ? and is_cancelled = 0`,
//       [req.staff.fooder_id, id]
//     );

//     if (itemCount.itemCount !== item.length) {
//       connection.release();
//       return res.status(400).send({
//         status: "fail",
//         message: `Payment has not been settled. Please go back and refresh the page.`,
//       });
//     }

//     const time = Math.floor(Date.now() / 1000);
//     let totalPaidAmount = 0;

//     for (const detail of payment_details) {
//       const { method, amount, tip, transaction_id } = detail;
//       if (transaction_id) {
//         const [checkTransId] = await connection.query(
//           `SELECT txn_refrence_number FROM  orders_payment where txn_refrence_number = ? and fooder_id = ?`,
//           [transaction_id, req.staff.fooder_id]
//         );
//         if (
//           checkTransId.length > 0 &&
//           checkTransId[0].txn_refrence_number === transaction_id
//         ) {
//           connection.release();
//           return res.status(400).send({
//             status: "fail",
//             message: `Transaction Id :${transaction_id} already Exist...`,
//           });
//         }
//       }
//       const query2 = `INSERT INTO orders_payment (fooder_id, order_id, payment_type, tip, paid_amount, payment_details,txn_refrence_number, created_date, ip) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;
//       [result2] = await connection.query(query2, [
//         req.staff.fooder_id,
//         id,
//         method.toLowerCase(),
//         tip,
//         amount,
//         JSON.stringify(detail),
//         transaction_id,
//         time,
//         req.ip,
//       ]);
//       totalPaidAmount += parseFloat(amount);
//     }

//     console.log("totalPaidAmount", totalPaidAmount);
//     console.log("total", total);

//     if (totalPaidAmount == total) {
//       let query = `UPDATE orders SET payment_type = ?, payment_status = ?, subtotal = ?, service_charge = ?, tax_amount = ?, total = ?, discount_type = ?, discount_rate = ?, round_up_amount = ?`;
//       let params = [
//         "partial",
//         payment_status,
//         subtotal,
//         service_charge,
//         tax_amount,
//         total,
//         discount_type,
//         discount_rate,
//         round_up_amount,
//       ];
//       if (service_charge_details !== null && service_charge_details !== undefined) {
//         query += `, service_charge_details = ?`;
//         params.push(JSON.stringify(service_charge_details));
//       }
//       query += ` WHERE id = ?`;
//       params.push(id);
//       [result] = await connection.query(query, params);
//       const query3 = `SELECT DISTINCT product_kot_id FROM order_items WHERE order_id = ?`;
//       const [orderItemsResult] = await connection.query(query3, [id]);
//       if (orderItemsResult && orderItemsResult.length > 0) {
//         productKotIds = orderItemsResult.map((item) => item.product_kot_id);
//         [updateResult] = await connection.query(
//           "UPDATE fooders_kot SET status = 3 WHERE id IN (?)",
//           [productKotIds]
//         );
//       }
//       // Call calculateStock here
//       await calculateStock(id, connection, req.staff.fooder_id);
//     } else {
//       let query = `UPDATE orders SET payment_type = ?, payment_status = ?, subtotal = ?, service_charge = ?, tax_amount = ?, total = ?, discount_type = ?, discount_rate = ?, round_up_amount = ?`;
//       let params = [
//         "partial",
//         payment_status,
//         subtotal,
//         service_charge,
//         tax_amount,
//         total,
//         discount_type,
//         discount_rate,
//         round_up_amount,
//       ];
//       if (service_charge_details !== null && service_charge_details !== undefined) {
//         query += `, service_charge_details = ?`;
//         params.push(JSON.stringify(service_charge_details));
//       }
//       query += ` WHERE id = ?`;
//       params.push(id);
//       [result] = await connection.query(query, params);
//       // Call calculateStock here
//       await calculateStock(id, connection, req.staff.fooder_id);
//     }

//     await connection.query(
//       `UPDATE fooders_tables ft 
//        JOIN orders o ON ft.id = o.table_id 
//        SET ft.is_booked = 0, ft.booked_by = ? 
//        WHERE ft.fooder_id = ? AND o.id = ?;`,
//       [JSON.stringify({}), req.staff.fooder_id, id]
//     );
//     connection.release();
//     if (result.affectedRows === 1) {
//       return res.status(200).send({
//         status: "success",
//         message: "Payment settled successfully!!!!",
//       });
//     }
//     return res.status(400).send({ status: "fail", message: "Something went wrong!" });
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

exports.partialPaymentForDineIn = async (req, res) => {
  const {
    id,
    payment_type,
    payment_status,
    payment_details,
    service_charge,
    subtotal,
    tax_amount,
    total,
    discount_type,
    discount_rate,
    unpaid_reason,
    round_up_amount,
    item,
    service_charge_details
  } = req.body;

  let updateResult;
  let productKotIds;
  let result;
  let result2;
  const connection = await pool.getConnection();

  try {
    // Check if order is split
    const [orderSplitStatus] = await connection.query(
      `SELECT is_split, payment_status FROM orders WHERE id = ?`,
      [id]
    );
    if (!orderSplitStatus.length) {
      connection.release();
      return res.status(404).send({
        status: "fail",
        message: "Order not found",
      });
    }
    if (orderSplitStatus[0].is_split === 1) {
      connection.release();
      return res.status(400).send({
        status: "fail",
        message: "This bill is already split. Please go to POS Split Bill menu On Table Right Click for settlement.",
      });
    }

    if (
      orderSplitStatus[0].payment_status === 1 ||
      orderSplitStatus[0].payment_status === 3
    ) {
      connection.release();
      return res.status(200).send({
        status: "fail",
        message: `Order already paid`,
      });
    }

    const [checkOrderStatus] = await connection.query(
      `select is_cancelled from orders where id = ?`,
      [id]
    );
    if (checkOrderStatus[0].is_cancelled === 1) {
      connection.release();
      return res.status(200).send({
        status: "fail",
        message: "Order is already rejected!!!",
      });
    }

    const [[itemCount]] = await connection.query(
      `select COUNT(*) AS itemCount from order_items where fooder_id = ? and order_id = ? and is_cancelled = 0`,
      [req.staff.fooder_id, id]
    );

    if (itemCount.itemCount !== item.length) {
      connection.release();
      return res.status(400).send({
        status: "fail",
        message: `Payment has not been settled. Please go back and refresh the page.`,
      });
    }

    const time = Math.floor(Date.now() / 1000);
    let totalPaidAmount = 0;

    for (const detail of payment_details) {
      const { method, amount, tip, transaction_id } = detail;
      if (transaction_id) {
        const [checkTransId] = await connection.query(
          `SELECT txn_refrence_number FROM  orders_payment where txn_refrence_number = ? and fooder_id = ?`,
          [transaction_id, req.staff.fooder_id]
        );
        if (
          checkTransId.length > 0 &&
          checkTransId[0].txn_refrence_number === transaction_id
        ) {
          connection.release();
          return res.status(400).send({
            status: "fail",
            message: `Transaction Id :${transaction_id} already Exist...`,
          });
        }
      }
      const query2 = `INSERT INTO orders_payment (fooder_id, order_id, payment_type, tip, paid_amount, payment_details,txn_refrence_number, created_date, ip) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;
      [result2] = await connection.query(query2, [
        req.staff.fooder_id,
        id,
        method.toLowerCase(),
        tip,
        amount,
        JSON.stringify(detail),
        transaction_id,
        time,
        req.ipAddress,
      ]);
      totalPaidAmount += parseFloat(amount);
    }

    // console.log("totalPaidAmount", totalPaidAmount);
    // console.log("total", total);

    let query = `UPDATE orders SET payment_type = ?, payment_status = ?, subtotal = ?, service_charge = ?, tax_amount = ?, total = ?, discount_type = ?, discount_rate = ?, round_up_amount = ?`;
    let params = [
      "partial",
      payment_status,
      subtotal,
      service_charge,
      tax_amount,
      total,
      discount_type,
      discount_rate,
      round_up_amount,
    ];
    if (service_charge_details !== null && service_charge_details !== undefined) {
      query += `, service_charge_details = ?`;
      params.push(JSON.stringify(service_charge_details));
    }
    query += ` WHERE id = ? AND fooder_id = ?`;
    params.push(id);
    params.push(req.staff.fooder_id);
    [result] = await connection.query(query, params);

    // Update KOT status in both conditions
    const query3 = `SELECT DISTINCT product_kot_id FROM order_items WHERE order_id = ? AND fooder_id = ?`;
    const [orderItemsResult] = await connection.query(query3, [id, req.staff.fooder_id]);
    if (orderItemsResult && orderItemsResult.length > 0) {
      productKotIds = orderItemsResult.map((item) => item.product_kot_id);
      [updateResult] = await connection.query(
        "UPDATE fooders_kot SET status = 3 WHERE id IN (?) AND fooder_id = ?",
        [productKotIds, req.staff.fooder_id]
      );
    }

    // Call calculateStock in both conditions
    await calculateStock(id, connection, req.staff.fooder_id);

    await connection.query(
      `UPDATE fooders_tables ft 
       JOIN orders o ON ft.id = o.table_id 
       SET ft.is_booked = 0, ft.booked_by = ? 
       WHERE ft.fooder_id = ? AND o.id = ?;`,
      [JSON.stringify({}), req.staff.fooder_id, id]
    );
    connection.release();
    if (result.affectedRows === 1) {
      return res.status(200).send({
        status: "success",
        message: "Payment settled successfully!!!!",
      });
    }
    return res.status(400).send({ status: "fail", message: "Something went wrong!" });
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


// hold payment for dine in
exports.posPaymentDetailsUpdateForDineIn = async (req, res) => {
  //console.log("req.body", req.body);
  const {
    id,
    payment_type,
    payment_status,
    payment_details,
    service_charge,
    subtotal,
    tax_amount,
    total,
    discount_type,
    discount_rate,
    unpaid_reason,
    transaction_id,
    service_charge_details
  } = req.body;

  let updateResult;
  let productKotIds;
  let result;
  let result2;
  const connection = await pool.getConnection();

  try {
    // Check if order exists and get is_split, payment_status, is_cancelled
    const [orderStatus] = await connection.query(
      `SELECT is_split, payment_status, is_cancelled FROM orders WHERE id = ?`,
      [id]
    );
    if (!orderStatus.length) {
      connection.release();
      return res.status(404).send({
        status: "fail",
        message: "Order not found",
      });
    }
    if (orderStatus[0].is_cancelled === 1) {
      connection.release();
      return res.status(200).send({
        status: "fail",
        message: "Order is already rejected!!!",
      });
    }
    if (orderStatus[0].is_split === 1) {
      connection.release();
      return res.status(400).send({
        status: "fail",
        message: "This bill is already split. Please go to POS Split Bill menu On Table Right Click for settlement.",
      });
    }
    if (orderStatus[0].payment_status !== 0) {
      connection.release();
      return res.status(200).send({
        status: "fail",
        message: "Order is already Paid!!!",
      });
    }

    if (transaction_id) {
      const [checkTransId] = await connection.query(
        `SELECT txn_refrence_number FROM  orders_payment where txn_refrence_number = ? and fooder_id = ?`,
        [transaction_id, req.staff.fooder_id]
      );
      if (
        checkTransId.length > 0 &&
        checkTransId[0].txn_refrence_number === transaction_id
      ) {
        connection.release();
        return res.status(400).send({
          status: "fail",
          message: "Transaction Id already Exist...",
        });
      }
    }

    if (payment_status === 1) {
      let query = `UPDATE orders SET 
        payment_type = ?, 
        payment_status = ?, 
        subtotal = ?, 
        service_charge = ?, 
        tax_amount = ?, 
        total = ?, 
        discount_type = ?, 
        discount_rate = ?`;

      const params = [
        payment_type.toLowerCase(),
        payment_status,
        subtotal,
        service_charge,
        tax_amount,
        total,
        discount_type,
        discount_rate,
      ];

      if (service_charge_details !== null && service_charge_details !== undefined) {
        query += `, service_charge_details = ?`;
        params.push(JSON.stringify(service_charge_details));
      }

      query += ` WHERE id = ? AND fooder_id = ?`;
      params.push(id);
      params.push(req.staff.fooder_id);

      [result] = await connection.query(query, params);

      const { tip, amount } = payment_details;
      const time = Math.floor(Date.now() / 1000);

      const query2 = `INSERT INTO orders_payment (fooder_id, order_id, payment_type, tip, paid_amount, payment_details,txn_refrence_number, created_date, ip) VALUES (?,?, ?, ?, ?, ?, ?, ?, ?)`;

      [result2] = await connection.query(query2, [
        req.staff.fooder_id,
        id,
        payment_type.toLowerCase(),
        tip,
        amount,
        JSON.stringify(payment_details),
        transaction_id,
        time,
        req.ipAddress,
      ]);

      const query3 = `SELECT DISTINCT product_kot_id FROM order_items WHERE order_id = ?`;
      const [orderItemsResult] = await connection.query(query3, [id]);

      if (orderItemsResult && orderItemsResult.length > 0) {
        productKotIds = orderItemsResult.map((item) => item.product_kot_id);

        [updateResult] = await connection.query(
          "UPDATE fooders_kot SET status = 3 WHERE id IN (?) AND fooder_id = ?",
          [productKotIds, req.staff.fooder_id]
        );
      }

      if (
        result.affectedRows === 1 &&
        result2 &&
        (!payment_status || updateResult?.affectedRows === productKotIds?.length)
      ) {
        await calculateStock(id, connection, req.staff.fooder_id);
        await connection.query(
          `UPDATE fooders_tables ft JOIN orders o ON ft.id = o.table_id SET ft.is_booked = 0 WHERE ft.fooder_id = ? AND o.id = ?;`,
          [req.staff.fooder_id, id]
        );

        connection.release();
        return res.status(200).send({
          status: "success",
          message: "Payment settled successfully...",
        });
      }
      connection.release();
      return res
        .status(400)
        .send({ status: "fail", message: "something went wrong!" });
        }
        else {
      let query = `UPDATE orders SET 
        payment_type = ?, 
        unpaid_reason = ?, 
        payment_status = ?, 
        subtotal = ?, 
        service_charge = ?, 
        tax_amount = ?, 
        total = ?, 
        discount_type = ?, 
        discount_rate = ?`;

      const params = [
        payment_type.toLowerCase(),
        unpaid_reason,
        2,
        subtotal,
        service_charge,
        tax_amount,
        total,
        discount_type,
        discount_rate,
      ];

      if (service_charge_details !== null && service_charge_details !== undefined) {
        query += `, service_charge_details = ?`;
        params.push(JSON.stringify(service_charge_details));
      }

      query += ` WHERE id = ? AND fooder_id = ?`;
      params.push(id);
      params.push(req.staff.fooder_id);

      [result] = await connection.query(query, params);

      // Set KOT status to 3 for all related KOTs
      const query3 = `SELECT DISTINCT product_kot_id FROM order_items WHERE order_id = ? AND fooder_id = ?`;
      const [orderItemsResult] = await connection.query(query3, [id, req.staff.fooder_id]);
      if (orderItemsResult && orderItemsResult.length > 0) {
        productKotIds = orderItemsResult.map((item) => item.product_kot_id);
        [updateResult] = await connection.query(
          "UPDATE fooders_kot SET status = 3 WHERE id IN (?) AND fooder_id = ?",
          [productKotIds, req.staff.fooder_id]
        );
      }
        }

        await connection.query(
      `UPDATE fooders_tables ft 
       JOIN orders o ON ft.id = o.table_id 
       SET ft.is_booked = 0, ft.booked_by = ? 
       WHERE ft.fooder_id = ? AND o.id = ?;`,
      [JSON.stringify({}), req.staff.fooder_id, id]
        );

        connection.release();

        if (result.affectedRows === 1) {
      return res.status(200).send({
        status: "success",
        message: "Payment hold successfully...",
      });
        }

        return res
      .status(400)
      .send({ status: "fail", message: "something went wrong!!" });
      } catch (error) {
    console.error(error);
    if (connection) {
      connection.release();
    }
    res.status(500).json({
      message: "Internal server error",
      errors: error.toString(),
    });
  }
};


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
    // console.log("maxInvoiceNumber", maxInvoiceNumber);

    if (
      maxInvoiceNumber === null ||
      maxInvoiceNumber === undefined ||
      maxInvoiceNumber === ""
    ) {
      // No existing invoices for the current financial year, start from 1
      maxInvoiceNumber = 1001;
    } else {
      // Extract the numeric part and convert it to an integer
      maxInvoiceNumber = maxInvoiceNumber + 1;
    }

    // Increment and format the invoice number with leading zeros
    const formattedInvoiceNumber = `${prefix}-${String(maxInvoiceNumber)}`;
    // console.log("formattedInvoiceNumber", formattedInvoiceNumber);

    return formattedInvoiceNumber;
  } catch (error) {
    throw error;
  } finally {
    connection.release();
  }
};

exports.posCashPaymentDetailsUpdateForDelivaryAndPickUp = async (req, res) => {
  //console.log("req.body==========>", req.body);
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
    payment_type,
    delivery_guy_id,
    payment_details,
    payment_status,
    cart_packing_charges,
    transaction_id,
  } = req.body;
  const eater_name = (req.body.eater_name || "").trim();
  const eater_phonenumber = (req.body.eater_phonenumber || "").trim();
  const time = Math.floor(Date.now() / 1000);
  const order_number = "OD" + time;
  const today_date = new Date().toISOString().slice(0, 10);
  const fooder_id = req.staff.fooder_id;

  // console.log(order_number);
  let order_number_qrcode;

  //let taxDetails = JSON.parse(tax_details);

  let eater_id = 0;
  let status = 1;
  // let address = "";
  // let payment_type = "";
  let delivery_charge = 0;
  let order_mode = 2;
  // let delivery_guy_id = 0;
  let tip = 0;
  let amount = 0;
  if (payment_details) {
    tip = typeof payment_details.tip !== "undefined" && payment_details.tip !== null ? Number(payment_details.tip) : 0;
    amount = typeof payment_details.amount !== "undefined" && payment_details.amount !== null ? Number(payment_details.amount) : 0;
  }
  //    const paidAmount = parseFloat(customerPaid) > parseFloat(amount) ? parseFloat(amount) : parseFloat(customerPaid);


  const invoiceNumber = await getInvoiceNumber(fooder_id, "IN");
  // console.log("invoiceNumber", invoiceNumber);
  // Extract the invoice number value from the generated invoiceNumber string
  // Assuming invoiceNumber is in the format "IN-1001", extract the numeric part
  let invoiceNumberValue = invoiceNumber.split('-')[1] || invoiceNumber;
  const connection = await pool.getConnection();

  try {
    //    const [checkOrderStatus] = await connection.query(`select is_cancelled from orders where id = ?`,[id]);
    //   console.log("checkOrderStatus.status",checkOrderStatus);
    //   console.log("checkOrderStatus.status",checkOrderStatus[0].is_cancelled);
    //   if(checkOrderStatus[0].is_cancelled === 1){
    //        return res.status(200).send({
    //       status: "fail",
    //       message: "Order is already rejected!!!",
    //     });
    //   }

    if (eater_name !== "") {
      if (eater_phonenumber !== "") {
        const [rows] = await connection.query(
          "SELECT eater_id FROM eaters WHERE mobile = ?",
          [eater_phonenumber]
        );
        if (rows.length > 0) {
          eater_id = rows[0].eater_id;
        } else {
          // Insert a new eater if not exists
          const [result] = await connection.query(
            "INSERT INTO eaters (name, mobile, joining_date, joining_ip) VALUES (?, ?, ?, ?)",
            [eater_name, eater_phonenumber, time, req.ipAddress]
          );
          eater_id = result.insertId;
        }
      } else {
        eater_id = 0;
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
      order_number_qrcode = config.qordernumber; // Replace with your default value
    }
    if (transaction_id) {
      const [checkTransId] = await connection.query(
        `SELECT txn_refrence_number FROM  orders_payment where txn_refrence_number = ? and fooder_id = ?`,
        [transaction_id, req.staff.fooder_id]
      );

      if (
        checkTransId.length > 0 &&
        checkTransId[0].txn_refrence_number === transaction_id
      ) {
        connection.release();
        return res.status(400).send({
          status: "fail",
          message: "Transaction Id already Exist...",
        });
      }
    }

    // const [checkPaymentStatus] = await connection.query(
    //   `select payment_status from orders where id = ?`,
    //   [id]
    // );
    // if (checkPaymentStatus[0].payment_status === 1) {
    //   connection.release();
    //   return res.status(200).send({
    //     status: "fail",
    //     message: `Order already paid`,
    //   });
    // }

    const safeOrderType = typeof order_type === "string" ? order_type.toLowerCase().replace(/\s+/g, "_") : "";
    const safePaymentType = typeof payment_type === "string" ? payment_type.toLowerCase() : "";
    const savePosDetailsQuery = `insert into orders (fooder_id,order_number,order_number_qrcode,order_date,eater_id,eater_name,eater_phonenumber,address,details,fooder_name,order_type,subtotal,service_charge,service_charge_details,tax_amount,tax_details,total,payment_type,status,ip,creation_date,order_mode,table_id,eater_suggestions,discount_type,discount_rate,delivery_guy_id,delivery_charge,payment_status,invoice_no) values(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`;
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
      safePaymentType,
      status,
      req.ipAddress,
      time,
      order_mode,
      table_id,
      eater_suggestions,
      discount_type,
      discount_rate,
      delivery_guy_id,
      delivery_charge,
      payment_status,
      invoiceNumberValue,
    ]);

    const saveorderItemesQuery = `insert into order_items (order_id,fooder_id,product_kot_id,fooder_name,phone,table_id,menu_id,product_id,product_type,product_name,quantity,product_price,product_proprice,product_special_note,batchid,ip,creation_date,item_tax_percent,item_tax_type,variant_id,variant_details,addons_items_details,packaging_fee, local_time) values (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`;
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

        cart_packing_charges ? cart_packing_charges : 0,
        item.local_id,
      ]);
    }

    const saveEaterTableDataQuery = `update eaters set name = ?,address=?,mobile = ? where eater_id = ?`;

    await connection.query(
      saveEaterTableDataQuery,
      [eater_name, address, eater_phonenumber, eater_id]
    );

    const [result2] = await connection.query(
      "INSERT INTO orders_payment (fooder_id, order_id, payment_type, tip, paid_amount,payment_details,txn_refrence_number, created_date, ip) VALUES (?,?,?, ?, ?, ?, ?, ?, ?)",
      [
        req.staff.fooder_id,
        savePosDetailsResult.insertId,
        safePaymentType,
        tip,
        amount,
        JSON.stringify(payment_details),
        transaction_id,
        time,
        req.ipAddress,
      ]
    );
    await calculateStock(
      savePosDetailsResult.insertId,
      connection,
      req.staff.fooder_id
    );

    connection.release();
    if (savePosDetailsResult && saveorderItemesResult && result2) {
      return res.status(200).send({
        status: "success",
        message: `Payment settled successfully`,
        invoice_number: `${config.invoice_number_prefix}${invoiceNumberValue}`,
      });
    }
    return res
      .status(400)
      .send({ status: "fail", message: "something went wrong!!!" });
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





// new function to get order and payment details for POS
/**
 * API to generate order and save bill (without payment)
 */
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
    cart_packing_charges,
    eater_name,
    eater_phonenumber,
    delivery_guy_id,
    order_mode,
    delivery_charge,
  } = req.body;

  const time = Math.floor(Date.now() / 1000);
  const order_number = "OD" + time;
  const today_date = new Date().toISOString().slice(0, 10);
  const fooder_id = req.staff.fooder_id;
  let order_number_qrcode;
  let eater_id = 0;
  let status = 1;

  const invoiceNumber = await getInvoiceNumber(fooder_id, "IN");
  let invoiceNumberValue = invoiceNumber.split('-')[1] || invoiceNumber;
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
    const savePosDetailsQuery = `insert into orders (fooder_id,order_number,order_number_qrcode,order_date,eater_id,eater_name,eater_phonenumber,address,details,fooder_name,order_type,subtotal,service_charge,service_charge_details,tax_amount,tax_details,total,status,ip,creation_date,order_mode,table_id,eater_suggestions,discount_type,discount_rate,delivery_guy_id,delivery_charge,invoice_no) values(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`;
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
      order_mode || 2,
      table_id,
      eater_suggestions,
      discount_type,
      discount_rate,
      delivery_guy_id,
      delivery_charge || 0,
      invoiceNumberValue,
    ]);

    const saveorderItemesQuery = `insert into order_items (order_id,fooder_id,product_kot_id,fooder_name,phone,table_id,menu_id,product_id,product_type,product_name,quantity,product_price,product_proprice,product_special_note,batchid,ip,creation_date,item_tax_percent,item_tax_type,variant_id,variant_details,addons_items_details,packaging_fee, local_time) values (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`;
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
        cart_packing_charges ? cart_packing_charges : 0,
        item.local_id,
      ]);
    }

    const saveEaterTableDataQuery = `update eaters set name = ?,address=?,mobile = ? where eater_id = ?`;
    await connection.query(
      saveEaterTableDataQuery,
      [eater_name, address, eater_phonenumber, eater_id]
    );

    await calculateStock(
      savePosDetailsResult.insertId,
      connection,
      req.staff.fooder_id
    );

    connection.release();
    if (savePosDetailsResult && saveorderItemesResult) {
      return res.status(200).send({
        status: "success",
        message: `Order saved successfully`,
        order_id: savePosDetailsResult.insertId,
        invoice_number: `${config.invoice_number_prefix}${invoiceNumberValue}`,
      });
    }
    return res
      .status(400)
      .send({ status: "fail", message: "something went wrong!!!" });
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

/**
 * API to update payment for an existing order (by order_id) for counter and delivery/pickup orders
 */
// exports.updateOrderPayment = async (req, res) => {
//   const {
//     order_id,
//     payment_type,
//     payment_details,
//     payment_status,
//     transaction_id,
//     paided_amount,
//     tip,
//     amount,
//   } = req.body;

//   const time = Math.floor(Date.now() / 1000);
//   const connection = await pool.getConnection();

//   try {
//     if (transaction_id) {
//       const [checkTransId] = await connection.query(
//         `SELECT txn_refrence_number FROM  orders_payment where txn_refrence_number = ? and fooder_id = ?`,
//         [transaction_id, req.staff.fooder_id]
//       );
//       if (
//         checkTransId.length > 0 &&
//         checkTransId[0].txn_refrence_number === transaction_id
//       ) {
//         connection.release();
//         return res.status(400).send({
//           status: "fail",
//           message: "Transaction Id already Exist...",
//         });
//       }
//     }

//     const [order] = await connection.query(
//       "SELECT * FROM orders WHERE id = ?",
//       [order_id]
//     );
//     if (!order.length) {
//       connection.release();
//       return res.status(404).send({ status: "fail", message: "Order not found" });
//     }
//     if (order[0].payment_status === 1) {
//       connection.release();
//       return res.status(400).send({ status: "fail", message: "Order already paid" });
//     }

//     const safePaymentType = typeof payment_type === "string" ? payment_type.toLowerCase() : "";

//     const [result2] = await connection.query(
//       "INSERT INTO orders_payment (fooder_id, order_id, payment_type, tip, paid_amount, payment_details,txn_refrence_number, created_date, ip) VALUES (?,?,?, ?, ?, ?, ?, ?, ?)",
//       [
//         req.staff.fooder_id,
//         order_id,
//         safePaymentType,
//         tip || 0,
//         paided_amount || 0,
//         JSON.stringify(payment_details),
//         transaction_id,
//         time,
//         req.ipAddress || req.ip,
//       ]
//     );

//     await connection.query(
//       "UPDATE orders SET payment_type = ?, payment_status = ? WHERE id = ?",
//       [safePaymentType, payment_status, order_id]
//     );

//     connection.release();
//     if (result2.affectedRows === 1) {
//       return res.status(200).send({
//         status: "success",
//         message: `Payment updated successfully`,
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

exports.updateOrderPayment = async (req, res) => {
  const {
    order_id,
    payment_type,
    payment_details, // <-- array of objects
    payment_status,
    transaction_id, // may be inside each payment_details item too
    tip,
    amount,
  } = req.body;

  const time = Math.floor(Date.now() / 1000);
  const connection = await pool.getConnection();

  try {
    // 1. Check if order exists
    const [order] = await connection.query(
      "SELECT * FROM orders WHERE id = ?",
      [order_id]
    );
    if (!order.length) {
      connection.release();
      return res.status(404).send({ status: "fail", message: "Order not found" });
    }
    if (order[0].payment_status === 1) {
      connection.release();
      return res.status(400).send({ status: "fail", message: "Order already paid" });
    }

    const safePaymentType = typeof payment_type === "string" ? payment_type.toLowerCase() : "";

    // 2. Loop through payment_details array & insert each one
    if (!Array.isArray(payment_details) || payment_details.length === 0) {
      connection.release();
      return res.status(400).send({ status: "fail", message: "No payment details provided" });
    }

    for (let detail of payment_details) {
      const txnId = detail.transaction_id || transaction_id || null;
      const paidAmount = Number(detail.amount) || 0;
      const tipAmount = Number(detail.tip) || 0;
      const paymentType = detail.method ? detail.method.toLowerCase() : "";

      // Check duplicate transaction ID
      if (txnId) {
        const [checkTransId] = await connection.query(
          `SELECT txn_refrence_number FROM orders_payment WHERE txn_refrence_number = ? AND fooder_id = ?`,
          [txnId, req.staff.fooder_id]
        );
        if (checkTransId.length > 0) {
          connection.release();
          return res.status(400).send({
            status: "fail",
            message: `Transaction Id: ${txnId} already exists...`,
          });
        }
      }

      // Insert payment record
      await connection.query(
        "INSERT INTO orders_payment (fooder_id, order_id, payment_type, tip, paid_amount, payment_details, txn_refrence_number, created_date, ip) VALUES (?,?,?,?,?,?,?,?,?)",
        [
          req.staff.fooder_id,
          order_id,
          paymentType,
          tipAmount,
          paidAmount,
          JSON.stringify(detail),
          txnId,
          time,
          req.ipAddress,
        ]
      );
    }


    // 3. Update payment status
    await connection.query(
      "UPDATE orders SET payment_type = ?, payment_status = ? WHERE id = ? AND fooder_id = ?",
      [safePaymentType, payment_status, order_id, req.staff.fooder_id]
    );

    connection.release();
    return res.status(200).send({
      status: "success",
      message: "Payment updated successfully",
    });

  } catch (error) {
    if (connection) connection.release();
    res.status(500).json({
      message: "Internal server error",
      errors: error.toString(),
    });
  }
};



/**
 * API to hold payment for an existing order (delivery/pickup/counter)
 */
exports.holdPaymentForExistingOrderCounterAndDelivery = async (req, res) => {
  const {
    order_id,
    payment_type,
    unpaid_reason,
  } = req.body;

  const fooder_id = req.staff.fooder_id;
  const time = Math.floor(Date.now() / 1000);
  const connection = await pool.getConnection();

  try {
    const [order] = await connection.query(
      "SELECT * FROM orders WHERE id = ? AND fooder_id = ?",
      [order_id, fooder_id]
    );

    if (!order.length) {
      connection.release();
      return res.status(404).send({ status: "fail", message: "Order not found" });
    }

    if (order[0].payment_status === 1) {
      connection.release();
      return res.status(400).send({
        status: "fail",
        message: "Order already paid",
      });
    }

    // Update order with unpaid payment info
    await connection.query(
      `UPDATE orders 
       SET payment_type = ?, 
           payment_status = ?, 
           unpaid_reason = ?, 
           status = ? 
       WHERE id = ?
         AND fooder_id = ?`,
      [
        payment_type.toLowerCase(),
        2, // payment_status = 2 => unpaid
        unpaid_reason || "Payment hold at counter/delivery",
        2, // order status = 2 (usually pending/unpaid)
        order_id,
        fooder_id,
      ]
    );

    connection.release();
    return res.status(200).send({
      status: "success",
      message: "Payment hold successfully",
    });
  } catch (error) {
    console.error("Error in holdPaymentForExistingOrder:", error);
    if (connection) connection.release();
    return res.status(500).json({
      status: "fail",
      message: "Internal server error",
      error: error.toString(),
    });
  }
};


