const pool = require('../config/db');
const { getOrderItems: getOrderItemsUtil } = require('../utils/getOrderItems');
const config = require('../config/config');

// Helper to get the next invoice number for a fooder for the current financial year
// const getInvoiceNumber = async (fooderId, prefix) => {
//   const currentDate = new Date();
//   const currentYear = currentDate.getFullYear();
//   const currentMonth = currentDate.getMonth() + 1; // Month is zero-based

//   // Determine the starting date for the current financial year (assuming April 1st is the start)
//   const yearStart = currentMonth < 4 ? currentYear - 1 : currentYear;
//   const startDate = `${yearStart}-04-01`;

//   const connection = await pool.getConnection();

//   try {
//     // Check if there is an existing invoice for the current financial year
//     const [result] = await connection.query(
//       `SELECT MAX(CAST(invoice_no AS UNSIGNED)) as maxInvoiceNumber FROM orders WHERE fooder_id = ? AND order_date >= ?`,
//       [fooderId, startDate]
//     );

//     let maxInvoiceNumber = result[0].maxInvoiceNumber;
//     if (
//       maxInvoiceNumber === null ||
//       maxInvoiceNumber === undefined ||
//       maxInvoiceNumber === ''
//     ) {
//       // No existing invoices for the current financial year, start from 1001
//       maxInvoiceNumber = 1001;
//     } else {
//       // Extract the numeric part and convert it to an integer
//       maxInvoiceNumber = maxInvoiceNumber + 1;
//     }

//     // Increment and format the invoice number with leading zeros
//     const formattedInvoiceNumber = `${prefix}-${String(maxInvoiceNumber)}`;
//     return formattedInvoiceNumber;
//   } catch (error) {
//     throw error;
//   } finally {
//     connection.release();
//   }
// };


async function calculateStock(id, connection, fooder_id) {

    // console.log("Calculating stock for order_id:", id, "fooder_id:", fooder_id);
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

const getOrderItems = async (req, res) => {
    try {
        const { table_id } = req.params;
        const fooder_id = req.staff.fooder_id; // Assuming fooder_id is available in the request user object
        const lastOrderId = config.lastorderid;

        if (!fooder_id || !table_id) {
            return res.status(400).json({
                status: 'error',
                message: 'fooder_id and table_id are required'
            });
        }

        const connection = await pool.getConnection();
        
        try {
            const result = await getOrderItemsUtil(connection, fooder_id, table_id, lastOrderId);

            if (result.status === 'error') {
                return res.status(400).json(result);
            }
            
            return res.status(200).json(result);
        } finally {
            connection.release();
        }
    } catch (error) {
        console.error('Error in getOrderItems:', error);
        return res.status(500).json({
            status: 'error',
            message: 'Internal server error'
        });
    }
};

// const createSplitBill = async (req, res) => {
//     try {
//         const {
//             order_id,
//             bill_data,
//             orderTotal,
//             discountRate,
//             discountType,
//         } = req.body;

//         console.log('Creating split bill with data:', req.body);

//         const fooder_id = req.staff.fooder_id; // Get fooder_id from staff object

//         if (!order_id || !bill_data || !Array.isArray(bill_data)) {
//             return res.status(400).json({
//                 status: 'error',
//                 message: 'order_id and bill_data are required. bill_data must be an array.'
//             });
//         }

//         const connection = await pool.getConnection();
        
//         try {
//             // Fetch order status for validations
//             const [[orderRow]] = await connection.query(
//                 `SELECT is_cancelled, payment_status FROM orders WHERE fooder_id = ? AND id = ?`,
//                 [fooder_id, order_id]
//             );

//             if (!orderRow) {
//                 return res.status(400).json({
//                     status: 'error',
//                     message: 'Order not found.'
//                 });
//             }

//             if (orderRow.is_cancelled == 1) {
//                 return res.status(400).json({
//                     status: 'error',
//                     message: 'Order is cancelled.'
//                 });
//             }

//             if (orderRow.payment_status == 1) {
//                 return res.status(400).json({
//                     status: 'error',
//                     message: 'Order is already paid.'
//                 });
//             }

//             const creation_date = Math.floor(Date.now() / 1000);

//             // Store created bills info for response
//             const createdBills = [];

//             for (const row of bill_data) {
//                 // Insert customer if mobile is provided
//                 if (row.customer_details && row.customer_details.mobile) {
//                     await connection.query(
//                         "INSERT INTO eaters (name, mobile, joining_date, joining_ip) " +
//                         "SELECT ?, ?, ?, ? FROM DUAL " +
//                         "WHERE NOT EXISTS (SELECT 1 FROM eaters WHERE mobile = ?)",
//                         [
//                             row.customer_details.name || '', 
//                             row.customer_details.mobile, 
//                             creation_date, 
//                             req.ip || req.connection.remoteAddress, 
//                             row.customer_details.mobile
//                         ]
//                     );
//                 }

//                 // Insert bill record without payment_id
//                 const [billResult] = await connection.query(
//                     `INSERT INTO orders_bills (order_id, fooder_id, bill_no, amount_data, items_data, customer_data, ip, creation_date) 
//                      VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
//                     [
//                         order_id,
//                         fooder_id,
//                         row.bill_number,
//                         JSON.stringify(row.amount_details),
//                         JSON.stringify(row.items_details),
//                         JSON.stringify(row.customer_details || {}),
//                         req.ip || req.connection.remoteAddress,
//                         creation_date,
//                     ]
//                 );

//                 // Get inserted bill id and total amount
//                 createdBills.push({
//                     orders_bills_id: billResult.insertId,
//                     bill_no: row.bill_number,
//                     order_id: order_id,
//                     amount_total: row.amount_details?.total || 0,
//                     customer_details: row.customer_details || {}
//                 });
//             }

//             await connection.query(
//                 `UPDATE order_items 
//                  SET item_kot_status = 2 
//                  WHERE item_kot_status NOT IN (3, 4) 
//                    AND fooder_id = ? 
//                    AND order_id = ?`, 
//                 [fooder_id, order_id]
//             );

//             if (bill_data.length > 0 && bill_data[0].bill_number === 1) {
//                 await connection.query(
//                     `UPDATE orders 
//                      SET is_split = 1 
//                      WHERE fooder_id = ? 
//                        AND id = ?`, 
//                     [fooder_id, order_id]
//                 );
//             }

//             // Fetch order_no and invoice_no for response
//             const [ordersRes] = await connection.query(
//                 `SELECT order_number_qrcode, invoice_no FROM orders WHERE id = ? AND fooder_id = ?`,
//                 [order_id, fooder_id]
//             );
//             let order_no = "";
//             let invoice_number = "";
//             if (ordersRes.length > 0) {
//                 order_no = ordersRes[0].order_number_qrcode || "";
//                 invoice_number = ordersRes[0].invoice_no
//                     ? `${config.invoice_number_prefix}${ordersRes[0].invoice_no}`
//                     : "";
//             }

//             return res.status(200).json({
//                 status: "success",
//                 message: "Split Bill created successfully",
//                 bills: createdBills,
//                 order_no,
//                 invoice_number
//             });

//         } finally {
//             connection.release();
//         }
//     } catch (error) {
//         console.error('Error in createSplitBill:', error);
//         return res.status(500).json({
//             status: 'error',
//             message: 'Internal server error',
//             errors: error.toString()
//         });
//     }
// };


const createSplitBill = async (req, res) => {
    try {
        const {
            order_id,
            bill_data,
            orderTotal,
            discountRate,
            discountType,
        } = req.body;

        const fooder_id = req.staff.fooder_id;

        if (!order_id || !bill_data || !Array.isArray(bill_data)) {
            return res.status(400).json({
                status: 'error',
                message: 'order_id and bill_data are required. bill_data must be an array.'
            });
        }

        const connection = await pool.getConnection();

        try {
            // Fetch order status and table_id for validations
            const [[orderRow]] = await connection.query(
                `SELECT is_cancelled, payment_status, table_id FROM orders WHERE fooder_id = ? AND id = ?`,
                [fooder_id, order_id]
            );

            if (!orderRow) {
                return res.status(400).json({
                    status: 'error',
                    message: 'Order not found.'
                });
            }

            if (orderRow.is_cancelled == 1) {
                return res.status(400).json({
                    status: 'error',
                    message: 'Order is cancelled.'
                });
            }

            if (orderRow.payment_status == 1) {
                return res.status(400).json({
                    status: 'error',
                    message: 'Order is already paid.'
                });
            }

            // Get table details
            let table_no = "";
            if (orderRow.table_id) {
                const [tableDetails] = await connection.query(
                    `SELECT type, table_no, table_name FROM fooders_tables WHERE id = ?`,
                    [orderRow.table_id]
                );

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
            }

            const creation_date = Math.floor(Date.now() / 1000);

            // Store created bills info for response
            const createdBills = [];

            for (const row of bill_data) {
                // Insert customer if mobile is provided
                if (row.customer_details && row.customer_details.mobile) {
                    await connection.query(
                        "INSERT INTO eaters (name, mobile, joining_date, joining_ip) " +
                        "SELECT ?, ?, ?, ? FROM DUAL " +
                        "WHERE NOT EXISTS (SELECT 1 FROM eaters WHERE mobile = ?)",
                        [
                            row.customer_details.name || '',
                            row.customer_details.mobile,
                            creation_date,
                            req.ipAddress,
                            row.customer_details.mobile
                        ]
                    );
                }

                // Calculate total_tax from amount_details.taxDetails
                let total_tax = 0;
                try {
                    const amountDetails = row.amount_details;
                    if (amountDetails && Array.isArray(amountDetails.taxDetails)) {
                        total_tax = amountDetails.taxDetails.reduce(
                            (sum, tax) => sum + (parseFloat(tax.amount) || 0),
                            0
                        );
                    }
                } catch (e) {
                    total_tax = 0;
                }

                // Insert bill record with total_tax
                const [billResult] = await connection.query(
                    `INSERT INTO orders_bills (order_id, fooder_id, bill_no, amount_data, items_data, customer_data, ip, creation_date, total_tax)
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                    [
                        order_id,
                        fooder_id,
                        row.bill_number,
                        JSON.stringify(row.amount_details),
                        JSON.stringify(row.items_details),
                        JSON.stringify(row.customer_details || {}),
                        req.ipAddress,
                        creation_date,
                        total_tax
                    ]
                );

                createdBills.push({
                    orders_bills_id: billResult.insertId,
                    bill_no: row.bill_number,
                    order_id: order_id,
                    amount_total: row.amount_details?.total || 0,
                    customer_details: row.customer_details || {},
                    total_tax
                });
            }

            await connection.query(
                `UPDATE order_items 
                 SET item_kot_status = 2 
                 WHERE item_kot_status NOT IN (3, 4) 
                   AND fooder_id = ? 
                   AND order_id = ?`,
                [fooder_id, order_id]
            );

            if (bill_data.length > 0) {
                await connection.query(
                    `UPDATE orders 
                     SET is_split = 1 
                     WHERE fooder_id = ? 
                       AND id = ?`,
                    [fooder_id, order_id]
                );
            }

            // Fetch order_no and invoice_no for response
            const [ordersRes] = await connection.query(
                `SELECT order_number_qrcode, invoice_no FROM orders WHERE id = ? AND fooder_id = ?`,
                [order_id, fooder_id]
            );
            let order_no = "";
            let invoice_number = "";
            if (ordersRes.length > 0) {
                order_no = ordersRes[0].order_number_qrcode || "";
                invoice_number = ordersRes[0].invoice_no
                    ? `${config.invoice_number_prefix}${ordersRes[0].invoice_no}`
                    : "";
            }

            return res.status(200).json({
                status: "success",
                message: "Split Bill created successfully",
                bills: createdBills,
                order_no,
                invoice_number,
                table_no
            });

        } finally {
            connection.release();
        }
    } catch (error) {
        console.error('Error in createSplitBill:', error);
        return res.status(500).json({
            status: 'error',
            message: 'Internal server error',
            errors: error.toString()
        });
    }
};

const getSplitBillItems = async (req, res) => {
    try {
        const { bill_no, id, order_id } = req.body;
        const fooder_id = req.staff.fooder_id;

        if (!fooder_id || !order_id || !bill_no || !id) {
            return res.status(400).json({
                status: 'error',
                message: 'fooder_id, order_id, bill_no, and id are required'
            });
        }

        const connection = await pool.getConnection();

        try {
            const [rows] = await connection.query(
                `SELECT * FROM orders_bills 
                 WHERE fooder_id = ? AND order_id = ? AND bill_no = ? AND id = ?`,
                [fooder_id, order_id, bill_no, id]
            );

            if (rows.length === 0) {
                return res.status(404).json({
                    status: 'error',
                    message: 'No split bill found for the provided details'
                });
            }

            // Parse JSON fields
            const bill = rows[0];
            let items_data = [];
            let amount_data = {};
            let customer_data = {};

            try {
                items_data = JSON.parse(bill.items_data);
            } catch (e) {
                items_data = [];
            }
            try {
                amount_data = JSON.parse(bill.amount_data);
            } catch (e) {
                amount_data = {};
            }
            try {
                customer_data = JSON.parse(bill.customer_data);
            } catch (e) {
                customer_data = {};
            }

            // Format items_data fields with type consistency and calculate withOutTaxPrice
            items_data = items_data.map(item => {
                const product_price = Number(item.product_price);
                const itemTaxType = item.item_tax_type !== undefined ? Number(item.item_tax_type) : 0;
                const taxPercent = item.item_tax_percent !== undefined ? Number(item.item_tax_percent) : 0;
                let withOutTaxPrice;

                if (itemTaxType === 0) {
                    withOutTaxPrice = product_price;
                } else if (itemTaxType === 1) {
                    withOutTaxPrice = (product_price * 100) / (100 + taxPercent);
                } else {
                    withOutTaxPrice = product_price;
                }
                withOutTaxPrice = Number(withOutTaxPrice.toFixed(2));
                const taxAmount = Math.round(product_price - withOutTaxPrice);

                // Parse and format variants
                let selectedvariants = null;
                if (item.variant_details) {
                    try {
                        const variantDetails = typeof item.variant_details === 'string'
                            ? JSON.parse(item.variant_details)
                            : item.variant_details;
                        if (variantDetails) {
                            selectedvariants = {
                                variantId: variantDetails.variantId,
                                combination_details: variantDetails.combination_details || []
                            };
                        }
                    } catch (e) {
                        selectedvariants = null;
                    }
                }
                // If selected_variants exists, prefer it
                if (item.selected_variants) {
                    selectedvariants = item.selected_variants;
                }

                // Parse and format addons
                let addons = [];
                if (item.addons_items_details) {
                    try {
                        const addonsDetails = typeof item.addons_items_details === 'string'
                            ? JSON.parse(item.addons_items_details)
                            : item.addons_items_details;
                        addons = addonsDetails.map(addon => ({
                            addon_item_name: addon.addon_item_name || addon.name
                        }));
                    } catch (e) {
                        addons = [];
                    }
                }
                // If selected_addons exists, prefer it
                if (item.selected_addons) {
                    addons = item.selected_addons;
                }

                return {
                    id: Number(item.id),
                    local_id: Number(item.local_id),
                    order_id: Number(item.order_id),
                    product_kot_id: Number(item.product_kot_id),
                    phone: item.phone,
                    menu_id: Number(item.menu_id),
                    product_id: Number(item.product_id),
                    product_name: item.product_name,
                    name: item.product_name,
                    quantity: Number(item.quantity),
                    max_quantity: Number(item.max_quantity),
                    product_price: product_price,
                    withOutTaxPrice: withOutTaxPrice,
                    taxAmount: taxAmount,
                    price: product_price,
                    product_special_note: item.product_special_note,
                    selectedvariants: selectedvariants,
                    addons: addons,
                    packaging_fee: item.packaging_fee !== undefined ? Number(item.packaging_fee) : 0,
                    packaging_charges: item.packaging_charges !== undefined ? Number(item.packaging_charges) : 0,
                    item_kot_status: item.item_kot_status !== undefined ? Number(item.item_kot_status) : null,
                    local_time: item.local_time,
                    item_tax_type: itemTaxType,
                    tax_type: itemTaxType,
                    item_tax_percent: taxPercent,
                    tax_percent: taxPercent,
                };
            });

            // Format amount_data fields with type consistency and include selected_addons/selected_variants
            const formattedAmountData = {
                total: amount_data.total !== undefined ? Number(amount_data.total) : 0,
                subTotal: amount_data.subTotal !== undefined ? Number(amount_data.subTotal) : 0,
                discountDetails: amount_data.discountDetails,
                schDetails: amount_data.schDetails,
                schAmount: amount_data.schAmount !== undefined ? Number(amount_data.schAmount) : 0,
                taxAmount: amount_data.taxAmount !== undefined ? Number(amount_data.taxAmount) : 0,
                taxDetails: amount_data.taxDetails,
                packingCharges: amount_data.packingCharges !== undefined ? Number(amount_data.packingCharges) : 0,
                selected_addons: amount_data.selected_addons || [],
                selected_variants: amount_data.selected_variants || null
            };

            const [orderRows] = await connection.query(
                `SELECT invoice_no FROM orders WHERE id = ? AND fooder_id = ?`,
                [order_id, fooder_id]
            );

            const invoiceNumber = orderRows[0]?.invoice_no || null;
            const invoice_number = invoiceNumber
                ? `${config.invoice_number_prefix}${invoiceNumber}`
                : "";

            // Build response
            const responseData = {
                id: bill.id,
                order_id: bill.order_id,
                fooder_id: bill.fooder_id,
                payment_id: bill.payment_id,
                bill_no: bill.bill_no,
                invoice_number: invoice_number,
                payment_data: bill.payment_data,
                amount_data: formattedAmountData,
                items_data: items_data,
                customer_data: customer_data,
                ip: bill.ip,
                last_updated: bill.last_updated,
                creation_date: bill.creation_date
            };

            return res.status(200).json({
                status: 'success',
                data: responseData
            });
        } finally {
            connection.release();
        }
    } catch (error) {
        console.error('Error in getSplitBillItems:', error);
        return res.status(500).json({
            status: 'error',
            message: 'Internal server error'
        });
    }
};

const updateOrderWithSplitAverages = async (orderId, db, fooder_id) => {
    const connection = await db.getConnection();

    try {
        const [splitRows] = await connection.query(
            `SELECT amount_data FROM orders_bills WHERE order_id = ?`,
            [orderId]
        );

        if (!splitRows.length) {
            return;
        }

        let totalSubTotal = 0;
        let totalDiscountAmount = 0;
        let totalSchAmount = 0;
        let totalTaxAmount = 0;
        let totalTotal = 0;

        let schName = "";
        let schFound = false;

        splitRows.forEach((row) => {
            const amountData = JSON.parse(row.amount_data || '{}');

            const subTotal = parseFloat(amountData.subTotal || 0);
            const discountAmount = parseFloat(amountData.discountDetails?.discountAmount || 0);
            const schAmount = parseFloat(amountData.schAmount || 0);
            const taxAmount = parseFloat(amountData.taxAmount || 0);
            const total = parseFloat(amountData.total || 0);

            if (!schFound && amountData.schDetails?.name) {
                schName = amountData.schDetails.name;
                schFound = true;
            }

            totalSubTotal += subTotal;
            totalDiscountAmount += discountAmount;
            totalSchAmount += schAmount;
            totalTaxAmount += taxAmount;
            totalTotal += total;
        });

        // Calculate effective discount % (5 digits after decimal)
        const effectiveDiscountRate = totalSubTotal > 0
            ? ((totalDiscountAmount / totalSubTotal) * 100).toFixed(5)
            : "0.00000";

        // Calculate effective SCH % (5 digits after decimal)
        const baseAmountForSch = totalSubTotal - totalDiscountAmount;
        const effectiveSchPercentage = baseAmountForSch > 0
            ? ((totalSchAmount / baseAmountForSch) * 100).toFixed(5)
            : "0.00000";

        // Final total from split bills
        const finalTotal = totalTotal.toFixed(2);

        // round_up_amount is always 0
        const roundUpAmount = "0.00";

        const serviceChargeDetails = JSON.stringify({
            name: schName,
            percentage: effectiveSchPercentage,
        });

        await connection.query(
            `UPDATE orders 
             SET discount_rate = ?, 
                 discount_type = 0,
                 service_charge = ?, 
                 service_charge_details = ?, 
                 tax_amount = ?, 
                 tax_details = ?,
                 total = ?,
                 round_up_amount = ?
             WHERE id = ? AND fooder_id = ?`,
            [
                effectiveDiscountRate,
                totalSchAmount.toFixed(2),
                serviceChargeDetails,
                totalTaxAmount.toFixed(2),
                JSON.stringify([]),
                finalTotal,
                roundUpAmount,
                orderId,
                fooder_id,
            ]
        );

    } catch (err) {
        console.error("❌ Error updating order with split averages:", err);
    } finally {
        connection.release();
    }
};






// const markSplitBillAsPaid = async (req, res) => {
//     const { order_id, bill_no, payment_details } = req.body;
//     const fooder_id = req.staff.fooder_id;
//     const ip = req.ipAddress || req.ip;
//     const creation_date = Math.floor(Date.now() / 1000);

//     const connection = await pool.getConnection();
//     try {
//         // 1. Insert new payment entry
//         const [paymentResult] = await connection.query(
//             `INSERT INTO orders_payment (
//                  order_id, fooder_id, paid_amount, payment_type, txn_refrence_number,
//                  payment_details, tip, ip, created_date
//              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
//             [
//                 order_id,
//                 fooder_id,
//                 payment_details.amount,
//                 payment_details.method?.toLowerCase(),
//                 payment_details.transaction_id || "",
//                 JSON.stringify(payment_details),
//                 payment_details.tip || 0,
//                 ip,
//                 creation_date
//             ]
//         );

//         const payment_id = paymentResult.insertId;

//         // 2. Update the corresponding bill
//         const [updateResult] = await connection.query(
//             `UPDATE orders_bills 
//              SET payment_id = ?, payment_data = ? 
//              WHERE order_id = ? AND fooder_id = ? AND bill_no = ?`,
//             [
//                 payment_id,
//                 JSON.stringify(payment_details),
//                 order_id,
//                 fooder_id,
//                 bill_no
//             ]
//         );

//         // 3. Get customer_data for this bill
//         const [billRows] = await connection.query(
//             `SELECT customer_data FROM orders_bills 
//              WHERE order_id = ? AND fooder_id = ? AND bill_no = ?`,
//             [order_id, fooder_id, bill_no]
//         );
//         let customer_data = {};
//         if (billRows.length > 0) {
//             try {
//                 customer_data = JSON.parse(billRows[0].customer_data || '{}');
//             } catch (e) {
//                 customer_data = {};
//             }
//         }

//         // 4. Check if all order items are billed and all bills are paid
//         // Get all order items
//         const [orderItems] = await connection.query(
//             `SELECT product_id, local_time, quantity 
//              FROM order_items 
//              WHERE order_id = ? AND fooder_id = ? AND is_cancelled = 0`,
//             [order_id, fooder_id]
//         );

//         // Get all billed items from orders_bills
//         const [billedRows] = await connection.query(
//             `SELECT items_data, payment_id FROM orders_bills 
//              WHERE order_id = ? AND fooder_id = ?`,
//             [order_id, fooder_id]
//         );

//         // Calculate billed quantities
//         const billedQuantityMap = new Map();
//         let allBillsPaid = true;

//         for (const row of billedRows) {
//             // Check if this bill is paid
//             if (!row.payment_id || row.payment_id === 0) {
//                 allBillsPaid = false;
//             }

//             // Parse billed items for quantity calculation
//             try {
//                 const items = JSON.parse(row.items_data);
//                 for (const item of items) {
//                     const key = `${String(item.product_id)}_${String(item.local_id)}`;
//                     const existingQty = billedQuantityMap.get(key) || 0;
//                     billedQuantityMap.set(key, existingQty + Number(item.quantity || 0));
//                 }
//             } catch (e) {
//                 console.error('Error parsing items_data:', e);
//             }
//         }

//         // Check if all order items are fully billed
//         let allItemsBilled = true;
//         for (const item of orderItems) {
//             const key = `${String(item.product_id)}_${String(item.local_time)}`;
//             const billedQty = Number(billedQuantityMap.get(key) || 0);
//             const originalQty = Number(item.quantity || 0);
            
//             if (billedQty < originalQty) {
//                 allItemsBilled = false;
//                 break;
//             }
//         }

//         // Get main bill invoice_no and order_number_qrcode from orders table
//         const [ordersRes] = await connection.query(
//             `SELECT invoice_no, order_number_qrcode FROM orders WHERE id = ? AND fooder_id = ?`,
//             [order_id, fooder_id]
//         );
//         let invoice_number = "";
//         let orderNo = "";
//         if (ordersRes.length > 0) {
//             invoice_number = ordersRes[0].invoice_no
//                 ? `${config.invoice_number_prefix}${ordersRes[0].invoice_no}`
//                 : "";
//             orderNo = ordersRes[0].order_number_qrcode || "";
//         }

//         // 5. If all items are billed and all bills are paid, mark order as paid and free table
//         if (allItemsBilled && allBillsPaid) {
//             // Update order status to paid
//             await connection.query(
//                 `UPDATE orders 
//                  SET payment_status = 1, payment_type = 'paid' 
//                  WHERE id = ? AND fooder_id = ?`,
//                 [order_id, fooder_id]
//             );

//             // Update SCH, discount, tax, etc. using split averages
//             await updateOrderWithSplitAverages(order_id, pool, fooder_id);

//             // Update stock
//             await calculateStock(order_id, connection, fooder_id);

//             // Free the table
//             await connection.query(
//                 `UPDATE fooders_tables ft 
//                  JOIN orders o ON ft.id = o.table_id 
//                  SET ft.is_booked = 0, ft.booked_by = '{}' 
//                  WHERE ft.fooder_id = ? AND o.id = ?`,
//                 [fooder_id, order_id]
//             );

//             // Update KOT status to completed
//             await connection.query(
//                 `UPDATE fooders_kot 
//                  JOIN order_items ON order_items.product_kot_id = fooders_kot.id 
//                  SET fooders_kot.status = 3 
//                  WHERE fooders_kot.status NOT IN (4, 5) 
//                      AND order_items.fooder_id = ? 
//                      AND order_items.order_id = ?`,
//                 [fooder_id, order_id]
//             );

//             connection.release();

//             return res.status(200).json({
//                 status: "success",
//                 message: "Bill marked as paid. Order completed and table freed.",
//                 payment_id,
//                 updated: updateResult.affectedRows,
//                 order_completed: true,
//                 invoice_number,
//                 orderNo,
//                 customer_data
//             });
//         }

//         connection.release();

//         return res.status(200).json({
//             status: "success",
//             message: "Bill marked as paid.",
//             payment_id,
//             updated: updateResult.affectedRows,
//             order_completed: false,
//             invoice_number,
//             orderNo,
//             customer_data
//         });

//     } catch (err) {
//         console.error("Error in markSplitBillAsPaid:", err);
//         if (connection) connection.release();
//         return res.status(500).json({
//             status: "error",
//             message: "Failed to mark split bill as paid.",
//             error: err.toString()
//         });
//     }
// };


const markSplitBillAsPaid = async (req, res) => {
    const { order_id, bill_no, payment_details } = req.body;
    const fooder_id = req.staff.fooder_id;
    const ip = req.ipAddress;
    const creation_date = Math.floor(Date.now() / 1000);

    const connection = await pool.getConnection();
    try {
        // 1. Insert new payment entry
        const [paymentResult] = await connection.query(
            `INSERT INTO orders_payment (
                 order_id, fooder_id, paid_amount, payment_type, txn_refrence_number,
                 payment_details, tip, ip, created_date
             ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                order_id,
                fooder_id,
                payment_details.amount,
                payment_details.method?.toLowerCase(),
                payment_details.transaction_id || "",
                JSON.stringify(payment_details),
                payment_details.tip || 0,
                ip,
                creation_date
            ]
        );

        const payment_id = paymentResult.insertId;

        // 2. Update the corresponding bill
        const [updateResult] = await connection.query(
            `UPDATE orders_bills 
             SET payment_id = ?, payment_data = ? 
             WHERE order_id = ? AND fooder_id = ? AND bill_no = ?`,
            [
                payment_id,
                JSON.stringify(payment_details),
                order_id,
                fooder_id,
                bill_no
            ]
        );

        // 3. Get customer_data for this bill
        const [billRows] = await connection.query(
            `SELECT customer_data, amount_data FROM orders_bills 
             WHERE order_id = ? AND fooder_id = ? AND bill_no = ?`,
            [order_id, fooder_id, bill_no]
        );
        let customer_data = {};
        let discountType = 0;
        let discountRate = "0";
        let discountAmount = 0;
        
        if (billRows.length > 0) {
            try {
                customer_data = JSON.parse(billRows[0].customer_data || '{}');
                const amountData = JSON.parse(billRows[0].amount_data || '{}');
                if (amountData.discountDetails) {
                    discountType = amountData.discountDetails.discountType || 0;
                    discountRate = amountData.discountDetails.discountRate || "0";
                    discountAmount = amountData.discountDetails.discountAmount || 0;
                }
            } catch (e) {
                console.error('Error parsing JSON data:', e);
            }
        }

        // 4. Get table details
        let table_no = "";
        const [orderTable] = await connection.query(
            `SELECT table_id FROM orders WHERE id = ? AND fooder_id = ?`,
            [order_id, fooder_id]
        );
        
        if (orderTable.length > 0 && orderTable[0].table_id) {
            const [tableDetails] = await connection.query(
                `SELECT type, table_no, table_name FROM fooders_tables WHERE id = ?`,
                [orderTable[0].table_id]
            );

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
        }

        // 5. Check if all order items are billed and all bills are paid
        // Get all order items
        const [orderItems] = await connection.query(
            `SELECT product_id, local_time, quantity 
             FROM order_items 
             WHERE order_id = ? AND fooder_id = ? AND is_cancelled = 0`,
            [order_id, fooder_id]
        );

        // Get all billed items from orders_bills
        const [billedRows] = await connection.query(
            `SELECT items_data, payment_id FROM orders_bills 
             WHERE order_id = ? AND fooder_id = ?`,
            [order_id, fooder_id]
        );

        // Calculate billed quantities
        const billedQuantityMap = new Map();
        let allBillsPaid = true;

        for (const row of billedRows) {
            // Check if this bill is paid
            if (!row.payment_id || row.payment_id === 0) {
                allBillsPaid = false;
            }

            // Parse billed items for quantity calculation
            try {
                const items = JSON.parse(row.items_data);
                for (const item of items) {
                    const key = `${String(item.product_id)}_${String(item.local_id)}`;
                    const existingQty = billedQuantityMap.get(key) || 0;
                    billedQuantityMap.set(key, existingQty + Number(item.quantity || 0));
                }
            } catch (e) {
                console.error('Error parsing items_data:', e);
            }
        }

        // Check if all order items are fully billed
        let allItemsBilled = true;
        for (const item of orderItems) {
            const key = `${String(item.product_id)}_${String(item.local_time)}`;
            const billedQty = Number(billedQuantityMap.get(key) || 0);
            const originalQty = Number(item.quantity || 0);
            
            if (billedQty < originalQty) {
                allItemsBilled = false;
                break;
            }
        }

        // Get main bill invoice_no and order_number_qrcode from orders table
        const [ordersRes] = await connection.query(
            `SELECT invoice_no, order_number_qrcode FROM orders WHERE id = ? AND fooder_id = ?`,
            [order_id, fooder_id]
        );
        let invoice_number = "";
        let orderNo = "";
        if (ordersRes.length > 0) {
            invoice_number = ordersRes[0].invoice_no
                ? `${config.invoice_number_prefix}${ordersRes[0].invoice_no}`
                : "";
            orderNo = ordersRes[0].order_number_qrcode || "";
        }

        // 6. If all items are billed and all bills are paid, mark order as paid and free table
        if (allItemsBilled && allBillsPaid) {
            // Update order status to paid
            await connection.query(
                `UPDATE orders 
                 SET payment_status = 1, payment_type = 'paid' 
                 WHERE id = ? AND fooder_id = ?`,
                [order_id, fooder_id]
            );

            // Update SCH, discount, tax, etc. using split averages
            await updateOrderWithSplitAverages(order_id, pool, fooder_id);

            // Update stock
            await calculateStock(order_id, connection, fooder_id);

            // Free the table
            await connection.query(
                `UPDATE fooders_tables ft 
                 JOIN orders o ON ft.id = o.table_id 
                 SET ft.is_booked = 0, ft.booked_by = '{}' 
                 WHERE ft.fooder_id = ? AND o.id = ?`,
                [fooder_id, order_id]
            );

            // Update KOT status to completed
            await connection.query(
                `UPDATE fooders_kot 
                 JOIN order_items ON order_items.product_kot_id = fooders_kot.id 
                 SET fooders_kot.status = 3 
                 WHERE fooders_kot.status NOT IN (4, 5) 
                     AND order_items.fooder_id = ? 
                     AND order_items.order_id = ?`,
                [fooder_id, order_id]
            );

            connection.release();

            return res.status(200).json({
                status: "success",
                message: "Split bill payment settled successfully.",
                payment_id,
                updated: updateResult.affectedRows,
                order_completed: true,
                invoice_number,
                orderNo,
                customer_data,
                table_no,
                discountType,
                discountRate,
                discountAmount
            });
        }

        connection.release();

        return res.status(200).json({
            status: "success",
            message: "Bill marked as paid.",
            payment_id,
            updated: updateResult.affectedRows,
            order_completed: false,
            invoice_number,
            orderNo,
            customer_data,
            table_no,
            discountType,
            discountRate,
            discountAmount
        });

    } catch (err) {
        console.error("Error in markSplitBillAsPaid:", err);
        if (connection) connection.release();
        return res.status(500).json({
            status: "error",
            message: "Failed to mark split bill as paid.",
            error: err.toString()
        });
    }
};



const cancellBill = async (req, res) => {
    try {
        const { order_id, bill_no } = req.body;
        const fooder_id = req.staff.fooder_id;

        if (!order_id || !bill_no) {
            return res.status(400).json({
                status: 'error',
                message: 'order_id and bill_no are required'
            });
        }

        const connection = await pool.getConnection();
        
        try {
            // Check if the bill exists and is not already paid
            const [billRows] = await connection.query(
                `SELECT id, payment_id, items_data FROM orders_bills 
                 WHERE order_id = ? AND fooder_id = ? AND bill_no = ?`,
                [order_id, fooder_id, bill_no]
            );

            if (billRows.length === 0) {
                return res.status(404).json({
                    status: 'error',
                    message: 'Bill not found'
                });
            }

            const bill = billRows[0];

            // Check if bill is already paid
            if (bill.payment_id && bill.payment_id !== 0) {
                return res.status(400).json({
                    status: 'error',
                    message: 'Cannot cancel a paid bill'
                });
            }

            // Delete the bill
            await connection.query(
                `DELETE FROM orders_bills 
                 WHERE order_id = ? AND fooder_id = ? AND bill_no = ?`,
                [order_id, fooder_id, bill_no]
            );

            // Check if this was the last bill and update order split status
            const [remainingBills] = await connection.query(
                `SELECT COUNT(*) as bill_count FROM orders_bills 
                 WHERE order_id = ? AND fooder_id = ?`,
                [order_id, fooder_id]
            );

            // If no bills remain, mark order as not split
            if (remainingBills[0].bill_count === 0) {
                await connection.query(
                    `UPDATE orders 
                     SET is_split = 0 
                     WHERE id = ? AND fooder_id = ?`,
                    [order_id, fooder_id]
                );
            }

            return res.status(200).json({
                status: 'success',
                message: 'Bill cancelled successfully',
                cancelled_bill_no: bill_no,
                remaining_bills: remainingBills[0].bill_count
            });

        } finally {
            connection.release();
        }
    } catch (error) {
        console.error('Error in cancellBill:', error);
        return res.status(500).json({
            status: 'error',
            message: 'Internal server error',
            error: error.toString()
        });
    }
};







module.exports = {
    getOrderItems,
    createSplitBill,
    getSplitBillItems,
    markSplitBillAsPaid,
    cancellBill,
};