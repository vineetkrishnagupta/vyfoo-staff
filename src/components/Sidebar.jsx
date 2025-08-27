import React from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../AuthContext";
import Reporting from "./Reporting/Reportings";

const sidebarItems = [
  { icon: 'cart-check', label: 'Live Orders', path: '/live-order' },
 { icon: 'clipboard-data', label: 'Reports', path: '/reports' },

  
];

const Sidebar = ({ isOpen }) => {
  const location = useLocation();
  const { logout } = useAuth();

  const handleLogout = () => {
    logout();
  };

  return (
//     <div
//       className="vh-100 position-fixed top-0 start-0 border-end d-flex flex-column align-items-start custom-scroll"
      
//       style={{
//         width: isOpen ? "200px" : "60px",
//          height: "calc(100vh - 66px)",
//         backgroundColor: isOpen ? "#f4f5f7" : "#ffffff",
//         overflowX: "hidden",
//         transition: "all 0.3s ease",
//         zIndex: 1050,
//         marginTop: "66px", // below header
//       }}
//     >
//       <div className="p-2 w-100">
//         <ul className="nav flex-column gap-1">
//           {sidebarItems.map(({ icon, label, path }) => {
//             {/* const isActive = location.pathname === path; */}
//            const isActive =
//   location.pathname === path ||
//   (path === '/reports' &&
//     (location.pathname === '/sales-report' || location.pathname === '/gst-report' || location.pathname === '/customised-sales-report' || location.pathname === '/item-report' || location.pathname === '/order-report' || location.pathname === '/coupon-report'));



//             return (
//               <li key={label}>
//                            <Link
//   to={path}
//   className="nav-link d-flex align-items-center rounded-pill fw-semibold"
//   style={{
//     color: isActive ? "#ffcd57" : "#212529", // text-warning or text-dark
//     backgroundColor: isActive ? "#ffffff" : "transparent" // bg-light or none
//   }}
// >
//   <i className={`bi bi-${icon} me-2 fs-5`}></i>
//   {isOpen && <span>{label}</span>}
// </Link>
//               </li>
//             );
//           })}
          
//           {/* Logout button */}
//           <li>
//             <button
//               onClick={handleLogout}
//               className="nav-link d-flex align-items-center rounded-pill fw-semibold text-dark border-0 bg-transparent w-100 text-start"
//               style={{ cursor: 'pointer' }}
//             >
//               <i className="bi bi-box-arrow-right me-2 fs-5"></i>
//               {isOpen && <span>Logout</span>}
//             </button>
//           </li>
//         </ul>
//       </div>

      
//  <div
//     style={{
//       padding: "12px 0",
//       textAlign: "center",
//       fontFamily: "Arial, sans-serif",
//       fontSize: "12px",
//       color: "#444",
//       width: "100%",
//     }}
//   >
//     {isOpen && (
//       <>
//         <div>
//           <strong>VYFOO Version:</strong>{" "}
//           <span style={{ color: "#000" }}>v1.0</span>
//         </div>
//         <div style={{ marginTop: "4px" }}>
//           Copyright <span style={{ color: "red" }}>@</span> 2025
//         </div>
//       </>
//     )}
//   </div>
// </div>
   
<div
  className="position-fixed top-0 start-0 border-end custom-scroll"
  style={{
    width: isOpen ? "220px" : "60px",
    height: "calc(100vh - 80px)",
    marginTop: "80px", // below topbar
    backgroundColor: isOpen ? "#FFFFFF" : "#ffffff",
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
    transition: "all 0.3s ease",
    zIndex: 1050,
    overflowX: "hidden",
  }}
>
  {/* Main nav content */}
  <div className="p-2 w-100" style={{ flex: 1 }}>
    <ul className="nav flex-column gap-1">
      {sidebarItems.map(({ icon, label, path }) => {
        const isActive =
          location.pathname === path ||
          (path === "/reports" &&
            [
              "/sales-report",
              "/gst-report",
              "/customised-sales-report",
              "/item-report",
              "/order-report",
              "/coupon-report",
            ].includes(location.pathname));

        return (
          <li key={label}>
            <Link
              to={path}
              className="nav-link d-flex align-items-center  rounded-pill fw-semibold "
              style={{
                cursor: "pointer",
                fontSize:"16px",
                color: isActive ? "#F59E0B" : "#212529",
                backgroundColor: isActive ? "#ffffff" : "transparent",
              }}
            >
              <i className={`bi bi-${icon} me-2 fs-5`}></i>
              {isOpen && <span className="">{label}</span>}
            </Link>
          </li>
        );
      })}

      {/* Logout */}
      <li>
        <button
          onClick={handleLogout}
          className="nav-link d-flex align-items-center rounded-pill fw-semibold text-dark border-0 bg-transparent w-100 text-start"
          style={{ cursor: "pointer", fontSize: "16px" }}
        >
          <i className="bi bi-box-arrow-right me-2 " ></i>
          {isOpen && <span>Logout</span>}
        </button>
      </li>
    </ul>
  </div>

  {/* Footer fixed at bottom */}
  <div
    style={{
      padding: "10px 0",
      textAlign: "center",
      fontFamily: "Arial, sans-serif",
      fontSize: "12px",
      color: "#444",
      width: "100%",
    }}
  >
    {isOpen && (
      <>
        <div>
        
        </div>
        <div style={{ marginTop: "4px" }}>
        <strong>VYFOO Version: <span style={{color:"#000"}}>v1.0</span></strong><br/>
   © {new Date().getFullYear()}
      <br/><strong style={{fontSize:"10px"}}> <Link to="https://vyqda.com/" target="_blank" rel="noopener noreferrer" className="vyqda-link">Vyqda</Link> Technologies Pvt. Ltd. All Rights Reserved.</strong>
        </div>
      </>
    )}
  </div>
</div>



  );
};

export default Sidebar;
