import React, { useState, useRef, useEffect } from "react";
import Header from "./Header";
import ResponsivePOSLayout from "./ResponsivePOSLayout";
import OrderSidebar from "./OrderSidebar";
import LoadingModal from "../utlis/LoadingModal";
import { useSocketContext } from "../SocketContext";
import { useAuth } from "../AuthContext";
import Notification from "./Notification";
import { getAppDataFromDB } from "../utlis/indexedDB";

const Dashboard = () => {
  const { user } = useAuth();
  const [currentView, setCurrentView] = useState("tables"); // 'tables' or 'menu'
  const [selectedTable, setSelectedTable] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [currentMode, setCurrentMode] = useState("DINE IN");
  const [orderItems, setOrderItems] = useState([]);
  const [orderNo, setOrderNo] = useState(null);
  const [orderId, setOrderId] = useState(null); // <-- add this state
  const [serviceChargeDetails, setServiceChargeDetails] = useState(null);
  const [taxDetails, setTaxDetails] = useState([]);
  const lastFetchedServiceCharge = useRef({ name: "SCH", percentage: 5 });
  const [staffName, setStaffName] = useState("");
  const [staffDetails, setStaffDetails] = useState({});
  const [tblCategoryDetails, setTblCategoryDetails] = useState([]);
  const [refreshProducts, setRefreshProducts] = useState(false);
  const [discountValue, setDiscountValue] = useState(0);
  const [discountMode, setDiscountMode] = useState(0);


  const [fullLoader, setFullLoader] = useState(false);
  const [resetTabToItems, setResetTabToItems] = useState(false);
    const [invoiceNumber, setInvoiceNumber] = useState("");
  const [customerDetails, setCustomerDetails] = useState({
    name: "",
    mobile: "",
    address: "",
    eater_suggestions: "",
  });
  const [showPasscodeModal, setShowPasscodeModal] = useState(false);
  const [waiterDetails, setWaiterDetails] = useState([]);
  const [isNC, setIsNC] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [kotItemsDelete, setKotItemsDelete] = useState(0);
  const [staffType, setStaffType] = useState(null);
  const [tablenotoprint, setTablenotoprint] = useState(null);
  

  // Add split bill modal trigger state
  const [splitBillModalTrigger, setSplitBillModalTrigger] = useState({
    count: 0,
    table: null,
  });

  // Handler to be called from OrderSidebar
  const openSplitBillModalFromSidebar = (table) => {
    setSplitBillModalTrigger((prev) => ({ count: prev.count + 1, table }));
  };

  // Add a state to force OrderSidebar active tab to 'items'
  const [forceActiveTabToItems, setForceActiveTabToItems] = useState(false);

  const { socket, emit, isConnected, socketId } = useSocketContext();

  // Listen for table_status_update events from other clients
  React.useEffect(() => {
    if (!socket) return;
    const handler = (data) => {
      if (data.socketId !== socketId) {
        console.log("Received table_status_update from another client:", data);
      }
    };
    socket.on("table_status_update", handler);
    return () => socket.off("table_status_update", handler);
  }, [socket, socketId]);

  useEffect(() => {
    if (isConnected && socket) {
      console.log("✅ Dashboard socket ID:", socket.id); // should now print correct ID
    } else {
      console.log("⛔ Still null:", socket);
    }
  }, [isConnected]); // react to changes

  // Update lastFetchedServiceCharge when setServiceChargeDetails is called from ResponsivePOSLayout
  const handleSetServiceChargeDetails = (val) => {
    setServiceChargeDetails(val);

    lastFetchedServiceCharge.current = val;
  };

  // console.log("orderItems", orderItems);
  const handleTableClick = (table) => {
    setSelectedTable(table);

    if (table?.type === 2) {
      console.log(table);
      console.log(serviceChargeDetails);
      let tempServiceChargeDetails = serviceChargeDetails;

      tempServiceChargeDetails.percentage =
        tempServiceChargeDetails.foreigner_service_charge_value;
      setServiceChargeDetails(tempServiceChargeDetails);
    }

    setCurrentView("menu");
    // Do not set orderItems here; it will be set from backend after passcode
  };

  const handleSwitchToTables = () => {
    setCurrentView("tables");
    setSelectedCategory("All");
    setOrderItems([]);
    setSelectedTable(null); // Reset table number
    setOrderNo(null); // Reset orderNo
    setOrderId(null); // <-- reset orderId
    setDiscountValue(0); // Reset discount
    setServiceChargeDetails(null); // Reset SCH to default
    setTaxDetails([]); // Reset tax details
    setStaffName(""); // Clear staff name on new order
    setStaffDetails({}); // Reset staff details
    setTblCategoryDetails([]); // Reset table category details
    setRefreshProducts(false); // Reset refresh products
    setFullLoader(false); // Reset loader
    setResetTabToItems(false); // Reset tab to items
    // Only clear localStorage for the current table if it's committed (pos_committed === 1)
    if (selectedTable && selectedTable.pos_committed === 1) {
      const tableId = selectedTable.id || selectedTable.table_id;
      if (tableId) {
        const existingOrderList =
          JSON.parse(localStorage.getItem("orderList")) || {};
        delete existingOrderList[tableId];
        localStorage.setItem("orderList", JSON.stringify(existingOrderList));
        console.log(
          `Order data cleared from localStorage for table ${tableId} (committed table)`
        );
      }
    } else if (selectedTable && selectedTable.pos_committed === 0) {
      console.log(
        `Keeping localStorage data for table ${
          selectedTable.id || selectedTable.table_id
        } (free table)`
      );
    }
  };

  const handleAddToOrder = (item) => {
    setOrderItems((prev) => [...prev, item]);
  };

  // Add handlers for quantity and remove
  const handleUpdateOrderItemQuantity = (
    itemId,
    localId,
    table,
    newQuantity
  ) => {
    setOrderItems((prev) => {
      if (newQuantity <= 0) {
        return prev.filter(
          (_, idx) =>
            _.id !== itemId && _.local_id !== localId && _.table_id !== table
        );
      }
      return prev.map((item, idx) =>
        item.id === itemId &&
        item.local_id === localId &&
        item.table_id === table
          ? { ...item, quantity: newQuantity }
          : item
      );
    });
  };

  const handleRemoveOrderItem = (itemId, localId, table) => {
    // /api/kot/remove-item

    setOrderItems((prev) =>
      prev.filter(
        (_, idx) =>
          _.id !== itemId && _.local_id !== localId && _.table_id !== table
      )
    );
  };

  // Handler to trigger product refresh (for New Orders button)
  const handleFetchAllProducts = () => {
    setFullLoader(true);
    setRefreshProducts(Date.now()); // Use timestamp to always trigger reload
    setSelectedTable(null); // Reset table number
    setSelectedCategory("All"); // Reset table category
    setOrderNo(null); // Reset orderNo
    setOrderId(null); // <-- reset orderId
    setDiscountValue(0);
    setServiceChargeDetails(null); // Reset SCH to default
    setTaxDetails([]); // Reset tax details
    setStaffName(""); // Clear staff name
    setStaffDetails({}); // Reset staff details
    setTblCategoryDetails([]); // Reset table category details
    setOrderItems([]); // Reset order items
    setCurrentMode("DINE IN"); // Set DINE IN as default orderMode
    setResetTabToItems(false); // Reset tab to items
    // Clear localStorage data for any table with orderNo or orderId, regardless of committed status
    const existingOrderList =
      JSON.parse(localStorage.getItem("orderList")) || {};
    const updatedOrderList = {};
    Object.keys(existingOrderList).forEach((tableId) => {
      const entry = existingOrderList[tableId];
      if (!(entry && (entry.orderNo || entry.orderId))) {
        updatedOrderList[tableId] = entry;
      } else {
        console.log(
          `Order data cleared from localStorage for table ${tableId} after new order (orderNo/orderId present)`
        );
      }
    });
    localStorage.setItem("orderList", JSON.stringify(updatedOrderList));
    setResetTabToItems(true);
  };

  // Handler for payment success: go to tables and refresh products
  const handlePaymentSuccess = () => {
    // console.log('handlePaymentSuccess called');
    handleFetchAllProducts();
    setCurrentView("tables");
    if (selectedTable) {
      const tableId = selectedTable.id || selectedTable.table_id;
      if (tableId) {
        const existingOrderList =
          JSON.parse(localStorage.getItem("orderList")) || {};
        // Delete if the entry has orderNo or orderId, regardless of committed status
        if (
          existingOrderList[tableId] &&
          (existingOrderList[tableId].orderNo ||
            existingOrderList[tableId].orderId)
        ) {
          delete existingOrderList[tableId];
          localStorage.setItem("orderList", JSON.stringify(existingOrderList));
          console.log(
            `Order data cleared from localStorage for table ${tableId} after payment success (orderNo/orderId present)`
          );
        }
      }
    }
  };

  // In Dashboard, add a handler to update orderNo from OrderSidebar
  const handleOrderNoUpdate = (newOrderNo) => {
    setOrderNo(newOrderNo);
  };

  // Add handler for mode with passcode
  const handleModeWithPasscode = (mode) => {
    setCurrentMode(mode);
    setShowPasscodeModal(true);
  };

  // Reset the resetTabToItems flag after it's been used
  useEffect(() => {
    if (resetTabToItems) {
      // Reset the flag after a short delay to ensure OrderSidebar has processed it
      const timer = setTimeout(() => {
        setResetTabToItems(false);
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [resetTabToItems]);

  // useEffect(() => {
  //        let isMounted = true;
  //        let retryCount = 0;
  //        const maxRetries = 5;
  //        const retryDelay = 1000; // 1 second

  //        const fetchAppData = async () => {
  //          try {
  //            const appData = await getAppDataFromDB();
  //            if (appData && isMounted) {
  //             setFooderName(appData.fooder_name);
  //          setStaffType(appData.staff_type);

  //              console.log("App Data from IndexedDB:", appData);
  //            } else if (!appData && retryCount < maxRetries && isMounted) {

  //              retryCount++;
  //              console.log(`Retrying to fetch app data (${retryCount}/${maxRetries})...`);
  //              setTimeout(fetchAppData, retryDelay);
  //            }
  //          } catch (err) {
  //            console.error("Failed to fetch app data from IndexedDB:", err);
  //            // Retry on error as well
  //            if (retryCount < maxRetries && isMounted) {
  //              retryCount++;
  //              setTimeout(fetchAppData, retryDelay);
  //            }
  //          }
  //        };

  //        fetchAppData();

  //        // Also listen for custom events when IndexedDB data changes
  //        const handleIndexedDBUpdate = (event) => {
  //          if (isMounted) {
  //            const appData = event.detail;
  //            if (appData) {
  //              setAppPermission(appData.app_permission);
  //              setKotitemsdelete(appData.kot_items_delete);
  //              setRoundOffAmountDB(appData.round_off_amount);
  //              setStaffType(appData.staff_type);
  //              console.log("App Data updated via event:", appData);
  //            }
  //          }
  //        };

  //        window.addEventListener('indexedDBUpdated', handleIndexedDBUpdate);

  //        // Cleanup
  //        return () => {
  //          isMounted = false;
  //          window.removeEventListener('indexedDBUpdated', handleIndexedDBUpdate);
  //        };
  //      }, []);

  useEffect(() => {
    let isMounted = true;
    let retryCount = 0;
    const maxRetries = 5;
    const retryDelay = 1000; // 1 second

    const fetchAppData = async () => {
      try {
        const appData = await getAppDataFromDB();

        if (appData && isMounted) {
          // setAppPermission(appData.app_permission);
          // setKotitemsdelete(appData.kot_items_delete);
          // setRoundOffAmountDB(appData.round_off_amount);
          setStaffType(appData.staff_type);
          console.log(
            "App Data from IndexedDB:*******************************************",
            appData
          );
        } else if (!appData && retryCount < maxRetries && isMounted) {
          // If no data in IndexedDB, retry after a delay
          // This handles the case when the component loads before login data is saved
          retryCount++;
          console.log(
            `Retrying to fetch app data (${retryCount}/${maxRetries})...`
          );
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

    window.addEventListener("indexedDBUpdated", handleIndexedDBUpdate);

    // Cleanup
    return () => {
      isMounted = false;
      window.removeEventListener("indexedDBUpdated", handleIndexedDBUpdate);
    };
  }, []);

  return (
    <div className="d-flex flex-column vh-100">
      {/* Header */}
      <div style={{ width: "74.2%" }}>
        <Header
          currentMode={currentMode}
          setCurrentMode={setCurrentMode}
          selectedTable={selectedTable}
          setCurrentView={setCurrentView}
          currentView={currentView}
          onSwitchTable={handleSwitchToTables}
          staffName={staffName}
          showChangeTable={orderItems.length > 0}
          tblCategoryDetails={tblCategoryDetails}
          onNewOrders={() => {
            setIsNC(false);
            setFullLoader(true); // Show loader when onNewOrders is called
            handleFetchAllProducts();
          }}
          orderItems={orderItems}
          orderId={orderId}
          setSelectedTable={setSelectedTable}
          onModeWithPasscode={handleModeWithPasscode}
          isNC={isNC}
          setIsNC={setIsNC}
          setSearchTerm={setSearchTerm}
          orderNo={orderNo}
        />
      </div>

      {/* Body layout: ResponsivePOSLayout | OrderSidebar */}
      <div className="d-flex flex-grow-1 overflow-hidden">
        {/* Responsive POS Layout (Sidebar + Tables/Menu) */}
        <div
          className="flex-grow-1 d-flex flex-column"
          style={{ width: "74.2%" }}
        >
          <ResponsivePOSLayout
            currentView={currentView}
            setCurrentView={setCurrentView}
            selectedCategory={selectedCategory}
            setSelectedCategory={setSelectedCategory}
            selectedTable={selectedTable}
            onTableClick={handleTableClick}
            onAddToOrder={handleAddToOrder}
            setServiceChargeDetails={handleSetServiceChargeDetails}
            setTaxDetails={setTaxDetails}
            onStaffLogin={setStaffName}
            onStaffDetails={setStaffDetails}
            onTblCategoryDetails={setTblCategoryDetails}
            refreshProducts={refreshProducts}
            setRefreshProducts={setRefreshProducts}
            orderNo={orderNo}
            setFullLoader={setFullLoader}
            orderItems={orderItems}
            setOrderItems={setOrderItems}
            setDiscountValue={setDiscountValue}
            discountValue={discountValue}
            
            setDiscountMode={setDiscountMode}
            discountMode={discountMode}
            setOrderNo={setOrderNo}
            customerDetails={customerDetails}
            setCustomerDetails={setCustomerDetails}
            showPasscodeModal={showPasscodeModal}
            setShowPasscodeModal={setShowPasscodeModal}
            onPasscodeSuccess={() => setCurrentView("menu")}
            orderMode={currentMode}
            setCurrentMode={setCurrentMode}
            setWaiterDetails={setWaiterDetails}
            setSelectedTable={setSelectedTable}
            orderId={orderId}
            handleFetchAllProducts={handleFetchAllProducts}
            splitBillModalTrigger={splitBillModalTrigger}
            setActiveTabToItems={() => setForceActiveTabToItems(true)}
            tblCategoryDetails={tblCategoryDetails}
            setTblCategoryDetails={setTblCategoryDetails}
            isNC={isNC}
            setIsNC={setIsNC}
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            fullLoader={fullLoader}
            invoiceNumber={invoiceNumber}
             setInvoiceNumber={setInvoiceNumber}
             tablenotoprint={tablenotoprint}
             setTablenotoprint={setTablenotoprint}
          />
        </div>
        {/* Order Summary Sidebar */}
        <div className="bg-white" style={{ width: "25.8%" }}>
          <OrderSidebar
            selectedTable={selectedTable}
            orderItems={orderItems}
            onUpdateQuantity={handleUpdateOrderItemQuantity}
            onRemoveItem={handleRemoveOrderItem}
            setCurrentView={setCurrentView}
            setOrderItems={setOrderItems}
            serviceChargeDetails={serviceChargeDetails}
            taxDetails={taxDetails}
            staffDetails={staffDetails}
            setServiceChargeDetails={handleSetServiceChargeDetails}
            onPaymentSuccess={handlePaymentSuccess}
            fullLoader={fullLoader}
            setFullLoader={setFullLoader}
            setDiscountValue={setDiscountValue}
            discountValue={discountValue}

setDiscountMode={setDiscountMode}
            discountMode={discountMode}

 




            onNewOrders={() => {
              setFullLoader(true);
              handleFetchAllProducts();
            }}
            orderNo={orderNo}
            onOrderNoUpdate={handleOrderNoUpdate}
            resetTabToItems={resetTabToItems}
            onOrderIdChange={setOrderId}
            customerDetails={customerDetails}
            setCustomerDetails={setCustomerDetails}
            orderMode={currentMode}
            waiterDetails={waiterDetails}
            openSplitBillModalFromSidebar={openSplitBillModalFromSidebar}
            forceActiveTabToItems={forceActiveTabToItems}
            setForceActiveTabToItems={setForceActiveTabToItems}
            currentView={currentView}
            isNC={isNC}
            setIsNC={setIsNC}
            setSearchTerm={setSearchTerm}
            invoiceNumber={invoiceNumber}
            setInvoiceNumber={setInvoiceNumber}
             tablenotoprint={tablenotoprint}
          />
        </div>
      </div>

   {/* {staffType === 1 && <Notification />} */}
   {staffType && staffType === 1 ? <Notification /> : null}



      <LoadingModal isLoading={fullLoader} />
    </div>
  );
};

export default Dashboard;
