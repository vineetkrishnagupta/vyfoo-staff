const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');
const bcrypt = require('bcryptjs');
const pool = require('../config/db');

const login = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { username, password } = req.body;
    // Join fooder_staff and fooders
    const [rows] = await pool.execute(
      `SELECT fs.*, fs.status as isActive, f.plan_id, f.is_approved
       FROM fooder_staff fs
       JOIN fooders f ON fs.fooder_id = f.fooder_id
       WHERE fs.username = ?`,
      [username]
    );
    const staff = rows[0] || null;

    if (!staff) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Check if fooder has paid plan
    if (staff.plan_id != 4) {
      return res.status(403).json({
        success: false,
        message: 'Fooder does not have a paid plan'
      });
    }

    // Check if fooder is approved
    if (staff.is_approved != 2) {
      return res.status(403).json({
        success: false,
        message: 'Fooder id is not approved'
      });
    }

    // Check if account is inactive
    if (staff.status === 0) {
      return res.status(403).json({
        success: false,
        message: 'Your account is inactive'
      });
    }

    // Check allowed users from env
    const allowedUsers = (process.env.allowedUsers || '');
    if (!allowedUsers.includes(Number(staff.type))) {
      return res.status(403).json({
        success: false,
        message: 'You are not allowed to login'
      });
    }

    let hashedPassword = staff.password;
    if (hashedPassword.startsWith('$2y$')) {
      hashedPassword = '$2a$' + hashedPassword.slice(4);
    }
    const isMatch = await bcrypt.compare(password, hashedPassword);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    const tokenPayload = {
      id: staff.id,
      staff_id: staff.id,
      fooder_id: staff.fooder_id,
      permissions: staff.app_permission || {}
    };

    const token = jwt.sign(tokenPayload, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRE
    });

    const options = {
      expires: new Date(Date.now() + process.env.JWT_COOKIE_EXPIRE * 24 * 60 * 60 * 1000),
      httpOnly: true,
      sameSite: 'None',
      secure: true
    };

    res
      .status(200)
      .cookie('token', token, options)
      .json({
        success: true,
        message: 'Login successfully',
        data: {
          staff: {
            id: staff.id,
            staff_id: staff.id,
            fooder_id: staff.fooder_id,
            name: staff.name,
            username: staff.username,
            role: 'staff',
            permissions: staff.app_permission || {}
          }
        }
      });

  } catch (error) {
    next(error);
  }
};

const getMe = async (req, res, next) => {
  try {
    const [rows] = await pool.execute(
      'SELECT * FROM fooder_staff WHERE id = ?',
      [req.staff.id]
    );
    const staff = rows[0] || null;
    res.status(200).json({
      success: true,
      data: {
        staff: {
          id: staff.id,
          fooder_id: staff.fooder_id,
          name: staff.name,
          email: staff.email,
          staff_type: staff.type,
          username: staff.username,
          role: staff.role,
          isActive: staff.isActive,
          createdAt: staff.createdAt
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

const logout = async (req, res, next) => {
  try {
    res.cookie('token', 'none', {
      expires: new Date(Date.now() + 10 * 1000), // expire in 10s
      httpOnly: true,
      secure: true,              // match original cookie
      sameSite: 'None',          // match original cookie
      path: '/',                 // match original cookie path
    });
    res.status(200).json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (error) {
    next(error);
  }
};


module.exports = {
  login,
  getMe,
  logout
}; 