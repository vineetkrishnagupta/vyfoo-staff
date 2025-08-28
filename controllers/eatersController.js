const db = require("../config/db");


exports.getEatersDetails = async (req, res) => {
  const { eater_phonenumber } = req.query;
  if (!eater_phonenumber) {
    return res.status(400).send({
      status: "fail",
      message: "Phone number is required!",
    });
  }
  const connection = await db.getConnection();

  try {
    const checkEatersDetailsQuery = `select eater_id,name,address,mobile from eaters where mobile = ?`;

    const [checkEatersDetailsResult] = await connection.query(
      checkEatersDetailsQuery,
      [eater_phonenumber]
    );
    if (checkEatersDetailsResult && checkEatersDetailsResult.length === 0) {
      connection.release();

      return res
        .status(200)
        .send({ status: "success", message: "New Customer" });
    }
    connection.release();

    return res.status(200).send({
      status: "success",
      message: "Existing customer",
      data: checkEatersDetailsResult[0],
    });
  } catch (error) {
    // console.log(error);
    if (connection) {
      connection.release();
    }
    console.log(error);
    res.status(500).json({
      message: "Internal server error",
      errors: error.toString(),
    });
  }
};

exports.updateEaterDetails = async (req, res) => {
  const connection = await db.getConnection();

  try {


    const fooder_id = req.staff.fooder_id;
    const { name, mobile, address, order_id, eater_suggestions } = req.body


    const [result] = await connection.query(
      `UPDATE orders SET  eater_name = ?,  address = ?, eater_phonenumber = ?, eater_suggestions = ? where fooder_id = ? AND id = ?`,
      [name, address, mobile, eater_suggestions, fooder_id, order_id]
    );
    connection.release();
    return res.status(200).send({
      status: "success",
      message: "Updated Successfully",
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
