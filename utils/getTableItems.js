// Helper for table_status = 1
// this function is used to get KOT details when the table is booked 
// find OrderItems in both case where either KOT is generated or Order is placed
// it also handle the case where Order is not generated but KOT is present and table is booked
const config = require('../config/config');

async function getTableItems(connection, fooder_id, table_id) {
  // AND DATE(fk.kot_date) = DATE(NOW())
  const [kotRows] = await connection.query(
    `SELECT *
   FROM fooders_kot fk
   WHERE fk.fooder_id = ?
     AND fk.table_id = ?
     AND fk.status NOT IN (4, 5)
     AND fk.is_deleted = 0
     AND fk.is_cancelled = 0
     AND NOT EXISTS (
       SELECT 1
       FROM order_items oi
       WHERE oi.product_kot_id = fk.id
     );`,
    [fooder_id, table_id]
  );

  const kot_prefix = 'KOT';
  let formattedKotDetails = [];
  let is_nc = false; // default for only KOT
  let is_kot_only_committed = false;

  // ✅ 1. If unassigned fresh KOTs found
  if (kotRows.length > 0) {
    kotRows.forEach(kot => {
      const removedItemsSet = new Set();
      try {
        const removedItems = kot.remove_items
          ? typeof kot.remove_items === 'string'
            ? JSON.parse(kot.remove_items)
            : kot.remove_items
          : [];
        removedItems.forEach(item => {
          if (item.product_id && item.local_id) {
            removedItemsSet.add(`${item.product_id}_${item.local_id}`);
          }
        });
      } catch (e) {
        console.error('Invalid remove_items JSON for KOT:', kot.id);
      }

      let staffDetails = null;
      if (kot.created_by) {
        try {
          const createdBy = typeof kot.created_by === 'string' ? JSON.parse(kot.created_by) : kot.created_by;
          staffDetails = {
            staff_id: createdBy.staff_id,
            staff_name: createdBy.staff_name
          };
        } catch (e) {
          staffDetails = null;
        }
      }

      let products = [];
      try {
        products = typeof kot.kot_details === 'string' ? JSON.parse(kot.kot_details) : kot.kot_details;
      } catch (e) {
        products = [];
      }

      products.forEach(item => {
        const uniqueKey = `${item.product_id}_${item.local_id}`;
        if (removedItemsSet.has(uniqueKey)) return;

        const variantDetail = item.selectedvariants || item.variant || null;

        const formattedAddons = item.selectedAddons?.map(addon => ({
          addon_item_name: addon.addon_item_name
        })) || [];

        const price = Number(item.product_price || item.price || 0);
        const taxPercent = Number(item.tax_percent || 0);
        const itemTaxType = typeof item.tax_type !== 'undefined' ? Number(item.tax_type) : 0; // <-- get from kot_details.tax_type
        // Calculate withOutTaxPrice based on item_tax_type
        let withOutTaxPrice;
        if (itemTaxType === 0) {
          // Tax excluded
          withOutTaxPrice = price;
        } else if (itemTaxType === 1) {
          // Tax included
          withOutTaxPrice = (price * 100) / (100 + taxPercent);
        } else {
          withOutTaxPrice = price;
        }
        const taxAmount = Math.round(price - withOutTaxPrice);

        const kot_no = kot.kot_number || kot.KOT_no || '';
        const KOT_no = `${kot_prefix}-${kot_no}`;

        // Get product_special_note from item.note if present
        let product_special_note = null;
        if (typeof item.note !== 'undefined') {
          product_special_note = item.note;
        }

        formattedKotDetails.push({
          id: item.product_id || item.id,
          name: item.name || item.product_name,
          quantity: item.quantity || 1,
          price,
          menu_id: item.menu_id || null,
          selectedvariants: variantDetail
            ? {
              variantId: variantDetail.variantId,
              combination_details: variantDetail.combination_details || []
            }
            : null,
          addons: formattedAddons,
          KOT_id: kot.id || null,
          KOT_no,
          isKOT: true,
          tax_percent: taxPercent,
          tax_amount: taxAmount,
          withOutTaxPrice,
          tax_type: itemTaxType, // <-- send tax_type to frontend
          staffDetails: staffDetails,
          kot_timestamp: kot.created_date,
          local_id: item.local_id || null, // <-- Added local_id here
          min_order_quantity: item.min_order_quantity || null, // <-- Added min_order_quantity
          product_special_note // <-- Added for KOT only
        });
      });
    });
    is_nc = false; // Only KOT, so is_nc is always false
    is_kot_only_committed = true;
  } else {
    // ✅ 2. Fallback: Join order_items + fooders_kot + fooder_staff
    const [orderIdRow] = await connection.query(
      `SELECT id, is_nc FROM orders 
       WHERE fooder_id = ? AND table_id = ? AND is_cancelled = 0 AND status != 4 AND payment_status = 0 AND id > ?
       ORDER BY CAST(creation_date AS UNSIGNED) DESC
       LIMIT 1`,
      [fooder_id, table_id, config.lastorderid]
    );

    if (orderIdRow.length > 0) {
      const latestOrderId = orderIdRow[0].id;
      is_nc = orderIdRow[0].is_nc == 1 ? true : false;
      is_kot_only_committed = false;

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
       AND oi.is_cancelled = 0
       AND o.payment_status = 0`,
        [latestOrderId]
      );

      // Parse service_charge_details once per order
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
          // fallback to default
        }
      }


      for (const item of orderItems) {
        const variantDetail = item.variant_details ? JSON.parse(item.variant_details) : null;
        const formattedAddons = item.addons_items_details ? JSON.parse(item.addons_items_details) : [];

        const price = Number(item.product_price || item.price || 0);
        const taxPercent = Number(item.item_tax_percent || 0);
        const itemTaxType = typeof item.item_tax_type !== 'undefined' ? Number(item.item_tax_type) : 0; // <-- get from order_items.item_tax_type
        // Calculate withOutTaxPrice based on item_tax_type
        let withOutTaxPrice;
        if (itemTaxType === 0) {
          // Tax excluded
          withOutTaxPrice = price;
        } else if (itemTaxType === 1) {
          // Tax included
          withOutTaxPrice = (price * 100) / (100 + taxPercent);
        } else {
          withOutTaxPrice = price;
        }
        const taxAmount = Math.round(price - withOutTaxPrice);

        const KOT_no = item.kot_number ? `KOT-${item.kot_number}` : '';

        // Parse kot_created_by for staffdetails if available
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
            // fallback to default staffdetails
          }
        }

        // Get product_special_note from order_items.product_special_note
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
          selectedvariants: variantDetail
            ? {
              variantId: variantDetail.variantId,
              combination_details: variantDetail.combination_details || []
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
          tax_type: itemTaxType, // <-- send tax_type to frontend
          staffDetails,
          kot_timestamp: item.kot_created_date || item.creation_date || null,
          order_service_charge: {
            name: serviceChargeObj.name,
            percentage: serviceChargeObj.percentage
          },
          local_id: item.local_time || null, // <-- Added local_id from order_items.local_time
          address: item.address || null,
          eater_phonenumber: item.eater_phonenumber || null,
          eater_suggestions: item.eater_suggestions || null,
          no_of_eaters: item.no_of_eaters || null,
          discount_type: item.discount_type ?? null,
          discount_value: item.discount_rate ?? null,
          eater_name: item.eater_name || null,
          min_order_quantity: item.min_order_quantity || null, // <-- Added min_order_quantity
          product_special_note // <-- Added for order_items
        });
      }
    } else {
      is_nc = false; // No order, only KOT, so is_nc is false
      is_kot_only_committed = kotRows.length > 0;
    }
  }

  // Sort by kot_timestamp ascending (oldest first)
  formattedKotDetails.sort((a, b) => {
    // Handle both UNIX timestamp (seconds) and ISO string
    const parseTimestamp = (ts) => {
      if (!ts) return 0;
      // If it's a number or numeric string, treat as UNIX seconds
      if (!isNaN(ts)) {
        // If it's 10 digits, assume seconds; if 13, assume ms
        const num = Number(ts);
        return num > 1e12 ? num : num * 1000;
      }
      // Otherwise, try Date.parse
      return Date.parse(ts) || 0;
    };
    const t1 = parseTimestamp(a.kot_timestamp);
    const t2 = parseTimestamp(b.kot_timestamp);
    return t1 - t2;
  });

  return {
    items: formattedKotDetails,
    is_nc,
    is_kot_only_committed
  };
};

module.exports = {
  getTableItems
};