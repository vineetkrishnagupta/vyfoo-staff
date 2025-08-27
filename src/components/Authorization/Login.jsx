import { useState } from "react";
import axiosInstance from "../../utlis/axiosinstance";
import { Link, useNavigate } from "react-router-dom";
import Toaster from "../../utlis/Toaster";
import { loginAPI } from "../../BaseURL/baseURL";
import { useAuth } from '../../AuthContext';
import { saveAppDataToDB, clearAppDataFromDB } from '../../utlis/indexedDB';

import logo from './img/vyfoo_logo.png'

const Login = () => {
  const [formData, setFormData] = useState({ username: "", password: "" });
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const { setUser } = useAuth();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError(""); // clear error when typing
  };

const handleLogin = async (e) => {
  e.preventDefault();

  // Field-specific validation
  if (!formData.username) {
    Toaster.warning("Please enter the username");
    return;
  }

  if (!formData.password) {
    Toaster.warning("Please enter the password");
    return;
  }

  try {
    setLoading(true);
    const response = await axiosInstance.post(loginAPI, formData);

    if (response.data.success) {
      setUser(response.data.data.staff);
      const successMsg = response.data.message || "Login successful!";
      Toaster.success(successMsg);

      // 1. Clear old cache
      await clearAppDataFromDB();

      // 2. Fetch all products and cache
      const allProductsRes = await axiosInstance.get('/api/products/all');
      const data = allProductsRes.data;
      const appData = {
        Fooder_name2: data.Fooder_name2,
        billing_notes: data.billing_notes,
        f_address: data.f_address,
        f_city: data.f_city,
        f_landline: data.f_landline,
        f_state: data.f_state,
        f_zipcode: data.f_zipcode,
        fooder_gstin: data.fooder_gstin,
        fooder_id: data.fooder_id,
        fooder_name: data.fooder_name,
        fssai_number: data.fssai_number,
        menus: data.menus,
        product: data.product,
        property: data.property,
        service_charge_details: data.service_charge_details,
        waiterDetails: data.waiterDetails,
        enable_silent_printing: data.enable_silent_printing || 0,
        fooder_logo: data.fooder_logo || "",
        app_permission: data.app_permission,
        kot_items_delete: data.kot_items_delete,
        round_off_amount: data.round_off_amount,
        staff_type: data?.staff_type,
         staff_name:data.staff_name,
         alertify_id: data.alertify_id,
      };
      await saveAppDataToDB(appData);

      // window.location.href = '/pos'

      navigate("/pos");
    }
  } catch (err) {
    // Handle network errors or HTTP status != 200
const errorMsg = err.response?.data?.error || 
                    err.response?.data?.message || 
                    "An error occurred. Please try again.";
    Toaster.error(errorMsg)
  } finally {
    setLoading(false);
  }
};


  return (
    <div className="container d-flex justify-content-center align-items-center vh-100">
      <div className="card p-4 shadow" style={{ maxWidth: "400px", width: "100%" }}>
        <center>
                  <img  className="text-center mb-4"src={logo} style={{width:"160px"}} alt="" />

        </center>
 
        {error && <div className="alert alert-danger">{error}</div>}
        <form onSubmit={handleLogin}>
          <div className="mb-3" style={{fontSize:"14px"}}>
            <label>Username</label>
            <input
              
              name="username"
              className="form-control"
              placeholder="Enter the username"
              value={formData.username}
              onChange={handleChange}
              autoComplete="username"
            />
          </div>

          <div className="mb-3" style={{fontSize:"14px"}}>
            <label>Password</label>
            <input
              type="password"
              name="password"
              className="form-control"
              placeholder="Enter the password"
              value={formData.password}
              onChange={handleChange}
              autoComplete="current-password"
            />
          </div>

       <button type="submit" className="btn btn-primary w-100" disabled={loading}>
  {loading ? "Logging in..." : "Login"}
</button>

<div style={{ 
  display: "flex", 
  flexDirection: "column", 
  alignItems: "center", 
  justifyContent: "center", 
  textAlign: "center", 
  marginTop: "20px",
  fontFamily: "Arial, sans-serif",
  color: "#444"
}}>
  {/* <span style={{ fontSize: "12px", fontWeight: "500" }}>
    VYFOO Version: <span style={{ color: "#000" }}>v1.0</span>
  </span> */}
  <span style={{ marginTop: "8px", fontSize: "14px" }}>

  <strong>VYFOO Version: <span style={{color:"#000"}}>v1.0</span></strong><br/>
      © {new Date().getFullYear()}<br/><strong style={{fontSize:"12px"}}> <Link to="https://vyqda.com/" target="_blank" rel="noopener noreferrer" className="vyqda-link">Vyqda</Link> Technologies Pvt. Ltd. All Rights Reserved.</strong>
  </span>
</div>




        </form>
      </div>
    </div>
  );
};

export default Login;

