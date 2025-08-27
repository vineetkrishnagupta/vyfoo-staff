import React, { useEffect, useState } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import Dashboard from "./components/Dashboard";
import "./App.css";
import Login from "./components/Authorization/Login";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { AuthProvider, useAuth } from "./AuthContext";
import LiveOrder from "./components/LiveOrder";
import Kot from "./components/Kot";
import { SocketProvider } from "./SocketContext";
import Reporting from "./components/Reporting/Reportings";
import SalesReports from "./components/Reporting/SalesReport";
import GstReports from "./components/Reporting/GstReports";
import ItemReport from "./components/Reporting/itemReport";
import CustomisedSalesReport from "./components/Reporting/CustomisedSalesReport";
import OrderReport from "./components/Reporting/OrderReport";
import CouponsReport from "./components/Reporting/CouponsReport";
import {getAppDataFromDB} from "./utlis/indexedDB.js";

// Add this function to update the alertify script
const updateAlertifyScript = (alertifyId) => {
  if (!alertifyId) return;
  
  const existingScript = document.getElementById("alertify-notifier-script");
  if (existingScript) {
    // Update existing script src
    const baseUrl = "https://alertify.live/notifier.js?data=";
    existingScript.src = `${baseUrl}${alertifyId}`;
    console.log("Updated alertify script with ID:", alertifyId);
  } else {
    // Create new script if it doesn't exist
    const script = document.createElement("script");
    script.src = `https://alertify.live/notifier.js?data=${alertifyId}`;
    script.defer = true;
    script.id = "alertify-notifier-script";
    document.head.appendChild(script);
    console.log("Created new alertify script with ID:", alertifyId);
  }
};

function ProtectedRoute({ children, allowedRoles }) {
  const { user, loading } = useAuth();
  const [staffType, setStaffType] = useState(null);
  const [fetching, setFetching] = useState(true); // track IndexedDB fetching state

  useEffect(() => {
    let isMounted = true;
    let retryCount = 0;
    const maxRetries = 5;
    const retryDelay = 1000; // 1 second

    const fetchAppData = async () => {
      try {
        const appData = await getAppDataFromDB();
        if (appData && isMounted) {
          setStaffType(appData.staff_type);
          setFetching(false);
          console.log("App Data from IndexedDB:", appData);
          
          // Update alertify script with alertify_id from IndexedDB
          if (appData.alertify_id) {
            updateAlertifyScript(appData.alertify_id);
          }
          
        } else if (!appData && retryCount < maxRetries && isMounted) {
          retryCount++;
          console.log(`Retrying to fetch app data (${retryCount}/${maxRetries})...`);
          setTimeout(fetchAppData, retryDelay);
        } else {
          setFetching(false); // stop retrying
        }
      } catch (err) {
        console.error("Failed to fetch app data from IndexedDB:", err);
        if (retryCount < maxRetries && isMounted) {
          retryCount++;
          setTimeout(fetchAppData, retryDelay);
        } else {
          setFetching(false);
        }
      }
    };

    fetchAppData();

    return () => {
      isMounted = false;
    };
  }, []);

  //  Show loader if IndexedDB data is still being fetched or if auth is loading
  if (loading || fetching || staffType === null) {
    return (
      <div className="d-flex justify-content-center align-items-center vh-100">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  //  Not logged in
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  //  Role not allowed
  if (allowedRoles && !allowedRoles.includes(staffType)) {
    return <Navigate to="/login" replace />;
  }

  //  All good, render protected content
  return children;
}

function AppRoutes() {
  const { loading, user } = useAuth();
  console.log(user);
  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center vh-100">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }
  return (
    <div className="App">
      <ToastContainer
        position="top-right"
        autoClose={3000}
        style={{ zIndex: 20000, fontSize: 16 }} // 👈 way above Bootstrap modals
      />

      <SocketProvider>
        <Routes>
          <Route
            path="/pos"
            element={
              <ProtectedRoute allowedRoles={[0, 1]}>
                <Dashboard />
              </ProtectedRoute>
              }
            />

          <Route
            path="/kot"
            element={
              <ProtectedRoute allowedRoles={[0, 1]}>
                <Kot />
              </ProtectedRoute>
            }
          />

          <Route
            path="/live-order"
            element={
              <ProtectedRoute allowedRoles={[1]}>
                <LiveOrder />
              </ProtectedRoute>
            }
          />

          <Route
            path="/reports"
            element={
              <ProtectedRoute allowedRoles={[1]}>
                <Reporting />
              </ProtectedRoute>
            }
          />

          <Route
            path="/sales-report"
            element={
              <ProtectedRoute allowedRoles={[1]}>
                <SalesReports />
              </ProtectedRoute>
            }
          />

          <Route
            path="/gst-report"
            element={
              <ProtectedRoute allowedRoles={[1]}>
                <GstReports />
              </ProtectedRoute>
            }
          />

          <Route
            path="/item-report"
            element={
              <ProtectedRoute allowedRoles={[1]}>
                <ItemReport />
              </ProtectedRoute>
            }
          />

          <Route
            path="/customised-sales-report"
            element={
              <ProtectedRoute allowedRoles={[1]}>
                <CustomisedSalesReport />
              </ProtectedRoute>
            }
          />

          <Route
            path="/order-report"
            element={
              <ProtectedRoute allowedRoles={[1]}>
                <OrderReport />
              </ProtectedRoute>
            }
          />

          <Route
            path="/coupon-report"
            element={
              <ProtectedRoute allowedRoles={[1]}>
                <CouponsReport />
              </ProtectedRoute>
            }
          />

          <Route
            path="/login"
            element={!user ? <Login /> : <Navigate to="/pos" replace />}
          />
        </Routes>
      </SocketProvider>
    </div>
  );
}

function App() {

  // const [screenChecked, setScreenChecked] = useState(false);
  // const [isDesktop, setIsDesktop] = useState(false);

  // // ✅ Screen resize check
  // useEffect(() => {
  //   const checkScreenSize = () => {
  //     setScreenChecked(false); // resize hote hi loader dikhana
  //     setTimeout(() => {
  //       const width = window.innerWidth;
  //       setIsDesktop(width >= 768); // >= 768 px allow
  //       setScreenChecked(true);
  //     }, 300);
  //   };

  //   checkScreenSize(); // initial check
  //   window.addEventListener("resize", checkScreenSize);

  //   return () => window.removeEventListener("resize", checkScreenSize);
  // }, []);


  // Add useEffect to handle alertify script on app initialization
  useEffect(() => {
    const initializeAlertify = async () => {
      try {
        const appData = await getAppDataFromDB();
        if (appData && appData.alertify_id) {
          updateAlertifyScript(appData.alertify_id);
        }
      } catch (err) {
        console.error("Failed to initialize alertify script:", err);
      }
    };

    initializeAlertify();
  }, []);

    // ⏳ Loader jab tak screen size confirm nahi hota
  // if (!screenChecked) {
  //   return (
  //     <div className="d-flex justify-content-center align-items-center vh-100">
  //       <div className="spinner-border text-primary" role="status">
  //         <span className="visually-hidden">Loading...</span>
  //       </div>
  //     </div>
  //   );
  // }

  // // ❌ Agar screen < 768px hai to block
  // if (!isDesktop) {
  //   return (
  //     <div style={{ textAlign: "center", marginTop: "100px" }}>
  //       <h1>Welcome to VYFOO!</h1>
  //       <p style={{ fontSize: "15px" }}>
  //         This POS system is designed for Web Application.
  //       </p>
  //       <p style={{ fontSize: "15px" }}>
  //         Please open this on a larger device.
  //       </p>
  //     </div>
  //   );
  // }

  return (
    <Router>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </Router>
  );
}

export default App;