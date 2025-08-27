import React, { useEffect, useState } from "react";
import { FaBars } from "react-icons/fa";
import { Link } from "react-router-dom";
import {getAppDataFromDB} from "../utlis/indexedDB.js"
import vyfoo_logo from './Authorization/img/vyfoo_logo.png'

function MainHeader({ toggleSidebar }) {
  const [foodeName, setFooderName] = useState("");
   const [staffType, setStaffType] = useState(null);
   const [staffName,setStaffName] = useState(null);


     useEffect(() => {
       let isMounted = true;
       let retryCount = 0;
       const maxRetries = 5;
       const retryDelay = 1000; // 1 second
     
       const fetchAppData = async () => {
         try {
           const appData = await getAppDataFromDB();
           if (appData && isMounted) {
            setFooderName(appData.fooder_name);
            setStaffType(appData.staff_type);
            setStaffName(appData.staff_name);
           
             console.log("App Data from IndexedDB:", appData);
           } else if (!appData && retryCount < maxRetries && isMounted) {
           
             retryCount++;
             console.log(`Retrying to fetch app data (${retryCount}/${maxRetries})...`);
             setTimeout(fetchAppData, retryDelay);
           }
         } catch (err) {
           console.error("Failed to fetch app data from IndexedDB:", err);
           // Retry on error as well
           if (retryCount < maxRetries && isMounted) {
             retryCount++;
             setTimeout(fetchAppData, retryDelay);
           }
         }
       };
   
       fetchAppData();
   
       // Also listen for custom events when IndexedDB data changes
       const handleIndexedDBUpdate = (event) => {
         if (isMounted) {
           const appData = event.detail;
           if (appData) {
             setAppPermission(appData.app_permission);
             setKotitemsdelete(appData.kot_items_delete);
             setRoundOffAmountDB(appData.round_off_amount);
             setStaffType(appData.staff_type);
             
             console.log("App Data updated via event:", appData);
           }
         }
       };
   
       window.addEventListener('indexedDBUpdated', handleIndexedDBUpdate);
       
       // Cleanup
       return () => {
         isMounted = false;
         window.removeEventListener('indexedDBUpdated', handleIndexedDBUpdate);
       };
     }, []);
  
  return (
    <>  
    <style>{`
        .pos-btn-custom {
          background-color: #F59E0B; /* Bootstrap warning color */
          color: #000; /* text-dark */
          transition: background-color 0.3s ease;
        }

        .pos-btn-custom:hover {
          background-color: #EA580C !important; /* Custom orange on hover */
          color: #fff !important; /* Optional: white text on hover */
        }
      `}</style>
    <nav
      className="navbar navbar-expand-lg px-3  fixed-top border-bottom"
      style={{ backgroundColor: "#FFFFFF", height: "80px", zIndex: 1100 ,paddingBlock:"32px", }}
    >
      <div className="container-fluid d-flex justify-content-between align-items-center py-3">
        <div className="d-flex align-items-center gap-3 ">
          {/* <i
            className="bi bi-list text-black fs-3 fw-bold"
            style={{ cursor: "pointer", fontWeight: "bold" }}
            role="button"
            onClick={toggleSidebar}
          ></i> */}
          <FaBars className="fs-5"
            style={{ cursor: "pointer", fontWeight: "bold" }}
            role="button"
            onClick={toggleSidebar}
          />

          {/* <span className="text-black fw-bold fs-5">
            VYFOOd
          </span> */}
          <img src={vyfoo_logo} style={{width:"120px"}} alt="" />
          <span className="text-black fw-semibold  fs-5" style={{fontWeight:"400"}}>
            <span className="text-black">Hello</span>, {foodeName}
          </span>
        </div>

        
         
          <Link className="btn btn-sm  fw-semibold  px-2 py-2 pos-btn-custom" style={{backgroundColor:"#f59e0b", color:"#fff"}} to="/pos">
            <i className="bi bi-pc-display-horizontal  pr-2"></i> <span className="ps-2">POS</span>
          </Link>
      
        <div className="d-flex align-items-center flex-column ">
           <h5 className="fw-bold fs-5 p-0" style={{ padding: "0px", margin: "0px" }}>
  {staffType === 1 ? "Cashier" : "Waiter"}
</h5>

          <span className="fs-6">{staffName}</span>
        </div>
      </div>
    </nav>
    </>
  );
}

export default MainHeader;
