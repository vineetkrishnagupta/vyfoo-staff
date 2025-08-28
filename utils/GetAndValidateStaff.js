async function getAndValidateStaff(req, connection, passcode, allowedUsers = process.env.allowedUsers || []) {
  const [rows] = await connection.query(
    `SELECT id AS staff_id, fooder_id, name AS staff_name, type AS staff_role, status 
     FROM fooder_staff 
     WHERE pass_code = ? AND fooder_id = ?`,
    [passcode, req.staff.fooder_id]
  );

  if (rows.length === 0) {
    return { error: { code: 404, message: 'Staff not found' } };
  }
  if (rows.length > 1) {
    return { error: { code: 500, message: 'Multiple staff found' } };
  }

  const staff = rows[0];

  if (Number(staff.status) === 0) {
    return { error: { code: 403, message: 'Your account is inactive' } };
  }

  if (!allowedUsers.includes(Number(staff.staff_role))) {
    return { error: { code: 403, message: 'You are not allowed to login' } };
  }

  return { staff };
};

module.exports = { getAndValidateStaff };