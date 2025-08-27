import React, { useEffect, useState } from 'react';
import { FaBars } from 'react-icons/fa';
import { useAuth } from '../AuthContext';
import { Modal, Button } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { switchTable } from '../utlis/switchTable';
import LoadingModal from '../utlis/LoadingModal';
import {getAppDataFromDB} from "../utlis/indexedDB";

const Header = ({
  currentMode,
  setCurrentMode,
  selectedTable,
  setCurrentView,
  currentView,
  onSwitchTable,
  showChangeTable,
  tblCategoryDetails = [],
  onTableClick,
  
  onNewOrders, // <-- add this prop
  onModeWithPasscode, // <-- add this prop
  orderItems = [], // <-- add this prop
  orderId, // <-- add this prop
  setSelectedTable, // <-- add this prop
  isNC,
  setIsNC,
  setSearchTerm,
  orderNo
}) => {
  const modes = ['DINE IN', 'DELIVERY', 'COUNTER'];
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showTableModal, setShowTableModal] = useState(false);
  const { logout } = useAuth();
  const [loading, setLoading] = useState(false);
   const [hoveredMode, setHoveredMode] = useState(null);
     const [foodeName, setFooderName] = useState("");
      const [staffType, setStaffType] = useState(null);
       const [staffName,setStaffName] = useState(null);

  const currentDateTime = new Date();
  
  const formattedDate = currentDateTime.toLocaleDateString('en-US', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const formattedTime = currentDateTime.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });

  

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
      {/* Header */}
     <header className="pos-header px-4 py-3 bg-white border-bottom position-relative" style={{ zIndex: 1030 }}>
  {/* Main Header Row */}
  <div className="d-flex align-items-center justify-content-between flex-wrap gap-3">
    
    {/* Left Section - Menu Icon + Title */}
    <div className="d-flex align-items-center gap-2">
      <button
        className="btn btn-link p-2"
        onClick={() => setIsSidebarOpen(true)}
        aria-label="Menu"
      >
        <FaBars className="fs-5" />
      </button>
      <h1 className="h5 mb-0 fw-semibold text-dark">Hello, {foodeName}</h1>
     
    </div>
    

    {/* Center Section - Action Buttons (New Orders / KOT) */}
    {currentView !== 'tables' && (
      <div className="d-flex align-items-center gap-2">
        {showChangeTable && currentMode === 'DINE IN' && !orderNo && (
        <button
  className="btn text-white px-3 py-2 rounded"
  style={{
    backgroundColor: "#2563eb",
    transition: "background-color 0.2s ease-in-out",
  }}
  onMouseEnter={(e) => {
    e.target.style.backgroundColor = "#1e4ed8"; // darker blue on hover
  }}
  onMouseLeave={(e) => {
    e.target.style.backgroundColor = "#2563eb"; // original color
  }}
  onClick={() => setShowTableModal(true)}
>
  Switch Table
</button>

        )}

        {/* <button 
          className="btn px-3 py-2"
          style={{ backgroundColor: "#f59e0b", color: "#fff" }}
          onClick={() => {
            if (onSwitchTable) onSwitchTable();
            if (setIsNC) setIsNC(false);
            if (setSearchTerm) setSearchTerm("");
            if (onNewOrders) onNewOrders();
          }}
        >
          New Orders
        </button> */}
    <button
  className="btn text-white px-3 py-2 rounded"
  style={{
    backgroundColor: "#f59e0b",
    transition: "background-color 0.2s ease-in-out",
  }}
  onMouseEnter={(e) => {
    e.target.style.backgroundColor = "#ea8c00"; // hover effect (darker orange)
  }}
  onMouseLeave={(e) => {
    e.target.style.backgroundColor = "#f59e0b"; // original color
  }}
  onClick={() => {
    if (onSwitchTable) onSwitchTable();
    if (setIsNC) setIsNC(false);
    if (setSearchTerm) setSearchTerm("");
    if (onNewOrders) onNewOrders();
  }}
>
  New Orders
</button>



   <Link
  to="/kot"
  className="btn px-3 py-2 rounded"
  style={{
    backgroundColor: "#1f2937", // initial gray (Tailwind's bg-gray-800)
    color: "#ffffff",
    transition: "background-color 0.2s ease-in-out",
  }}
  onMouseEnter={(e) => {
    e.target.style.backgroundColor = "#374151"; // hover color (Tailwind's gray-700)
  }}
  onMouseLeave={(e) => {
    e.target.style.backgroundColor = "#1f2937"; // revert to original
  }}
  onClick={() => {
    if (setSearchTerm) setSearchTerm("");
  }}
>
  KOT
</Link>

      </div>
    )}

    {/* Right Section - Order Info */}
    <div className="text-end">
      {/* <div className="fw-bold text-dark">DINE IN</div>
      <div className="small text-secondary">Order No - Not Generated</div>
      <div className="text-muted" style={{ fontSize: "12px" }}>
        27th June 2025 - 07:45 PM
      </div> */}
    </div>
  </div>
    <p style={{marginLeft:"46px", fontSize:"14px", fontWeight:"500"}}> {staffType === 1 ? "Cashier" : "Waiter"} ({staffName})</p>

  {/* Bottom Section - Mode Tabs */}
     {currentView === 'tables' && (
  <div className="d-flex justify-content-between align-items-center flex-wrap mt-2 gap-2">
 
    {/* <div className="d-flex gap-2 flex-wrap">
      {['DINE IN', 'DELIVERY', 'COUNTER'].map((mode) => {
        const isActive = currentMode === mode;
        const bgColor = mode === 'DINE IN' ? '#dc3545' : '#f59e0b'; // red / orange
        return (
          <button
            key={mode}
            className="text-white rounded border-0 fw-medium"
            style={{
              backgroundColor: bgColor,
              padding: '6px 12px',
              fontSize: '13px',
            }}
            onClick={() => {
              setCurrentMode(mode);
              if (typeof onModeWithPasscode === 'function') {
                onModeWithPasscode(mode);
              }
            }}
          >
            {mode}
          </button>
        );
      })}
    </div> */}
    {/* <div className="d-flex mt-3 gap-2 flex-wrap">
  {['DINE IN', 'DELIVERY', 'COUNTER'].map((mode) => {
    const isActive = currentMode === mode;
    const bgColor = mode === 'DINE IN' ? '#dc3545' : '#f59e0b'; // red / orange

    // If DINE IN is active, disable pointer
    const cursorStyle =
      mode === 'DINE IN' && isActive ? 'default' : 'pointer';

    return (
      <button
        key={mode}
        className="text-white rounded border-0 fw-medium"
        style={{
          backgroundColor: bgColor,
          padding: '6px 12px',
          fontSize: '13px',
          cursor: cursorStyle,
        }}
        onClick={() => {
          if (mode === 'DINE IN') {
            if (currentMode !== 'DINE IN') {
              setCurrentMode('DINE IN');
            }
            // No passcode modal for DINE IN
          } else {
            setCurrentMode(mode);
            if (typeof onModeWithPasscode === 'function') {
              onModeWithPasscode(mode);
            }
          }
        }}
      >
        {mode}
      </button>
    );
  })}
</div> */}

{/* <div className="d-flex mt-1 gap-2 flex-wrap">
 

      {modes.map((mode) => {
        const isActive = currentMode === mode;
        const isHovered = hoveredMode === mode;

        const baseBgColor =
          mode === 'DINE IN' ? '#dc3545' : '#f59e0b'; // red or orange

        const hoverBgColor =
          mode === 'DELIVERY' || mode === 'COUNTER'
            ? '#d97706' // darker orange
            : baseBgColor;

        const bgColor = isHovered ? hoverBgColor : baseBgColor;

        const cursorStyle =
          mode === 'DINE IN' && isActive ? 'default' : 'pointer';

        return (
        
          <button
            key={mode}
            className="text-white rounded border-0 fw-medium"
            style={{
              backgroundColor: bgColor,
              padding: '8px 14px',
              fontSize: '15px',
              fontWeight:"500",
              cursor: cursorStyle,
              transition: 'background-color 0.2s ease-in-out',
            }}
            onClick={() => {
              if (mode === 'DINE IN') {
                if (currentMode !== 'DINE IN') {
                  setCurrentMode('DINE IN');
                }
              } else {
                setCurrentMode(mode);
                if (typeof onModeWithPasscode === 'function') {
                  onModeWithPasscode(mode);
                }
              }
            }}
            onMouseEnter={() =>
              mode !== 'DINE IN' ? setHoveredMode(mode) : null
            }
            onMouseLeave={() => setHoveredMode(null)}
          >
            {mode}
          </button>
        );
      })}
    </div> */}

    <div className="d-flex mt-1 gap-2 flex-wrap">
  {modes.map((mode) => {
    // Show DELIVERY and COUNTER only if staffType === 1
    if ((mode === 'DELIVERY' || mode === 'COUNTER') && staffType !== 1) {
      return null; // hide DELIVERY and COUNTER if staffType is not 1
    }

    const isActive = currentMode === mode;
    const isHovered = hoveredMode === mode;

    const baseBgColor =
      mode === 'DINE IN' ? '#dc3545' : '#f59e0b'; // red or orange

    const hoverBgColor =
      mode === 'DELIVERY' || mode === 'COUNTER'
        ? '#d97706' // darker orange
        : baseBgColor;

    const bgColor = isHovered ? hoverBgColor : baseBgColor;

    const cursorStyle =
      mode === 'DINE IN' && isActive ? 'default' : 'pointer';

    return (
      <button
        key={mode}
        className="text-white rounded border-0 fw-medium"
        style={{
          backgroundColor: bgColor,
          padding: '8px 14px',
          fontSize: '15px',
          fontWeight: "500",
          cursor: cursorStyle,
          transition: 'background-color 0.2s ease-in-out',
        }}
        onClick={() => {
          if (mode === 'DINE IN') {
            if (currentMode !== 'DINE IN') {
              setCurrentMode('DINE IN');
            }
          } else {
            setCurrentMode(mode);
            if (typeof onModeWithPasscode === 'function') {
              onModeWithPasscode(mode);
            }
          }
        }}
        onMouseEnter={() =>
          mode !== 'DINE IN' ? setHoveredMode(mode) : null
        }
        onMouseLeave={() => setHoveredMode(null)}
      >
        {mode}
      </button>
    );
  })}
</div>



{/* <div className="d-flex mt-1 gap-2 flex-wrap"></div> */}

    {/* Right: KOT Button */}
  
    <div>
      <Link
        to="/kot"
        className="btn px-3 py-2 rounded"
        style={{
          backgroundColor: "#1f2937",
          color: "#ffffff",
          transition: "background-color 0.2s ease-in-out",
           padding: '6px 12px',
              fontSize: '15px',
        }}
        onMouseEnter={(e) => {
          e.target.style.backgroundColor = "#374151";
        }}
        onMouseLeave={(e) => {
          e.target.style.backgroundColor = "#1f2937";
        }}
        onClick={() => {
          if (setSearchTerm) setSearchTerm("");
        }}
      >
        KOT
      </Link>
    </div>
  
  </div>
)}


     {/* {currentView === 'tables' && (
  <div className="d-flex justify-content-end">
    <Link
      to="/kot"
      className="btn px-3 py-2 rounded"
      style={{
        backgroundColor: "#1f2937",
        color: "#ffffff",
        transition: "background-color 0.2s ease-in-out",
      }}
      onMouseEnter={(e) => {
        e.target.style.backgroundColor = "#374151";
      }}
      onMouseLeave={(e) => {
        e.target.style.backgroundColor = "#1f2937";
      }}
      onClick={() => {
        if (setSearchTerm) setSearchTerm("");
      }}
    >
      KOT
    </Link>
  </div>
)} */}

</header>


      {/* Slide-In Sidebar */}
      {/* <div
        className={`position-fixed top-0 start-0 h-100 bg-white shadow border-end p-4 ${
          isSidebarOpen ? 'translate-start-0' : 'translate-start-hide'
        }`}
        style={{
          width: '280px',
          zIndex: 1055,
          transition: 'transform 0.3s ease-in-out',
        }}
      >
        <div className="d-flex justify-content-between align-items-center mb-4">
          <h5 className="mb-0">Menu Navigation</h5>
          <button 
            className="btn btn-close" 
            onClick={() => setIsSidebarOpen(false)}
            aria-label="Close menu"
          />
        </div>
          <div className="d-grid gap-2 mb-2">
          <Link
            className="btn btn-primary"
          to="/live-order"
          >
            Live Orders
          </Link>
        </div>
            <div className="d-grid gap-2 mb-2">
          <Link
            className="btn btn-success"
            to="/reports"
          >
            Reports
          </Link>
        </div>
            <div className="d-grid gap-2 mb-2">
          <Link
            className="btn btn-warning"
           to="/kot"
          >
            KOT
          </Link>
        </div>
        <div className="d-grid gap-2">
          <button 
            className="btn btn-danger"
            onClick={logout}
          >
            Logout
          </button>
        </div>
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
  
      <>
        <div>
          <strong>VYFOO Version:</strong>{" "}
          <span style={{ color: "#000" }}>v1.0</span>
        </div>
        <div style={{ marginTop: "4px" }}>
          Copyright <span style={{ color: "red" }}>@</span> 2025
        </div>
      </>
    
  </div>
      </div> */}
      <div
  className={`position-fixed top-0 start-0 h-100 bg-white shadow border-end p-4 ${
    isSidebarOpen ? 'translate-start-0' : 'translate-start-hide'
  }`}
  style={{
    width: '280px',
    zIndex: 1055,
    transition: 'transform 0.3s ease-in-out',
    display: 'flex',
    flexDirection: 'column',
  }}
>
  {/* Header */}
  <div className="d-flex justify-content-between align-items-center mb-4">
    <h5 className="mb-0">Menu Navigation</h5>
    <button
      className="btn btn-close"
      onClick={() => setIsSidebarOpen(false)}
      aria-label="Close menu"
    />
  </div>

  {/* Navigation */}
<div style={{ flex: 1 }}>
{staffType === 1 && (
  <>
    <div className="d-grid gap-2 mb-2">
      <Link
        to="/live-order"
        style={{
          backgroundColor: '#f59e0b',
          color: '#fff',
          border: 'none',
          padding: '10px',
          borderRadius: '4px',
          textAlign: 'center',
          textDecoration: 'none',
          fontSize: "17px",
          fontWeight: "600",
        }}
      >
        Live Orders
      </Link>
    </div>

    <div className="d-grid gap-2 mb-2">
      <Link
        to="/reports"
        style={{
          backgroundColor: '#2563eb',
          color: '#fff',
          border: 'none',
          padding: '10px',
          borderRadius: '4px',
          textAlign: 'center',
          textDecoration: 'none',
          fontSize: "17px",
          fontWeight: "600",
        }}
      >
        Reports
      </Link>
    </div>
  </>
)}


  <div className="d-grid gap-2">
    <button
      onClick={logout}
      style={{
        backgroundColor: '#dc2626',
        color: '#fff',
        border: 'none',
        padding: '10px',
        borderRadius: '4px',
         fontSize:"17px",
        fontWeight:"600",
      }}
    >
      Logout
    </button>
  </div>
</div>


  {/* Footer */}
  <div
    style={{
      padding: "10px 0",
      textAlign: "center",
      fontFamily: "Arial, sans-serif",
      fontSize: "12px",
      color: "#444",
      width: "100%",
      marginTop: "auto", // pushes to bottom
    }}
  >
    {/* <div>
      <strong>VYFOO Version:</strong>{" "}
      <span style={{ color: "#000" }}>v1.0</span>
    </div> */}
      <div style={{ marginTop: "4px" }}>
   
      <strong>VYFOO Version: <span style={{color:"#000"}}>v1.0</span></strong><br/>
   © {new Date().getFullYear()}
      <br/><strong style={{fontSize:"10px"}}><Link to="https://vyqda.com/" target="_blank" rel="noopener noreferrer" className="vyqda-link">Vyqda</Link> Technologies Pvt. Ltd. All Rights Reserved.</strong>
    </div>
  </div>
</div>


      {/* Backdrop */}
      {isSidebarOpen && (
        <div
          className="position-fixed top-0 start-0 w-100 h-100 bg-dark bg-opacity-50"
          style={{ zIndex: 1050 }}
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Table Select Modal */}
      <Modal show={showTableModal} onHide={() => setShowTableModal(false)} size="lg" centered>
        <Modal.Header closeButton>
          <Modal.Title>Select Table</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {tblCategoryDetails.map((category) => {
            // console.log("category", category);
            // Filter out the currently selected table from free tables
            // const freeTables = category.table_categoryName_data.filter(
            //   table => !table.pos_committed && (table.id !== selectedTable?.id && table.table_id !== selectedTable?.table_id)
            // );
            const freeTables = category.table_categoryName_data.filter(
              table => table.pos_committed === 0 && table.id !== selectedTable?.id
            );
            
            if (freeTables.length === 0) return null;
            return (
              <div key={category.id || category.table_categoryName} className="mb-4">
                <h6 className="mb-3">{category.table_categoryName}</h6>
                <div className="d-flex flex-wrap gap-3">
                  {freeTables.map((table) => (
                    <div
                      key={table.id}
                      className="bg-light rounded px-4 py-2 text-center"
                      style={{ minWidth: '120px', cursor: 'pointer' }}
                      onClick={async () => {
                        setLoading(true);
                        // Gather KOT ids from orderItems
                        const kotArray = orderItems.filter(item => item.KOT_id).map(item => item.KOT_id);
                        await switchTable({
                          currentTable: selectedTable,
                          targetTable: table,
                          orderId,
                          kotArray,
                          setSelectedTable,
                          onSuccess: () => {
                            setShowTableModal(false);
                            setLoading(false);
                          },
                        });
                      }}
                    >
                      <div style={{fontSize:"1.1rem"}}>{table.table_no || ''}</div>
                      {table.table_name ? <div style={{fontSize: '1.2em', color: '#888'}}>{table.table_name}</div> : null}
                    </div>
                  ))}
                </div>
                <hr />
              </div>
            );
          })}
          <LoadingModal isLoading={loading} />
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowTableModal(false)}>
            Cancel
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Slide Animation */}
      <style>
        {`
          .translate-start-0 {
            transform: translateX(0);
          }
          .translate-start-hide {
            transform: translateX(-100%);
          }
        `}
      </style>
    </>
  );
};

export default Header;

