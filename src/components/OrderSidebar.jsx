
import React, { useState, useEffect, useCallback, useRef, memo } from "react";
import {
  FaList,
  FaInfoCircle,
  FaPercent,
  FaCheckSquare,
  FaMinus,
  FaPlus,
  FaTrash,
  FaTimes,
} from "react-icons/fa";
import "../index.css";
import axiosInstance from "../utlis/axiosinstance";
import Toaster from "../utlis/Toaster";
import {
  DeleteKOTGeneratedItemURL,
  GET_EATER_DETAILS,
  UpdateDetailsTabPost,
  PostSaveKot,
  PostCreateOrderForDeliveryAndTakeAway,
  PostCreateOrder,
  PostPartialPaymentForDineIn,
  PostPosPaymentForDeliveryAndPickUp,
  PostHoldPaymentForDineIn,
  PostHoldPaymentForCounterAndDelivery,
  PostAfterOrderGenerateUpdateNewItem,
  PostIncreaseItemQuantity,
  PostDecreaseItemQuantity,
} from "../BaseURL/baseURL";
import LoadingModal from "../utlis/LoadingModal";
import "../index.css";
import { createPortal } from "react-dom";
import { useSocketContext } from "../SocketContext";
import { useAuth } from "../AuthContext";
import { getAppDataFromDB } from "../utlis/indexedDB";
import Tooltip from "@mui/material/Tooltip";

const TABS = [
  { key: "items", label: "Items", icon: <FaList />, color: "#f59e0b" },
  {
    key: "details",
    label: "Details",
    icon: <FaInfoCircle />,
    color: "#f59e0b",
  },
  { key: "discount", label: "Discount", icon: <FaPercent />, color: "#f59e0b" },
  {
    key: "markpaid",
    label: "Mark Paid",
    icon: <FaCheckSquare />,
    color: "#f59e0b",
  },
];

const OrderSidebar = ({
  selectedTable,
  orderItems = [],
  onUpdateQuantity,
  onRemoveItem,
  setCurrentView,
  currentView,
  setOrderItems,
  serviceChargeDetails,
  taxDetails = [],
  setServiceChargeDetails,
  staffDetails,
  onPaymentSuccess, // <-- add this prop
  setFullLoader,
  onNewOrders,
  discountValue,
  setDiscountValue,
  setDiscountMode,
  discountMode,
  setSelectedTable,
  setSelectedCategory,
  orderNo, // <-- add this prop
  onOrderNoUpdate, // <-- add this prop
  resetTabToItems, // <-- add this prop to reset tab to items
  onOrderIdChange, // <-- add this prop
  customerDetails,
  setCustomerDetails,
  orderMode = "DINE IN",
  waiterDetails,
  openSplitBillModalFromSidebar,
  forceActiveTabToItems,
  setForceActiveTabToItems,
  setShowSwitchTableModal,
  showSwitchTableModal,
  isNC,
  setIsNC,
  setSearchTerm,
  setInvoiceNumber,
  invoiceNumber,
  tablenotoprint,
  setTablenotoprint,
}) => {
  // Payment methods to show in the payment options
  // Payment methods to show in the payment options
  console.log(selectedTable, "selectedTable")
  const paymentMethodsToShow = isNC
    ? ["NC Payment"]
    : [
      "Cash",
      "Card",
      "NEFT",
      "UPI",
      ...(orderMode === "DINE IN" ? ["Zomato", "Swiggy", "Dineout"] : []),
      "Hold",
    ];

  // console.log("orderItems", orderItems);
  // console.log("selectedTable", selectedTable);

  const { user } = useAuth();
  const { emit, socket, isConnected, socketId } = useSocketContext();

  // State management
  // const [eaterSuggestions, setEaterSuggestions] = useState('');
  // const [invoiceNumber, setInvoiceNumber] = useState("");
  const [appPermission, setAppPermission] = useState(null);
  const [kotitemsdelete, setKotitemsdelete] = useState(0);
  const [roundOffAmountDB, setRoundOffAmountDB] = useState(0);
  const [staffType, setStaffType] = useState(null);
  const [activeTab, setActiveTab] = useState("items");
  const [orderTime, setOrderTime] = useState(null);

  const [paymentMethod, setPaymentMethod] = useState(
    isNC ? "nc payment" : "cash"
  );
  // Reset payment method to 'cash' if isNC is turned off, or to 'nc payment' if isNC is turned on
  useEffect(() => {
    if (isNC && paymentMethod !== "nc payment") {
      setPaymentMethod("nc payment");
    } else if (!isNC && paymentMethod === "nc payment") {
      setPaymentMethod("cash");
    }
  }, [isNC]);
  const [paidAmount, setPaidAmount] = useState("");
  const [tipAmount, setTipAmount] = useState(0);
  const [transactionId, setTransactionId] = useState("");
  const [kotNo, setKotNo] = useState(null);
  const [kotId, setKotId] = useState(null);
  const [orderId, setOrderId] = useState(null);
  // const [discountMode, setDiscountMode] = useState(0);
  const [tempDiscountMode, setTempDiscountMode] = useState(discountMode);
  const [tempDiscountValue, setTempDiscountValue] = useState(discountValue);
  const [reason, setReason] = useState("");
  const [cgstMap, setCgstMap] = useState({});
  const [sgstMap, setSgstMap] = useState({});
  const [total, setTotal] = useState(0);
  const [roundOffValue, setRoundOffValue] = useState(0);
  const [paymentEntries, setPaymentEntries] = useState([]);
  const [currentPayment, setCurrentPayment] = useState({
    method: paymentMethod,
    amount: "",
    tip: "",
    upiSubMethod: "",
    transactionId: "",
  });
  const [payClicked, setPayClicked] = useState(false);
  const totalPaid = paymentEntries.reduce(
    (sum, entry) => sum + parseFloat(entry.amount || 0),
    0
  );
  const billTotal = total + roundOffValue;
  const dueAmount = (billTotal - totalPaid).toFixed(2);
  const [isFetchingCustomer, setIsFetchingCustomer] = useState(false);
  const [customerPhone, setCustomerPhone] = useState(
    customerDetails.mobile || ""
  );
  const [isNCToggledAfterOrder, setIsNCToggledAfterOrder] = useState(false); // Delete modal state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteReason, setDeleteReason] = useState("");
  const [itemToDelete, setItemToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [ordercreateno, setOrdercreateno] = useState("");
  console.log(ordercreateno, "ordercreateno");
  console.log(invoiceNumber, "invoiceNumber");
  // Keep customerPhone in sync with customerDetails.mobile
  useEffect(() => {
    setCustomerPhone(customerDetails.mobile || "");
  }, [customerDetails.mobile]);

  console.log("roundOffValue", roundOffValue);

  // Summary state
  const [subTotal, setSubTotal] = useState(0);
  const [totalDiscount, setTotalDiscount] = useState(0);
  const [totalSCH, setTotalSCH] = useState(0);
  const [totalTax, setTotalTax] = useState(0);
  const [packagingCharges, setPackingCharges] = useState(0);
  const [isProcessingDelete, setIsProcessingDelete] = useState(false);

  // useEffect(() => {
  //   const fetchAppData = async () => {
  //     try {
  //       const appData = await getAppDataFromDB();
  //       if (appData) {
  //         setAppPermission(appData.app_permission);
  //         setKotitemsdelete(appData.kot_items_delete);
  //         setRoundOffAmountDB(appData.round_off_amount);
  //         setStaffType(appData.staff_type);

  //         console.log("App Data from IndexedDB:", appData);
  //       }
  //     } catch (err) {
  //       console.error("Failed to fetch app data from IndexedDB:", err);
  //     }
  //   };

  //   fetchAppData();
  // }, []);

  // Derived data

  // Add this helper
  const refreshTableItems = async () => {
    try {
      const tableId = selectedTable?.table_id || selectedTable?.id;
      if (!tableId) return;
      const res = await axiosInstance.post("/api/table/refreshtableitems", {
        table_id: tableId,
      });
      if (
        res.data?.status === "success" &&
        Array.isArray(res.data.kot_details)
      ) {
        setOrderItems(res.data.kot_details);
      } else {
        Toaster.error(res.data?.message || "Failed to refresh table items");
      }
    } catch (err) {
      Toaster.error(
        err.response?.data?.message || "Failed to refresh table items"
      );
    }
  };

  useEffect(() => {
    let isMounted = true;
    let retryCount = 0;
    const maxRetries = 5;
    const retryDelay = 1000; // 1 second

    const fetchAppData = async () => {
      try {
        const appData = await getAppDataFromDB();
        if (appData && isMounted) {
          setAppPermission(appData.app_permission);
          setKotitemsdelete(appData.kot_items_delete);
          setRoundOffAmountDB(appData.round_off_amount);
          setStaffType(appData.staff_type);
          console.log("App Data from IndexedDB:", appData);
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

  const dineType = orderMode;
  const floor = selectedTable?.tableCategory || "";
  const floorNo = selectedTable
    ? selectedTable.table_no || selectedTable.table_name || ""
    : "";
  const now = new Date();
  const dateStr = now.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
  const timeStr = now.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
  const groupedItems = orderItems.reduce((acc, item) => {
    const kot = item.KOT_no || "No KOT";
    if (!acc[kot]) acc[kot] = [];
    acc[kot].push(item);
    return acc;
  }, {});

  const handleUpdateCustomerDetails = async () => {
    try {
      setFullLoader(true);
      const payload = {
        name: customerDetails.name || "",
        mobile: customerDetails.mobile || "",
        address: customerDetails.address || "",
        eater_suggestions: customerDetails.eater_suggestions,
        order_id: orderId,
        // eater_suggestions: eaterSuggestions || '',
      };

      const response = await axiosInstance.post(UpdateDetailsTabPost, payload);

      if (response.data?.status === "success") {
        Toaster.success(response.data?.message || "Customer details updated");
      } else {
        Toaster.error(response.data?.message || "Failed to update details");
      }
    } catch (error) {
      console.error(error);
      Toaster.error(error.response?.data?.message || "Error updating details");
    } finally {
      setFullLoader(false);
    }
  };

  // Calculation functions
  const calculateSubtotal = useCallback(() => {
    return orderItems.reduce((total, item) => {
      return total + item.withOutTaxPrice * item.quantity;
    }, 0);
  }, [orderItems]);

  const calculateDiscount = useCallback(() => {
    const subtotal = calculateSubtotal();
    if (subtotal <= 0) return 0;
    if (discountMode == 0) {
      return (subtotal * discountValue) / 100;
    } else {
      return Math.min(discountValue, subtotal);
    }
  }, [calculateSubtotal, discountValue, discountMode]);

  const calculateServiceChargeAmount = useCallback(() => {
    const percent = serviceChargeDetails?.percentage ?? 0;
    const subtotalAfterDiscount = calculateSubtotal() - calculateDiscount();
    return subtotalAfterDiscount > 0
      ? (subtotalAfterDiscount * percent) / 100
      : 0;
  }, [calculateSubtotal, calculateDiscount, serviceChargeDetails]);

  const getItemSCH = useCallback(
    (item, subtotalAfterDiscount, sch) =>
      subtotalAfterDiscount > 0
        ? ((item.withOutTaxPrice * item.quantity) / subtotalAfterDiscount) * sch
        : 0,
    []
  );

  const calculateTax = useCallback(() => {
    const subtotal = calculateSubtotal();
    const discount = calculateDiscount();
    const sch = Number(calculateServiceChargeAmount()) || 0;
    const subtotalAfterDiscount = subtotal - discount;
    if (subtotal <= 0) return 0;
    // Group items by tax percent
    const uniquePercents = Array.from(
      new Set(orderItems.map((item) => item.tax_percent).filter(Boolean))
    );
    return uniquePercents.reduce((totalTax, percent) => {
      const itemsInGroup = orderItems.filter(
        (item) => item.tax_percent === percent
      );
      return itemsInGroup.reduce((sum, item) => {
        // Proportional discount for this item
        const itemBasePrice = item.withOutTaxPrice * item.quantity;
        const itemDiscount =
          subtotal > 0 ? (itemBasePrice / subtotal) * discount : 0;
        const itemPriceAfterDiscount = itemBasePrice - itemDiscount;
        // Only add service charge if present
        let itemTaxBase = itemPriceAfterDiscount;
        if (serviceChargeDetails && serviceChargeDetails.percentage != null) {
          // Proportional service charge for this item
          const itemSCH =
            subtotalAfterDiscount > 0
              ? (itemPriceAfterDiscount / subtotalAfterDiscount) * sch
              : 0;
          itemTaxBase += itemSCH;
        }
        return sum + (itemTaxBase * percent) / 100;
      }, totalTax);
    }, 0);
  }, [
    orderItems,
    calculateSubtotal,
    calculateDiscount,
    calculateServiceChargeAmount,
    serviceChargeDetails,
  ]);

  const calculateRoundOff = (rawTotal) => {
    const decimal = rawTotal - Math.floor(rawTotal);
    return decimal >= 0.5 ? +(1 - decimal).toFixed(2) : -decimal.toFixed(2);
  }; // Calculate total packaging charges for delivery/counter
  const totalPackagingCharges =
    orderMode === "DELIVERY" || orderMode === "COUNTER"
      ? orderItems.reduce(
        (sum, item) =>
          sum +
          parseFloat(item.packaging_charges || 0) * (item.quantity || 1),
        0
      )
      : 0;
  // Update final total calculation to include packaging charges (exclude if NC)
  const calculateTotal = useCallback(() => {
    const subtotal = calculateSubtotal();
    const discount = calculateDiscount();
    const sch = calculateServiceChargeAmount();
    const tax = calculateTax(); // Exclude packaging charges if NC order
    const packagingCharges = !isNC ? totalPackagingCharges : 0;
    const rawTotal = subtotal - discount + sch + tax + packagingCharges;
    const roundOffValue = calculateRoundOff(rawTotal);
    return rawTotal;
  }, [
    calculateSubtotal,
    calculateDiscount,
    calculateServiceChargeAmount,
    calculateTax,
    totalPackagingCharges,
    isNC,
  ]);

  console.log("totalPackagingCharges", totalPackagingCharges);
  // Update summary calculations
  useEffect(() => {
    const updateSummary = () => {
      const subtotal = calculateSubtotal();
      const discount = calculateDiscount();
      const sch = Number(calculateServiceChargeAmount()) || 0;
      const tax = calculateTax();
      const total = calculateTotal();

      // Calculate CGST and SGST
      const newCgstMap = {};
      const newSgstMap = {};

      let discountValueTemp = discountValue;
      if (discountMode == 1) {
        discountValueTemp =
          (parseFloat(discountValue) * 100) / calculateSubtotal();
      }

      orderItems.forEach((item) => {
        const taxPercent = parseFloat(item.tax_percent) || 0;
        if (taxPercent > 0) {
          const itemBase = item.withOutTaxPrice * item.quantity;
          const itemDiscount = (itemBase * discountValueTemp) / 100;
          let itemSCH = 0;
          if (serviceChargeDetails && serviceChargeDetails.percentage != null) {
            itemSCH =
              ((itemBase - itemDiscount) * serviceChargeDetails.percentage) /
              100;
          }
          const taxBase = itemBase - itemDiscount + itemSCH;
          const cgst = (taxBase * (taxPercent / 2)) / 100;
          const sgst = (taxBase * (taxPercent / 2)) / 100;
          newCgstMap[taxPercent / 2] = (newCgstMap[taxPercent / 2] || 0) + cgst;
          newSgstMap[taxPercent / 2] = (newSgstMap[taxPercent / 2] || 0) + sgst;
        }
      });

      setCgstMap(newCgstMap);
      setSgstMap(newSgstMap);
      const decimal = total - Math.floor(total);
      const newRoundOffValue = decimal >= 0.5 ? +(1 - decimal) : -decimal;

      if (roundOffAmountDB) {
        setRoundOffValue(newRoundOffValue);
      } else {
        setRoundOffValue(0);
      }

      setTotal(total);
      setSubTotal(subtotal);
      setTotalDiscount(discount);
      setTotalSCH(sch);
      setTotalTax(tax);
    };
    updateSummary();
  }, [
    orderItems,
    discountValue,
    serviceChargeDetails,
    calculateSubtotal,
    calculateDiscount,
    calculateServiceChargeAmount,
    calculateTax,
    calculateTotal,
    discountMode,
  ]);

  // Check if any orderItem has orderId and set it
  // console.log("orderItems", orderItems);
  useEffect(() => {
    if (orderItems && orderItems.length > 0) {
      const itemWithOrderId = orderItems.find((item) => item.orderId);
      if (itemWithOrderId && itemWithOrderId.orderId) {
        setOrderId(itemWithOrderId.orderId);
      }

      // Also check for orderNo in orderItems
      const itemWithOrderNo = orderItems.find((item) => item.orderNo);
      if (itemWithOrderNo && itemWithOrderNo.orderNo && onOrderNoUpdate) {
        onOrderNoUpdate(itemWithOrderNo.orderNo);
      }

      // If there are no KOT items left, reset orderId and orderNo
      const hasKOT = orderItems.some((item) => item.isKOT);
      if (!hasKOT) {
        setOrderId(null);
        if (onOrderNoUpdate) onOrderNoUpdate(null);
      }
    }
  }, [orderItems, onOrderNoUpdate]);

  // Reset orderNo to null when all items are removed from cart
  useEffect(() => {
    if (orderItems.length === 0 && orderNo && onOrderNoUpdate) {
      onOrderNoUpdate(null);
    }
  }, [orderItems, orderNo, onOrderNoUpdate]);

  // Notify parent when orderId changes
  useEffect(() => {
    if (onOrderIdChange) {
      onOrderIdChange(orderId);
    }
  }, [orderId, onOrderIdChange]);

  // Reset orderId to null when starting a new order (orderItems cleared or orderNo reset)
  useEffect(() => {
    if (orderItems.length === 0 || !orderNo) {
      setOrderId(null);
    }
  }, [orderItems, orderNo]);

  // Save order data to localStorage when table is free or orderItems is empty
  useEffect(() => {
    const saveOrderToLocalStorage = async () => {
      if (!selectedTable) return;

      const tableId = selectedTable.id || selectedTable.table_id;
      if (!tableId) return;

      // Only save to localStorage if table is free (pos_committed === 0) or orderItems is empty
      const isTableFree = selectedTable.pos_committed === 0;
      const hasNoItems = orderItems.length === 0;

      if (isTableFree || hasNoItems) {
        // Get existing orderList from localStorage
        const existingOrderList =
          JSON.parse(localStorage.getItem("orderList")) || {};


        const appData = await getAppDataFromDB();
        const fooderData = appData || {};
        // Create order data structure
        const orderData = {
          isPrinted: false,
          orderId: "",
          orderNo: orderNo || "",
          creation_date: new Date().toISOString(),
          orders: orderItems.map((item) => ({
            id: item.id,
            name: item.name || item.product_name,
            menu_id: item.menu_id || item.product?.menu_id || item.product?.id,
            price: item.price?.toString() || "0.00",
            proprice: item.product_proprice || "",
            tax_percent: item.tax_percent || 0,
            tax_type: item.tax_type || 1,
            product_type: item.product_type || 0,
            dine_in_service: item.dine_in_service || 1,
            delivery_service: item.delivery_service || 1,
            pick_up_service: item.pick_up_service || 1,
            min_order_quantity: item.min_order_quantity || 1,
            is_foreign: item.is_foreign || 1,
            foreign_price: item.foreign_price || "0",
            quantity: item.quantity || 1,
            packaging_charges: item.packaging_charges || "0",
            variants: item.variants || [],
            attributes: item.attributes || [],
            addons: item.addons || [],
            local_id: item.local_id || Date.now(),
            fooder_id: item.fooder_id,
            table_id: tableId,
            fooder_name: fooderData.fooder_name,
            product_special_note: item.product_special_note || "",
            isKOT: item.isKOT || false,
            isSaved: item.isSaved || false,
            KOT_id: item.KOT_id || "",
            KOT_no: item.KOT_no || "",
            KOT_time: item.KOT_time || "",
            selectedAddons: item.selectedAddons || [],
            selectedvariants: item.selectedvariants || { variantId: 0 },
            newPrice: item.newPrice || item.price?.toString() || "0.00",
            withTaxPrice: item.withTaxPrice || item.price || 0,
            withOutTaxPrice: item.withOutTaxPrice || item.price || 0,
          })),
          discountValues: {
            type: discountMode.toString(),
            rate: discountValue.toString(),
          },
          customerDetails: {
            name: "",
            address: "",
            mobile: "",
          },
          totalPersons: "1",
          instructions: "",
          staff: staffDetails,
          service_charge_details: serviceChargeDetails,
          grandTotal: calculateTotal().toString(),
        };

        // Update orderList with new data
        existingOrderList[tableId] = orderData;

        // Save to localStorage
        localStorage.setItem("orderList", JSON.stringify(existingOrderList));
        console.log(
          `Order data saved to localStorage for table ${tableId}:`,
          orderData
        );
      }
    };

    saveOrderToLocalStorage();
  }, [
    selectedTable,
    orderItems,
    orderId,
    orderNo,
    discountMode,
    discountValue,
    staffDetails,
    serviceChargeDetails,
    calculateTotal,
  ]);

  // Reset tab to items when resetTabToItems is called
  useEffect(() => {
    if (resetTabToItems) {
      setActiveTab("items");
    }
  }, [resetTabToItems]);

  // Listen for forceActiveTabToItems prop to force tab to 'items'
  useEffect(() => {
    if (forceActiveTabToItems) {
      setActiveTab("items");
      if (typeof setForceActiveTabToItems === "function")
        setForceActiveTabToItems(false);
    }
  }, [forceActiveTabToItems, setForceActiveTabToItems]);

  // console.log("orderNo", orderNo);

  // Removed localStorage sync logic - no longer saving to localStorage

  // Item quantity handlers
  const handleQuantityChange = async (itemId, localId, newQuantity, action) => {
    const orderItem = orderItems.find(
      (item) => item.id === itemId && item.local_id === localId
    );
    if (!orderItem) return;

    try {
      const endpoint =
        action === "increase"
          ? PostIncreaseItemQuantity
          : PostDecreaseItemQuantity;

      setFullLoader(true);

      const response = await axiosInstance.post(endpoint, {
        id: orderItem.KOT_id,
        product_id: itemId,
        newQuantity,
        tableId: selectedTable?.id,
        is_bill: orderItem.isSaved,
        local_id: orderItem.local_id,
        orderId: orderId,
      });

      if (response.status === 200 && response.data.message) {
        Toaster.success(response.data.message);
        const updatedItems = orderItems.map((item) =>
          item.id === itemId && item.local_id === localId
            ? { ...item, quantity: newQuantity }
            : item
        );

        setOrderItems(updatedItems);
      }
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message;
      Toaster.error(errorMessage || "Failed to update quantity");
      console.error(error);
    } finally {
      setFullLoader(false);
    }
  };

  const handlePlusClickAfterKOT = (itemId, localId) => {
    const orderItem = orderItems.find(
      (item) => item.id === itemId && item.local_id === localId
    );
    if (orderItem) {
      handleQuantityChange(itemId, localId, orderItem.quantity + 1, "increase");
    }
  };

  const handleMinusClickAfterKOT = (itemId, localId) => {
    const orderItem = orderItems.find(
      (item) => item.id === itemId && item.local_id === localId
    );
    if (orderItem) {
      const minQty = Number(orderItem.min_order_quantity);
      const minOrderQty = !isNaN(minQty) && minQty > 0 ? minQty : 1;
      if (orderItem.quantity > minOrderQty) {
        handleQuantityChange(
          itemId,
          localId,
          orderItem.quantity - 1,
          "decrease"
        );
      }
    }
  };

  // KOT and Order handlers
  const [isSavingKOT, setIsSavingKOT] = useState(false);
  const [isSavingBill, setIsSavingBill] = useState(false);
  const [isPrintingKOT, setIsPrintingKOT] = useState(false);
  const handleSaveKOT = async () => {
    // Prevent multiple concurrent calls
    if (isSavingKOT || isPrintingKOT || isSavingBill) {
      console.log("handleSaveKOT: Already processing, ignoring call");
      return;
    }

    if (!orderItems.length) {
      Toaster.error("No items to generate KOT");
      return;
    }

    // ✅ Product existence check before proceeding
    const appData = await getAppDataFromDB();
    const fooderData = appData || {};


    const productList = appData?.product || [];
    const missingProduct = orderItems.find(
      (item) => !productList.some((p) => Number(p.id) === Number(item.id))
    );

    if (missingProduct) {
      console.warn("Product not found in DB:", missingProduct);
      window.location.reload();
      return;
    }

    // Only include items for which KOT is not already generated
    const itemsToSend = orderItems.filter((item) => !item.isKOT);
    if (!itemsToSend.length) {
      Toaster.error("All items already have KOT generated");
      await refreshTableItems();
      return;
    }

    setIsSavingKOT(true);

    try {
      const temp_kot = orderItems
        .filter((item) => item.KOT_id)
        .map((item) => item.KOT_id);

      const payload = itemsToSend.map((item) => ({
        ...item,
        table_id: selectedTable?.table_id || selectedTable?.id,
        fooder_name: fooderData.fooder_name,
        order_type: "DINE IN",
        order_id: orderNo ? orderId || "" : "",
        all_kots: temp_kot,
        product_id: item.id,
        product_name: item.name || item.product?.name,
        product_price:
          item.product_price || (item.price ? item.price.toString() : ""),
        product_proprice: item.product_proprice || "",
        staffDetails: staffDetails,
      }));
      setFullLoader(true);

      const response = await axiosInstance.post(PostSaveKot, payload);

      // if (response.data?.status === "success") {
      //   setKotNo(response.data.KOT_no);
      //   setKotId(response.data.id);

      //   const updatedItems = orderItems.map((item) => ({
      //     ...item,
      //     isKOT: item.isKOT || true,
      //     KOT_id: item.KOT_id || response.data.id,
      //     KOT_no: item.KOT_no || response.data.KOT_no,
      //     KOT_time: item.KOT_time || Date.now(),
      //   }));

      //   setOrderItems(updatedItems);
      //   Toaster.success("KOT generated successfully");
      //   // Notify others in DINE IN mode
      //   if (orderMode === "DINE IN") {
      //     emit("broadcastToFooder", {
      //       fooderID: user?.fooderID || user?.fooder_id,
      //       event: "table_booked",
      //       data: {
      //         tableId: selectedTable?.id || selectedTable?.table_id,
      //         fooderID: user?.fooderID || user?.fooder_id,
      //         socketId,
      //       },
      //     });
      // }
      // }

      if (response.data?.status === "success") {


        setKotNo(response.data.KOT_no);
        setKotId(response.data.id);

        const updatedItems = orderItems.map((item) => ({
          ...item,
          isKOT: item.isKOT || true,
          KOT_id: item.KOT_id || response.data.id,
          KOT_no: item.KOT_no || response.data.KOT_no,
          KOT_time: item.KOT_time || Date.now(),
        }));

        setOrderItems(updatedItems);
        Toaster.success("KOT generated successfully");

        if (orderMode === "DINE IN") {
          emit("broadcastToFooder", {
            fooderID: user?.fooderID || user?.fooder_id,
            event: "table_booked",
            data: {
              tableId: selectedTable?.id || selectedTable?.table_id,
              fooderID: user?.fooderID || user?.fooder_id,
              socketId,
            },
          });
        }

      } else {
        const errorMsg =
          response.data?.message ||
          response.data?.error?.message ||
          "Failed to generate KOT";
        Toaster.error(errorMsg);
      }
    } catch (error) {
      const message =
        error.response?.data?.message ||
        error.response?.data?.error?.message ||
        "Failed to generate KOT";
      Toaster.error(message);
    } finally {
      setIsSavingKOT(false);
      setFullLoader(false);
    }
  };

  const handleSaveBill = async (kotGeneration = true) => {
    const appData = await getAppDataFromDB();
    const fooderData = appData || {};

    const productList = appData?.product || [];

    // Loop through all order items and see if any product is missing from DB
    const missingProduct = orderItems.find(
      (item) => !productList.some((p) => Number(p.id) === Number(item.id))
    );

    if (missingProduct) {
      console.warn("Product not found in DB:", missingProduct);
      window.location.reload();
      return;
    }
    if (orderMode === "COUNTER" || orderMode === "DELIVERY") {
      // Validate required fields for delivery
      if (orderMode === "DELIVERY") {
        if (!customerPhone || customerPhone.length !== 10) {
          setActiveTab && setActiveTab("details");
          Toaster.error("Please enter a valid 10-digit mobile number");
          return;
        }
        if (!customerDetails.name || customerDetails.name.trim() === "") {
          setActiveTab && setActiveTab("details");
          Toaster.error("Please enter customer name");
          return;
        }
        if (!customerDetails.address || customerDetails.address.trim() === "") {
          setActiveTab && setActiveTab("details");
          Toaster.error("Please enter address");
          return;
        }
        if (!deliveryGuyId) {
          setActiveTab && setActiveTab("details");
          Toaster.error("Please select a delivery guy");
          return;
        }
      }

      setIsSavingBill(true);
      try {
        // Step 1: Generate KOT for items without KOT
        const itemsWithoutKOT = orderItems.filter((item) => !item.isKOT);
        let updatedItems = [...orderItems];
        if (itemsWithoutKOT.length > 0) {
          const temp_kot = orderItems
            .filter((item) => item.KOT_id)
            .map((item) => item.KOT_id);
          const kotPayload = itemsWithoutKOT.map((item) => ({
            ...item,
            table_id: selectedTable?.table_id || selectedTable?.id,
            fooder_name: fooderData.fooder_name,
            order_type: orderMode === "DELIVERY" ? "DELIVERY" : "TAKE AWAY",
            order_id: orderId || "",
            all_kots: temp_kot,
            product_id: item.id,
            product_name: item.name || item.product?.name,
            product_price:
              item.product_price || (item.price ? item.price.toString() : ""),
            product_proprice: item.product_proprice || "",
            staffDetails: staffDetails,
          }));
          setFullLoader(true);
          const kotResponse = await axiosInstance.post(PostSaveKot, kotPayload);
          if (kotResponse.data?.status === "success") {
            updatedItems = orderItems.map((item) => ({
              ...item,
              isKOT: item.isKOT || true,
              KOT_id: item.KOT_id || kotResponse.data.id,
              KOT_no: item.KOT_no || kotResponse.data.KOT_no,
              KOT_time: item.KOT_time || Date.now(),
            }));
            setOrderItems(updatedItems);
            Toaster.success("KOT generated successfully");
          } else {
            Toaster.error(
              kotResponse.data?.message || "Failed to generate KOT"
            );
            setFullLoader(false);
            setIsSavingBill(false);
            return;
          }
          setFullLoader(false);
        }
        // Step 2: Create order for delivery/counter
        const serviceChargeValue = calculateServiceChargeAmount();
        const orderPayload = {
          eater_name: customerDetails.name || "",
          eater_phonenumber: customerDetails.mobile || "",
          address: customerDetails.address || "",
          eater_suggestions: customerDetails.eater_suggestions,
          delivery_guy_id: orderMode === "DELIVERY" ? deliveryGuyId : 0,
          table_id:
            orderMode === "DELIVERY"
              ? "dk"
              : orderMode === "COUNTER"
                ? "tk"
                : selectedTable?.table_id || selectedTable?.id,
          order_type: orderMode === "DELIVERY" ? "DELIVERY" : "TAKE AWAY",
          subtotal: calculateSubtotal().toFixed(2),
          service_charge: serviceChargeValue, // <-- send calculated value, not %
          tax_amount: totalTax.toFixed(2),
          // total: total + roundOffValue,
          total: total,

          discount_type: discountMode.toString(),
          discount_rate: discountValue.toString(),
          details: updatedItems.map((item) => ({
            ...item,
            product_price:
              item.product_price || (item.price ? item.price.toString() : ""),
            product_proprice: item.product_proprice || "",
          })),
          service_charge_details: serviceChargeDetails,
          tax_details: Object.keys({ ...cgstMap, ...sgstMap })
            .map((rate) => [
              cgstMap[rate] && {
                name: "CGST",
                percentage: Number(rate),
                amount: cgstMap[rate].toFixed(2),
              },
              sgstMap[rate] && {
                name: "SGST",
                percentage: Number(rate),
                amount: sgstMap[rate].toFixed(2),
              },
            ])
            .flat()
            .filter(Boolean),
          cart_packing_charges: totalPackagingCharges,
          round_up_amount: Number(roundOffValue),
          is_NC: isNC,
        };

        let orderResponse;

        try {
          setFullLoader(true);

          orderResponse = await axiosInstance.post(
            PostCreateOrderForDeliveryAndTakeAway,
            orderPayload
          );
          if (orderResponse.data?.status === "success") {
            const { invoice_number, order_number, table_no } =
              orderResponse.data; //added
            setOrderId(orderResponse.data.order_id);
            if (onOrderNoUpdate)
              onOrderNoUpdate(orderResponse.data.order_number);
            setInvoiceNumber(String(orderResponse.data.invoice_number || ""));
            setOrdercreateno(orderResponse.data.order_number || "");
            // await handlePrintBill(invoiceNumber);
            //  Get invoice number

            //  await handlePrintBill(invoiceNumber);
            // Mark all items as saved
            const savedItems = updatedItems.map((item) => ({
              ...item,
              isSaved: true,
            }));
            setOrderItems(savedItems);
            Toaster.success("Order created successfully");
            if (staffType === 1) {
              setActiveTab && setActiveTab("markpaid");
            }
            return { invoice_number, order_number, table_no }; //added
          } else {
            Toaster.error(
              orderResponse.data?.message || "Failed to create order"
            );
          }
        } catch (error) {
          Toaster.error(
            orderResponse.data?.message || "Failed to create order"
          );
        } finally {
          setFullLoader(false);
        }
      } catch (error) {
        Toaster.error(error.message || "Failed to complete bill process");
      } finally {
        setIsSavingBill(false);
        setFullLoader(false);
      }
      return;
    }
    if (orderMode === "DINE IN") {
      setFullLoader(true);
      setIsSavingBill(true);
      if (!orderItems.length) {
        Toaster.error("No items to create order");
        setIsSavingBill(false);
        setFullLoader(false);
        return;
      }
      if (customerPhone && customerPhone.length !== 10) {
        Toaster.error(
          "Please enter a valid 10-digit mobile number for the customer"
        );
        setIsSavingBill(false);
        setFullLoader(false);
        return;
      }

      try {
        // Step 1: Generate KOT for items without KOT
        const itemsWithoutKOT = orderItems.filter((item) => !item.isKOT);
        let updatedItems = [...orderItems]; // Create a copy of orderItems


        if (itemsWithoutKOT.length > 0) {
          const temp_kot = orderItems
            .filter((item) => item.KOT_id)
            .map((item) => item.KOT_id);

          const kotPayload = itemsWithoutKOT.map((item) => ({
            ...item,
            table_id: selectedTable?.table_id || selectedTable?.id,
            fooder_name: fooderData.fooder_name,
            order_type: "DINE IN",
            order_id: orderId || "",
            all_kots: temp_kot,
            product_id: item.id,
            product_name: item.name || item.product?.name,
            product_price:
              item.product_price || (item.price ? item.price.toString() : ""),
            product_proprice: item.product_proprice || "",
            staffDetails: staffDetails,
          }));

          setFullLoader(true);

          const kotResponse = await axiosInstance.post(PostSaveKot, kotPayload);

          if (kotResponse.data?.status === "success") {
            // Update items with KOT information
            updatedItems = orderItems.map((item) => ({
              ...item,
              isKOT: item.isKOT || true,
              KOT_id: item.KOT_id || kotResponse.data.id,
              KOT_no: item.KOT_no || kotResponse.data.KOT_no,
              KOT_time: item.KOT_time || Date.now(),
            }));
            setOrderItems(updatedItems);
            Toaster.success("KOT generated successfully");
          } else {
            throw new Error(
              kotResponse.data?.message || "Failed to generate KOT"
            );
          }
        }



        // Prepare the common payload details
        const commonPayloadDetails = updatedItems.map((item) => ({
          menu_id: item.menu_id || item.product?.menu_id || item.product?.id,
          tax_percent: item.tax_percent ?? 0,
          tax_type: item.tax_type ?? 0,
          product_type: item.product_type ?? 0,
          dine_in_service: item.dine_in_service ?? 1,
          delivery_service: item.delivery_service ?? 1,
          pick_up_service: item.pick_up_service ?? 1,
          min_order_quantity: item.min_order_quantity ?? 1,
          quantity: item.quantity,
          packaging_charges: item.packaging_charges ?? "0",
          variants: item.variants || [],
          attributes: item.attributes || [],
          addons: item.addons || [],
          local_id: item.local_id || Date.now(),
          fooder_id: item.fooder_id,
          table_id: selectedTable?.table_id || selectedTable?.id,
          fooder_name: fooderData.fooder_name,
          product_special_note: item.product_special_note || "",
          isKOT: true,
          isSaved: item.isSaved || false,
          KOT_id: item.KOT_id,
          KOT_no: item.KOT_no || "",
          KOT_time: item.KOT_time || Date.now(),
          selectedAddons: item.selectedAddons || [],
          selectedvariants: item.selectedvariants || { variantId: 0 },
          variant_id:
            item.selectedvariants &&
              !isNaN(parseInt(item.selectedvariants.variantId))
              ? parseInt(item.selectedvariants.variantId)
              : 0,
          withTaxPrice: item.withTaxPrice ?? item.price ?? 0,
          withOutTaxPrice: item.withOutTaxPrice ?? item.price ?? 0,
          product_id: item.product_id || item?.product_id || item?.id,
          product_name: item.product_name || item?.name,
          product_price:
            item.product_price || (item.price ? item.price.toString() : ""),
          product_proprice: item.product_proprice || "",
          orderId: orderId || null,
        }));

        // Step 2: Create or update the order/bill
        if (!orderNo) {
          // First time order creation
          const serviceChargeValue = calculateServiceChargeAmount();
          const payload = {
            eater_name: customerDetails.name || "",
            eater_phonenumber: customerDetails.mobile || "",
            address: customerDetails.address || "",
            eater_suggestions: customerDetails.eater_suggestions,
            no_of_eaters: "1",
            payment_type:
              paymentMethod.charAt(0).toUpperCase() + paymentMethod.slice(1),
            waiter_id: 0,
            table_id: selectedTable?.table_id || selectedTable?.id,
            order_type: "DINE IN",
            subtotal: calculateSubtotal().toFixed(2),
            service_charge: serviceChargeValue, // <-- send calculated value, not %
            tax_amount: calculateTax(),
            total: calculateTotal(),
            discount_type: discountMode.toString(),
            discount_rate: discountValue.toString(),
            details: commonPayloadDetails,
            service_charge_details: {
              name: serviceChargeDetails.name,
              percentage: serviceChargeDetails.percentage,
            },
            tax_details: [],
            cart_packing_charges: 0,
            round_off_amount: Number(roundOffValue),
            is_NC: isNC,
          };

          const orderResponse = await axiosInstance.post(
            PostCreateOrder,
            payload
          );

          if (orderResponse.data?.status === "success") {

            const { invoice_number, order_number, table_no } =
              orderResponse?.data; //added
            setOrderId(orderResponse.data.order_id);
            if (onOrderNoUpdate)
              onOrderNoUpdate(orderResponse.data.order_number);
            setInvoiceNumber(orderResponse.data.invoice_number || "");
            setOrderTime(orderResponse.data.creation_date || "");
            setOrdercreateno(orderResponse.data.order_number || "");
            const savedItems = updatedItems.map((item) => ({
              ...item,
              isSaved: true,
            }));
            setOrderItems(savedItems);
            Toaster.success("Order created successfully");
            if (staffType === 1) {
              setActiveTab && setActiveTab("markpaid");
            }
            return { invoice_number, order_number, table_no };

          } else {
            throw new Error(
              orderResponse.data?.message || "Failed to create order"
            );
          }
        } else {
          if (!orderId) {
            Toaster.error("Order ID is missing. Please save the bill first.");
            setIsSavingBill(false);
            return;
          }
          // Subsequent updates to existing order
          const serviceChargeValue = calculateServiceChargeAmount();
          const updatePayload = {
            order_id: orderId,
            subtotal: calculateSubtotal().toFixed(2),
            service_charge: serviceChargeValue, // <-- send calculated value, not %
            tax_amount: "0.00",
            total: calculateTotal(),
            discount_type: discountMode.toString(),
            discount_rate: discountValue.toString(),
            details: commonPayloadDetails,
            service_charge_details: {
              name: serviceChargeDetails.name,
              percentage: serviceChargeDetails.percentage,
            },
            round_up_amount: Number(roundOffValue),
            is_NC: isNC,
          };

          const updateResponse = await axiosInstance.post(
            PostAfterOrderGenerateUpdateNewItem,
            updatePayload
          );

          if (updateResponse.data?.status === "success") {
            const { invoice_number, order_number, table_no } = updateResponse?.data;
            const savedItems = updatedItems.map((item) => ({
              ...item,
              isSaved: true,
            }));
            setOrderItems(savedItems);
            Toaster.success(updateResponse.data.message);
            setIsNCToggledAfterOrder(false);
            if (staffType === 1) {
              setActiveTab && setActiveTab("markpaid");
            }
            return { invoice_number, order_number, table_no };
          } else {
            throw new Error(
              updateResponse.data?.message || "Failed to update order"
            );
          }
        }
      } catch (error) {
        if (error.response && error.response.data) {
          Toaster.error(
            typeof error.response.data === "string"
              ? error.response.data
              : error.response.data.message ||
              JSON.stringify(error.response.data)
          );
        } else {
          Toaster.error(error.message || "Failed to complete bill process");
        }
        console.error(error);
      } finally {
        setIsSavingBill(false);
        setFullLoader(false);
      }
    }
  };

  // Paid button handler for delivery/counter
  const handleDeliveryPayment = async () => {
    setFullLoader(true);
    console.log("paymentEntries :" + JSON.stringify(paymentEntries));
    try {
      // Build the full detailed payload for all order modes
      const basePayload = {
        subtotal: calculateSubtotal().toFixed(2),
        discount_type: discountMode.toString(),
        discount_rate: discountValue.toString(),
        discount_value: totalDiscount.toFixed(2),
        // payment_details: paymentEntries.map((entry) => ({
        //   method: entry.method,
        //   amount: entry.amount,
        //   tip: entry.tip || 0,
        //   upiType: entry.upiSubMethod || "",
        //   note: entry.note || "",
        //   transaction_id: entry.transactionId || "",
        // })),

        payment_details: paymentEntries.map((entry) => ({
          method: entry.method?.toLowerCase().startsWith("upi")
            ? "UPI"
            : entry.method,
          amount: entry.amount,
          tip: entry.tip || 0,
          upiType: entry.upiSubMethod || "",
          note: entry.note || "",
          transaction_id: entry.transactionId || "",
        })),

        due_amount: dueAmount,
        service_charge: calculateServiceChargeAmount(),
        service_charge_details: serviceChargeDetails,
        tax_amount: totalTax.toFixed(2),
        tax_details: Object.keys({ ...cgstMap, ...sgstMap })
          .map((rate) => [
            cgstMap[rate] && {
              name: "CGST",
              percentage: Number(rate),
              amount: cgstMap[rate].toFixed(2),
            },
            sgstMap[rate] && {
              name: "SGST",
              percentage: Number(rate),
              amount: sgstMap[rate].toFixed(2),
            },
          ])
          .flat()
          .filter(Boolean),
        paided_amount: paymentEntries
          .reduce((sum, entry) => sum + parseFloat(entry.amount || 0), 0)
          .toFixed(2),
        // total: (total + roundOffValue).toFixed(2),
        total: (total).toFixed(2),

        payment_status: dueAmount <= 0 ? 1 : totalPaid > 0 ? 3 : 0,
        round_up_amount: Number(roundOffValue),
        item: orderItems.map((item) => ({
          product_id: item.product_id || item.id,
          product_name: item.product_name || item.name,
          quantity: item.quantity,
          price: item.price,
          withOutTaxPrice: item.withOutTaxPrice,
          withTaxPrice: item.withTaxPrice,
          packaging_charges: item.packaging_charges,
          tax_percent: item.tax_percent,
          tax_type: item.tax_type,
          product_type: item.product_type,
          dine_in_service: item.dine_in_service,
          delivery_service: item.delivery_service,
          pick_up_service: item.pick_up_service,
          min_order_quantity: item.min_order_quantity,
          fooder_id: item.fooder_id,
          table_id: item.table_id,
          fooder_name: item.fooder_name,
          product_special_note: item.product_special_note,
          isKOT: item.isKOT,
          isSaved: item.isSaved,
          KOT_id: item.KOT_id,
          KOT_no: item.KOT_no,
          KOT_time: item.KOT_time,
          selectedAddons: item.selectedAddons,
          selectedvariants: item.selectedvariants,
          variant_id: item.variant_id,
          addons: item.addons,
          attributes: item.attributes,
        })),
      };
      let payload;
      if (orderMode === "DINE IN") {
        payload = { id: orderId, ...basePayload };
      } else {
        payload = { order_id: orderId, ...basePayload };
      }
      let response;
      if (orderMode === "DINE IN") {
        response = await axiosInstance.post(
          PostPartialPaymentForDineIn,
          payload
        );
      } else {
        response = await axiosInstance.post(
          PostPosPaymentForDeliveryAndPickUp,
          payload
        );
      }
      // if (response.data && response.data.status === "success") {
      //   Toaster.success(response.data.message || "Payment successful");
      //   setPaymentEntries([]);
      //   setCurrentPayment({
      //     method: paymentMethod,
      //     amount: "",
      //     tip: "",
      //     upiSubMethod: "",
      //     transactionId: "",
      //   });
      //   setCustomerDetails({ name: "", mobile: "", address: "" });
      //   setCustomerPhone("");
      //   setIsNC(false);
      //   setSearchTerm("");
      //   if (onPaymentSuccess) onPaymentSuccess();
      // }
      if (response.data && response.data.status === "success") {
        Toaster.success(response.data.message || "Payment successful");

        // Clear payment entry list
        setPaymentEntries([]);

        // Reset current payment fields (always to Cash)
        setCurrentPayment({
          method: "cash",
          amount: "",
          tip: "",
          upiSubMethod: "",
          transactionId: "",
        });

        // Explicitly reset individual fields
        setTransactionId("");
        setPaidAmount("");
        setTipAmount(0);
        setReason(""); // clear hold reason
        setPaymentMethod("cash"); // always reset to cash

        // Reset customer info
        setCustomerDetails({ name: "", mobile: "", address: "" });
        setCustomerPhone("");

        // Reset flags/search
        setIsNC(false);
        setSearchTerm("");

        if (onPaymentSuccess) onPaymentSuccess();
      } else {
        Toaster.error(response.data?.message || "Payment failed");
      }
    } catch (err) {
      Toaster.error(err.response?.data?.message || "Payment failed");
    } finally {
      setFullLoader(false);
    }
  };
  // Removed second localStorage sync logic - no longer saving to localStorage

  // Helper function to delete KOT item and return response
  const deleteKOTItemWithResponse = async (deleteKOTItem, reason = "") => {
    let totalKotItem = orderItems.reduce(
      (count, order) => count + (order?.isKOT ? 1 : 0),
      0
    );

    const dataToSend = {
      kot_id: deleteKOTItem.KOT_id,
      tableId: selectedTable,
      is_booked: totalKotItem > 1 ? 1 : 0,
      is_bill: deleteKOTItem.isSaved,
      orderId: orderId,
      local_id: deleteKOTItem.local_id,
      remove_item: {
        product_id: deleteKOTItem.id,
        reason: reason || "Item removed by user",
        local_id: deleteKOTItem.local_id,
      },
      deleteKOTItem: deleteKOTItem,
    };

    setFullLoader(true);
    try {
      const response = await axiosInstance.post(
        DeleteKOTGeneratedItemURL,
        dataToSend
      );

      if (response.status === 200 && response.data.message) {
        return { status: "success", data: response.data };
      } else {
        throw new Error(response.data?.message || "Failed to delete item");
      }
    } catch (error) {
      throw new Error(error.response?.data?.message || "Failed to delete item");
    } finally {
      setFullLoader(false);
    }
  };

  // Function to print cancelled KOT for deleted item
  const printCancelledKOT = async (deletedItem, reason) => {
    try {
      const appData = await getAppDataFromDB();
      const enableSilentPrinting = Number(appData?.enable_silent_printing) || 0;

      const kotNo = deletedItem.KOT_no || "KOT-CANCELLED";
      const tableNo = selectedTable?.table_no || selectedTable?.name || "Table";

      const now = new Date();
      const currentDate = now.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
      const currentTime = now.toLocaleTimeString("en-GB", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      });

      const itemName = deletedItem.name || deletedItem.product?.name;

      const item = deletedItem



      console.log("%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%")
      console.log(deletedItem)
      const quantity = deletedItem.quantity;

      // Thermal printer data for cancelled KOT
      const cancelledKotData = `ESC @
ESC ! 0x08
ESC a 0x01
CANCELLED - ${kotNo}
ESC ! 0x00
ESC a 0x00
Date : ${currentDate}
Time : ${currentTime}
${orderMode} : ${tableNo}

ESC ! 0x08
CANCELLED ITEM
ESC ! 0x00
================================
${itemName}${" ".repeat(Math.max(1, 20 - itemName.length))}${quantity}
================================

Reason: ${reason}

ESC d 5
GS V 0x41 0x03`;

      // HTML version for browser print
      const cancelledKotHTML = `
      <html>
        <head>
          <style>
            body { font-family: 'Courier New', monospace; padding: 20px; font-size: 14px; }
            .text-center { text-align: center; }
            .text-right { text-align: right; }
            .cancelled-header { background-color: #ffebee; padding: 10px; border: 2px solid #f44336; color: #d32f2f; font-weight: bold; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; }
            th, td { padding: 4px; border-bottom: 1px dashed #ccc; }
            hr { border: none; border-top: 1px dashed #000; margin: 10px 0; }
            .reason-box { background-color: #fff3e0; padding: 8px; border: 1px solid #ff9800; margin-top: 10px; }
          </style>
        </head>
        <body>
        
          <div class="text-center">
            <h3 style="margin: 10px 0;">${kotNo}</h3>
            <p style="margin: 0;">Date: ${currentDate} &nbsp; Time: ${currentTime}</p>
            <p style="margin: 0;">Mode: ${orderMode} | ${tablenotoprint}</p>
          </div>
          <hr />
          <div style="text-align: center; font-weight: bold; color: #d32f2f;">
            CANCELLED ITEM
          </div>
          <table>
            <thead><tr><th>Item</th><th class="text-right">Qty</th></tr></thead>
            <tbody>
              <tr style="background-color: #ffebee;">
                <td>${itemName}
                
                
                 ${item?.selectedvariants &&
          item?.selectedvariants?.combination_details
          ? item.selectedvariants.combination_details
            .map(
              (i) =>
                `<div><b>${i.attribute_name}:</b> ${i.attribute_value_name}</div>`
            )
            .join("")
          : ""
        }

          ${item?.addons &&
        item?.addons
          .map(
            (i, no) => `<div><b>${no + 1}.</b> ${i.addon_item_name}</div>`
          )
          .join("")
        }
                
                
                
                
                
                
                
                
                </td>
                <td class="text-right">${quantity}</td>
              </tr>
            </tbody>
          </table>
          <hr />
          <div class="reason-box">
            <strong>Cancellation Reason:</strong><br/>
            ${reason}
          </div>
          <hr />
          <p class="text-center">Generated by POS</p>
        </body>
      </html>`;

      if (enableSilentPrinting === 1) {
        // Silent print to thermal printer
        const printResponse = await fetch("http://localhost:3111/print", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ printerType: "kot", data: cancelledKotData }),
        });

        if (!printResponse.ok) {
          const errorText = await printResponse.text();
          throw new Error(errorText || "Failed to print cancelled KOT");
        }
      } else {
        // Browser print using iframe
        let iframe = document.getElementById("print-iframe");
        if (!iframe) {
          iframe = document.createElement("iframe");
          iframe.id = "print-iframe";
          iframe.style.position = "fixed";
          iframe.style.right = "0";
          iframe.style.bottom = "0";
          iframe.style.width = "0";
          iframe.style.height = "0";
          iframe.style.border = "0";
          document.body.appendChild(iframe);
        }

        const doc = iframe.contentWindow.document;
        doc.open();
        doc.write(cancelledKotHTML);
        doc.close();

        setTimeout(() => {
          iframe.contentWindow.focus();
          iframe.contentWindow.print();
        }, 300);
      }
    } catch (error) {
      console.error("Print cancelled KOT error:", error);
      throw new Error(error.message || "Failed to print cancelled KOT");
    }
  };

  const handleKOTItemDelete = async (deleteKOTItem, reason = "") => {
    let totalKotItem = orderItems.reduce(
      (count, order) => count + (order?.isKOT ? 1 : 0),
      0
    );

    const dataToSend = {
      kot_id: deleteKOTItem.KOT_id,
      tableId: selectedTable,
      is_booked: totalKotItem > 1 ? 1 : 0,
      is_bill: deleteKOTItem.isSaved,
      orderId: orderId,
      local_id: deleteKOTItem.local_id,
      remove_item: {
        product_id: deleteKOTItem.id,
        reason: reason || "Item removed by user",
        local_id: deleteKOTItem.local_id,
      },
      deleteKOTItem: deleteKOTItem,
    };
    setFullLoader(true);

    try {
      const response = await axiosInstance.post(
        DeleteKOTGeneratedItemURL,
        dataToSend
      );

      if (response.status === 200 && response.data.message) {
        Toaster.success(response.data.message);
        setOrderItems(
          orderItems.filter(
            (item) =>
              !(
                item.id === deleteKOTItem.id &&
                item.local_id === deleteKOTItem.local_id
              )
          )
        );
      }
    } catch (error) {
      Toaster.error(error.response?.data?.message || "Failed to delete item");
      console.log(error);
    } finally {
      setFullLoader(false);
    }
  };

  // Function to show delete modal
  const showDeleteConfirmation = (item) => {
    console.log(item);
    setItemToDelete(item);
    setDeleteReason("");
    setShowDeleteModal(true);
  };
  // Function to handle delete confirmation
  const handleDeleteConfirm = async (reason) => {
    if (!itemToDelete) return;
    if (!reason.trim()) return;
    setIsDeleting(true);
    try {
      await handleKOTItemDelete(itemToDelete, reason.trim());
      setShowDeleteModal(false);
      setItemToDelete(null);
    } catch (error) {
      // error handling if needed
    } finally {
      setIsDeleting(false);
    }
  };

  // Function to handle delete and print
  const handleDeleteAndPrint = async (reason) => {
    if (!itemToDelete) return;
    if (!reason.trim()) return;
    // setIsDeleting(true);
    setIsProcessingDelete(true);
    try {
      // Call the delete API
      const response = await deleteKOTItemWithResponse(
        itemToDelete,
        reason.trim()
      );

      if (response?.status === "success") {
        // Print cancelled KOT
        await printCancelledKOT(itemToDelete, reason.trim());

        // Update UI
        setOrderItems(
          orderItems.filter(
            (item) =>
              !(
                item.id === itemToDelete.id &&
                item.local_id === itemToDelete.local_id
              )
          )
        );

        setShowDeleteModal(false);
        setItemToDelete(null);
        Toaster.success("Item deleted and cancellation KOT printed");
      }
    } catch (error) {
      console.error("Delete and print error:", error);
      Toaster.error(error.message || "Failed to delete and print");
    } finally {
      // setIsDeleting(false);
      setIsProcessingDelete(false);
    }
  };

  // Function to cancel delete
  const handleDeleteCancel = () => {
    setShowDeleteModal(false);
    setItemToDelete(null);
  };

  // Remove item handler: if KOT generated, call API; else remove from local state by local_id
  const handleRemoveItem = (itemId, localId, tableId, KOT_id) => {
    const item = orderItems.find((i) => i.local_id === localId);
    if (item && item.isKOT) {
      handleKOTItemDelete(item);
    } else {
      setOrderItems(orderItems.filter((i) => i.local_id !== localId));
    }
  };

  // Utility function to convert UNIX timestamp to Indian time string (hh:mm:ss AM/PM)
  function formatUnixToISTTime(unixTimestamp) {
    if (!unixTimestamp) return "";
    // If timestamp is in seconds, convert to ms
    const ts =
      String(unixTimestamp).length === 10
        ? unixTimestamp * 1000
        : Number(unixTimestamp);
    const date = new Date(ts);
    // Use toLocaleString with Asia/Kolkata timezone for accurate IST
    return date
      .toLocaleTimeString("en-IN", {
        hour: "2-digit",
        minute: "2-digit",
        // second: '2-digit',
        hour12: true,
        timeZone: "Asia/Kolkata",
      })
      .toLowerCase();
  }

  const prevOrderItemsLengthRef = useRef(orderItems.length);

  useEffect(() => {
    if (orderItems.length > prevOrderItemsLengthRef.current) {
      setActiveTab("items");
    }
    prevOrderItemsLengthRef.current = orderItems.length;
  }, [orderItems]);

  useEffect(() => {
    if ((orderNo || orderId) && typeof isNC === "boolean") {
      setIsNCToggledAfterOrder(true);
    }
  }, [isNC]);

  useEffect(() => {
    if (orderId) {
      setIsNCToggledAfterOrder(false);
    }
  }, [orderId]);

  const renderItemsTab = () => {
    return (
      <div
        className="custom-scroll"
        style={{
          height: "100%",
          maxHeight: "calc(100vh - 200px)",
          overflowY: "auto",
          scrollbarWidth: "thin",
          msOverflowStyle: "none",
        }}
      >
        {orderItems.length === 0 ? (
          <div className="text-center text-muted mt-4">
            <div className="h5 fw-medium">No Items Found!</div>
          </div>
        ) : (
          <>
            {Object.entries(groupedItems).map(([kotNo, items]) =>
              kotNo === "No KOT" ? (
                <React.Fragment key={kotNo}>
                  {items.length > 0 && (
                    <div
                      className=" fw-semibold px-3 mt-1 "
                      style={{ fontSize: "13px", color: "#dc2626" }}
                    >
                      Click on{" "}
                      <span className="text-uppercase">
                        SAVE KOT / PRINT KOT
                      </span>{" "}
                      to generate KOT
                    </div>
                  )}
                  <div>
                    {items.map((item, idx) => (
                      <OrderItem
                        key={`${item.id}-${item.name}-${idx}`}
                        item={item}
                        idx={idx}
                        onUpdateQuantity={onUpdateQuantity}
                        onRemoveItem={handleRemoveItem}
                        handlePlusClickAfterKOT={handlePlusClickAfterKOT}
                        handleMinusClickAfterKOT={handleMinusClickAfterKOT}
                        handleKOTItemDelete={handleKOTItemDelete}
                        showDeleteConfirmation={showDeleteConfirmation}
                        kotitemsdelete={kotitemsdelete}
                        staffType={staffType}
                        appPermission={appPermission}
                        showDeleteButton={1}
                      />
                    ))}
                  </div>
                </React.Fragment>
              ) : (
                <div key={kotNo}>
                  <div
                    className="d-flex justify-content-between align-items-center px-3 pt-1 pb-1"
                    style={sidebarStyles.kotInfo}
                  >
                    <strong style={{ fontSize: "13px" }}>
                      {kotNo}
                      {items[0]?.staffDetails?.staff_name && (
                        <span
                          style={{
                            fontSize: "13px",
                            marginLeft: "8px",
                            fontWeight: "normal",
                            color: "blue",
                          }}
                        >
                          ( {items[0].staffDetails.staff_name})
                        </span>
                      )}
                    </strong>
                    {/* Show KOT time from kot_timestamp in IST */}
                    <strong style={{ fontSize: "13px" }}>
                      {formatUnixToISTTime(
                        items[0]?.kot_timestamp || items[0]?.KOT_time
                      )}
                    </strong>
                  </div>
                  {items.map((item, idx) => (
                    <OrderItem
                      key={`${item.id}-${item.name}-${idx}`}
                      item={item}
                      idx={idx}
                      onUpdateQuantity={onUpdateQuantity}
                      onRemoveItem={handleRemoveItem}
                      handlePlusClickAfterKOT={handlePlusClickAfterKOT}
                      handleMinusClickAfterKOT={handleMinusClickAfterKOT}
                      handleKOTItemDelete={handleKOTItemDelete}
                      showDeleteConfirmation={showDeleteConfirmation}
                      kotitemsdelete={kotitemsdelete}
                      staffType={staffType}
                      appPermission={appPermission}
                      orderNo={orderNo}
                      orderMode={orderMode}
                    />
                  ))}
                </div>
              )
            )}
          </>
        )}
      </div>
    );
  };

  const renderDetailsTab = () => (
    <div
      className="p-3 custom-scroll"
      style={{ height: "100%", overflow: "auto" }}
    >
      <div className="mb-3">
        <label
          className="form-label"
          style={{ fontSize: "16px", fontWeight: 500 }}
        >
          Mobile
          {orderMode === "DELIVERY" && <span style={{ color: "red" }}>*</span>}
        </label>
        <input
          type="text"
          className="form-control"
          value={customerPhone}
          onChange={async (e) => {
            const val = e.target.value.replace(/\D/g, "");
            setCustomerPhone(val);
            setCustomerDetails((cd) => ({ ...cd, mobile: val }));
            if (val.length === 10) {
              setIsFetchingCustomer(true);
              try {
                const res = await axiosInstance.get(
                  `${GET_EATER_DETAILS}?eater_phonenumber=${val}`
                );
                if (
                  res.data &&
                  res.data.status === "success" &&
                  res.data.data
                ) {
                  setCustomerDetails(res.data.data);
                  Toaster.success(res.data.message || "Existing customer");
                } else {
                  setCustomerDetails({
                    ...customerDetails,
                    name: "",
                    mobile: val,
                    address: "",
                  });
                  Toaster.info("New customer, please fill details");
                }
              } catch (err) {
                setCustomerDetails({
                  ...customerDetails,
                  name: "",
                  mobile: val,
                  address: "",
                });
                Toaster.error("Failed to fetch customer");
              } finally {
                setIsFetchingCustomer(false);
              }
            } else {
              setCustomerDetails({
                ...customerDetails,
                name: "",
                mobile: val,
                address: "",
              });
            }
          }}
          placeholder="Enter Mobile"
          maxLength={10}
          required={orderMode === "DELIVERY"}
        />
      </div>
      <div className="mb-3">
        <label
          className="form-label"
          style={{ fontSize: "16px", fontWeight: 500 }}
        >
          Name
          {orderMode === "DELIVERY" && <span style={{ color: "red" }}>*</span>}
        </label>
        <input
          type="text"
          className="form-control"
          value={customerDetails.name}
          onChange={(e) =>
            setCustomerDetails((cd) => ({ ...cd, name: e.target.value }))
          }
          placeholder="Enter Name"
          required={orderMode === "DELIVERY"}
        />
      </div>
      <div className="mb-3">
        <label
          className="form-label"
          style={{ fontSize: "16px", fontWeight: 500 }}
        >
          Address
          {orderMode === "DELIVERY" && <span style={{ color: "red" }}>*</span>}
        </label>
        <input
          type="text"
          className="form-control"
          value={customerDetails.address}
          onChange={(e) =>
            setCustomerDetails((cd) => ({ ...cd, address: e.target.value }))
          }
          placeholder="Address"
          required={orderMode === "DELIVERY"}
        />
      </div>
      {orderMode === "DELIVERY" && (
        <div className="mb-3">
          <label
            className="form-label"
            style={{ fontSize: "16px", fontWeight: 500 }}
          >
            Assign Delivery Guy<span style={{ color: "red" }}>*</span>
          </label>
          <select
            className="form-select"
            value={deliveryGuyId}
            onChange={(e) => setDeliveryGuyId(e.target.value)}
            required
          >
            <option value="">Select...</option>
            {deliveryGuys.map((guy) => (
              <option key={guy.id} value={guy.id}>
                {guy.name} (Delivery Guy)
              </option>
            ))}
          </select>
          {selectedDeliveryGuy && (
            <div
              className="mt-2"
              style={{ border: "1px solid #eee", borderRadius: 6, padding: 8 }}
            >
              {selectedDeliveryGuy.name && (
                <div>
                  <span role="img" aria-label="user">
                    👤
                  </span>{" "}
                  {selectedDeliveryGuy.name}
                </div>
              )}

              {selectedDeliveryGuy.phone_number && (
                <div>
                  <span role="img" aria-label="phone">
                    📞
                  </span>{" "}
                  {selectedDeliveryGuy.phone_number}
                </div>
              )}

              {selectedDeliveryGuy.email && (
                <div>
                  <span role="img" aria-label="email">
                    📧
                  </span>{" "}
                  {selectedDeliveryGuy.email}
                </div>
              )}
            </div>
          )}
        </div>
      )}
      {orderMode !== "DELIVERY" && (
        <div className="mb-3">
          <label
            className="form-label"
            style={{ fontSize: "16px", fontWeight: 500 }}
          >
            Total People
          </label>
          <input type="number" className="form-control" defaultValue={1} />
        </div>
      )}
      <div className="mb-3">
        <label
          className="form-label"
          style={{ fontSize: "16px", fontWeight: 500 }}
        >
          Customer Suggestions
        </label>
        <textarea
          className="form-control"
          placeholder="Enter Suggestions"
          rows="2"
          maxLength={200}
          value={customerDetails.eater_suggestions || ""}
          onChange={(e) =>
            setCustomerDetails((cd) => ({
              ...cd,
              eater_suggestions: e.target.value,
            }))
          }
        />
        <div className="text-end small text-muted">
          {(customerDetails.eater_suggestions || "").length}/200
        </div>
        {/* {orderNo && (
  <div className="btn btn-danger" onClick={handleUpdateCustomerDetails}>
    Update
  </div>
)} */}
        {orderNo && (
          <div
            className="btn"
            style={{ backgroundColor: "#f44336", color: "#fff" }}
            onClick={() => {
              if (customerPhone.length !== 10) {
                Toaster.warning("Please enter a valid 10-digit mobile number");
                return;
              }
              handleUpdateCustomerDetails();
            }}
          >
            Update
          </div>
        )}
      </div>
    </div>
  );

  const renderTabContent = () => {
    switch (activeTab) {
      case "items":
        return renderItemsTab();
      case "details":
        return renderDetailsTab();
      case "discount":
        // If isNC is true, show a disabled message instead of the discount UI
        if (isNC) {
          return (
            <div
              className="p-3 d-flex flex-column align-items-center justify-content-center"
              style={{ height: "100%", color: "#888" }}
            >
              <h5 className="mb-3" style={{ color: "#000" }}>
                Discount Disabled
              </h5>
              <div
                className="alert alert-warning text-center"
                style={{ maxWidth: 320 }}
              >
                100% NC Discount is applied.
                <br />
                You cannot apply additional discounts.
              </div>
            </div>
          );
        }

        // Check if order has been generated for delivery/counter modes
        if (orderId && (orderMode === "DELIVERY" || orderMode === "COUNTER")) {
          return (
            <div
              className="p-3 d-flex flex-column align-items-center justify-content-center"
              style={{ height: "100%", color: "#888" }}
            >
              <h5 className="mb-3">Discount Disabled</h5>
              <div
                className="alert alert-warning text-center"
                style={{ maxWidth: 320 }}
              >
                Order has been generated.
                <br />
                You cannot modify discounts after order generation.
              </div>
            </div>
          );
        }
        return (
          <div
            className="p-3 custom-scroll"
            style={{ height: "100%", overflow: "auto" }}
          >
            <div className="d-flex align-items-center justify-content-between mb-3">
              <h5>Add Discount</h5>
            </div>
            <div className="d-flex align-items-center mb-4">
              {" "}
              <select
                className="form-select me-3"
                style={{ width: 110 }}
                value={tempDiscountMode}
                onChange={(e) => {
                  const newMode = Number(e.target.value);
                  setTempDiscountMode(newMode);
                  setTempDiscountValue(0); // Reset value when mode changes
                }}
                disabled={
                  isNC ||
                  (orderId &&
                    (orderMode === "DELIVERY" || orderMode === "COUNTER"))
                }
              >
                <option value="0">%</option>
                <option value="1">₹</option>
              </select>
              <input
                type="number"
                step="1"
                value={
                  typeof tempDiscountValue === "number" &&
                    !isNaN(tempDiscountValue)
                    ? String(tempDiscountValue)
                    : tempDiscountValue === "" || tempDiscountValue == null
                      ? "0"
                      : String(tempDiscountValue).replace(/^0+(?!\.|$)/, "") ||
                      "0"
                }
                onChange={(e) => {
                  let val = e.target.value;
                  // Remove leading zeros except for '0.'
                  val = val.replace(/^0+(?!\.|$)/, "");
                  if (val === "" || val == null) {
                    setTempDiscountValue(0);
                    return;
                  }
                  if (val.startsWith(".")) {
                    val = "0" + val;
                  }
                  // Allow only up to 2 digits after decimal
                  if (val.includes(".")) {
                    const [intPart, decPart] = val.split(".");
                    val = intPart + "." + decPart.slice(0, 2);
                  }
                  // If user types '0.' or '0.5', allow it
                  if (/^0\.[0-9]*$/.test(val)) {
                    setTempDiscountValue(val);
                    return;
                  }
                  // Otherwise, parse as number
                  const num = parseFloat(val);
                  if (!isNaN(num)) {
                    setTempDiscountValue(num);
                  }
                }}
                className="form-control"
                style={{ width: "100px" }}
                disabled={
                  isNC ||
                  (orderId &&
                    (orderMode === "DELIVERY" || orderMode === "COUNTER"))
                }
              />
              <button
                style={{ backgroundColor: "#2563eb", color: "#fff" }}
                className="btn  ms-3 me-1"
                onClick={() => {
                  if (tempDiscountMode === 0) {
                    // Percent mode: 0-100
                    if (tempDiscountValue < 0 || tempDiscountValue > 100) {
                      Toaster.error(
                        "Discount percent must be between 0 and 100"
                      );
                      return;
                    }
                  } else if (tempDiscountMode === 1) {
                    // Rupee mode: 0 to subtotal
                    const subtotal = calculateSubtotal();
                    if (tempDiscountValue < 0 || tempDiscountValue > subtotal) {
                      Toaster.error(
                        `Discount amount must be between 0 and ₹${subtotal.toFixed(
                          2
                        )}`
                      );
                      return;
                    }
                  }
                  setDiscountMode(tempDiscountMode);
                  setDiscountValue(tempDiscountValue);
                  Toaster.success("Discount applied successfully");
                  setActiveTab("items");
                }}
                disabled={
                  isNC ||
                  (orderId &&
                    (orderMode === "DELIVERY" || orderMode === "COUNTER"))
                }
              >
                Apply
              </button>
            </div>
          </div>
        );
      case "markpaid":
        return (
          <div
            className="p-3 custom-scroll"
            style={{ height: "100%", overflow: "auto" }}
          >
            {/* Header */}
            <div className="mb-4">
              <h5 className="fw-bold" style={{ fontSize: "23px" }}>
                Bill Settlement
              </h5>
              <div className="d-flex justify-content-between align-items-center">
                <span className="fw-bold" style={{ fontSize: "19px" }}>
                  Total Amount:
                </span>
                <span className="fw-bold " style={{ fontSize: "19px" }}>
                  ₹ {(total + roundOffValue).toFixed(2)}
                </span>
              </div>
            </div>

            {/* Split Bill Button (from Mark Paid tab) */}

            {/* Payment Options */}
            <div className="mb-4">
              <h6 className="fw-bold mb-3">Select Payment Option</h6>
              <div className="d-flex flex-wrap gap-2 mb-3">
                {paymentMethodsToShow.map((method) => (
                  <div key={method} className="form-check form-check-inline" style={{ display: method === 'Hold' && total + roundOffValue === 0 ? 'none' : '' }}  >
                    <input
                      className="form-check-input"
                      type="radio"
                      name="paymentMethod"
                      id={method}
                      checked={
                        isNC
                          ? paymentMethod === "nc payment"
                          : paymentMethod === method.toLowerCase()
                      }
                      onChange={() => {
                        if (isNC) {
                          setPaymentMethod("nc payment");
                          setCurrentPayment({
                            ...currentPayment,
                            method: "nc payment",
                            upiSubMethod: "",
                            transactionId: "",
                          });
                        } else {
                          const lowerMethod = method.toLowerCase();
                          setPaymentMethod(lowerMethod);
                          setCurrentPayment({
                            ...currentPayment,
                            method: lowerMethod,
                            upiSubMethod: "",
                            transactionId: "",
                          });
                        }
                      }}
                      disabled={isNC && method !== "NC Payment"}
                    />
                    <label
                      className="form-check-label"
                      htmlFor={method}
                      style={{ fontSize: "14px" }}
                    >
                      {method.charAt(0).toUpperCase() + method.slice(1)}
                    </label>
                  </div>
                ))}
              </div>
              {/* UPI Method Dropdown and Transaction ID */}




              {total + roundOffValue === 0 && !isNC ? <>




                <div className="mb-3">
                  <button
                    className="btn "
                    style={{ backgroundColor: "#f59e0b", color: "#fff" }}
                    onClick={async () => {
                      // Mark as paid with full amount for DINE IN
                      setFullLoader(true);
                      try {
                        const basePayload = {
                          subtotal: calculateSubtotal().toFixed(2),
                          discount_type: discountMode.toString(),
                          discount_rate: discountValue.toString(),
                          discount_value: totalDiscount.toFixed(2),
                          payment_details: [
                            {
                              method:
                                paymentMethod.charAt(0).toUpperCase() +
                                paymentMethod.slice(1),
                              amount: (total + roundOffValue).toFixed(2),
                              tip: 0,
                              upiType: "",
                              note: "",
                              transaction_id: "",
                            },
                          ],
                          due_amount: 0,
                          service_charge: serviceChargeDetails.percentage,
                          service_charge_details: serviceChargeDetails,
                          tax_amount: totalTax.toFixed(2),
                          tax_details: Object.keys({ ...cgstMap, ...sgstMap })
                            .map((rate) => [
                              cgstMap[rate] && {
                                name: "CGST",
                                percentage: Number(rate),
                                amount: cgstMap[rate].toFixed(2),
                              },
                              sgstMap[rate] && {
                                name: "SGST",
                                percentage: Number(rate),
                                amount: sgstMap[rate].toFixed(2),
                              },
                            ])
                            .flat()
                            .filter(Boolean),
                          paided_amount: (total + roundOffValue).toFixed(2),
                          total: (total + roundOffValue).toFixed(2),
                          payment_status: 1, // Full amount paid
                          round_up_amount: Number(roundOffValue),
                          item: orderItems.map((item) => ({
                            product_id: item.product_id || item.id,
                            product_name: item.product_name || item.name,
                            quantity: item.quantity,
                            price: item.price,
                            withOutTaxPrice: item.withOutTaxPrice,
                            withTaxPrice: item.withTaxPrice,
                            packaging_charges: item.packaging_charges,
                            tax_percent: item.tax_percent,
                            tax_type: item.tax_type,
                            product_type: item.product_type,
                            dine_in_service: item.dine_in_service,
                            delivery_service: item.delivery_service,
                            pick_up_service: item.pick_up_service,
                            min_order_quantity: item.min_order_quantity,
                            fooder_id: item.fooder_id,
                            table_id: item.table_id,
                            fooder_name: item.fooder_name,
                            product_special_note: item.product_special_note,
                            isKOT: item.isKOT,
                            isSaved: item.isSaved,
                            KOT_id: item.KOT_id,
                            KOT_no: item.KOT_no,
                            KOT_time: item.KOT_time,
                            selectedAddons: item.selectedAddons,
                            selectedvariants: item.selectedvariants,
                            variant_id: item.variant_id,
                            addons: item.addons,
                            attributes: item.attributes,
                          })),
                        };
                        const payload = { id: orderId, ...basePayload };
                        const response = await axiosInstance.post(
                          PostPartialPaymentForDineIn,
                          payload
                        );
                        if (
                          response.data &&
                          response.data.status === "success"
                        ) {
                          Toaster.success(
                            response.data.message || "Payment successful"
                          );
                          setPaymentEntries([]);
                          setCurrentPayment({
                            method: paymentMethod,
                            amount: "",
                            tip: "",
                            upiSubMethod: "",
                            transactionId: "",
                          });
                          setCustomerDetails({
                            name: "",
                            mobile: "",
                            address: "",
                          });
                          setCustomerPhone("");
                          if (onPaymentSuccess) onPaymentSuccess();
                        } else {
                          Toaster.error(
                            response.data?.message || "Payment failed"
                          );
                        }
                      } catch (err) {
                        Toaster.error(
                          err.response?.data?.message || "Payment failed"
                        );
                      } finally {
                        setFullLoader(false);
                      }
                    }}
                  >
                    Paid
                  </button>
                </div>














              </> : <>

                {paymentMethod === "upi" && (
                  <div style={{ marginTop: "16px" }}>
                    <div style={{ marginBottom: "12px" }}>
                      <label
                        style={{
                          display: "block",
                          marginBottom: "4px",
                          fontWeight: "500",
                          fontSize: "17px",
                        }}
                      >
                        Select UPI Method <span style={{ color: "red" }}>*</span>
                      </label>
                      <select
                        style={{
                          width: "100%",
                          padding: "8px",
                          borderRadius: "4px",
                          border: "1px solid #ddd",
                        }}
                        value={currentPayment.upiSubMethod}
                        onChange={(e) =>
                          setCurrentPayment({
                            ...currentPayment,
                            upiSubMethod: e.target.value,
                          })
                        }
                      >
                        <option value="" style={{ fontSize: "13px" }}>
                          Select UPI App
                        </option>
                        <option value="Google Pay" style={{ fontSize: "13px" }}>
                          Google Pay
                        </option>
                        <option value="PhonePe" style={{ fontSize: "13px" }}>
                          PhonePe
                        </option>
                        <option value="Paytm" style={{ fontSize: "13px" }}>
                          Paytm
                        </option>
                        <option value="Other" style={{ fontSize: "13px" }}>
                          Other
                        </option>
                      </select>
                    </div>

                    <div style={{ marginBottom: "12px" }}>
                      <label
                        style={{
                          display: "block",
                          marginBottom: "4px",
                          fontWeight: "500",
                          fontSize: "16px",
                        }}
                      >
                        Transaction ID
                      </label>
                      <input
                        type="text"
                        style={{
                          width: "100%",
                          padding: "8px",
                          borderRadius: "4px",
                          border: "1px solid #ddd",
                        }}
                        placeholder="Enter UPI Transaction ID"
                        value={currentPayment.transactionId}
                        onChange={(e) =>
                          setCurrentPayment({
                            ...currentPayment,
                            transactionId: e.target.value,
                          })
                        }
                      />
                    </div>
                  </div>
                )}

                {activeTab === "payment" && (
                  <div>
                    <h5>
                      {/* #1 Bill Amount: ₹{splitBillCalc.total?.toFixed(2) || "0.00"} */}
                      <h5>
                        #{currentSplitBill?.bill_no || 1} Bill Amount: ₹
                        {Number(splitBillCalc?.total || 0).toFixed(2)}
                      </h5>
                    </h5>

                    <div className="mb-3">
                      <label>
                        Payment Amount <span style={{ color: "red" }}>*</span>
                      </label>
                      <input
                        type="number"
                        className="form-control"
                        placeholder="Enter Paid Amount"
                        value={currentPayment.amount}
                        onChange={(e) =>
                          setCurrentPayment((prev) => ({
                            ...prev,
                            amount: e.target.value,
                          }))
                        }
                      />
                    </div>

                    <div className="mb-3">
                      <label>Tip</label>
                      <input
                        type="number"
                        className="form-control"
                        placeholder="Enter Tip"
                        value={currentPayment.tip}
                        onChange={(e) =>
                          setCurrentPayment((prev) => ({
                            ...prev,
                            tip: e.target.value,
                          }))
                        }
                      />
                    </div>

                    <button
                      className="btn btn-sm btn-primary mb-3"
                      onClick={() => {
                        const amt = parseFloat(currentPayment.amount);
                        if (!amt || amt <= 0) {
                          Toaster.error("Enter valid amount");
                          return;
                        }

                        if (
                          paymentMethod === "UPI" &&
                          !currentPayment.upiSubMethod
                        ) {
                          Toaster.error("Please select UPI Method");
                          return;
                        }

                        setPaymentEntries((prev) => [
                          ...prev,
                          {
                            method: paymentMethod,
                            amount: amt,
                            tip: parseFloat(currentPayment.tip || 0),
                            upiSubMethod: currentPayment.upiSubMethod,
                            // transactionId: currentPayment.transactionId,
                            transactionId: currentPayment.transactionId || "",
                          },
                        ]);

                        setCurrentPayment({
                          method: "",
                          amount: "",
                          tip: "",
                          upiSubMethod: "",
                          transactionId: "",
                        });
                      }}
                    >
                      Add Payment Entry
                    </button>

                    {paymentEntries.length > 0 && (
                      <div className="mb-3">
                        <table className="table table-bordered">
                          <thead>
                            <tr>
                              <th>Method</th>
                              <th>Amount</th>
                              <th>Tip</th>
                            </tr>
                          </thead>
                          <tbody>
                            {paymentEntries.map((entry, idx) => (
                              <tr key={idx}>
                                <td>{entry.method}</td>
                                <td>₹{Number(entry.amount).toFixed(2)}</td>
                                <td>₹{Number(entry.tip || 0).toFixed(2)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>

                        <p>
                          <strong>Total Paid:</strong> ₹
                          {paymentEntries
                            .reduce(
                              (sum, p) =>
                                sum + Number(p.amount) + Number(p.tip || 0),
                              0
                            )
                            .toFixed(2)}
                        </p>
                        <p>
                          <strong>Due:</strong> ₹
                          {Math.max(
                            0,
                            splitBillCalc.total -
                            paymentEntries.reduce(
                              (sum, p) =>
                                sum + Number(p.amount) + Number(p.tip || 0),
                              0
                            )
                          ).toFixed(2)}
                        </p>
                      </div>
                    )}

                    <hr />

                    <div
                      style={{
                        display: "flex",
                        justifyContent: "flex-end",
                        gap: "10px",
                      }}
                    >
                      <button
                        className="bg-success"
                        style={{
                          color: "#fff",
                          border: "none",
                          padding: "8px 16px",
                          borderRadius: "6px",
                          fontWeight: 500,
                          cursor: "pointer",
                        }}
                        onClick={handleMarkSplitBillPaid}
                      >
                        Paid
                      </button>
                      <button
                        className="bg-success"
                        style={{
                          color: "#fff",
                          border: "none",
                          padding: "8px 16px",
                          borderRadius: "6px",
                          fontWeight: 500,
                          cursor: "pointer",
                        }}
                      >
                        Paid & Print Bill
                      </button>
                    </div>
                  </div>
                )}

                {/* Payment Details and Actions */}
                {isNC && paymentMethod === "nc payment" ? (
                  <div className="mb-4">
                    <h6 className="fw-bold mb-3">NC Payment</h6>
                    <div className="alert alert-info">
                      This is a No Charge (NC) payment. Amount will be 0.00.
                    </div>
                    <button
                      style={{
                        backgroundColor: "#00bf63",
                        color: "#fff",
                        fontWeight: "500",
                      }}
                      className="btn"
                      onClick={async () => {
                        setFullLoader(true);
                        try {
                          const basePayload = {
                            subtotal: calculateSubtotal().toFixed(2),
                            discount_type: discountMode.toString(),
                            discount_rate: discountValue.toString(),
                            discount_value: totalDiscount.toFixed(2),
                            payment_details: [
                              {
                                method: "Cash",
                                amount: "0.00",
                                tip: "0.00",
                                upiType: "",
                                note: "IS_NC payment",
                                transaction_id: "",
                              },
                            ],
                            due_amount: "0.00",
                            service_charge: serviceChargeDetails.percentage,
                            service_charge_details: serviceChargeDetails,
                            tax_amount: totalTax.toFixed(2),
                            tax_details: Object.keys({ ...cgstMap, ...sgstMap })
                              .map((rate) => [
                                cgstMap[rate] && {
                                  name: "CGST",
                                  percentage: Number(rate),
                                  amount: cgstMap[rate].toFixed(2),
                                },
                                sgstMap[rate] && {
                                  name: "SGST",
                                  percentage: Number(rate),
                                  amount: sgstMap[rate].toFixed(2),
                                },
                              ])
                              .flat()
                              .filter(Boolean),
                            paided_amount: "0.00",
                            total: (total + roundOffValue).toFixed(2),
                            payment_status: 1, // NC Payment is considered fully paid
                            round_up_amount: Number(roundOffValue),
                            item: orderItems.map((item) => ({
                              product_id: item.product_id || item.id,
                              product_name: item.product_name || item.name,
                              quantity: item.quantity,
                              price: item.price,
                              withOutTaxPrice: item.withOutTaxPrice,
                              withTaxPrice: item.withTaxPrice,
                              packaging_charges: item.packaging_charges,
                              tax_percent: item.tax_percent,
                              tax_type: item.tax_type,
                              product_type: item.product_type,
                              dine_in_service: item.dine_in_service,
                              delivery_service: item.delivery_service,
                              pick_up_service: item.pick_up_service,
                              min_order_quantity: item.min_order_quantity,
                              fooder_id: item.fooder_id,
                              table_id: item.table_id,
                              fooder_name: item.fooder_name,
                              product_special_note: item.product_special_note,
                              isKOT: item.isKOT,
                              isSaved: item.isSaved,
                              KOT_id: item.KOT_id,
                              KOT_no: item.KOT_no,
                              KOT_time: item.KOT_time,
                              selectedAddons: item.selectedAddons,
                              selectedvariants: item.selectedvariants,
                              variant_id: item.variant_id,
                              addons: item.addons,
                              attributes: item.attributes,
                            })),
                          };
                          let payload;
                          if (orderMode === "DINE IN") {
                            payload = { id: orderId, ...basePayload };
                          } else {
                            payload = { order_id: orderId, ...basePayload };
                          }
                          let response;
                          if (orderMode === "DINE IN") {
                            response = await axiosInstance.post(
                              PostPartialPaymentForDineIn,
                              payload
                            );
                          } else {
                            response = await axiosInstance.post(
                              PostPosPaymentForDeliveryAndPickUp,
                              payload
                            );
                          }
                          if (
                            response.data &&
                            response.data.status === "success"
                          ) {
                            Toaster.success(
                              response.data.message || "NC Payment successful"
                            );
                            setPaymentEntries([]);
                            setCurrentPayment({
                              method: paymentMethod,
                              amount: "",
                              tip: "",
                              upiSubMethod: "",
                              transactionId: "",
                            });
                            setCustomerDetails({
                              name: "",
                              mobile: "",
                              address: "",
                            });
                            setCustomerPhone("");
                            setIsNC(false);
                            if (onPaymentSuccess) onPaymentSuccess();
                          } else {
                            Toaster.error(
                              response.data?.message || "NC Payment failed"
                            );
                          }
                        } catch (err) {
                          Toaster.error("NC Payment failed");
                        } finally {
                          setFullLoader(false);
                        }
                      }}
                    >
                      Confirm NC Payment
                    </button>
                  </div>
                ) : paymentMethod === "hold" ? (
                  <div className="mb-4">
                    <h6 className="fw-bold mb-3">
                      Reason<span className="text-danger">*</span>
                    </h6>
                    <input
                      type="text"
                      className="form-control"
                      id="reasonInput"
                      placeholder="Enter Reason"
                      value={reason || ""}
                      onChange={(e) => setReason(e.target.value)}
                    />
                    <button
                      className="btn btn-primary mt-3"
                      onClick={async () => {
                        if (!reason || reason.trim() === "") {
                          Toaster.error("Please fill the reason");
                          return;
                        }
                        if (orderMode === "DINE IN") {
                          setFullLoader(true);
                          try {
                            const payload = {
                              id: orderId,
                              subtotal: 0, // as per your example
                              service_charge:
                                serviceChargeDetails?.percentage ?? null,
                              tax_amount: null,
                              total: total + roundOffValue,
                              discount_type: discountMode.toString(),
                              discount_rate: discountValue.toString(),
                              payment_type: "Hold",
                              unpaid_reason: reason,
                              payment_status: 2,
                              service_charge_details: {
                                name: serviceChargeDetails?.name || "SCH",
                                percentage:
                                  serviceChargeDetails?.percentage?.toString() ??
                                  "",
                                foreigner_percentage:
                                  serviceChargeDetails?.foreigner_percentage ??
                                  10,
                              },
                            };
                            const response = await axiosInstance.post(
                              PostHoldPaymentForDineIn,
                              payload
                            );
                            if (
                              response.data &&
                              response.data.status === "success"
                            ) {
                              Toaster.success(
                                response.data.message || "Order put on hold"
                              );
                              setPaymentEntries([]);
                              setCurrentPayment({
                                method: paymentMethod,
                                amount: "",
                                tip: "",
                                upiSubMethod: "",
                                transactionId: "",
                              });
                              setCustomerDetails({
                                name: "",
                                mobile: "",
                                address: "",
                                eater_suggestions: "",
                              });
                              setCustomerPhone("");
                              setReason(""); // ✅ Clear hold reason
                              setPaymentMethod("cash");
                              if (onPaymentSuccess) onPaymentSuccess();
                            } else {
                              Toaster.error(
                                response.data?.message ||
                                "Failed to put order on hold"
                              );
                            }
                          } catch (err) {
                            Toaster.error("Failed to put order on hold");
                          } finally {
                            setFullLoader(false);
                          }
                        } else if (
                          orderMode === "DELIVERY" ||
                          orderMode === "COUNTER"
                        ) {
                          setFullLoader(true);
                          try {
                            const payload = {
                              order_id: orderId,
                              payment_type: "Hold",
                              unpaid_reason: reason,
                            };
                            const response = await axiosInstance.post(
                              PostHoldPaymentForCounterAndDelivery,
                              payload
                            );
                            if (
                              response.data &&
                              response.data.status === "success"
                            ) {
                              Toaster.success(
                                response.data.message || "Order put on hold"
                              );
                              setPaymentEntries([]);
                              setCurrentPayment({
                                method: paymentMethod,
                                amount: "",
                                tip: "",
                                upiSubMethod: "",
                                transactionId: "",
                              });
                              setCustomerDetails({
                                name: "",
                                mobile: "",
                                address: "",
                              });
                              setCustomerPhone("");
                              setReason(""); // ✅ Clear hold reason
                              setPaymentMethod("cash");
                              if (onPaymentSuccess) onPaymentSuccess();
                            } else {
                              Toaster.error(
                                response.data?.message ||
                                "Failed to put order on hold"
                              );
                            }
                          } catch (err) {
                            Toaster.error("Failed to put order on hold");
                          } finally {
                            setFullLoader(false);
                          }
                        } else {
                          Toaster.error(
                            "Hold payment is only available for DINE IN, COUNTER, or DELIVERY"
                          );
                        }
                      }}
                    >
                      Save
                    </button>
                  </div>
                ) : ["zomato", "swiggy", "dineout"].includes(paymentMethod) &&


                  orderMode === "DINE IN" ? (
                  <div className="mb-3">
                    <button
                      className="btn "
                      style={{ backgroundColor: "#f59e0b", color: "#fff" }}
                      onClick={async () => {
                        // Mark as paid with full amount for DINE IN
                        setFullLoader(true);
                        try {
                          const basePayload = {
                            subtotal: calculateSubtotal().toFixed(2),
                            discount_type: discountMode.toString(),
                            discount_rate: discountValue.toString(),
                            discount_value: totalDiscount.toFixed(2),
                            payment_details: [
                              {
                                method:
                                  paymentMethod.charAt(0).toUpperCase() +
                                  paymentMethod.slice(1),
                                amount: (total + roundOffValue).toFixed(2),
                                tip: 0,
                                upiType: "",
                                note: "",
                                transaction_id: "",
                              },
                            ],
                            due_amount: 0,
                            service_charge: serviceChargeDetails.percentage,
                            service_charge_details: serviceChargeDetails,
                            tax_amount: totalTax.toFixed(2),
                            tax_details: Object.keys({ ...cgstMap, ...sgstMap })
                              .map((rate) => [
                                cgstMap[rate] && {
                                  name: "CGST",
                                  percentage: Number(rate),
                                  amount: cgstMap[rate].toFixed(2),
                                },
                                sgstMap[rate] && {
                                  name: "SGST",
                                  percentage: Number(rate),
                                  amount: sgstMap[rate].toFixed(2),
                                },
                              ])
                              .flat()
                              .filter(Boolean),
                            paided_amount: (total + roundOffValue).toFixed(2),
                            total: (total + roundOffValue).toFixed(2),
                            payment_status: 1, // Full amount paid
                            round_up_amount: Number(roundOffValue),
                            item: orderItems.map((item) => ({
                              product_id: item.product_id || item.id,
                              product_name: item.product_name || item.name,
                              quantity: item.quantity,
                              price: item.price,
                              withOutTaxPrice: item.withOutTaxPrice,
                              withTaxPrice: item.withTaxPrice,
                              packaging_charges: item.packaging_charges,
                              tax_percent: item.tax_percent,
                              tax_type: item.tax_type,
                              product_type: item.product_type,
                              dine_in_service: item.dine_in_service,
                              delivery_service: item.delivery_service,
                              pick_up_service: item.pick_up_service,
                              min_order_quantity: item.min_order_quantity,
                              fooder_id: item.fooder_id,
                              table_id: item.table_id,
                              fooder_name: item.fooder_name,
                              product_special_note: item.product_special_note,
                              isKOT: item.isKOT,
                              isSaved: item.isSaved,
                              KOT_id: item.KOT_id,
                              KOT_no: item.KOT_no,
                              KOT_time: item.KOT_time,
                              selectedAddons: item.selectedAddons,
                              selectedvariants: item.selectedvariants,
                              variant_id: item.variant_id,
                              addons: item.addons,
                              attributes: item.attributes,
                            })),
                          };
                          const payload = { id: orderId, ...basePayload };
                          const response = await axiosInstance.post(
                            PostPartialPaymentForDineIn,
                            payload
                          );
                          if (
                            response.data &&
                            response.data.status === "success"
                          ) {
                            Toaster.success(
                              response.data.message || "Payment successful"
                            );
                            setPaymentEntries([]);
                            setCurrentPayment({
                              method: paymentMethod,
                              amount: "",
                              tip: "",
                              upiSubMethod: "",
                              transactionId: "",
                            });
                            setCustomerDetails({
                              name: "",
                              mobile: "",
                              address: "",
                            });
                            setCustomerPhone("");
                            if (onPaymentSuccess) onPaymentSuccess();
                          } else {
                            Toaster.error(
                              response.data?.message || "Payment failed"
                            );
                          }
                        } catch (err) {
                          Toaster.error(
                            err.response?.data?.message || "Payment failed"
                          );
                        } finally {
                          setFullLoader(false);
                        }
                      }}
                    >
                      Paid
                    </button>
                  </div>
                ) : (
                  <div>
                    <div className="mb-4">
                      <h6 className="fw-bold mb-3">Customer Paid</h6>
                      <div className="d-flex align-items-center gap-2 mb-2">
                        <div className="input-group">
                          <span className="input-group-text ">₹</span>
                          <input
                            type="number"
                            className="form-control flex-grow-1"
                            value={currentPayment.amount}
                            onChange={(e) => {
                              const val = e.target.value;
                              if (parseFloat(val) < 0) return;
                              setCurrentPayment({
                                ...currentPayment,
                                amount: val,
                              });
                              setPayClicked(false);
                            }}
                          />
                        </div>
                      </div>

                      <div className="input-group">
                        <span className="input-group-text">₹</span>
                        <input
                          type="number"
                          className="form-control"
                          value={currentPayment.tip}
                          onChange={(e) =>
                            setCurrentPayment({
                              ...currentPayment,
                              tip: e.target.value,
                            })
                          }
                          placeholder="Tip"
                          min="0"
                        />
                      </div>

                      {/* Transaction/Reference ID Section */}
                      {paymentMethod !== "upi" && (
                        <div className="mt-3">
                          <label
                            htmlFor="transactionId"
                            className="form-label fw-bold"
                            style={{ fontSize: "15px" }}
                          >
                            Transaction / Reference ID
                          </label>
                          <input
                            type="text"
                            className="form-control"
                            id="transactionId"
                            value={currentPayment.transactionId || ""}
                            onChange={(e) =>
                              setCurrentPayment({
                                ...currentPayment,
                                transactionId: e.target.value,
                              })
                            }
                            placeholder="Enter Transaction / Reference ID"
                          />
                        </div>
                      )}
                      <button
                        style={{ backgroundColor: "#f59e0b", color: "#fff" }}
                        className="btn  mb-1 mt-2 me-2"
                        disabled={
                          !currentPayment.amount ||
                          parseFloat(currentPayment.amount) <= 0
                        }
                        onClick={() => {
                          if (
                            !currentPayment.amount ||
                            parseFloat(currentPayment.amount) <= 0
                          ) {
                            Toaster.error("Please enter a valid amount");
                            return;
                          }
                          if (parseFloat(currentPayment.amount) > dueAmount) {
                            Toaster.error(
                              "Amount cannot be greater than total amount"
                            );
                            return;
                          }
                          if (paymentMethod === "upi") {
                            if (!currentPayment.upiSubMethod) {
                              Toaster.error("Please select a UPI method");
                              return;
                            }
                          }
                          const newEntries = [
                            ...paymentEntries,
                            {
                              method:
                                paymentMethod === "upi"
                                  ? `UPI by ${currentPayment.upiSubMethod}`
                                  : paymentMethod.charAt(0).toUpperCase() +
                                  paymentMethod.slice(1),
                              amount: parseFloat(currentPayment.amount).toFixed(
                                2
                              ),
                              tip: parseFloat(currentPayment.tip || 0).toFixed(2),
                              transactionId: currentPayment.transactionId,
                            },
                          ];
                          setPaymentEntries(newEntries);
                          // Calculate new due and prefill input
                          const paid = newEntries.reduce(
                            (sum, entry) => sum + parseFloat(entry.amount || 0),
                            0
                          );
                          const newDue = (billTotal - paid).toFixed(2);
                          setCurrentPayment({
                            method: paymentMethod,
                            amount: newDue > 0 ? newDue : "",
                            tip: "",
                            upiSubMethod: "",
                            transactionId: "",
                          });
                          setPayClicked(true);
                        }}
                      >
                        {payClicked ? "Add" : "Pay "}
                      </button>

                      {/* Show Split Bill button only if isNC is false */}
                      {openSplitBillModalFromSidebar &&
                        selectedTable &&
                        !isNC && (
                          <button
                            className="btn"
                            style={{
                              color: "#fff",
                              fontSize: "15px",
                              backgroundColor: "#1e283d",
                            }}
                            onClick={() =>
                              openSplitBillModalFromSidebar(selectedTable)
                            }
                          >
                            Split Bill
                          </button>
                        )}
                    </div>
                    {/* Payment List Table */}
                    {paymentEntries.length > 0 && (
                      <div className="table-responsive">
                        <table
                          className="table table-bordered table-sm mb-0"
                          style={{ fontSize: "13px" }}
                        >
                          <thead className="table-light">
                            <tr>
                              <th className="text-nowrap px-2 py-1">
                                Payment Method
                              </th>
                              <th className="text-nowrap px-2 py-1">Amount</th>
                              <th className="text-nowrap px-2 py-1">
                                Tip Amount
                              </th>
                              {/* <th className="text-nowrap px-2 py-1">Transaction ID</th> */}
                              <th className="text-nowrap px-2 py-1">Action</th>
                            </tr>
                          </thead>
                          <tbody>
                            {paymentEntries.map((entry, idx) => (
                              <tr key={idx}>
                                <td className="text-nowrap px-2 py-1">
                                  {entry.method}
                                </td>
                                <td className="text-nowrap px-2 py-1">
                                  {entry.amount}
                                </td>
                                <td className="text-nowrap px-2 py-1">
                                  {entry.tip}
                                </td>
                                <td className="text-nowrap px-2 py-1">
                                  <button
                                    className="btn btn-outline-danger btn-sm d-flex align-items-center justify-content-center"
                                    style={{
                                      width: "28px",
                                      height: "28px",
                                      padding: 0,
                                    }}
                                    onClick={() =>
                                      setPaymentEntries(
                                        paymentEntries.filter((_, i) => i !== idx)
                                      )
                                    }
                                  >
                                    <i className="bi bi-trash"></i>
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                    {/* Due Section */}
                    {paymentEntries.length > 0 && (
                      <div className="d-flex gap-2 mt-2">
                        <button
                          className="btn"
                          style={{ backgroundColor: "#00bf63", color: "#fff" }}
                          // disabled={parseFloat(dueAmount) > 0 || !orderId}
                          onClick={handleDeliveryPayment}
                        >
                          Paid
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </>}









            </div>
          </div>
        );
      default:
        return null;
    }
  };

  // Prefill customer paid input with (total + roundOffValue) when total or roundOffValue changes,
  // but only if the user hasn't changed it (i.e., if it matches the previous total or is empty)
  useEffect(() => {
    const newAmount = (total + roundOffValue).toFixed(2);
    if (
      !currentPayment.amount ||
      currentPayment.amount === "" ||
      currentPayment.amount === currentPayment.prevTotal
    ) {
      setCurrentPayment((cp) => ({
        ...cp,
        amount: newAmount,
        prevTotal: newAmount,
      }));
    } else {
      setCurrentPayment((cp) => ({ ...cp, prevTotal: newAmount }));
    }
  }, [total, roundOffValue]);

  // Reset customer details when starting a new order or after payment
  useEffect(() => {
    if (orderItems.length === 0 || resetTabToItems) {
      setCustomerDetails({ name: "", mobile: "", address: "" });
      setCustomerPhone("");
      setPaymentEntries([]);
    }
  }, [orderItems, resetTabToItems]);

  // Reset temp discount values when Discount tab is opened
  useEffect(() => {
    if (activeTab === "discount") {
      setTempDiscountMode(discountMode);
      setTempDiscountValue(0); // Reset to 0 instead of current discount value





    }
    setPaymentMethod(isNC ? "nc payment" : "cash");
    const paid = paymentEntries.reduce(
      (sum, entry) => sum + parseFloat(entry.amount || 0),
      0
    );
    const newDue = (billTotal - paid).toFixed(2);

    setCurrentPayment({
      method: paymentMethod,
      amount: newDue,
      tip: "",
      upiSubMethod: "",
      transactionId: "",
    });

    setReason('')
  }, [activeTab, discountMode]);

  // Track the last due value to avoid overwriting user input
  const [lastDue, setLastDue] = useState("");

  // Update input field when paymentEntries changes (e.g., after removing an entry)
  useEffect(() => {
    const paid = paymentEntries.reduce(
      (sum, entry) => sum + parseFloat(entry.amount || 0),
      0
    );
    const newDue = (billTotal - paid).toFixed(2);
    // Only update if the input matches the last due or is 0/empty
    setLastDue((prev) => {
      setCurrentPayment((cp) => {
        if (cp.amount === prev || cp.amount === "" || cp.amount === "0") {
          return { ...cp, amount: newDue };
        }
        return cp;
      });
      return newDue;
    });
  }, [paymentEntries, billTotal]);

  // Reset paymentEntries when the total amount to be paid changes
  useEffect(() => {
    setPaymentEntries([]);
  }, [total, roundOffValue]);

  // Add delivery guy state and dummy list
  const [deliveryGuyId, setDeliveryGuyId] = useState("");
  const deliveryGuys = (waiterDetails || []).filter((guy) => guy.type === 3);
  const selectedDeliveryGuy = deliveryGuys.find(
    (guy) => guy.id.toString() === deliveryGuyId
  );
  // Delete Confirmation Modal Component
  const DeleteConfirmationModal = memo(function DeleteConfirmationModal({
    showDeleteModal,
    onConfirm,
    onDeleteAndPrint,
    onCancel,
    itemToDelete,
    isDeleting,
  }) {
    const [localReason, setLocalReason] = useState("");
    const deleteTextareaRef = useRef(null);
    useEffect(() => {
      if (showDeleteModal) {
        setLocalReason("");
        setTimeout(() => {
          if (deleteTextareaRef.current) deleteTextareaRef.current.focus();
        }, 0);
      }
    }, [showDeleteModal]);
    if (!showDeleteModal) return null;
    return createPortal(
      <div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: "rgba(0, 0, 0, 0.5)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 9999,
        }}
        onClick={onCancel}
      >
        <div
          style={{
            backgroundColor: "white",
            borderRadius: "8px",
            padding: "24px",
            width: "400px",
            maxWidth: "90vw",
            boxShadow: "0 4px 20px rgba(0, 0, 0, 0.15)",
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="d-flex justify-content-between align-items-center mb-3">
            <h5 className="mb-0 fw-bold " style={{ color: "#f44336" }}>
              <FaTrash style={{ marginRight: "8px" }} />
              Delete KOT Item
            </h5>
            <button
              className="btn btn-link p-0"
              onClick={onCancel}
              style={{ fontSize: "18px", color: "#666" }}
            >
              <FaTimes />
            </button>
          </div>

          {/* Content */}
          <div className="mb-4">
            <p
              className="text-muted mb-3"
              style={{ fontSize: "13px", color: "#1f2937" }}
            >
              Are you sure you want to delete this item from the KOT?
            </p>

            {itemToDelete && (
              <div className="bg-light p-3 rounded mb-3">
                <strong>Item:</strong> {itemToDelete.name}
                <br />
                <strong>Quantity:</strong> {itemToDelete.quantity}
                <br />
                <strong>Price:</strong> ₹
                {(
                  Number(itemToDelete.price) * Number(itemToDelete.quantity)
                ).toFixed(2)}
              </div>
            )}

            <div className="mb-3">
              <label className="form-label fw-semibold">
                Reason for deletion <span className="text-danger">*</span>
              </label>
              {/* Quick reason buttons */}
              <div className="mb-2">
                <small className="text-muted">Quick reasons:</small>
                <div className="d-flex flex-wrap gap-1 mt-1">
                  {[
                    "Customer cancelled",
                    "Kitchen error",
                    "Item unavailable",
                    "Wrong item added",
                    "Price correction",
                  ].map((quickReason) => (
                    <button
                      key={quickReason}
                      type="button"
                      className="btn btn-outline-secondary btn-sm"
                      style={{ fontSize: "11px", padding: "2px 8px" }}
                      onClick={() => setLocalReason(quickReason)}
                    >
                      {quickReason}
                    </button>
                  ))}
                </div>
              </div>
              <textarea
                className="form-control"
                placeholder="Please write the reason..."
                value={localReason}
                rows="2"
                onChange={(e) => setLocalReason(e.target.value)}
                ref={deleteTextareaRef}
              />
            </div>
          </div>

          {/* Footer */}
          <div className="d-flex gap-2 justify-content-end mt-3">
            <button
              className="btn"
              style={{ backgroundColor: "#1f2937", color: "#fff" }}
              onClick={onCancel}
              disabled={isDeleting}
            >
              Cancel
            </button>

            <button
              className="btn"
              style={{ backgroundColor: "#f44336", color: "#fff" }}
              onClick={() => onConfirm(localReason)}
              disabled={isDeleting || !localReason.trim()}
            >
              {isDeleting ? (
                <>
                  <span
                    className="spinner-border spinner-border-sm me-2"
                    role="status"
                    aria-hidden="true"
                  ></span>
                  Deleting...
                </>
              ) : (
                "Delete"
              )}
            </button>
            <button
              className="btn"
              style={{ color: "#fff", backgroundColor: "#f59e0b" }}
              onClick={() => onDeleteAndPrint && onDeleteAndPrint(localReason)}
              disabled={isDeleting || !localReason.trim()}
            >
              {/* {isDeleting ? (
                <>
                  <span
                    className="spinner-border spinner-border-sm me-2"
                    role="status"
                    aria-hidden="true"
                  ></span>
                  Processing...
                </>
              ) : (
                "Delete & Print"
              )} */}
              {isProcessingDelete ? (
                <>
                  <span
                    className="spinner-border spinner-border-sm me-2"
                    role="status"
                    aria-hidden="true"
                  ></span>
                  Processing...
                </>
              ) : (
                "Delete & Print"
              )}
            </button>
          </div>
        </div>
      </div>,
      document.body
    );
  });

  const handlePrintBill = async () => {
    if (!orderItems.length) {
      Toaster.error("Please add items to print bill");
      return;
    }

    // ✅ Product existence check before proceeding
    const appData = await getAppDataFromDB();
    const productList = appData?.product || [];

    const missingProduct = orderItems.find(
      (item) => !productList.some((p) => Number(p.id) === Number(item.id))
    );

    if (missingProduct) {
      console.warn("Product not found in DB:", missingProduct);
      window.location.reload();
      return;
    }

    // Add validation checks for delivery/counter modes before proceeding
    if (orderMode === "COUNTER" || orderMode === "DELIVERY") {
      // Validate required fields for delivery
      if (orderMode === "DELIVERY") {
        if (!customerPhone || customerPhone.length !== 10) {
          setActiveTab && setActiveTab("details");
          Toaster.error("Please enter a valid 10-digit mobile number");
          return;
        }
        if (!customerDetails.name || customerDetails.name.trim() === "") {
          setActiveTab && setActiveTab("details");
          Toaster.error("Please enter customer name");
          return;
        }
        if (!customerDetails.address || customerDetails.address.trim() === "") {
          setActiveTab && setActiveTab("details");
          Toaster.error("Please enter address");
          return;
        }
        if (!deliveryGuyId) {
          setActiveTab && setActiveTab("details");
          Toaster.error("Please select a delivery guy");
          return;
        }
      }
    }

    try {
      const { invoice_number, order_number, table_no } = await handleSaveBill();

      console.log(invoice_number, order_number, table_no, "invoice_number, order_number");



      const appData = await getAppDataFromDB();
      const fooderData = appData || {};
      const enableSilentPrinting = Number(appData?.enable_silent_printing) || 0;

      const subtotal = calculateSubtotal();
      // Calculate discount based on mode: 0 = %, 1 = flat
      const discountAmount =
        discountMode === 0
          ? (subtotal * discountValue) / 100
          : Math.min(discountValue, subtotal);
      const subtotalAfterDiscount = subtotal - discountAmount;
      const serviceChargeAmount =
        (subtotalAfterDiscount * (serviceChargeDetails?.percentage || 0)) / 100;

      // Calculate taxes per item, then group by tax rate
      const taxMap = {};
      orderItems.forEach((item) => {
        const rate = parseFloat(item.tax_percent) || 0;
        if (rate > 0) {
          // Proportional discount for this item
          const itemBase = item.withOutTaxPrice * item.quantity;
          const itemDiscount =
            subtotal > 0 ? (itemBase / subtotal) * discountAmount : 0;
          const itemPriceAfterDiscount = itemBase - itemDiscount;
          // Proportional service charge for this item
          let itemSCH = 0;
          if (serviceChargeDetails && serviceChargeDetails.percentage != null) {
            itemSCH =
              subtotalAfterDiscount > 0
                ? (itemPriceAfterDiscount / subtotalAfterDiscount) *
                serviceChargeAmount
                : 0;
          }
          const taxBase = itemPriceAfterDiscount + itemSCH;
          const itemTax = (taxBase * rate) / 100;
          taxMap[rate] = (taxMap[rate] || 0) + itemTax;
        }
      });

      // Split each tax rate into CGST and SGST
      const taxDetails = Object.entries(taxMap).flatMap(([rate, amount]) => {
        const halfRate = parseFloat(rate) / 2;
        const halfAmount = amount / 2;
        return [
          { name: "CGST", percentage: halfRate, amount: halfAmount },
          { name: "SGST", percentage: halfRate, amount: halfAmount },
        ];
      });

      const totalTax = Object.values(taxMap).reduce((s, t) => s + t, 0);
      // Calculate packaging charges (exclude if NC order)
      const packagingCharges =
        !isNC && (orderMode === "DELIVERY" || orderMode === "COUNTER")
          ? orderItems.reduce(
            (sum, item) =>
              sum + (parseFloat(item.packaging_charges) || 0) * item.quantity,
            0
          )
          : 0;

      const raw =
        subtotalAfterDiscount +
        serviceChargeAmount +
        totalTax +
        packagingCharges;
      const roundOffValue = Math.round(raw) - raw;
      const total = Math.round(raw);

      const now = new Date();
      const dateStr = now.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
      const timeStr = now.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      });

      const itemsText = orderItems
        .map((item) => {
          const name = item.name || item.product?.name || "Item";
          const qty = item.quantity;
          const rate = (parseFloat(item.price) || 0).toFixed(2);
          const amt = (qty * parseFloat(item.price || 0)).toFixed(2);
          return `${name}${" ".repeat(
            Math.max(10, 15 - name.length)
          )}${qty}${" ".repeat(3)}₹${rate}${" ".repeat(3)}₹${amt}`;
        })
        .join("\n");

      const taxText = taxDetails
        .map(
          (t) =>
            `${t.name}(${t.percentage}%)${" ".repeat(12)}₹${t.amount.toFixed(
              2
            )}`
        )
        .join("\n");

      const billData = `ESC @
ESC ! 0x08
ESC a 0x01
${fooderData.fooder_name || ""}
ESC ! 0x00
ESC a 0x00
${fooderData.f_address || ""}, ${fooderData.f_city || ""}, ${fooderData.f_state || ""
        }, ${fooderData.f_zipcode || ""}
Phone: ${fooderData.f_landline || ""}
GST: ${fooderData.fooder_gstin || ""}

Name: ${customerDetails.name || ""}
Date: ${dateStr}
Time: ${orderTime}
${orderMode}
Table: #${selectedTable?.table_no || ""}

ESC ! 0x08
Item${" ".repeat(10)}Qty${" ".repeat(3)}Rate${" ".repeat(3)}Amt
ESC ! 0x00
================================
${itemsText}
================================

Subtotal${" ".repeat(15)}₹${subtotal.toFixed(2)}
${discountValue > 0
          ? `Discount(${discountValue}%)${" ".repeat(8)}-₹${discountAmount.toFixed(2)}`
          : ""
        }
${serviceChargeAmount > 0
          ? `SCH(${serviceChargeDetails?.percentage}%)${" ".repeat(
            10
          )}₹${serviceChargeAmount.toFixed(2)}`
          : ""
        }
${taxText}
${packagingCharges > 0
          ? `Packaging Charges${" ".repeat(6)}₹${packagingCharges.toFixed(2)}`
          : ""
        }
${Math.abs(roundOffValue) > 0
          ? `Round off${" ".repeat(15)}₹${roundOffValue.toFixed(2)}`
          : ""
        }
================================
Total${" ".repeat(18)}₹${total.toFixed(2)}
================================

FSSAI: ${fooderData.fssai_number || ""}
${fooderData.billing_notes || ""}

ESC a 0x01
Thank you!
ESC a 0x00

ESC d 5
GS V 0x41 0x03`;

      // HTML bill for browser print
      //   const itemsRows = orderItems
      //     .map((item) => {
      //       const name = item.name || item.product?.name || "Item";
      //       const qty = item.quantity;
      //       const rate = (parseFloat(item.price) || 0).toFixed(2);
      //       const amt = (qty * parseFloat(item.price || 0)).toFixed(2);
      //       return `
      //     <tr>
      //       <td>${name}</td>
      //       <td class="text-center">${qty}</td>
      //       <td class="text-right">₹${rate}</td>
      //       <td class="text-right">₹${amt}</td>
      //     </tr>
      //   `;
      //     })
      //     .join("");

      //   const taxRows = taxDetails
      //     .map(
      //       (tax) => `
      //   <tr>
      //     <td colspan="3">${tax.name} (${tax.percentage}%)</td>
      //     <td class="text-right">₹${tax.amount.toFixed(2)}</td>
      //   </tr>
      // `
      //     )
      //     .join("");

      //   const billHTML = `
      //   <html>
      //   <head>
      //     <title>Bill</title>
      //     <style>
      //       body {
      //     font-family: 'Courier New', monospace;
      //     font-size: 14px;
      //     padding: 20px;
      //       }
      //       .text-center { text-align: center; }
      //       .text-right { text-align: right; }
      //       table { width: 100%; border-collapse: collapse; margin-top: 10px; }
      //       th, td { padding: 4px; border-bottom: 1px dashed #ccc; }
      //       .no-border td { border: none; }
      //       hr { border: none; border-top: 1px dashed #000; margin: 10px 0; }
      //     </style>
      //   </head>
      //   <body>
      //     <div class="text-center">
      //       <h2 style="margin: 0;">${fooderData.fooder_name || "Restaurant"}</h2>
      //       <p style="margin: 0;">${fooderData.f_address || ""}, ${fooderData.f_city || ""
      //     }</p>
      //       <p style="margin: 0;">Phone: ${fooderData.f_landline || ""} | GST: ${fooderData.fooder_gstin || ""
      //     }</p>
      //     </div>

      //     <hr/>

      //     <p><strong>Customer:</strong> ${customerDetails.name || "N/A"}</p>
      //     <p><strong>Date:</strong> ${dateStr} <strong style="float:right;">Time:</strong> ${timeStr}</p>
      //     <p><strong>Table:</strong> #${selectedTable?.table_no || selectedTable?.name || "N/A"
      //     } &nbsp;&nbsp;&nbsp; <strong>Mode:</strong> ${orderMode}</p>

      //     <table>
      //       <thead>
      //     <tr>
      //       <th>Item</th>
      //       <th class="text-center">Qty</th>
      //       <th class="text-right">Rate</th>
      //       <th class="text-right">Amt</th>
      //     </tr>
      //       </thead>
      //       <tbody>
      //     ${itemsRows}
      //       </tbody>
      //     </table>

      //     <table>
      //       <tbody>
      //     <tr><td colspan="3">Subtotal</td><td class="text-right">₹${subtotal.toFixed(
      //       2
      //     )}</td></tr>
      //     ${discountValue > 0
      //       ? discountMode === 0
      //         ? `<tr><td colspan="3">Discount (${discountValue}%)</td><td class="text-right">₹${discountAmount.toFixed(
      //           2
      //         )}</td></tr>`
      //         : `<tr><td colspan="3">Discount</td><td class="text-right">₹${discountAmount.toFixed(
      //           2
      //         )}</td></tr>`
      //       : ""
      //     }
      //     ${serviceChargeAmount > 0
      //       ? `<tr><td colspan="3">SCH (${serviceChargeDetails?.percentage || 0
      //       }%)</td><td class="text-right">₹${serviceChargeAmount.toFixed(
      //         2
      //       )}</td></tr>`
      //       : ""
      //     }
      //     ${taxRows}
      //     ${packagingCharges > 0
      //       ? `<tr><td colspan="3">Packaging Charges</td><td class="text-right">₹${packagingCharges.toFixed(
      //         2
      //       )}</td></tr>`
      //       : ""
      //     }
      //     ${Math.abs(roundOffValue) > 0
      //       ? `<tr><td colspan="3">Round Off</td><td class="text-right">₹${roundOffValue.toFixed(
      //         2
      //       )}</td></tr>`
      //       : ""
      //     }
      //     <tr><td colspan="3"><strong>Total</strong></td><td class="text-right"><strong>₹${total.toFixed(
      //       2
      //     )}</strong></td></tr>
      //       </tbody>
      //     </table>

      //     <hr/>

      //     <p class="text-center">
      //       FSSAI: ${fooderData.fssai_number || "N/A"}<br/>
      //       ${fooderData.billing_notes || "Thank you for visiting!"}
      //     </p>
      //   </body>
      //   </html>
      //     `;

      const itemsHtmlRows = orderItems
        .map((item) => {
          return `<tr>
    <td>
      <div style="display: flex; flex-direction: column; justify-content: center;">
        <span>${item.name} </span>

     
 
            ${item?.selectedvariants &&
              item?.selectedvariants?.combination_details
              ? item.selectedvariants.combination_details
                .map(
                  (i) =>
                    `<div><b>${i.attribute_name}:</b> ${i.attribute_value_name}</div>`
                )
                .join("")
              : ""
            }

      ${item?.addons &&
            item?.addons
              .map((i, no) => `<div><b>${no + 1}.</b> ${i.addon_item_name}</div>`)
              .join("")
            }
       
      </div>
    </td>
    <td class="text-center">${item.quantity}</td>
    <td class="text-right">₹${parseFloat(item.price).toFixed(2)}</td>
    <td class="text-right">₹${(parseFloat(item.price) * item.quantity).toFixed(
              2
            )}</td>
  </tr>`;
        })
        .join("");

      const summary = {
        subTotal: subtotal,
        schAmount: serviceChargeAmount,
        schDetails: serviceChargeDetails,
        taxSlabs: taxMap,
        packingCharges: packagingCharges,
        total: total,
        discount: discountAmount,
        round_off: roundOffValue,
      };

      const eater_name = customerDetails?.name || "";
      const orderType = (orderMode || "").replace(/_/g, " ").toUpperCase();
      const currentDate = dateStr;
      const currentTime = timeStr;
      const tableNumber =
        selectedTable?.table_no ||
        selectedTable?.table_name ||
        selectedTable?.name ||
        "";



      const billHTML = `
         
        

<html>
<head>
  <style>
    body { font-family: 'Arial', sans-serif; padding: 10px; font-size: 11px; color: #000; }
    .text-center { text-align: center; }
    .text-right { text-align: right; }
    .text-left { text-align: left; }
    table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 14px; }
    th, td { padding: 6px 4px; border-bottom: 1px solid #ccc; }
    .section-divider { border-top: 1px dashed #000; margin: 10px 0; }
    .bill-header { font-weight: bold; font-size: 12px; text-align: center; margin-top: 12px; margin-bottom: 8px; }
    .company-info { text-align: center; margin-bottom: 4px; font-size: 14px; }
    .logo { height: 100px; object-fit: contain; margin: 10px auto 5px; display: block; }
    .footer { text-align: center; margin-top: 15px; font-size: 13px; }
    .bold { font-weight: bold; }
  </style>
</head>
<body>

  <div style="text-align:end;"> <strong>${invoice_number || ""}</strong></div>

  <img src="${fooderData?.fooder_logo}" class="logo" alt="Logo" />

  <div class="bill-header">${fooderData?.fooder_name}</div>
  <div class="company-info">${fooderData?.f_address}, ${fooderData?.f_city}, ${fooderData?.f_state
        } - ${fooderData?.f_zipcode}</div>
  <div class="company-info">Phone: ${fooderData?.f_landline}</div>
  <div class="company-info">GST Number: ${fooderData?.fooder_gstin}</div>

  <div style="margin-top: 10px; font-size: 12px;">
    <div><strong>Name:</strong> ${eater_name}</div>
    <div style="display: flex; justify-content: space-between;">
      <div><strong>Date:</strong> ${currentDate}</div>
      <div><strong>Time:</strong> ${currentTime}</div>
    </div>
<div style="display: flex; justify-content: space-between; align-items: center;">
  <div style="display: flex; align-items: center; gap: 8px;">
    <strong>${orderType}</strong>
    ${orderMode !== "DELIVERY" && orderMode !== "COUNTER"
          ? `<div>${table_no ? `${table_no}` : ""}</div>`
          : ""
        }
  </div>
${order_number ? `<div> <b>Order No #${order_number}</b></div>` : ""}
  
</div>
  </div>

  <div class="bill-header">Original Receipt</div>

  <table>
    <thead>
      <tr>
        <th class="text-left">Item</th>
        <th class="text-center">Qty</th>
        <th class="text-right">Rate</th>
        <th class="text-right">Amt</th>
      </tr>
    </thead>
    <tbody>
      ${itemsHtmlRows}
    </tbody>
  </table>

  <div class="section-divider"></div>

  <div style="font-size: 14px;">
    <div style="display: flex; justify-content: space-between;">
      <span>Subtotal:</span>
      <span>₹${(summary.subTotal || 0).toFixed(2)}</span>
    </div>

 ${summary.discount > 0
          ? `<div style="display: flex; justify-content: space-between;">
         <span>Discount${discountMode === 0 ? ` (${discountValue}%)` : ""}</span>
         <span>-₹${summary.discount.toFixed(2)}</span>
       </div>`
          : ""
        }

${summary.schAmount > 0
          ? `<div style="display: flex; justify-content: space-between;">
           <span>${summary.schDetails?.name || "SCH"} (${summary.schDetails?.percentage || 0
          }%):</span>
           <span>₹${summary.schAmount.toFixed(2)}</span>
         </div>`
          : ""
        }

    

    ${summary.taxSlabs
          ? Object.entries(summary.taxSlabs)
            .map(([key, value]) => {
              const percent = parseFloat(key);
              const halfPercent = (percent / 2).toFixed(1);
              const halfAmount = (value / 2).toFixed(2);
              return `
              <div style="display: flex; justify-content: space-between;">
                <span>CGST (${halfPercent}%):</span>
                <span>₹${halfAmount}</span>
              </div>
              <div style="display: flex; justify-content: space-between;">
                <span>SGST (${halfPercent}%):</span>
                <span>₹${halfAmount}</span>
              </div>
            `;
            })
            .join("")
          : ""
        }

    ${summary.packingCharges > 0
          ? `<div style="display: flex; justify-content: space-between;">
           <span>Packing Charges:</span>
           <span>₹${summary.packingCharges.toFixed(2)}</span>
         </div>`
          : ""
        }

     ${parseFloat(roundOffValue).toFixed(2) != 0
          ? `<div style="display: flex; justify-content: space-between;">
           <span>Round off</span>
           <span>₹${roundOffValue.toFixed(2)}</span>
         </div>`
          : ""
        }

    <div style="display: flex; justify-content: space-between; font-size: 15px; margin-top: 5px;">
      <strong>Total:</strong>
      <strong>₹${(Math.round(summary.total) || 0).toFixed(2)}</strong>
    </div>
  </div>

  <div class="section-divider"></div>

  <div class="footer">
    <div>FSSAI Number: ${fooderData?.fssai_number}</div>
    <div style="margin-top: 6px;">${fooderData?.billing_notes || ""}</div>
    <p style="margin-top: 6px;">Thank you for your visit!</p>
  </div>

</body>
</html>
`;

      if (enableSilentPrinting === 1) {
        // 🔇 Silent print via Electron
        const resp = await fetch("http://localhost:3111/print", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ printerType: "bill", data: billData }),
        });
        if (resp.ok) Toaster.success("Bill printed silently");
        else throw new Error(await resp.text());
      } else {
        // 🖨️ Print using hidden iframe (no new tab)
        let iframe = document.getElementById("print-iframe");
        if (!iframe) {
          iframe = document.createElement("iframe");
          iframe.id = "print-iframe";
          iframe.style.position = "fixed";
          iframe.style.right = "0";
          iframe.style.bottom = "0";
          iframe.style.width = "0";
          iframe.style.height = "0";
          iframe.style.border = "0";
          document.body.appendChild(iframe);
        }

        const doc = iframe.contentWindow.document;
        doc.open();

        doc.write(billHTML);

        doc.close();

        setTimeout(() => {
          iframe.contentWindow.focus();
          iframe.contentWindow.print();
        }, 1000);
      }
    } catch (err) {
      console.error("Print failed:", err);

    }
  };



  const handlePrintKOTAndSaveBill = async () => {
    console.log("handlePrintKOT called");

    const itemsWithoutKOT = orderItems.filter((item) => !item.isKOT);
    if (itemsWithoutKOT.length === 0) {
      Toaster.error(
        "All items already have KOT generated. Please add new items to print KOT."
      );
      return;
    }


    try {
      // Step 1: Generate KOT for items without KOT
      const itemsWithoutKOT = orderItems.filter((item) => !item.isKOT);
      let updatedItems = [...orderItems]; // Create a copy of orderItems
      const appData = await getAppDataFromDB();

      const fooderData = appData || {};

      if (itemsWithoutKOT.length > 0) {
        const temp_kot = orderItems
          .filter((item) => item.KOT_id)
          .map((item) => item.KOT_id);

        const kotPayload = itemsWithoutKOT.map((item) => ({
          ...item,
          table_id: selectedTable?.table_id || selectedTable?.id,
          fooder_name: fooderData.fooder_name,
          order_type: "DINE IN",
          order_id: orderId || "",
          all_kots: temp_kot,
          product_id: item.id,
          product_name: item.name || item.product?.name,
          product_price:
            item.product_price || (item.price ? item.price.toString() : ""),
          product_proprice: item.product_proprice || "",
          staffDetails: staffDetails,
        }));

        setFullLoader(true);

        const kotResponse = await axiosInstance.post(PostSaveKot, kotPayload);

        if (kotResponse.data?.status === "success") {
          // Update items with KOT information
          updatedItems = orderItems.map((item) => ({
            ...item,
            isKOT: item.isKOT || true,
            KOT_id: item.KOT_id || kotResponse.data.id,
            KOT_no: item.KOT_no || kotResponse.data.KOT_no,
            KOT_time: item.KOT_time || Date.now(),
          }));
          setOrderItems(updatedItems);
          Toaster.success("KOT generated successfully");
        } else {
          throw new Error(
            kotResponse.data?.message || "Failed to generate KOT"
          );
        }
      }



      // Prepare the common payload details
      const commonPayloadDetails = updatedItems.map((item) => ({
        menu_id: item.menu_id || item.product?.menu_id || item.product?.id,
        tax_percent: item.tax_percent ?? 0,
        tax_type: item.tax_type ?? 0,
        product_type: item.product_type ?? 0,
        dine_in_service: item.dine_in_service ?? 1,
        delivery_service: item.delivery_service ?? 1,
        pick_up_service: item.pick_up_service ?? 1,
        min_order_quantity: item.min_order_quantity ?? 1,
        quantity: item.quantity,
        packaging_charges: item.packaging_charges ?? "0",
        variants: item.variants || [],
        attributes: item.attributes || [],
        addons: item.addons || [],
        local_id: item.local_id || Date.now(),
        fooder_id: item.fooder_id,
        table_id: selectedTable?.table_id || selectedTable?.id,
        fooder_name: fooderData.fooder_name,
        product_special_note: item.product_special_note || "",
        isKOT: true,
        isSaved: item.isSaved || false,
        KOT_id: item.KOT_id,
        KOT_no: item.KOT_no || "",
        KOT_time: item.KOT_time || Date.now(),
        selectedAddons: item.selectedAddons || [],
        selectedvariants: item.selectedvariants || { variantId: 0 },
        variant_id:
          item.selectedvariants &&
            !isNaN(parseInt(item.selectedvariants.variantId))
            ? parseInt(item.selectedvariants.variantId)
            : 0,
        withTaxPrice: item.withTaxPrice ?? item.price ?? 0,
        withOutTaxPrice: item.withOutTaxPrice ?? item.price ?? 0,
        product_id: item.product_id || item?.product_id || item?.id,
        product_name: item.product_name || item?.name,
        product_price:
          item.product_price || (item.price ? item.price.toString() : ""),
        product_proprice: item.product_proprice || "",
        orderId: orderId || null,
      }));

      // Step 2: Create or update the order/bill
      if (!orderNo) {
        // First time order creation
        const serviceChargeValue = calculateServiceChargeAmount();
        const payload = {
          eater_name: customerDetails.name || "",
          eater_phonenumber: customerDetails.mobile || "",
          address: customerDetails.address || "",
          eater_suggestions: customerDetails.eater_suggestions,
          no_of_eaters: "1",
          payment_type:
            paymentMethod.charAt(0).toUpperCase() + paymentMethod.slice(1),
          waiter_id: 0,
          table_id: selectedTable?.table_id || selectedTable?.id,
          order_type: "DINE IN",
          subtotal: calculateSubtotal().toFixed(2),
          service_charge: serviceChargeValue, // <-- send calculated value, not %
          tax_amount: calculateTax(),
          total: calculateTotal(),
          discount_type: discountMode.toString(),
          discount_rate: discountValue.toString(),
          details: commonPayloadDetails,
          service_charge_details: {
            name: serviceChargeDetails.name,
            percentage: serviceChargeDetails.percentage,
          },
          tax_details: [],
          cart_packing_charges: 0,
          round_off_amount: Number(roundOffValue),
          is_NC: isNC,
        };

        const orderResponse = await axiosInstance.post(
          PostCreateOrder,
          payload
        );

        if (orderResponse.data?.status === "success") {

          const { invoice_number, order_number, table_no } =
            orderResponse?.data; //added
          setOrderId(orderResponse.data.order_id);
          if (onOrderNoUpdate)
            onOrderNoUpdate(orderResponse.data.order_number);
          setInvoiceNumber(orderResponse.data.invoice_number || "");
          setOrderTime(orderResponse.data.creation_date || "");
          setOrdercreateno(orderResponse.data.order_number || "");
          const savedItems = updatedItems.map((item) => ({
            ...item,
            isSaved: true,
          }));
          setOrderItems(savedItems);
          Toaster.success("Order created successfully");
          if (staffType === 1) {
            setActiveTab && setActiveTab("markpaid");
          }
          return { invoice_number, order_number, table_no };

        } else {
          throw new Error(
            orderResponse.data?.message || "Failed to create order"
          );
        }
      } else {
        if (!orderId) {
          Toaster.error("Order ID is missing. Please save the bill first.");
          setIsSavingBill(false);
          return;
        }
        // Subsequent updates to existing order
        const serviceChargeValue = calculateServiceChargeAmount();
        const updatePayload = {
          order_id: orderId,
          subtotal: calculateSubtotal().toFixed(2),
          service_charge: serviceChargeValue, // <-- send calculated value, not %
          tax_amount: "0.00",
          total: calculateTotal(),
          discount_type: discountMode.toString(),
          discount_rate: discountValue.toString(),
          details: commonPayloadDetails,
          service_charge_details: {
            name: serviceChargeDetails.name,
            percentage: serviceChargeDetails.percentage,
          },
          round_up_amount: Number(roundOffValue),
          is_NC: isNC,
        };

        const updateResponse = await axiosInstance.post(
          PostAfterOrderGenerateUpdateNewItem,
          updatePayload
        );

        if (updateResponse.data?.status === "success") {
          const { invoice_number, order_number, table_no } = updateResponse?.data;
          const savedItems = updatedItems.map((item) => ({
            ...item,
            isSaved: true,
          }));
          setOrderItems(savedItems);
          Toaster.success(updateResponse.data.message);
          setIsNCToggledAfterOrder(false);
          if (staffType === 1) {
            setActiveTab && setActiveTab("markpaid");
          }
          return { invoice_number, order_number, table_no };
        } else {
          throw new Error(
            updateResponse.data?.message || "Failed to update order"
          );
        }
      }
    } catch (error) {
      if (error.response && error.response.data) {
        Toaster.error(
          typeof error.response.data === "string"
            ? error.response.data
            : error.response.data.message ||
            JSON.stringify(error.response.data)
        );
      } else {
        Toaster.error(error.message || "Failed to complete bill process");
      }
      console.error(error);
    } finally {
      setIsSavingBill(false);
      setFullLoader(false);
    }



    
    setIsPrintingKOT(true);
    try {
      await printKOTOnly();
    } catch (error) {
      console.error("Print error:", error);
      Toaster.error(
        error.message.includes("fetch")
          ? "Thermal printer not connected. Please check if the printer service is running."
          : `Failed to print KOT: ${error.message}`
      );
    } finally {
      setIsPrintingKOT(false);


    }
  };



  const handlePrintKOT = async () => {
    console.log("handlePrintKOT called");

    // Prevent multiple calls if already processing
    if (isPrintingKOT || isSavingKOT || isSavingBill) {
      console.log("Already processing, ignoring click");
      return;
    }

    if (!orderItems.length) {
      Toaster.error("Please add new item to generate KOT");
      return;
    }

    // ✅ Product existence check before proceeding
    const appData = await getAppDataFromDB();
    const productList = appData?.product || [];

    const missingProduct = orderItems.find(
      (item) => !productList.some((p) => Number(p.id) === Number(item.id))
    );

    if (missingProduct) {
      console.warn("Product not found in DB:", missingProduct);
      window.location.reload();
      return;
    }

    // For delivery/counter modes: execute complete workflow (save KOT → print KOT → save bill → print bill)
    if (["DELIVERY", "COUNTER"].includes(orderMode)) {
      // Add validation checks for delivery/counter modes before proceeding
      if (orderMode === "DELIVERY") {
        if (!customerPhone || customerPhone.length !== 10) {
          setActiveTab && setActiveTab("details");
          Toaster.error("Please enter a valid 10-digit mobile number");
          return;
        }
        if (!customerDetails.name || customerDetails.name.trim() === "") {
          setActiveTab && setActiveTab("details");
          Toaster.error("Please enter customer name");
          return;
        }
        if (!customerDetails.address || customerDetails.address.trim() === "") {
          setActiveTab && setActiveTab("details");
          Toaster.error("Please enter address");
          return;
        }
        if (!deliveryGuyId) {
          setActiveTab && setActiveTab("details");
          Toaster.error("Please select a delivery guy");
          return;
        }
      }

      setIsPrintingKOT(true);

      try {
        // Step 1: Save KOT (only for items without KOT)
        // const itemsWithoutKOT = orderItems.filter((item) => !item.isKOT);
        // if (itemsWithoutKOT.length > 0) {
        // Toaster.info("Step 1: Saving KOT...");
        // await handleSaveKOT();
        // Wait for KOT save to complete
        // await new Promise(resolve => setTimeout(resolve, 1000));
        // }

        // Step 2: Print KOT
        // Toaster.info("Step 2: Printing KOT...");
        // await printKOTOnly();

        // Step 3: Save Bill
        // Toaster.info("Step 3: Saving Bill...");
        // await handleSaveBill();
        // Wait for bill save to complete
        // await new Promise(resolve => setTimeout(resolve, 1000));

        // Step 4: Print Bill
        // Toaster.info("Step 4: Printixng Bill...");


        // Toaster.success("KOT & Bill processed successfully!");
      } catch (error) {
        console.error("Complete workflow error:", error);
        Toaster.error(`Workflow error: ${error.message}`);
      } finally {
        setIsPrintingKOT(false);

      }
      return;
    }

    // For DINE IN mode: execute original KOT-only logic
    const itemsWithoutKOT = orderItems.filter((item) => !item.isKOT);
    if (itemsWithoutKOT.length === 0) {
      Toaster.error(
        "All items already have KOT generated. Please add new items to print KOT."
      );
      return;
    }

    setIsPrintingKOT(true);
    try {
      await printKOTOnly();
    } catch (error) {
      console.error("Print error:", error);
      Toaster.error(
        error.message.includes("fetch")
          ? "Thermal printer not connected. Please check if the printer service is running."
          : `Failed to print KOT: ${error.message}`
      );
    } finally {
      setIsPrintingKOT(false);
      //  await handleSaveBill(false)

    }
  };

  // Helper function to handle KOT printing logic
  //   const printKOTOnly = async () => {
  //     // Additional safety check to prevent concurrent executions
  //     if (isPrintingKOT || isSavingKOT) {
  //       console.log("printKOTOnly: Already processing, skipping");
  //       return;
  //     }

  //     const appData = await getAppDataFromDB();
  //     const enableSilentPrinting = Number(appData?.enable_silent_printing) || 0;

  //     let updatedOrderItems = [...orderItems];

  //     const itemsWithoutKOT = orderItems.filter((item) => !item.isKOT);
  //     if (itemsWithoutKOT.length === 0) {
  //       throw new Error("No new items to print KOT");
  //     }

  //     const temp_kot = orderItems
  //       .filter((item) => item.KOT_id)
  //       .map((item) => item.KOT_id);

  //     const payload = itemsWithoutKOT.map((item) => ({
  //       ...item,
  //       table_id: selectedTable?.table_id || selectedTable?.id,
  //       fooder_name: "Lava Pub & Restaurants",
  //       order_type: orderMode,
  //       order_id: orderNo ? orderId || "" : "",
  //       all_kots: temp_kot,
  //       product_id: item.id,
  //       product_name: item.name || item.product?.name,
  //       product_price:
  //         item.product_price || (item.price ? item.price.toString() : ""),
  //       product_proprice: item.product_proprice || "",
  //       staffDetails: staffDetails,
  //     }));

  //     setFullLoader(true);
  //     const response = await axiosInstance.post(PostSaveKot, payload);
  //     setFullLoader(false);

  //     if (response.data?.status === "success") {
  //       const kotGenerationTime = Date.now();
  //       updatedOrderItems = orderItems.map((item) => ({
  //         ...item,
  //         isKOT: item.isKOT || true,
  //         KOT_id: item.KOT_id || response.data.id,
  //         KOT_no: item.KOT_no || response.data.KOT_no,
  //         KOT_time: item.KOT_time || kotGenerationTime,
  //       }));

  //       setOrderItems(updatedOrderItems);
  //       Toaster.success("KOT generated successfully");
  //     } else {
  //       throw new Error(response.data?.message || "Failed to generate KOT");
  //     }

  //     const itemsWithKOT = updatedOrderItems.filter(
  //       (item) => item.isKOT && item.KOT_id
  //     );
  //     const lastKotId = Math.max(...itemsWithKOT.map((item) => item.KOT_id));
  //     const lastKotItems = itemsWithKOT.filter(
  //       (item) => item.KOT_id === lastKotId
  //     );

  //     if (!lastKotItems.length) {
  //       throw new Error("No last KOT found");
  //     }

  //     const lastKotItem = lastKotItems[0];
  //     const kotNo = lastKotItem.KOT_no;
  //     const kotTime = lastKotItem.KOT_time;
  //     const tableNo = selectedTable?.table_no || selectedTable?.name || "Table";

  //     const kotDate = new Date(kotTime);
  //     const currentDate = kotDate.toLocaleDateString("en-GB", {
  //       day: "2-digit",
  //       month: "short",
  //       year: "numeric",
  //     });
  //     const currentTime = kotDate.toLocaleTimeString("en-GB", {
  //       hour: "2-digit",
  //       minute: "2-digit",
  //       hour12: true,
  //     });

  //     const itemsText = lastKotItems
  //       .map((item) => {
  //         const itemName = item.name || item.product?.name;
  //         const quantity = item.quantity;
  //         return `${itemName}${" ".repeat(
  //           Math.max(1, 20 - itemName.length)
  //         )}${quantity}`;
  //       })
  //       .join("\n");

  //     const kotData = `ESC @
  // ESC ! 0x08
  // ESC a 0x01
  // ${kotNo}
  // ESC ! 0x00
  // ESC a 0x00
  // Date : ${currentDate}
  // Time : ${currentTime}
  // ${orderMode} : ${tableNo}

  // ESC ! 0x08
  // Item${" ".repeat(15)}Qty
  // ESC ! 0x00
  // ================================
  // ${itemsText}
  // ================================

  // ESC d 5
  // GS V 0x41 0x03`;

  //     // HTML version for browser print
  //     // const itemsHtmlRows = lastKotItems
  //     //   .map((item) => {
  //     //     const itemName = item.name || item.product?.name;
  //     //     const qty = item.quantity;
  //     //     return `<tr><td>${itemName}</td><td class="text-right">${qty}</td></tr>`;
  //     //   })
  //     //   .join("");

  //     // const kotHTML = `
  //     // <html>
  //     //   <head>
  //     //     <style>
  //     //       body { font-family: 'Courier New', monospace; padding: 20px; font-size: 14px; }
  //     //       .text-center { text-align: center; }
  //     //       .text-right { text-align: right; }
  //     //       table { width: 100%; border-collapse: collapse; margin-top: 10px; }
  //     //       th, td { padding: 4px; border-bottom: 1px dashed #ccc; }
  //     //       hr { border: none; border-top: 1px dashed #000; margin: 10px 0; }
  //     //     </style>
  //     //   </head>
  //     //   <body>
  //     //     <div class="text-center">
  //     //       <h2 style="margin: 0;"> ${kotNo}</h2>
  //     //       <p style="margin: 0;">Date: ${currentDate} &nbsp; Time: ${currentTime}</p>
  //     //       <p style="margin: 0;">Mode: ${orderMode} | Table: ${tableNo}</p>
  //     //     </div>
  //     //     <hr />
  //     //     <table>
  //     //       <thead><tr><th>Item</th><th class="text-right">Qty</th></tr></thead>
  //     //       <tbody>${itemsHtmlRows}</tbody>
  //     //     </table>
  //     //     <hr />
  //     //     <p class="text-center">Generated by POS</p>
  //     //   </body>
  //     // </html>`;

  //     // Generate items HTML rows with variants, addons, and notes
  //     const itemsHtmlRows = orderItems.map(item => {
  //     const itemName = item.name;
  //     const qty = item.quantity;

  //     const variantText =
  //       item.variant?.attribute_name && item.variant?.attribute_value_name
  //         ? `<div style="font-size: 14px;">${item.variant.attribute_name}: ${item.variant.attribute_value_name}</div>`
  //         : "";

  //     const addonsText =
  //       Array.isArray(item.addons) && item.addons.length > 0
  //         ? `<div style="font-size: 14px;">Addons: ${item.addons.map(a => a.name).join(", ")}</div>`
  //         : "";

  //     const notesText = item.notes
  //         ? `<div style="font-size: 14px;">${item.notes}</div>`
  //         : "";

  //         if(!item.KOT_id){

  //          return `
  //       <tr>
  //         <td>
  //           ${itemName}
  //           ${variantText}
  //           ${addonsText}
  //           ${notesText}
  //         </td>
  //         <td class="text-right">${qty}</td>
  //       </tr>
  //     `;

  //         }else{
  //            return `

  //     `;
  //         }

  //   }).join("");

  // // Final KOT HTML for browser printing
  // const kotHTML = `
  // <html>
  //   <head>
  //     <style>
  //       body {
  //         font-family: 'Arial', sans-serif;
  //         font-size: 14px;
  //         padding: 6px;
  //         margin-inline: 4px;
  //       }
  //       .text-center { text-align: center; }
  //       .text-right { text-align: right; }
  //       .header-row, .info-row {
  //         display: flex;
  //         justify-content: space-between;
  //         margin: 4px 0;
  //       }
  //       h2 {
  //         margin: 0;
  //         font-size: 16px;
  //       }
  //       table {
  //         width: 100%;
  //         border-collapse: collapse;
  //         margin-top: 10px;
  //       }
  //       th, td {
  //         padding-top: 2px;
  //         font-size: 14px;
  //       }
  //       thead {
  //         border-top: 1px solid #000;
  //         border-bottom: 1px solid #000;
  //         padding-block: 2px;
  //       }
  //       th {
  //         text-align: left;
  //         font-weight: bold;
  //         font-size: 14px;
  //       }
  //     </style>
  //   </head>
  //   <body>
  //     <div class="text-center">
  //       <h2>${kotNo}</h2>
  //     </div>

  //     <div class="header-row">
  //       <div style="font-size: 14px;">Date: ${currentDate}</div>
  //       <div style="font-size: 14px;">Time: ${currentTime}</div>
  //     </div>

  //       <div class="kot-header">
  //       ${!["DELIVERY", "COUNTER"].includes(orderMode)
  //         ? `<div style="font-size: 14px;"><span style="font-weight:bold">${tablenotoprint}</span></div>`
  //         : `<div style="font-size: 14px;"><span style="font-weight:bold">${orderMode}</span></div>`
  //       }
  //     </div>

  //     <table>
  //       <thead>
  //         <tr>
  //           <th>Item</th>
  //           <th class="text-right">Qty</th>
  //         </tr>
  //       </thead>
  //       <tbody>
  //         ${itemsHtmlRows}
  //       </tbody>
  //     </table>
  //   </body>
  // </html>
  // `;

  //     if (enableSilentPrinting === 1) {
  //       // Silent print to thermal printer
  //       const printResponse = await fetch("http://localhost:3111/print", {
  //         method: "POST",
  //         headers: { "Content-Type": "application/json" },
  //         body: JSON.stringify({ printerType: "kot", data: kotData }),
  //       });

  //       if (printResponse.ok) {
  //         Toaster.success("KOT printed successfully");
  //       } else {
  //         const errorText = await printResponse.text();
  //         throw new Error(errorText || "Failed to print KOT");
  //       }
  //     } else {
  //       // Browser print using iframe
  //       let iframe = document.getElementById("print-iframe");
  //       if (!iframe) {
  //         iframe = document.createElement("iframe");
  //         iframe.id = "print-iframe";
  //         iframe.style.position = "fixed";
  //         iframe.style.right = "0";
  //         iframe.style.bottom = "0";
  //         iframe.style.width = "0";
  //         iframe.style.height = "0";
  //         iframe.style.border = "0";
  //         document.body.appendChild(iframe);
  //       }

  //       const doc = iframe.contentWindow.document;
  //       doc.open();
  //       doc.write(kotHTML);
  //       doc.close();

  //       setTimeout(() => {
  //         iframe.contentWindow.focus();
  //         iframe.contentWindow.print();
  //       }, 300);
  //     }
  //   };

  // Helper function to handle KOT printing logic
  const printKOTOnly = async () => {
    // Additional safety check to prevent concurrent executions
    if (isPrintingKOT || isSavingKOT) {
      console.log("printKOTOnly: Already processing, skipping");
      return;
    }

    const appData = await getAppDataFromDB();

    const fooderData = appData || {};
    const enableSilentPrinting = Number(appData?.enable_silent_printing) || 0;

    let updatedOrderItems = [...orderItems];

    const itemsWithoutKOT = orderItems.filter((item) => !item.isKOT);
    if (itemsWithoutKOT.length === 0) {
      throw new Error("No new items to print KOT");
    }

    const temp_kot = orderItems
      .filter((item) => item.KOT_id)
      .map((item) => item.KOT_id);

    const payload = itemsWithoutKOT.map((item) => ({
      ...item,
      table_id: selectedTable?.table_id || selectedTable?.id,
      fooder_name: fooderData.fooder_name,
      order_type: orderMode,
      order_id: orderNo ? orderId || "" : "",
      all_kots: temp_kot,
      product_id: item.id,
      product_name: item.name || item.product?.name,
      product_price:
        item.product_price || (item.price ? item.price.toString() : ""),
      product_proprice: item.product_proprice || "",
      staffDetails: staffDetails,
    }));

    setFullLoader(true);
    const response = await axiosInstance.post(PostSaveKot, payload);

    setFullLoader(false);

    if (response.data?.status === "success") {
      const kotGenerationTime = Date.now();
      updatedOrderItems = orderItems.map((item) => ({
        ...item,
        isKOT: item.isKOT || true,
        KOT_id: item.KOT_id || response.data.id,
        KOT_no: item.KOT_no || response.data.KOT_no,
        KOT_time: item.KOT_time || kotGenerationTime,
      }));

      setOrderItems(updatedOrderItems);
      Toaster.success("KOT generated successfully");
    } else {
      throw new Error(response.data?.message || "Failed to generate KOT");
    }

    const { table_no, orderType } = response.data;

    const itemsWithKOT = updatedOrderItems.filter(
      (item) => item.isKOT && item.KOT_id
    );
    const lastKotId = Math.max(...itemsWithKOT.map((item) => item.KOT_id));
    const lastKotItems = itemsWithKOT.filter(
      (item) => item.KOT_id === lastKotId
    );

    if (!lastKotItems.length) {
      throw new Error("No last KOT found");
    }

    const lastKotItem = lastKotItems[0];
    const kotNo = lastKotItem.KOT_no;
    const kotTime = lastKotItem.KOT_time;
    // const tableNo = selectedTable?.table_no || selectedTable?.name || "Table";
    const tableNo = table_no
    const order_type = orderType

    const kotDate = new Date(kotTime);
    const currentDate = kotDate.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
    const currentTime = kotDate.toLocaleTimeString("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });

    // ✅ Updated: Include variants and addons in thermal printer text - same as bill format
    const itemsText = lastKotItems
      .map((item) => {
        const itemName = item.name || item.product?.name;
        const quantity = item.quantity;

        // Build item details with variants and addons
        let itemDetails = `${itemName}${" ".repeat(
          Math.max(1, 20 - itemName.length)
        )}${quantity}`;

        // Add variants if present (same format as bill)
        if (
          item.selectedvariants &&
          item.selectedvariants.combination_details
        ) {
          item.selectedvariants.combination_details.forEach((variant) => {
            itemDetails += `\n  ${variant.attribute_name}: ${variant.attribute_value_name}`;
          });
        }

        // Add addons if present (same format as bill)
        if (
          item.addons &&
          Array.isArray(item.addons) &&
          item.addons.length > 0
        ) {
          item.addons.forEach((addon, no) => {
            itemDetails += `\n  ${no + 1}. ${addon.addon_item_name}`;
          });
        }

        // Add product special note if present
        if (item.product_special_note && item.product_special_note.trim()) {
          itemDetails += `\n  Note: ${item.product_special_note.trim()}`;
        }

        return itemDetails;
      })
      .join("\n");

    const kotData = `ESC @
ESC ! 0x08
ESC a 0x01
${kotNo}
ESC ! 0x00
ESC a 0x00
Date : ${currentDate}
Time : ${currentTime}
${order_type} : ${tableNo}

ESC ! 0x08
Item${" ".repeat(15)}Qty
ESC ! 0x00
================================
${itemsText}
================================

ESC d 5
GS V 0x41 0x03`;

    // ✅ Updated: Generate items HTML rows with variants and addons - exactly same format as bill
    const itemsHtmlRows = lastKotItems
      .map((item) => {
        return `<tr>
      <td>
        <div style="display: flex; flex-direction: column; justify-content: center;">
          <span>${item.name} </span>

          ${item?.selectedvariants &&
            item?.selectedvariants?.combination_details
            ? item.selectedvariants.combination_details
              .map(
                (i) =>
                  `<div><b>${i.attribute_name}:</b> ${i.attribute_value_name}</div>`
              )
              .join("")
            : ""
          }

          ${item?.addons &&
          item?.addons
            .map(
              (i, no) => `<div><b>${no + 1}.</b> ${i.addon_item_name}</div>`
            )
            .join("")
          }
           
        </div>
      </td>
      <td class="text-right">${item.quantity}</td>
    </tr>`;
      })
      .join("");

    // Final KOT HTML for browser printing
    const kotHTML = `
  <html>
    <head>
      <style>
        body {
          font-family: 'Arial', sans-serif;
          font-size: 14px;
          padding: 6px;
          margin-inline: 4px;
        }
        .text-center { text-align: center; }
        .text-right { text-align: right; }
        .header-row, .info-row {
          display: flex;
          justify-content: space-between;
          margin: 4px 0;
        }
        h2 {
          margin: 0;
          font-size: 16px;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 10px;
        }
        th, td {
          padding-top: 6px;
          padding-bottom: 6px;
          font-size: 14px;
          vertical-align: top;
        }
        thead {
          border-top: 1px solid #000;
          border-bottom: 1px solid #000;
          padding-block: 2px;
        }
        th {
          text-align: left;
          font-weight: bold;
          font-size: 14px;
        }
      </style>
    </head>
    <body>
      <div class="text-center">
        <h2>${kotNo}</h2>
      </div>

      <div class="header-row">
        <div style="font-size: 14px;">Date: ${currentDate}</div>
        <div style="font-size: 14px;">Time: ${currentTime}</div>
      </div>

<div class="kot-header">
  ${order_type === "DINE IN"
        ? `<div style="display:flex; justify-content:space-between; font-size:14px;">
           <span style="font-weight:bold">${order_type}</span>
           <span style="font-weight:bold">${tableNo}</span>
         </div>`
        : !["DELIVERY", "COUNTER"].includes(order_type)
          ? `<div style="font-size: 14px;"><span style="font-weight:bold">${tableNo}</span></div>`
          : `<div style="font-size: 14px;"><span style="font-weight:bold">${order_type}</span></div>`
      }
</div>




      <table>
        <thead>
          <tr>
            <th>Item</th>
            <th class="text-right">Qty</th>
          </tr>
        </thead>
        <tbody>
          ${itemsHtmlRows}
        </tbody>
      </table>
    </body>
  </html>
  `;

    if (enableSilentPrinting === 1) {
      // Silent print to thermal printer
      const printResponse = await fetch("http://localhost:3111/print", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ printerType: "kot", data: kotData }),
      });

      if (printResponse.ok) {
        Toaster.success("KOT printed successfully");
      } else {
        const errorText = await printResponse.text();
        throw new Error(errorText || "Failed to print KOT");
      }
    } else {
      // Browser print using iframe
      let iframe = document.getElementById("print-iframe");
      if (!iframe) {
        iframe = document.createElement("iframe");
        iframe.id = "print-iframe";
        iframe.style.position = "fixed";
        iframe.style.right = "0";
        iframe.style.bottom = "0";
        iframe.style.width = "0";
        iframe.style.height = "0";
        iframe.style.border = "0";
        document.body.appendChild(iframe);
      }

      const doc = iframe.contentWindow.document;
      doc.open();
      doc.write(kotHTML);
      doc.close();

      setTimeout(() => {
        iframe.contentWindow.focus();
        iframe.contentWindow.print();
      }, 300);
    }
  };

  useEffect(() => {
    if (!socket) return;
    const handler = (data) => {
      // if (data.socketId === socketId) return;
      let tableId = selectedTable?.id;
      if (currentView === "menu" && tableId === data.tableId) {
        setOrderItems(data.tableItems.items || []);
        // Toaster.success("KOT updated...");
      }
    };
    socket.on("kot-update", handler);
    return () => socket.off("kot-update", handler);
  }, [socket, socketId, currentView, selectedTable]);

  useEffect(() => {
    if (!socket) return;
    const handler = (data) => {
      // if (data.socketId === socketId) return;
      let tableId = selectedTable?.id;
      if (currentView === "menu" && tableId === data.table_id) {
        refreshTableItems();
        // Toaster.success("Order Created...");
      }
    };
    socket.on("order_created", handler);
    return () => socket.off("order_created", handler);
  }, [socket, socketId, currentView, selectedTable]);

  useEffect(() => {
    if (!socket) return;
    const handler = (data) => {
      // if (data.socketId === socketId) return;
      let tableId = selectedTable?.id;
      // Check if the current view is "menu" and the table ID matches
      if (currentView === "menu" && tableId === data.table_id) {
        setOrderItems(data.tableItems.items || []);
        // Toaster.success("Order updated...");
      }
    };
    socket.on("order_items_updated", handler);
    return () => socket.off("order_items_updated", handler);
  }, [socket, socketId, currentView, selectedTable]);

  useEffect(() => {
    if (!socket) return;
    const handler = (data) => {
      // if (data.socketId === socketId) return;
      let tableId = selectedTable?.id;
      // Check if the current view is "menu" and the table ID matches
      if (currentView === "menu" && tableId === data.table_id) {
        setOrderItems(data.tableItems.items || []);
        Toaster.success("kot updated...");
      }
    };
    socket.on("kot_deleted", handler);
    return () => socket.off("kot_deleted", handler);
  }, [socket, socketId, currentView, selectedTable]);

  return (
    <div className="bg-white" style={sidebarStyles.container}>
      {" "}
      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        showDeleteModal={showDeleteModal}
        onConfirm={handleDeleteConfirm}
        onDeleteAndPrint={handleDeleteAndPrint}
        onCancel={handleDeleteCancel}
        itemToDelete={itemToDelete}
        isDeleting={isDeleting}
      />
      {/* Header Section */}
      <div className="p-3" style={sidebarStyles.header}>
        <div className="d-flex align-items-start justify-content-between">
          <div>
            <div style={sidebarStyles.dineType}>{dineType}</div>{" "}
            {currentView !== "tables" && (
              <div className="form-check">
                {staffType === 1 && (
                  <>
                    <input
                      className="form-check-input"
                      type="checkbox"
                      id="ncCheck"
                      checked={isNC}
                      disabled={
                        orderId &&
                        (orderMode === "DELIVERY" || orderMode === "COUNTER")
                      }
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setIsNC(checked);

                        if (checked) {
                          // Apply NC logic
                          setTempDiscountMode(0); // Percentage
                          setTempDiscountValue(100);
                          setDiscountMode(0);
                          setDiscountValue(100);
                          Toaster.success("100% NC Discount applied");
                          setActiveTab("items");
                        } else {
                          // Remove NC logic
                          setTempDiscountValue(0);
                          setDiscountValue(0);
                          Toaster.info("NC Discount removed");
                          setActiveTab("items");
                        }
                      }}
                      style={{
                        width: "15px", // ⬅️ Increased checkbox width
                        height: "15px", // ⬅️ Increased checkbox height
                        marginRight: "10px", // ⬅️ Optional: spacing between checkbox and label
                        cursor:
                          orderId &&
                            (orderMode === "DELIVERY" || orderMode === "COUNTER")
                            ? "not-allowed"
                            : "pointer",
                      }}
                    />
                    <label
                      className="form-check-label"
                      htmlFor="ncCheck"
                      style={{
                        fontSize: "15px",
                        opacity:
                          orderNo &&
                            (orderMode === "DELIVERY" || orderMode === "COUNTER")
                            ? 0.6
                            : 1,
                        cursor:
                          orderNo &&
                            (orderMode === "DELIVERY" || orderMode === "COUNTER")
                            ? "not-allowed"
                            : "pointer",
                      }}
                      onClick={() => {
                        if (
                          orderNo &&
                          (orderMode === "DELIVERY" || orderMode === "COUNTER")
                        ) {
                          Toaster.error(
                            "Can't change NC after bill is generated"
                          );
                        }
                      }}
                    >
                      NC
                    </label>
                  </>
                )}
              </div>
            )}
            <div style={sidebarStyles.orderNo}>
              Order No - {orderNo ? orderNo : "Not Generated"}
            </div>
            <div style={sidebarStyles.dateTime}>
              {dateStr} · {timeStr}
            </div>
          </div>
          {selectedTable && (
            <div className="d-flex flex-column align-items-end">
              <div style={sidebarStyles.tableBadge}>
                {selectedTable?.table_no || selectedTable?.table_name || ""}
              </div>
              {(selectedTable?.table_categoryName ||
                selectedTable?.category_name) && (
                  <div style={sidebarStyles.floorName}>
                    {selectedTable?.table_categoryName ||
                      selectedTable?.category_name}
                  </div>
                )}
            </div>
          )}
        </div>
      </div>
      {/* Tab Bar */}
      <div className="d-flex" style={sidebarStyles.tabBar}>
        {TABS.map((tab) => {
          // Determine if this tab should be disabled
          const isItemsTab = tab.key === "items";
          const isMarkPaidTab = tab.key === "markpaid";
          const isDiscountTab = tab.key === "discount";
          const noItems = orderItems.length === 0;
          const markPaidDisabled = isMarkPaidTab && !orderId;
          const discountDisabled =
            isDiscountTab &&
            orderId &&
            (orderMode === "DELIVERY" || orderMode === "COUNTER");
          const tabDisabled =
            (noItems && !isItemsTab) || markPaidDisabled || discountDisabled;
          return (
            <div
              key={tab.key}
              onClick={() => {
                if (noItems && !isItemsTab) {
                  Toaster.error("Please add items first");
                  return;
                }
                if (tab.key === "markpaid") {
                  const hasNonKOT = orderItems.some((item) => !item.isKOT);
                  if (hasNonKOT || isNCToggledAfterOrder) {
                    Toaster.error("Please save bill first");
                    return;
                  }
                }
                if (markPaidDisabled) {
                  Toaster.error("Please save bill first");
                  return;
                }
                if (discountDisabled) {
                  Toaster.error(
                    "Discount can't be changed after order is generated"
                  );
                  return;
                }
                setActiveTab(tab.key);
              }}
              style={{
                ...sidebarStyles.tab,
                background: activeTab === tab.key ? tab.color : "#2563eb",
                color: activeTab === tab.key ? "#fff" : "#fff",
                cursor: tabDisabled ? "not-allowed" : "pointer",
                opacity: tabDisabled ? 0.6 : 1,
                height: "45px", // updated height
                fontSize: "clamp(12px, 1.2vw, 15px)", // ✅ responsive font size
                display:
                  staffType === 0 &&
                    (tab.key === "discount" || tab.key === "markpaid")
                    ? "none"
                    : "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: "0 6px", // added padding for tighter fit
                width: "100%", // Let it wrap equally
                // ⛔ restricts too wide on larger screens
                textAlign: "center",
                whiteSpace: "normal", // ✅ allows text to wrap
                lineHeight: "1.2", // tighter line height
              }}
            >
              <div
                style={{
                  fontSize: "clamp(12px, 1.2vw, 15px)",
                  marginRight: "6px",
                  display: "flex",
                  alignItems: "center",
                }}
              >
                {tab.icon}
              </div>
              <div style={{ wordBreak: "break-word" }}>{tab.label}</div>
            </div>
          );
        })}
      </div>
      {/* Main Content Area */}
      <div style={sidebarStyles.contentArea}>
        {renderTabContent()}

        {/* Summary Section */}
        {activeTab === "items" && orderItems.length > 0 && (
          <>
            <div style={sidebarStyles.summarySection}>
              <div
                className="d-flex justify-content-between"
                style={sidebarStyles.summaryRow}
              >
                <span>Items({orderItems.length})</span>
                <span>₹ {calculateSubtotal().toFixed(2)}</span>
              </div>
              {discountValue > 0 && (
                <div
                  className="d-flex justify-content-between"
                  style={sidebarStyles.summaryRow}
                >
                  <span>
                    Discount{" "}
                    {discountMode == 0 ? "(" + discountValue + "%)" : ""}
                  </span>
                  <span>-₹{calculateDiscount().toFixed(2)}</span>
                </div>
              )}
              {serviceChargeDetails && serviceChargeDetails.name && (
                <div
                  className="d-flex align-items-center"
                  style={sidebarStyles.summaryRow}
                >
                  <span>{serviceChargeDetails.name}</span>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="1"
                    value={
                      serviceChargeDetails &&
                        serviceChargeDetails.percentage != null
                        ? serviceChargeDetails.percentage
                        : 0
                    }
                    onChange={(e) => {
                      let val = e.target.value;
                      // Remove leading zeros
                      val = val.replace(/^0+(?!\.|$)/, "");
                      // If empty after removing zeros, set to 0
                      if (val === "" || val === null) {
                        setServiceChargeDetails({
                          ...serviceChargeDetails,
                          percentage: 0,
                        });
                        return;
                      }
                      // If starts with '.', prefix with 0
                      if (val.startsWith(".")) {
                        val = "0" + val;
                      }
                      // Allow only up to 2 digits after decimal
                      if (val.includes(".")) {
                        const [intPart, decPart] = val.split(".");
                        val = intPart + "." + decPart.slice(0, 2);
                      }
                      const num = parseFloat(val);
                      if (!isNaN(num) && num >= 0 && num <= 100) {
                        setServiceChargeDetails({
                          ...serviceChargeDetails,
                          percentage: val,
                        });
                      }
                    }}
                    className="form-control mx-2"
                    style={sidebarStyles.schInput}
                    disabled={staffType === 0} // <-- yaha condition add kar di
                  />

                  {/* <input
                    type="number"
                    min="0"
                    max="100"
                    step="1"
                    value={
                      serviceChargeDetails &&
                        serviceChargeDetails.percentage != null
                        ? serviceChargeDetails.percentage
                        : 0
                    }
                    onChange={(e) => {
                      let val = e.target.value;
                      // Remove leading zeros
                      val = val.replace(/^0+(?!\.|$)/, "");
                      // If empty after removing zeros, set to 0
                      if (val === "" || val === null) {
                        setServiceChargeDetails({
                          ...serviceChargeDetails,
                          percentage: 0,
                        });
                        return;
                      }
                      // If starts with '.', prefix with 0
                      if (val.startsWith(".")) {
                        val = "0" + val;
                      }
                      // Allow only up to 2 digits after decimal
                      if (val.includes(".")) {
                        const [intPart, decPart] = val.split(".");
                        val = intPart + "." + decPart.slice(0, 2);
                      }
                      const num = parseFloat(val);
                      if (!isNaN(num) && num >= 0 && num <= 100) {
                        setServiceChargeDetails({
                          ...serviceChargeDetails,
                          percentage: val,
                        });
                      }
                    }}
                    className="form-control mx-2"
                    style={sidebarStyles.schInput}
                  /> */}
                  <span>%</span>
                  <span style={{ marginLeft: "auto" }}>
                    ₹{calculateServiceChargeAmount().toFixed(2)}
                  </span>
                </div>
              )}
              {Object.keys({ ...cgstMap, ...sgstMap })
                .sort((a, b) => parseFloat(a) - parseFloat(b))
                .map((rate) => (
                  <React.Fragment key={rate}>
                    {cgstMap[rate] !== undefined && (
                      <div
                        className="d-flex align-items-center"
                        style={sidebarStyles.summaryRow}
                      >
                        <span>CGST @{rate}%</span>
                        <span style={{ marginLeft: "auto" }}>
                          ₹{(Number(cgstMap[rate]) || 0).toFixed(2)}
                        </span>
                      </div>
                    )}
                    {sgstMap[rate] !== undefined && (
                      <div
                        className="d-flex align-items-center"
                        style={sidebarStyles.summaryRow}
                      >
                        <span>SGST @{rate}%</span>
                        <span style={{ marginLeft: "auto" }}>
                          ₹{(Number(sgstMap[rate]) || 0).toFixed(2)}
                        </span>
                      </div>
                    )}{" "}
                  </React.Fragment>
                ))}

              {(orderMode === "DELIVERY" || orderMode === "COUNTER") && (
                <div
                  className="d-flex align-items-center"
                  style={sidebarStyles.summaryRow}
                >
                  {" "}
                  <span>Packaging Charges</span>
                  <span style={{ marginLeft: "auto" }}>
                    ₹{isNC ? "0.00" : totalPackagingCharges.toFixed(2)}
                  </span>
                </div>
              )}

              {roundOffValue ? (
                <>
                  <div
                    className="d-flex align-items-center"
                    style={sidebarStyles.summaryRow}
                  >
                    {" "}
                    <span>Round off</span>
                    <span style={{ marginLeft: "auto" }}>
                      <span>₹{roundOffValue.toFixed(2)}</span>
                    </span>
                  </div>
                </>
              ) : (
                <></>
              )}

              <div
                className="d-flex justify-content-between align-items-center"
                style={sidebarStyles.totalRow}
              >
                {/* <span>Total</span>
              <span>₹{total.toFixed(2)}</span> */}
                <span>Total</span>
                <span>₹{(Math.abs(total + roundOffValue).toFixed(2))}</span>
              </div>
            </div>

            {/* Action Buttons below Total for Items tab only */}
            {["DELIVERY", "COUNTER"].includes(orderMode) ? (
              <div className="d-flex w-100">
                {" "}
                <button
                  className="btn"
                  style={{
                    ...sidebarStyles.actionButton,
                    background: "#22c55e",
                    height: "45px",
                    fontSize: "13px",
                    borderRight: "1px solid #fff",
                    borderRadius: 0,
                    width: "50%",
                  }}
                  onClick={() => {
                    // Prevent changes after order is generated for delivery/counter modes
                    if (
                      orderNo &&
                      (orderMode === "DELIVERY" || orderMode === "COUNTER")
                    ) {
                      Toaster.error("Can't change after order is generated");
                      return;
                    }
                    handleSaveBill();
                  }}
                  disabled={isSavingKOT || isSavingBill}
                >
                  SAVE BILL
                </button>
                <button
                  className="btn"
                  style={{
                    ...sidebarStyles.actionButton,
                    background: "#22c55e",
                    height: "45px",
                    fontSize: "13px",
                    borderRadius: 0,
                    width: "50%",
                  }}
                  onClick={() => {
                    console.log(orderNo, orderMode);
                    // Prevent changes after order is generated for delivery/counter modes
                    if (
                      orderNo &&
                      (orderMode === "DELIVERY" || orderMode === "COUNTER")
                    ) {
                      Toaster.error("Can't change after order is generated");
                      return;
                    }
                    // Prevent multiple rapid clicks
                    if (isPrintingKOT || isSavingKOT || isSavingBill) {
                      return;
                    }
                    handlePrintKOT();
                  }}
                  disabled={isSavingKOT || isSavingBill || isPrintingKOT}
                >
                  {isPrintingKOT ? "Processing..." : "PRINT BILL"}
                </button>
                {/* <button
  className="btn"
  style={{
    ...sidebarStyles.actionButton,
    background: "#22c55e",
    height: "45px",
    fontSize: "13px",
    borderRadius: 0,
    width: "50%",
  }}
  onClick={async () => {
    if (isPrintingKOT || isSavingKOT || isSavingBill) return;

    try {
      // 1️⃣ DELIVERY mode validations
      if (orderMode === "DELIVERY") {
        if (!customerPhone || customerPhone.length !== 10) {
          setActiveTab && setActiveTab("details");
          Toaster.error("Please enter a valid 10-digit mobile number");
          return;
        }
        if (!customerDetails.name?.trim()) {
          setActiveTab && setActiveTab("details");
          Toaster.error("Please enter customer name");
          return;
        }
        if (!customerDetails.address?.trim()) {
          setActiveTab && setActiveTab("details");
          Toaster.error("Please enter address");
          return;
        }
        if (!deliveryGuyId) {
          setActiveTab && setActiveTab("details");
          Toaster.error("Please select a delivery guy");
          return;
        }
      }

      // 2️⃣ KOT check
      const itemsToSend = orderItems.filter(item => !item.isKOT);

      if (itemsToSend.length > 0) {
        await handleSaveKOT(); // save only
      }
      await printKOTOnly(orderItems); // print only

      // 3️⃣ Bill save + print
      await handleSaveBill();
      if (invoiceNumber) {
        await handlePrintBill(invoiceNumber);
      } else {
        Toaster.error("Invoice number missing, can't print bill");
      }

      setActiveTab("markpaid")

      // ✅ Single refresh at end
      await refreshTableItems();

    } catch (err) {
      console.error("Error printing KOT & Bill:", err);
      Toaster.error("Failed to print KOT & Bill");
    }
  }}
  disabled={isSavingKOT || isSavingBill || isPrintingKOT}
>
  {isPrintingKOT ? "Processing..." : "PRINT KOT & BILL"}
</button> */}
              </div>
            ) : (
              <div className="d-flex w-100 ">
                <button
                  className="btn"
                  style={{
                    ...sidebarStyles.actionButton,
                    height: "43px",
                    fontSize: "11px",
                    fontWeight: "700",
                    backgroundColor: "#10b981",
                    color: "#fff",
                  }}
                  onClick={() => {
                    if (orderNo) {
                      handleSaveBill();
                    } else {
                      handleSaveKOT();
                    }
                  }}
                  disabled={isSavingKOT || isSavingBill}
                >
                  {isSavingKOT ? "Saving..." : "SAVE KOT"}
                </button>{" "}
                <button
                  className="btn"
                  style={{
                    ...sidebarStyles.actionButton,
                    height: "43px",
                    fontSize: "11px",
                    fontWeight: "700",
                    backgroundColor: "#4b5563",
                  }}
                  onClick={() => {
                    if (
                      orderNo &&
                      (orderMode === "DELIVERY" || orderMode === "COUNTER")
                    ) {
                      Toaster.error("Can't change after order is generated");
                      return;
                    }

                    if (isPrintingKOT || isSavingKOT || isSavingBill) {
                      return;
                    }
                    if (orderNo) {
                      handlePrintKOTAndSaveBill();

                    } else {
                      handlePrintKOT();

                    }
                  }}
                  disabled={isSavingKOT || isSavingBill || isPrintingKOT}
                >
                  {isPrintingKOT ? "Printing..." : "PRINT KOT"}{ }
                </button>
                <button
                  className="btn"
                  style={{
                    ...sidebarStyles.actionButton,
                    background: "#00bf63",
                    height: "43px",
                    fontSize: "11px",
                    fontWeight: "700",
                    display: staffType === 0 ? "none" : "flex",
                  }}
                  onClick={() => {
                    if (
                      orderNo &&
                      (orderMode === "DELIVERY" || orderMode === "COUNTER")
                    ) {
                      Toaster.error("Can't change after order is generated");
                      return;
                    }
                    handleSaveBill();
                  }}
                  disabled={isSavingKOT || isSavingBill}
                >
                  {isSavingBill ? "Saving..." : "SAVE BILL"}
                </button>
                <button
                  className="btn"
                  style={{
                    ...sidebarStyles.actionButton,
                    background: "#4b5563",

                    height: "43px",
                    fontSize: "11px",
                    fontWeight: "700",
                    display: staffType === 0 ? "none" : "flex",
                  }}
                  onClick={() => handlePrintBill(invoiceNumber)}
                >
                  PRINT BILL
                </button>
              </div>
            )}
          </>
        )}
      </div>
      {/* Action Buttons */}
      {/* Removed global action buttons block */}
    </div>
  );
};

// Sub-component for order item rendering
const OrderItem = ({
  item,
  idx,
  onUpdateQuantity,
  onRemoveItem,
  handlePlusClickAfterKOT,
  handleMinusClickAfterKOT,
  handleKOTItemDelete,
  showDeleteConfirmation,
  kotitemsdelete,
  appPermission,
  staffType,
  showDeleteButton,
  orderMode,
  orderNo
}) => (
  <div
    className="d-flex align-items-center justify-content-between px-3 py-2 border-bottom"
    style={{ gap: "12px" }}
  >
    {/* LEFT: Item Info */}
    <div className="flex-grow-1">
      <div
        style={{ fontSize: "13px", fontWeight: "600", marginBottom: "-4px" }}
      >
        {item.name || ""}

        {(item.note?.trim() || item.product_special_note?.trim()) && (
          <Tooltip
            title={item.note?.trim() || item.product_special_note?.trim()}
            placement="top"
          >
            <i
              className="bi bi-info-circle ms-2"
              style={{ cursor: "pointer", fontSize: 14 }}
            ></i>
          </Tooltip>
        )}
      </div>
      {/* {item.variant && (
        <div
          className="text-muted"
          style={{ fontSize: "13px", marginTop: "2px" }}
        >
          <strong>Size:</strong>{" "}
          {item.variant.combination_details
            ?.map((cd) => cd.attribute_value_name)
            .join(" ")}
        </div>
      )} */}

      {item.selectedvariants && (
        <>
          {item.selectedvariants.combination_details &&
            item.selectedvariants.combination_details.map((i) => (
              <>
                <br />
                <b>{i.attribute_name}: </b> {i.attribute_value_name}{" "}
              </>
            ))}
        </>
      )}

      {item.addons?.length > 0 && (
        <div className="mt-1" style={{ fontSize: "13px" }}>
          {item.addons.map((addon, i) => (
            <div key={addon.addonItemId || i} className="text-muted ms-2">
              + {addon.addon_item_name}
            </div>
          ))}
        </div>
      )}
    </div>

    {/* MIDDLE: Quantity Controls */}
    <div className="d-flex align-items-center" style={{ gap: "8px" }}>
      {/* <div className="d-flex align-items-center" style={{ gap: "4px" }}>
        <button
          className="btn btn-light border"
          style={{
            width: "25px",
            height: "25px",
            fontSize: "10px",
            padding: 0,
            borderRadius: "0px",
          }}
          onClick={() =>
            item.isKOT
              ? handleMinusClickAfterKOT(item.id, item.local_id)
              : item.quantity > 1 &&
                onUpdateQuantity &&
                onUpdateQuantity(
                  item.id,
                  item.local_id,
                  item.table_id,
                  item.quantity - 1
                )
          }
          disabled={(() => {
            const minQty = Number(item.min_order_quantity);
            const minOrderQty = !isNaN(minQty) && minQty > 0 ? minQty : 1;
            return item.quantity <= minOrderQty;
          })()}
        >
          <FaMinus />
        </button>

        <div
          className="border"
          style={{
            width: "25px",
            height: "25px",
            fontWeight: 600,
            fontSize: "12px",
            backgroundColor: "#fff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: "0px",
          }}
        >
          {item.quantity}
        </div>

        <button
          className="btn btn-light border"
          style={{
            width: "25px",
            height: "25px",
            fontSize: "10px",
            padding: 0,
            borderRadius: "0px",
          }}
          onClick={() =>
            item.isKOT
              ? handlePlusClickAfterKOT(item.id, item.local_id)
              : onUpdateQuantity &&
                onUpdateQuantity(
                  item.id,
                  item.local_id,
                  item.table_id,
                  item.quantity + 1
                )
          }
        >
          <FaPlus />
        </button>
      </div> */}
      {/* <div className="d-flex align-items-center" style={{ gap: "4px" }}>
        <button
          className="btn btn-light border"
          style={{
            width: "25px",
            height: "25px",
            fontSize: "10px",
            padding: 0,
            borderRadius: "0px",
          }}
          onClick={() =>
            item.isKOT
              ? handleMinusClickAfterKOT(item.id, item.local_id)
              : item.quantity > 1 &&
              onUpdateQuantity &&
              onUpdateQuantity(
                item.id,
                item.local_id,
                item.table_id,
                item.quantity - 1
              )
          }
          disabled={(() => {
            const minQty = Number(item.min_order_quantity);
            const minOrderQty = !isNaN(minQty) && minQty > 0 ? minQty : 1;

            const isDisabled =
              item.isKOT &&
              (
                (staffType === 1 && kotitemsdelete !== 1) ||
                (staffType === 0 &&
                  (kotitemsdelete !== 1 ||
                    !Array.isArray(appPermission) ||
                    !appPermission.includes("can_delete_kot_item")))
              );

            return item.quantity <= minOrderQty || isDisabled;
          })()}
        >
          <FaMinus />
        </button>

        <div
          className="border"
          style={{
            width: "25px",
            height: "25px",
            fontWeight: 600,
            fontSize: "12px",
            backgroundColor: "#fff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: "0px",
          }}
        >
          {item.quantity}
        </div>

        <button
          className="btn btn-light border"
          style={{
            width: "25px",
            height: "25px",
            fontSize: "10px",
            padding: 0,
            borderRadius: "0px",
          }}
          onClick={() =>
            item.isKOT
              ? handlePlusClickAfterKOT(item.id, item.local_id)
              : onUpdateQuantity &&
              onUpdateQuantity(
                item.id,
                item.local_id,
                item.table_id,
                item.quantity + 1
              )
          }
          disabled={
            item.isKOT &&
            (
              (staffType === 1 && kotitemsdelete !== 1) ||
              (staffType === 0 &&
                (kotitemsdelete !== 1 ||
                  !Array.isArray(appPermission) ||
                  !appPermission.includes("can_delete_kot_item")))
            )
          }
        >
          <FaPlus />
        </button>
      </div> */}
      <div className="d-flex align-items-center" style={{ gap: "4px" }}>
        <button
          className="btn btn-light border"
          style={{
            width: "25px",
            height: "25px",
            fontSize: "10px",
            padding: 0,
            borderRadius: "0px",
          }}
          onClick={() =>
            item.isKOT
              ? handleMinusClickAfterKOT(item.id, item.local_id)
              : item.quantity > 1 &&
              onUpdateQuantity &&
              onUpdateQuantity(
                item.id,
                item.local_id,
                item.table_id,
                item.quantity - 1
              )
          }
          disabled={
            (item.isKOT && (staffType === 0 || staffType === 1)) || // disable for KOT items with staffType 0 or 1
            (() => {
              const minQty = Number(item.min_order_quantity);
              const minOrderQty = !isNaN(minQty) && minQty > 0 ? minQty : 1;

              const isDisabled =
                item.isKOT &&
                ((staffType === 1 && kotitemsdelete !== 1) ||
                  (staffType === 0 &&
                    (kotitemsdelete !== 1 ||
                      !Array.isArray(appPermission) ||
                      !appPermission.includes("can_delete_kot_item"))));

              return item.quantity <= minOrderQty || isDisabled;
            })()
          }
        >
          <FaMinus />
        </button>

        <div
          className="border"
          style={{
            width: "25px",
            height: "25px",
            fontWeight: 600,
            fontSize: "12px",
            backgroundColor: "#fff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: "0px",
          }}
        >
          {item.quantity}
        </div>

        <button
          className="btn btn-light border"
          style={{
            width: "25px",
            height: "25px",
            fontSize: "10px",
            padding: 0,
            borderRadius: "0px",
          }}
          onClick={() =>
            item.isKOT
              ? handlePlusClickAfterKOT(item.id, item.local_id)
              : onUpdateQuantity &&
              onUpdateQuantity(
                item.id,
                item.local_id,
                item.table_id,
                item.quantity + 1
              )
          }
          disabled={
            (item.isKOT && (staffType === 0 || staffType === 1)) || // disable for KOT items with staffType 0 or 1
            (item.isKOT &&
              ((staffType === 1 && kotitemsdelete !== 1) ||
                (staffType === 0 &&
                  (kotitemsdelete !== 1 ||
                    !Array.isArray(appPermission) ||
                    !appPermission.includes("can_delete_kot_item")))))
          }
        >
          <FaPlus />
        </button>
      </div>
    </div>

    {/* RIGHT: Price */}
    <span
      className="fw-semibold text-end"
      style={{ minWidth: "80px", fontSize: "15px" }}
    >
      ₹ {(Number(item.price) * Number(item.quantity)).toFixed(2)}
    </span>

    {/* DELETE: Red Trash Icon */}
    {/* { kotitemsdelete === 1 && (
      <button
        className="btn btn-danger d-flex align-items-center justify-content-center"
        style={{
          width: "25px",
          height: "25px",
          fontSize: "12px",
          padding: 0,
          marginLeft: "8px",
          borderRadius: "3px",
        }}
      onClick={() => {
      // alert(kotitemsdelete); // ✅ Show alert on click
      
      if (item.isKOT) {
        showDeleteConfirmation(item);
      } else if (onRemoveItem) {
        onRemoveItem(item.id, item.local_id, item.table_id, item.KOT_id);
      }
    }}
      >
      
        <FaTrash />
      </button>
 )} */}
    {/* {((staffType === 1 && kotitemsdelete === 1) || showDeleteButton === 1) && (
      <button
        className="btn btn-danger d-flex align-items-center justify-content-center"
        style={{
          width: "25px",
          height: "25px",
          fontSize: "12px",
          padding: 0,
          marginLeft: "8px",
          borderRadius: "3px",
        }}
        onClick={() => {
          if (item.isKOT) {
            showDeleteConfirmation(item);
          } else if (onRemoveItem) {
            onRemoveItem(item.id, item.local_id, item.table_id, item.KOT_id);
          }
        }}
      >
        <FaTrash />
      </button>
    )} */}
    {((staffType === 1 && kotitemsdelete === 1) || showDeleteButton === 1) &&
      !((orderMode === "DELIVERY" || orderMode === "COUNTER") && orderNo) && (
        <button
          className="btn btn-danger d-flex align-items-center justify-content-center"
          style={{
            width: "25px",
            height: "25px",
            fontSize: "12px",
            padding: 0,
            marginLeft: "8px",
            borderRadius: "3px",
          }}
          onClick={() => {
            if (item.isKOT) {
              showDeleteConfirmation(item);
            } else if (onRemoveItem) {
              onRemoveItem(item.id, item.local_id, item.table_id, item.KOT_id);
            }
          }}
        >
          <FaTrash />
        </button>
      )}

  </div>
);

const sidebarStyles = {
  container: {
    width: "25.8%",
    height: "100vh",
    position: "fixed",
    right: 0,
    top: 0,
    display: "flex",
    flexDirection: "column",
    borderLeft: "1px solid #eee",
    boxShadow: "0 0 16px rgba(0,0,0,0.08)",
    zIndex: 1050,
  },
  header: {
    borderBottom: "1px solid #eee",
  },
  dineType: {
    fontWeight: 600,
    fontSize: "1.2rem",
  },
  orderNo: {
    fontSize: "0.9rem",
    fontWeight: 400,
  },
  dateTime: {
    fontSize: "0.9rem",
    color: "#222",
  },
  tableBadge: {
    background: "#10b981",
    color: "#fff",
    borderRadius: "12px",
    fontWeight: 600,
    minWidth: "36px",
    textAlign: "center",
    fontSize: "1rem",
    padding: "2px 12px",
  },
  floorName: {
    color: "#10b981",
    fontWeight: 600,
    fontSize: "1rem",
  },
  tabBar: {
    borderBottom: "1px solid #e0e0e0",
  },
  tab: {
    flex: 1,
    cursor: "pointer",
    fontWeight: 500,
    fontSize: "0.9rem",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: "8px 0",
    transition: "background 0.2s",
  },
  tabIcon: {
    fontSize: "1.2rem",
    marginBottom: "2px",
  },
  kotWarning: {
    color: "#dc2626",
    fontWeight: 500,
    fontSize: "0.9rem",
    padding: "8px 16px",
    borderBottom: "1px solid #eee",
  },
  kotInfo: {
    borderBottom: "1px solid #eee",
  },
  kotNo: {
    fontWeight: 600,
    fontSize: "1.1rem",
    color: "#222",
  },
  kotTime: {
    fontWeight: 500,
    fontSize: "1.1rem",
    color: "#222",
  },
  contentArea: {
    flex: 1,
    overflow: "hidden",
    display: "flex",
    flexDirection: "column",
  },
  summarySection: {
    padding: "8px 12px 8px 12px",
    borderTop: "1px solid #eee",
    marginTop: "auto",
  },
  summaryRow: {
    fontSize: "0.95rem",
    marginBottom: 2,
  },
  schInput: {
    width: "70px",
    display: "inline-block",
    height: 28,
    fontSize: "0.95rem",
    padding: "2px 6px",
  },
  totalRow: {
    fontWeight: 700,
    fontSize: "1.15rem",
    marginTop: 6,
    borderTop: "2px solid #eee",
    paddingTop: 4,
  },
  actionButton: {
    flex: 1,
    background: "#2563eb",
    color: "#fff",
    borderRadius: 0,
    fontWeight: 600,
    fontSize: "0.9rem",
    padding: "12px",
  },
};

export default OrderSidebar;

