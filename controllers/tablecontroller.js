const db = require("../config/db");
const { getTableItems } = require('../utils/getTableItems');
const config = require('../config/config');


exports.switchTable = async (req, res) => {
  const connection = await db.getConnection();

  try {
    const fooder_id = req.staff.fooder_id;
    const { from_table_id, to_table_id, kot_ids } = req.body;


     
    // Check if both tables exist
    const [fromTable] = await connection.query(
      `SELECT * FROM fooders_tables WHERE id = ? AND fooder_id = ?`,
      [from_table_id, fooder_id]
    );

    const [toTable] = await connection.query(
      `SELECT * FROM fooders_tables WHERE id = ? AND fooder_id = ?`,
      [to_table_id, fooder_id]
    );

    if (!fromTable.length || !toTable.length) {
      connection.release();
      return res.status(400).send({
        status: "fail",
        message: "Invalid table IDs",
      });
    }

 
    if (toTable[0].is_booked === 1) {
      connection.release();
      return res.status(400).send({
        status: "fail",
        message: "Target table is not free",
      });
    }

    // Switch the tables: update table_id in KOTs
    await connection.query(
      `UPDATE fooders_kot SET table_id = ? WHERE table_id = ? AND id IN (?) AND fooder_id = ?`,
      [to_table_id, from_table_id, kot_ids, fooder_id]
    );

    // Mark from_table as free and to_table as booked
    await connection.query(
      `UPDATE fooders_tables SET is_booked = 0, booked_by = '{}' WHERE id = ? AND fooder_id = ?`,
      [from_table_id, fooder_id]
    );
    await connection.query(
      `UPDATE fooders_tables SET is_booked = 1 WHERE id = ? AND fooder_id = ?`,
      [to_table_id, fooder_id]
    );

    connection.release();

    return res.status(200).send({
      status: "success",
      message: "Table switched successfully",
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



// exports.switchTableKOTUpdate = async (req, res) => {
//   const connection = await db.getConnection();

//   try {
//     const fooder_id = req.staff.fooder_id;
//     const { kot_array, table_id, order_id } = req.body;
//     const [ordersRes] = await connection.query(
//       "SELECT payment_status, is_cancelled FROM orders WHERE id = ?",
//       [order_id]
//     );

//     if (ordersRes.length > 0) {
//       if (ordersRes[0].payment_status != 0) {
//         connection.release();
//         return res.status(400).send({
//           status: "fail",
//           message: "Order already paid",
//           error_code: "order_paided",
//         });
//       }
//       if (ordersRes[0].is_cancelled != 0) {
//         connection.release();
//         return res.status(400).send({
//           status: "fail",
//           message: "Order already cancelled!!!",
//           error_code: "order_cancelled",
//         });
//       }
//     }

//     // Get the old booked_by value from the old table (from the first KOT)
//     let oldBookedBy = {};
//     if (kot_array.length > 0) {
//       // Get the old table_id from the first KOT
//       const [selectKotData] = await connection.query(
//         `SELECT kot_details FROM fooders_kot WHERE id = ? AND fooder_id = ?`,
//         [kot_array[0], fooder_id]
//       );
//       let kotDetailsArray = JSON.parse(selectKotData[0].kot_details);
//       const oldTableId = kotDetailsArray[0].table_id;

//       // Get the booked_by value from the old table
//       const [oldTableData] = await connection.query(
//         `SELECT booked_by FROM fooders_tables WHERE id = ? AND fooder_id = ?`,
//         [oldTableId, fooder_id]
//       );
//       oldBookedBy = oldTableData[0]?.booked_by || "{}";
//     }

//     for (const kotId of kot_array) {
//       const [selectKotData] = await connection.query(
//         `SELECT 
//            id, 
//            kot_details
//          FROM fooders_kot
//          WHERE id = ? AND fooder_id = ?`,
//         [kotId, fooder_id]
//       );

//       let kotDetailsArray = JSON.parse(selectKotData[0].kot_details);

//       // Remove booked_by from old table
//       await connection.query(
//         `UPDATE fooders_tables SET is_booked = 0, booked_by = ? WHERE id = ? and fooder_id = ?`,
//         [JSON.stringify({}), kotDetailsArray[0].table_id, fooder_id]
//       );

//       for (let i = 0; i < kotDetailsArray.length; i++) {
//         kotDetailsArray[i].table_id = table_id;
//       }

//       await connection.query(
//         `UPDATE fooders_kot SET kot_details = ?, table_id = ? WHERE id = ? AND fooder_id = ?`,
//         [JSON.stringify(kotDetailsArray), table_id, kotId, fooder_id]
//       );
//     }

//     // Set booked_by for new table using the old value
//     await connection.query(
//       `UPDATE fooders_tables SET is_booked = 1, booked_by = ? WHERE id = ? and fooder_id = ?`,
//       [oldBookedBy, table_id, fooder_id]
//     );

//     connection.release();

//     return res.status(200).send({
//       status: "success",
//       message: "Table switch successfully...",
//     });

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


// exports.switchTablePos = async (req, res) => {
//   const connection = await db.getConnection();
//   try {
//     const fooder_id = req.staff.fooder_id;
//     const { order_id, table_id } = req.body;



//     const [ordersRes] = await connection.query(
//       "SELECT payment_status, is_cancelled FROM orders WHERE id = ?",
//       [order_id]
//     );

//     if (ordersRes.length > 0) {
//       if (ordersRes[0].payment_status != 0) {
//         connection.release();
//         return res.status(400).send({
//           status: "fail",
//           error_code: "order_paided",
//           message: "Order already paid",
//         });
//       }
//       if (ordersRes[0].is_cancelled != 0) {
//         connection.release();
//         return res.status(400).send({
//           status: "fail",
//           error_code: "order_cancelled",
//           message: "Order already cancelled!!!",
//         });
//       }
//     }














//     //     const orderCommittedSql = `
//     //     SELECT COUNT(*) as committed FROM orders WHERE table_id = ? and order_mode IN (0, 2, 3) and payment_status = 0 and status != 4 and is_cancelled = 0 and order_type = 'dine_in' and creation_date >= UNIX_TIMESTAMP(CURDATE()) and fooder_id = ?;
//     //  `;

//     //     const [[order_committed_results]] = await connection.query(orderCommittedSql, [table_id, fooder_id]);


//     //     if (order_committed_results.committed != 0) {
//     //       connection.release();
//     //       return res.status(400).send({
//     //         status: "fail",
//     //         message: "Table already Booked!!",
//     //         error_code: "ALREADY_BOOKED"

//     //       });
//     //     }
//     // const kotCommittedSql = `
//     //  SELECT COUNT(*) as committed 
//     //  FROM fooders_kot fk
//     //  WHERE fk.created_date >= UNIX_TIMESTAMP(CURDATE())
//     //  AND fk.fooder_id = ?
//     //  AND JSON_UNQUOTE(JSON_EXTRACT(fk.kot_details, '$[0].table_id')) = ?
//     //  AND fk.id NOT IN (
//     //  SELECT oi.product_kot_id 
//     //  FROM order_items oi
//     //  );`;
//     // const [[kot_committed_results]] = await connection.query(kotCommittedSql, [fooder_id, table_id]);
//     // if (kot_committed_results.committed != 0) {
//     //   connection.release();
//     //   return res.status(400).send({
//     //     status: "fail",
//     //     message: "Table already Booked!!",
//     //     error_code: "ALREADY_BOOKED"
//     //   });
//     // }




//     await connection.query(
//       `UPDATE order_items SET table_id = ? WHERE order_id = ? AND fooder_id = ?`,
//       [table_id, order_id, fooder_id]
//     );

//     const [result] = await connection.query(
//       `UPDATE orders SET table_id = ? WHERE id = ? AND fooder_id = ?`,
//       [table_id, order_id, fooder_id]
//     );

//     // console.log(result)
//     connection.release();

//     if (
//       result &&
//       result.affectedRows === 0
//     ) {
//       return res.status(400).send({
//         status: "fail",
//         message: "Something went wrong!!!",
//       });
//     }
//     return res.status(200).send({
//       status: "success",
//       message: "Table switch successfully...",
//     });



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


async function switchTableKOTUpdatefunc({ fooder_id, kot_array, table_id, order_id }) {
  const connection = await db.getConnection();

  try {
    if (order_id) {
      const [ordersRes] = await connection.query(
        "SELECT payment_status, is_cancelled FROM orders WHERE id = ?",
        [order_id]
      );

      if (ordersRes.length > 0) {
        if (ordersRes[0].payment_status != 0) {
          connection.release();
          return { success: false, code: 400, message: "Order already paid", error_code: "order_paided" };
        }
        if (ordersRes[0].is_cancelled != 0) {
          connection.release();
          return { success: false, code: 400, message: "Order already cancelled", error_code: "order_cancelled" };
        }
      }
    }

    let oldBookedBy = {};
    if (kot_array.length > 0) {
      const [selectKotData] = await connection.query(
        `SELECT kot_details FROM fooders_kot WHERE id = ? AND fooder_id = ?`,
        [kot_array[0], fooder_id]
      );
      let kotDetailsArray = JSON.parse(selectKotData[0].kot_details);
      const oldTableId = kotDetailsArray[0].table_id;

      const [oldTableData] = await connection.query(
        `SELECT booked_by FROM fooders_tables WHERE id = ? AND fooder_id = ?`,
        [oldTableId, fooder_id]
      );
      oldBookedBy = oldTableData[0]?.booked_by || "{}";
    }

    for (const kotId of kot_array) {
      const [selectKotData] = await connection.query(
        `SELECT id, kot_details FROM fooders_kot WHERE id = ? AND fooder_id = ?`,
        [kotId, fooder_id]
      );

      let kotDetailsArray = JSON.parse(selectKotData[0].kot_details);

      await connection.query(
        `UPDATE fooders_tables SET is_booked = 0, booked_by = ? WHERE id = ? and fooder_id = ?`,
        [JSON.stringify({}), kotDetailsArray[0].table_id, fooder_id]
      );

      for (let i = 0; i < kotDetailsArray.length; i++) {
        kotDetailsArray[i].table_id = table_id;
      }

      await connection.query(
        `UPDATE fooders_kot SET kot_details = ?, table_id = ? WHERE id = ? AND fooder_id = ?`,
        [JSON.stringify(kotDetailsArray), table_id, kotId, fooder_id]
      );
    }

    await connection.query(
      `UPDATE fooders_tables SET is_booked = 1, booked_by = ? WHERE id = ? and fooder_id = ?`,
      [oldBookedBy, table_id, fooder_id]
    );

    connection.release();

    return { success: true, code: 200, message: "KOT switched successfully" };

  } catch (error) {
    if (connection) connection.release();
    return { success: false, code: 500, message: "Internal server error", error: error.toString() };
  }
};


// async function  switchTablePosfunc ({ fooder_id, table_id, order_id }) {
//   const connection = await db.getConnection();

//   try {
//     const [ordersRes] = await connection.query(
//       "SELECT payment_status, is_cancelled FROM orders WHERE id = ?",
//       [order_id]
//     );

//     if (ordersRes.length > 0) {
//       if (ordersRes[0].payment_status != 0) {
//         connection.release();
//         return { success: false, code: 400, message: "Order already paid", error_code: "order_paided" };
//       }
//       if (ordersRes[0].is_cancelled != 0) {
//         connection.release();
//         return { success: false, code: 400, message: "Order already cancelled", error_code: "order_cancelled" };
//       }
//     }

//     await connection.query(
//       `UPDATE order_items SET table_id = ? WHERE order_id = ? AND fooder_id = ?`,
//       [table_id, order_id, fooder_id]
//     );

//     const [result] = await connection.query(
//       `UPDATE orders SET table_id = ? WHERE id = ? AND fooder_id = ?`,
//       [table_id, order_id, fooder_id]
//     );

//     connection.release();

//     if (!result || result.affectedRows === 0) {
//       return { success: false, code: 400, message: "Something went wrong" };
//     }

//     return { success: true, code: 200, message: "POS table switched successfully" };

//   } catch (error) {
//     if (connection) connection.release();
//     return { success: false, code: 500, message: "Internal server error", error: error.toString() };
//   }
// };




// async function getKotDetails(connection, fooder_id, table_id) {
//   const [kotRows] = await connection.query(
//     `SELECT * 
//      FROM fooders_kot fk
//      WHERE fk.fooder_id = ?
//        AND fk.table_id = ?
//        AND fk.status NOT IN (4, 5)
//        AND fk.is_deleted = 0
//        AND fk.id NOT IN (
//          SELECT product_kot_id FROM order_items
//        )`,
//     [fooder_id, table_id]
//   );

//   const kot_prefix = 'KOT';
//   let formattedKotDetails = [];

//   // ✅ 1. If unassigned fresh KOTs found
//   if (kotRows.length > 0) {
//     kotRows.forEach(kot => {
//       const removedItemsSet = new Set();
//       try {
//         const removedItems = kot.remove_items
//           ? typeof kot.remove_items === 'string'
//             ? JSON.parse(kot.remove_items)
//             : kot.remove_items
//           : [];
//         removedItems.forEach(item => {
//           if (item.product_id && item.local_id) {
//             removedItemsSet.add(`${item.product_id}_${item.local_id}`);
//           }
//         });
//       } catch (e) {
//         console.error('Invalid remove_items JSON for KOT:', kot.id);
//       }

//       let staffDetails = null;
//       if (kot.created_by) {
//         try {
//           const createdBy = typeof kot.created_by === 'string' ? JSON.parse(kot.created_by) : kot.created_by;
//           staffDetails = {
//             staff_id: createdBy.staff_id,
//             staff_name: createdBy.staff_name
//           };
//         } catch (e) {
//           staffDetails = null;
//         }
//       }

//       let products = [];
//       try {
//         products = typeof kot.kot_details === 'string' ? JSON.parse(kot.kot_details) : kot.kot_details;
//       } catch (e) {
//         products = [];
//       }

//       products.forEach(item => {
//         const uniqueKey = `${item.product_id}_${item.local_id}`;
//         if (removedItemsSet.has(uniqueKey)) return;

//         const variantDetail =
//           item.selectedvariants?.combination_details?.[0] ||
//           item.variant?.combination_details?.[0] ||
//           null;

//         const formattedAddons = item.selectedAddons?.map(addon => ({
//           addon_item_name: addon.addon_item_name
//         })) || [];

//         const price = Number(item.product_price || item.price || 0);
//         const taxPercent = Number(item.tax_percent || 0);
//         const itemTaxType = typeof item.item_tax_type !== 'undefined' ? Number(item.item_tax_type) : 0;
//         // Calculate withOutTaxPrice based on item_tax_type
//         let withOutTaxPrice;
//         if (itemTaxType === 0) {
//           // Tax excluded
//           withOutTaxPrice = price;
//         } else if (itemTaxType === 1) {
//           // Tax included
//           withOutTaxPrice = (price * 100) / (100 + taxPercent);
//         } else {
//           withOutTaxPrice = price;
//         }
//         const taxAmount = Math.round(price - withOutTaxPrice);

//         const kot_no = kot.kot_number || kot.KOT_no || '';
//         const KOT_no = `${kot_prefix}-${kot_no}`;

//         formattedKotDetails.push({
//           id: item.product_id || item.id,
//           name: item.name || item.product_name,
//           quantity: item.quantity || 1,
//           price,
//           menu_id: item.menu_id || null,
//           variant: variantDetail
//             ? {
//               attribute_name: variantDetail.attribute_name,
//               attribute_value_name: variantDetail.attribute_value_name
//             }
//             : null,
//           addons: formattedAddons,
//           KOT_id: kot.id || null,
//           KOT_no,
//           isKOT: true,
//           tax_percent: taxPercent,
//           tax_amount: taxAmount,
//           withOutTaxPrice,
//           staffDetails: staffDetails,
//           kot_timestamp: kot.created_date,
//           local_id: item.local_id || null // <-- Added local_id here
//         });
//       });
//     });
//   } else {
//     // ✅ 2. Fallback: Join order_items + fooders_kot + fooder_staff
//     const [orderIdRow] = await connection.query(
//       `SELECT id FROM orders 
//        WHERE fooder_id = ? AND table_id = ? AND is_cancelled = 0 AND status != 4
//        ORDER BY CAST(creation_date AS UNSIGNED) DESC
//        LIMIT 1`,
//       [fooder_id, table_id]
//     );

//     if (orderIdRow.length > 0) {
//       const latestOrderId = orderIdRow[0].id;

//       const [orderItems] = await connection.query(
//         `SELECT 
//            oi.*, 
//            fs.id AS staff_id,
//            fs.name AS staff_name,
//            fk.kot_number,
//            o.order_number_qrcode,
//            o.service_charge,
//            o.address,
//            o.eater_phonenumber,
//            o.no_of_eaters,
//            o.eater_name,
//            o.discount_type,
//            o.discount_rate,
//            fk.created_date AS kot_created_date,
//            fk.created_by as kot_created_by
//          FROM order_items oi
//          LEFT JOIN orders o ON o.id = oi.order_id
//          LEFT JOIN fooder_staff fs ON fs.id = o.waiter_id
//          LEFT JOIN fooders_kot fk ON fk.id = oi.product_kot_id
//          WHERE oi.order_id = ? 
//          AND fk.is_deleted = 0
//          AND oi.is_cancelled = 0`,
//         [latestOrderId]
//       );

//       for (const item of orderItems) {
//         const variantDetail = item.variant_details ? JSON.parse(item.variant_details)[0] : null;
//         const formattedAddons = item.addons_items_details ? JSON.parse(item.addons_items_details) : [];

//         const price = Number(item.product_price || item.price || 0);
//         const taxPercent = Number(item.item_tax_percent || 0);
//         const itemTaxType = typeof item.item_tax_type !== 'undefined' ? Number(item.item_tax_type) : 0;
//         // Calculate withOutTaxPrice based on item_tax_type
//         let withOutTaxPrice;
//         if (itemTaxType === 0) {
//           // Tax excluded
//           withOutTaxPrice = price;
//         } else if (itemTaxType === 1) {
//           // Tax included
//           withOutTaxPrice = (price * 100) / (100 + taxPercent);
//         } else {
//           withOutTaxPrice = price;
//         }
//         const taxAmount = Math.round(price - withOutTaxPrice);

//         const KOT_no = item.kot_number ? `KOT-${item.kot_number}` : '';

//         // Parse kot_created_by for staffdetails if available
//         let staffDetails = {
//           staff_id: item.staff_id || null,
//           staff_name: item.staff_name || null
//         };
//         if (item.kot_created_by) {
//           try {
//             const createdBy = typeof item.kot_created_by === 'string'
//               ? JSON.parse(item.kot_created_by)
//               : item.kot_created_by;
//             if (createdBy && createdBy.staff_id && createdBy.staff_name) {
//               staffDetails = {
//                 staff_id: createdBy.staff_id,
//                 staff_name: createdBy.staff_name
//               };
//             }
//           } catch (e) {
//             // fallback to default staffdetails
//           }
//         }

//         formattedKotDetails.push({
//           id: item.product_id || item.id,
//           name: item.product_name || item.name,
//           quantity: item.quantity || 1,
//           price,
//           menu_id: item.menu_id || null,
//           variant: variantDetail
//             ? {
//               attribute_name: variantDetail.attribute_name,
//               attribute_value_name: variantDetail.attribute_value_name
//             }
//             : null,
//           addons: formattedAddons.map(addon => ({
//             addon_item_name: addon.addon_item_name || addon.name
//           })),
//           KOT_id: item.product_kot_id || null,
//           KOT_no,
//           isKOT: true,
//           isSaved: true,
//           orderId: item.order_id || null,
//           orderNo: item.order_number_qrcode,
//           tax_percent: taxPercent,
//           tax_amount: taxAmount,
//           withOutTaxPrice,
//           staffDetails,
//           kot_timestamp: item.kot_created_date || item.creation_date || null,
//           order_service_charge: { 
//             name: "SCH", 
//             percentage: (typeof item.service_charge === "number" ? item.service_charge : 0) 
//           },
//           local_id: item.local_time || null, // <-- Added local_id from order_items.local_time
//           address: item.address || null,
//           eater_phonenumber: item.eater_phonenumber || null,
//           no_of_eaters: item.no_of_eaters || null,
//           discount_type: item.discount_type ?? null,
//           discount_value: item.discount_rate ?? null,
//           eater_name: item.eater_name || null
//         });
//       }
//     }
//   }

//   // Sort by kot_timestamp ascending (oldest first)
//   formattedKotDetails.sort((a, b) => {
//     // Handle both UNIX timestamp (seconds) and ISO string
//     const parseTimestamp = (ts) => {
//       if (!ts) return 0;
//       // If it's a number or numeric string, treat as UNIX seconds
//       if (!isNaN(ts)) {
//         // If it's 10 digits, assume seconds; if 13, assume ms
//         const num = Number(ts);
//         return num > 1e12 ? num : num * 1000;
//       }
//       // Otherwise, try Date.parse
//       return Date.parse(ts) || 0;
//     };
//     const t1 = parseTimestamp(a.kot_timestamp);
//     const t2 = parseTimestamp(b.kot_timestamp);
//     return t1 - t2;
//   });

//   return formattedKotDetails;
// };


const { getAndValidateStaff } = require('../utils/GetAndValidateStaff');

// exports.switchTableFromTableView = async (req, res) => {
//   const { old_table_id, new_table_id, passcode } = req.body;
//   const fooder_id = req.staff.fooder_id;

//   if (!passcode || !old_table_id || !new_table_id) {
//     return res.status(400).json({
//       status: 'fail',
//       message: 'Missing required fields: passcode, old_table_id, or new_table_id'
//     });
//   }

//   const allowedUsers = process.env.allowedUsers;
//   const connection = await db.getConnection();

//   try {
//     console.log('[1] Validating staff...');
//     const staffResult = await getAndValidateStaff(req, connection, passcode, allowedUsers);
//     if (staffResult.error) {
//       return res.status(staffResult.error.code).json({
//         status: 'fail',
//         message: staffResult.error.message
//       });
//     }

//     console.log('[2] Fetching KOTs for old table...');
//     const kotDetails = await getKotDetails(connection, fooder_id, old_table_id);
//     if (!kotDetails || kotDetails.length === 0) {
//       return res.status(400).json({
//         status: 'fail',
//         message: 'No active KOTs found on this table.'
//       });
//     }

//     const kot_array = [...new Set(kotDetails.map(item => item.KOT_id).filter(Boolean))];
//     const order_id = kotDetails.find(item => item.orderId)?.orderId || null;

//     const switchPayload = { fooder_id, kot_array, table_id: new_table_id, order_id };

//     console.log('[3] Switching KOT table...');
//     const kotResult = await switchTableKOTUpdatefunc(switchPayload);
//     if (!kotResult.success) {
//       return res.status(kotResult.code).json({
//         status: 'fail',
//         message: kotResult.message
//       });
//     }

//     if (!order_id) {
//       console.log('[Success] KOT-only switch completed.');
//       return res.status(200).json({
//         status: 'success',
//         message: 'KOT table switched successfully.'
//       });
//     }

//     console.log('[4] Switching POS table...');
//     const posResult = await switchTablePosfunc(switchPayload);
//     if (!posResult.success) {
//       return res.status(posResult.code).json({
//         status: 'fail',
//         message: posResult.message
//       });
//     }

//     console.log('[Success] Both KOT and POS tables switched.');
//     return res.status(200).json({
//       status: 'success',
//       message: 'KOT and POS table switched successfully.'
//     });

//   } catch (error) {
//     console.error('[Error]', error);
//     return res.status(500).json({
//       status: 'fail',
//       message: 'Internal server error',
//       error: error.toString()
//     });
//   } finally {
//     if (connection) connection.release();
//   }
// };







exports.switchTableFromTableView = async (req, res) => {
  const { old_table_id, new_table_id, passcode } = req.body;
  const fooder_id = req.staff.fooder_id;

  if (!passcode || !old_table_id || !new_table_id) {
    return res.status(400).json({
      status: 'fail',
      message: 'Missing required fields: passcode, old_table_id, or new_table_id'
    });
  }

  const allowedUsers = process.env.allowedUsers;
  const connection = await db.getConnection();

  try {
    // console.log('[1] Validating staff...');
    const staffResult = await getAndValidateStaff(req, connection, passcode, allowedUsers);
    if (staffResult.error) {
      return res.status(staffResult.error.code).json({
        status: 'fail',
        message: staffResult.error.message
      });
    }

    // console.log('[2] Fetching table items for old table...');
    const tableItemsRes = await getTableItems(connection, fooder_id, old_table_id);

    if (!tableItemsRes || !tableItemsRes.items || tableItemsRes.items.length === 0) {
      return res.status(400).json({
        status: 'fail',
        message: 'No active KOTs found on this table.'
      });
    }

    // ✅ check if only KOTs are committed (no order generated yet)
    if (!tableItemsRes.is_kot_only_committed) {
      // console.log('[Blocked] Order already generated for this table.');
      return res.status(400).json({
        status: 'fail',
        message: 'Cannot switch table. Order has already been generated for this table.'
      });
    }

    const kot_array = [...new Set(tableItemsRes.items.map(item => item.KOT_id).filter(Boolean))];

    const switchPayload = { fooder_id, kot_array, table_id: new_table_id, order_id: null };

    // console.log('[3] Switching KOT table...');
    const kotResult = await switchTableKOTUpdatefunc(switchPayload);
    if (!kotResult.success) {
      return res.status(kotResult.code).json({
        status: 'fail',
        message: kotResult.message
      });
    }

    // console.log('[Success] KOT-only switch completed.');
    return res.status(200).json({
      status: 'success',
      message: 'KOT table switched successfully.'
    });

  } catch (error) {
    console.error('[Error]', error);
    return res.status(500).json({
      status: 'fail',
      message: 'Internal server error',
      error: error.toString()
    });
  } finally {
    if (connection) connection.release();
  }
};

exports.switchTable = async (req, res) => {
  const { old_table_id, new_table_id } = req.body;
  const fooder_id = req.staff.fooder_id;

  if (!old_table_id || !new_table_id) {
    return res.status(400).json({
      status: 'fail',
      message: 'Missing required fields: old_table_id, or new_table_id'
    });
  }

  const connection = await db.getConnection();

  try {







// Check if both tables exist
    const [fromTable] = await connection.query(
      `SELECT * FROM fooders_tables WHERE id = ? AND fooder_id = ?`,
      [old_table_id, fooder_id]
    );

    const [toTable] = await connection.query(
      `SELECT * FROM fooders_tables WHERE id = ? AND fooder_id = ?`,
      [new_table_id, fooder_id]
    );

    if (!fromTable.length || !toTable.length) {
      connection.release();
      return res.status(400).send({
        status: "fail",
        message: "Invalid table IDs",
      });
    }

 
    if (toTable[0].is_booked === 1) {
      connection.release();
      return res.status(400).send({
        status: "fail",
        message: "Table is already booked!",
      });
    }







    // console.log('[1] Validating staff...');
    // const staffResult = await getAndValidateStaff(req, connection, passcode, allowedUsers);
    // if (staffResult.error) {
    //   return res.status(staffResult.error.code).json({
    //     status: 'fail',
    //     message: staffResult.error.message
    //   });
    // }

    // console.log('[2] Fetching table items for old table...');
    const tableItemsRes = await getTableItems(connection, fooder_id, old_table_id);

    if (!tableItemsRes || !tableItemsRes.items || tableItemsRes.items.length === 0) {
      return res.status(400).json({
        status: 'fail',
        message: 'No active KOTs found on this table.'
      });
    }

    // ✅ check if only KOTs are committed (no order generated yet)
    if (!tableItemsRes.is_kot_only_committed) {
      // console.log('[Blocked] Order already generated for this table.');
      return res.status(400).json({
        status: 'fail',
        message: 'Cannot switch table. Order has already been generated for this table.'
      });
    }

    const kot_array = [...new Set(tableItemsRes.items.map(item => item.KOT_id).filter(Boolean))];

    const switchPayload = { fooder_id, kot_array, table_id: new_table_id, order_id: null };

    // console.log('[3] Switching KOT table...');
    const kotResult = await switchTableKOTUpdatefunc(switchPayload);
    if (!kotResult.success) {
      return res.status(kotResult.code).json({
        status: 'fail',
        message: kotResult.message
      });
    }

    // console.log('[Success] KOT-only switch completed.');
    return res.status(200).json({
      status: 'success',
      message: 'KOT table switched successfully.'
    });

  } catch (error) {
    console.error('[Error]', error);
    return res.status(500).json({
      status: 'fail',
      message: 'Internal server error',
      error: error.toString()
    });
  } finally {
    if (connection) connection.release();
  }
};










// Helper for table_status = 0 (can be customized as needed. when table is free or not in use)
async function getTableItemsForTableStatusZero(connection, fooder_id, table_id) {
  // Example: return empty array or implement your own logic
  return [];
};

exports.getTableItemsrefresh = async (req, res) => {
  const { table_id } = req.body;
  const fooder_id = req.staff.fooder_id;

  const connection = await db.getConnection();
  try {
    // 1. Directly get staff from req (no passcode validation)
    const staff = req.staff;

    // ✅ If table_id not provided, return only staff
    if (!table_id) {
      connection.release();
      return res.status(200).json({
        status: 'success',
        kot_details: [],
        staff
      });
    }

    // 2. Check table status
    const [[tableRow]] = await connection.query(
      `SELECT is_booked FROM fooders_tables WHERE id = ? AND fooder_id = ?`,
      [table_id, fooder_id]
    );

    if (!tableRow) {
      connection.release();
      return res.status(400).send({
        status: "fail",
        message: "Table not found"
      });
    }

    // 3. Check if table is booked via QR but order not accepted yet
    if (tableRow.is_booked == 1) {
      const [latestOrder] = await connection.query(
        `SELECT order_mode, status, is_cancelled 
         FROM orders 
         WHERE fooder_id = ? AND table_id = ? AND id > ?
         ORDER BY id DESC 
         LIMIT 1`,
        [fooder_id, table_id, config.lastorderid]
      );

      if (latestOrder.length > 0) {
        const order = latestOrder[0];
        const isQRCommitted = order.order_mode === 0 && order.status === 0 && order.is_cancelled === 0;

        if (isQRCommitted) {
          connection.release();
          return res.status(200).json({
            status: 'fail',
            message: 'Order is not accepted by QR yet'
          });
        }
      }
    }

    // 4. Get table items based on status
    let kot_details = [];
    let is_nc = undefined;

    if (tableRow.is_booked == 1) {
      const result = await getTableItems(connection, fooder_id, table_id);
      kot_details = result.items;
      is_nc = result.is_nc;
    } else {
      kot_details = await getTableItemsForTableStatusZero(connection, fooder_id, table_id);
    }

    connection.release();

    return res.status(200).json({
      status: 'success',
      staff,
      kot_details,
      is_nc
    });

  } catch (error) {
    if (connection) connection.release();
    return res.status(500).json({ status: 'fail', message: 'Internal server error', error: error.toString() });
  }
};