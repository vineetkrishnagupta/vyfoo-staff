// use this function to retrieve order items for a specific table if it is booked and has an active order and 
// filter out cancelled splitted items and non splitted items
// use for get data in split bill model

async function getOrderItems(connection, fooder_id, table_id, lastOrderId) {
  let formattedOrderDetails = [];

  // Step 1: Get latest active order for this table
  const [orderIdRow] = await connection.query(
    `SELECT id FROM orders 
     WHERE fooder_id = ? AND table_id = ? AND is_cancelled = 0 AND status != 4 AND payment_status = 0 AND id > ?
     ORDER BY CAST(creation_date AS UNSIGNED) DESC
     LIMIT 1`,
    [fooder_id, table_id, lastOrderId]
  );

  if (orderIdRow.length === 0) {
    return {
      status: 'error',
      message: 'No order generated for this table',
      data: []
    };
  }

  const latestOrderId = orderIdRow[0].id;

  // Step 2: Get all order items
  const [orderItems] = await connection.query(
    `SELECT 
       oi.*, 
       fs.id AS staff_id,
       fs.name AS staff_name,
       fk.kot_number,
       o.order_number_qrcode,
       o.service_charge_details,
       o.address,
       o.eater_phonenumber,
       o.no_of_eaters,
       o.eater_name,
       o.discount_type,
       o.discount_rate,
       fk.created_date AS kot_created_date,
       fk.created_by as kot_created_by,
       fp.min_order_quantity
     FROM order_items oi
     LEFT JOIN orders o ON o.id = oi.order_id
     LEFT JOIN fooder_staff fs ON fs.id = o.waiter_id
     LEFT JOIN fooders_kot fk ON fk.id = oi.product_kot_id
     LEFT JOIN fooders_products fp ON fp.id = oi.product_id
     WHERE oi.order_id = ? 
     AND fk.is_deleted = 0
     AND oi.is_cancelled = 0`,
    [latestOrderId]
  );

  // Step 3: Get all billed items and bill amounts from orders_bills
  const [billedRows] = await connection.query(
    `SELECT id, bill_no, items_data, amount_data, payment_id FROM orders_bills WHERE order_id = ?`,
    [latestOrderId]
  );

  const billedQuantityMap = new Map();
  const all_bills = [];
  let last_bill_no = 0;

  for (const row of billedRows) {
    // Track last bill number
    if (row.bill_no && row.bill_no > last_bill_no) {
      last_bill_no = row.bill_no;
    }

    // Parse total amount from amount_data
    try {
      const amountData = typeof row.amount_data === "string"
        ? JSON.parse(row.amount_data)
        : row.amount_data;

      if (amountData && typeof amountData.total !== "undefined") {
        all_bills.push({
          bill_no: row.bill_no,
          total: Number(amountData.total).toFixed(2)
        });
      }
    } catch (e) {
      // Ignore parse errors
    }

    // Parse billed items for quantity deduction
    try {
      const items = JSON.parse(row.items_data);
      for (const item of items) {
        const key = `${String(item.product_id)}_${String(item.local_id)}`;
        const existingQty = billedQuantityMap.get(key) || 0;
        billedQuantityMap.set(key, existingQty + Number(item.quantity || 0));
      }
    } catch (e) {
      // Ignore parse errors
    }
  }

  // Step 4: Parse service charge details once
  let serviceChargeObj = { name: "SCH", percentage: 0 };
  if (orderItems.length > 0 && orderItems[0].service_charge_details) {
    try {
      const parsed = typeof orderItems[0].service_charge_details === "string"
        ? JSON.parse(orderItems[0].service_charge_details)
        : orderItems[0].service_charge_details;
      if (parsed && typeof parsed === "object") {
        serviceChargeObj = {
          name: parsed.name || "SCH",
          percentage: typeof parsed.percentage === "number"
            ? parsed.percentage
            : Number(parsed.percentage) || 0
        };
      }
    } catch (e) {
      // Ignore parse errors
    }
  }

  // Step 5: Loop and prepare response
  for (const item of orderItems) {
    const key = `${String(item.product_id)}_${String(item.local_time)}`;
    const billedQty = Number(billedQuantityMap.get(key) || 0);
    const originalQty = Number(item.quantity || 0);
    const remainingQty = originalQty - billedQty;

    if (remainingQty <= 0) continue; // Skip fully billed items

    const variantDetails = item.variant_details ? JSON.parse(item.variant_details) : null;
    const formattedAddons = item.addons_items_details ? JSON.parse(item.addons_items_details) : [];

    const price = Number(item.product_price || item.price || 0);
    const taxPercent = Number(item.item_tax_percent || 0);
    const itemTaxType = typeof item.item_tax_type !== 'undefined' ? Number(item.item_tax_type) : 0;

    let withOutTaxPrice;
    if (itemTaxType === 0) {
      withOutTaxPrice = price;
    } else if (itemTaxType === 1) {
      withOutTaxPrice = (price * 100) / (100 + taxPercent);
    } else {
      withOutTaxPrice = price;
    }

    const taxAmount = Math.round(price - withOutTaxPrice);
    const KOT_no = item.kot_number ? `KOT-${item.kot_number}` : '';

    let staffDetails = {
      staff_id: item.staff_id || null,
      staff_name: item.staff_name || null
    };
    if (item.kot_created_by) {
      try {
        const createdBy = typeof item.kot_created_by === 'string'
          ? JSON.parse(item.kot_created_by)
          : item.kot_created_by;
        if (createdBy && createdBy.staff_id && createdBy.staff_name) {
          staffDetails = {
            staff_id: createdBy.staff_id,
            staff_name: createdBy.staff_name
          };
        }
      } catch (e) {
        // Ignore parse errors
      }
    }

    formattedOrderDetails.push({
      id: item.product_id || item.id,
      name: item.product_name || item.name,
      quantity: remainingQty,
      price,
      menu_id: item.menu_id || null,
      selectedvariants: variantDetails
        ? {
          variantId: variantDetails.variantId,
          combination_details: variantDetails.combination_details || []
        }
        : null,
      addons: formattedAddons.map(addon => ({
        addon_item_name: addon.addon_item_name || addon.name
      })),
      KOT_id: item.product_kot_id || null,
      KOT_no,
      isKOT: true,
      isSaved: true,
      orderId: item.order_id || null,
      orderNo: item.order_number_qrcode,
      tax_percent: taxPercent,
      tax_amount: taxAmount,
      withOutTaxPrice,
      tax_type: itemTaxType,
      staffDetails,
      kot_timestamp: item.kot_created_date || item.creation_date || null,
      order_service_charge: {
        name: serviceChargeObj.name,
        percentage: serviceChargeObj.percentage
      },
      local_id: item.local_time,
      address: item.address || null,
      eater_phonenumber: item.eater_phonenumber || null,
      no_of_eaters: item.no_of_eaters || null,
      discount_type: item.discount_type ?? null,
      discount_value: item.discount_rate ?? null,
      eater_name: item.eater_name || null,
      min_order_quantity: item.min_order_quantity || null
    });
  }

  // Step 6: Sort items by KOT timestamp
  formattedOrderDetails.sort((a, b) => {
    const parseTimestamp = (ts) => {
      if (!ts) return 0;
      if (!isNaN(ts)) {
        const num = Number(ts);
        return num > 1e12 ? num : num * 1000;
      }
      return Date.parse(ts) || 0;
    };
    return parseTimestamp(a.kot_timestamp) - parseTimestamp(b.kot_timestamp);
  });

  // Prepare all_bills with required fields and is_paid
  const createdBills = billedRows.map(row => {
    let amount_total = 0;
    try {
      const amountData = typeof row.amount_data === "string"
        ? JSON.parse(row.amount_data)
        : row.amount_data;
      amount_total = amountData && typeof amountData.total !== "undefined"
        ? Number(amountData.total)
        : 0;
    } catch (e) {
      amount_total = 0;
    }
    return {
      bill_no: row.bill_no,
      amount_total,
      order_id: latestOrderId,
      orders_bills_id: row.id,
      is_billed: true,
      is_paid: row.payment_id && row.payment_id !== 0 ? true : false
    };
  });

  // Validation: If no items and all bills are paid, return all bills with paid message
  if (formattedOrderDetails.length === 0 && createdBills.length > 0 && createdBills.every(bill => bill.is_paid)) {
    return {
      status: 'error',
      message: 'All bills for this order are already paid',
      data: [],
      last_bill_no,
      bills: createdBills
    };
  }

  // Add orderNo to each bill in createdBills
  createdBills.forEach(bill => {
    bill.order_no = orderItems.length > 0 ? orderItems[0].order_number_qrcode : null;
  });

  return {
    status: 'success',
    message: 'Order items retrieved successfully',
    data: formattedOrderDetails,
    last_bill_no,
    bills: createdBills
  };
};

async function getOrderItemsByOrderIdUtils(connection, fooder_id, order_id) {
  // Join fooders_tables to get table_no and order_type
  const [orderIdRow] = await connection.query(
    `SELECT o.id, o.is_nc, o.table_id, o.order_type, ft.table_no
     FROM orders o
     LEFT JOIN fooders_tables ft ON ft.id = o.table_id
     WHERE o.fooder_id = ? AND o.id = ? AND o.is_cancelled = 0 AND o.status != 4
     LIMIT 1`,
    [fooder_id, order_id]
  );

  let formattedKotDetails = [];
  let is_nc = false;
  let eaterDetails = {};
  let discountDetails = {};
  let order_service_charge = {};
  let table_no = null;
  let table_id = null;
  let order_type = null;

  if (orderIdRow.length > 0) {
    // console.log('orderIdRow:', orderIdRow);
    is_nc = orderIdRow[0].is_nc == 1 ? true : false;
    table_no = orderIdRow[0].table_no || null;
    table_id = orderIdRow[0].table_id || null;
    order_type = orderIdRow[0].order_type || null;

    const [orderItems] = await connection.query(
      `SELECT 
       oi.*, 
       fs.id AS staff_id,
       fs.name AS staff_name,
       fk.kot_number,
       o.order_number_qrcode,
       o.service_charge_details,
       o.address,
       o.eater_phonenumber,
       o.eater_suggestions,
       o.no_of_eaters,
       o.eater_name,
       o.discount_type,
       o.discount_rate,
       fk.created_date AS kot_created_date,
       fk.created_by as kot_created_by,
       fp.min_order_quantity
     FROM order_items oi
     LEFT JOIN orders o ON o.id = oi.order_id
     LEFT JOIN fooder_staff fs ON fs.id = o.waiter_id
     LEFT JOIN fooders_kot fk ON fk.id = oi.product_kot_id
     LEFT JOIN fooders_products fp ON fp.id = oi.product_id
     WHERE oi.order_id = ? 
       AND fk.is_deleted = 0
       AND oi.is_cancelled = 0`,
      [order_id]
    );

    if (orderItems.length > 0) {
      const first = orderItems[0];
      eaterDetails = {
        eater_name: first.eater_name || null,
        eater_phonenumber: first.eater_phonenumber || null,
        eater_suggestions: first.eater_suggestions || null,
        address: first.address || null
      };
      discountDetails = {
        discount_type: first.discount_type ?? null,
        discount_value: first.discount_rate ?? null
      };
      order_service_charge = { name: "SCH", percentage: 0 };
      if (first.service_charge_details) {
        try {
          const parsed = typeof first.service_charge_details === "string"
            ? JSON.parse(first.service_charge_details)
            : first.service_charge_details;
          if (parsed && typeof parsed === "object") {
            order_service_charge = {
              name: parsed.name || "SCH",
              percentage: typeof parsed.percentage === "number"
                ? parsed.percentage
                : Number(parsed.percentage) || 0
            };
          }
        } catch (e) {}
      }
    }

    for (const item of orderItems) {
      const variantDetails = item.variant_details ? JSON.parse(item.variant_details) : null;
      const formattedAddons = item.addons_items_details ? JSON.parse(item.addons_items_details) : [];

      const price = Number(item.product_price || item.price || 0);
      const taxPercent = Number(item.item_tax_percent || 0);
      const itemTaxType = typeof item.item_tax_type !== 'undefined' ? Number(item.item_tax_type) : 0;

      let withOutTaxPrice;
      if (itemTaxType === 0) {
        withOutTaxPrice = price;
      } else if (itemTaxType === 1) {
        withOutTaxPrice = (price * 100) / (100 + taxPercent);
      } else {
        withOutTaxPrice = price;
      }
      const taxAmount = Math.round(price - withOutTaxPrice);

      const KOT_no = item.kot_number ? `KOT-${item.kot_number}` : '';

      let staffDetails = {
        staff_id: item.staff_id || null,
        staff_name: item.staff_name || null
      };
      if (item.kot_created_by) {
        try {
          const createdBy = typeof item.kot_created_by === 'string'
            ? JSON.parse(item.kot_created_by)
            : item.kot_created_by;
          if (createdBy && createdBy.staff_id && createdBy.staff_name) {
            staffDetails = {
              staff_id: createdBy.staff_id,
              staff_name: createdBy.staff_name
            };
          }
        } catch (e) {}
      }

      let product_special_note = null;
      if (typeof item.product_special_note !== 'undefined') {
        product_special_note = item.product_special_note;
      }

      formattedKotDetails.push({
        id: item.product_id || item.id,
        name: item.product_name || item.name,
        quantity: item.quantity || 1,
        price,
        menu_id: item.menu_id || null,
        selectedvariants: variantDetails
          ? {
            variantId: variantDetails.variantId,
            combination_details: variantDetails.combination_details || []
          }
          : null,
        addons: formattedAddons.map(addon => ({
          addon_item_name: addon.addon_item_name || addon.name
        })),
        selected_addons: formattedAddons, // <-- Added selected_addons key
        packaging_fee: Number(item.packaging_fee || 0),
        KOT_id: item.product_kot_id || null,
        KOT_no,
        isKOT: true,
        isSaved: true,
        orderId: item.order_id || null,
        orderNo: item.order_number_qrcode,
        tax_percent: taxPercent,
        tax_amount: taxAmount,
        withOutTaxPrice,
        tax_type: itemTaxType,
        staffDetails,
        kot_timestamp: item.kot_created_date || item.creation_date || null,
        local_id: item.local_time || null,
        no_of_eaters: item.no_of_eaters || null,
        min_order_quantity: item.min_order_quantity || null,
        product_special_note
      });
    }
  }

  formattedKotDetails.sort((a, b) => {
    const parseTimestamp = (ts) => {
      if (!ts) return 0;
      if (!isNaN(ts)) {
        const num = Number(ts);
        return num > 1e12 ? num : num * 1000;
      }
      return Date.parse(ts) || 0;
    };
    const t1 = parseTimestamp(a.kot_timestamp);
    const t2 = parseTimestamp(b.kot_timestamp);
    return t1 - t2;
  });

  let table_no_formatted = '';
      if (table_id) {
        const [tableRows] = await connection.query(
          `SELECT type, table_no, table_name FROM fooders_tables WHERE id = ?`,
          [table_id]
        );
        if (tableRows.length > 0) {
          const table = tableRows[0];
          if (table.type === 0 || table.type === 2) {
            table_no_formatted = table.table_name
              ? `${table.table_name}-${table.table_no}`
              : `Table No - ${table.table_no}`;
          } else {
            table_no_formatted = `${table.table_no}`;
          }
        }
      }

  return {
    items: formattedKotDetails,
    eaterDetails,
    discountDetails,
    order_service_charge,
    is_nc,
    table_no: table_no_formatted,
    table_id,
    order_type // <-- Added order_type in response
  };
}


module.exports = {
  getOrderItems,
  getOrderItemsByOrderIdUtils
};