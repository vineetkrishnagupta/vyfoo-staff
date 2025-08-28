const jwt = require('jsonwebtoken');
const pool = require('../config/db');

const protect = async (req, res, next) => {
  let token;

  if (req.cookies.token) {
    token = req.cookies.token;
  }
  // Make sure token exists
  if (!token) {
    return res.status(401).json({ success:false, message: 'Not authorized, no token' });
  }

  try {
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Join fooder_staff and fooders to get staff and open/close time
    const [rows] = await pool.execute(
      `SELECT fs.*, f.open_time, f.close_time, f.plan_id, f.is_approved, f.name AS fooder_name
       FROM fooder_staff fs
       JOIN fooders f ON fs.fooder_id = f.fooder_id
       WHERE fs.id = ?`,
      [decoded.id]
    );
    const staff = rows[0] || null;

    if (!staff) {
      return res.status(401).json({ success: false, message: 'Staff not found' });
    }

    if (staff.status !== 1) {
      return res.status(401).json({ success: false, message: 'Staff account is deactivated' });
    }

    // Check if fooder has paid plan
    if (staff.plan_id != 4) {
      return res.status(401).json({
        success: false,
        message: 'Fooder does not have a paid plan'
      });
    }

    // Check if fooder is approved
    if (staff.is_approved != 2) {
      return res.status(401).json({
        success: false,
        message: 'Fooder is not approved'
      });
    }

    // const permissions = JSON.parse(staff.app_permission || '{}');

    // // Check if staff type is allowed
    // if (staff.type === 0  && !permissions.pos) {
    //   return res.status(401).json({
    //     success: false,
    //     message: 'You are not allowed to login'
    //   });
    // }

    // Check allowed users from env
    const allowedUsers = (process.env.allowedUsers || '');
    if (!allowedUsers.includes(Number(staff.type))) {
      return res.status(401).json({
        success: false,
        message: 'You are not allowed to login'
      });
    }

    // Attach all relevant details to req.staff
    req.staff = {
      id: staff.id,
      staff_id: staff.id,
      fooder_id: staff.fooder_id,
      name: staff.name,
      fooder_name: staff.fooder_name,
      username: staff.username,
      email: staff.email,
      type: staff.type,
      status: staff.status,
      permissions: (() => {
        try {
          return staff.app_permission ? JSON.parse(staff.app_permission) : {};
        } catch {
          return {};
        }
      })(),
      app_permission: staff.app_permission,
      gstin: staff.gstin,
      fssai_number: staff.fssai_number,
      open_time: staff.open_time,
      close_time: staff.close_time,
      // add any other fields you want to expose
    };
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    return res.status(401).json({ success:false, message: 'Not authorized' });
  }
};




// const protect = async (req, res, next) => {
//   let token;

//   if (req.cookies.token) {
//     token = req.cookies.token;
//   }
//   // Make sure token exists
//   if (!token) {
//     return res.status(401).json({ success:false, message: 'Not authorized, no token' });
//   }

//   try {
//     // Verify token
//     const decoded = jwt.verify(token, process.env.JWT_SECRET);

//     // Join fooder_staff and fooders to get staff and open/close time
//     const [rows] = await pool.execute(
//       `SELECT fs.*, f.open_time, f.close_time
//        FROM fooder_staff fs
//        JOIN fooders f ON fs.fooder_id = f.fooder_id
//        WHERE fs.id = ?`,
//       [decoded.id]
//     );
//     const staff = rows[0] || null;

//     if (!staff) {
//       return res.status(401).json({ success: false, message: 'Staff not found' });
//     }

//     if (staff.status !== 1) {
//       return res.status(401).json({ success: false, message: 'Staff account is deactivated' });
//     }

//     // Attach all relevant details to req.staff
//     req.staff = {
//       id: staff.id,
//       staff_id: staff.id,
//       fooder_id: staff.fooder_id,
//       name: staff.name,
//       username: staff.username,
//       email: staff.email,
//       type: staff.type,
//       status: staff.status,
//       permissions: (() => {
//         try {
//           return staff.app_permission ? JSON.parse(staff.app_permission) : {};
//         } catch {
//           return {};
//         }
//       })(),
//       app_permission: staff.app_permission,
//       gstin: staff.gstin,
//       fssai_number: staff.fssai_number,
//       open_time: staff.open_time,
//       close_time: staff.close_time,
//       // add any other fields you want to expose
//     };
//     next();
//   } catch (error) {
//     console.error('Auth middleware error:', error);
//     return res.status(401).json({ success:false, message: 'Not authorized' });
//   }
// };

// const protect = async (req, res, next) => {
//   let token;
//   if (
//     req.headers &&
//     req.headers.authorization &&
//     req.headers.authorization.startsWith("Bearer")
//   ) {
//     token = req.headers.authorization.split(" ")[1];
//   } else if (req.headers && req.headers.authorization) {
//     token = req.headers.authorization;
//   } else if (req.cookies && req.cookies.token) {
//     token = req.cookies.token;
//   }

//   if (!token) {
//     return res.status(401).send({
//       status: "fail",
//       message: "you are not logged in! please log in to get access!!",
//     });
//   }
//   const connection = await pool.getConnection();
//   try {
//     const decoded = jwt.verify(token, process.env.JWT_SECRET);

//     if (!decoded) {
//       return res.status(401).send({
//         status: "fail",
//         message: "unauthorized",
//       });
//     }

//     const [user] = await connection.query(
//       "select fooder_id,plan_id,name,gstin,fssai_number,gst_type,status_order_ready_sms_enable,order_sms_notification_enable_eater,status_order_ready_enable,allow_order_push_notification,open_time,close_time,is_approved from fooders where fooder_id = ?",
//       [decoded.fooder_id]
//     );
//     connection.release();

//     if (!user || (user && !user[0])) {
//       return res.status(401).send({
//         status: "fail",
//         message: "user belonging to this token does no longer exist",
//       });
//     }

//     // if (user[0].is_approved !== 2) {
//     //   return res.status(401).send({
//     //     status: "fail",
//     //     message: "Access Denied!!!",
//     //   });
//     // }

//     if (decoded.staff_id) {

//       // console.log("Access Denied!!!")
//       const staffQuery = `SELECT COUNT(*) AS count FROM fooder_staff WHERE id = ? AND status = 1 AND (type = 9 OR type = 2) LIMIT 1`;
//       const [staffResult] = await connection.query(staffQuery, [decoded.staff_id]);

//       // if (staffResult[0].count == 0) {
//       //   return res.status(401).send({
//       //     status: "fail",
//       //     message: "Access Denied!!!",
//       //   });
//       // }
//     }


//     req.user = user[0];
//     // res.locals.user = user[0];
//     req.user.staff_id = decoded.staff_id

//     next();
//   } catch (err) {
//     if (connection) {
//       connection.release();
//       console.log("Error in auth middleware:", err);
//     }
//     return res.status(500).send({
//       status: "false",
//       error: err.toString(),
//       message: "Internal server error",
//     });
//   }
// };


module.exports = { protect };