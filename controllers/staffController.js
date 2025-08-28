const pool = require('../config/db');
const { getAndValidateStaff } = require('../utils/GetAndValidateStaff');
const { getTableItems } = require('../utils/getTableItems');
const config = require('../config/config');


// Helper for table_status = 0 (can be customized as needed. when table is free or not in use)
async function getTableItemsForTableStatusZero(connection, fooder_id, table_id) {
  // Example: return empty array or implement your own logic
  return [];
};

exports.getStaffDetails = async (req, res) => {
  const { passcode, table_id } = req.body;
  const fooder_id = req.staff.fooder_id;

  if (!passcode) {
    return res.status(400).json({ status: 'fail', message: 'pass code is required' });
  }

  const allowedUsers = (process.env.allowedUsers || []);

  const connection = await pool.getConnection();
  try {
    // 1. Get and validate staff
    const staffResult = await getAndValidateStaff(req, connection, passcode, allowedUsers);
    if (staffResult.error) {
      connection.release();
      return res.status(staffResult.error.code).json({ status: 'fail', message: staffResult.error.message });
    }
    const staff = staffResult.staff;

    // ✅ If table_id not provided, return only staff
    if (!table_id) {
      connection.release();
      return res.status(200).json({
        status: 'success',
        kot_details: [],
        staff,
        order_no: null,
        invoice_no: null,
        order_creation_date: null
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
        `SELECT id, order_mode, status, is_cancelled 
         FROM orders 
         WHERE fooder_id = ? AND table_id = ? AND payment_status = 0 AND id > ?
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
            message: 'Order is not accepted by QR yet',
            order_no: null,
            invoice_no: null,
            order_creation_date: null
          });
        }
      }
    }

    // 4. Get table items based on status
    let kot_details = [];
    let is_nc = undefined;
    let order_no = null;
    let invoice_no = null;
    let order_creation_date = null;

    if (tableRow.is_booked == 1) {
      const result = await getTableItems(connection, fooder_id, table_id);
      kot_details = result.items;
      is_nc = result.is_nc;

      // Check is_kot_only_committed
      if (!result.is_kot_only_committed) {
        // Get latest order for this table
        const [latestOrder] = await connection.query(
          `SELECT id, order_number_qrcode, invoice_no , creation_date as order_creation_date
           FROM orders 
           WHERE fooder_id = ? AND table_id = ? AND is_cancelled = 0 AND status != 4 AND payment_status = 0 AND id > ?
           ORDER BY id DESC 
           LIMIT 1`,
          [fooder_id, table_id, config.lastorderid]
        );

        if (latestOrder.length > 0) {
          order_no = latestOrder[0].order_number_qrcode || null;
          invoice_no = latestOrder[0].invoice_no
            ? `${config.invoice_number_prefix}${latestOrder[0].invoice_no}`
            : null;
          order_creation_date = latestOrder[0].order_creation_date || null;
        }
      } else {
        order_no = null;
        invoice_no = null;
        order_creation_date = null;
      }
    } else {
      kot_details = await getTableItemsForTableStatusZero(connection, fooder_id, table_id);
      order_no = null;
      invoice_no = null;
      order_creation_date = null;
    }

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

    connection.release();

    return res.status(200).json({
      status: 'success',
      staff,
      kot_details,
      is_nc,
      table_no,
      order_no,
      invoice_no,
      order_creation_date
    });

  } catch (error) {
    if (connection) connection.release();
    return res.status(500).json({ status: 'fail', message: 'Internal server error', error: error.toString() });
  }
};
