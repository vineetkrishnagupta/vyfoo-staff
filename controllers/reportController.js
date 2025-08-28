const db = require('../config/db');
const config = require('../config/config');
// Paste both getSettledUnsettledReportDaily and getSalesReportDaily here, unchanged except for export style

function formatUnixTimestamp(unixTimestamp) {
  const utcDate = new Date(unixTimestamp * 1000);
  const istOffset = 5.5 * 60 * 60 * 1000;
  const istDate = new Date(utcDate.getTime() + istOffset);
  const day = istDate.getUTCDate().toString().padStart(2, "0");
  const monthNames = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  const month = monthNames[istDate.getUTCMonth()];
  const year = istDate.getUTCFullYear();
  let hour = istDate.getUTCHours();
  const ampm = hour >= 12 ? "PM" : "AM";
  hour = hour % 12;
  hour = hour ? hour : 12;
  const minute = istDate.getUTCMinutes().toString().padStart(2, "0");
  // return `${day} ${month} ${year} ${hour}:${minute} ${ampm}`;
  return `${day} ${month} ${year}`;

};

const fetchOrderItemsData = async (fooderId, orderId, connection) => {
  const [rows] = await connection.query(
    `SELECT oi.id, oi.order_id, oi.quantity, oi.product_price, oi.product_proprice, oi.item_tax_type, oi.item_tax_percent, oi.packaging_fee, oi.menu_id, fm.name AS menu_name
     FROM order_items oi
     INNER JOIN fooders_menus fm ON oi.menu_id = fm.id
     WHERE oi.fooder_id = ? AND oi.order_id = ?`,
    [fooderId, orderId]
  );

  return rows;
};

exports.getSettledUnsettledReportDaily = async (req, res) => {
  const connection = await db.getConnection();
  let start_date1 = req.query.date;
  let start_date2 = req.query.date;

  const openTime = req.staff.open_time;
  const closeTime = req.staff.close_time;

  // console.log("start_date", start_date1);
  // console.log("openTime", openTime);
  // console.log("closeTime", closeTime);

  // Convert time strings to Date objects for comparison
  const openDateTime = new Date("2000-01-01T" + openTime + "-04:00");
  const closeDateTime = new Date("2000-01-01T" + closeTime + "-04:00");

  //   console.log("openDateTime", openDateTime);
  //   console.log("closeDateTime", closeDateTime);

  // If close time is earlier than open time, add one day to start_date
  if (closeDateTime < openDateTime) {
    const nextDay = new Date(
      new Date(start_date1).getTime() + 24 * 60 * 60 * 1000
    );
    start_date2 = nextDay.toISOString().slice(0, 10); // Update start_date
  }

  //    console.log("nextday", start_date2);

  // Combine date and time strings for open time
  const combinedOpenDateTimeString = start_date1 + "T" + openTime;

  // Create a new Date object with the combined date and time for open time
  const combinedDateTimeOpen = new Date(combinedOpenDateTimeString + "+05:30"); // +05:30 represents the Indian Standard Time (IST)

  // Combine date and time strings for close time
  const combinedCloseDateTimeString = start_date2 + "T" + closeTime;

  // Create a new Date object with the combined date and time for close time
  const combinedDateTimeClose = new Date(
    combinedCloseDateTimeString + "+05:30"
  ); // +05:30 represents the Indian Standard Time (IST)

  // Get the timestamps (in milliseconds since the Unix Epoch)
  const timestampOpen = combinedDateTimeOpen.getTime() / 1000;
  const timestampClose = combinedDateTimeClose.getTime() / 1000;

  //    console.log("timestampOpen:", timestampOpen);
  //    console.log("timestampClose:", timestampClose);

  try {
    const orderTypeTotals = {};
    const orderTypeCounts = {};
    const getReportResultQuery = `select id, order_date,status,payment_status, creation_date, order_number_qrcode,order_type, service_charge_details,round_up_amount,tax_details,discount_type,discount_rate,payment_type,no_of_eaters from orders where fooder_id = ? and creation_date BETWEEN ? and ? and payment_status = 0 and status IN (1, 2, 3) and is_cancelled = 0 
   ORDER BY id DESC`;



    const [getReportResult] = await connection.query(getReportResultQuery, [
      req.staff.fooder_id,
      timestampOpen,
      timestampClose,
    ]);





    // Initialize variables to store totals
    let totalSubtotal = 0;
    let totalDiscount = 0;
    let totalTotal = 0;
    let totalServiceCharge = 0;
    let totalTax = 0;

    //***********************************************************************Sales by order type Start***********************************************************************************************/

    const modifiedData = await Promise.all(
      getReportResult.map(async (order) => {
        order.creation_date_formatted = formatUnixTimestamp(
          order.creation_date
        );
        order.order_type = order.order_type.replace(/_/g, " ");

        orderTypeCounts[order.order_type] =
          (orderTypeCounts[order.order_type] || 0) + 1;

        const orderItems = await fetchOrderItemsData(
          req.staff.fooder_id,
          order.id,
          connection
        );




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

        //  for flate amount discount
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
          grandTotal = (parseFloat(subTotal + tempServicCharge - tempDiscount + tempTax + order.round_up_amount) + parseFloat(packingCharges)).toFixed(2)
          order.packaging_fee = parseFloat(packingCharges).toFixed(2);
        } else {
          grandTotal = (subTotal + tempServicCharge - tempDiscount + tempTax + order.round_up_amount).toFixed(2);
          order.packaging_fee = parseFloat(0).toFixed(2);
        }



        order.subtotal = parseFloat(subTotal).toFixed(2);
        order.discount = parseFloat(tempDiscount).toFixed(2);
        order.total = parseFloat(grandTotal).toFixed(2);
        order.service_charge = parseFloat(tempServicCharge).toFixed(2);
        order.tax = parseFloat(tempTax).toFixed(2);




        return order;
      })
    );



    modifiedData.forEach((order) => {
      totalSubtotal += parseFloat(order.subtotal);
      totalDiscount += parseFloat(order.discount);
      totalTotal += parseFloat(order.total);
      totalServiceCharge += parseFloat(order.service_charge);
      totalTax += parseFloat(order.tax);
    })
















    return res.status(200).send({
      status: "success",
      data: { unsettledAmount: totalTotal }
    });
  } catch (error) {
    console.error("Error:", error);
    if (connection) {
      connection.release();
    }
    return res.status(500).json({
      message: "Internal server error",
      errors: error.toString(),
    });
  }
};


// exports.getSalesReportDaily = async (req, res) => {
//   const connection = await db.getConnection();
//   let start_date1 = req.query.date;
//   let start_date2 = req.query.date;

//   const openTime = req.staff.open_time;
//   const closeTime = req.staff.close_time;

//   // Convert time strings to Date objects for comparison
//   const openDateTime = new Date("2000-01-01T" + openTime + "-04:00");
//   const closeDateTime = new Date("2000-01-01T" + closeTime + "-04:00");

//   if (closeDateTime < openDateTime) {
//     const nextDay = new Date(
//       new Date(start_date1).getTime() + 24 * 60 * 60 * 1000
//     );
//     start_date2 = nextDay.toISOString().slice(0, 10);
//   }

//   const combinedOpenDateTimeString = start_date1 + "T" + openTime;
//   const combinedDateTimeOpen = new Date(combinedOpenDateTimeString + "+05:30");
//   const combinedCloseDateTimeString = start_date2 + "T" + closeTime;
//   const combinedDateTimeClose = new Date(combinedCloseDateTimeString + "+05:30");

//   const timestampOpen = combinedDateTimeOpen.getTime() / 1000;
//   const timestampClose = combinedDateTimeClose.getTime() / 1000;

//   try {
//     const orderTypeTotals = {};
//     const orderTypeCounts = {};
//     const paymentType = {
//       card: "0.00",
//       cash: "0.00",
//       upi: "0.00",
//       neft: "0.00",
//       zomato: "0.00",
//       swiggy: "0.00",
//       dineout: "0.00",
//     };

//     // Get all orders for the report
//     const [orders] = await connection.query(
//       `SELECT id, order_date, status, payment_status, creation_date, order_number_qrcode, order_type, service_charge_details, round_up_amount, tax_details, discount_type, discount_rate, payment_type, no_of_eaters
//        FROM orders
//        WHERE fooder_id = ? AND creation_date BETWEEN ? AND ? AND payment_status = 1 AND status IN (1, 2, 3) AND is_cancelled = 0
//        ORDER BY id DESC`,
//       [req.staff.fooder_id, timestampOpen, timestampClose]
//     );

//     // Get unique eater count
//     const [[{ unique_eater_count: totalAquireCustomerCount }]] = await connection.query(
//       `SELECT COUNT(DISTINCT eater_phonenumber) AS unique_eater_count
//        FROM orders
//        WHERE fooder_id = ? AND creation_date BETWEEN ? AND ? AND payment_status IN (1, 3) AND status IN (1, 2, 3) AND is_cancelled = 0 AND eater_phonenumber != ''`,
//       [req.staff.fooder_id, timestampOpen, timestampClose]
//     );

//     // Get total order count
//     const [[{ total_orders: totalcount }]] = await connection.query(
//       `SELECT COUNT(*) AS total_orders
//        FROM orders
//        WHERE fooder_id = ? AND creation_date BETWEEN ? AND ? AND payment_status = 1 AND status IN (1, 2, 3) AND is_cancelled = 0`,
//       [req.staff.fooder_id, timestampOpen, timestampClose]
//     );

//     // Check if there is any data
//     const [[{ total_orders: total_orders_all }]] = await connection.query(
//       `SELECT COUNT(*) AS total_orders
//        FROM orders
//        WHERE fooder_id = ? AND creation_date BETWEEN ? AND ? AND payment_status IN (1, 3) AND status IN (1, 2, 3) AND is_cancelled = 0`,
//       [req.staff.fooder_id, timestampOpen, timestampClose]
//     );
//     if (total_orders_all === 0) {
//       connection.release();
//       return res.status(200).send({ status: "success", message: "Data Not Available.." });
//     }

//     // Get all order items for all orders in one go
//     const orderIds = orders.map(o => o.id);
//     let orderItemsMap = {};
//     if (orderIds.length) {
//       const [orderItems] = await connection.query(
//         `SELECT oi.*, fm.name AS menu_name
//          FROM order_items oi
//          INNER JOIN fooders_menus fm ON oi.menu_id = fm.id
//          WHERE oi.fooder_id = ? AND oi.order_id IN (${orderIds.map(() => '?').join(',')})`,
//         [req.staff.fooder_id, ...orderIds]
//       );
//       orderItemsMap = orderItems.reduce((acc, item) => {
//         if (!acc[item.order_id]) acc[item.order_id] = [];
//         acc[item.order_id].push(item);
//         return acc;
//       }, {});
//     }

//     let totalSubtotal = 0, totalDiscount = 0, totalTotal = 0, totalServiceCharge = 0, totalTax = 0, totalEaters = 0;
//     let netSells = 0;

//     // Calculate order-wise totals
//     const modifiedData = await Promise.all(
//       orders.map(async (order) => {
//         order.creation_date_formatted = formatUnixTimestamp(order.creation_date);
//         order.order_type = order.order_type.replace(/_/g, " ");
//         orderTypeCounts[order.order_type] = (orderTypeCounts[order.order_type] || 0) + 1;

//         const orderItems = orderItemsMap[order.id] || [];
//         const serviceChargeDetails = JSON.parse(order.service_charge_details || '{}');
//         if (!serviceChargeDetails.percentage) serviceChargeDetails.percentage = 0;

//         let withOutTaxPrice = 0, subTotal = 0, tempDiscount = 0, tempDiscountRow = 0;
//         let tempServicCharge = 0, tempServicChargeRow = 0, tempTax = 0, packingCharges = 0;
//         let withOutTaxPriceForAmount = 0, subTotalForAmount = 0, discountRateForAmount = 0;

//         if (order.discount_type === 1) {
//           orderItems.forEach(i => {
//             if (i.product_proprice) {
//               withOutTaxPriceForAmount = parseInt(i.item_tax_type) === 0 ? parseFloat(i.product_proprice) : (parseFloat(i.product_proprice) * 100) / (100 + parseFloat(i.item_tax_percent));
//             } else {
//               withOutTaxPriceForAmount = parseInt(i.item_tax_type) === 0 ? parseFloat(i.product_price) : (parseFloat(i.product_price) * 100) / (100 + parseFloat(i.item_tax_percent));
//             }
//             subTotalForAmount += i.quantity * withOutTaxPriceForAmount;
//           });
//           discountRateForAmount = subTotalForAmount ? (parseFloat(order.discount_rate) * 100) / subTotalForAmount : 0;
//         }

//         orderItems.forEach(i => {
//           packingCharges += i.quantity * parseFloat(i.packaging_fee);
//           if (i.product_proprice) {
//             withOutTaxPrice = parseInt(i.item_tax_type) === 0 ? parseFloat(i.product_proprice) : (parseFloat(i.product_proprice) * 100) / (100 + parseFloat(i.item_tax_percent));
//           } else {
//             withOutTaxPrice = parseInt(i.item_tax_type) === 0 ? parseFloat(i.product_price) : (parseFloat(i.product_price) * 100) / (100 + parseFloat(i.item_tax_percent));
//           }
//           subTotal += i.quantity * withOutTaxPrice;
//           if (order.discount_type === 0) {
//             tempDiscount += ((i.quantity * withOutTaxPrice) * parseFloat(order.discount_rate)) / 100;
//             tempDiscountRow = ((i.quantity * withOutTaxPrice) * parseFloat(order.discount_rate)) / 100;
//           } else {
//             tempDiscount += ((i.quantity * withOutTaxPrice) * parseFloat(discountRateForAmount)) / 100;
//             tempDiscountRow = ((i.quantity * withOutTaxPrice) * parseFloat(discountRateForAmount)) / 100;
//           }
//           tempServicCharge += (((i.quantity * withOutTaxPrice) - tempDiscountRow) * parseFloat(serviceChargeDetails.percentage)) / 100;
//           tempServicChargeRow = (((i.quantity * withOutTaxPrice) - tempDiscountRow) * parseFloat(serviceChargeDetails.percentage)) / 100;
//           tempTax += (((i.quantity * withOutTaxPrice) + tempServicChargeRow - tempDiscountRow) * parseFloat(i.item_tax_percent)) / 100;
//         });

//         let grandTotal = 0;
//         if (order.order_type != "dine_in") {
//           grandTotal = (parseFloat(subTotal + tempServicCharge - tempDiscount + tempTax + order.round_up_amount) + parseFloat(packingCharges)).toFixed(2);
//           order.packaging_fee = parseFloat(packingCharges).toFixed(2);
//         } else {
//           grandTotal = (subTotal + tempServicCharge - tempDiscount + tempTax + order.round_up_amount).toFixed(2);
//           order.packaging_fee = "0.00";
//         }

//         order.subtotal = parseFloat(subTotal).toFixed(2);
//         order.discount = parseFloat(tempDiscount).toFixed(2);
//         order.total = parseFloat(grandTotal).toFixed(2);
//         order.service_charge = parseFloat(tempServicCharge).toFixed(2);
//         order.tax = parseFloat(tempTax).toFixed(2);

//         // Status mapping
//         const statusLabels = ["Pending", "Accept and prepare order", "Order Ready", "Delivered and paid", "Reject"];
//         order.order_status_lable = statusLabels[order.status] || "";

//         totalEaters += parseInt(order.no_of_eaters);

//         if (paymentType.hasOwnProperty(order.payment_type)) {
//           paymentType[order.payment_type] = (
//             parseFloat(paymentType[order.payment_type]) + parseFloat(order.total)
//           ).toFixed(2);
//         }

//         // Calculate net_sells for each order and accumulate
//         // net_sells = subtotal - discount
//         netSells += parseFloat(order.subtotal) - parseFloat(order.discount);

//         return order;
//       })
//     );

//     // Payment data
//     const [orders_payment_data] = await connection.query(
//       `SELECT op.*
//        FROM orders_payment AS op
//        INNER JOIN (
//          SELECT id FROM orders WHERE fooder_id = ? AND creation_date BETWEEN ? and ? AND is_cancelled = 0
//        ) AS ot ON op.order_id = ot.id`,
//       [req.staff.fooder_id, timestampOpen, timestampClose]
//     );
//     orders_payment_data.forEach(order => {
//       if (paymentType.hasOwnProperty(order.payment_type)) {
//         paymentType[order.payment_type] = (
//           parseFloat(paymentType[order.payment_type]) + parseFloat(order.paid_amount)
//         ).toFixed(2);
//       }
//     });

//     // Calculate order type totals
//     modifiedData.forEach(order => {
//       totalSubtotal += parseFloat(order.subtotal);
//       totalDiscount += parseFloat(order.discount);
//       totalTotal += parseFloat(order.total);
//       totalServiceCharge += parseFloat(order.service_charge);
//       totalTax += parseFloat(order.tax);

//       if (!orderTypeTotals[order.order_type]) {
//         orderTypeTotals[order.order_type] = {
//           subtotal: 0,
//           discount: 0,
//           total: 0,
//           serviceCharge: 0,
//           tax: 0,
//         };
//       }
//       orderTypeTotals[order.order_type].subtotal = (
//         parseFloat(orderTypeTotals[order.order_type].subtotal) + parseFloat(order.subtotal)
//       ).toFixed(2);
//       orderTypeTotals[order.order_type].discount = (
//         parseFloat(orderTypeTotals[order.order_type].discount) + parseFloat(order.discount)
//       ).toFixed(2);
//       orderTypeTotals[order.order_type].total = (
//         parseFloat(orderTypeTotals[order.order_type].total) + parseFloat(order.total)
//       ).toFixed(2);
//       orderTypeTotals[order.order_type].serviceCharge = (
//         parseFloat(orderTypeTotals[order.order_type].serviceCharge) + parseFloat(order.service_charge)
//       ).toFixed(2);
//       orderTypeTotals[order.order_type].tax = (
//         parseFloat(orderTypeTotals[order.order_type].tax) + parseFloat(order.tax)
//       ).toFixed(2);
//     });

//     let totalOfAllTotals = Object.values(orderTypeTotals).reduce((sum, t) => sum + parseFloat(t.total), 0);

//     // Format order type keys
//     const modifiedOrderTypeTotals = {};
//     for (const [key, value] of Object.entries(orderTypeTotals)) {
//       modifiedOrderTypeTotals[key.replace(/\s+/g, "_")] = value;
//     }
//     const modifiedOrderTypeCounts = {};
//     for (const [key, value] of Object.entries(orderTypeCounts)) {
//       modifiedOrderTypeCounts[key.replace(/\s+/g, "_")] = value;
//     }

//     // Menu totals
//     const [dataOfmenu] = await connection.query(
//       `SELECT oi.menu_id, fm.name, oi.product_proprice, oi.product_price, oi.quantity, o.service_charge_details, o.tax_details, o.discount_type, o.discount_rate
//        FROM order_items oi
//        JOIN orders o ON oi.order_id = o.id
//        JOIN fooders_menus fm ON oi.menu_id = fm.id
//        WHERE oi.fooder_id = ? AND o.creation_date BETWEEN ? and ? AND o.payment_status = 1 AND o.status IN (1, 2, 3) AND o.is_cancelled = 0`,
//       [req.staff.fooder_id, timestampOpen, timestampClose]
//     );
//     const menuTotals = {};
//     dataOfmenu.forEach(orderItem => {
//       const {
//         menu_id, product_proprice, product_price, quantity,
//         service_charge_details, tax_details, discount_type, discount_rate
//       } = orderItem;
//       const subTotal = (product_proprice ? product_proprice : product_price) * quantity;
//       let discountAmount = 0;
//       if (discount_type === 0 && !isNaN(parseFloat(discount_rate)) && isFinite(discount_rate)) {
//         discountAmount = (subTotal * discount_rate) / 100;
//       } else if (discount_type === 1 && !isNaN(parseFloat(discount_rate)) && isFinite(discount_rate)) {
//         discountAmount = discount_rate;
//       }
//       let serviceChargeTotal = 0, taxTotal = 0, serviceChargeItem = 0;
//       const serviceChargeDetails = JSON.parse(service_charge_details || '{}');
//       if (serviceChargeDetails.percentage) {
//         const serviceChargePercentage = parseFloat(serviceChargeDetails.percentage);
//         serviceChargeItem = (subTotal - discountAmount) * (serviceChargePercentage / 100);
//         serviceChargeTotal = subTotal - discountAmount + serviceChargeItem;
//       } else {
//         serviceChargeTotal = subTotal - discountAmount;
//       }
//       const taxDetails = JSON.parse(tax_details || '[]');
//       taxDetails.forEach(tax => {
//         const taxPercentage = parseFloat(tax.percentage);
//         taxTotal += (serviceChargeTotal * taxPercentage) / 100;
//       });
//       if (!menuTotals[menu_id]) {
//         menuTotals[menu_id] = {
//           subtotal: 0,
//           discount: 0,
//           total: 0,
//           serviceCharge: 0,
//           tax: 0,
//         };
//       }
//       menuTotals[menu_id].subtotal += subTotal;
//       menuTotals[menu_id].discount += discountAmount;
//       menuTotals[menu_id].total += subTotal;
//       menuTotals[menu_id].serviceCharge += serviceChargeTotal;
//       menuTotals[menu_id].tax += taxTotal;
//     });

//     // Menu totals array
//     const menuTotalsArray = [];
//     for (const [menuId, totals] of Object.entries(menuTotals)) {
//       const [menuData] = await connection.query(
//         `SELECT name FROM fooders_menus WHERE id = ?`,
//         [menuId]
//       );
//       const menuName = menuData[0]?.name || "";
//       menuTotalsArray.push({
//         menu_id: menuId,
//         menu_name: menuName,
//         total: parseFloat(totals.total).toFixed(2),
//       });
//     }

//     // Partial payment data for order types
//     const orderTypes = ["dine_in", "take_away", "delivery"];
//     for (const type of orderTypes) {
//       const [partialPayments] = await connection.query(
//         `SELECT op.paid_amount
//          FROM orders_payment AS op
//          INNER JOIN (
//            SELECT id FROM orders WHERE fooder_id = ? AND creation_date BETWEEN ? and ? AND payment_status = 3 AND order_type = ? AND is_cancelled = 0
//          ) AS ot ON op.order_id = ot.id`,
//         [req.staff.fooder_id, timestampOpen, timestampClose, type]
//       );
//       const temp = partialPayments.reduce((sum, o) => sum + parseFloat(o.paid_amount), 0);
//       if (modifiedOrderTypeTotals[type]) {
//         modifiedOrderTypeTotals[type].total = parseFloat(modifiedOrderTypeTotals[type].total) + temp;
//       } else {
//         modifiedOrderTypeTotals[type] = {
//           subtotal: "0.00",
//           discount: "0.00",
//           total: temp,
//           serviceCharge: "0.00",
//           tax: "0.00"
//         };
//       }
//     }

//     // Row counts for order types
//     for (const type of orderTypes) {
//       const [[{ rowCount }]] = await connection.query(
//         `SELECT COUNT(*) AS rowCount FROM orders WHERE fooder_id = ? AND creation_date BETWEEN ? and ? AND payment_status IN (1, 3) AND order_type = ? AND is_cancelled = 0`,
//         [req.staff.fooder_id, timestampOpen, timestampClose, type]
//       );
//       modifiedOrderTypeCounts[type] = rowCount;
//     }
//     // Total transaction count
//     const [[{ rowCount: totalTransaction }]] = await connection.query(
//       `SELECT COUNT(*) AS rowCount FROM orders WHERE fooder_id = ? AND creation_date BETWEEN ? and ? AND payment_status IN (1, 3) AND is_cancelled = 0`,
//       [req.staff.fooder_id, timestampOpen, timestampClose]
//     );

//     // No of person served
//     const [[{ total: totalPersonsServed }]] = await connection.query(
//       `SELECT SUM(no_of_eaters) AS total FROM orders WHERE fooder_id = ? AND creation_date BETWEEN ? and ? AND payment_status IN (1, 3) AND status IN (1, 2, 3) AND is_cancelled = 0`,
//       [req.staff.fooder_id, timestampOpen, timestampClose]
//     );

//     let average_transation = (parseFloat(totalOfAllTotals) / parseFloat(totalTransaction || 1)).toFixed(2);

//     const responseData = {
//       status: "success",
//       salesByOrderType: modifiedOrderTypeTotals,
//       totalOfAllTotals: parseFloat(totalOfAllTotals).toFixed(2),
//       paymentType: paymentType,
//       average_transation: average_transation !== 'NaN' ? average_transation : 0,
//       totalEaters: totalPersonsServed,
//       menuTotalsArray,
//       orderTypeCounts: modifiedOrderTypeCounts,
//       totalTransaction: totalTransaction,
//       currency_symbol: config?.currency_symbol || '₹',
//       totalAquireCustomerCount,
//       net_sells: netSells.toFixed(2)
//     };
//     connection.release();
//     return res.status(200).send(responseData);
//   } catch (error) {
//     console.error("Error:", error);
//     if (connection) {
//       connection.release();
//     }
//     return res.status(500).json({
//       message: "Internal server error",
//       errors: error.toString(),
//     });
//   }
// };

// ------------------------------Report Controller starts--------------------------------

exports.getSalesReportDaily = async (req, res) => {
  const connection = await db.getConnection();
  let start_date1 = req.query.date;
  let start_date2 = req.query.date;

  const openTime = req.staff.open_time;
  const closeTime = req.staff.close_time;

  // Convert time strings to Date objects
  const openDateTime = new Date("2000-01-01T" + openTime + "-04:00");
  const closeDateTime = new Date("2000-01-01T" + closeTime + "-04:00");

  if (closeDateTime < openDateTime) {
    const nextDay = new Date(new Date(start_date1).getTime() + 24 * 60 * 60 * 1000);
    start_date2 = nextDay.toISOString().slice(0, 10);
  }

  const combinedOpenDateTimeString = start_date1 + "T" + openTime;
  const combinedDateTimeOpen = new Date(combinedOpenDateTimeString + "+05:30");
  const combinedCloseDateTimeString = start_date2 + "T" + closeTime;
  const combinedDateTimeClose = new Date(combinedCloseDateTimeString + "+05:30");

  const timestampOpen = combinedDateTimeOpen.getTime() / 1000;
  const timestampClose = combinedDateTimeClose.getTime() / 1000;

  try {
    const orderTypeTotals = {};
    const orderTypeCounts = {};
    const paymentType = {
      card: "0.00",
      cash: "0.00",
      upi: "0.00",
      neft: "0.00",
      zomato: "0.00",
      swiggy: "0.00",
      dineout: "0.00",
    };

    // Get all orders for the report
    const [orders] = await connection.query(
      `SELECT id, order_date, status, payment_status, creation_date, 
              order_number_qrcode, order_type, service_charge_details, 
              round_up_amount, tax_details, discount_type, discount_rate, 
              payment_type, no_of_eaters
       FROM orders
       WHERE fooder_id = ? AND creation_date BETWEEN ? AND ? 
       AND payment_status = 1 AND status IN (1, 2, 3) AND is_cancelled = 0
       ORDER BY id DESC`,
      [req.staff.fooder_id, timestampOpen, timestampClose]
    );

    // Get unique eater count
    const [[{ unique_eater_count: totalAquireCustomerCount }]] = await connection.query(
      `SELECT COUNT(DISTINCT eater_phonenumber) AS unique_eater_count
       FROM orders
       WHERE fooder_id = ? AND creation_date BETWEEN ? AND ? 
       AND payment_status IN (1, 3) AND status IN (1, 2, 3) 
       AND is_cancelled = 0 AND eater_phonenumber != ''`,
      [req.staff.fooder_id, timestampOpen, timestampClose]
    );

    // Get total order count
    const [[{ total_orders: totalcount }]] = await connection.query(
      `SELECT COUNT(*) AS total_orders
       FROM orders
       WHERE fooder_id = ? AND creation_date BETWEEN ? AND ? 
       AND payment_status = 1 AND status IN (1, 2, 3) AND is_cancelled = 0`,
      [req.staff.fooder_id, timestampOpen, timestampClose]
    );

    // Check if there is any data
    const [[{ total_orders: total_orders_all }]] = await connection.query(
      `SELECT COUNT(*) AS total_orders
       FROM orders
       WHERE fooder_id = ? AND creation_date BETWEEN ? AND ? 
       AND payment_status IN (1, 3) AND status IN (1, 2, 3) AND is_cancelled = 0`,
      [req.staff.fooder_id, timestampOpen, timestampClose]
    );
    
    if (total_orders_all === 0) {
      connection.release();
      return res.status(200).send({ status: "success", message: "Data Not Available.." });
    }

    // Get all order items
    const orderIds = orders.map(o => o.id);
    let orderItemsMap = {};
    if (orderIds.length) {
      const [orderItems] = await connection.query(
        `SELECT oi.*, fm.name AS menu_name, fm.main_category_id
         FROM order_items oi
         INNER JOIN fooders_menus fm ON oi.menu_id = fm.id
         WHERE oi.fooder_id = ? AND oi.order_id IN (${orderIds.map(() => '?').join(',')})`,
        [req.staff.fooder_id, ...orderIds]
      );
      orderItemsMap = orderItems.reduce((acc, item) => {
        if (!acc[item.order_id]) acc[item.order_id] = [];
        acc[item.order_id].push(item);
        return acc;
      }, {});
    }

    let totalSubtotal = 0, totalDiscount = 0, totalTotal = 0, 
        totalServiceCharge = 0, totalTax = 0, totalEaters = 0;
    let netSells = 0;

    // Initialize reports objects
    const menuTotals = {};
    let mainCategoryReport = [];

    // Process orders
    const modifiedData = await Promise.all(
      orders.map(async (order) => {
        order.creation_date_formatted = formatUnixTimestamp(order.creation_date);
        order.order_type = order.order_type.replace(/_/g, " ");
        orderTypeCounts[order.order_type] = (orderTypeCounts[order.order_type] || 0) + 1;

        const orderItems = orderItemsMap[order.id] || [];
        const serviceChargeDetails = JSON.parse(order.service_charge_details || '{}');
        if (!serviceChargeDetails.percentage) serviceChargeDetails.percentage = 0;

        let withOutTaxPrice = 0, subTotal = 0, tempDiscount = 0, tempDiscountRow = 0;
        let tempServicCharge = 0, tempServicChargeRow = 0, tempTax = 0, packingCharges = 0;
        let withOutTaxPriceForAmount = 0, subTotalForAmount = 0, discountRateForAmount = 0;

        if (order.discount_type === 1) {
          orderItems.forEach(i => {
            if (i.product_proprice) {
              withOutTaxPriceForAmount = parseInt(i.item_tax_type) === 0 ? parseFloat(i.product_proprice) : (parseFloat(i.product_proprice) * 100) / (100 + parseFloat(i.item_tax_percent));
            } else {
              withOutTaxPriceForAmount = parseInt(i.item_tax_type) === 0 ? parseFloat(i.product_price) : (parseFloat(i.product_price) * 100) / (100 + parseFloat(i.item_tax_percent));
            }
            subTotalForAmount += i.quantity * withOutTaxPriceForAmount;
          });
          discountRateForAmount = subTotalForAmount ? (parseFloat(order.discount_rate) * 100) / subTotalForAmount : 0;
        }

        orderItems.forEach(i => {
          packingCharges += i.quantity * parseFloat(i.packaging_fee);
          if (i.product_proprice) {
            withOutTaxPrice = parseInt(i.item_tax_type) === 0 ? parseFloat(i.product_proprice) : (parseFloat(i.product_proprice) * 100) / (100 + parseFloat(i.item_tax_percent));
          } else {
            withOutTaxPrice = parseInt(i.item_tax_type) === 0 ? parseFloat(i.product_price) : (parseFloat(i.product_price) * 100) / (100 + parseFloat(i.item_tax_percent));
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
          grandTotal = (parseFloat(subTotal + tempServicCharge - tempDiscount + tempTax + order.round_up_amount) + parseFloat(packingCharges)).toFixed(2);
          order.packaging_fee = parseFloat(packingCharges).toFixed(2);
        } else {
          grandTotal = (subTotal + tempServicCharge - tempDiscount + tempTax + order.round_up_amount).toFixed(2);
          order.packaging_fee = "0.00";
        }

        order.subtotal = parseFloat(subTotal).toFixed(2);
        order.discount = parseFloat(tempDiscount).toFixed(2);
        order.total = parseFloat(grandTotal).toFixed(2);
        order.service_charge = parseFloat(tempServicCharge).toFixed(2);
        order.tax = parseFloat(tempTax).toFixed(2);

        // Status mapping
        const statusLabels = ["Pending", "Accept and prepare order", "Order Ready", "Delivered and paid", "Reject"];
        order.order_status_lable = statusLabels[order.status] || "";

        totalEaters += parseInt(order.no_of_eaters);

        if (paymentType.hasOwnProperty(order.payment_type)) {
          paymentType[order.payment_type] = (
            parseFloat(paymentType[order.payment_type]) + parseFloat(order.total)
          ).toFixed(2);
        }

        // Calculate net_sells for each order
        netSells += parseFloat(order.subtotal) - parseFloat(order.discount);

        return order;
      })
    );

    // Payment data
    const [orders_payment_data] = await connection.query(
      `SELECT op.*
       FROM orders_payment AS op
       INNER JOIN (
         SELECT id FROM orders WHERE fooder_id = ? AND creation_date BETWEEN ? and ? AND is_cancelled = 0
       ) AS ot ON op.order_id = ot.id`,
      [req.staff.fooder_id, timestampOpen, timestampClose]
    );
    orders_payment_data.forEach(order => {
      if (paymentType.hasOwnProperty(order.payment_type)) {
        paymentType[order.payment_type] = (
          parseFloat(paymentType[order.payment_type]) + parseFloat(order.paid_amount)
        ).toFixed(2);
      }
    });

    // Calculate order type totals
    modifiedData.forEach(order => {
      totalSubtotal += parseFloat(order.subtotal);
      totalDiscount += parseFloat(order.discount);
      totalTotal += parseFloat(order.total);
      totalServiceCharge += parseFloat(order.service_charge);
      totalTax += parseFloat(order.tax);

      if (!orderTypeTotals[order.order_type]) {
        orderTypeTotals[order.order_type] = {
          subtotal: 0,
          discount: 0,
          total: 0,
          serviceCharge: 0,
          tax: 0,
        };
      }
      orderTypeTotals[order.order_type].subtotal = (
        parseFloat(orderTypeTotals[order.order_type].subtotal) + parseFloat(order.subtotal)
      ).toFixed(2);
      orderTypeTotals[order.order_type].discount = (
        parseFloat(orderTypeTotals[order.order_type].discount) + parseFloat(order.discount)
      ).toFixed(2);
      orderTypeTotals[order.order_type].total = (
        parseFloat(orderTypeTotals[order.order_type].total) + parseFloat(order.total)
      ).toFixed(2);
      orderTypeTotals[order.order_type].serviceCharge = (
        parseFloat(orderTypeTotals[order.order_type].serviceCharge) + parseFloat(order.service_charge)
      ).toFixed(2);
      orderTypeTotals[order.order_type].tax = (
        parseFloat(orderTypeTotals[order.order_type].tax) + parseFloat(order.tax)
      ).toFixed(2);
    });

    let totalOfAllTotals = Object.values(orderTypeTotals).reduce((sum, t) => sum + parseFloat(t.total), 0);

    // Format order type keys
    const modifiedOrderTypeTotals = {};
    for (const [key, value] of Object.entries(orderTypeTotals)) {
      modifiedOrderTypeTotals[key.replace(/\s+/g, "_")] = value;
    }
    const modifiedOrderTypeCounts = {};
    for (const [key, value] of Object.entries(orderTypeCounts)) {
      modifiedOrderTypeCounts[key.replace(/\s+/g, "_")] = value;
    }

    // Menu totals
    const [dataOfmenu] = await connection.query(
      `SELECT oi.menu_id, fm.name, fm.main_category_id, oi.product_proprice, 
              oi.product_price, oi.quantity, o.service_charge_details, 
              o.tax_details, o.discount_type, o.discount_rate
       FROM order_items oi
       JOIN orders o ON oi.order_id = o.id
       JOIN fooders_menus fm ON oi.menu_id = fm.id
       WHERE oi.fooder_id = ? AND o.creation_date BETWEEN ? AND ? 
       AND o.payment_status = 1 AND o.status IN (1, 2, 3) AND o.is_cancelled = 0`,
      [req.staff.fooder_id, timestampOpen, timestampClose]
    );

    // Initialize menuTotals
    dataOfmenu.forEach(orderItem => {
      const menuId = orderItem.menu_id;
      if (!menuTotals[menuId]) {
        menuTotals[menuId] = {
          name: orderItem.name,
          subtotal: 0,
          discount: 0,
          total: 0,
          serviceCharge: 0,
          tax: 0
        };
      }

      const price = parseFloat(orderItem.product_proprice || orderItem.product_price) || 0;
      const quantity = parseInt(orderItem.quantity) || 0;
      const subTotal = price * quantity;

      let discountAmount = 0;
      if (orderItem.discount_type === 0) {
        discountAmount = (subTotal * (parseFloat(orderItem.discount_rate) || 0)) / 100;
      } else {
        discountAmount = parseFloat(orderItem.discount_rate) || 0;
      }

      menuTotals[menuId].subtotal += subTotal;
      menuTotals[menuId].discount += discountAmount;
      menuTotals[menuId].total += (subTotal - discountAmount);
    });

    // Main category report
    const [hasMainCategories] = await connection.query(
      `SELECT COUNT(*) AS count 
       FROM fooders_menus 
       WHERE fooder_id = ? AND main_category_id != 0 AND main_category_id IS NOT NULL`,
      [req.staff.fooder_id]
    );

    if (hasMainCategories[0].count > 0) {
      const [mainCategories] = await connection.query(
        `SELECT id, name FROM fooders_main_menus WHERE fooder_id = ?`,
        [req.staff.fooder_id]
      );

      const mainCategoryTotals = {};
      mainCategories.forEach(cat => {
        mainCategoryTotals[cat.id] = {
          name: cat.name,
          subtotal: 0,
          discount: 0,
          total: 0
        };
      });

      dataOfmenu.forEach(orderItem => {
        if (!orderItem.main_category_id) return;
        const mainCatId = orderItem.main_category_id;
        if (!mainCategoryTotals[mainCatId]) return;

        const price = parseFloat(orderItem.product_proprice || orderItem.product_price) || 0;
        const quantity = parseInt(orderItem.quantity) || 0;
        const subTotal = price * quantity;

        let discountAmount = 0;
        if (orderItem.discount_type === 0) {
          discountAmount = (subTotal * (parseFloat(orderItem.discount_rate) || 0)) / 100;
        } else {
          discountAmount = parseFloat(orderItem.discount_rate) || 0;
        }

        mainCategoryTotals[mainCatId].subtotal += subTotal;
        mainCategoryTotals[mainCatId].discount += discountAmount;
        mainCategoryTotals[mainCatId].total += (subTotal - discountAmount);
      });

      mainCategoryReport = Object.keys(mainCategoryTotals).map(catId => ({
        main_category_id: catId,
        main_category_name: mainCategoryTotals[catId].name,
        subtotal: (mainCategoryTotals[catId].subtotal || 0).toFixed(2),
        discount: (mainCategoryTotals[catId].discount || 0).toFixed(2),
        total: (mainCategoryTotals[catId].total || 0).toFixed(2)
      }));
    }

    // Menu totals array
    const menuTotalsArray = Object.keys(menuTotals).map(menuId => ({
      menu_id: menuId,
      menu_name: menuTotals[menuId].name,
      total: (menuTotals[menuId].total || 0).toFixed(2)
    }));

    // Partial payment data for order types
    const orderTypes = ["dine_in", "take_away", "delivery"];
    for (const type of orderTypes) {
      const [partialPayments] = await connection.query(
        `SELECT op.paid_amount
         FROM orders_payment AS op
         INNER JOIN (
           SELECT id FROM orders WHERE fooder_id = ? AND creation_date BETWEEN ? and ? AND payment_status = 3 AND order_type = ? AND is_cancelled = 0
         ) AS ot ON op.order_id = ot.id`,
        [req.staff.fooder_id, timestampOpen, timestampClose, type]
      );
      const temp = partialPayments.reduce((sum, o) => sum + parseFloat(o.paid_amount), 0);
      if (modifiedOrderTypeTotals[type]) {
        modifiedOrderTypeTotals[type].total = parseFloat(modifiedOrderTypeTotals[type].total) + temp;
      } else {
        modifiedOrderTypeTotals[type] = {
          subtotal: "0.00",
          discount: "0.00",
          total: temp,
          serviceCharge: "0.00",
          tax: "0.00"
        };
      }
    }

    // Row counts for order types
    for (const type of orderTypes) {
      const [[{ rowCount }]] = await connection.query(
        `SELECT COUNT(*) AS rowCount FROM orders WHERE fooder_id = ? AND creation_date BETWEEN ? and ? AND payment_status IN (1, 3) AND order_type = ? AND is_cancelled = 0`,
        [req.staff.fooder_id, timestampOpen, timestampClose, type]
      );
      modifiedOrderTypeCounts[type] = rowCount;
    }

    // Total transaction count
    const [[{ rowCount: totalTransaction }]] = await connection.query(
      `SELECT COUNT(*) AS rowCount FROM orders WHERE fooder_id = ? AND creation_date BETWEEN ? and ? AND payment_status IN (1, 3) AND is_cancelled = 0`,
      [req.staff.fooder_id, timestampOpen, timestampClose]
    );

    // No of person served
    const [[{ total: totalPersonsServed }]] = await connection.query(
      `SELECT SUM(no_of_eaters) AS total FROM orders WHERE fooder_id = ? AND creation_date BETWEEN ? and ? AND payment_status IN (1, 3) AND status IN (1, 2, 3) AND is_cancelled = 0`,
      [req.staff.fooder_id, timestampOpen, timestampClose]
    );

    let average_transation = (parseFloat(totalOfAllTotals) / parseFloat(totalTransaction || 1)).toFixed(2);

    // Final response
    const responseData = {
      status: "success",
      salesByOrderType: modifiedOrderTypeTotals,
      totalOfAllTotals: parseFloat(totalOfAllTotals).toFixed(2),
      paymentType: paymentType,
      average_transation: average_transation !== 'NaN' ? average_transation : 0,
      totalEaters: totalPersonsServed,
      menuTotalsArray,
      orderTypeCounts: modifiedOrderTypeCounts,
      totalTransaction: totalTransaction,
      currency_symbol: config?.currency_symbol || '₹',
      totalAquireCustomerCount,
      net_sells: netSells.toFixed(2),
      mainCategoryReport
    };

    connection.release();
    return res.status(200).send(responseData);

  } catch (error) {
    console.error("Error:", error);
    if (connection) connection.release();
    return res.status(500).json({
      message: "Internal server error",
      errors: error.toString()
    });
  }
};



exports.getGstReportDetails = async (req, res) => {
  //   const { start_date, end_date } = req.query;
  const start_date = req.query.start_date;
  const end_date = req.query.end_date;
  const connection = await db.getConnection();

  try {
    const [getReportResult] = await connection.query(
      `select id, order_date,status,payment_status, creation_date, order_number_qrcode, service_charge_details,tax_details,discount_type,discount_rate, invoice_no from orders where fooder_id = ? and order_date >= ? AND order_date <= ? and payment_status = 1 and status IN (1, 2, 3) and is_cancelled = 0  ORDER BY id DESC`,
      [req.staff.fooder_id, start_date, end_date]
    );
    if (getReportResult.length === 0) {
      connection.release();

      return res
        .status(200)
        .send({ status: "success", message: "Data Not Available.." });
    }

    // Initialize variables to store totals
    let totalSubtotal = 0;
    let totalDiscount = 0;
    let totalTotal = 0;
    let totalServiceCharge = 0;
    let totalTax = 0;
    let totalPackingCharges = 0

    const modifiedData = await Promise.all(
      getReportResult.map(async (order) => {
        order.creation_date_formatted = formatUnixTimestamp(
          order.creation_date
        );

        const orderItems = await fetchOrderItemsData(
          req.staff.fooder_id,
          order.id,
          connection
        );

        // const subTotal = orderItems.reduce(
        //   (total, item) =>
        //     total +
        //     (item.product_proprice
        //       ? item.product_proprice
        //       : item.product_price) *
        //     item.quantity,
        //   0
        // );

        // //console.log("subTotal===============?????", subTotal);

        // //////////////////////////////Total Caculation///////////////////////////
        // let discountAmount = 0;
        // let discountAmt = 0;

        // if (
        //   order.discount_type === 0 &&
        //   !isNaN(parseFloat(order.discount_rate)) &&
        //   isFinite(order.discount_rate)
        // ) {
        //   discountAmt = (subTotal * order.discount_rate) / 100;
        //   discountAmount = subTotal - (subTotal * order.discount_rate) / 100;
        // } else if (
        //   order.discount_type === 1 &&
        //   !isNaN(parseFloat(order.discount_rate)) &&
        //   isFinite(order.discount_rate)
        // ) {
        //   discountAmt = order.discount_rate;
        //   discountAmount = subTotal - order.discount_rate;
        // } else {
        //   discountAmount = subTotal;
        // }

        // // console.log("discountAmount===========>", discountAmount);

        // // Initialize variables to store the total amounts for this order
        // let totalServiceCharge = 0;
        // let totalTax = 0;
        // let serviceCharge = 0;

        // // Extract service charge percentage and add it to the total
        // const serviceChargeDetails = JSON.parse(order.service_charge_details);
        // if (serviceChargeDetails.percentage) {
        //   const serviceChargePercentage = parseFloat(
        //     serviceChargeDetails.percentage
        //   );
        //   serviceCharge = (discountAmount * serviceChargePercentage) / 100;

        //   totalServiceCharge =
        //     discountAmount + (discountAmount * serviceChargePercentage) / 100;
        // } else {
        //   totalServiceCharge = discountAmount;
        // }
        // // Extract tax details and add them to the total
        // const taxDetails = JSON.parse(order.tax_details);
        // // console.log("limit=====>", taxDetails);
        // taxDetails.forEach((tax) => {
        //   const taxPercentage = parseFloat(tax.percentage);
        //   totalTax += (totalServiceCharge * taxPercentage) / 100;
        //   // console.log("taxPercentage========>", taxPercentage);
        // });
        // // console.log("totalTax=========>", totalTax);




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


        //  for flate amount discount

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
            // tempDiscount += (((i.quantity) * withOutTaxPrice) - parseFloat(order.discount_rate))
            // tempDiscountRow = (((i.quantity) * withOutTaxPrice) - parseFloat(order.discount_rate))
            // tempDiscount += ((i.quantity * withOutTaxPrice) - ((i.quantity * withOutTaxPrice) - parseFloat(order.discount_rate))) * i.quantity
            // tempDiscountRow = ((i.quantity * withOutTaxPrice) - ((i.quantity * withOutTaxPrice) - parseFloat(order.discount_rate))) * i.quantity
            tempDiscount += (((i.quantity) * withOutTaxPrice) * parseFloat(discountRateForAmount)) / 100
            tempDiscountRow = (((i.quantity) * withOutTaxPrice) * parseFloat(discountRateForAmount)) / 100
          }


          tempServicCharge += ((((i.quantity) * withOutTaxPrice) - tempDiscountRow) * parseFloat(serviceChargeDetails.percentage)) / 100
          tempServicChargeRow = ((((i.quantity) * withOutTaxPrice) - tempDiscountRow) * parseFloat(serviceChargeDetails.percentage)) / 100



          tempTax += ((((i.quantity) * withOutTaxPrice) + tempServicChargeRow - tempDiscountRow) * parseFloat(i.item_tax_percent)) / 100
        })



        var grandTotal = 0

        if (order.order_type != "dine_in") {
          grandTotal = (parseFloat(subTotal + tempServicCharge - tempDiscount + tempTax) + parseFloat(packingCharges))
          order.packaging_fee = parseFloat(packingCharges)
        } else {
          grandTotal = (subTotal + tempServicCharge - tempDiscount + tempTax)
          order.packaging_fee = parseFloat(0)
        }




        order.subtotal = parseFloat(subTotal)
        order.discount = parseFloat(tempDiscount)
        order.total = parseFloat(grandTotal)
        order.service_charge = parseFloat(tempServicCharge)
        order.tax = parseFloat(tempTax)



        // Calculate the grand total for this order
        // const grandTotal = totalServiceCharge + totalTax;
        // console.log("grandTotal===========>", grandTotal);

        // Add the grandTotal to this order
        // order.subtotal = parseFloat(subTotal).toFixed(2);
        // order.discount = parseFloat(discountAmt).toFixed(2);
        // order.total = parseFloat(grandTotal).toFixed(2);
        // order.service_charge = parseFloat(serviceCharge).toFixed(2);
        // order.tax = parseFloat(totalTax).toFixed(2);

        //console.log("order.service_charge=========>",order.service_charge);
        //console.log("order.tax=========>",order.tax);
        ////////////////////////////////////////////////////////////////////////
        // Add status mapping
        if (order.status === 0) {
          order.order_status_lable = "Pending";
        } else if (order.status === 1) {
          order.order_status_lable = "Accept and prepare order";
        } else if (order.status === 2) {
          order.order_status_lable = "Order Ready";
        } else if (order.status === 3) {
          order.order_status_lable = "Delivered and paid";
        } else if (order.status === 4) {
          order.order_status_lable = "Reject";
        }

        return order;
      })
    );
    modifiedData.forEach((order) => {
      totalSubtotal += parseFloat(order.subtotal);
      totalDiscount += parseFloat(order.discount);
      totalTotal += parseFloat(order.total);
      totalServiceCharge += parseFloat(order.service_charge);
      totalTax += parseFloat(order.tax);
      totalPackingCharges += parseFloat(order.packaging_fee)
    });

    connection.release();
    return res.status(200).send({
      status: "success",
      data: modifiedData,
      totalSubtotal: totalSubtotal.toFixed(2),
      totalDiscount: totalDiscount.toFixed(2),
      totalTotal: totalTotal.toFixed(2),
      totalServiceCharge: totalServiceCharge.toFixed(2),
      totalTax: totalTax.toFixed(2),
      totalPackingCharges: totalPackingCharges.toFixed(2),
      currency_symbol: config.currency_symbol,
      start_date: start_date,
      end_date: end_date,
    });
  } catch (error) {
    console.error("Error:", error);
    if (connection) {
      connection.release();
    }
    return res.status(500).json({
      message: "Internal server error",
      errors: error.toString(),
    });
  }
};

exports.getOrderReportDetails = async (req, res) => {
  //   const { start_date, end_date } = req.query;
  const start_date = req.query.start_date;
  const end_date = req.query.end_date;
  const order_mode = req.query.order_mode;
  const get_payment_status = req.query.payment_status;


  const combinedOpenDateTimeString = start_date;

  const combinedDateTimeOpen = new Date(combinedOpenDateTimeString + "+05:30");
  const combinedCloseDateTimeString = end_date;


  const combinedDateTimeClose = new Date(
    combinedCloseDateTimeString + "+05:30"
  ); // +05:30 represents the Indian Standard Time (IST)

  // Get the timestamps (in milliseconds since the Unix Epoch)
  const timestampOpen = combinedDateTimeOpen.getTime() / 1000;
  const timestampClose = combinedDateTimeClose.getTime() / 1000;












  const connection = await db.getConnection();

  try {
    const orderTypeTotals = {};
    let totalDueAmount = 0; // Initialize total due amount
    if (order_mode) {
      const [getSalesReportResult] = await connection.query(
        `select id, order_date,status,payment_status, creation_date, order_number_qrcode,order_type, service_charge_details,tax_details,discount_type,discount_rate, round_up_amount ,invoice_no from orders where fooder_id = ? and creation_date BETWEEN ? and ? and ${get_payment_status === 'all' ? `(payment_status IN (0, 1, 2, 3))` : get_payment_status === '0' ? `(payment_status = 0)` : get_payment_status === '1' ? `(payment_status = 1)` : get_payment_status === '2' ? `(payment_status = 2)` : `(payment_status = 3)`} and status IN (1, 2, 3) and is_cancelled = 0 and order_type = ?  ORDER BY id DESC`,
        [req.staff.fooder_id, timestampOpen, timestampClose, order_mode]
      );
      // console.log(getSalesReportResult.length)
      // console.log("getSalesReportResult")

      if (getSalesReportResult.length === 0) {
        connection.release();

        return res
          .status(200)
          .send({ status: "success", message: "Data Not Available.." });
      }

      // Initialize variables to store totals
      let totalSubtotal = 0;
      let totalDiscount = 0;
      let totalTotal = 0;
      let totalServiceCharge = 0;
      let totalTax = 0;
      let totalPackingCharges = 0

      let totalCustomerDueAmount = 0;
      let totalCustomerPaidAmount = 0;
      let totalRoundUpAmount = 0



      const modifiedData = await Promise.all(
        getSalesReportResult.map(async (order) => {
          order.creation_date_formatted = formatUnixTimestamp(
            order.creation_date
          );
          order.order_type = order.order_type.replace(/_/g, " ");
          order.order_type =
            order.order_type.charAt(0).toUpperCase() +
            order.order_type.slice(1);

          const orderItems = await fetchOrderItemsData(
            req.staff.fooder_id,
            order.id,
            connection
          );



          // const subTotal = orderItems.reduce(
          //   (total, item) =>
          //     total +
          //     (item.product_proprice
          //       ? item.product_proprice
          //       : item.product_price) *
          //     item.quantity,
          //   0
          // );

          // //console.log("subTotal===============?????", subTotal);

          // //////////////////////////////Total Caculation///////////////////////////
          // let discountAmount = 0;
          // let discountAmt = 0;

          // if (
          //   order.discount_type === 0 &&
          //   !isNaN(parseFloat(order.discount_rate)) &&
          //   isFinite(order.discount_rate)
          // ) {
          //   discountAmt = (subTotal * order.discount_rate) / 100;
          //   discountAmount = subTotal - (subTotal * order.discount_rate) / 100;
          // } else if (
          //   order.discount_type === 1 &&
          //   !isNaN(parseFloat(order.discount_rate)) &&
          //   isFinite(order.discount_rate)
          // ) {
          //   discountAmt = order.discount_rate;
          //   discountAmount = subTotal - order.discount_rate;
          // } else {
          //   discountAmount = subTotal;
          // }

          // // console.log("discountAmount===========>", discountAmount);

          // // Initialize variables to store the total amounts for this order
          // let totalServiceCharge = 0;
          // let totalTax = 0;
          // let serviceCharge = 0;

          // // Extract service charge percentage and add it to the total
          // const serviceChargeDetails = JSON.parse(order.service_charge_details);
          // if (serviceChargeDetails.percentage) {
          //   const serviceChargePercentage = parseFloat(
          //     serviceChargeDetails.percentage
          //   );
          //   serviceCharge = (discountAmount * serviceChargePercentage) / 100;

          //   totalServiceCharge =
          //     discountAmount + (discountAmount * serviceChargePercentage) / 100;
          // } else {
          //   totalServiceCharge = discountAmount;
          // }
          // // Extract tax details and add them to the total
          // const taxDetails = JSON.parse(order.tax_details);
          // // console.log("limit=====>", taxDetails);
          // taxDetails.forEach((tax) => {
          //   const taxPercentage = parseFloat(tax.percentage);
          //   totalTax += (totalServiceCharge * taxPercentage) / 100;
          //   // console.log("taxPercentage========>", taxPercentage);
          // });
          // // console.log("totalTax=========>", totalTax);

          // // Calculate the grand total for this order
          // const grandTotal = totalServiceCharge + totalTax;
          // // console.log("grandTotal===========>", grandTotal);

          // // Add the grandTotal to this order
          // order.subtotal = parseFloat(subTotal).toFixed(2);
          // order.discount = parseFloat(discountAmt).toFixed(2);
          // order.total = parseFloat(grandTotal).toFixed(2);
          // order.service_charge = parseFloat(serviceCharge).toFixed(2);
          // order.tax = parseFloat(totalTax).toFixed(2);




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
          // let roundUpAmount = 0;




          //  for flate amount discount
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
              // tempDiscount += (((i.quantity) * withOutTaxPrice) - parseFloat(order.discount_rate))
              // // tempDiscountRow = (((i.quantity) * withOutTaxPrice) - parseFloat(order.discount_rate))
              // tempDiscount += ((i.quantity * withOutTaxPrice) - ((i.quantity * withOutTaxPrice) - parseFloat(order.discount_rate))) * i.quantity
              // tempDiscountRow = ((i.quantity * withOutTaxPrice) - ((i.quantity * withOutTaxPrice) - parseFloat(order.discount_rate))) * i.quantity
              tempDiscount += (((i.quantity) * withOutTaxPrice) * parseFloat(discountRateForAmount)) / 100
              tempDiscountRow = (((i.quantity) * withOutTaxPrice) * parseFloat(discountRateForAmount)) / 100
            }


            tempServicCharge += ((((i.quantity) * withOutTaxPrice) - tempDiscountRow) * parseFloat(serviceChargeDetails.percentage)) / 100
            tempServicChargeRow = ((((i.quantity) * withOutTaxPrice) - tempDiscountRow) * parseFloat(serviceChargeDetails.percentage)) / 100



            tempTax += ((((i.quantity) * withOutTaxPrice) + tempServicChargeRow - tempDiscountRow) * parseFloat(i.item_tax_percent)) / 100
          })



          var grandTotal = 0

          if (order.order_type != "dine_in") {
            grandTotal = (parseFloat(subTotal + tempServicCharge - tempDiscount + tempTax + order.round_up_amount) + parseFloat(packingCharges)).toFixed(2)
            order.packaging_fee = parseFloat(packingCharges)
          } else {
            grandTotal = (subTotal + tempServicCharge - tempDiscount + tempTax + order.round_up_amount)
            order.packaging_fee = parseFloat(0)
          }




          order.subtotal = parseFloat(subTotal);
          order.discount = parseFloat(tempDiscount);
          order.total = parseFloat(grandTotal)
          order.service_charge = parseFloat(tempServicCharge)
          order.tax = parseFloat(tempTax)






          if (order.payment_status === 0 || order.payment_status === 2) {
            order.customer_paid_amount = parseFloat(0)
            order.customer_due_amount = parseFloat(grandTotal)

          } else if (order.payment_status === 1) {

            order.customer_paid_amount = parseFloat(grandTotal)
            order.customer_due_amount = parseFloat(0)
          }
          else if (order.payment_status === 3) {

            // order.customer_paid_amount = parseFloat(grandTotal).toFixed(2)
            // order.customer_due_amount = parseFloat(0).toFixed(2) NoOfPersonServed[0].total,


            let [partially_total] = await connection.query(`select SUM(paid_amount) AS total from orders_payment where fooder_id = ? and order_id = ?`, [
              req.staff.fooder_id,
              order.id

            ]);

            order.customer_paid_amount = parseFloat(partially_total[0].total)
            order.customer_due_amount = (parseFloat(grandTotal) - parseFloat(partially_total[0].total))
          }

          if (order.payment_status === 0) {
            order.payment_status_lable = "Unpaid"

          } else if (order.payment_status === 1) {
            order.payment_status_lable = "Paid"

          } else if (order.payment_status === 2) {
            order.payment_status_lable = "Hold"

          } else if (order.payment_status === 3) {
            order.payment_status_lable = "Partially Unpaid"

          }


          //console.log("order.service_charge=========>",order.service_charge);
          //console.log("order.tax=========>",order.tax);
          ////////////////////////////////////////////////////////////////////////
          // Add status mapping
          if (order.status === 0) {
            order.order_status_lable = "Pending";
          } else if (order.status === 1) {
            order.order_status_lable = "Accept and prepare order";
          } else if (order.status === 2) {
            order.order_status_lable = "Order Ready";
          } else if (order.status === 3) {
            order.order_status_lable = "Delivered and paid";
          } else if (order.status === 4) {
            order.order_status_lable = "Reject";
          }

          //*****************************************************************************************************************************************************************************/
          //           // Fetch payment details for the order
          //           const [paymentDetails] = await connection.query(
          //             `SELECT payment_details FROM orders_payment WHERE order_id = ?`,
          //             [order.id]
          //           );

          //          if (paymentDetails.length > 0) {
          //   const { due } = JSON.parse(paymentDetails[0].payment_details);
          //   const dueAmount = parseFloat(due);
          //   if (!isNaN(dueAmount)) {
          //     order.due_amount = dueAmount.toFixed(2);
          //     totalDueAmount += dueAmount; // Accumulate due amount
          //   } else {
          //     order.due_amount = "0.00"; // Set due amount to 0 if NaN
          //   }
          // } else {
          //   order.due_amount = "0.00"; // Set due amount to 0 if payment details are missing
          // }


          //****************************************************************************************************************************************************************************/  

          return order;
        })
      );
      modifiedData.forEach((order) => {
        totalSubtotal += parseFloat(order.subtotal);
        totalDiscount += parseFloat(order.discount);
        totalTotal += parseFloat(order.total);
        totalServiceCharge += parseFloat(order.service_charge);
        totalTax += parseFloat(order.tax);
        totalCustomerDueAmount += parseFloat(order.customer_due_amount)
        totalCustomerPaidAmount += parseFloat(order.customer_paid_amount)

        totalPackingCharges += parseFloat(order.packaging_fee)
        totalRoundUpAmount += parseFloat(order.round_up_amount);


      });

      connection.release();
      return res.status(200).send({
        status: "success",
        data: modifiedData,
        totalSubtotal: totalSubtotal.toFixed(2),
        totalDiscount: totalDiscount.toFixed(2),
        totalTotal: totalTotal.toFixed(2),
        totalServiceCharge: totalServiceCharge.toFixed(2),
        totalTax: totalTax.toFixed(2),
        totalPackingCharges: totalPackingCharges.toFixed(2),
        totalRoundUpAmount: totalRoundUpAmount.toFixed(2),
        totalDueAmount: totalDueAmount.toFixed(2),
        currency_symbol: config.currency_symbol,
        start_date: start_date,
        end_date: end_date,
        totalCustomerDueAmount: totalCustomerDueAmount.toFixed(2),
        totalCustomerPaidAmount: totalCustomerPaidAmount.toFixed(2),
        order_mode: req.query.order_mode,
        payment_status: req.query.payment_status,

      });
    } else {
      const [getSalesReportResult] = await connection.query(
        `select id, order_date,status,payment_status, order_type,creation_date, order_number_qrcode, service_charge_details,tax_details,discount_type,discount_rate, round_up_amount,invoice_no from orders where fooder_id = ? and creation_date BETWEEN ? and ? and payment_status IN (0, 1, 2, 3) and ${get_payment_status === 'all' ? `(payment_status IN (0, 1, 2, 3))` : get_payment_status === '0' ? `(payment_status = 0)` : get_payment_status === '1' ? `(payment_status = 1)` : get_payment_status === '2' ? `(payment_status = 2)` : `(payment_status = 3)`} and is_cancelled = 0  ORDER BY id DESC`,
        [req.staff.fooder_id, timestampOpen, timestampClose]
      );
      if (getSalesReportResult.length === 0) {
        connection.release();

        return res
          .status(200)
          .send({ status: "success", message: "Data Not Available.." });
      }

      // Initialize variables to store totals
      let totalSubtotal = 0;
      let totalDiscount = 0;
      let totalTotal = 0;
      let totalServiceCharge = 0;
      let totalTax = 0;
      let totalCustomerDueAmount = 0
      let totalCustomerPaidAmount = 0
      let totalPackingCharges = 0
      let totalRoundUpAmount = 0



      const modifiedData = await Promise.all(
        getSalesReportResult.map(async (order) => {
          order.creation_date_formatted = formatUnixTimestamp(
            order.creation_date
          );
          order.order_type = order.order_type.replace(/_/g, " ");
          order.order_type =
            order.order_type.charAt(0).toUpperCase() +
            order.order_type.slice(1);

          const orderItems = await fetchOrderItemsData(
            req.staff.fooder_id,
            order.id,
            connection
          );

          // const subTotal = orderItems.reduce(
          //   (total, item) =>
          //     total +
          //     (item.product_proprice
          //       ? item.product_proprice
          //       : item.product_price) *
          //     item.quantity,
          //   0
          // );

          // //console.log("subTotal===============?????", subTotal);

          // //////////////////////////////Total Caculation///////////////////////////
          // let discountAmount = 0;
          // let discountAmt = 0;

          // if (
          //   order.discount_type === 0 &&
          //   !isNaN(parseFloat(order.discount_rate)) &&
          //   isFinite(order.discount_rate)
          // ) {
          //   discountAmt = (subTotal * order.discount_rate) / 100;
          //   discountAmount = subTotal - (subTotal * order.discount_rate) / 100;
          // } else if (
          //   order.discount_type === 1 &&
          //   !isNaN(parseFloat(order.discount_rate)) &&
          //   isFinite(order.discount_rate)
          // ) {
          //   discountAmt = order.discount_rate;
          //   discountAmount = subTotal - order.discount_rate;
          // } else {
          //   discountAmount = subTotal;
          // }

          // // console.log("discountAmount===========>", discountAmount);

          // // Initialize variables to store the total amounts for this order
          // let totalServiceCharge = 0;
          // let totalTax = 0;
          // let serviceCharge = 0;

          // // Extract service charge percentage and add it to the total
          // const serviceChargeDetails = JSON.parse(order.service_charge_details);
          // if (serviceChargeDetails.percentage) {
          //   const serviceChargePercentage = parseFloat(
          //     serviceChargeDetails.percentage
          //   );
          //   serviceCharge = (discountAmount * serviceChargePercentage) / 100;

          //   totalServiceCharge =
          //     discountAmount + (discountAmount * serviceChargePercentage) / 100;
          // } else {
          //   totalServiceCharge = discountAmount;
          // }
          // // Extract tax details and add them to the total
          // const taxDetails = JSON.parse(order.tax_details);
          // // console.log("limit=====>", taxDetails);
          // taxDetails.forEach((tax) => {
          //   const taxPercentage = parseFloat(tax.percentage);
          //   totalTax += (totalServiceCharge * taxPercentage) / 100;
          //   // console.log("taxPercentage========>", taxPercentage);
          // });
          // // console.log("totalTax=========>", totalTax);

          // // Calculate the grand total for this order
          // const grandTotal = totalServiceCharge + totalTax;
          // // console.log("grandTotal===========>", grandTotal);

          // // Add the grandTotal to this order
          // order.subtotal = parseFloat(subTotal).toFixed(2);
          // order.discount = parseFloat(discountAmt).toFixed(2);
          // order.total = parseFloat(grandTotal).toFixed(2);
          // order.service_charge = parseFloat(serviceCharge).toFixed(2);
          // order.tax = parseFloat(totalTax).toFixed(2);





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


          //  for flate amount discount
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
              // tempDiscount += (((i.quantity) * withOutTaxPrice) - parseFloat(order.discount_rate))
              // tempDiscountRow = (((i.quantity) * withOutTaxPrice) - parseFloat(order.discount_rate))
              // tempDiscount += ((i.quantity * withOutTaxPrice) - ((i.quantity * withOutTaxPrice) - parseFloat(order.discount_rate))) * i.quantity
              // tempDiscountRow = ((i.quantity * withOutTaxPrice) - ((i.quantity * withOutTaxPrice) - parseFloat(order.discount_rate))) * i.quantity
              tempDiscount += (((i.quantity) * withOutTaxPrice) * parseFloat(discountRateForAmount)) / 100
              tempDiscountRow = (((i.quantity) * withOutTaxPrice) * parseFloat(discountRateForAmount)) / 100
            }


            tempServicCharge += ((((i.quantity) * withOutTaxPrice) - tempDiscountRow) * parseFloat(serviceChargeDetails.percentage)) / 100
            tempServicChargeRow = ((((i.quantity) * withOutTaxPrice) - tempDiscountRow) * parseFloat(serviceChargeDetails.percentage)) / 100



            tempTax += ((((i.quantity) * withOutTaxPrice) + tempServicChargeRow - tempDiscountRow) * parseFloat(i.item_tax_percent)) / 100
          })



          var grandTotal = 0

          if (order.order_type != "dine_in") {
            grandTotal = (parseFloat(subTotal + tempServicCharge - tempDiscount + tempTax + order.round_up_amount) + parseFloat(packingCharges))
            order.packaging_fee = parseFloat(packingCharges)
          } else {
            grandTotal = (subTotal + tempServicCharge - tempDiscount + tempTax + order.round_up_amount)
            order.packaging_fee = parseFloat(0)
          }




          order.subtotal = parseFloat(subTotal)
          order.discount = parseFloat(tempDiscount)
          order.total = parseFloat(grandTotal)
          order.service_charge = parseFloat(tempServicCharge)
          order.tax = parseFloat(tempTax)

          // order.round_up_amount = parseFloat(round_up_amount).toFixed(2);



          if (order.payment_status === 0 || order.payment_status === 2) {
            order.customer_paid_amount = parseFloat(0)
            order.customer_due_amount = parseFloat(grandTotal)

          } else if (order.payment_status === 1) {
            order.customer_paid_amount = parseFloat(grandTotal)
            order.customer_due_amount = parseFloat(0)
          }
          else if (order.payment_status === 3) {

            let [partially_total] = await connection.query(`select SUM(paid_amount) AS total from orders_payment where fooder_id = ? and order_id = ?`, [
              req.staff.fooder_id,
              order.id
            ]);
            order.customer_paid_amount = parseFloat(partially_total[0].total)
            order.customer_due_amount = (parseFloat(grandTotal) - parseFloat(partially_total[0].total))
          }

          if (order.payment_status === 0) {
            order.payment_status_lable = "Unpaid"

          } else if (order.payment_status === 1) {
            order.payment_status_lable = "Paid"

          } else if (order.payment_status === 2) {
            order.payment_status_lable = "Hold"

          } else if (order.payment_status === 3) {
            order.payment_status_lable = "Partially Unpaid"

          }



          //console.log("order.service_charge=========>",order.service_charge);
          //console.log("order.tax=========>",order.tax);
          ////////////////////////////////////////////////////////////////////////
          // Add status mapping
          if (order.status === 0) {
            order.order_status_lable = "Pending";
          } else if (order.status === 1) {
            order.order_status_lable = "Accept and prepare order";
          } else if (order.status === 2) {
            order.order_status_lable = "Order Ready";
          } else if (order.status === 3) {
            order.order_status_lable = "Delivered and paid";
          } else if (order.status === 4) {
            order.order_status_lable = "Reject";
          }


          //*****************************************************************************************************************************************************************************/
          //   // Fetch payment details for the order
          //   const [paymentDetails] = await connection.query(
          //     `SELECT payment_details FROM orders_payment WHERE order_id = ?`,
          //     [order.id]
          //   );

          //          if (paymentDetails.length > 0) {
          //   const { due } = JSON.parse(paymentDetails[0].payment_details);
          //   const dueAmount = parseFloat(due);
          //   if (!isNaN(dueAmount)) {
          //     order.due_amount = dueAmount.toFixed(2);
          //     totalDueAmount += dueAmount; // Accumulate due amount
          //   } else {
          //     order.due_amount = "0.00"; // Set due amount to 0 if NaN
          //   }
          // } else {
          //   order.due_amount = "0.00"; // Set due amount to 0 if payment details are missing
          // }


          //****************************************************************************************************************************************************************************/ 

          return order;
        })
      );
      modifiedData.forEach((order) => {
        totalSubtotal += parseFloat(order.subtotal);
        totalDiscount += parseFloat(order.discount);
        totalTotal += parseFloat(order.total);
        totalServiceCharge += parseFloat(order.service_charge);
        totalTax += parseFloat(order.tax);
        totalCustomerDueAmount += parseFloat(order.customer_due_amount)
        totalCustomerPaidAmount += parseFloat(order.customer_paid_amount)
        totalPackingCharges += parseFloat(order.packaging_fee)

        totalRoundUpAmount += parseFloat(order.round_up_amount);


        // Check if the order_type is already in the orderTypeTotals object
        if (!orderTypeTotals[order.order_type]) {
          // If not, initialize the totals for this order_type
          orderTypeTotals[order.order_type] = {
            subtotal: 0,
            discount: 0,
            total: 0,
            serviceCharge: 0,
            tax: 0,
            totalCustomerDueAmount: 0,
            totalCustomerPaidAmount: 0,
            totalPackingCharges: 0,
            totalRoundUpAmount: 0

          };
        }

        orderTypeTotals[order.order_type].subtotal = (
          parseFloat(orderTypeTotals[order.order_type].subtotal) +
          parseFloat(order.subtotal)
        )
        orderTypeTotals[order.order_type].discount = (
          parseFloat(orderTypeTotals[order.order_type].discount) +
          parseFloat(order.discount)
        )
        orderTypeTotals[order.order_type].total = (
          parseFloat(orderTypeTotals[order.order_type].total) +
          parseFloat(order.total)
        )
        orderTypeTotals[order.order_type].serviceCharge = (
          parseFloat(orderTypeTotals[order.order_type].serviceCharge) +
          parseFloat(order.service_charge)
        )
        orderTypeTotals[order.order_type].tax = (
          parseFloat(orderTypeTotals[order.order_type].tax) +
          parseFloat(order.tax)
        )


        orderTypeTotals[order.order_type].totalCustomerDueAmount = (
          parseFloat(orderTypeTotals[order.order_type].totalCustomerDueAmount) +
          parseFloat(order.customer_due_amount)
        )

        orderTypeTotals[order.order_type].totalCustomerPaidAmount = (
          parseFloat(orderTypeTotals[order.order_type].totalCustomerPaidAmount) +
          parseFloat(order.customer_paid_amount)
        )

        orderTypeTotals[order.order_type].totalPackingCharges = (
          parseFloat(orderTypeTotals[order.order_type].totalPackingCharges) +
          parseFloat(order.packaging_fee)
        )

        orderTypeTotals[order.order_type].totalRoundUpAmount = (
          parseFloat(orderTypeTotals[order.order_type].totalRoundUpAmount) +
          parseFloat(order.round_up_amount)
        )



      });

      connection.release();
      return res.status(200).send({
        status: "success",
        data: modifiedData,
        totalSubtotal: totalSubtotal.toFixed(2),
        totalDiscount: totalDiscount.toFixed(2),
        totalTotal: totalTotal.toFixed(2),
        totalServiceCharge: totalServiceCharge.toFixed(2),
        totalTax: totalTax.toFixed(2),
        totalDueAmount: totalDueAmount.toFixed(2),
        currency_symbol: config.currency_symbol,
        start_date: start_date,
        end_date: end_date,
        orderTypeTotals: orderTypeTotals,
        totalCustomerDueAmount: totalCustomerDueAmount.toFixed(2),
        totalCustomerPaidAmount: totalCustomerPaidAmount.toFixed(2),
        order_mode: req.query.order_mode,
        payment_status: req.query.payment_status,
        totalPackingCharges: parseFloat(totalPackingCharges).toFixed(2),
        totalRoundUpAmount: parseFloat(totalRoundUpAmount).toFixed(2)


      });
    }
  } catch (error) {
    console.error("Error:", error);
    if (connection) {
      connection.release();
    }
    return res.status(500).json({
      message: "Internal server error",
      errors: error.toString(),
    });
  }
};

exports.getItemsReportDetails = async (req, res) => {

  // console.log("getItemsReportDetails")
  //   const { start_date, end_date } = req.query;
  const fooder_id = req.staff.fooder_id;

  const start_date = req.query.start_date;
  const end_date = req.query.end_date;
  const product_id = req.query.product_id;
  const get_payment_status = req.query.payment_status;


  const combinedOpenDateTimeString = start_date;

  const combinedDateTimeOpen = new Date(combinedOpenDateTimeString + "+05:30");
  const combinedCloseDateTimeString = end_date;


  const combinedDateTimeClose = new Date(
    combinedCloseDateTimeString + "+05:30"
  ); // +05:30 represents the Indian Standard Time (IST)

  // Get the timestamps (in milliseconds since the Unix Epoch)
  const timestampOpen = combinedDateTimeOpen.getTime() / 1000;
  const timestampClose = combinedDateTimeClose.getTime() / 1000;



  const connection = await db.getConnection();

  try {

    // SELECT product_name, product_id, SUM(quantity) AS total_quantity, SUM(product_price) AS total_product_price 
    // FROM order_items
    // WHERE fooder_id = ? AND creation_date BETWEEN ? and ? GROUP BY product_name 
    let condition = ''
    if (product_id !== 'all') {
      condition = `AND order_items.product_id = ${product_id}`
    }

    const [selectItemsData] = await connection.query(
      `
SELECT 
    order_items.product_name, 
    order_items.product_id, 
    SUM(order_items.quantity) AS total_quantity, 
    SUM(
        CASE 
            WHEN order_items.item_tax_type = 1 THEN 
                order_items.quantity * ((order_items.product_price * 100) / (order_items.item_tax_percent + 100))
            ELSE 
                order_items.quantity * order_items.product_price 
        END
    ) AS subtotal_product_price,
    SUM(
        CASE 
            WHEN order_items.item_tax_type = 1 THEN 
                CASE 
                    WHEN orders.discount_type = 1 THEN 
                        ((order_items.quantity * ((order_items.product_price * 100) / (order_items.item_tax_percent + 100))) * ((orders.discount_rate * 100) / (SELECT 
                            SUM(
                                CASE 
                                    WHEN oi.item_tax_type = 1 THEN 
                                        oi.quantity * ((oi.product_price * 100) / (oi.item_tax_percent + 100))
                                    ELSE 
                                        oi.quantity * oi.product_price 
                                END
                            ) 
                            FROM order_items oi 
                            WHERE oi.order_id = orders.id
                        ))) / 100
                    ELSE 
                        ((order_items.quantity * ((order_items.product_price * 100) / (order_items.item_tax_percent + 100))) * orders.discount_rate) / 100
                END
            ELSE 
                CASE 
                    WHEN orders.discount_type = 1 THEN 
                        ((order_items.quantity * order_items.product_price ) * ((orders.discount_rate * 100) / (SELECT 
                            SUM(
                                CASE 
                                    WHEN oi.item_tax_type = 1 THEN 
                                        oi.quantity * ((oi.product_price * 100) / (oi.item_tax_percent + 100))
                                    ELSE 
                                        oi.quantity * oi.product_price 
                                END
                            ) 
                            FROM order_items oi 
                            WHERE oi.order_id = orders.id
                        ))) / 100
                    ELSE 
                        ((order_items.quantity * order_items.product_price ) * orders.discount_rate) / 100
                END
        END
    ) AS discount_price ,


    SUM(
        CASE 
            WHEN order_items.item_tax_type = 1 THEN 
                CASE 
                    WHEN orders.discount_type = 1 THEN 
                    (((order_items.quantity * ((order_items.product_price * 100) / (order_items.item_tax_percent + 100))) - 

                        (((order_items.quantity * ((order_items.product_price * 100) / (order_items.item_tax_percent + 100))) * ((orders.discount_rate * 100) / (SELECT 
                            SUM(
                                CASE 
                                    WHEN oi.item_tax_type = 1 THEN 
                                        oi.quantity * ((oi.product_price * 100) / (oi.item_tax_percent + 100))
                                    ELSE 
                                        oi.quantity * oi.product_price 
                                END
                            ) 
                            FROM order_items oi 
                            WHERE oi.order_id = orders.id
                        ))) / 100) ) * CASE 
                              WHEN (orders.service_charge_details != '{}' AND orders.service_charge_details != '[]') THEN JSON_UNQUOTE(JSON_EXTRACT(orders.service_charge_details, '$.percentage'))
                              ELSE '0' 
                          END) /100
                    ELSE 

                    (((order_items.quantity * ((order_items.product_price * 100) / (order_items.item_tax_percent + 100))) - 
                        (((order_items.quantity * ((order_items.product_price * 100) / (order_items.item_tax_percent + 100))) * orders.discount_rate) / 100)) * CASE 
                              WHEN (orders.service_charge_details != '{}' AND orders.service_charge_details != '[]') THEN JSON_UNQUOTE(JSON_EXTRACT(orders.service_charge_details, '$.percentage'))
                              ELSE '0' 
                          END) /100
                END
            ELSE 
                CASE 
                    WHEN orders.discount_type = 1 THEN 
                    (((order_items.quantity * order_items.product_price) - 
                        (((order_items.quantity * order_items.product_price ) * ((orders.discount_rate * 100) / (SELECT 
                            SUM(
                                CASE 
                                    WHEN oi.item_tax_type = 1 THEN 
                                        oi.quantity * ((oi.product_price * 100) / (oi.item_tax_percent + 100))
                                    ELSE 
                                        oi.quantity * oi.product_price 
                                END
                            ) 
                            FROM order_items oi 
                            WHERE oi.order_id = orders.id
                        ))) / 100) ) * CASE 
                              WHEN (orders.service_charge_details != '{}' AND orders.service_charge_details != '[]') THEN JSON_UNQUOTE(JSON_EXTRACT(orders.service_charge_details, '$.percentage'))
                              ELSE '0' 
                          END) /100
                    ELSE 
                   (( (order_items.quantity * order_items.product_price) - 
                        (((order_items.quantity * order_items.product_price ) * orders.discount_rate) / 100)) * CASE 
                              WHEN (orders.service_charge_details != '{}' AND orders.service_charge_details != '[]') THEN JSON_UNQUOTE(JSON_EXTRACT(orders.service_charge_details, '$.percentage'))
                              ELSE '0' 
                          END) /100
                END
        END
    ) AS sch_price ,







    SUM(
        CASE 
            WHEN order_items.item_tax_type = 1 THEN 
                CASE 
                    WHEN orders.discount_type = 1 THEN 

                   (( (order_items.quantity * ((order_items.product_price * 100) / (order_items.item_tax_percent + 100))) -

                    (((order_items.quantity * ((order_items.product_price * 100) / (order_items.item_tax_percent + 100))) * ((orders.discount_rate * 100) / (SELECT 
                            SUM(
                                CASE 
                                    WHEN oi.item_tax_type = 1 THEN 
                                        oi.quantity * ((oi.product_price * 100) / (oi.item_tax_percent + 100))
                                    ELSE 
                                        oi.quantity * oi.product_price 
                                END
                            ) 
                            FROM order_items oi 
                            WHERE oi.order_id = orders.id
                        ))) / 100) +

                    ((((order_items.quantity * ((order_items.product_price * 100) / (order_items.item_tax_percent + 100))) - 

                        (((order_items.quantity * ((order_items.product_price * 100) / (order_items.item_tax_percent + 100))) * ((orders.discount_rate * 100) / (SELECT 
                            SUM(
                                CASE 
                                    WHEN oi.item_tax_type = 1 THEN 
                                        oi.quantity * ((oi.product_price * 100) / (oi.item_tax_percent + 100))
                                    ELSE 
                                        oi.quantity * oi.product_price 
                                END
                            ) 
                            FROM order_items oi 
                            WHERE oi.order_id = orders.id
                        ))) / 100) ) * CASE 
                              WHEN (orders.service_charge_details != '{}' AND orders.service_charge_details != '[]') THEN JSON_UNQUOTE(JSON_EXTRACT(orders.service_charge_details, '$.percentage'))
                              ELSE '0' 
                          END) /100)) * order_items.item_tax_percent) / 100
                    ELSE 
                    (((order_items.quantity * ((order_items.product_price * 100) / (order_items.item_tax_percent + 100))) -

                    (((order_items.quantity * ((order_items.product_price * 100) / (order_items.item_tax_percent + 100))) * orders.discount_rate) / 100) +

                    ((((order_items.quantity * ((order_items.product_price * 100) / (order_items.item_tax_percent + 100))) - 
                        (((order_items.quantity * ((order_items.product_price * 100) / (order_items.item_tax_percent + 100))) * orders.discount_rate) / 100)) * CASE 
                              WHEN (orders.service_charge_details != '{}' AND orders.service_charge_details != '[]') THEN JSON_UNQUOTE(JSON_EXTRACT(orders.service_charge_details, '$.percentage'))
                              ELSE '0' 
                          END) /100)) * order_items.item_tax_percent) / 100
                END
            ELSE 
                CASE 
                    WHEN orders.discount_type = 1 THEN 
                    (((order_items.quantity * order_items.product_price ) -
                     (((order_items.quantity * order_items.product_price ) * ((orders.discount_rate * 100) / (SELECT 
                            SUM(
                                CASE 
                                    WHEN oi.item_tax_type = 1 THEN 
                                        oi.quantity * ((oi.product_price * 100) / (oi.item_tax_percent + 100))
                                    ELSE 
                                        oi.quantity * oi.product_price 
                                END
                            ) 
                            FROM order_items oi 
                            WHERE oi.order_id = orders.id
                        ))) / 100) +
                    ((((order_items.quantity * order_items.product_price) - 
                        (((order_items.quantity * order_items.product_price ) * ((orders.discount_rate * 100) / (SELECT 
                            SUM(
                                CASE 
                                    WHEN oi.item_tax_type = 1 THEN 
                                        oi.quantity * ((oi.product_price * 100) / (oi.item_tax_percent + 100))
                                    ELSE 
                                        oi.quantity * oi.product_price 
                                END
                            ) 
                            FROM order_items oi 
                            WHERE oi.order_id = orders.id
                        ))) / 100) ) * CASE 
                              WHEN (orders.service_charge_details != '{}' AND orders.service_charge_details != '[]') THEN JSON_UNQUOTE(JSON_EXTRACT(orders.service_charge_details, '$.percentage'))
                              ELSE '0' 
                          END) /100)) * order_items.item_tax_percent) / 100
                    ELSE 
                    (((order_items.quantity * order_items.product_price ) -
                    (((order_items.quantity * order_items.product_price ) * orders.discount_rate) / 100) + 
                   ((( (order_items.quantity * order_items.product_price) - 
                        (((order_items.quantity * order_items.product_price ) * orders.discount_rate) / 100)) * CASE 
                              WHEN (orders.service_charge_details != '{}' AND orders.service_charge_details != '[]') THEN JSON_UNQUOTE(JSON_EXTRACT(orders.service_charge_details, '$.percentage'))
                              ELSE '0' 
                          END) /100)) * order_items.item_tax_percent) / 100
                END
        END
    ) AS tax_price 



FROM 
    order_items
    INNER JOIN orders ON order_items.order_id = orders.id
WHERE 
    order_items.fooder_id = ? 
    AND order_items.creation_date BETWEEN ? AND ?
    AND orders.payment_status = 1
    AND orders.is_cancelled = 0
    ${condition}
GROUP BY 
    order_items.product_name
`,
      [fooder_id, timestampOpen, timestampClose]
    );
    connection.release();
    return res.status(200).send({
      status: "success",

      data: selectItemsData,
      start_date: start_date,
      end_date: end_date,

    });

  } catch (error) {
    console.error("Error:", error);
    if (connection) {
      connection.release();
    }
    return res.status(500).json({
      message: "Internal server error",
      errors: error.toString(),
    });
  }
};

// exports.getSalesReportDaily = async (req, res) => {
//   const connection = await db.getConnection();
//   let start_date1 = req.query.date;
//   let start_date2 = req.query.date;

//   const openTime = req.staff.open_time;
//   const closeTime = req.staff.close_time;

//   // console.log("start_date", start_date1);
//   // console.log("openTime", openTime);
//   // console.log("closeTime", closeTime);

//   // Convert time strings to Date objects for comparison
//   const openDateTime = new Date("2000-01-01T" + openTime + "-04:00");
//   const closeDateTime = new Date("2000-01-01T" + closeTime + "-04:00");

//   //   console.log("openDateTime", openDateTime);
//   //   console.log("closeDateTime", closeDateTime);

//   // If close time is earlier than open time, add one day to start_date
//   if (closeDateTime < openDateTime) {
//     const nextDay = new Date(
//       new Date(start_date1).getTime() + 24 * 60 * 60 * 1000
//     );
//     start_date2 = nextDay.toISOString().slice(0, 10); // Update start_date
//   }

//   //    console.log("nextday", start_date2);

//   // Combine date and time strings for open time
//   const combinedOpenDateTimeString = start_date1 + "T" + openTime;

//   // Create a new Date object with the combined date and time for open time
//   const combinedDateTimeOpen = new Date(combinedOpenDateTimeString + "+05:30"); // +05:30 represents the Indian Standard Time (IST)

//   // Combine date and time strings for close time
//   const combinedCloseDateTimeString = start_date2 + "T" + closeTime;

//   // Create a new Date object with the combined date and time for close time
//   const combinedDateTimeClose = new Date(
//     combinedCloseDateTimeString + "+05:30"
//   ); // +05:30 represents the Indian Standard Time (IST)

//   // Get the timestamps (in milliseconds since the Unix Epoch)
//   const timestampOpen = combinedDateTimeOpen.getTime() / 1000;
//   const timestampClose = combinedDateTimeClose.getTime() / 1000;

//   //    console.log("timestampOpen:", timestampOpen);
//   //    console.log("timestampClose:", timestampClose);

//   try {
//     const orderTypeTotals = {};
//     const orderTypeCounts = {};
//     const getReportResultQuery = `select id, order_date,status,payment_status, creation_date, order_number_qrcode,order_type, service_charge_details,round_up_amount,tax_details,discount_type,discount_rate,payment_type,no_of_eaters from orders where fooder_id = ? and creation_date BETWEEN ? and ? and payment_status = 1 and status IN (1, 2, 3) and is_cancelled = 0 
//  ORDER BY id DESC`;

//     // console.log("openTimeUnix",openTimeUnix);
//     // console.log("closeTimeUnix",closeTimeUnix);
//     // console.log("Executing query:", getReportResultQuery);

//     const [getReportResult] = await connection.query(getReportResultQuery, [
//       req.staff.fooder_id,
//       timestampOpen,
//       timestampClose,
//     ]);
//     // console.log("getReportResultQuery", getReportResultQuery);
//     // select  COUNT(DISTINCT eater_phonenumber) AS unique_eater_count from orders where ${get_order_mode !== 'all' ? `order_type = '${get_order_mode}'` : '1 = 1'} and fooder_id = ? and creation_date BETWEEN ? and ? AND ${get_payment_status === 'all' ? `(payment_status IN (1, 3))` : get_payment_status === '1' ? `(payment_status = 1)` : `(payment_status = 3)`} and status IN (1, 2, 3) and is_cancelled = 0 AND eater_phonenumber != ''
//     // ORDER BY id DESC
//     const [[{ unique_eater_count: totalAquireCustomerCount }]] = await connection.query(
//       `select  COUNT(DISTINCT eater_phonenumber) AS unique_eater_count from orders where fooder_id = ? and creation_date BETWEEN ? and ? and payment_status IN (1, 3) and status IN (1, 2, 3) and is_cancelled = 0 AND eater_phonenumber != '' ORDER BY id DESC`,
//       [req.staff.fooder_id, timestampOpen, timestampClose]
//     );
//     console.log("totalAquireCustomerCount", totalAquireCustomerCount);

//     const [getTotalCount] = await connection.query(
//       `select COUNT(*) AS total_orders from orders where fooder_id = ? and creation_date BETWEEN ? and ? and payment_status = 1 and status IN (1, 2, 3) and is_cancelled = 0 ORDER BY id DESC`,
//       [req.staff.fooder_id, timestampOpen, timestampClose]
//     );
//     const totalcount = getTotalCount[0].total_orders;
//     //console.log("getReportResultQuery", getReportResult);

//     // if (getReportResult.length === 0) {
//     //   const [getReportResultTotalLen] = await connection.query(`select COUNT(*) AS total_orders from orders where fooder_id = ? and creation_date BETWEEN ? and ? AND payment_status IN (1, 3)  and status IN (1, 2, 3) and is_cancelled = 0`, [
//     //     req.staff.fooder_id,
//     //     timestampOpen,
//     //     timestampClose,
//     //   ]);
//     //   if(getReportResultTotalLen[0].total_orders === 0){
//     //     connection.release();
//     //     return res
//     //       .status(200)
//     //       .send({ status: "success", message: "Data Not Available.." });
//     //   }
//     // }

//     const [getReportResultTotalLen] = await connection.query(`select COUNT(*) AS total_orders from orders where fooder_id = ? and creation_date BETWEEN ? and ? AND payment_status IN (1, 3)  and status IN (1, 2, 3) and is_cancelled = 0`, [
//       req.staff.fooder_id,
//       timestampOpen,
//       timestampClose,
//     ]);
//     if (getReportResultTotalLen[0].total_orders === 0) {
//       connection.release();
//       return res
//         .status(200)
//         .send({ status: "success", message: "Data Not Available.." });
//     }
//     // Initialize variables to store totals
//     let totalSubtotal = 0;
//     let totalDiscount = 0;
//     let totalTotal = 0;
//     let totalServiceCharge = 0;
//     let totalTax = 0;
//     let totalEaters = 0;

//     const paymentType = {
//       card: "0.00",
//       cash: "0.00",
//       upi: "0.00",
//       neft: "0.00",
//       zomato: "0.00",
//       swiggy: "0.00",
//       dineout: "0.00",

//     };
//     //***********************************************************************Sales by order type Start***********************************************************************************************/

//     const modifiedData = await Promise.all(
//       getReportResult.map(async (order) => {
//         order.creation_date_formatted = formatUnixTimestamp(
//           order.creation_date
//         );
//         order.order_type = order.order_type.replace(/_/g, " ");
//         //   order.order_type =
//         //     order.order_type.charAt(0).toUpperCase() +
//         //     order.order_type.slice(1);
//         orderTypeCounts[order.order_type] =
//           (orderTypeCounts[order.order_type] || 0) + 1;

//         const orderItems = await fetchOrderItemsData(
//           req.staff.fooder_id,
//           order.id,
//           connection
//         );
//         //console.log("orderItems", orderItems);
//         // const subTotal = orderItems.reduce(
//         //   (total, item) =>
//         //     total +
//         //     (item.product_proprice
//         //       ? item.product_proprice
//         //       : item.product_price) *
//         //     item.quantity,
//         //   0
//         // );

//         // //console.log("subTotal===============?????", subTotal);

//         // //////////////////////////////Total Caculation///////////////////////////
//         // let discountAmount = 0;
//         // let discountAmt = 0;

//         // if (
//         //   order.discount_type === 0 &&
//         //   !isNaN(parseFloat(order.discount_rate)) &&
//         //   isFinite(order.discount_rate)
//         // ) {
//         //   discountAmt = (subTotal * order.discount_rate) / 100;
//         //   discountAmount = subTotal - (subTotal * order.discount_rate) / 100;
//         // } else if (
//         //   order.discount_type === 1 &&
//         //   !isNaN(parseFloat(order.discount_rate)) &&
//         //   isFinite(order.discount_rate)
//         // ) {
//         //   discountAmt = order.discount_rate;
//         //   discountAmount = subTotal - order.discount_rate;
//         // } else {
//         //   discountAmount = subTotal;
//         // }

//         // // console.log("discountAmount===========>", discountAmount);

//         // // Initialize variables to store the total amounts for this order
//         // let totalServiceCharge = 0;
//         // let totalTax = 0;
//         // let serviceCharge = 0;

//         // // Extract service charge percentage and add it to the total
//         // const serviceChargeDetails = JSON.parse(order.service_charge_details);
//         // if (serviceChargeDetails.percentage) {
//         //   const serviceChargePercentage = parseFloat(
//         //     serviceChargeDetails.percentage
//         //   );
//         //   serviceCharge = (discountAmount * serviceChargePercentage) / 100;

//         //   totalServiceCharge =
//         //     discountAmount + (discountAmount * serviceChargePercentage) / 100;
//         // } else {
//         //   totalServiceCharge = discountAmount;
//         // }
//         // // Extract tax details and add them to the total
//         // const taxDetails = JSON.parse(order.tax_details);
//         // // console.log("limit=====>", taxDetails);
//         // taxDetails.forEach((tax) => {
//         //   const taxPercentage = parseFloat(tax.percentage);
//         //   totalTax += (totalServiceCharge * taxPercentage) / 100;
//         //   // console.log("taxPercentage========>", taxPercentage);
//         // });
//         // // console.log("totalTax=========>", totalTax);

//         // // Calculate the grand total for this order
//         // const grandTotal = totalServiceCharge + totalTax;
//         // // console.log("grandTotal===========>", grandTotal);

//         // // Add the grandTotal to this order
//         // order.subtotal = parseFloat(subTotal).toFixed(2);
//         // order.discount = parseFloat(discountAmt).toFixed(2);
//         // order.total = parseFloat(grandTotal).toFixed(2);
//         // order.service_charge = parseFloat(serviceCharge).toFixed(2);
//         // order.tax = parseFloat(totalTax).toFixed(2);

//         //console.log("order.service_charge=========>",order.service_charge);
//         //console.log("order.tax=========>",order.tax);







//         const serviceChargeDetails = JSON.parse(order.service_charge_details);
//         if (!serviceChargeDetails.percentage) {
//           serviceChargeDetails.percentage = 0
//         }

//         let withOutTaxPrice = 0
//         let subTotal = 0;
//         let tempDiscount = 0;
//         let tempDiscountRow = 0;

//         let tempServicCharge = 0;
//         let tempServicChargeRow = 0;

//         let tempTax = 0;


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
//           grandTotal = (parseFloat(subTotal + tempServicCharge - tempDiscount + tempTax + order.round_up_amount) + parseFloat(packingCharges)).toFixed(2)
//           order.packaging_fee = parseFloat(packingCharges).toFixed(2);
//         } else {
//           grandTotal = (subTotal + tempServicCharge - tempDiscount + tempTax + order.round_up_amount).toFixed(2);
//           order.packaging_fee = parseFloat(0).toFixed(2);
//         }

//         // if (order.order_type != "dine_in") {
//         //   grandTotal = (parseFloat(subTotal + tempServicCharge - tempDiscount + tempTax + order.round_up_amount) + parseFloat(packingCharges)).toFixed(2)
//         // } else {
//         //   grandTotal = (subTotal + tempServicCharge - tempDiscount + tempTax + order.round_up_amount).toFixed(2);
//         // }


//         order.subtotal = parseFloat(subTotal).toFixed(2);
//         order.discount = parseFloat(tempDiscount).toFixed(2);
//         order.total = parseFloat(grandTotal).toFixed(2);
//         order.service_charge = parseFloat(tempServicCharge).toFixed(2);
//         order.tax = parseFloat(tempTax).toFixed(2);












//         ////////////////////////////////////////////////////////////////////////

//         // Add status mapping

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
//         totalEaters += parseInt(order.no_of_eaters);

//         const { payment_type } = order;
//         if (paymentType.hasOwnProperty(payment_type)) {
//           paymentType[payment_type] = (
//             parseFloat(paymentType[payment_type]) + parseFloat(order.total)
//           ).toFixed(2);
//         }

//         return order;
//       })
//     );



//     const [orders_payment_data] = await connection.query(
//       `SELECT op.*
//       FROM orders_payment AS op
//       INNER JOIN (
//           SELECT id
//           FROM orders
//           WHERE fooder_id = ? AND creation_date BETWEEN ? and ? AND is_cancelled = 0
//       ) AS ot ON op.order_id = ot.id;`,
//       [req.staff.fooder_id, timestampOpen, timestampClose]
//     );

//     orders_payment_data.forEach(order => {
//       // Your code here to process each order in orders_payment_data
//       // console.log(order); // Example of processing, you can replace this with your logic
//       const { payment_type } = order;
//       if (paymentType.hasOwnProperty(payment_type)) {
//         paymentType[payment_type] = (
//           parseFloat(paymentType[payment_type]) + parseFloat(order.paid_amount)
//         ).toFixed(2);
//       }
//     });

//     // console.log("res")
//     // console.log(orders_payment_data)

//     //Calculate total of all payment types
//     let totalOfAllPaymentTypes = 0;
//     Object.values(paymentType).forEach((value) => {
//       totalOfAllPaymentTypes += parseFloat(value);
//     });
//     totalOfAllPaymentTypes = totalOfAllPaymentTypes.toFixed(2);

//     modifiedData.forEach((order) => {
//       totalSubtotal += parseFloat(order.subtotal);
//       totalDiscount += parseFloat(order.discount);
//       totalTotal += parseFloat(order.total);
//       totalServiceCharge += parseFloat(order.service_charge);
//       totalTax += parseFloat(order.tax);

//       // Check if the order_type is already in the orderTypeTotals object
//       if (!orderTypeTotals[order.order_type]) {
//         // If not, initialize the totals for this order_type
//         orderTypeTotals[order.order_type] = {
//           subtotal: 0,
//           discount: 0,
//           total: 0,
//           serviceCharge: 0,
//           tax: 0,
//         };
//       }

//       orderTypeTotals[order.order_type].subtotal = (
//         parseFloat(orderTypeTotals[order.order_type].subtotal) +
//         parseFloat(order.subtotal)
//       ).toFixed(2);
//       orderTypeTotals[order.order_type].discount = (
//         parseFloat(orderTypeTotals[order.order_type].discount) +
//         parseFloat(order.discount)
//       ).toFixed(2);
//       orderTypeTotals[order.order_type].total = (
//         parseFloat(orderTypeTotals[order.order_type].total) +
//         parseFloat(order.total)
//       ).toFixed(2);
//       orderTypeTotals[order.order_type].serviceCharge = (
//         parseFloat(orderTypeTotals[order.order_type].serviceCharge) +
//         parseFloat(order.service_charge)
//       ).toFixed(2);
//       orderTypeTotals[order.order_type].tax = (
//         parseFloat(orderTypeTotals[order.order_type].tax) +
//         parseFloat(order.tax)
//       ).toFixed(2);
//     });
//     // Calculate total of all totals
//     let totalOfAllTotals = 0;
//     Object.values(orderTypeTotals).forEach((orderTypeTotal) => {
//       totalOfAllTotals += parseFloat(orderTypeTotal.total);
//     });
//     // totalOfAllTotals = totalOfAllTotals.toFixed(2);

//     const ave_tran = (
//       parseFloat(totalOfAllTotals) / parseFloat(totalcount)
//     ).toFixed(2);

//     // console.log("totalcount")
//     // console.log(totalcount)
//     // console.log(totalOfAllTotals)



//     const modifiedOrderTypeTotals = {};
//     for (const [key, value] of Object.entries(orderTypeTotals)) {
//       modifiedOrderTypeTotals[key.replace(/\s+/g, "_")] = value;
//     }
//     const modifiedOrderTypeCounts = {};
//     for (const [key, value] of Object.entries(orderTypeCounts)) {
//       modifiedOrderTypeCounts[key.replace(/\s+/g, "_")] = value;
//     }










//     // Calculate totals based on menu_id
//     const dataOfmenu = await connection.query(
//       `SELECT oi.menu_id, fm.name, oi.product_proprice, oi.product_price, oi.quantity, o.service_charge_details, o.tax_details, o.discount_type, o.discount_rate  
//       FROM order_items oi 
//       JOIN orders o ON oi.order_id = o.id 
//       JOIN fooders_menus fm ON oi.menu_id = fm.id
//       WHERE oi.fooder_id = ? AND o.creation_date BETWEEN ? and ? AND o.payment_status = 1 AND o.status IN (1, 2, 3) AND o.is_cancelled = 0`,
//       [req.staff.fooder_id, timestampOpen, timestampClose]
//     );

//     const menuTotals = {};

//     dataOfmenu[0].forEach((orderItem) => {
//       const {
//         menu_id,
//         product_proprice,
//         product_price,
//         quantity,
//         service_charge_details,
//         tax_details,
//         discount_type,
//         discount_rate,
//       } = orderItem;

//       const subTotal =
//         (product_proprice ? product_proprice : product_price) * quantity;
//       let discountAmount = 0;

//       if (
//         discount_type === 0 &&
//         !isNaN(parseFloat(discount_rate)) &&
//         isFinite(discount_rate)
//       ) {
//         discountAmount = (subTotal * discount_rate) / 100;
//       } else if (
//         discount_type === 1 &&
//         !isNaN(parseFloat(discount_rate)) &&
//         isFinite(discount_rate)
//       ) {
//         discountAmount = discount_rate;
//       }

//       let serviceChargeTotal = 0;
//       let taxTotal = 0;
//       let serviceChargeItem = 0;

//       const serviceChargeDetails = JSON.parse(service_charge_details);
//       if (serviceChargeDetails.percentage) {
//         const serviceChargePercentage = parseFloat(
//           serviceChargeDetails.percentage
//         );
//         serviceChargeItem =
//           (subTotal - discountAmount) * (serviceChargePercentage / 100);
//         serviceChargeTotal = subTotal - discountAmount + serviceChargeItem;
//       } else {
//         serviceChargeTotal = subTotal - discountAmount;
//       }

//       const taxDetails = JSON.parse(tax_details);
//       taxDetails.forEach((tax) => {
//         const taxPercentage = parseFloat(tax.percentage);
//         taxTotal += (serviceChargeTotal * taxPercentage) / 100;
//       });

//       const grandTotal = serviceChargeTotal + taxTotal;

//       if (!menuTotals[menu_id]) {
//         menuTotals[menu_id] = {
//           subtotal: 0,
//           discount: 0,
//           total: 0,
//           serviceCharge: 0,
//           tax: 0,
//         };
//       }

//       menuTotals[menu_id].subtotal += subTotal;
//       menuTotals[menu_id].discount += discountAmount;
//       menuTotals[menu_id].total += subTotal;
//       menuTotals[menu_id].serviceCharge += serviceChargeTotal;
//       menuTotals[menu_id].tax += taxTotal;
//     });

//     // Calculate total of all totals
//     let totalOfAllTotals2 = 0;
//     let totalServiceChargeTotal = 0;
//     let totalTaxTotal = 0;
//     Object.values(menuTotals).forEach((menuTotal) => {
//       totalOfAllTotals2 += parseFloat(menuTotal.total);
//     });
//     totalOfAllTotals2 = totalOfAllTotals2.toFixed(2);

//     const menuTotalsArray = [];

//     // Iterate through menuTotals to construct the new array
//     for (const [menuId, totals] of Object.entries(menuTotals)) {
//       // Fetch menu_name corresponding to menu_id
//       const [menuData] = await connection.query(
//         `SELECT name FROM fooders_menus WHERE id = ?`,
//         [menuId]
//       );

//       const menuName = menuData[0].name;

//       // Push an object containing menu_id, menu_name, and total to menuTotalsArray
//       menuTotalsArray.push({
//         menu_id: menuId,
//         menu_name: menuName,
//         total: parseFloat(totals.total).toFixed(2),
//       });
//     }

//     const [orders_partial_payment_data] = await connection.query(
//       `SELECT op.*
//       FROM orders_payment AS op
//       INNER JOIN (
//           SELECT id
//           FROM orders
//           WHERE fooder_id = ? AND creation_date BETWEEN ? and ?
//           AND payment_status = 3 AND is_cancelled = 0
//       ) AS ot ON op.order_id = ot.id;`,
//       [req.staff.fooder_id, timestampOpen, timestampClose]
//     );
//     // console.log(orders_partial_payment_data)
//     // console.log("orders_partial_payment_data")






//     orders_partial_payment_data.forEach(order => {
//       totalOfAllTotals = parseFloat(order.paid_amount) + parseFloat(totalOfAllTotals)
//       // console.log("orders_partial_payment_data")
//       // console.log(order.paid_amount)
//     });



//     const [orders_dine_in_partial_payment_data] = await connection.query(
//       `SELECT op.*
//       FROM orders_payment AS op
//       INNER JOIN (
//           SELECT id
//           FROM orders
//           WHERE fooder_id = ? AND creation_date BETWEEN ? and ?
//           AND  payment_status = 3 AND order_type = 'dine_in' AND is_cancelled = 0
//       ) AS ot ON op.order_id = ot.id;`,
//       [req.staff.fooder_id, timestampOpen, timestampClose]
//     );
//     let temp = 0
//     orders_dine_in_partial_payment_data.forEach(order => {
//       temp = parseFloat(order.paid_amount) + parseFloat(temp)
//     });

//     if (modifiedOrderTypeTotals.dine_in) {
//       modifiedOrderTypeTotals.dine_in.total = parseFloat(modifiedOrderTypeTotals.dine_in.total) + temp

//     }
//     else {
//       modifiedOrderTypeTotals.dine_in = {
//         subtotal: "0.00",
//         discount: "0.00",
//         total: temp,
//         serviceCharge: "0.00",
//         tax: "0.00"
//       }
//     }



//     const [orders_take_away_partial_payment_data] = await connection.query(
//       `SELECT op.*
//       FROM orders_payment AS op
//       INNER JOIN (
//           SELECT id
//           FROM orders
//           WHERE fooder_id = ? AND creation_date BETWEEN ? and ?
//           AND  payment_status = 3 AND order_type = 'take_away' AND is_cancelled = 0
//       ) AS ot ON op.order_id = ot.id;`,
//       [req.staff.fooder_id, timestampOpen, timestampClose]
//     );
//     temp = 0
//     orders_take_away_partial_payment_data.forEach(order => {
//       temp = parseFloat(order.paid_amount) + parseFloat(temp)
//     });

//     if (modifiedOrderTypeTotals.take_away) {
//       modifiedOrderTypeTotals.take_away.total = parseFloat(modifiedOrderTypeTotals.take_away.total) + temp

//     } else {
//       modifiedOrderTypeTotals.take_away = {

//         subtotal: "0.00",
//         discount: "0.00",
//         total: temp,
//         serviceCharge: "0.00",
//         tax: "0.00"
//       }
//     }

//     const [orders_delivery_partial_payment_data] = await connection.query(
//       `SELECT op.*
//       FROM orders_payment AS op
//       INNER JOIN (
//           SELECT id
//           FROM orders
//           WHERE fooder_id = ? AND creation_date BETWEEN ? and ?
//           AND  payment_status = 3 AND order_type = 'delivery' AND is_cancelled = 0
//       ) AS ot ON op.order_id = ot.id;`,
//       [req.staff.fooder_id, timestampOpen, timestampClose]
//     );
//     temp = 0
//     orders_delivery_partial_payment_data.forEach(order => {
//       temp = parseFloat(order.paid_amount) + parseFloat(temp)
//     });

//     if (modifiedOrderTypeTotals.delivery) {
//       modifiedOrderTypeTotals.delivery.total = parseFloat(modifiedOrderTypeTotals.delivery.total) + temp

//     } else {
//       modifiedOrderTypeTotals.delivery = {

//         subtotal: "0.00",
//         discount: "0.00",
//         total: temp,
//         serviceCharge: "0.00",
//         tax: "0.00"
//       }
//     }



//     const [deliveryRowCount] = await connection.query(
//       `SELECT COUNT(*) AS rowCount FROM orders WHERE fooder_id = ? AND creation_date BETWEEN ? and ? AND payment_status IN (1, 3) AND order_type = 'delivery' AND is_cancelled = 0`,
//       [req.staff.fooder_id, timestampOpen, timestampClose]
//     );
//     modifiedOrderTypeCounts.delivery = deliveryRowCount[0].rowCount


//     const [dine_inRowCount] = await connection.query(
//       `SELECT COUNT(*) AS rowCount FROM orders WHERE fooder_id = ? AND creation_date BETWEEN ? and ? AND payment_status IN (1, 3) AND order_type = 'dine_in' AND is_cancelled = 0`,
//       [req.staff.fooder_id, timestampOpen, timestampClose]
//     );
//     modifiedOrderTypeCounts.dine_in = dine_inRowCount[0].rowCount

//     const [take_awayRowCount] = await connection.query(
//       `SELECT COUNT(*) AS rowCount FROM orders WHERE fooder_id = ? AND creation_date BETWEEN ? and ? AND payment_status IN (1, 3) AND order_type = 'take_away' AND is_cancelled = 0`,
//       [req.staff.fooder_id, timestampOpen, timestampClose]
//     );
//     modifiedOrderTypeCounts.take_away = take_awayRowCount[0].rowCount

//     const [RowCount] = await connection.query(
//       `SELECT COUNT(*) AS rowCount FROM orders WHERE fooder_id = ? AND creation_date BETWEEN ? and ? AND payment_status IN (1, 3) AND is_cancelled = 0`,
//       [req.staff.fooder_id, timestampOpen, timestampClose]
//     );



//     //***********************************************************************Sales by order type End****************************************************************************************************/



//     const [NoOfPersonServed] = await connection.query(`select SUM(no_of_eaters) AS total from orders where fooder_id = ? and creation_date BETWEEN ? and ? AND  payment_status IN (1, 3) and status IN (1, 2, 3) and is_cancelled = 0`, [
//       req.staff.fooder_id,
//       timestampOpen,
//       timestampClose,
//     ]);

//     // const [totalRoundOffAmount] = await connection.query(`select SUM(round_up_amount) AS total from orders where fooder_id = ? and creation_date BETWEEN ? and ? AND  payment_status IN (1, 3) and status IN (1, 2, 3) and is_cancelled = 0`, [
//     //   req.staff.fooder_id,
//     //   timestampOpen,
//     //   timestampClose,
//     // ]);
//     // totalOfAllTotals += totalRoundOffAmount[0].total
//     // totalOfAllTotals = parseFloat(paymentType.card)  + parseFloat(paymentType.cash)  + parseFloat(paymentType.upi) + parseFloat(paymentType.neft)
//     // console.log(parseFloat(paymentType.card).toFixed(2) + parseFloat(paymentType.cash).toFixed(2) + parseFloat(paymentType.upi).toFixed(2) + parseFloat(paymentType.neft).toFixed(2)  )

//     let average_transation = (parseFloat(totalOfAllTotals) / parseFloat(RowCount[0].rowCount)).toFixed(2)

//     return res.status(200).send({
//       status: "success",
//       salesByOrderType: modifiedOrderTypeTotals,
//       totalOfAllTotals: parseFloat(totalOfAllTotals).toFixed(2),
//       paymentType: paymentType,
//       // average_transation: ave_tran,
//       average_transation: average_transation !== 'NaN' ? average_transation : 0,

//       // totalEaters,
//       totalEaters: NoOfPersonServed[0].total,
//       menuTotalsArray,
//       orderTypeCounts: modifiedOrderTypeCounts,
//       // totalTransaction: totalcount,
//       totalTransaction: RowCount[0].rowCount,

//       currency_symbol: config.currency_symbol,
//       totalAquireCustomerCount,
//     });
//   } catch (error) {
//     console.error("Error:", error);
//     if (connection) {
//       connection.release();
//     }
//     return res.status(500).json({
//       message: "Internal server error",
//       errors: error.toString(),
//     });
//   }
// };


exports.getCustomisedSalesReport = async (req, res) => {

  const connection = await db.getConnection();
  let start_date1 = req.query.start_date;
  let start_date2 = req.query.end_date;

  let get_payment_mode = req.query.payment_mode;
  let get_order_mode = req.query.order_mode;
  let get_payment_status = req.query.payment_status;



  // const openTime = req.staff.open_time;
  // const closeTime = req.staff.close_time;

  // // console.log("start_date", start_date1);
  // // console.log("openTime", openTime);
  // // console.log("closeTime", closeTime);

  // // Convert time strings to Date objects for comparison
  // const openDateTime = new Date("2000-01-01T" + openTime + "-04:00");
  // const closeDateTime = new Date("2000-01-01T" + closeTime + "-04:00");

  // //   console.log("openDateTime", openDateTime);
  // //   console.log("closeDateTime", closeDateTime);

  // // If close time is earlier than open time, add one day to start_date
  // if (closeDateTime < openDateTime) {
  //   const nextDay = new Date(
  //     new Date(start_date1).getTime() + 24 * 60 * 60 * 1000
  //   );
  //   start_date2 = nextDay.toISOString().slice(0, 10); // Update start_date
  // }

  // //    console.log("nextday", start_date2);

  // // Combine date and time strings for open time
  // // const combinedOpenDateTimeString = start_date1 + "T" + openTime;
  // const combinedOpenDateTimeString = start_date1;


  // // Create a new Date object with the combined date and time for open time
  // const combinedDateTimeOpen = new Date(combinedOpenDateTimeString + "+05:30"); // +05:30 represents the Indian Standard Time (IST)

  // // Combine date and time strings for close time
  // // const combinedCloseDateTimeString = start_date2 + "T" + closeTime;
  // const combinedCloseDateTimeString = start_date2;


  // // Create a new Date object with the combined date and time for close time
  // const combinedDateTimeClose = new Date(
  //   combinedCloseDateTimeString + "+05:30"
  // ); // +05:30 represents the Indian Standard Time (IST)

  // // Get the timestamps (in milliseconds since the Unix Epoch)
  // const timestampOpen = combinedDateTimeOpen.getTime() / 1000;
  // const timestampClose = combinedDateTimeClose.getTime() / 1000;

  // //    console.log("timestampOpen:", timestampOpen);
  // //    console.log("timestampClose:", timestampClose);


  const combinedOpenDateTimeString = start_date1;
  const combinedDateTimeOpen = new Date(combinedOpenDateTimeString + "+05:30");

  const combinedCloseDateTimeString = start_date2;
  const combinedDateTimeClose = new Date(combinedCloseDateTimeString + "+05:30");

  const timestampOpen = combinedDateTimeOpen.getTime() / 1000;
  const timestampClose = combinedDateTimeClose.getTime() / 1000;




  try {
    const orderTypeTotals = {};
    const orderTypeCounts = {};
    const getReportResultQuery = `select id, order_date,status,payment_status, creation_date, order_number_qrcode,order_type, service_charge_details,tax_details,discount_type,discount_rate,round_up_amount, payment_type,no_of_eaters from orders where ${get_order_mode !== 'all' ? `order_type = '${get_order_mode}'` : '1 = 1'} and fooder_id = ? and creation_date BETWEEN ? and ? and payment_status = 1 and status IN (1, 2, 3) and is_cancelled = 0 
 ORDER BY id DESC`;

    // console.log("openTimeUnix",openTimeUnix);
    // console.log("closeTimeUnix",closeTimeUnix);
    // console.log("Executing query:", getReportResultQuery);

    const [getReportResult] = await connection.query(getReportResultQuery, [
      req.staff.fooder_id,
      timestampOpen,
      timestampClose,
    ]);
    // console.log("getReportResultQuery", getReportResultQuery);eater_phonenumber no_of_eaters

    const [[{ unique_eater_count: totalAquireCustomerCount }]] = await connection.query(
      `select  COUNT(DISTINCT eater_phonenumber) AS unique_eater_count from orders where ${get_order_mode !== 'all' ? `order_type = '${get_order_mode}'` : '1 = 1'} and fooder_id = ? and creation_date BETWEEN ? and ? AND ${get_payment_status === 'all' ? `(payment_status IN (1, 3))` : get_payment_status === '1' ? `(payment_status = 1)` : `(payment_status = 3)`} and status IN (1, 2, 3) and is_cancelled = 0 AND eater_phonenumber != ''
 ORDER BY id DESC`,
      [req.staff.fooder_id, timestampOpen, timestampClose]
    );
    // console.log("totalAquireCustomerCount", totalAquireCustomerCount);

    const [getTotalCount] = await connection.query(
      `select COUNT(*) AS total_orders from orders where ${get_order_mode !== 'all' ? `order_type = '${get_order_mode}'` : '1 = 1'} and fooder_id = ? and creation_date BETWEEN ? and ? and payment_status = 1 and status IN (1, 2, 3) and is_cancelled = 0 ORDER BY id DESC`,
      [req.staff.fooder_id, timestampOpen, timestampClose]
    );
    const totalcount = getTotalCount[0].total_orders;

    //console.log("getReportResultQuery", getReportResult);
    // if (getReportResult.length === 0) {
    //   const [getReportResultTotalLen] = await connection.query(`select COUNT(*) AS total_orders from orders where ${get_order_mode !== 'all' ? `order_type = '${get_order_mode}'` : '1 = 1'} and fooder_id = ? and creation_date BETWEEN ? and ? AND ${get_payment_status === 'all' ? `(payment_status IN (1, 3))` : get_payment_status === '1' ? `(payment_status = 1)` : `(payment_status = 3)`} and status IN (1, 2, 3) and is_cancelled = 0`, [
    //     req.staff.fooder_id,
    //     timestampOpen,
    //     timestampClose,
    //   ]);
    //   if(getReportResultTotalLen[0].total_orders === 0){
    //     connection.release();
    //     return res
    //       .status(200)
    //       .send({ status: "success", message: "Data Not Available.." });
    //   }
    // }

    const [getReportResultTotalLen] = await connection.query(`select COUNT(*) AS total_orders from orders where ${get_order_mode !== 'all' ? `order_type = '${get_order_mode}'` : '1 = 1'} and fooder_id = ? and creation_date BETWEEN ? and ? AND ${get_payment_status === 'all' ? `(payment_status IN (1, 3))` : get_payment_status === '1' ? `(payment_status = 1)` : `(payment_status = 3)`} and status IN (1, 2, 3) and is_cancelled = 0`, [
      req.staff.fooder_id,
      timestampOpen,
      timestampClose,
    ]);

    if (getReportResultTotalLen[0].total_orders === 0) {
      connection.release();
      return res
        .status(200)
        .send({ status: "success", message: "Data Not Available.." });
    }
    // Initialize variables to store totals
    let totalSubtotal = 0;
    let totalDiscount = 0;
    let totalTotal = 0;
    let totalServiceCharge = 0;
    let totalTax = 0;
    let totalEaters = 0;



    var paymentType = {
      card: "0.00",
      cash: "0.00",
      upi: "0.00",
      neft: "0.00",
      zomato: "0.00",
      swiggy: "0.00",
      dineout: "0.00",

    };
    // if (get_payment_mode == 'card') {
    //   paymentType = {
    //     card: "0.00",
    //   };
    // }
    // if (get_payment_mode == 'cash') {
    //   paymentType = {
    //     cash: "0.00",
    //   };
    // }
    // if (get_payment_mode == 'upi') {
    //   paymentType = {
    //     upi: "0.00",
    //   };
    // }
    // if (get_payment_mode == 'neft') {
    //   paymentType = {
    //     neft: "0.00",
    //   };
    // }
    //***********************************************************************Sales by order type Start***********************************************************************************************/

    const modifiedData = await Promise.all(
      getReportResult.map(async (order) => {
        order.creation_date_formatted = formatUnixTimestamp(
          order.creation_date
        );
        order.order_type = order.order_type.replace(/_/g, " ");
        //   order.order_type =
        //     order.order_type.charAt(0).toUpperCase() +
        //     order.order_type.slice(1);
        orderTypeCounts[order.order_type] =
          (orderTypeCounts[order.order_type] || 0) + 1;

        const orderItems = await fetchOrderItemsData(
          req.staff.fooder_id,
          order.id,
          connection
        );
        //console.log("orderItems", orderItems);
        // const subTotal = orderItems.reduce(
        //   (total, item) =>
        //     total +
        //     (item.product_proprice
        //       ? item.product_proprice
        //       : item.product_price) *
        //     item.quantity,
        //   0
        // );

        // //console.log("subTotal===============?????", subTotal);

        // //////////////////////////////Total Caculation///////////////////////////
        // let discountAmount = 0;
        // let discountAmt = 0;

        // if (
        //   order.discount_type === 0 &&
        //   !isNaN(parseFloat(order.discount_rate)) &&
        //   isFinite(order.discount_rate)
        // ) {
        //   discountAmt = (subTotal * order.discount_rate) / 100;
        //   discountAmount = subTotal - (subTotal * order.discount_rate) / 100;
        // } else if (
        //   order.discount_type === 1 &&
        //   !isNaN(parseFloat(order.discount_rate)) &&
        //   isFinite(order.discount_rate)
        // ) {
        //   discountAmt = order.discount_rate;
        //   discountAmount = subTotal - order.discount_rate;
        // } else {
        //   discountAmount = subTotal;
        // }

        // // console.log("discountAmount===========>", discountAmount);

        // // Initialize variables to store the total amounts for this order
        // let totalServiceCharge = 0;
        // let totalTax = 0;
        // let serviceCharge = 0;

        // // Extract service charge percentage and add it to the total
        // const serviceChargeDetails = JSON.parse(order.service_charge_details);
        // if (serviceChargeDetails.percentage) {
        //   const serviceChargePercentage = parseFloat(
        //     serviceChargeDetails.percentage
        //   );
        //   serviceCharge = (discountAmount * serviceChargePercentage) / 100;

        //   totalServiceCharge =
        //     discountAmount + (discountAmount * serviceChargePercentage) / 100;
        // } else {
        //   totalServiceCharge = discountAmount;
        // }
        // // Extract tax details and add them to the total
        // const taxDetails = JSON.parse(order.tax_details);
        // // console.log("limit=====>", taxDetails);
        // taxDetails.forEach((tax) => {
        //   const taxPercentage = parseFloat(tax.percentage);
        //   totalTax += (totalServiceCharge * taxPercentage) / 100;
        //   // console.log("taxPercentage========>", taxPercentage);
        // });
        // // console.log("totalTax=========>", totalTax);

        // // Calculate the grand total for this order
        // const grandTotal = totalServiceCharge + totalTax;
        // // console.log("grandTotal===========>", grandTotal);

        // // Add the grandTotal to this order
        // order.subtotal = parseFloat(subTotal).toFixed(2);
        // order.discount = parseFloat(discountAmt).toFixed(2);
        // order.total = parseFloat(grandTotal).toFixed(2);
        // order.service_charge = parseFloat(serviceCharge).toFixed(2);
        // order.tax = parseFloat(totalTax).toFixed(2);

        //console.log("order.service_charge=========>",order.service_charge);
        //console.log("order.tax=========>",order.tax);
        ////////////////////////////////////////////////////////////////////////
        // Add status mapping










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


        //  for flate amount discount
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
            // tempDiscount += (((i.quantity) * withOutTaxPrice) - parseFloat(order.discount_rate))
            // tempDiscountRow = (((i.quantity) * withOutTaxPrice) - parseFloat(order.discount_rate))

            // tempDiscount += ((i.quantity * withOutTaxPrice) - ((i.quantity * withOutTaxPrice) - parseFloat(order.discount_rate))) * i.quantity
            // tempDiscountRow = ((i.quantity * withOutTaxPrice) - ((i.quantity * withOutTaxPrice) - parseFloat(order.discount_rate))) * i.quantity
            tempDiscount += (((i.quantity) * withOutTaxPrice) * parseFloat(discountRateForAmount)) / 100
            tempDiscountRow = (((i.quantity) * withOutTaxPrice) * parseFloat(discountRateForAmount)) / 100
          }


          tempServicCharge += ((((i.quantity) * withOutTaxPrice) - tempDiscountRow) * parseFloat(serviceChargeDetails.percentage)) / 100
          tempServicChargeRow = ((((i.quantity) * withOutTaxPrice) - tempDiscountRow) * parseFloat(serviceChargeDetails.percentage)) / 100

          tempTax += ((((i.quantity) * withOutTaxPrice) + tempServicChargeRow - tempDiscountRow) * parseFloat(i.item_tax_percent)) / 100
        })



        var grandTotal = 0

        if (order.order_type != "dine_in") {
          grandTotal = (parseFloat(subTotal + tempServicCharge - tempDiscount + tempTax + order.round_up_amount) + parseFloat(packingCharges)).toFixed(2)
          order.packaging_fee = parseFloat(packingCharges).toFixed(2);
        } else {
          grandTotal = (subTotal + tempServicCharge - tempDiscount + tempTax + order.round_up_amount).toFixed(2);
          order.packaging_fee = parseFloat(0).toFixed(2);
        }



        order.subtotal = parseFloat(subTotal).toFixed(2);
        order.discount = parseFloat(tempDiscount).toFixed(2);
        order.total = parseFloat(grandTotal).toFixed(2);
        order.service_charge = parseFloat(tempServicCharge).toFixed(2);
        order.tax = parseFloat(tempTax).toFixed(2);





















        if (order.status === 0) {
          order.order_status_lable = "Pending";
        } else if (order.status === 1) {
          order.order_status_lable = "Accept and prepare order";
        } else if (order.status === 2) {
          order.order_status_lable = "Order Ready";
        } else if (order.status === 3) {
          order.order_status_lable = "Delivered and paid";
        } else if (order.status === 4) {
          order.order_status_lable = "Reject";
        }
        totalEaters += parseInt(order.no_of_eaters);

        const { payment_type } = order;
        if (paymentType.hasOwnProperty(payment_type)) {
          paymentType[payment_type] = (
            parseFloat(paymentType[payment_type]) + parseFloat(order.total)
          ).toFixed(2);
        }

        return order;
      })
    );



    const [orders_payment_data] = await connection.query(
      `SELECT op.*
      FROM orders_payment AS op
      INNER JOIN (
          SELECT id
          FROM orders
          WHERE ${get_order_mode !== 'all' ? `order_type = '${get_order_mode}'` : '1 = 1'} AND ${get_payment_status === 'all' ? `(payment_status IN (1, 3))` : get_payment_status === '1' ? `(payment_status = 1)` : `(payment_status = 3)`} AND is_cancelled = 0 AND fooder_id = ? AND creation_date BETWEEN ? and ? 
      ) AS ot ON op.order_id = ot.id;`,
      [req.staff.fooder_id, timestampOpen, timestampClose]
    );

    orders_payment_data.forEach(order => {
      // Your code here to process each order in orders_payment_data
      // console.log(order); // Example of processing, you can replace this with your logic
      const { payment_type } = order;
      if (paymentType.hasOwnProperty(payment_type)) {
        paymentType[payment_type] = (
          parseFloat(paymentType[payment_type]) + parseFloat(order.paid_amount)
        ).toFixed(2);
      }
    });

    // console.log("res")
    // console.log(orders_payment_data)

    //Calculate total of all payment types
    let totalOfAllPaymentTypes = 0;
    Object.values(paymentType).forEach((value) => {
      totalOfAllPaymentTypes += parseFloat(value);
    });
    totalOfAllPaymentTypes = totalOfAllPaymentTypes.toFixed(2);

    modifiedData.forEach((order) => {
      totalSubtotal += parseFloat(order.subtotal);
      totalDiscount += parseFloat(order.discount);
      totalTotal += parseFloat(order.total);
      totalServiceCharge += parseFloat(order.service_charge);
      totalTax += parseFloat(order.tax);

      // Check if the order_type is already in the orderTypeTotals object
      if (!orderTypeTotals[order.order_type]) {
        // If not, initialize the totals for this order_type
        orderTypeTotals[order.order_type] = {
          subtotal: 0,
          discount: 0,
          total: 0,
          serviceCharge: 0,
          tax: 0,
        };
      }

      orderTypeTotals[order.order_type].subtotal = (
        parseFloat(orderTypeTotals[order.order_type].subtotal) +
        parseFloat(order.subtotal)
      ).toFixed(2);
      orderTypeTotals[order.order_type].discount = (
        parseFloat(orderTypeTotals[order.order_type].discount) +
        parseFloat(order.discount)
      ).toFixed(2);
      orderTypeTotals[order.order_type].total = (
        parseFloat(orderTypeTotals[order.order_type].total) +
        parseFloat(order.total)
      ).toFixed(2);
      orderTypeTotals[order.order_type].serviceCharge = (
        parseFloat(orderTypeTotals[order.order_type].serviceCharge) +
        parseFloat(order.service_charge)
      ).toFixed(2);
      orderTypeTotals[order.order_type].tax = (
        parseFloat(orderTypeTotals[order.order_type].tax) +
        parseFloat(order.tax)
      ).toFixed(2);
    });
    // Calculate total of all totals
    let totalOfAllTotals = 0;
    Object.values(orderTypeTotals).forEach((orderTypeTotal) => {
      totalOfAllTotals += parseFloat(orderTypeTotal.total);
    });
    // totalOfAllTotals = totalOfAllTotals.toFixed(2);

    const ave_tran = (
      parseFloat(totalOfAllTotals) / parseFloat(totalcount)
    ).toFixed(2);

    const modifiedOrderTypeTotals = {};
    for (const [key, value] of Object.entries(orderTypeTotals)) {
      modifiedOrderTypeTotals[key.replace(/\s+/g, "_")] = value;
    }
    const modifiedOrderTypeCounts = {};
    for (const [key, value] of Object.entries(orderTypeCounts)) {
      modifiedOrderTypeCounts[key.replace(/\s+/g, "_")] = value;
    }




    // Calculate totals based on menu_id
    const dataOfmenu = await connection.query(
      `SELECT oi.menu_id, fm.name, oi.product_proprice, oi.product_price, oi.quantity, o.service_charge_details, o.tax_details, o.discount_type, o.discount_rate  
      FROM order_items oi 
      JOIN orders o ON oi.order_id = o.id 
      JOIN fooders_menus fm ON oi.menu_id = fm.id
      WHERE oi.fooder_id = ? AND o.creation_date BETWEEN ? and ? AND ${get_payment_status === 'all' ? `(o.payment_status IN (1, 3))` : get_payment_status === '1' ? `(o.payment_status = 1)` : `(o.payment_status = 3)`} = 1 AND o.status IN (1, 2, 3) AND o.is_cancelled = 0 AND ${get_order_mode !== 'all' ? `order_type = '${get_order_mode}'` : '1 = 1'} `,
      [req.staff.fooder_id, timestampOpen, timestampClose]
    );

    const menuTotals = {};

    dataOfmenu[0].forEach((orderItem) => {
      const {
        menu_id,
        product_proprice,
        product_price,
        quantity,
        service_charge_details,
        tax_details,
        discount_type,
        discount_rate,
      } = orderItem;

      const subTotal =
        (product_proprice ? product_proprice : product_price) * quantity;
      let discountAmount = 0;

      if (
        discount_type === 0 &&
        !isNaN(parseFloat(discount_rate)) &&
        isFinite(discount_rate)
      ) {
        discountAmount = (subTotal * discount_rate) / 100;
      } else if (
        discount_type === 1 &&
        !isNaN(parseFloat(discount_rate)) &&
        isFinite(discount_rate)
      ) {
        discountAmount = discount_rate;
      }

      let serviceChargeTotal = 0;
      let taxTotal = 0;
      let serviceChargeItem = 0;

      const serviceChargeDetails = JSON.parse(service_charge_details);
      if (serviceChargeDetails.percentage) {
        const serviceChargePercentage = parseFloat(
          serviceChargeDetails.percentage
        );
        serviceChargeItem =
          (subTotal - discountAmount) * (serviceChargePercentage / 100);
        serviceChargeTotal = subTotal - discountAmount + serviceChargeItem;
      } else {
        serviceChargeTotal = subTotal - discountAmount;
      }

      const taxDetails = JSON.parse(tax_details);
      taxDetails.forEach((tax) => {
        const taxPercentage = parseFloat(tax.percentage);
        taxTotal += (serviceChargeTotal * taxPercentage) / 100;
      });

      const grandTotal = serviceChargeTotal + taxTotal;

      if (!menuTotals[menu_id]) {
        menuTotals[menu_id] = {
          subtotal: 0,
          discount: 0,
          total: 0,
          serviceCharge: 0,
          tax: 0,
        };
      }

      menuTotals[menu_id].subtotal += subTotal;
      menuTotals[menu_id].discount += discountAmount;
      menuTotals[menu_id].total += subTotal;
      menuTotals[menu_id].serviceCharge += serviceChargeTotal;
      menuTotals[menu_id].tax += taxTotal;
    });

    // Calculate total of all totals
    let totalOfAllTotals2 = 0;
    let totalServiceChargeTotal = 0;
    let totalTaxTotal = 0;
    Object.values(menuTotals).forEach((menuTotal) => {
      totalOfAllTotals2 += parseFloat(menuTotal.total);
    });
    totalOfAllTotals2 = totalOfAllTotals2.toFixed(2);

    const menuTotalsArray = [];

    // Iterate through menuTotals to construct the new array
    for (const [menuId, totals] of Object.entries(menuTotals)) {
      // Fetch menu_name corresponding to menu_id
      const [menuData] = await connection.query(
        `SELECT name FROM fooders_menus WHERE id = ?`,
        [menuId]
      );

      const menuName = menuData[0].name;

      // Push an object containing menu_id, menu_name, and total to menuTotalsArray
      menuTotalsArray.push({
        menu_id: menuId,
        menu_name: menuName,
        total: parseFloat(totals.total).toFixed(2),
      });
    }

    if (get_payment_status === 'all') {
      const [orders_partial_payment_data] = await connection.query(
        `SELECT op.*
        FROM orders_payment AS op
        INNER JOIN (
            SELECT id
            FROM orders
            WHERE fooder_id = ? AND creation_date BETWEEN ? and ?
            AND ${get_order_mode !== 'all' ? `order_type = '${get_order_mode}'` : '1 = 1'} AND is_cancelled = 0 AND  payment_status = 3 
        ) AS ot ON op.order_id = ot.id;`,
        [req.staff.fooder_id, timestampOpen, timestampClose]
      );
      orders_partial_payment_data.forEach(order => {
        totalOfAllTotals = parseFloat(order.paid_amount) + parseFloat(totalOfAllTotals)
      });

    } else if (get_payment_status === '3') {
      const [orders_partial_payment_data] = await connection.query(
        `SELECT op.*
        FROM orders_payment AS op
        INNER JOIN (
            SELECT id
            FROM orders
            WHERE fooder_id = ? AND creation_date BETWEEN ? and ?
            AND ${get_order_mode !== 'all' ? `order_type = '${get_order_mode}'` : '1 = 1'} AND is_cancelled = 0 AND  payment_status = 3 
        ) AS ot ON op.order_id = ot.id;`,
        [req.staff.fooder_id, timestampOpen, timestampClose]
      );
      totalOfAllTotals = 0;
      orders_partial_payment_data.forEach(order => {
        totalOfAllTotals = parseFloat(order.paid_amount) + parseFloat(totalOfAllTotals)
      });

    }




    const [orders_dine_in_partial_payment_data] = await connection.query(
      `SELECT op.*
      FROM orders_payment AS op
      INNER JOIN (
          SELECT id
          FROM orders
          WHERE fooder_id = ? AND creation_date BETWEEN ? and ?
          AND ${get_payment_status === 'all' ? `(payment_status IN (1, 3))` : get_payment_status === '1' ? `(payment_status = 1)` : `(payment_status = 3)`} AND is_cancelled = 0 AND order_type = 'dine_in'
      ) AS ot ON op.order_id = ot.id;`,
      [req.staff.fooder_id, timestampOpen, timestampClose]
    );
    let temp = 0
    orders_dine_in_partial_payment_data.forEach(order => {
      temp = parseFloat(order.paid_amount) + parseFloat(temp)
    });

    if (modifiedOrderTypeTotals.dine_in) {
      // modifiedOrderTypeTotals.dine_in.total = parseFloat(modifiedOrderTypeTotals.dine_in.total) + temp
      modifiedOrderTypeTotals.dine_in.total = temp.toFixed(2)
    }
    else {
      modifiedOrderTypeTotals.dine_in = {
        subtotal: "0.00",
        discount: "0.00",
        total: temp.toFixed(2),
        serviceCharge: "0.00",
        tax: "0.00"
      }
    }



    const [orders_take_away_partial_payment_data] = await connection.query(
      `SELECT op.*
      FROM orders_payment AS op
      INNER JOIN (
          SELECT id
          FROM orders
          WHERE fooder_id = ? AND creation_date BETWEEN ? and ?
          AND ${get_payment_status === 'all' ? `(payment_status IN (1, 3))` : get_payment_status === '1' ? `(payment_status = 1)` : `(payment_status = 3)`} AND is_cancelled = 0 AND order_type = 'take_away'
      ) AS ot ON op.order_id = ot.id;`,
      [req.staff.fooder_id, timestampOpen, timestampClose]
    );
    temp = 0
    orders_take_away_partial_payment_data.forEach(order => {
      temp = parseFloat(order.paid_amount) + parseFloat(temp)
    });

    if (modifiedOrderTypeTotals.take_away) {
      // modifiedOrderTypeTotals.take_away.total = parseFloat(modifiedOrderTypeTotals.take_away.total) + temp
      modifiedOrderTypeTotals.take_away.total = temp.toFixed(2)


    } else {
      modifiedOrderTypeTotals.take_away = {

        subtotal: "0.00",
        discount: "0.00",
        total: temp.toFixed(2),
        serviceCharge: "0.00",
        tax: "0.00"
      }
    }

    const [orders_delivery_partial_payment_data] = await connection.query(
      `SELECT op.*
      FROM orders_payment AS op
      INNER JOIN (
          SELECT id
          FROM orders
          WHERE fooder_id = ? AND creation_date BETWEEN ? and ?
          AND ${get_payment_status === 'all' ? `(payment_status IN (1, 3))` : get_payment_status === '1' ? `(payment_status = 1)` : `(payment_status = 3)`} AND is_cancelled = 0 AND order_type = 'delivery'
      ) AS ot ON op.order_id = ot.id;`,
      [req.staff.fooder_id, timestampOpen, timestampClose]
    );
    temp = 0
    orders_delivery_partial_payment_data.forEach(order => {
      temp = parseFloat(order.paid_amount) + parseFloat(temp)
    });

    if (modifiedOrderTypeTotals.delivery) {
      // modifiedOrderTypeTotals.delivery.total = parseFloat(modifiedOrderTypeTotals.delivery.total) + temp
      modifiedOrderTypeTotals.delivery.total = temp.toFixed(2)


    } else {
      modifiedOrderTypeTotals.delivery = {

        subtotal: "0.00",
        discount: "0.00",
        total: temp.toFixed(2),
        serviceCharge: "0.00",
        tax: "0.00"
      }
    }

    // console.log(modifiedOrderTypeTotals)
    // console.log(modifiedOrderTypeCounts)


    const [deliveryRowCount] = await connection.query(
      `SELECT COUNT(*) AS rowCount FROM orders WHERE fooder_id = ? AND creation_date BETWEEN ? and ? AND ${get_payment_status === 'all' ? `(payment_status IN (1, 3))` : get_payment_status === '1' ? `(payment_status = 1)` : `(payment_status = 3)`} AND is_cancelled = 0 AND order_type = 'delivery'`,
      [req.staff.fooder_id, timestampOpen, timestampClose]
    );
    modifiedOrderTypeCounts.delivery = deliveryRowCount[0].rowCount


    const [dine_inRowCount] = await connection.query(
      `SELECT COUNT(*) AS rowCount FROM orders WHERE fooder_id = ? AND creation_date BETWEEN ? and ? AND ${get_payment_status === 'all' ? `(payment_status IN (1, 3))` : get_payment_status === '1' ? `(payment_status = 1)` : `(payment_status = 3)`} AND is_cancelled = 0 AND order_type = 'dine_in'`,
      [req.staff.fooder_id, timestampOpen, timestampClose]
    );
    modifiedOrderTypeCounts.dine_in = dine_inRowCount[0].rowCount

    const [take_awayRowCount] = await connection.query(
      `SELECT COUNT(*) AS rowCount FROM orders WHERE fooder_id = ? AND creation_date BETWEEN ? and ? AND ${get_payment_status === 'all' ? `(payment_status IN (1, 3))` : get_payment_status === '1' ? `(payment_status = 1)` : `(payment_status = 3)`} AND is_cancelled = 0 AND order_type = 'take_away'`,
      [req.staff.fooder_id, timestampOpen, timestampClose]
    );

    // const [take_awayRowCount] = await connection.query(
    //   `SELECT COUNT(*) AS rowCount FROM orders WHERE creation_date BETWEEN ? and ? AND ${get_payment_status === 'all' ? `(payment_status IN (1, 3))` : get_payment_status === '1' ? `(payment_status = 1)` : `(payment_status = 1)`} AND order_type = 'take_away'`,
    //   [timestampOpen, timestampClose]
    // );


    modifiedOrderTypeCounts.take_away = take_awayRowCount[0].rowCount

    const [RowCount] = await connection.query(
      `SELECT COUNT(*) AS rowCount FROM orders WHERE fooder_id = ? AND creation_date BETWEEN ? and ? AND ${get_payment_status === 'all' ? `(payment_status IN (1, 3))` : get_payment_status === '1' ? `(payment_status = 1)` : `(payment_status = 3)`} AND ${get_order_mode !== 'all' ? `order_type = '${get_order_mode}'` : '1 = 1'} AND is_cancelled = 0`,
      [req.staff.fooder_id, timestampOpen, timestampClose]
    );
    let row_count = RowCount[0].rowCount

    //***********************************************************************Sales by order type End****************************************************************************************************/


    const [NoOfPersonServed] = await connection.query(`select SUM(no_of_eaters) AS total from orders where  ${get_order_mode !== 'all' ? `order_type = '${get_order_mode}'` : '1 = 1'} AND is_cancelled = 0 and fooder_id = ? and creation_date BETWEEN ? and ? AND ${get_payment_status === 'all' ? `(payment_status IN (1, 3))` : get_payment_status === '1' ? `(payment_status = 1)` : `(payment_status = 3)`} and status IN (1, 2, 3) and is_cancelled = 0`, [
      req.staff.fooder_id,
      timestampOpen,
      timestampClose,
    ]);


    // const [totalRoundOffAmount] = await connection.query(`select SUM(round_up_amount) AS total from orders where  ${get_order_mode !== 'all' ? `order_type = '${get_order_mode}'` : '1 = 1'} AND is_cancelled = 0 and fooder_id = ? and creation_date BETWEEN ? and ? AND ${get_payment_status === 'all' ? `(payment_status IN (1, 3))` : get_payment_status === '1' ? `(payment_status = 1)` : `(payment_status = 3)`} and status IN (1, 2, 3) and is_cancelled = 0`, [
    //   req.staff.fooder_id,
    //   timestampOpen,
    //   timestampClose,
    // ]);
    // if (getReportResultTotalLen[0].total_orders === 0) {
    //   connection.release();
    //   return res
    //     .status(200)
    //     .send({ status: "success", message: "Data Not Available.." });
    // }
    // totalOfAllTotals += totalRoundOffAmount[0].total
    // totalOfAllTotals = parseFloat(paymentType.card)  + parseFloat(paymentType.cash)  + parseFloat(paymentType.upi) + parseFloat(paymentType.neft)

    let average_transation = (parseFloat(totalOfAllTotals) / parseFloat(RowCount[0].rowCount)).toFixed(2)

    return res.status(200).send({
      status: "success",
      salesByOrderType: modifiedOrderTypeTotals,
      totalOfAllTotals: totalOfAllTotals.toFixed(2),
      paymentType: paymentType,
      // average_transation: ave_tran !== 'NaN' ? ave_tran : 0,
      average_transation: average_transation !== 'NaN' ? average_transation : 0,

      // totalEaters,
      totalEaters: NoOfPersonServed[0].total,

      menuTotalsArray,
      orderTypeCounts: modifiedOrderTypeCounts,
      // totalTransaction: totalcount,
      totalTransaction: RowCount[0].rowCount,


      currency_symbol: config.currency_symbol,
      totalAquireCustomerCount,

      start_date: req.query.start_date,
      end_date: req.query.end_date,

      order_mode: req.query.order_mode,
      payment_status: req.query.payment_status,


    });
  } catch (error) {
    console.error("Error:", error);
    if (connection) {
      connection.release();
    }
    return res.status(500).json({
      message: "Internal server error",
      errors: error.toString(),
    });
  }
};


exports.dueAmountReport = async (req, res) => {
  const start_date = req.query.start_date;
  const end_date = req.query.end_date;
  const connection = await db.getConnection();

  try {
    const [getDueAmountQuery] = await connection.query(`SELECT o.id, o.order_date, o.status, o.payment_status, o.creation_date, o.order_number_qrcode, o.order_type, o.payment_type, op.paid_amount, op.payment_details FROM orders o LEFT JOIN orders_payment op ON o.id = op.order_id WHERE o.fooder_id = ? AND o.order_date >= ? AND o.order_date <= ? AND o.status IN (1, 2, 3) AND o.is_cancelled = 0  ORDER BY o.id DESC`, [req.staff.fooder_id, start_date, end_date]);

    let totalDueAmounts = {}; // Object to store total due amounts for each order ID

    // Loop through each order and calculate total due amount for each order
    getDueAmountQuery.forEach(order => {
      // Parse payment_details JSON string to an object
      const paymentDetails = JSON.parse(order.payment_details);

      // Check if payment status is 1 and payment_details object exists
      if (paymentDetails && paymentDetails.due) {
        const orderId = order.id.toString(); // Convert order ID to string for consistent key format
        if (!totalDueAmounts[orderId]) {
          totalDueAmounts[orderId] = 0; // Initialize total due amount for this order if not exists
        }
        totalDueAmounts[orderId] += parseFloat(paymentDetails.due); // Add due amount to total for this order
      }
    });

    // console.log("Total Due Amounts:", totalDueAmounts);

    return res.status(200).send({
      status: "success",
      //data: getDueAmountQuery,
      totalDueAmounts: totalDueAmounts,
    });

  } catch (error) {
    console.error("Error:", error);
    if (connection) {
      connection.release();
    }
    return res.status(500).json({
      message: "Internal server error",
      errors: error.toString(),
    });
  }
};

// exports.getSettledUnsettledReportDaily = async (req, res) => {
//   const connection = await db.getConnection();
//   let start_date1 = req.query.date;
//   let start_date2 = req.query.date;

//   const openTime = req.staff.open_time;
//   const closeTime = req.staff.close_time;

//   // console.log("start_date", start_date1);
//   // console.log("openTime", openTime);
//   // console.log("closeTime", closeTime);

//   // Convert time strings to Date objects for comparison
//   const openDateTime = new Date("2000-01-01T" + openTime + "-04:00");
//   const closeDateTime = new Date("2000-01-01T" + closeTime + "-04:00");

//   //   console.log("openDateTime", openDateTime);
//   //   console.log("closeDateTime", closeDateTime);

//   // If close time is earlier than open time, add one day to start_date
//   if (closeDateTime < openDateTime) {
//     const nextDay = new Date(
//       new Date(start_date1).getTime() + 24 * 60 * 60 * 1000
//     );
//     start_date2 = nextDay.toISOString().slice(0, 10); // Update start_date
//   }

//   //    console.log("nextday", start_date2);

//   // Combine date and time strings for open time
//   const combinedOpenDateTimeString = start_date1 + "T" + openTime;

//   // Create a new Date object with the combined date and time for open time
//   const combinedDateTimeOpen = new Date(combinedOpenDateTimeString + "+05:30"); // +05:30 represents the Indian Standard Time (IST)

//   // Combine date and time strings for close time
//   const combinedCloseDateTimeString = start_date2 + "T" + closeTime;

//   // Create a new Date object with the combined date and time for close time
//   const combinedDateTimeClose = new Date(
//     combinedCloseDateTimeString + "+05:30"
//   ); // +05:30 represents the Indian Standard Time (IST)

//   // Get the timestamps (in milliseconds since the Unix Epoch)
//   const timestampOpen = combinedDateTimeOpen.getTime() / 1000;
//   const timestampClose = combinedDateTimeClose.getTime() / 1000;

//   //    console.log("timestampOpen:", timestampOpen);
//   //    console.log("timestampClose:", timestampClose);

//   try {
//     const orderTypeTotals = {};
//     const orderTypeCounts = {};
//     const getReportResultQuery = `select id, order_date,status,payment_status, creation_date, order_number_qrcode,order_type, service_charge_details,round_up_amount,tax_details,discount_type,discount_rate,payment_type,no_of_eaters from orders where fooder_id = ? and creation_date BETWEEN ? and ? and payment_status = 0 and status IN (1, 2, 3) and is_cancelled = 0 
//  ORDER BY id DESC`;



//     const [getReportResult] = await connection.query(getReportResultQuery, [
//       req.staff.fooder_id,
//       timestampOpen,
//       timestampClose,
//     ]);





//     // Initialize variables to store totals
//     let totalSubtotal = 0;
//     let totalDiscount = 0;
//     let totalTotal = 0;
//     let totalServiceCharge = 0;
//     let totalTax = 0;

//     //***********************************************************************Sales by order type Start***********************************************************************************************/

//     const modifiedData = await Promise.all(
//       getReportResult.map(async (order) => {
//         order.creation_date_formatted = formatUnixTimestamp(
//           order.creation_date
//         );
//         order.order_type = order.order_type.replace(/_/g, " ");

//         orderTypeCounts[order.order_type] =
//           (orderTypeCounts[order.order_type] || 0) + 1;

//         const orderItems = await fetchOrderItemsData(
//           req.staff.fooder_id,
//           order.id,
//           connection
//         );




//         const serviceChargeDetails = JSON.parse(order.service_charge_details);
//         if (!serviceChargeDetails.percentage) {
//           serviceChargeDetails.percentage = 0
//         }

//         let withOutTaxPrice = 0
//         let subTotal = 0;
//         let tempDiscount = 0;
//         let tempDiscountRow = 0;

//         let tempServicCharge = 0;
//         let tempServicChargeRow = 0;

//         let tempTax = 0;


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

//             tempDiscount += (((i.quantity) * withOutTaxPrice) * parseFloat(discountRateForAmount)) / 100
//             tempDiscountRow = (((i.quantity) * withOutTaxPrice) * parseFloat(discountRateForAmount)) / 100
//           }


//           tempServicCharge += ((((i.quantity) * withOutTaxPrice) - tempDiscountRow) * parseFloat(serviceChargeDetails.percentage)) / 100
//           tempServicChargeRow = ((((i.quantity) * withOutTaxPrice) - tempDiscountRow) * parseFloat(serviceChargeDetails.percentage)) / 100



//           tempTax += ((((i.quantity) * withOutTaxPrice) + tempServicChargeRow - tempDiscountRow) * parseFloat(i.item_tax_percent)) / 100
//         })



//         var grandTotal = 0

//         if (order.order_type != "dine_in") {
//           grandTotal = (parseFloat(subTotal + tempServicCharge - tempDiscount + tempTax + order.round_up_amount) + parseFloat(packingCharges)).toFixed(2)
//           order.packaging_fee = parseFloat(packingCharges).toFixed(2);
//         } else {
//           grandTotal = (subTotal + tempServicCharge - tempDiscount + tempTax + order.round_up_amount).toFixed(2);
//           order.packaging_fee = parseFloat(0).toFixed(2);
//         }



//         order.subtotal = parseFloat(subTotal).toFixed(2);
//         order.discount = parseFloat(tempDiscount).toFixed(2);
//         order.total = parseFloat(grandTotal).toFixed(2);
//         order.service_charge = parseFloat(tempServicCharge).toFixed(2);
//         order.tax = parseFloat(tempTax).toFixed(2);




//         return order;
//       })
//     );



//     modifiedData.forEach((order) => {
//       totalSubtotal += parseFloat(order.subtotal);
//       totalDiscount += parseFloat(order.discount);
//       totalTotal += parseFloat(order.total);
//       totalServiceCharge += parseFloat(order.service_charge);
//       totalTax += parseFloat(order.tax);
//     })
















//     return res.status(200).send({
//       status: "success",
//       data: { unsettledAmount: totalTotal }
//     });
//   } catch (error) {
//     console.error("Error:", error);
//     if (connection) {
//       connection.release();
//     }
//     return res.status(500).json({
//       message: "Internal server error",
//       errors: error.toString(),
//     });
//   }
// };

exports.getOrderCopounReportDetails = async (req, res) => {
  //   const { start_date, end_date } = req.query;
  const start_date = req.query.start_date;
  const end_date = req.query.end_date;
  const order_mode = req.query.order_mode;
  const get_payment_status = req.query.payment_status;
  const coupon_code = req.query.coupon_code;


  const combinedOpenDateTimeString = start_date;

  const combinedDateTimeOpen = new Date(combinedOpenDateTimeString + "+05:30");
  const combinedCloseDateTimeString = end_date;


  const combinedDateTimeClose = new Date(
    combinedCloseDateTimeString + "+05:30"
  ); // +05:30 represents the Indian Standard Time (IST)

  // Get the timestamps (in milliseconds since the Unix Epoch)
  const timestampOpen = combinedDateTimeOpen.getTime() / 1000;
  const timestampClose = combinedDateTimeClose.getTime() / 1000;



  const connection = await db.getConnection();

  try {
    const orderTypeTotals = {};
    let totalDueAmount = 0; // Initialize total due amount
    if (order_mode) {
      // const [getSalesReportResult] = await connection.query(
      //   `select id, order_date,status,payment_status,coupon_code, creation_date, order_number_qrcode,order_type, service_charge_details,tax_details,discount_type,discount_rate, round_up_amount ,invoice_no from orders where fooder_id = ? AND coupon_code != "NULL" AND coupon_code != "" and creation_date BETWEEN ? and ? and ${get_payment_status === 'all' ? `(payment_status IN (0, 1, 2, 3))` : get_payment_status === '0' ? `(payment_status = 0)` : get_payment_status === '1' ? `(payment_status = 1)` : get_payment_status === '2' ? `(payment_status = 2)` : `(payment_status = 3)`} and status IN (1, 2, 3) and is_cancelled = 0 and order_type = ?  ORDER BY id DESC`,
      //   [req.staff.fooder_id, timestampOpen, timestampClose, order_mode]
      // );


 




      let couponCondition = ``;
      let queryParams = [req.staff.fooder_id, timestampOpen, timestampClose];

      if (coupon_code && coupon_code !== "all") {
        couponCondition = `AND coupon_code = ?`;
        queryParams.push(coupon_code);
      } else {
        couponCondition = `AND coupon_code != "NULL" AND coupon_code != ""`;
      }

      const [getSalesReportResult] = await connection.query(
        `SELECT id, order_date, status, payment_status, coupon_code, creation_date, order_number_qrcode, order_type, service_charge_details, tax_details, discount_type, discount_rate, round_up_amount ,invoice_no 
   FROM orders 
   WHERE fooder_id = ? 
  
   AND creation_date BETWEEN ? AND ? 
    ${couponCondition}
   AND ${get_payment_status === 'all'
          ? `(payment_status IN (0, 1, 2, 3))`
          : get_payment_status === '0'
            ? `(payment_status = 0)`
            : get_payment_status === '1'
              ? `(payment_status = 1)`
              : get_payment_status === '2'
                ? `(payment_status = 2)`
                : `(payment_status = 3)`
        }
   AND status IN (1, 2, 3) 
   AND is_cancelled = 0 
   AND order_type = ? 
   ORDER BY id DESC`,
        [...queryParams, order_mode]
      );


      







      // console.log(getSalesReportResult.length)
      // console.log("getSalesReportResult")

      if (getSalesReportResult.length === 0) {
        connection.release();

        return res
          .status(200)
          .send({ status: "success", message: "Data Not Available.." });
      }

      // Initialize variables to store totals
      let totalSubtotal = 0;
      let totalDiscount = 0;
      let totalTotal = 0;
      let totalServiceCharge = 0;
      let totalTax = 0;
      let totalPackingCharges = 0

      let totalCustomerDueAmount = 0;
      let totalCustomerPaidAmount = 0;
      let totalRoundUpAmount = 0



      const modifiedData = await Promise.all(
        getSalesReportResult.map(async (order) => {
          order.creation_date_formatted = formatUnixTimestamp(
            order.creation_date
          );
          order.order_type = order.order_type.replace(/_/g, " ");
          order.order_type =
            order.order_type.charAt(0).toUpperCase() +
            order.order_type.slice(1);

          const orderItems = await fetchOrderItemsData(
            req.staff.fooder_id,
            order.id,
            connection
          );




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
          // let roundUpAmount = 0;




          //  for flate amount discount
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
              // tempDiscount += (((i.quantity) * withOutTaxPrice) - parseFloat(order.discount_rate))
              // // tempDiscountRow = (((i.quantity) * withOutTaxPrice) - parseFloat(order.discount_rate))
              // tempDiscount += ((i.quantity * withOutTaxPrice) - ((i.quantity * withOutTaxPrice) - parseFloat(order.discount_rate))) * i.quantity
              // tempDiscountRow = ((i.quantity * withOutTaxPrice) - ((i.quantity * withOutTaxPrice) - parseFloat(order.discount_rate))) * i.quantity
              tempDiscount += (((i.quantity) * withOutTaxPrice) * parseFloat(discountRateForAmount)) / 100
              tempDiscountRow = (((i.quantity) * withOutTaxPrice) * parseFloat(discountRateForAmount)) / 100
            }


            tempServicCharge += ((((i.quantity) * withOutTaxPrice) - tempDiscountRow) * parseFloat(serviceChargeDetails.percentage)) / 100
            tempServicChargeRow = ((((i.quantity) * withOutTaxPrice) - tempDiscountRow) * parseFloat(serviceChargeDetails.percentage)) / 100


            tempTax += ((((i.quantity) * withOutTaxPrice) + tempServicChargeRow - tempDiscountRow) * parseFloat(i.item_tax_percent)) / 100
          })


          var grandTotal = 0

          if (order.order_type != "dine_in") {
            grandTotal = (parseFloat(subTotal + tempServicCharge - tempDiscount + tempTax + order.round_up_amount) + parseFloat(packingCharges)).toFixed(2)
            order.packaging_fee = parseFloat(packingCharges)
          } else {
            grandTotal = (subTotal + tempServicCharge - tempDiscount + tempTax + order.round_up_amount)
            order.packaging_fee = parseFloat(0)
          }




          order.subtotal = parseFloat(subTotal);
          order.discount = parseFloat(tempDiscount);
          order.total = parseFloat(grandTotal)
          order.service_charge = parseFloat(tempServicCharge)
          order.tax = parseFloat(tempTax)






          if (order.payment_status === 0 || order.payment_status === 2) {
            order.customer_paid_amount = parseFloat(0)
            order.customer_due_amount = parseFloat(grandTotal)

          } else if (order.payment_status === 1) {

            order.customer_paid_amount = parseFloat(grandTotal)
            order.customer_due_amount = parseFloat(0)
          }
          else if (order.payment_status === 3) {

            // order.customer_paid_amount = parseFloat(grandTotal).toFixed(2)
            // order.customer_due_amount = parseFloat(0).toFixed(2) NoOfPersonServed[0].total,


            let [partially_total] = await connection.query(`select SUM(paid_amount) AS total from orders_payment where fooder_id = ? and order_id = ?`, [
              req.staff.fooder_id,
              order.id

            ]);

            order.customer_paid_amount = parseFloat(partially_total[0].total)
            order.customer_due_amount = (parseFloat(grandTotal) - parseFloat(partially_total[0].total))
          }

          if (order.payment_status === 0) {
            order.payment_status_lable = "Unpaid"

          } else if (order.payment_status === 1) {
            order.payment_status_lable = "Paid"

          } else if (order.payment_status === 2) {
            order.payment_status_lable = "Hold"

          } else if (order.payment_status === 3) {
            order.payment_status_lable = "Partially Unpaid"

          }


          //console.log("order.service_charge=========>",order.service_charge);
          //console.log("order.tax=========>",order.tax);
          ////////////////////////////////////////////////////////////////////////
          // Add status mapping
          if (order.status === 0) {
            order.order_status_lable = "Pending";
          } else if (order.status === 1) {
            order.order_status_lable = "Accept and prepare order";
          } else if (order.status === 2) {
            order.order_status_lable = "Order Ready";
          } else if (order.status === 3) {
            order.order_status_lable = "Delivered and paid";
          } else if (order.status === 4) {
            order.order_status_lable = "Reject";
          }


          return order;
        })
      );
      modifiedData.forEach((order) => {
        totalSubtotal += parseFloat(order.subtotal);
        totalDiscount += parseFloat(order.discount);
        totalTotal += parseFloat(order.total);
        totalServiceCharge += parseFloat(order.service_charge);
        totalTax += parseFloat(order.tax);
        totalCustomerDueAmount += parseFloat(order.customer_due_amount)
        totalCustomerPaidAmount += parseFloat(order.customer_paid_amount)

        totalPackingCharges += parseFloat(order.packaging_fee)
        totalRoundUpAmount += parseFloat(order.round_up_amount);


      });

      connection.release();
      return res.status(200).send({
        status: "success",
        data: modifiedData,
        totalSubtotal: totalSubtotal.toFixed(2),
        totalDiscount: totalDiscount.toFixed(2),
        totalTotal: totalTotal.toFixed(2),
        totalServiceCharge: totalServiceCharge.toFixed(2),
        totalTax: totalTax.toFixed(2),
        totalPackingCharges: totalPackingCharges.toFixed(2),
        totalRoundUpAmount: totalRoundUpAmount.toFixed(2),
        totalDueAmount: totalDueAmount.toFixed(2),
        currency_symbol: config.currency_symbol,
        start_date: start_date,
        end_date: end_date,
        totalCustomerDueAmount: totalCustomerDueAmount.toFixed(2),
        totalCustomerPaidAmount: totalCustomerPaidAmount.toFixed(2),
        order_mode: req.query.order_mode,
        payment_status: req.query.payment_status,

      });
    } else {
      let couponCondition = ``;
      let queryParams = [req.staff.fooder_id];

      if (coupon_code && coupon_code !== "all") {
        couponCondition = `AND coupon_code = ?`;
        queryParams.push(coupon_code);
      } else {
        couponCondition = `AND coupon_code != "NULL" AND coupon_code != ""`;
      }

      queryParams.push(timestampOpen, timestampClose);

      const [getSalesReportResult] = await connection.query(
        `SELECT id, order_date, status, payment_status, coupon_code, order_type, creation_date, order_number_qrcode, service_charge_details, tax_details, discount_type, discount_rate, round_up_amount, invoice_no 
     FROM orders 
     WHERE fooder_id = ? 
     ${couponCondition}
     AND creation_date BETWEEN ? AND ? 
     AND ${get_payment_status === 'all'
          ? `(payment_status IN (0, 1, 2, 3))`
          : get_payment_status === '0'
            ? `(payment_status = 0)`
            : get_payment_status === '1'
              ? `(payment_status = 1)`
              : get_payment_status === '2'
                ? `(payment_status = 2)`
                : `(payment_status = 3)`
        } 
     AND is_cancelled = 0  
     AND status IN (1, 2, 3)
     ORDER BY id DESC`,
        queryParams
      );

      if (getSalesReportResult.length === 0) {
        connection.release();
        return res
          .status(200)
          .send({ status: "success", message: "Data Not Available.." });
      }

      if (getSalesReportResult.length === 0) {
        connection.release();

        return res
          .status(200)
          .send({ status: "success", message: "Data Not Available.." });
      }

      // Initialize variables to store totals
      let totalSubtotal = 0;
      let totalDiscount = 0;
      let totalTotal = 0;
      let totalServiceCharge = 0;
      let totalTax = 0;
      let totalCustomerDueAmount = 0
      let totalCustomerPaidAmount = 0
      let totalPackingCharges = 0
      let totalRoundUpAmount = 0



      const modifiedData = await Promise.all(
        getSalesReportResult.map(async (order) => {
          order.creation_date_formatted = formatUnixTimestamp(
            order.creation_date
          );
          order.order_type = order.order_type.replace(/_/g, " ");
          order.order_type =
            order.order_type.charAt(0).toUpperCase() +
            order.order_type.slice(1);

          const orderItems = await fetchOrderItemsData(
            req.staff.fooder_id,
            order.id,
            connection
          );



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


          //  for flate amount discount
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
              // tempDiscount += (((i.quantity) * withOutTaxPrice) - parseFloat(order.discount_rate))
              // tempDiscountRow = (((i.quantity) * withOutTaxPrice) - parseFloat(order.discount_rate))
              // tempDiscount += ((i.quantity * withOutTaxPrice) - ((i.quantity * withOutTaxPrice) - parseFloat(order.discount_rate))) * i.quantity
              // tempDiscountRow = ((i.quantity * withOutTaxPrice) - ((i.quantity * withOutTaxPrice) - parseFloat(order.discount_rate))) * i.quantity
              tempDiscount += (((i.quantity) * withOutTaxPrice) * parseFloat(discountRateForAmount)) / 100
              tempDiscountRow = (((i.quantity) * withOutTaxPrice) * parseFloat(discountRateForAmount)) / 100
            }


            tempServicCharge += ((((i.quantity) * withOutTaxPrice) - tempDiscountRow) * parseFloat(serviceChargeDetails.percentage)) / 100
            tempServicChargeRow = ((((i.quantity) * withOutTaxPrice) - tempDiscountRow) * parseFloat(serviceChargeDetails.percentage)) / 100



            tempTax += ((((i.quantity) * withOutTaxPrice) + tempServicChargeRow - tempDiscountRow) * parseFloat(i.item_tax_percent)) / 100
          })



          var grandTotal = 0

          if (order.order_type != "dine_in") {
            grandTotal = (parseFloat(subTotal + tempServicCharge - tempDiscount + tempTax + order.round_up_amount) + parseFloat(packingCharges))
            order.packaging_fee = parseFloat(packingCharges)
          } else {
            grandTotal = (subTotal + tempServicCharge - tempDiscount + tempTax + order.round_up_amount)
            order.packaging_fee = parseFloat(0)
          }




          order.subtotal = parseFloat(subTotal)
          order.discount = parseFloat(tempDiscount)
          order.total = parseFloat(grandTotal)
          order.service_charge = parseFloat(tempServicCharge)
          order.tax = parseFloat(tempTax)

          // order.round_up_amount = parseFloat(round_up_amount).toFixed(2);



          if (order.payment_status === 0 || order.payment_status === 2) {
            order.customer_paid_amount = parseFloat(0)
            order.customer_due_amount = parseFloat(grandTotal)

          } else if (order.payment_status === 1) {
            order.customer_paid_amount = parseFloat(grandTotal)
            order.customer_due_amount = parseFloat(0)
          }
          else if (order.payment_status === 3) {

            let [partially_total] = await connection.query(`select SUM(paid_amount) AS total from orders_payment where fooder_id = ? and order_id = ?`, [
              req.staff.fooder_id,
              order.id
            ]);
            order.customer_paid_amount = parseFloat(partially_total[0].total)
            order.customer_due_amount = (parseFloat(grandTotal) - parseFloat(partially_total[0].total))
          }

          if (order.payment_status === 0) {
            order.payment_status_lable = "Unpaid"

          } else if (order.payment_status === 1) {
            order.payment_status_lable = "Paid"

          } else if (order.payment_status === 2) {
            order.payment_status_lable = "Hold"

          } else if (order.payment_status === 3) {
            order.payment_status_lable = "Partially Unpaid"

          }



          //console.log("order.service_charge=========>",order.service_charge);
          //console.log("order.tax=========>",order.tax);
          ////////////////////////////////////////////////////////////////////////
          // Add status mapping
          if (order.status === 0) {
            order.order_status_lable = "Pending";
          } else if (order.status === 1) {
            order.order_status_lable = "Accept and prepare order";
          } else if (order.status === 2) {
            order.order_status_lable = "Order Ready";
          } else if (order.status === 3) {
            order.order_status_lable = "Delivered and paid";
          } else if (order.status === 4) {
            order.order_status_lable = "Reject";
          }


          //*****************************************************************************************************************************************************************************/
          //   // Fetch payment details for the order
          //   const [paymentDetails] = await connection.query(
          //     `SELECT payment_details FROM orders_payment WHERE order_id = ?`,
          //     [order.id]
          //   );

          //          if (paymentDetails.length > 0) {
          //   const { due } = JSON.parse(paymentDetails[0].payment_details);
          //   const dueAmount = parseFloat(due);
          //   if (!isNaN(dueAmount)) {
          //     order.due_amount = dueAmount.toFixed(2);
          //     totalDueAmount += dueAmount; // Accumulate due amount
          //   } else {
          //     order.due_amount = "0.00"; // Set due amount to 0 if NaN
          //   }
          // } else {
          //   order.due_amount = "0.00"; // Set due amount to 0 if payment details are missing
          // }


          //****************************************************************************************************************************************************************************/ 

          return order;
        })
      );
      modifiedData.forEach((order) => {
        totalSubtotal += parseFloat(order.subtotal);
        totalDiscount += parseFloat(order.discount);
        totalTotal += parseFloat(order.total);
        totalServiceCharge += parseFloat(order.service_charge);
        totalTax += parseFloat(order.tax);
        totalCustomerDueAmount += parseFloat(order.customer_due_amount)
        totalCustomerPaidAmount += parseFloat(order.customer_paid_amount)
        totalPackingCharges += parseFloat(order.packaging_fee)

        totalRoundUpAmount += parseFloat(order.round_up_amount);


        // Check if the order_type is already in the orderTypeTotals object
        if (!orderTypeTotals[order.order_type]) {
          // If not, initialize the totals for this order_type
          orderTypeTotals[order.order_type] = {
            subtotal: 0,
            discount: 0,
            total: 0,
            serviceCharge: 0,
            tax: 0,
            totalCustomerDueAmount: 0,
            totalCustomerPaidAmount: 0,
            totalPackingCharges: 0,
            totalRoundUpAmount: 0

          };
        }

        orderTypeTotals[order.order_type].subtotal = (
          parseFloat(orderTypeTotals[order.order_type].subtotal) +
          parseFloat(order.subtotal)
        )
        orderTypeTotals[order.order_type].discount = (
          parseFloat(orderTypeTotals[order.order_type].discount) +
          parseFloat(order.discount)
        )
        orderTypeTotals[order.order_type].total = (
          parseFloat(orderTypeTotals[order.order_type].total) +
          parseFloat(order.total)
        )
        orderTypeTotals[order.order_type].serviceCharge = (
          parseFloat(orderTypeTotals[order.order_type].serviceCharge) +
          parseFloat(order.service_charge)
        )
        orderTypeTotals[order.order_type].tax = (
          parseFloat(orderTypeTotals[order.order_type].tax) +
          parseFloat(order.tax)
        )


        orderTypeTotals[order.order_type].totalCustomerDueAmount = (
          parseFloat(orderTypeTotals[order.order_type].totalCustomerDueAmount) +
          parseFloat(order.customer_due_amount)
        )

        orderTypeTotals[order.order_type].totalCustomerPaidAmount = (
          parseFloat(orderTypeTotals[order.order_type].totalCustomerPaidAmount) +
          parseFloat(order.customer_paid_amount)
        )

        orderTypeTotals[order.order_type].totalPackingCharges = (
          parseFloat(orderTypeTotals[order.order_type].totalPackingCharges) +
          parseFloat(order.packaging_fee)
        )

        orderTypeTotals[order.order_type].totalRoundUpAmount = (
          parseFloat(orderTypeTotals[order.order_type].totalRoundUpAmount) +
          parseFloat(order.round_up_amount)
        )



      });

      connection.release();
      return res.status(200).send({
        status: "success",
        data: modifiedData,
        totalSubtotal: totalSubtotal.toFixed(2),
        totalDiscount: totalDiscount.toFixed(2),
        totalTotal: totalTotal.toFixed(2),
        totalServiceCharge: totalServiceCharge.toFixed(2),
        totalTax: totalTax.toFixed(2),
        totalDueAmount: totalDueAmount.toFixed(2),
        currency_symbol: config.currency_symbol,
        start_date: start_date,
        end_date: end_date,
        orderTypeTotals: orderTypeTotals,
        totalCustomerDueAmount: totalCustomerDueAmount.toFixed(2),
        totalCustomerPaidAmount: totalCustomerPaidAmount.toFixed(2),
        order_mode: req.query.order_mode,
        payment_status: req.query.payment_status,
        totalPackingCharges: parseFloat(totalPackingCharges).toFixed(2),
        totalRoundUpAmount: parseFloat(totalRoundUpAmount).toFixed(2)


      });
    }
  } catch (error) {
    console.error("Error:", error);
    if (connection) {
      connection.release();
    }
    return res.status(500).json({
      message: "Internal server error",
      errors: error.toString(),
    });
  }
};


exports.GetAllCouponCodeName = async (req, res) => {
  const connection = await db.getConnection();
  const fooder_id = req.staff.fooder_id;

  try {
    // Fetch distinct coupon codes from both discount and orders tables
    const [result] = await connection.query(
      `SELECT DISTINCT coupon_code 
       FROM (
         SELECT coupon_code FROM discount WHERE fooder_id = ?
         UNION
         SELECT coupon_code FROM orders WHERE fooder_id = ? AND coupon_code IS NOT NULL AND coupon_code != ''
       ) AS combined
       ORDER BY coupon_code ASC`,
      [fooder_id, fooder_id]
    );

    connection.release();

    return res.status(200).send({
      status: "success",
      data: result,
    });
  } catch (error) {
    console.error("Error:", error);
    if (connection) {
      connection.release();
    }
    return res.status(500).json({
      message: "Internal server error",
      errors: error.toString(),
    });
  }
};



exports.getSettledUnsettledReportLatest = async (req, res) => {
  try {
    const fooder_id = req.staff?.fooder_id;

    if (!fooder_id) {
      return res.status(400).json({
        status: 'fail',
        message: 'fooder_id is required'
      });
    }

    const query = `
      SELECT 
        ROUND(COALESCE(settled.total_paid, 0), 2) AS settled_amount,
        ROUND(COALESCE(orders.payable_amount, 0) - COALESCE(settled.total_paid, 0), 2) AS unsettled_amount
      FROM (
        SELECT SUM(total) AS payable_amount
        FROM orders
        WHERE is_cancelled = 0 
          AND order_date = CURDATE()
          AND fooder_id = ?
      ) AS orders
      LEFT JOIN (
        SELECT SUM(CAST(paid_amount AS DECIMAL(10,2))) AS total_paid
        FROM orders_payment
        WHERE order_id IN (
          SELECT id
          FROM orders
          WHERE is_cancelled = 0 
            AND order_date = CURDATE()
            AND fooder_id = ?
        )
      ) AS settled ON 1=1;
    `;

    const [rows] = await db.query(query, [fooder_id, fooder_id]);

    res.status(200).json({
      status: 'success',
      fooder_id,
      data: rows[0]
    });

  } catch (error) {
    console.error('Error in /payment-summary:', error);
    res.status(500).json({
      status: 'fail',
      message: 'Internal Server Error',
      error: error.message
    });
  }
};
