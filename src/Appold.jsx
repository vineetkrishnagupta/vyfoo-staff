// import React from 'react';
// import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
// import Dashboard from './components/Dashboard';
// import './App.css';
// import Login from './components/Authorization/Login';
// import { ToastContainer } from "react-toastify";
// import "react-toastify/dist/ReactToastify.css";
// import { AuthProvider, useAuth } from './AuthContext';
// import LiveOrder from './components/LiveOrder';
// // import Reports from './components/Reports';
// import Kot from './components/Kot';
// import { SocketProvider } from "./SocketContext";
// import Reporting from  "./components/Reporting/Reportings";
// import SalesReports from './components/Reporting/SalesReport';
// import GstReports from './components/Reporting/GstReports';
// import ItemReport from './components/Reporting/itemReport';
// import CustomisedSalesReport from './components/Reporting/CustomisedSalesReport';
// import OrderReport from './components/Reporting/OrderReport';
// import CouponsReport from './components/Reporting/CouponsReport';

// function ProtectedRoute({ children }) {
//   const { user, loading } = useAuth();
//   if (loading) {
//     return (
//       <div className="d-flex justify-content-center align-items-center vh-100">
//         <div className="spinner-border text-primary" role="status" >
//           <span className="visually-hidden">Loading...</span>
//         </div>
//       </div>
//     );
//   }
//   return user ? children : <Navigate to="/login" replace />;
// }

// function AppRoutes() {
//   const { loading, user } = useAuth();
//   // console.log(user);
//   if (loading) {
//     return (
//       <div className="d-flex justify-content-center align-items-center vh-100">
//         <div className="spinner-border text-primary" role="status" >
//           <span className="visually-hidden">Loading...</span>
//         </div>
//       </div>
//     );
//   }
//   return (
//     <div className="App">

//     <ToastContainer
//         position="top-right"
//         autoClose={3000}

//         style={{ zIndex: 20000 }} // 👈 way above Bootstrap modals
//       />

//       <SocketProvider>
//         <Routes>
//           <Route path="/pos" element={
//             <ProtectedRoute>
//               <Dashboard />
//             </ProtectedRoute>
//           } />
//           <Route path="/live-order" element={
//             <ProtectedRoute>
//               <LiveOrder />
//             </ProtectedRoute>
//           } />

//           <Route path="/reports" element={
//             <ProtectedRoute>
//               <Reporting/>
//             </ProtectedRoute>
//           } />

//             <Route path="/sales-report" element={
//             <ProtectedRoute>
//               <SalesReports/>
//             </ProtectedRoute>
//           } />

//              <Route path="/gst-report" element={
//             <ProtectedRoute>
//               <GstReports/>
//             </ProtectedRoute>
//           } />

//              <Route path="/item-report" element={
//             <ProtectedRoute>
//               <ItemReport/>
//             </ProtectedRoute>
//           } />

//               <Route path="/customised-sales-report" element={
//             <ProtectedRoute>
//               <CustomisedSalesReport/>
//             </ProtectedRoute>
//           } />

//              <Route path="/order-report" element={
//             <ProtectedRoute>
//               <OrderReport/>
//             </ProtectedRoute>
//           } />

//             <Route path="/coupon-report" element={
//             <ProtectedRoute>
//               <CouponsReport/>
//             </ProtectedRoute>
//           } />

//           <Route path="/kot" element={
//             <ProtectedRoute>
//               <Kot />
//             </ProtectedRoute>
//           } />

//           <Route path="/login" element={!user ? <Login /> : <Navigate to="/pos" replace />} />
//         </Routes>
//       </SocketProvider>
//     </div>
//   );
// }

// function App() {
//   return (
//     <Router>
//       <AuthProvider>
//         <AppRoutes />
//       </AuthProvider>
//     </Router>
//   );
// }

// export default App;

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
// import Reports from './components/Reports';
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

// function ProtectedRoute({ children }) {
//   const { user, loading } = useAuth();
//   if (loading) {
//     return (
//       <div className="d-flex justify-content-center align-items-center vh-100">
//         <div className="spinner-border text-primary" role="status" >
//           <span className="visually-hidden">Loading...</span>
//         </div>
//       </div>
//     );
//   }
//   return user ? children : <Navigate to="/login" replace />;
// }

// function ProtectedRoute({ children, allowedRoles }) {
//   const { user, loading } = useAuth();

//   if (loading) {
//     return (
//       <div className="d-flex justify-content-center align-items-center vh-100">
//         <div className="spinner-border text-primary" role="status">
//           <span className="visually-hidden">Loading...</span>
//         </div>
//       </div>
//     );
//   }

//   console.log("users",user,"laoding",loading,"allowed roles",allowedRoles)

//   if (!user) {
//     return <Navigate to="/login" replace />;
//   }

//   console.log("Result",!allowedRoles.includes(user?.staff_type))

//   if (allowedRoles && !allowedRoles.includes(user?.staff_type)) {
//     return children;
//   }
  
//   //  <Navigate to="/login" />;

// }


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
        {/* <Routes>
          <Route path="/pos" element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          } />
          <Route path="/live-order" element={
            <ProtectedRoute>
              <LiveOrder />
            </ProtectedRoute>
          } />

          <Route path="/reports" element={
            <ProtectedRoute>
              <Reporting/>
            </ProtectedRoute>
          } />

            <Route path="/sales-report" element={
            <ProtectedRoute>
              <SalesReports/>
            </ProtectedRoute>
          } />

             <Route path="/gst-report" element={
            <ProtectedRoute>
              <GstReports/>
            </ProtectedRoute>
          } />

             <Route path="/item-report" element={
            <ProtectedRoute>
              <ItemReport/>
            </ProtectedRoute>
          } />

              <Route path="/customised-sales-report" element={
            <ProtectedRoute>
              <CustomisedSalesReport/>
            </ProtectedRoute>
          } />

             <Route path="/order-report" element={
            <ProtectedRoute>
              <OrderReport/>
            </ProtectedRoute>
          } />

            <Route path="/coupon-report" element={
            <ProtectedRoute>
              <CouponsReport/>
            </ProtectedRoute>
          } />

          <Route path="/kot" element={
            <ProtectedRoute>
              <Kot />
            </ProtectedRoute>
          } />


          <Route path="/login" element={!user ? <Login /> : <Navigate to="/pos" replace />} />
        </Routes> */}

        <Routes>
          {/* <Route
            path="/pos"
            element={
              <ProtectedRoute allowedRoles={[0, 1]}>
                <Dashboard />
              </ProtectedRoute>
            }
          /> */}

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
  return (
    <Router>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </Router>
  );
}

export default App;
