const crypto = require("crypto");
const db = require('../config/db');
const config = require('../config/config');
const axios = require("axios");

function encrypt_decrypt(action, string) {
  const encrypt_method = config.encrypt_method;
  const secret_key = config.secret_key;
  const secret_iv = config.secret_iv;

  // Hash the key and truncate it to 32 bytes for AES-256-CBC
  const key = crypto
    .createHash("sha256")
    .update(secret_key)
    .digest("hex")
    .slice(0, 32);

  // Hash the iv and truncate it to 16 bytes for AES-256-CBC
  const iv = crypto
    .createHash("sha256")
    .update(secret_iv)
    .digest("hex")
    .slice(0, 16);

  //   console.log(key.toString("hex"));
  //   console.log(iv.toString("hex"));

  if (action === "encrypt") {
    const cipher = crypto.createCipheriv(encrypt_method, key, iv);
    let encrypted = cipher.update(string, "utf-8", "base64");
    encrypted += cipher.final("base64");
    const base64EncodedData = Buffer.from(encrypted).toString("base64");
    return base64EncodedData;
  } else if (action === "decrypt") {
    const dstring = Buffer.from(string, "base64").toString("utf-8");

    const decipher = crypto.createDecipheriv(encrypt_method, key, iv);
    let decrypted = decipher.update(dstring, "base64", "utf-8");
    decrypted += decipher.final("utf-8");
    return decrypted;
  }

  return null;
};

function generateAlphanumericID(length) {
  let characters =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  let charactersLength = characters.length;

  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }

  return result;
}


async function generateUniqueAlphanumericID(length, connection) {
  const kot_unique_number = generateAlphanumericID(length);

  const [existingRecords] = await connection.query(
    "SELECT kot_unique_number FROM fooders_kot WHERE kot_unique_number = ?",
    [kot_unique_number]
  );
  connection.release();

  if (existingRecords.length === 0) {
    // Unique ID found, return it
    return kot_unique_number;
  } else {
    // ID already exists, generate a new one recursively
    return generateUniqueAlphanumericID(length, connection);
  }
}


exports.updateLiveOrderAction = async (req, res) => {
  const { id, status, order_preparation_time } = req.body;
  const connection = await db.getConnection();
  const connection2 = await db.getConnection();
  try {
    const currentIDQuery = `SELECT id FROM orders WHERE id = ?`;
    const [[currentIdResult]] = await connection2.query(currentIDQuery, [id]);

    if (!currentIdResult || currentIdResult.length === 0) {
      connection.release();
      connection2.release();
      return res.status(400).send({
        status: "error",
        message: "Order not exist!!!",
      });
    }

    /*******************************************check order status start*************************************************************/

    // Query to get the current status of the order
    const currentStatusQuery = `SELECT status FROM orders WHERE id = ?`;
    const [currentStatusResult] = await connection2.query(currentStatusQuery, [
      id,
    ]);
    //console.log("currentStatusResult", currentStatusResult[0].status);

    // Check if the current status is 1 (order already accepted)
    if (
      currentStatusResult &&
      currentStatusResult[0].status === 1 &&
      (status === 1 || status === 4)
    ) {
      connection.release();
      connection2.release();
      return res.status(200).send({
        status: "info",
        message: "Order is already accepted.",
      });
    } else if (
      currentStatusResult &&
      currentStatusResult[0].status === 4 &&
      (status === 1 || status === 4)
    ) {
      connection.release();
      connection2.release();
      return res.status(200).send({
        status: "info",
        message: "Order is already rejected.",
      });
    }

    /*******************************************check order status end*************************************************************/

    let statusUpdateQuery;
    let statusUpdateQueryArray;
    if (order_preparation_time) {
      statusUpdateQuery = ` UPDATE orders SET status = ?,order_preparation_time = ? where id = ? AND fooder_id = ?`;
      statusUpdateQueryArray = [status, order_preparation_time, id, req.staff.fooder_id];
    } else {
      statusUpdateQuery = ` UPDATE orders SET status = ? where id = ? AND fooder_id = ?`;
      statusUpdateQueryArray = [status, id, req.staff.fooder_id];
    }

    const order_details_query = `select table_id,eater_id,eater_phonenumber,fooder_name,order_number_qrcode,order_number,total from orders where id = ? `;
    const [order_details_result] = await connection2.query(
      order_details_query,
      [id]
    );

    // Assuming order_details_result is an object in Node.js
    let eaterPhoneNumber = order_details_result[0].eater_phonenumber
      ? order_details_result[0].eater_phonenumber
      : "";

    let fooderName = order_details_result[0].fooder_name
      ? order_details_result[0].fooder_name.trim()
      : "";

    let orderNumberQrcode = order_details_result[0].order_number_qrcode;
    // let order_number = order_details_result[0].order_number;
    let number = eaterPhoneNumber;
    let topay = order_details_result[0].total;
    /************************For push notification start****************************/
    let table = "";
    if (order_details_result[0].table_id) {
      const [tableNumber] = await connection2.query(
        `select table_no from fooders_tables where id = ?`,
        [order_details_result[0].table_id]
      );
      table = tableNumber[0].table_no;
    }
    // const [tableNumber] = await connection2.query(
    //   `select table_no from fooders_tables where id = ?`,
    //   [order_details_result[0].table_id]
    // );
    // const table = tableNumber[0].table_no;
    let eater_id = "eater_" + order_details_result[0].eater_id;
    const encryptedEaterId = encrypt_decrypt("encrypt", `${eater_id}`);
    let text = null;
    if (status === 1) {
      text = "Order is getting ready!";
    } else if (status === 4) {
      text = "Order Rejected!";
    }
    const msgg = `<a href="" class="btn btn-warning btn-block rounded text-decoration-none align-items-center"> 
<b><i class="feather-alert-triangle"></i>  ${text}(#${orderNumberQrcode}) </b></a>`;

    const data = {
      fooderid: encryptedEaterId,
      table: table,
      msg: Buffer.from(msgg).toString("base64"),
      notification_div: "pushNotify",
    };

    //console.log("data====>", data);
    /************************For push notification end ****************************/
    if (status === 4) {
      if (
        // req?.staff?.status_order_ready_sms_enable === 1 &&
        // eaterPhoneNumber !== ""
        true
      ) {
        // const msg = `Sorry to inform, your Order no. ${orderNumberQrcode} with ${fooderName} is rejected due to some reasons. Please confirm at the counter.\nKhateraho.com\nTeam IWCN`;

        // const curl_response = await CurlHelper.send_sms(
        //   config.SMS_API_KEY,
        //   number,
        //   config.SENDER,
        //   msg,
        //   "POST",
        //   config.SMS_URL
        // );
        // const getResponse = JSON.parse(curl_response);

        /******************************** FOR PUSH  NOTIFICATION Start ***********************************************************************/

        await axios
          .post("https://alertify.live/send_data", data, {
            headers: {
              "Content-Type": "application/json",
            },
          })
          .then((response) => {
            // console.log(response.data);
          })
          .catch((error) => {
            console.error("notify error", error);
          });

        /******************************** FOR PUSH  NOTIFICATION end ***********************************************************************/

        // console.log("getResponse", getResponse);

        const [statusUpdateResult] = await connection2.query(
          statusUpdateQuery,
          statusUpdateQueryArray
        );

        if (statusUpdateResult && statusUpdateResult.affectedRows === 0) {
          connection.release();
          connection2.release();

          return res.status(400).send({
            status: "fail",
            message: "Status not Updated!!!, something went wrong!!!",
          });
        }

        await connection.query(`UPDATE fooders_tables ft JOIN orders o ON ft.id = o.table_id SET ft.is_booked = 0, ft.booked_by = '{}' WHERE ft.fooder_id = ? AND o.id = ? AND o.payment_status = 0;`, [req.staff.fooder_id, id]);


        connection.release();
        connection2.release();
        return res.status(200).send({
          status: "success",
          message: `Order #${orderNumberQrcode} rejected successfully!!!`,
        });
      } else {
        /******************************** FOR PUSH  NOTIFICATION***********************************************************************/

        await axios
          .post("https://alertify.live/send_data", data, {
            headers: {
              "Content-Type": "application/json",
            },
          })
          .then((response) => {
            // console.log(response.data);
          })
          .catch((error) => {
            console.error("notify error", error);
          });

        /******************************** FOR PUSH  NOTIFICATION***********************************************************************/

        const [statusUpdateResult] = await connection2.query(
          statusUpdateQuery,
          statusUpdateQueryArray
        );

        if (statusUpdateResult && statusUpdateResult.affectedRows === 0) {
          connection.release();
          connection2.release();
          return res.status(400).send({
            status: "fail",
            message: "Status not Updated!!!, something went wrong!!!",
          });
        }
        connection.release();
        connection2.release();
        return res.status(200).send({
          status: "success",
          message: `Order #${orderNumberQrcode} rejected successfully!!!`,
        });
      }
    } else if (status === 1) {
      if (req.staff.order_sms_notification_enable_eater === 1) {
        const findItemsQuery = `SELECT
        oi.menu_id,
        oi.product_type,
        oi.quantity,
        oi.fooder_id,
        oi.table_id,
        oi.fooder_name,
        oi.product_special_note,
        oi.product_id,
        oi.product_name,
        oi.product_price,
        oi.product_proprice,
        oi.variant_details AS selectedvariants,
        oi.addons_items_details AS selectedAddons,

        o.order_type
      FROM
        order_items oi
      JOIN
        orders o ON oi.order_id = o.id
      WHERE
        oi.order_id = ?
      `;

        const [result] = await connection2.query(findItemsQuery, [id]);

        result.forEach((i) => {

          if (i.selectedvariants) {
            i.selectedvariants = JSON.parse(i.selectedvariants)
          }
          if (i.selectedAddons) {
            i.selectedAddons = JSON.parse(i.selectedAddons)

          }

        })

        ///////////////////////////////////////////////////////////KOT GENERATE//////////////////////////////////////////////////////

        let kot_no;
        //const kot_unique_number = generateAlphanumericID(12);
        const kot_unique_number = await generateUniqueAlphanumericID(
          12,
          connection
        );

        const kot_prefix = "KOT";
        const fooder_id = req.staff.fooder_id;
        const today_date = new Date().toISOString().slice(0, 10);
        const time = Math.floor(Date.now() / 1000);

        // Convert result array to JSON
        const kot_details = JSON.stringify(result);

        const [KOTExists] = await connection2.query(
          "SELECT * FROM `fooders_kot` WHERE `fooder_id` = ? AND `kot_date` = ?",
          [fooder_id, today_date]
        );
        if (KOTExists.length > 0) {
          const [maxIdResult] = await connection2.query(
            "SELECT MAX(`kot_number`) AS max_id FROM `fooders_kot` WHERE `fooder_id` = ? AND `kot_date` = ?",
            [fooder_id, today_date]
          );
          const max_id = maxIdResult[0].max_id || 0;
          kot_no = max_id + 1;
        } else {
          kot_no = config.kotnumber; // Replace with your default value
        }
        const Kotstatus = 0;

        const [generateKot] = await connection2.query(
          `insert into fooders_kot (fooder_id,kot_number,kot_date,kot_prefix,kot_unique_number,kot_details,status,created_date,ip) values(?,?,?,?,?,?,?,?,?)`,
          [
            fooder_id,
            kot_no,
            today_date,
            kot_prefix,
            kot_unique_number,
            kot_details,
            Kotstatus,
            time,
            req.ipAddress,
          ]
        );

        const orderItemKOT_id_Query = `UPDATE order_items SET product_kot_id = ? where order_id = ? AND fooder_id = ?`;
        const [result2] = await connection2.query(orderItemKOT_id_Query, [
          generateKot.insertId,
          id,
          req.staff.fooder_id,
        ]);

        const msg = `Thank you for placing your order #${orderNumberQrcode} (INR ${topay}) with ${fooderName} on khateraho.com\nTeam IWCN`;
        ///////////////////////////////////////// SMS CURL START/////////////////////////////////////////////////
        const curl_response = await CurlHelper.send_sms(
          config.SMS_API_KEY,
          number,
          config.SENDER,
          msg,
          "POST",
          config.SMS_URL
        );
        const getResponse = JSON.parse(curl_response);
        //console.log("getResponse", getResponse);

        //////////////////////////////////////////SMS CURL END//////////////////////////////////////////////////////////////////////////////////

        /******************************** FOR PUSH  NOTIFICATION Start ***********************************************************************/
        /******************************** FOR PUSH  NOTIFICATION Start for oneSignel ***********************************************************************/
        // if (req.staff.allow_order_push_notification === 1) {
        //   //console.log("enter");
        //   const sql = `SELECT app_id FROM eaters_appid WHERE eater_id= ?`;
        //   const [fooderApps] = await connection.query(sql, [
        //     order_details_result[0].eater_id,
        //   ]);
        //   //console.log("fooderApps", fooderApps);
        //   const fooderArray = fooderApps.map((row) => row.app_id);
        //   //console.log("fooderArray", fooderArray);
        //   const title = config.pushNotification.push_notification_accept_title;
        //   //const contents = `#${orderNumberQrcode} (INR ${topay}) received from ${table}`;
        //   const contents =
        //     config.pushNotification.push_notification_accept_content;
        //   const pushNotificationData = {
        //     app_id: config.pushNotification.one_signal_app_id,
        //     headings: { en: title },
        //     contents: { en: contents },
        //     android_channel_id:
        //       config.pushNotification.order_notification_channel_id,
        //     include_aliases: {
        //       external_id: fooderArray,
        //     },
        //     target_channel: "push",
        //     isAndroid: true,
        //     isIos: true,
        //     ios_sound: "notify.wav",
        //     data: {
        //       url: "OrderDetails",
        //       encrypt_id: encrypt_decrypt("encrypt", id.toString()),
        //     },
        //     large_icon: `${config.IMAGE_PATH}/khateraho/large_icon.png`,
        //   };
        //   //console.log("pushNotificationData:", pushNotificationData);

        //   await axios
        //     .post(
        //       config.pushNotification.one_signal_api_url,
        //       pushNotificationData,
        //       {
        //         headers: {
        //           "Content-Type": "application/json",
        //           Authorization:
        //             "Basic " + config.pushNotification.one_signal_api_key,
        //         },
        //       }
        //     )
        //     .then((response) => {
        //       console.log("response for onesignal", response.data);
        //     })
        //     .catch((error) => {
        //       console.log("notify error", error);
        //     });
        // }
        // /******************************** FOR PUSH  NOTIFICATION end for oneSignel ***********************************************************************/

        /******************************** FOR PUSH  NOTIFICATION Start for alertyfy ***********************************************************************/
        await axios
          .post("https://alertify.live/send_data", data, {
            headers: {
              "Content-Type": "application/json",
            },
          })
          .then((response) => {
            // console.log("response for alertyfy", response.data);
          })
          .catch((error) => {
            console.log("notify error", error);
          });
        /******************************** FOR PUSH  NOTIFICATION end for alertyfy ***********************************************************************/

        /******************************** FOR PUSH  NOTIFICATION end ***********************************************************************/

        const [statusUpdateResult] = await connection.query(
          statusUpdateQuery,
          statusUpdateQueryArray
        );

        if (statusUpdateResult && statusUpdateResult.affectedRows === 0) {
          connection.release();
          connection2.release();
          return res.status(400).send({
            status: "fail",
            message: "Status not Updated!!!, something went wrong!!!",
          });
        }
        connection.release();
        connection2.release();
        return res.status(200).send({
          status: "success",
          message: `Order  #${orderNumberQrcode} accepted successfully!!!`,
        });
      } else {
        const findItemsQuery = `SELECT
        oi.menu_id,
        oi.product_type,
        oi.quantity,
        oi.fooder_id,
        oi.table_id,
        oi.fooder_name,
        oi.product_special_note,
        oi.product_id,
        oi.product_name,
        oi.product_price,
        oi.product_proprice,
        o.order_type
      FROM
        order_items oi
      JOIN
        orders o ON oi.order_id = o.id
      WHERE
        oi.order_id = ?
      `;

        const [result] = await connection.query(findItemsQuery, [id]);

        ///////////////////////////////////////////////////////////KOT GENERATE//////////////////////////////////////////////////////

        let kot_no;
        //const kot_unique_number = generateAlphanumericID(12);
        const kot_unique_number = await generateUniqueAlphanumericID(
          12,
          connection
        );

        const kot_prefix = "KOT";
        const fooder_id = req.staff.fooder_id;
        const today_date = new Date().toISOString().slice(0, 10);
        const time = Math.floor(Date.now() / 1000);

        // Convert result array to JSON
        const kot_details = JSON.stringify(result);

        const [KOTExists] = await connection.query(
          "SELECT * FROM `fooders_kot` WHERE `fooder_id` = ? AND `kot_date` = ?",
          [fooder_id, today_date]
        );
        if (KOTExists.length > 0) {
          const [maxIdResult] = await connection.query(
            "SELECT MAX(`kot_number`) AS max_id FROM `fooders_kot` WHERE `fooder_id` = ? AND `kot_date` = ?",
            [fooder_id, today_date]
          );
          const max_id = maxIdResult[0].max_id || 0;
          kot_no = max_id + 1;
        } else {
          kot_no = config.kotnumber; // Replace with your default value
        }
        const Kotstatus = 0;

        const [generateKot] = await connection.query(
          `insert into fooders_kot (fooder_id,kot_number,kot_date,kot_prefix,kot_unique_number,kot_details,status,created_date,ip) values(?,?,?,?,?,?,?,?,?)`,
          [
            fooder_id,
            kot_no,
            today_date,
            kot_prefix,
            kot_unique_number,
            kot_details,
            Kotstatus,
            time,
            req.ipAddress,
          ]
        );

        const orderItemKOT_id_Query = `UPDATE order_items SET product_kot_id = ? where order_id = ? AND fooder_id = ?`;
        const [result2] = await connection.query(orderItemKOT_id_Query, [
          generateKot.insertId,
          id,
          req.staff.fooder_id,
        ]);

        ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
        /******************************** FOR PUSH  NOTIFICATION Start for oneSignel ***********************************************************************/
        // if (req.staff.allow_order_push_notification === 1) {
        //   //console.log("enter");
        //   const sql = `SELECT app_id FROM eaters_appid WHERE eater_id= ?`;
        //   const [fooderApps] = await connection.query(sql, [
        //     order_details_result[0].eater_id,
        //   ]);
        //   //console.log("fooderApps", fooderApps);
        //   const fooderArray = fooderApps.map((row) => row.app_id);
        //   //console.log("fooderArray", fooderArray);
        //   const title = config.pushNotification.push_notification_accept_title;
        //   //const contents = `#${orderNumberQrcode} (INR ${topay}) received from ${table}`;
        //   const contents =
        //     config.pushNotification.push_notification_accept_content;
        //   const pushNotificationData = {
        //     app_id: config.pushNotification.one_signal_app_id,
        //     headings: { en: title },
        //     contents: { en: contents },
        //     android_channel_id:
        //       config.pushNotification.order_notification_channel_id,
        //     include_aliases: {
        //       external_id: fooderArray,
        //     },
        //     target_channel: "push",
        //     isAndroid: true,
        //     isIos: true,
        //     ios_sound: "notify.wav",
        //     data: {
        //       url: "OrderDetails",
        //       encrypt_id: encrypt_decrypt("encrypt", id.toString()),
        //     },
        //     large_icon: `${config.IMAGE_PATH}/khateraho/large_icon.png`,
        //   };
        //   //console.log("pushNotificationData:", pushNotificationData);

        //   await axios
        //     .post(
        //       config.pushNotification.one_signal_api_url,
        //       pushNotificationData,
        //       {
        //         headers: {
        //           "Content-Type": "application/json",
        //           Authorization:
        //             "Basic " + config.pushNotification.one_signal_api_key,
        //         },
        //       }
        //     )
        //     .then((response) => {
        //       console.log("response for onesignal", response.data);
        //     })
        //     .catch((error) => {
        //       console.log("notify error", error);
        //     });
        // }
        /******************************** FOR PUSH  NOTIFICATION end for oneSignel ***********************************************************************/

        /******************************** FOR PUSH  NOTIFICATION Start ***********************************************************************/

        await axios
          .post("https://alertify.live/send_data", data, {
            headers: {
              "Content-Type": "application/json",
            },
          })
          .then((response) => {
            // console.log(response.data);
          })
          .catch((error) => {
            console.error("notify error", error);
          });

        /******************************** FOR PUSH  NOTIFICATION end ***********************************************************************/

        const [statusUpdateResult] = await connection.query(
          statusUpdateQuery,
          statusUpdateQueryArray
        );

        if (statusUpdateResult && statusUpdateResult.affectedRows === 0) {
          connection.release();
          connection2.release();
          return res.status(400).send({
            status: "fail",
            message: "Status not Updated!!!, something went wrong!!!",
          });
        }
        connection.release();
        connection2.release();
        return res.status(200).send({
          status: "success",
          message: `Order #${orderNumberQrcode} accepted successfully!!!`,
        });
      }
    } else if (status === 2) {
      if (
        req.staff.status_order_ready_sms_enable === 1 &&
        eaterPhoneNumber !== ""
      ) {
        const msg = `Your order #${orderNumberQrcode} with ${fooderName} is ready. Please collect your order.\nKhateraho.com\nTeam IWCN`;

        const curl_response = await CurlHelper.send_sms(
          config.SMS_API_KEY,
          number,
          config.SENDER,
          msg,
          "POST",
          config.SMS_URL
        );
        const getResponse = JSON.parse(curl_response);

        /******************************** FOR PUSH  NOTIFICATION Start for oneSignel ***********************************************************************/
        // if (req.staff.allow_order_push_notification === 1) {
        //   //console.log("enter");
        //   const sql = `SELECT app_id FROM eaters_appid WHERE eater_id= ?`;
        //   const [fooderApps] = await connection.query(sql, [
        //     order_details_result[0].eater_id,
        //   ]);
        //   //console.log("fooderApps", fooderApps);
        //   const fooderArray = fooderApps.map((row) => row.app_id);
        //   //console.log("fooderArray", fooderArray);
        //   const title = config.pushNotification.push_notification_Ready_title;
        //   //const contents = `#${orderNumberQrcode} (INR ${topay}) received from ${table}`;
        //   const contents =
        //     config.pushNotification.push_notification_accept_content;
        //   const pushNotificationData = {
        //     app_id: config.pushNotification.one_signal_app_id,
        //     headings: { en: title },
        //     contents: { en: contents },
        //     android_channel_id:
        //       config.pushNotification.order_notification_channel_id,
        //     include_aliases: {
        //       external_id: fooderArray,
        //     },
        //     target_channel: "push",
        //     isAndroid: true,
        //     isIos: true,
        //     ios_sound: "notify.wav",
        //     data: {
        //       url: "OrderDetails",
        //       encrypt_id: encrypt_decrypt("encrypt", id.toString()),
        //     },
        //     large_icon: `${config.IMAGE_PATH}/khateraho/large_icon.png`,
        //   };
        //   //console.log("pushNotificationData:", pushNotificationData);

        //   await axios
        //     .post(
        //       config.pushNotification.one_signal_api_url,
        //       pushNotificationData,
        //       {
        //         headers: {
        //           "Content-Type": "application/json",
        //           Authorization:
        //             "Basic " + config.pushNotification.one_signal_api_key,
        //         },
        //       }
        //     )
        //     .then((response) => {
        //       console.log("response for onesignal", response.data);
        //     })
        //     .catch((error) => {
        //       console.log("notify error", error);
        //     });
        // }
        /******************************** FOR PUSH  NOTIFICATION end for oneSignel ***********************************************************************/

        // console.log("getResponse", getResponse);

        const [statusUpdateResult] = await connection.query(
          statusUpdateQuery,
          statusUpdateQueryArray
        );

        //console.log("updateProductResult===========>", updateProductResult);
        if (statusUpdateResult && statusUpdateResult.affectedRows === 0) {
          connection.release();
          connection2.release();
          return res.status(400).send({
            status: "fail",
            message: "Status not Updated!!!, something went wrong!!!",
          });
        }


        // Query to get the current status of the order
        const currentOrderTypeQuery = `SELECT order_type FROM orders WHERE id = ?`;
        const [currentOrderTypeResult] = await connection.query(currentOrderTypeQuery, [id]);

        if (currentOrderTypeResult && currentOrderTypeResult.length > 0) {
          // console.log("dine_in1")
          const currentOrderType = currentOrderTypeResult[0].order_type;
          if (currentOrderType !== "dine_in") {
            // console.log("dine_in2")

            // Update fooders_kot status to 3 (Ready) for the current order
            await connection.query(`UPDATE fooders_kot JOIN order_items ON order_items.product_kot_id = fooders_kot.id SET fooders_kot.status = 3 WHERE fooders_kot.status NOT IN (4, 5) AND order_items.fooder_id = ? AND order_items.order_id = ?;`, [req.staff.fooder_id, id]);
            await connection.query(`UPDATE order_items SET item_kot_status = 2 WHERE item_kot_status NOT IN (3, 4) AND fooder_id = ? AND order_id = ?`, [req.staff.fooder_id, id]);

          }
        }




        connection.release();
        connection2.release();
        return res.status(200).send({
          status: "success",
          message: `Order #${orderNumberQrcode} is ready`,
        });
      } else {
        /******************************** FOR PUSH  NOTIFICATION Start for oneSignel ***********************************************************************/
        // if (req.staff.allow_order_push_notification === 1) {
        //   //console.log("enter");
        //   const sql = `SELECT app_id FROM eaters_appid WHERE eater_id= ?`;
        //   const [fooderApps] = await connection.query(sql, [
        //     order_details_result[0].eater_id,
        //   ]);
        //   //console.log("fooderApps", fooderApps);
        //   const fooderArray = fooderApps.map((row) => row.app_id);
        //   //console.log("fooderArray", fooderArray);
        //   const title = config.pushNotification.push_notification_Ready_title;
        //   //const contents = `#${orderNumberQrcode} (INR ${topay}) received from ${table}`;
        //   const contents =
        //     config.pushNotification.push_notification_accept_content;
        //   const pushNotificationData = {
        //     app_id: config.pushNotification.one_signal_app_id,
        //     headings: { en: title },
        //     contents: { en: contents },
        //     android_channel_id:
        //       config.pushNotification.order_notification_channel_id,
        //     include_aliases: {
        //       external_id: fooderArray,
        //     },
        //     target_channel: "push",
        //     isAndroid: true,
        //     isIos: true,
        //     ios_sound: "notify.wav",
        //     data: {
        //       url: "OrderDetails",
        //       encrypt_id: encrypt_decrypt("encrypt", id.toString()),
        //     },
        //     large_icon: `${config.IMAGE_PATH}/khateraho/large_icon.png`,
        //   };
        //   //console.log("pushNotificationData:", pushNotificationData);

        //   await axios
        //     .post(
        //       config.pushNotification.one_signal_api_url,
        //       pushNotificationData,
        //       {
        //         headers: {
        //           "Content-Type": "application/json",
        //           Authorization:
        //             "Basic " + config.pushNotification.one_signal_api_key,
        //         },
        //       }
        //     )
        //     .then((response) => {
        //       console.log("response for onesignal", response.data);
        //     })
        //     .catch((error) => {
        //       console.log("notify error", error);
        //     });
        // }
        /******************************** FOR PUSH  NOTIFICATION end for oneSignel ***********************************************************************/

        const [statusUpdateResult] = await connection.query(
          statusUpdateQuery,
          statusUpdateQueryArray
        );

        //console.log("updateProductResult===========>", updateProductResult);
        if (statusUpdateResult && statusUpdateResult.affectedRows === 0) {
          connection.release();
          connection2.release();
          return res.status(400).send({
            status: "fail",
            message: "Status not Updated!!!, something went wrong!!!",
          });
        }


 

        // Query to get the current status of the order
        const currentOrderTypeQuery = `SELECT order_type FROM orders WHERE id = ?`;
        const [currentOrderTypeResult] = await connection.query(currentOrderTypeQuery, [id]);

        if (currentOrderTypeResult && currentOrderTypeResult.length > 0) {
          // console.log("dine_in1")
          const currentOrderType = currentOrderTypeResult[0].order_type;
          if (currentOrderType !== "dine_in") {
            // console.log("dine_in2")

            // Update fooders_kot status to 3 (Ready) for the current order
            await connection.query(`UPDATE fooders_kot JOIN order_items ON order_items.product_kot_id = fooders_kot.id SET fooders_kot.status = 3 WHERE fooders_kot.status NOT IN (4, 5) AND order_items.fooder_id = ? AND order_items.order_id = ?;`, [req.staff.fooder_id, id]);
            await connection.query(`UPDATE order_items SET item_kot_status = 2 WHERE item_kot_status NOT IN (3, 4) AND fooder_id = ? AND order_id = ?`, [req.staff.fooder_id, id]);

          }
        }


        connection.release();
        connection2.release();

         


        return res.status(200).send({
          status: "success",
          message: `Order #${orderNumberQrcode} is ready!!!`,
        });
      }
    } else {
      const [statusUpdateResult] = await connection.query(
        statusUpdateQuery,
        statusUpdateQueryArray
      );

      //console.log("updateProductResult===========>", updateProductResult);
      if (statusUpdateResult && statusUpdateResult.affectedRows === 0) {
        connection.release();
        connection2.release();
        return res.status(400).send({
          status: "fail",
          message: "Status not Updated!!!, something went wrong!!!",
        });
      } else {
        connection.release();
        connection2.release();
        return res.status(200).send({
          status: "success",
          message: "Status Updated successfully...",
        });
      }
    }
  } catch (error) {
    if (connection) {
      connection.release();
    }
    if (connection2) {
      connection2.release();
    }
    res.status(500).json({
      message: "Internal server error",
      errors: error.toString(),
    });
  }
};
