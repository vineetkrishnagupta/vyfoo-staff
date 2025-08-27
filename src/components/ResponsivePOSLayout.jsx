import React, { useState, useEffect, useRef } from "react";
import axiosInstance from "../utlis/axiosinstance";
import { FaMoneyBillAlt } from "react-icons/fa";

import Toaster from "../utlis/Toaster";
import {
  AllProduct,
  PassCodeAPI,
  SetledAndUnsetledAmount,
  ReportsDataAPI,
  VoidBillAPI,
  GetOrderItemsSpilitBill,
  SaveSplitBillPost,
  PostSplitBill,
  SplitBillPaid,
  GET_EATER_DETAILS,
  CancelSplitBill,
  PostPartialPaymentForDineIn
} from "../BaseURL/baseURL";
import {
  FaEye,
  FaClone,
  FaSearch,
  FaReceipt,
  FaPrint,
  FaMoneyCheckAlt,
  FaExchangeAlt,
  FaTrashAlt,
} from "react-icons/fa";
import { TiArrowRepeat } from "react-icons/ti";
import { Modal, Button, Form, Spinner } from "react-bootstrap";
import "bootstrap/dist/css/bootstrap.min.css";
import { switchTable } from "../utlis/switchTable";
import { useSocketContext } from "../SocketContext";
import { useAuth } from "../AuthContext";
import { getAppDataFromDB, saveAppDataToDB } from "../utlis/indexedDB";
import { IoClose } from "react-icons/io5";
import { Link } from "react-router-dom";

// LegendDot for table status
const LegendDot = ({ color, label }) => (
  <div className="d-flex align-items-center gap-1">
    <div
      className="rounded"
      style={{
        width: "12px",
        height: "12px",
        backgroundColor: color,

      }}
    ></div>
    <span>{label}</span>
  </div>
);


const ResponsivePOSLayout = ({
  currentView,
  setCurrentView,
  selectedCategory,
  setSelectedCategory,
  selectedTable,
  onTableClick,
  onAddToOrder,
  onRequestTableModal,
  onWaiterDetails,
  onStaffLogin,
  onStaffDetails,
  setServiceChargeDetails,
  onTblCategoryDetails,
  refreshProducts, // <-- add this prop
  setRefreshProducts, // <-- add this prop
  setFullLoader,
  orderItems,
  setOrderItems,
  setDiscountValue,
  discountValue,
  setDiscountMode,
  discountMode,
  setOrderNo,
  customerDetails,
  setCustomerDetails,
  showPasscodeModal,
  setShowPasscodeModal,
  onPasscodeSuccess,
  orderMode,
  setCurrentMode,
  setWaiterDetails,
  setSelectedTable,
  orderId,
  handleFetchAllProducts,
  splitBillModalTrigger,
  onOrderIdChange,
  setResetTabToItems,
  setActiveTabToItems,
  tblCategoryDetails,
  setTblCategoryDetails,
  // showSettlePaidModal,
  // setShowSettlePaidModal,
  isNC,
  setIsNC,
  total,
  searchTerm,
  setSearchTerm,
  invoiceNumber,
  setInvoiceNumber,
  tablenotoprint,
  setTablenotoprint

}) => {
  const [paymentMethodsToShow, setPaymentMethodsToShow] = useState([
    "Cash",
    "Card",
    "NEFT",
    "UPI",
    "Zomato",
    "Swiggy",
    "Dineout",
    "Hold",
  ]);

  const [currentPayment, setCurrentPayment] = useState({
    method: "Cash",
    amount: "",
    tip: "",
    upiSubMethod: "",
    transactionId: "",
  });
  const [isEditing, setIsEditing] = useState(false);
  const [hoveredTableId, setHoveredTableId] = useState(null);
  const [previousPaymentMethod, setPreviousPaymentMethod] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [showOrderDetails, setShowOrderDetails] = useState(false);
  const [reason, setReason] = useState("");
  const [payClicked, setPayClicked] = useState(false);
  const [canCreateNewBill, setCanCreateNewBill] = useState(true);
  const [lastSavedBillNo, setLastSavedBillNo] = useState(null);
  const [showSettlePasscodeModal, setShowSettlePasscodeModal] = useState(false);
  const [settlePasscode, setSettlePasscode] = useState("");
  const [settleLoading, setSettleLoading] = useState(false);
  const [showMarkPaidModal, setShowMarkPaidModal] = useState(false);
  const [paymentMode, setPaymentMode] = useState("Cash");
  const [tipAmount, setTipAmount] = useState(0);
  const [transactionId, setTransactionId] = useState("");
  const [activeTab, setActiveTab] = useState("items");
  const [schValue, setSchValue] = useState({ name: "", percentage: 0 });
  const [splitbilldiscountType, setSplitbilldiscountType] = useState(0); // ✅ okay to define
  const [splitbilldiscountvalue, setSplitbilldiscountvalue] = useState(0);


  // State to track print intent after passcode
  const [pendingPrint, setPendingPrint] = useState(false);

  const [splitOrderNo, setSplitOrderNo] = useState(null);
  const [splitOrderId, setSplitOrderId] = useState(null);
  const [billItems, setBillItems] = useState([]);
  const [showSplitBillPasscodeModal, setShowSplitBillPasscodeModal] =
    useState(false);
  const [splitBillPasscode, setSplitBillPasscode] = useState("");
  const [splitBillLoading, setSplitBillLoading] = useState(false);
  const [splitBillItems, setSplitBillItems] = useState([]);
  const [splitBillLoadingData, setSplitBillLoadingData] = useState(false);
  const [lastsplitbillno, setLastsplitbillno] = useState(null);
  const [isSplitBillPending, setIsSplitBillPending] = useState(false);

  const [menuCategories, setMenuCategories] = useState([]);
  console.log(menuCategories, "menucategory")
  const [menusDB, setMenusDB] = useState([]);

  // TablesGrid state
  const [loadingTables, setLoadingTables] = useState(true);
  const [errorTables, setErrorTables] = useState(null);
  // MenuGrid state
  // const [searchTerm, setSearchTerm] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [modalProduct, setModalProduct] = useState(null);
  console.log(modalProduct, "menuPRoduct123");
  const [modalQuantity, setModalQuantity] = useState(1);
  const [modalNote, setModalNote] = useState("");
  const [selectedDrinks, setSelectedDrinks] = useState([]);
  const [products, setProducts] = useState([]);
  console.log(products, "products")
  const [loadingMenu, setLoadingMenu] = useState(true);
  const [errorMenu, setErrorMenu] = useState(null);
  const [tableModalOpen, setTableModalOpen] = useState(false);
  const [enteredPasscode, setEnteredPasscode] = useState("");
  const [pendingTable, setPendingTable] = useState(null);
  const [passcodeLoading, setPasscodeLoading] = useState(false);
  const [staffDetails, setStaffDetails] = useState(null);
  // const [serviceChargeDetails, ] = useState({ name: '', percentage: 0});
  const [settledData, setSettledData] = useState({ settled: 0, unsettled: 0 });
  const [reportData, setReportData] = useState(null);
  // Add state for discountMode
  // const [discountMode, setDiscountMode] = useState(0);
  const [serviceChargeDetails] = useState(null);

  const [showVoidBillModal, setShowVoidBillModal] = useState(false);
  const [voidBillTable, setVoidBillTable] = useState(null);
  const [voidBillPasscode, setVoidBillPasscode] = useState("");
  const [voidBillLoading, setVoidBillLoading] = useState(false);

  // --- Variant Attribute Group Extraction and Selection State ---
  const [selectedAttributes, setSelectedAttributes] = useState({});
  const [showSplitBillModal, setShowSplitBillModal] = useState(false);
  const billEndRef = useRef(null);
  const [savedBills, setSavedBills] = useState([]); // To store all saved bills
  const [selectedBill, setSelectedBill] = useState(null); // To track currently selected bill
  const [currentBillNumber, setCurrentBillNumber] = useState(1);
  const [paymentMethod, setPaymentMethod] = useState("Cash");
  const [paidAmount, setPaidAmount] = useState("");
  const [isBillPaid, setIsBillPaid] = useState(false);
  const [showPaymentTable, setShowPaymentTable] = useState(false);

  const [paymentEntries, setPaymentEntries] = useState([]);
  const [showSettlePaidModal, setShowSettlePaidModal] = useState(false);
  const [settleBillData, setSettleBillData] = useState(null);
  const [staffType, setStaffType] = useState(null);
  const [ordernumber, setOrderNumber] = useState("");

  const [settleBillCalculations, setSettleBillCalculations] = useState({
    subtotal: 0,
    discount: 0,
    serviceCharge: 0,
    tax: 0,
    total: 0,
    roundOff: 0,
  });

  // Ref to track previous split bill trigger count
  const prevSplitBillCountRef = useRef(0);

  const totalPaid = paymentEntries.reduce(
    (sum, entry) => sum + Number(entry.amount) + Number(entry.tip || 0),
    0
  );
  const dueAmount = (total - totalPaid).toFixed(2);

  const isBillSaved = !!selectedBill;

  // const handleSettleBillPayment = async () => {
  //   if (!settleBillData || !settleBillData.kot_details || settleBillData.kot_details.length === 0) {
  //     Toaster.error("No bill data available");
  //     return;
  //   }

  //   setFullLoader(true);
  //   try {
  //     const firstItem = settleBillData.kot_details[0];
  //     const orderId = firstItem.orderId;

  //     if (!orderId) {
  //       Toaster.error("Order ID not found");
  //       return;
  //     }

  //     const paymentDetails = paymentEntries.map(entry => ({
  //       method: entry.method,
  //       amount: entry.amount,
  //       tip: entry.tip || 0,
  //       upiType: entry.upiSubMethod || '',
  //       note: entry.note || '',
  //       transaction_id: entry.transactionId || '',
  //     }));

  //     const totalPaid = paymentEntries.reduce((sum, entry) => sum + parseFloat(entry.amount || 0), 0);
  //     const totalTip = paymentEntries.reduce((sum, entry) => sum + parseFloat(entry.tip || 0), 0);
  //     const dueAmount = (settleBillCalculations.total - totalPaid).toFixed(2);

  //     const payload = {
  //       id: orderId,
  //       subtotal: settleBillCalculations.subtotal.toFixed(2),
  //       discount_type: firstItem.discount_type || 0,
  //       discount_rate: firstItem.discount_value || "0",
  //       discount_value: settleBillCalculations.discount.toFixed(2),
  //       payment_details: paymentDetails,
  //       due_amount: dueAmount,
  //       service_charge: firstItem.order_service_charge?.percentage || 0,
  //       service_charge_details: firstItem.order_service_charge || { name: "SCH", percentage: 0 },
  //       tax_amount: settleBillCalculations.tax.toFixed(2),
  //       tax_details: [], // Will be calculated on backend
  //       paided_amount: totalPaid.toFixed(2),
  //       total: settleBillCalculations.total.toFixed(2),
  //       payment_status: dueAmount <= 0 ? 1 : 2, // 1 = fully paid, 2 = partially paid
  //       round_up_amount: Number(settleBillCalculations.roundOff),
  //       item: settleBillData.kot_details.map(item => ({
  //         product_id: item.id,
  //         product_name: item.name,
  //         quantity: item.quantity,
  //         price: item.price,
  //         withOutTaxPrice: item.withOutTaxPrice,
  //         withTaxPrice: item.withTaxPrice,
  //         packaging_charges: item.packaging_charges || 0,
  //         tax_percent: item.tax_percent,
  //         tax_type: item.tax_type,
  //         product_type: item.product_type || 0,
  //         dine_in_service: item.dine_in_service || 1,
  //         delivery_service: item.delivery_service || 1,
  //         pick_up_service: item.pick_up_service || 1,
  //         min_order_quantity: item.min_order_quantity || 1,
  //         fooder_id: item.fooder_id || 1,
  //         table_id: item.table_id,
  //         fooder_name: item.fooder_name || "Restaurant",
  //         product_special_note: item.product_special_note || "",
  //         isKOT: item.isKOT,
  //         isSaved: item.isSaved,
  //         KOT_id: item.KOT_id,
  //         KOT_no: item.KOT_no,
  //         KOT_time: item.KOT_time,
  //         selectedAddons: item.selectedAddons || [],
  //         selectedvariants: item.selectedvariants || {},
  //         variant_id: item.variant_id,
  //         addons: item.addons || [],
  //         attributes: item.attributes || [],
  //       })),
  //     };

  //     const response = await axiosInstance.post('/api/payment/partialpaymentfordinein', payload);

  //     if (response.data && response.data.status === 'success') {
  //       Toaster.success(response.data.message || 'Payment successful');
  //       setShowSettlePaidModal(false);
  //       setSettleBillData(null);
  //       setSettleBillCalculations({
  //         subtotal: 0,
  //         discount: 0,
  //         serviceCharge: 0,
  //         tax: 0,
  //         total: 0,
  //         roundOff: 0
  //       });
  //       setPaymentEntries([]);
  //       setCurrentPayment({ method: 'cash', amount: '', tip: '', upiSubMethod: '', transactionId: '' });
  //       setPaymentMethod('cash');

  //       // Refresh products after successful payment
  //       if (handleFetchAllProducts) {
  //         try {
  //           await handleFetchAllProducts();
  //         } catch (error) {
  //           console.error('Error refreshing products:', error);
  //         }
  //       }
  //     } else {
  //       Toaster.error(response.data?.message || 'Payment failed');
  //     }
  //   } catch (error) {
  //     console.error('Settle bill payment error:', error);
  //     Toaster.error(error?.response?.data?.message || 'Payment failed');
  //     setFullLoader(false);
  //   }
  // };

  // Function to clear order data after successful printing
  const clearOrderDataAfterPrint = () => {
    // Clear order items
    if (setOrderItems) {
      setOrderItems([]);
    }

    // Reset selected table
    if (setSelectedTable) {
      setSelectedTable(null);
    }

    // Reset customer details
    if (setCustomerDetails) {
      setCustomerDetails({
        name: "",
        mobile: "",
        address: "",
        eater_suggestions: "",
      });
    }

    // Reset discount
    if (setDiscountValue) {
      setDiscountValue(0);
    }

    // Reset order number
    if (setOrderNo) {
      setOrderNo(null);
    }

    // Reset order ID
    if (typeof onOrderIdChange === "function") {
      onOrderIdChange(null);
    }

    // Reset service charge details
    if (setServiceChargeDetails) {
      setServiceChargeDetails(null);
    }

    // Clear from localStorage if pendingTable exists
    if (pendingTable) {
      const tableId = pendingTable.id || pendingTable.table_id;
      if (tableId) {
        const existingOrderList =
          JSON.parse(localStorage.getItem("orderList")) || {};
        delete existingOrderList[tableId];
        localStorage.setItem("orderList", JSON.stringify(existingOrderList));
      }
    }

    // Trigger refresh of products/tables
    if (setRefreshProducts) {
      setRefreshProducts(Date.now());
    }

    // Reset to items tab
    if (typeof setResetTabToItems === "function") {
      setResetTabToItems(true);
    }

    if (typeof setActiveTabToItems === "function") {
      setActiveTabToItems();
    }
  };

  // Direct print bill function that works with backend data
  // const handleDirectPrintBill = async (
  //   kotDetails,
  //   customerDetails,
  //   tableInfo,
  //   serviceChargeDetails,
  //   isNC
  // ) => {
  //   try {
  //     // Check if there are any items to print
  //     if (!kotDetails || kotDetails.length === 0) {
  //       Toaster.error("No items found to print bill");
  //       return;
  //     }

  //     const appData = await getAppDataFromDB();
  //     const fooderData = appData || {};
  //     const enableSilentPrinting = Number(appData?.enable_silent_printing) || 0;

  //     // Calculate totals from backend data
  //     const subtotal = kotDetails.reduce(
  //       (sum, item) => sum + item.withOutTaxPrice * item.quantity,
  //       0
  //     );

  //     // Get discount from first item (all items should have same discount)
  //     const firstItem = kotDetails[0] || {};
  //     const discountValue = parseFloat(firstItem.discount_value) || 0;
  //     const discountMode = parseInt(firstItem.discount_type) || 0;

  //     const discountAmount =
  //       discountMode === 0
  //         ? (subtotal * discountValue) / 100
  //         : Math.min(discountValue, subtotal);
  //     const subtotalAfterDiscount = subtotal - discountAmount;

  //     // Calculate service charge
  //     const serviceChargePercentage = serviceChargeDetails?.percentage || 0;
  //     const serviceChargeAmount =
  //       (subtotalAfterDiscount * serviceChargePercentage) / 100;

  //     // Calculate taxes per item, then group by tax rate
  //     const taxMap = {};
  //     kotDetails.forEach((item) => {
  //       const rate = parseFloat(item.tax_percent) || 0;
  //       if (rate > 0) {
  //         // Proportional discount for this item
  //         const itemBase = item.withOutTaxPrice * item.quantity;
  //         const itemDiscount =
  //           subtotal > 0 ? (itemBase / subtotal) * discountAmount : 0;
  //         const itemPriceAfterDiscount = itemBase - itemDiscount;
  //         // Proportional service charge for this item
  //         let itemSCH = 0;
  //         if (serviceChargeDetails && serviceChargeDetails.percentage != null) {
  //           itemSCH =
  //             subtotalAfterDiscount > 0
  //               ? (itemPriceAfterDiscount / subtotalAfterDiscount) *
  //                 serviceChargeAmount
  //               : 0;
  //         }
  //         const taxBase = itemPriceAfterDiscount + itemSCH;
  //         const itemTax = (taxBase * rate) / 100;
  //         taxMap[rate] = (taxMap[rate] || 0) + itemTax;
  //       }
  //     });

  //     // Split each tax rate into CGST and SGST
  //     const taxDetails = Object.entries(taxMap).flatMap(([rate, amount]) => {
  //       const halfRate = parseFloat(rate) / 2;
  //       const halfAmount = amount / 2;
  //       return [
  //         { name: "CGST", percentage: halfRate, amount: halfAmount },
  //         { name: "SGST", percentage: halfRate, amount: halfAmount },
  //       ];
  //     });

  //     const totalTax = Object.values(taxMap).reduce((s, t) => s + t, 0);
  //     const raw = subtotalAfterDiscount + serviceChargeAmount + totalTax;
  //     const roundOffValue = Math.round(raw) - raw;
  //     const total = Math.round(raw);

  //     const now = new Date();
  //     const dateStr = now.toLocaleDateString("en-GB", {
  //       day: "2-digit",
  //       month: "short",
  //       year: "numeric",
  //     });
  //     const timeStr = now.toLocaleTimeString("en-US", {
  //       hour: "2-digit",
  //       minute: "2-digit",
  //       hour12: true,
  //     });

  //     const itemsText = kotDetails
  //       .map((item) => {
  //         const name = item.name || "Item";
  //         const qty = item.quantity;
  //         const rate = (parseFloat(item.price) || 0).toFixed(2);
  //         const amt = (qty * parseFloat(item.price || 0)).toFixed(2);
  //         return `${name}${" ".repeat(
  //           Math.max(10, 15 - name.length)
  //         )}${qty}${" ".repeat(3)}₹${rate}${" ".repeat(3)}₹${amt}`;
  //       })
  //       .join("\n");

  //     const taxText = taxDetails
  //       .map(
  //         (t) =>
  //           `${t.name}(${t.percentage}%)${" ".repeat(12)}₹${t.amount.toFixed(
  //             2
  //           )}`
  //       )
  //       .join("\n");

  //     const billData = `ESC @
  // ESC ! 0x08
  // ESC a 0x01
  // ${fooderData.fooder_name || "Lava Pub Restaurant Live"}
  // ESC ! 0x00
  // ESC a 0x00
  // ${fooderData.f_address || ""}, ${fooderData.f_city || ""}, ${
  //       fooderData.f_state || ""
  //     }, ${fooderData.f_zipcode || ""}
  // Phone: ${fooderData.f_landline || ""}
  // GST: ${fooderData.fooder_gstin || ""}

  // Name: ${customerDetails?.name || ""}
  // Date: ${dateStr}
  // Time: ${timeStr}
  // ${orderMode}
  // Table: #${tableInfo?.table_no || tableInfo?.table_name || ""}

  // ESC ! 0x08
  // Item${" ".repeat(10)}Qty${" ".repeat(3)}Rate${" ".repeat(3)}Amt
  // ESC ! 0x00
  // ================================
  // ${itemsText}
  // ================================

  // Subtotal${" ".repeat(15)}₹${subtotal.toFixed(2)}
  // ${
  //   discountValue > 0
  //     ? `Discount(${discountValue}%)${" ".repeat(8)}₹${discountAmount.toFixed(
  //         2
  //       )}`
  //     : ""
  // }
  // ${
  //   serviceChargeAmount > 0
  //     ? `SCH(${serviceChargePercentage}%)${" ".repeat(
  //         10
  //       )}₹${serviceChargeAmount.toFixed(2)}`
  //     : ""
  // }
  // ${taxText}
  // ${
  //   Math.abs(roundOffValue) > 0
  //     ? `Round off${" ".repeat(15)}₹${roundOffValue.toFixed(2)}`
  //     : ""
  // }
  // ================================
  // Total${" ".repeat(18)}₹${total.toFixed(2)}
  // ================================

  // FSSAI: ${fooderData.fssai_number || ""}
  // ${fooderData.billing_notes || ""}

  // ESC a 0x01
  // Thank you!
  // ESC a 0x00

  // ESC d 5
  // GS V 0x41 0x03`;

  //     // HTML bill for browser print
  //     const itemsRows = kotDetails
  //       .map((item) => {
  //         const name = item.name || "Item";
  //         const qty = item.quantity;
  //         const rate = (parseFloat(item.price) || 0).toFixed(2);
  //         const amt = (qty * parseFloat(item.price || 0)).toFixed(2);
  //         return `
  //         <tr>
  //           <td>${name}</td>
  //           <td class="text-center">${qty}</td>
  //           <td class="text-right">₹${rate}</td>
  //           <td class="text-right">₹${amt}</td>
  //         </tr>
  //       `;
  //       })
  //       .join("");

  //     const taxRows = taxDetails
  //       .map(
  //         (tax) => `
  //       <tr>
  //         <td colspan="3">${tax.name} (${tax.percentage}%)</td>
  //         <td class="text-right">₹${tax.amount.toFixed(2)}</td>
  //       </tr>
  //     `
  //       )
  //       .join("");

  //     const billHTML = `
  //       <html>
  //       <head>
  //         <title>Bill</title>
  //         <style>
  //           body {
  //         font-family: 'Courier New', monospace;
  //         font-size: 14px;
  //         padding: 20px;
  //           }
  //           .text-center { text-align: center; }
  //           .text-right { text-align: right; }
  //           table { width: 100%; border-collapse: collapse; margin-top: 10px; }
  //           th, td { padding: 4px; border-bottom: 1px dashed #ccc; }
  //           .no-border td { border: none; }
  //           hr { border: none; border-top: 1px dashed #000; margin: 10px 0; }
  //         </style>
  //       </head>
  //       <body>
  //         <div class="text-center">
  //           <h2 style="margin: 0;">${
  //             fooderData.fooder_name || "Restaurant"
  //           }</h2>
  //           <p style="margin: 0;">${fooderData.f_address || ""}, ${
  //       fooderData.f_city || ""
  //     }</p>
  //           <p style="margin: 0;">Phone: ${
  //             fooderData.f_landline || ""
  //           } | GST: ${fooderData.fooder_gstin || ""}</p>
  //         </div>

  //         <hr/>

  //         <p><strong>Customer:</strong> ${customerDetails?.name || "N/A"}</p>
  //         <p><strong>Date:</strong> ${dateStr} <strong style="float:right;">Time:</strong> ${timeStr}</p>
  //         <p><strong>Table:</strong> #${
  //           tableInfo?.table_no || tableInfo?.table_name || "N/A"
  //         } &nbsp;&nbsp;&nbsp; <strong>Mode:</strong> ${orderMode}</p>

  //         <table>
  //           <thead>
  //         <tr>
  //           <th>Item</th>
  //           <th class="text-center">Qty</th>
  //           <th class="text-right">Rate</th>
  //           <th class="text-right">Amt</th>
  //         </tr>
  //           </thead>
  //           <tbody>
  //         ${itemsRows}
  //           </tbody>
  //         </table>

  //         <table>
  //           <tbody>
  //         <tr><td colspan="3">Subtotal</td><td class="text-right">₹${subtotal.toFixed(
  //           2
  //         )}</td></tr>
  //         ${
  //           discountValue > 0
  //             ? discountMode === 0
  //               ? `<tr><td colspan="3">Discount (${discountValue}%)</td><td class="text-right">₹${discountAmount.toFixed(
  //                   2
  //                 )}</td></tr>`
  //               : `<tr><td colspan="3">Discount</td><td class="text-right">₹${discountAmount.toFixed(
  //                   2
  //                 )}</td></tr>`
  //             : ""
  //         }
  //         ${
  //           serviceChargeAmount > 0
  //             ? `<tr><td colspan="3">SCH (${
  //                 serviceChargePercentage || 0
  //               }%)</td><td class="text-right">₹${serviceChargeAmount.toFixed(
  //                 2
  //               )}</td></tr>`
  //             : ""
  //         }
  //         ${taxRows}
  //         ${
  //           Math.abs(roundOffValue) > 0
  //             ? `<tr><td colspan="3">Round Off</td><td class="text-right">₹${roundOffValue.toFixed(
  //                 2
  //               )}</td></tr>`
  //             : ""
  //         }
  //         <tr><td colspan="3"><strong>Total</strong></td><td class="text-right"><strong>₹${total.toFixed(
  //           2
  //         )}</strong></td></tr>
  //           </tbody>
  //         </table>

  //         <hr/>

  //         <p class="text-center">
  //           FSSAI: ${fooderData.fssai_number || "N/A"}<br/>
  //           ${fooderData.billing_notes || "Thank you for visiting!"}
  //         </p>
  //       </body>
  //       </html>
  //         `;
  //     if (enableSilentPrinting === 1) {
  //       // 🔇 Silent print via Electron
  //       try {
  //         const resp = await fetch("http://localhost:3111/print", {
  //           method: "POST",
  //           headers: { "Content-Type": "application/json" },
  //           body: JSON.stringify({ printerType: "bill", data: billData }),
  //         });

  //         if (resp.ok) {
  //           Toaster.success("Bill printed silently");
  //           // Clear order items and reset state after successful silent printing
  //           setTimeout(() => {
  //             clearOrderDataAfterPrint();
  //           }, 500); // Small delay to ensure print completes
  //         } else {
  //           const errorText = await resp.text();
  //           throw new Error(errorText || "Silent print service error");
  //         }
  //       } catch (fetchError) {
  //         // Handle fetch errors (service not running, network issues, etc.)
  //         console.error("Silent print fetch failed:", fetchError);
  //         Toaster.error(
  //           "Silent Printing Service not available. Please start the background service."
  //         );

  //         // Clear order data even if silent printing fails
  //         setTimeout(() => {
  //           clearOrderDataAfterPrint();
  //         }, 500);
  //         return; // Exit early, don't try browser printing
  //       }
  //     } else {
  //       // 🖨️ Print using hidden iframe (no new tab)
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
  //       doc.write(billHTML);
  //       doc.close();
  //       setTimeout(() => {
  //         iframe.contentWindow.focus();
  //         iframe.contentWindow.print();
  //         // Clear order items and reset state after browser printing
  //         setTimeout(() => {
  //           clearOrderDataAfterPrint();
  //         }, 1000); // Delay to ensure print dialog completes
  //       }, 300);
  //     }
  //   } catch (err) {
  //     console.error("Print failed:", err);

  //     // Show appropriate error message
  //     Toaster.error(`Print error: ${err.message}`);

  //     // Clear order data even if printing fails
  //     setTimeout(() => {
  //       clearOrderDataAfterPrint();
  //     }, 500);
  //   }
  // }; // Split bill print function
  // const handleDirectPrintBill = async (
  //   kotDetails,
  //   customerDetails,
  //   tableInfo,
  //   serviceChargeDetails,
  //   isNC
  // ) => {
  //   try {
  //     if (!kotDetails || kotDetails.length === 0) {
  //       Toaster.error("No items found to print bill");
  //       return;
  //     }

  //     const appData = await getAppDataFromDB();
  //     const fooderData = appData || {};
  //     const enableSilentPrinting = Number(appData?.enable_silent_printing) || 0;

  //     // Basic order info
  //     const orderNo = kotDetails[0]?.order_no || "";
  //     const eater_name = customerDetails?.name || "";
  //     const orderType = kotDetails[0]?.order_type?.replace(/_/g, " ").toUpperCase() || "";
  //     const currentDate = new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  //     const currentTime = new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hour12: true });

  //     // Summary calculation
  //     const subTotal = kotDetails.reduce((sum, item) => sum + parseFloat(item.withOutTaxPrice) * item.quantity, 0);
  //     const discountValue = parseFloat(kotDetails[0]?.discount_value) || 0;
  //     const discountType = parseInt(kotDetails[0]?.discount_type) || 0;
  //     const discountAmount = discountType === 0 ? (subTotal * discountValue) / 100 : Math.min(discountValue, subTotal);
  //     const subtotalAfterDiscount = subTotal - discountAmount;

  //     const schAmount = serviceChargeDetails?.percentage
  //       ? (subtotalAfterDiscount * serviceChargeDetails.percentage) / 100
  //       : 0;

  //     const taxSlabs = {};
  //     kotDetails.forEach(item => {
  //       const rate = parseFloat(item.tax_percent) || 0;
  //       if (rate > 0) {
  //         const base = parseFloat(item.withOutTaxPrice) * item.quantity;
  //         taxSlabs[rate] = (taxSlabs[rate] || 0) + (base * rate) / 100;
  //       }
  //     });

  //     const packingCharges = parseFloat(kotDetails[0]?.packingCharges) || 0;
  //     const total =  (subtotalAfterDiscount + schAmount + packingCharges + Object.values(taxSlabs).reduce((a, b) => a + b, 0));


  // const decimal = total - Math.floor(total);
  //       const newRoundOffValue =
  //         decimal >= 0.5 ? + (1 - decimal).toFixed(2) : - decimal.toFixed(2);












  //     const summary = {
  //       subTotal,
  //       discount: discountAmount,
  //       schAmount,
  //       schDetails: serviceChargeDetails || {},
  //       taxSlabs,
  //       packingCharges,
  //       total,
  //       roundOffValue: newRoundOffValue
  //     };

  //     // Items HTML
  //     const itemsHtmlRows = kotDetails.map((item) => {
  //       return `<tr>
  //         <td>
  //           <div style="display: flex; flex-direction: column; justify-content: center;">
  //             <span>${item.name}</span>
  //             ${
  //               item.variant
  //                 ? Array.isArray(item.variant)
  //                   ? item.variant.map(v => `<span><strong>${v.attribute_name}</strong>: ${v.attribute_value_name}</span>`).join("")
  //                   : `<span><strong>${item.variant.attribute_name}</strong>: ${item.variant.attribute_value_name}</span>`
  //                 : ""
  //             }
  //             ${
  //               item.addons && item.addons.length > 0
  //                 ? item.addons.map(addon => `<span>${addon.addon_item_name}</span>`).join("")
  //                 : ""
  //             }
  //           </div>
  //         </td>
  //         <td class="text-center">${item.quantity}</td>
  //         <td class="text-right">₹${parseFloat(item.price).toFixed(2)}</td>
  //         <td class="text-right">₹${(parseFloat(item.price) * item.quantity).toFixed(2)}</td>
  //       </tr>`;
  //     }).join("");


  //     const billHTML = `
  // <html>
  // <head>
  //   <style>
  //     body { font-family: 'Arial', sans-serif; padding: 10px; font-size: 11px; color: #000; }
  //     .text-center { text-align: center; }
  //     .text-right { text-align: right; }
  //     .text-left { text-align: left; }
  //     table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 14px; }
  //     th, td { padding: 6px 4px; border-bottom: 1px solid #ccc; }
  //     .section-divider { border-top: 1px dashed #000; margin: 10px 0; }
  //     .bill-header { font-weight: bold; font-size: 12px; text-align: center; margin-top: 12px; margin-bottom: 8px; }
  //     .company-info { text-align: center; margin-bottom: 4px; font-size: 14px; }
  //     .logo { height: 100px; object-fit: contain; margin: 10px auto 5px; display: block; }
  //     .footer { text-align: center; margin-top: 15px; font-size: 13px; }
  //     .bold { font-weight: bold; }
  //   </style>
  // </head>
  // <body>

  //   <div style="text-align:end;"><strong>Bill No. ${invoiceNumber || ""}</strong></div>

  //   <img src="${fooderData?.fooder_logo}" class="logo" alt="Logo" />

  //   <div class="bill-header">${fooderData?.fooder_name}</div>
  //   <div class="company-info">${fooderData?.f_address}, ${fooderData?.f_city}, ${fooderData?.f_state} - ${fooderData?.f_zipcode}</div>
  //   <div class="company-info">Phone: ${fooderData?.f_landline}</div>
  //   <div class="company-info">GST Number: ${fooderData?.fooder_gstin}</div>

  //   <div style="margin-top: 10px; font-size: 12px;">
  //     <div><strong>Name:</strong> ${eater_name}</div>
  //     <div style="display: flex; justify-content: space-between;">
  //       <div><strong>Date:</strong> ${currentDate}</div>
  //       <div><strong>Time:</strong> ${currentTime}</div>
  //     </div>
  //     <div style="display: flex; justify-content: space-between;">
  //       <div><strong>${orderType}</strong> </div>
  //       <div>Table No #${tableInfo?.table_no ? `${tableInfo.table_no}` : ""}</div>
  //     </div>
  //   </div>

  //   <div class="bill-header">Original Receipt</div>

  //   <table>
  //     <thead>
  //       <tr>
  //         <th class="text-left">Item</th>
  //         <th class="text-center">Qty</th>
  //         <th class="text-right">Rate</th>
  //         <th class="text-right">Amt</th>
  //       </tr>
  //     </thead>
  //     <tbody>
  //       ${itemsHtmlRows}
  //     </tbody>
  //   </table>

  //   <div class="section-divider"></div>

  //   <div style="font-size: 14px;">
  //     <div style="display: flex; justify-content: space-between;">
  //       <span>Subtotal:</span>
  //       <span>₹${(summary.subTotal || 0).toFixed(2)}</span>
  //     </div>


  //      ${summary.discount > 0
  //       ? `<div style="display: flex; justify-content: space-between;">
  //            <span>Discount</span>
  //            <span>₹${summary.discount.toFixed(2)}</span>
  //          </div>`
  //       : ''
  //     }


  //     ${summary.schAmount > 0
  //       ? `<div style="display: flex; justify-content: space-between;">
  //            <span>${summary.schDetails?.name || 'SCH'} (${summary.schDetails?.percentage || 0}%):</span>
  //            <span>₹${summary.schAmount.toFixed(2)}</span>
  //          </div>`
  //       : ''
  //     }

  //     ${summary.taxSlabs
  //       ? Object.entries(summary.taxSlabs)
  //           .map(([key, value]) => {
  //             const percent = parseFloat(key);
  //             const halfPercent = (percent / 2).toFixed(1);
  //             const halfAmount = (value / 2).toFixed(2);
  //             return `
  //               <div style="display: flex; justify-content: space-between;">
  //                 <span>CGST (${halfPercent}%):</span>
  //                 <span>₹${halfAmount}</span>
  //               </div>
  //               <div style="display: flex; justify-content: space-between;">
  //                 <span>SGST (${halfPercent}%):</span>
  //                 <span>₹${halfAmount}</span>
  //               </div>
  //             `;
  //           }).join('')
  //       : ''
  //     }

  //     ${summary.packingCharges > 0
  //       ? `<div style="display: flex; justify-content: space-between;">
  //            <span>Packing Charges:</span>
  //            <span>₹${summary.packingCharges.toFixed(2)}</span>
  //          </div>`
  //       : ''
  //     }

  //     ${parseFloat( summary.roundOffValue).toFixed(2) != 0
  //       ? `<div style="display: flex; justify-content: space-between;">
  //            <span>Round off</span>
  //            <span>₹${summary.roundOffValue.toFixed(2)}</span>
  //          </div>`
  //       : ''
  //     }

  //     <div style="display: flex; justify-content: space-between; font-size: 15px; margin-top: 5px;">
  //       <strong>Total:</strong>
  //       <strong>₹${(Math.round(summary.total) || 0).toFixed(2)}</strong>
  //     </div>
  //   </div>

  //   <div class="section-divider"></div>

  //   <div class="footer">
  //     <div>FSSAI Number: ${fooderData?.fssai_number}</div>
  //     <div style="margin-top: 6px;">${fooderData?.billing_notes || ""}</div>
  //     <p style="margin-top: 6px;">Thank you for your visit!</p>
  //   </div>

  // </body>
  // </html>
  // `;

  //     // Silent printing or iframe printing
  //     if (enableSilentPrinting === 1) {
  //       try {
  //         const resp = await fetch("http://localhost:3111/print", {
  //           method: "POST",
  //           headers: { "Content-Type": "application/json" },
  //           body: JSON.stringify({ printerType: "bill", data: billHTML }),
  //         });

  //         if (resp.ok) {
  //           Toaster.success("Bill printed silently");
  //           setTimeout(() => {
  //             clearOrderDataAfterPrint();
  //           }, 500);
  //         } else {
  //           throw new Error(await resp.text());
  //         }
  //       } catch (err) {
  //         console.error("Silent print error:", err);
  //         Toaster.error("Silent Printing Service not available.");
  //         setTimeout(() => {
  //           clearOrderDataAfterPrint();
  //         }, 500);
  //       }
  //     } else {
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
  //       doc.write(billHTML);
  //       doc.close();
  //       setTimeout(() => {
  //         iframe.contentWindow.focus();
  //         iframe.contentWindow.print();
  //         setTimeout(() => {
  //           clearOrderDataAfterPrint();
  //         }, 1000);
  //       }, 300);
  //     }
  //   } catch (err) {
  //     console.error("Print failed:", err);
  //     Toaster.error(`Print error: ${err.message}`);
  //     setTimeout(() => {
  //       clearOrderDataAfterPrint();
  //     }, 500);
  //   }
  // };

  const handleDirectPrintBill = async (
    kotDetails,
    customerDetails,
    tableInfo,
    serviceChargeDetails,
    isNC,
    invoice_number,
    date_creation
  ) => {
    try {
      if (!kotDetails || kotDetails.length === 0) {
        Toaster.error("No items found to print bill");
        return;
      }

      const appData = await getAppDataFromDB();
      const fooderData = appData || {};
      const enableSilentPrinting = Number(appData?.enable_silent_printing) || 0;

      // Basic order info
      const orderNo = kotDetails[0]?.orderNo || "";
      const eater_name = customerDetails?.name || "";
      const orderType = kotDetails[0]?.order_type?.replace(/_/g, " ").toUpperCase() || "";
      const currentDate = new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
      const currentTime = new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hour12: true });

      // Summary calculation
      const subTotal = kotDetails.reduce((sum, item) => sum + parseFloat(item.withOutTaxPrice) * item.quantity, 0);
      const discountValue = parseFloat(kotDetails[0]?.discount_value) || 0;
      const discountType = parseInt(kotDetails[0]?.discount_type) || 0;
      const discountAmount = discountType === 0 ? (subTotal * discountValue) / 100 : Math.min(discountValue, subTotal);
      const subtotalAfterDiscount = subTotal - discountAmount;

      const schAmount = serviceChargeDetails?.percentage
        ? (subtotalAfterDiscount * serviceChargeDetails.percentage) / 100
        : 0;

      const taxSlabs = {};
      kotDetails.forEach(item => {
        const rate = parseFloat(item.tax_percent) || 0;
        if (rate > 0) {



          const itemBase = item.withOutTaxPrice * item.quantity;
          const itemDiscount =
            subTotal > 0 ? (itemBase / subTotal) * discountAmount : 0;
          const itemPriceAfterDiscount = itemBase - itemDiscount;
          // Proportional service charge for this item
          let itemSCH = 0;
          if (serviceChargeDetails && serviceChargeDetails.percentage != null) {
            itemSCH =
              subtotalAfterDiscount > 0
                ? (itemPriceAfterDiscount / subtotalAfterDiscount) *
                schAmount
                : 0;
          }
          const taxBase = itemPriceAfterDiscount + itemSCH;
          const itemTax = (taxBase * rate) / 100;
          taxSlabs[rate] = (taxSlabs[rate] || 0) + itemTax;



          // const base = parseFloat(item.withOutTaxPrice) * item.quantity;
          // taxSlabs[rate] = (taxSlabs[rate] || 0) + (base * rate) / 100;

        }
      });

      const packingCharges = parseFloat(kotDetails[0]?.packingCharges) || 0;
      const total = (subtotalAfterDiscount + schAmount + packingCharges + Object.values(taxSlabs).reduce((a, b) => a + b, 0));

      const decimal = total - Math.floor(total);
      const newRoundOffValue =
        decimal >= 0.5 ? + (1 - decimal).toFixed(2) : - decimal.toFixed(2);

      const summary = {
        subTotal,
        discount: discountAmount,
        discountType,
        discountValue,

        schAmount,
        schDetails: serviceChargeDetails || {},
        taxSlabs,
        packingCharges,
        total,
        roundOffValue: newRoundOffValue
      };

      // Items HTML
      const itemsHtmlRows = kotDetails.map((item) => {
        return `<tr>
        <td>
          <div style="display: flex; flex-direction: column; justify-content: center;">
            <span>${item.name}</span>
            ${item.selectedvariants && item.selectedvariants.combination_details
            ? item.selectedvariants.combination_details
              .map(i => `<div><b>${i.attribute_name}:</b> ${i.attribute_value_name}</div>`)
              .join('')
            : ""
          }
            ${item.addons && item.addons.length > 0
            ? item.addons.map((i, no) => `<div><b>${no + 1}.</b> ${i.addon_item_name}</div>`).join("")
            : ""
          }
          </div>
        </td>
        <td class="text-center">${item.quantity}</td>
        <td class="text-right">₹${parseFloat(item.price).toFixed(2)}</td>
        <td class="text-right">₹${(parseFloat(item.price) * item.quantity).toFixed(2)}</td>
      </tr>`;
      }).join("");

const timestamp = parseInt(date_creation) * 1000; // convert seconds → milliseconds
const dateObj = new Date(timestamp);

// Date (22 Aug 2025)
const formattedDate = dateObj.toLocaleDateString("en-IN", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

// Time (05:25 PM with uppercase AM/PM)
let formattedTime = dateObj.toLocaleTimeString("en-IN", {
  hour: "2-digit",
  minute: "2-digit",
  hour12: true,
});

formattedTime = formattedTime.replace(/am|pm/i, (match) => match.toUpperCase());

console.log(formattedDate); // 22 Aug 2025
console.log(formattedTime); // 05:25 PM

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

  <div style="text-align:end;"><strong>${invoice_number || ""}</strong></div>
 

  <img src="${fooderData?.fooder_logo}" class="logo" alt="Logo" />

  <div class="bill-header">${fooderData?.fooder_name}</div>
  <div class="company-info">${fooderData?.f_address}, ${fooderData?.f_city}, ${fooderData?.f_state} - ${fooderData?.f_zipcode}</div>
  <div class="company-info">Phone: ${fooderData?.f_landline}</div>
  <div class="company-info">GST Number: ${fooderData?.fooder_gstin}</div>

  <div style="margin-top: 10px; font-size: 12px;">
    <div><strong>Name:</strong> ${eater_name}</div>
    <div style="display: flex; justify-content: space-between;">
      <div><strong>Date:</strong> ${formattedDate}</div>
      <div><strong>Time:</strong> ${formattedTime}</div>
    </div>
    <div style="display: flex; justify-content: space-between;">
    <div style="display: flex; align-items: center; gap: 8px;">
      <div><strong>DINE IN</strong> </div>
      <div>${tableInfo?.table_name ? `  ${tableInfo.table_name}-${tableInfo.table_no} ` : `Table No - ${tableInfo.table_no}`}</div>
      </div>
       <div style="text-align:end;"><strong>Order No #${orderNo || ""}</strong></div>
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
           <span>Discount ${discountType === 0 ? `(${discountValue}%)` : ""}</span>
           <span>-₹${summary.discount.toFixed(2)}</span>
         </div>`
          : ''
        }
     
    ${summary.schAmount > 0
          ? `<div style="display: flex; justify-content: space-between;">
           <span>${summary.schDetails?.name || 'SCH'} (${summary.schDetails?.percentage || 0}%):</span>
           <span>₹${summary.schAmount.toFixed(2)}</span>
         </div>`
          : ''
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
            }).join('')
          : ''
        }

    ${summary.packingCharges > 0
          ? `<div style="display: flex; justify-content: space-between;">
           <span>Packing Charges:</span>
           <span>₹${summary.packingCharges.toFixed(2)}</span>
         </div>`
          : ''
        }

    ${parseFloat(summary.roundOffValue).toFixed(2) != 0
          ? `<div style="display: flex; justify-content: space-between;">
           <span>Round off</span>
           <span>₹${summary.roundOffValue.toFixed(2)}</span>
         </div>`
          : ''
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

      // Silent printing or iframe printing
      if (enableSilentPrinting === 1) {
        try {
          const resp = await fetch("http://localhost:3111/print", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ printerType: "bill", data: billHTML }),
          });

          if (resp.ok) {
            Toaster.success("Bill printed silently");
            setTimeout(() => {
              clearOrderDataAfterPrint();
            }, 500);
          } else {
            throw new Error(await resp.text());
          }
        } catch (err) {
          console.error("Silent print error:", err);
          Toaster.error("Silent Printing Service not available.");
          setTimeout(() => {
            clearOrderDataAfterPrint();
          }, 500);
        }
      } else {
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
          setTimeout(() => {
            clearOrderDataAfterPrint();
          }, 1000);
        }, 300);
      }
    } catch (err) {
      console.error("Print failed:", err);
      Toaster.error(`Print error: ${err.message}`);
      setTimeout(() => {
        clearOrderDataAfterPrint();
      }, 500);
    }
  };


  const handleSplitBillPrint = async (order_no) => {
    try {
      // Check if there are any items to print
      if (!billItems || !Array.isArray(billItems) || billItems.length === 0) {
        Toaster.error("No items found to print split bill");
        return;
      }

      // Ensure schValue is properly initialized
      const safeSchValue = schValue || { name: "", percentage: 0 };

      // Check if we're reprinting an existing saved bill
      const isReprintingExistingBill =
        selectedBill && selectedBill.orders_bills_id;

      // Only check if bill needs to be saved if we're not reprinting an existing bill
      if (!isReprintingExistingBill) {
        // Check if current split bill is saved
        const currentBillExists = savedBills.some(
          (bill) =>
            bill &&
            bill.order_id === splitOrderId &&
            bill.items &&
            Array.isArray(bill.items) &&
            billItems &&
            Array.isArray(billItems) &&
            JSON.stringify(
              bill.items.map((i) => ({ id: i.id, quantity: i.quantity }))
            ) ===
            JSON.stringify(
              billItems.map((i) => ({ id: i.id, quantity: i.quantity }))
            )
        );

        // If not saved, save it first
        if (!currentBillExists) {
          try {
            Toaster.info("Saving split bill before printing...");
            await handleSaveSplitBill("save");


            // Wait a moment for the save to complete and state to update
            await new Promise((resolve) => setTimeout(resolve, 500));
          } catch (saveError) {
            console.error(
              "Failed to save split bill before printing:",
              saveError
            );
            Toaster.error(
              "Failed to save split bill. Cannot print unsaved bill."
            );
            return;
          }
        }
      }



      const appData = await getAppDataFromDB();
      const fooderData = appData || {};
      const enableSilentPrinting = Number(appData?.enable_silent_printing) || 0;

      // Calculate split bill totals
      const subtotal = billItems.reduce(
        (sum, item) =>
          sum + (item.withOutTaxPrice || item.price || 0) * item.quantity,
        0
      );
      const discountAmount =
        splitbilldiscountType === 0
          ? (subtotal * splitbilldiscountvalue) / 100
          : Math.min(splitbilldiscountvalue, subtotal);
      const subtotalAfterDiscount = subtotal - discountAmount;
      const serviceChargeAmount =
        (subtotalAfterDiscount * safeSchValue.percentage) / 100;

      // Calculate taxes per item, then group by tax rate
      const taxMap = {};
      billItems.forEach((item) => {
        const rate = parseFloat(item.tax_percent) || 0;
        if (rate > 0) {
          const itemBase =
            (item.withOutTaxPrice || item.price || 0) * item.quantity;
          const itemDiscount =
            subtotal > 0 ? (itemBase / subtotal) * discountAmount : 0;
          const itemPriceAfterDiscount = itemBase - itemDiscount;
          const itemSCH =
            subtotalAfterDiscount > 0
              ? (itemPriceAfterDiscount / subtotalAfterDiscount) *
              serviceChargeAmount
              : 0;
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
      const raw = subtotalAfterDiscount + serviceChargeAmount + totalTax;
      // const roundOffValue = Math.round(raw) - raw;
      // const total = Math.round(raw);

      const roundOffValue = 0;
      const total = raw;

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

      // Build summary before billHTML
      const summary = {
        subTotal: subtotal,
        schAmount: serviceChargeAmount,
        schDetails: safeSchValue,
        taxSlabs: Object.keys(taxMap).length > 0 ? taxMap : null,
        packingCharges: 0,
        total: total,
        discount: discountAmount,
        roundOffValue: roundOffValue
      };

      // Build item rows for HTML with variants and addons
      const itemsHtmlRows = billItems.map((item) => {
        return `<tr>
           <td>
            <div style="display: flex; flex-direction: column; justify-content: center;">
              <span>${item.name || item.product_name || "Item"}</span>
              ${item.selectedvariants && item.selectedvariants.combination_details
            ? item.selectedvariants.combination_details
              .map(i => `<div><b>${i.attribute_name}:</b> ${i.attribute_value_name}</div>`)
              .join('')
            : ""
          }
              ${item.addons && item.addons.length > 0
            ? item.addons.map((i, no) => `<div><b>${no + 1}.</b> ${i.addon_item_name}</div>`).join("")
            : ""
          }
            </div>
          </td>
          <td class="text-center">${item.quantity}</td>
          <td class="text-right">₹${parseFloat(item.price).toFixed(2)}</td>
          <td class="text-right">₹${(parseFloat(item.price) * item.quantity).toFixed(2)}</td>
        </tr>`;
      }).join("");

      const billNo = selectedBill ? selectedBill.bill_no : "Split Bill";
      const orderData = selectedBill || {};
      const eater_name = orderData?.eater_name || orderData?.customer_name || "";
      const order_numbering = orderData?.order_no || "";

      // Updated bill HTML with proper styling
      const billHTML = `
<html>
<head>
  <style>
    body {
      font-family: 'Arial', sans-serif;
      padding: 10px;
      font-size: 11px;
      color: #000;
    }
    .text-center { text-align: center; }
    .text-right { text-align: right; }
    .text-left { text-align: left; }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 10px;
      font-size: 13px;
    }
    th {
      padding: 6px 4px;
      border-bottom: 2px solid #000;
      font-weight: bold;
      background: #f7f7f7;
    }
    td {
      padding: 5px 4px;
      border-bottom: 1px dashed #ccc;
      vertical-align: top;
    }
    .section-divider {
      border-top: 1px dashed #000;
      margin: 8px 0;
    }
    .bill-header {
      font-weight: bold;
      font-size: 14px;
      text-align: center;
      margin: 6px 0;
    }
    .company-info {
      text-align: center;
      font-size: 12px;
      line-height: 1.3;
    }
    .logo {
      height: 80px;
      object-fit: contain;
      margin: 5px auto;
      display: block;
    }
    .footer {
      text-align: center;
      margin-top: 10px;
      font-size: 11px;
      line-height: 1.4;
    }
    .bold { font-weight: bold; }
    .totals-row {
      display: flex;
      justify-content: space-between;
      margin: 2px 0;
    }
    .total-amount {
      font-size: 15px;
      font-weight: bold;
    }
  </style>
</head>
<body>

  <div style="text-align:right; font-size: 12px;">
    <strong>${invoiceNo || ""}</strong>
  </div>

  ${fooderData?.fooder_logo ? `<img src="${fooderData.fooder_logo}" class="logo" alt="Logo" />` : ''}
  
  <div class="bill-header">${fooderData?.fooder_name || ""}</div>
  
  <div class="company-info">
    ${fooderData?.f_address || ""}, ${fooderData?.f_city || ""}, ${fooderData?.f_state || ""} - ${fooderData?.f_zipcode || ""}
    <br/>Phone: ${fooderData?.f_landline || ""}
    <br/>GSTIN: ${fooderData?.fooder_gstin || ""}
  </div>

  <div style="margin-top: 8px; font-size: 12px;">
    <div><strong>Name:</strong> ${customerDetails2?.name || ""}</div>

    ${customerDetails2?.address ? `<div><strong>Address:</strong> ${customerDetails2?.address}</div>` : ""}
    ${customerDetails2?.mobile ? `<div><strong>Mobile:</strong> ${customerDetails2?.mobile}</div>` : ""}
 

    <div class="totals-row">
      <div><strong>Date:</strong> ${dateStr}</div>
      <div><strong>Time:</strong> ${timeStr}</div>
    </div>
    <div class="totals-row">
      <div><strong>${(orderMode || "").toUpperCase()}</strong> </div>
      <div> ${TableNoBillPrint} Order No #${orderNos}</div>
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

  <div style="font-size: 13px;">
    <div class="totals-row">
      <span>Subtotal:</span>
      <span>₹${(summary.subTotal || 0).toFixed(2)}</span>
    </div>

    ${summary.discount > 0
          ? `<div class="totals-row">
           <span>Discount  ${discountTypeBillPrint === 0 ? `(${discountRateBillPrint})%` : ""}   </span>
           <span>-₹${summary.discount.toFixed(2)}                 </span>
         </div>`
          : ''
        }

    ${summary.schAmount > 0
          ? `<div class="totals-row">
           <span>${summary.schDetails?.name || 'SCH'} (${summary.schDetails?.percentage || 0}%):</span>
           <span>₹${summary.schAmount.toFixed(2)}</span>
         </div>`
          : ''
        }

    ${taxDetails.map(t => `
      <div class="totals-row">
        <span>${t.name} (${t.percentage}%):</span>
        <span>₹${t.amount.toFixed(2)}</span>
      </div>
    `).join('')}

    ${Math.abs(summary.roundOffValue) > 0
          ? `<div class="totals-row">
           <span>Round off</span>
           <span>₹${summary.roundOffValue.toFixed(2)}</span>
         </div>`
          : ''
        }

    <div class="totals-row total-amount" style="margin-top: 5px;">
      <span>Total:</span>
      <span>₹${((summary.total) || 0).toFixed(2)}</span>
    </div>
  </div>

  <div class="section-divider"></div>

  <div class="footer">
    ${fooderData?.fssai_number ? `<div>FSSAI: ${fooderData.fssai_number}</div>` : ""}
    ${fooderData?.billing_notes ? `<div>${fooderData.billing_notes}</div>` : ""}
    <p>Thank you for your visit!</p>
  </div>

</body>
</html>
`;

      if (enableSilentPrinting === 1) {
        // Silent print via Electron
        try {
          const resp = await fetch("http://localhost:3111/print", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ printerType: "bill", data: billHTML }),
          });
          if (resp.ok) {
            Toaster.success("Split bill printed silently");
            setTimeout(() => {
              clearOrderDataAfterPrint();
            }, 500);
          } else {
            throw new Error(await resp.text());
          }
        } catch (err) {
          console.error("Silent print error:", err);
          Toaster.error("Silent Printing Service not available.");
          setTimeout(() => {
            clearOrderDataAfterPrint();
          }, 500);
        }
      } else {
        // Print using hidden iframe
        let iframe = document.getElementById("split-print-iframe");
        if (!iframe) {
          iframe = document.createElement("iframe");
          iframe.id = "split-print-iframe";
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
          setTimeout(() => {
            // clearOrderDataAfterPrint();
          }, 1000);
        }, 300);
      }
    } catch (err) {
      console.error("Print failed:", err);
      Toaster.error(`Print error: ${err.message}`);
      setTimeout(() => {
        // clearOrderDataAfterPrint();
      }, 500);
    }
  };





  useEffect(() => {
    // console.log('ResponsivePOSLayout useEffect triggered - refreshProducts:', refreshProducts, 'onWaiterDetails:', !!onWaiterDetails);
    const fetchInitialData = async () => {
      // setFullLoader(true);
      // setLoading(true);

      let appData = await getAppDataFromDB();
      if (!appData) {
        // First time or after logout
        const response = await axiosInstance.get(AllProduct);
        const data = response.data;
        appData = {
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
          staff_type: data.staff_type,
          staff_name: data.staff_name,
          alertify_id: data.alertify_id,


        };
        await saveAppDataToDB(appData);
      }
      // Set state from appData
      setMenuCategories(appData.menus || []);
      setMenusDB(appData.menus || []);


      setStaffType(appData.staff_type)

      setProducts(appData.product || []);
      setServiceChargeDetails(appData.service_charge_details || null);
      setWaiterDetails && setWaiterDetails(appData.waiterDetails || []);
      // ...set other state as needed...

      // Now fetch rapidly-changing data
      try {
        const realTimeRes = await axiosInstance.get(
          "/api/products/realtimetabledata"
        );
        setTblCategoryDetails(realTimeRes.data.tblCategoryDetails || []);
        //  setTblCategoryDetails(response.data.tblCategoryDetails || []);
        // If you have setTableDetails, set it here:
        // setTableDetails(realTimeRes.data.table_details || []);
      } catch (err) {
        setTblCategoryDetails([]);
        // setTableDetails && setTableDetails([]);
        setErrorTables(err);
        Toaster(err.message || "Something went wrong");
      } finally {
        // setLoading(false);
        setLoadingTables(false);
        setLoadingMenu(false);
        setFullLoader(false);
      }
    };
    fetchInitialData();
  }, [onWaiterDetails, refreshProducts]);

  useEffect(() => {
    // Reset to 'items' tab whenever modal opens
    if (showSplitBillModal) {
      setActiveTab("items");
    }
  }, [showSplitBillModal]);

  const handleSettleBillPayment = async () => {
    if (
      !settleBillData ||
      !settleBillData.kot_details ||
      settleBillData.kot_details.length === 0
    ) {
      Toaster.error("No bill data available");
      return;
    }

    setFullLoader(true);
    try {
      const firstItem = settleBillData.kot_details[0];
      const orderId = firstItem.orderId;

      if (!orderId) {
        Toaster.error("Order ID not found");
        return;
      }

      // Prepare payment details from payment entries
      const paymentDetails = paymentEntries.map((entry) => ({
        // method: entry.method,
        method: entry.method?.toLowerCase().startsWith("upi") ? "UPI" : entry.method,
        amount: entry.amount,
        tip: entry.tip || 0,
        upiType: entry.upiSubMethod || "",
        note: entry.note || "",
        transaction_id: entry.transactionId || "",
      }));

      // Calculate totals
      const totalPaid = paymentEntries.reduce(
        (sum, entry) => sum + parseFloat(entry.amount || 0),
        0
      );
      const totalTip = paymentEntries.reduce(
        (sum, entry) => sum + parseFloat(entry.tip || 0),
        0
      );
      const dueAmount = (settleBillCalculations.total - totalPaid).toFixed(2);


      const appData = await getAppDataFromDB();
      const fooderData = appData || {};

      // Prepare the payload
      const payload = {
        id: orderId,
        subtotal: settleBillCalculations.subtotal.toFixed(2),
        discount_type: firstItem.discount_type || 0,
        discount_rate: firstItem.discount_value || "0",
        discount_value: settleBillCalculations.discount.toFixed(2),
        payment_details: paymentDetails,
        due_amount: dueAmount,
        service_charge: firstItem.order_service_charge?.percentage || 0,
        service_charge_details: firstItem.order_service_charge || {
          name: "SCH",
          percentage: 0,
        },
        tax_amount: settleBillCalculations.tax.toFixed(2),
        tax_details: [], // Will be calculated on backend
        paided_amount: totalPaid.toFixed(2),
        total: settleBillCalculations.total.toFixed(2),
        payment_status: dueAmount <= 0 ? 1 : 2, // 1 = fully paid, 2 = partially paid
        round_up_amount: Number(settleBillCalculations.roundOff),
        item: settleBillData.kot_details.map((item) => ({
          product_id: item.id,
          product_name: item.name,
          quantity: item.quantity,
          price: item.price,
          withOutTaxPrice: item.withOutTaxPrice,
          withTaxPrice: item.withTaxPrice,
          packaging_charges: item.packaging_charges || 0,
          tax_percent: item.tax_percent,
          tax_type: item.tax_type,
          product_type: item.product_type || 0,
          dine_in_service: item.dine_in_service || 1,
          delivery_service: item.delivery_service || 1,
          pick_up_service: item.pick_up_service || 1,
          min_order_quantity: item.min_order_quantity || 1,
          fooder_id: item.fooder_id,
          table_id: item.table_id,
          fooder_name: fooderData.fooder_name || "",
          product_special_note: item.product_special_note || "",
          isKOT: item.isKOT,
          isSaved: item.isSaved,
          KOT_id: item.KOT_id,
          KOT_no: item.KOT_no,
          KOT_time: item.KOT_time,
          selectedAddons: item.selectedAddons || [],
          selectedvariants: item.selectedvariants || {},
          variant_id: item.variant_id,
          addons: item.addons || [],
          attributes: item.attributes || [],
        })),
      };

      // Make the API call
      const response = await axiosInstance.post(
        PostPartialPaymentForDineIn,
        payload
      );

      if (response.data && response.data.status === "success") {
        Toaster.success(response.data.message || "Payment successful");

        // Reset state after successful payment
        setShowSettlePaidModal(false);
        setSettleBillData(null);
        setSettleBillCalculations({
          subtotal: 0,
          discount: 0,
          serviceCharge: 0,
          tax: 0,
          total: 0,
          roundOff: 0,
        });
        setPaymentEntries([]);
        setCurrentPayment({
          method: "cash",
          amount: "",
          tip: "",
          upiSubMethod: "",
          transactionId: "",
        });
        setPaymentMethod("cash");

        // Refresh products/tables if needed
        if (handleFetchAllProducts) {
          try {
            await handleFetchAllProducts();
          } catch (error) {
            console.error("Error refreshing products:", error);
          }
        }
      } else {
        // Toaster.error(response.data?.message || 'Payment failed');
      }
    } catch (error) {
      console.error("Settle bill payment error:", error);
      Toaster.error(error?.response?.data?.message);
    } finally {
      setFullLoader(false);
    }
  };
  const handleDeliveryPayment = async () => {
    setFullLoader(true);
    try {
      const paymentDetails = paymentEntries.map((entry) => ({
        method: entry.method,
        amount: entry.amount,
        tip: entry.tip || 0,
        transaction_id: entry.transactionId || null,
      }));

      const payload = {
        order_id: orderId,
        payment_details: paymentDetails,
        total_paid: paymentEntries.reduce(
          (sum, entry) => sum + entry.amount,
          0
        ),
        total_tip: paymentEntries.reduce(
          (sum, entry) => sum + (entry.tip || 0),
          0
        ),
        payment_status: dueAmount <= 0 ? 1 : 2, // 1 = fully paid, 2 = partially paid
        due_amount: dueAmount > 0 ? dueAmount : 0,
        payment_type: paymentMethod,
        // Include any other necessary fields from your existing implementation
      };

      let response;
      if (orderMode === "DINE IN") {
        response = await axiosInstance.post(
          "/api/payment/partialpaymentfordinein",
          {
            ...payload,
            // Add dine-in specific fields
          }
        );
      } else if (orderMode === "DELIVERY" || orderMode === "COUNTER") {
        response = await axiosInstance.post(
          "/api/payment/holdpaymentforcounteranddelivery",
          {
            ...payload,
            // Add delivery/counter specific fields
          }
        );
      } else {
        // Handle other order modes if needed
        response = await axiosInstance.post(
          "/api/payment/processpayment",
          payload
        );
      }

      if (response.data && response.data.status === "success") {
        Toaster.success(
          response.data.message || "Payment processed successfully"
        );
        // Reset payment state
        setPaymentEntries([]);
        setCurrentPayment({
          method: "",
          amount: "",
          tip: "",
          upiSubMethod: "",
          transactionId: "",
        });
        setDueAmount(0);
        // Close modal and refresh data if needed
        setShowSettlePaidModal(false);
        if (onPaymentSuccess) onPaymentSuccess();
      } else {
        Toaster.error(response.data?.message || "Payment processing failed");
      }
    } catch (err) {
      console.error("Payment error:", err);
      Toaster.error("Failed to process payment");
    } finally {
      setFullLoader(false);
    }
  };

  const handleCancelSplitBill = async () => {
    if (!selectedBill || !selectedBill.order_id || !selectedBill.bill_no) {
      Toaster.error("Missing bill info to cancel.");
      return;
    }

    try {
      setFullLoader(true);


      const response = await axiosInstance.post(CancelSplitBill, {
        order_id: selectedBill.order_id,
        bill_no: selectedBill.bill_no,
      });

      if (response.data?.status === "success") {
        Toaster.success("Split bill cancelled");
setCustomerDetails({ name: "", mobile: "", address: "" });
        // ✅ Move cancelled items back to splitBillItems safely
        setSplitBillItems((prev) => {
          const updated = [...prev];

          if (Array.isArray(selectedBill.items)) {
            selectedBill.items.forEach((item) => {
              const existingIndex = updated.findIndex(
                (i) => i.id === item.id && i.local_id === item.local_id
              );

              if (existingIndex !== -1) {
                updated[existingIndex].quantity += item.quantity;
              } else {
                updated.push({ ...item });
              }
            });
          }

          return updated;
        });

        // ✅ Remove the cancelled bill from savedBills
        setSavedBills((prev) =>
          prev.filter((b) => b.bill_no !== selectedBill.bill_no)
        );

        // ✅ Reset right panel
        resetCurrentBill();
        // ✅ Fetch updated items from backend after cancel
        try {
          const getResponse = await axiosInstance.get(
            `${GetOrderItemsSpilitBill}/${pendingTable?.id}`
          );

          const items = getResponse.data?.data || [];

          setSplitBillItems(items); // left panel
        } catch (err) {
          Toaster.error("Failed to reload items after cancel.");
          console.error("Fetch error after cancel:", err);
        }
      } else {
        Toaster.error(response.data?.message || "Cancel failed");
      }
    } catch (err) {
      Toaster.error(err?.response?.data?.message || "Cancel request failed");
    } finally {
      setFullLoader(false);
    }
  };

  // const handleMarkSplitBillPaid = async () => {
  //   // Use bill_no from selectedBill if available, otherwise fallback
  //   const billNoToSend = selectedBill?.bill_no;
  //   console.log("billNoToSend", billNoToSend);
  //   console.log("splitOrderId", splitOrderId);
  //   if (!splitOrderId || !billNoToSend) {
  //     Toaster.error("Order ID or Bill No missing");
  //     return;
  //   }
  //   try {
  //     setFullLoader && setFullLoader(true);
  //     const payload = {
  //       order_id: selectedBill?.order_id,
  //       bill_no: String(billNoToSend),
  //       payment_details: {
  //         method: paymentMode,
  //         amount: splitBillCalc.total,
  //         upiType: "",
  //         note: "",
  //         transaction_id: transactionId,
  //         tip: Number(tipAmount) || 0,
  //       },
  //     };
  //     const response = await axiosInstance.post(SplitBillPaid, payload);
  //     if (response.data?.status === "success") {
  //       Toaster.success("Payment success");
  //       setBillItems([]); // Clear right side
  //       // Update is_paid for the paid bill in savedBills
  //       setSavedBills((prev) =>
  //         prev.map((bill) =>
  //           bill.orders_bills_id ===
  //           (selectedBill?.orders_bills_id || bill.orders_bills_id)
  //             ? { ...bill, is_paid: true }
  //             : bill
  //         )
  //       );

  //          setSelectedBill(null);

  //       setActiveTab("items");

  //       if (response.data?.order_completed === true) {
  //         setShowSplitBillModal(false);
  //         setFullLoader(true);
  //         if (currentView === "tables") {
  //           setRefreshProducts(Date.now()); // Only refresh if in table view
  //           if (setCurrentView) setCurrentView("tables");
  //         } else {
  //           // If split bill was opened from OrderSidebar (not table view), reset all and go to tables view
  //           resetCurrentBill();
  //           setSplitBillItems([]);
  //           setSavedBills([]);
  //           setSelectedBill(null);
  //           setPendingTable(null);
  //           setSplitOrderNo(null);
  //           setSplitOrderId(null);
  //           setLastsplitbillno(null);
  //           if (setSelectedTable) setSelectedTable(null);
  //           if (setOrderItems) setOrderItems([]);
  //           if (setCustomerDetails) setCustomerDetails({ name: '', mobile: '', address: '' });
  //           if (setDiscountValue) setDiscountValue(0);
  //           if (setOrderNo) setOrderNo(null);
  //           if (typeof onOrderIdChange === 'function') onOrderIdChange(null);
  //           if (setRefreshProducts) setRefreshProducts(Date.now());
  //           if (typeof setResetTabToItems === 'function') setResetTabToItems(true);
  //           if (typeof setActiveTabToItems === 'function') setActiveTabToItems();
  //           if (setCurrentView) setCurrentView("tables");
  //           // Remove from localStorage
  //           if (pendingTable) {
  //             const tableId = pendingTable.id || pendingTable.table_id;
  //             if (tableId) {
  //               const existingOrderList = JSON.parse(localStorage.getItem("orderList")) || {};
  //               delete existingOrderList[tableId];
  //               localStorage.setItem("orderList", JSON.stringify(existingOrderList));
  //             }
  //           }
  //         }
  //       } else {
  //         setFullLoader && setFullLoader(false);
  //       }
  //     } else {
  //       Toaster.error(response.data?.message || "Payment failed");
  //     }
  //   } catch (err) {
  //     Toaster.error(err.response?.data?.message || "Payment failed");
  //   } finally {
  //   }
  // };

  // const handleMarkSplitBillPaid = async () => {
  //   const billNoToSend = selectedBill?.bill_no;

  //   if (!splitOrderId || !billNoToSend) {
  //     Toaster.error("Please save bill first");
  //     return;
  //   }

  //   const round = (val) => Math.round((val + Number.EPSILON) * 100) / 100;

  //   // Calculate base paid amount (excluding tip)
  //   const totalBasePaid = round(
  //     paymentEntries.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0)
  //   );

  //   const totalTip = round(
  //     paymentEntries.reduce((sum, p) => sum + (parseFloat(p.tip) || 0), 0)
  //   );

  //   const totalDue = round(Number(splitBillCalc?.total || 0));
  //   const totalPaid = round(totalBasePaid + totalTip); // totalPaid = base + tip

  //   try {
  //     setFullLoader?.(true);

  //     const lastEntry = paymentEntries[paymentEntries.length - 1]; // Use last entry for main method
  //     const payment_details = {
  //       // method: lastEntry?.method || "Cash",
  // method: lastEntry?.method?.toLowerCase().startsWith("upi") ? "UPI" : lastEntry?.method,

  //       amount: totalBasePaid, // ✅ only base amount
  //       tip: totalTip,
  //       transaction_id: lastEntry?.transactionId || "",
  //       upiType: lastEntry?.upiSubMethod || "",
  //       note: "",
  //       paid_amount: totalPaid, // base + tip (for logging)
  //     };

  //     const payload = {
  //       order_id: selectedBill?.order_id,
  //       bill_no: String(billNoToSend),
  //       payment_details,
  //     };

  //     const response = await axiosInstance.post(SplitBillPaid, payload);

  //     if (response.data?.status === "success") {
  //       Toaster.success(response?.data?.message || "Payment success");

  //       // Reset all payment-related state
  //       setIsBillPaid(true);
  //       setShowPaymentTable(false);
  //       setBillItems([]);
  //       resetPaymentData();

  //       setSavedBills((prev) =>
  //         prev.map((bill) =>
  //           bill.orders_bills_id === selectedBill?.orders_bills_id
  //             ? { ...bill, is_paid: true }
  //             : bill
  //         )
  //       );

  //       setSelectedBill(null);
  //       setActiveTab("items"); // Reset to items tab

  //       if (response.data?.order_completed === true) {
  //         setShowSplitBillModal(false);
  //         setFullLoader(true);

  //         if (currentView === "tables") {
  //           setRefreshProducts(Date.now());
  //           setCurrentView?.("tables");
  //         } else {
  //           resetCurrentBill?.();
  //           setSplitBillItems([]);
  //           setSavedBills([]);
  //           setSelectedBill(null);
  //           setPendingTable(null);
  //           setSplitOrderNo(null);
  //           setSplitOrderId(null);
  //           setLastsplitbillno(null);

  //           setSelectedTable?.(null);
  //           setOrderItems?.([]);
  //           setCustomerDetails?.({ name: "", mobile: "", address: "" });
  //           setDiscountValue?.(0);
  //           setOrderNo?.(null);
  //           onOrderIdChange?.(null);
  //           setRefreshProducts?.(Date.now());
  //           setResetTabToItems?.(true);
  //           setActiveTabToItems?.();
  //           setCurrentView?.("tables");

  //           // Remove table from localStorage
  //           if (pendingTable) {
  //             const tableId = pendingTable.id || pendingTable.table_id;
  //             if (tableId) {
  //               const existingOrderList =
  //                 JSON.parse(localStorage.getItem("orderList")) || {};
  //               delete existingOrderList[tableId];
  //               localStorage.setItem(
  //                 "orderList",
  //                 JSON.stringify(existingOrderList)
  //               );
  //             }
  //           }
  //         }
  //       } else {
  //         setFullLoader(false);
  //       }
  //     } else {
  //       // Toaster.error(response.data?.message || "Payment failed");
  //     }
  //   } catch (err) {
  //     console.error(err);
  //     Toaster.error(err.response?.data?.message || "Payment failed");
  //   } finally {
  //     setFullLoader(false);
  //   }
  // };

  // const [invoiceNo, setInvoiceNo] = useState('');
  // const [orderNos, setOrderNos] = useState('');
  // const [customerDetails2, setCustomerDetails2] = useState({});
  let invoiceNo = ''
  let orderNos = ''
  let customerDetails2 = {}
  let TableNoBillPrint = ''
  let discountRateBillPrint = ''
  let discountTypeBillPrint = ''





  const handleMarkSplitBillPaid = async () => {
    const billNoToSend = selectedBill?.bill_no;


    if (!splitOrderId || !billNoToSend) {
      Toaster.error("Please save bill first");
      return;
    }

    const round = (val) => Math.round((val + Number.EPSILON) * 100) / 100;

    // Calculate base paid amount (excluding tip)
    const totalBasePaid = round(
      paymentEntries.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0)
    );

    const totalTip = round(
      paymentEntries.reduce((sum, p) => sum + (parseFloat(p.tip) || 0), 0)
    );

    // Calculate round-off
    const rawTotal = Number(splitBillCalc?.total || 0);
    const roundOffValue = Math.round(rawTotal) - rawTotal;
    const totalDue = round(Math.round(rawTotal)); // Apply rounding to total due
    const totalPaid = round(totalBasePaid + totalTip); // totalPaid = base + tip

    try {
      setFullLoader?.(true);

      const lastEntry = paymentEntries[paymentEntries.length - 1]; // Use last entry for main method
      const payment_details = {
        method: lastEntry?.method?.toLowerCase().startsWith("upi") ? "UPI" : lastEntry?.method,
        amount: totalBasePaid.toFixed(2), // ✅ only base amount
        tip: totalTip,
        transaction_id: lastEntry?.transactionId || "",
        upiType: lastEntry?.upiSubMethod || "",
        note: "",
        paid_amount: totalPaid.toFixed(2), // base + tip (for logging)
        round_off: roundOffValue, // Add round-off to payment details
      };

      const payload = {
        order_id: selectedBill?.order_id,
        bill_no: String(billNoToSend),
        payment_details,
      };

      const response = await axiosInstance.post(SplitBillPaid, payload);

      if (response.data?.status === "success") {
        Toaster.success(response?.data?.message || "Payment success");
        const { invoice_number, orderNo } = response.data

        invoiceNo = response.data.invoice_number
        orderNos = response.data.orderNo
        customerDetails2 = response.data.customer_data
        TableNoBillPrint = response.data.table_no

        discountRateBillPrint = response.data.discountRate
        discountTypeBillPrint = response.data.discountType

        // Reset all payment-related state
        setIsBillPaid(true);
        setShowPaymentTable(false);
        setBillItems([]);
        resetPaymentData();
setCustomerDetails({ name: "", mobile: "", address: "" });
        setSavedBills((prev) =>
          prev.map((bill) =>
            bill.orders_bills_id === selectedBill?.orders_bills_id
              ? { ...bill, is_paid: true }
              : bill
          )
        );

        setSelectedBill(null);
        setActiveTab("items"); // Reset to items tab

        if (response.data?.order_completed === true) {
          setShowSplitBillModal(false);
          setFullLoader(true);

          if (currentView === "tables") {
            setRefreshProducts(Date.now());
            setCurrentView?.("tables");
          } else {
            resetCurrentBill?.();
            setSplitBillItems([]);
            setSavedBills([]);
            setSelectedBill(null);
            setPendingTable(null);
            setSplitOrderNo(null);
            setSplitOrderId(null);
            setLastsplitbillno(null);

            setSelectedTable?.(null);
            setOrderItems?.([]);
            setCustomerDetails?.({ name: "", mobile: "", address: "" });
            setDiscountValue?.(0);
            setOrderNo?.(null);
            onOrderIdChange?.(null);
            setRefreshProducts?.(Date.now());
            setResetTabToItems?.(true);
            setActiveTabToItems?.();
            setCurrentView?.("tables");

            // Remove table from localStorage
            if (pendingTable) {
              const tableId = pendingTable.id || pendingTable.table_id;
              if (tableId) {
                const existingOrderList =
                  JSON.parse(localStorage.getItem("orderList")) || {};
                delete existingOrderList[tableId];
                localStorage.setItem(
                  "orderList",
                  JSON.stringify(existingOrderList)
                );
              }
            }
          }

        } else {
          setFullLoader(false);
        }

        return { invoice_number, orderNo };
      } else {
        Toaster.error(response.data?.message || "Payment failed");
      }
    } catch (err) {
      console.error(err);
      Toaster.error(err.response?.data?.message || "Payment failed");
    } finally {
      setFullLoader(false);
    }
  };

  {
    /* Split Bill Button - Remove the conditional check since we don't have openSplitBillModalFromSidebar */
  }
  <div className="mb-4">
    <button
      className="btn btn-outline-primary w-100 py-2"
      onClick={() => {
        // Add your split bill logic here
        // For example: setShowSplitBillModal(true)
        Toaster.info("Split bill functionality would go here");
      }}
    >
      <i className="bi bi-arrow-left-right me-2"></i>Split Bill
    </button>
  </div>;

  const handleCreateNewSplitBill = () => {
    resetCurrentBill(); // Clear current billItems, totals, etc.
    setSelectedBill(null); // Deselect old bill if any
    // Optionally scroll to bill area or give feedback
            setCustomerDetails({ name: "", mobile: "", address: "" });

  };

  const fetchSplitBillDetails = async (payload) => {
    try {
      setFullLoader(true);
      const response = await axiosInstance.post(PostSplitBill, payload);
      // if (response.data?.status === "success") {
      //   return response.data;
      // }
      if (response.data?.status === "success") {
        const data = response.data.data;

        // ✅ 1. Set bill items
        setBillItems(
          (data.items_data || []).map((item) => ({
            ...item,
            name: item.product_name,
            price: item.product_price,
            quantity: item.quantity,
            local_id: item.local_id,
          }))
        );

        // ✅ 2. Set SCH
        if (data.amount_data?.schDetails) {
          console.log(data.amount_data);
          console.log("amount_data");

          console.log("**********sch1")

          setSchValue({
            name: data.amount_data.schDetails.name,
            percentage: parseFloat(data.amount_data.schDetails.percentage) || 0,
          });
        } else {
          setSchValue({ name: "SCH", percentage: 0 });
        }


        if (data.customer_data) {



          setCustomerDetails({
            name: data.customer_data?.name || "",
            mobile: data.customer_data?.mobile || "",
            address: data.customer_data?.address || "",
            eater_suggestions: "",
          });
          // setCustomerDetails(data.amount_data?.customer_data)

        }

        // ✅ 3. Set Discount
        if (data.amount_data?.discountDetails) {
          setSplitbilldiscountType(
            parseInt(data.amount_data.discountDetails.discountType) || 0
          );
          setSplitbilldiscountvalue(
            parseFloat(data.amount_data.discountDetails.discountRate) || 0
          );
        } else {
          setSplitbilldiscountType(0);
          setSplitbilldiscountvalue(0);
        }
      } else {
        throw new Error(response.data?.message || "Failed to fetch split bill");
      }
    } catch (error) {
      console.error("Error in fetchSplitBillDetails:", error);
      throw error;
    } finally {
      setFullLoader(false);
    }
  };

  const handleClick = async (bill) => {
    // console.log("Clicked bill object:", bill); // Debug log
    setSelectedBill(bill);

    if (!bill?.bill_no || !bill?.orders_bills_id || !bill?.order_id) {
      Toaster.error("Missing required bill data");
      return;
    }

    // Reset payment data when switching bills
    resetPaymentData();

    const payload = {
      bill_no: bill.bill_no,
      id: bill.orders_bills_id,
      order_id: bill.order_id,
    };

    try {
      const result = await fetchSplitBillDetails(payload);
      // console.log("Split bill data:", result);
    } catch (err) {
      Toaster.error(err.message || "Unable to load split bill");
    }
  };

  const resetCurrentBill = () => {
    setBillItems([]);
    // setSchValue({ name: "", percentage: 0 });
    setSplitbilldiscountType(0);
    setSplitbilldiscountvalue(0);
    setSelectedBill(null);

    // Reset payment data
    resetPaymentData();
  };

  useEffect(() => {
    if (billEndRef.current) {
      billEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [billItems]);

  // Set default payment method to Cash when payment tab is active
  useEffect(() => {
    if (activeTab === "payment" && !paymentMethod) {
      setPaymentMethod("Cash");
      setCurrentPayment((prev) => ({
        ...prev,
        method: "Cash",
      }));
    }
  }, [activeTab, paymentMethod]);

  // Reset payment data when selected bill changes
  useEffect(() => {
    if (selectedBill) {
      resetPaymentData();
    }
  }, [selectedBill?.orders_bills_id]); // Only trigger when bill ID changes

  // Helper function to reset payment data
  const resetPaymentData = () => {
    setPaymentEntries([]);
    setCurrentPayment({
      method: "Cash", // Default to Cash
      amount: "", // Will be calculated dynamically based on splitBillCalc.total
      tip: "",
      upiSubMethod: "",
      transactionId: "",
    });
    setPaymentMethod("Cash"); // Reset payment method to Cash
    setPayClicked(false); // Reset pay clicked state
    setShowPaymentTable(false);
    setIsBillPaid(false);
  };

  const handleApplyDiscount = () => {
    // Optional toast or logic if needed
  };

  /**
   * Calculates split bill total with per-item discount, SCH, and tax
   * @param {Array} items - Array of items, each with { price, quantity, tax_percent }
   * @param {number} discountType - 0 for %, 1 for flat ₹
   * @param {number} discountValue - Discount value (percent or rupees)
   * @param {number} schPercent - Service charge percent (e.g. 8 for 8%)
   * @returns {Object} { total, items: [{...item, discount, sch, tax, finalItemTotal }] }
   */ function calculateSplitBillTotal(
    items,
    discountType,
    discountValue,
    schPercent
  ) {
    // Ensure items is an array
    if (!items || !Array.isArray(items)) {
      return { total: 0, items: [] };
    }

    // 1. Subtotal
    const subtotal = items.reduce(
      (sum, item) => sum + (item.withOutTaxPrice || 0) * item.quantity,
      0
    );

    // 2. Discount
    let discount = 0;
    if (discountType === 0) {
      discount = (subtotal * discountValue) / 100;
    } else {
      discount = Math.min(discountValue, subtotal);
    }

    // 3. SCH
    const subtotalAfterDiscount = subtotal - discount;
    const sch =
      subtotalAfterDiscount > 0
        ? (subtotalAfterDiscount * schPercent) / 100
        : 0;

    // 4. Per-item breakdown
    const itemsWithCalcs = items.map((item) => {
      const itemBase = (item.withOutTaxPrice || 0) * item.quantity;
      const itemDiscount = subtotal > 0 ? (itemBase / subtotal) * discount : 0;
      const itemPriceAfterDiscount = itemBase - itemDiscount;
      const itemSCH =
        subtotalAfterDiscount > 0
          ? (itemPriceAfterDiscount / subtotalAfterDiscount) * sch
          : 0;
      const taxBase = itemPriceAfterDiscount + itemSCH;
      const tax = item.tax_percent > 0 ? (taxBase * item.tax_percent) / 100 : 0;
      const finalItemTotal = taxBase + tax;
      return {
        ...item,
        itemBase,
        itemDiscount,
        itemPriceAfterDiscount,
        itemSCH,
        tax,
        finalItemTotal,
      };
    });

    // 5. Total
    const total = itemsWithCalcs.reduce(
      (sum, item) => sum + item.finalItemTotal,
      0
    );

    return {
      total,
      items: itemsWithCalcs,
    };
  }

  const getMaxAvailableQuantity = (id, local_id) => {
    const match = splitBillItems.find(
      (i) => i.id === id && i.local_id === local_id
    );
    return match ? match.quantity : 0;
  };

  // Bill Settlement Calculation Functions
  const calculateSettleBillSubtotal = (items) => {
    return items.reduce((total, item) => {
      return total + (item.withOutTaxPrice || item.price || 0) * item.quantity;
    }, 0);
  };

  const calculateSettleBillDiscount = (
    subtotal,
    discountType,
    discountValue
  ) => {
    if (subtotal <= 0) return 0;
    if (discountType === 0) {
      return (subtotal * discountValue) / 100;
    } else {
      return Math.min(discountValue, subtotal);
    }
  };

  const calculateSettleBillServiceCharge = (
    subtotalAfterDiscount,
    schPercent
  ) => {
    return subtotalAfterDiscount > 0
      ? (subtotalAfterDiscount * schPercent) / 100
      : 0;
  };

  const calculateSettleBillTax = (
    items,
    subtotal,
    discount,
    sch,
    schPercent
  ) => {
    const subtotalAfterDiscount = subtotal - discount;
    if (subtotal <= 0) return 0;

    // Group items by tax percent
    const uniquePercents = Array.from(
      new Set(items.map((item) => item.tax_percent).filter(Boolean))
    );
    return uniquePercents.reduce((totalTax, percent) => {
      const itemsInGroup = items.filter((item) => item.tax_percent === percent);
      return itemsInGroup.reduce((sum, item) => {
        // Proportional discount for this item
        const itemBasePrice =
          (item.withOutTaxPrice || item.price || 0) * item.quantity;
        const itemDiscount =
          subtotal > 0 ? (itemBasePrice / subtotal) * discount : 0;
        const itemPriceAfterDiscount = itemBasePrice - itemDiscount;
        // Only add service charge if present
        let itemTaxBase = itemPriceAfterDiscount;
        if (schPercent && schPercent > 0) {
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
  };

  const calculateSettleBillTotal = (
    items,
    discountType,
    discountValue,
    schPercent
  ) => {
    const subtotal = calculateSettleBillSubtotal(items);
    const discount = calculateSettleBillDiscount(
      subtotal,
      discountType,
      discountValue
    );
    const subtotalAfterDiscount = subtotal - discount;
    const sch = calculateSettleBillServiceCharge(
      subtotalAfterDiscount,
      schPercent
    );
    const tax = calculateSettleBillTax(
      items,
      subtotal,
      discount,
      sch,
      schPercent
    );

    const rawTotal = subtotal - discount + sch + tax;
    const roundOff = calculateRoundOff(rawTotal);
    const finalTotal = Math.round((rawTotal + roundOff) * 100) / 100;

    return {
      subtotal,
      discount,
      serviceCharge: sch,
      tax,
      roundOff,
      total: finalTotal,
    };
  };

  const calculateRoundOff = (rawTotal) => {
    const decimal = rawTotal - Math.floor(rawTotal);
    return decimal >= 0.5 ? +(1 - decimal).toFixed(2) : -decimal.toFixed(2);
  };

  const handleSaveSplitBill = async (mode = "save") => {
    // Prepare items_details
    const items_details = billItems.map((item) => ({
      id: item.id,
      order_id: splitOrderId,
      fooder_id: item.fooder_id,
      product_kot_id: item.KOT_id,
      phone: customerDetails?.mobile || "",
      table_id: item.table_id,
      menu_id: item.menu_id,
      product_id: item.product_id || item.id,
      product_type: item.product_type,
      product_name: item.name,
      quantity: item.quantity,
      max_quantity: item.max_quantity || item.quantity,
      product_price: String(item.price || item.withOutTaxPrice || 0),
      product_special_note: item.product_special_note || "",
      addon_item: 0,
      // ✅ Variants
      variant_id: item.variant_id || (item.selectedvariants?.variant_id ?? ""),
      variant_details: item.variant_details || "",
      selected_variants: item.selectedvariants || {}, // send full object

      // ✅ Addons
      addons_items_details: JSON.stringify(item.addons_items_details || []),
      selected_addons: item.addons || [], // send full addons arra
      // variant_id: item.variant_id,
      // variant_details: item.variant_details || "",
      // addons_items_details: item.addons_items_details || "[]",
      packaging_charges: item.packaging_charges || "0",
      item_kot_status: item.item_kot_status || 0,
      local_id: item.local_id,
      item_tax_type: String(item.tax_type),
      item_tax_percent: String(item.tax_percent),
    }));

    // Prepare SCH and tax details
    const schAmount = splitBillCalc.items.reduce(
      (sum, i) => sum + (i.itemSCH || 0),
      0
    );
    const taxAmount = splitBillCalc.items.reduce(
      (sum, i) => sum + (i.tax || 0),
      0
    );

    const roundOff = Number(
      (Math.round(splitBillCalc.total) - splitBillCalc.total).toFixed(2)
    );

    // Group tax by GST percentage and split into CGST/SGST
    const gstGroups = {};
    splitBillCalc.items.forEach((item) => {
      const percent = Number(item.tax_percent) || 0;
      if (!gstGroups[percent]) gstGroups[percent] = 0;
      gstGroups[percent] += item.tax || 0;
    });
    const taxDetails = Object.entries(gstGroups)
      .filter(([percent, amount]) => percent > 0 && amount > 0)
      .flatMap(([percent, amount]) => {
        const halfPercent = Number(percent) / 2;
        const halfAmount = amount / 2;
        return [
          {
            name: "CGST",
            percentage: halfPercent,
            amount: Number(halfAmount.toFixed(2)),
          },
          {
            name: "SGST",
            percentage: halfPercent,
            amount: Number(halfAmount.toFixed(2)),
          },
        ];
      });

    // Prepare payload
    // const payload = {
    //   order_id: splitOrderId,
    //   bill_data: [
    //     {
    //       items_details,
    //       customer_details: {
    //         name: customerDetails?.name || "",
    //         address: customerDetails?.address || "",
    //         mobile: customerDetails?.mobile || "",
    //       },
    //       payment_details: {
    //         method: "Cash", // or your selected payment method
    //         amount: splitBillCalc.total,
    //         upiType: "",
    //         note: "",
    //         transaction_id: "",
    //         tip: 0,
    //       },
    //       amount_details: {
    //         total: splitBillCalc.total,
    //         subTotal: splitBillCalc.items.reduce(
    //           (sum, i) => sum + (i.itemBase || 0),
    //           0
    //         ),
    //         discountDetails: {
    //           discountType: splitbilldiscountType,
    //           discountRate: String(splitbilldiscountvalue),
    //           discountAmount: splitBillCalc.items.reduce(
    //             (sum, i) => sum + (i.itemDiscount || 0),
    //             0
    //           ),
    //         },
    //         schDetails: {
    //           name: schValue.name,
    //           percentage: schValue.percentage,
    //           amount: schAmount,
    //         },
    //         schAmount: schAmount,
    //         taxAmount: taxAmount,
    //         taxDetails: taxDetails,
    //         packingCharges: 0,
    //       },
    //       bill_number: lastsplitbillno + 1,
    //     },
    //   ],
    //   payment_status: 1,
    //   discountRate: String(splitbilldiscountvalue),
    //   discountType: splitbilldiscountType,
    // };

    // Prepare payload
    const payload = {
      order_id: splitOrderId,
      bill_data: [
        {
          items_details,
          customer_details: {
            name: customerDetails?.name || "",
            address: customerDetails?.address || "",
            mobile: customerDetails?.mobile || "",
          },
          payment_details: {
            method: "Cash", // or your selected payment method
            amount: splitBillCalc.total, // ✅ Rounded total
            upiType: "",
            note: "",
            transaction_id: "",
            tip: 0,
          },
          amount_details: {
            total: splitBillCalc.total, // ✅ Rounded total
            // round_off_amount: roundOff,            // ✅ Send round off
            round_off_amount: 0,            // ✅ Send round off

            subTotal: splitBillCalc.items.reduce(
              (sum, i) => sum + (i.itemBase || 0),
              0
            ),
            discountDetails: {
              discountType: splitbilldiscountType,
              discountRate: String(splitbilldiscountvalue),
              discountAmount: splitBillCalc.items.reduce(
                (sum, i) => sum + (i.itemDiscount || 0),
                0
              ),
            },
            schDetails: {
              name: schValue.name,
              percentage: schValue.percentage,
              amount: schAmount,
            },
            schAmount: schAmount,
            taxAmount: taxAmount,
            taxDetails: taxDetails,
            packingCharges: 0,
            // round_off_amount: roundOff,
            round_off_amount: 0,

          },
          bill_number: lastsplitbillno + 1,
        },
      ],
      payment_status: 1,
      discountRate: String(splitbilldiscountvalue),
      discountType: splitbilldiscountType,
      // ✅ Also send at root if backend expects it here
    };


    try {
      setFullLoader(true);
      const response = await axiosInstance.post(SaveSplitBillPost, payload);



      if (response.data?.status === "success") {

        Toaster.success("Split bill saved successfully!!!");
        const saved = response.data?.data;
        const savedBillData = response.data?.bills?.[0];
          console.log("**********sch2")

            // setSchValue({
            //   name: splitBillItems[0]?.order_service_charge?.name || "",
            //   percentage: splitBillItems[0]?.order_service_charge?.percentage || 0,
            // });
        // setInvoiceNo(response.data.invoice_number)
        // setOrderNos(response.data.order_no)
        // setCustomerDetails2(response.data.bills[0].customer_details)
            setCustomerDetails({ name: "", mobile: "", address: "" });


        invoiceNo = response.data.invoice_number
        orderNos = response.data.order_no
        customerDetails2 = response.data.bills[0].customer_details

        TableNoBillPrint = response.data.table_no
        discountRateBillPrint = splitbilldiscountvalue
        discountTypeBillPrint = splitbilldiscountType


        const newBill = {
          id: savedBillData?.orders_bills_id,
          orders_bills_id: savedBillData?.orders_bills_id,
          bill_no: saved?.bill_no || lastsplitbillno + 1,
          order_id: splitOrderId,
          fooder_id: billItems[0]?.fooder_id,
          amount_total: splitBillCalc.total,
          items: [...billItems],
          total: splitBillCalc.total,
          schValue: { ...schValue },
          discount: {
            type: splitbilldiscountType,
            value: splitbilldiscountvalue,
          },
        };

        setLastSavedBillNo(newBill.bill_no);

        if (savedBills.length === 0 && currentView === "tables") {
          handleFetchAllProducts();
        }

        setSavedBills((prev) => [...prev, newBill]);
        setCurrentBillNumber((prev) => prev + 1);
        setLastsplitbillno((prev) => prev + 1);

        // Handle by mode
        // if (mode === "saveAndPaid") {
        //   setSelectedBill(newBill);
        //   setPaymentEntries([
        //     {
        //       method: "Cash",
        //       amount: splitBillCalc.total.toFixed(2),
        //       tip: "0",
        //       upiSubMethod: "",
        //       transactionId: ""
        //     }
        //   ]);
        //   setActiveTab("payment"); // Go to payment tab
        // }
        if (mode === "saveAndPaid") {
          setSelectedBill(newBill);
          const totalAmount = splitBillCalc.total.toFixed(2);
          setPaymentEntries([
            {
              method: "Cash",
              amount: totalAmount,
              tip: "0",
              upiSubMethod: "",
              transactionId: "",
            },
          ]);

          // alert(totalAmount)

          // Set current payment to the full amount
          setCurrentPayment({
            method: "Cash",
            amount: totalAmount,
            tip: "0",
            upiSubMethod: "",
            transactionId: "",
          });

          setActiveTab("payment"); // Go to payment tab
        } else {
          // Clear right section (for normal Save Bill)
          resetCurrentBill(); // Clear billItems, selectedBill, etc.
        }

        setCanCreateNewBill(true);
      } else {
        Toaster.error(response.data?.message || "Failed to save split bill");
      }
    } catch (err) {
      Toaster.error(err.response?.data?.message || "Failed to save split bill");
    } finally {
      setFullLoader(false);
    }
  };





  useEffect(() => {

    console.log("*****************************************************")
    console.log(currentPayment)
    
  }, [currentPayment]);













  

  //   const handleSaveSplitBill = async () => {
  //     // Prepare items_details
  //     const items_details = billItems.map((item) => ({
  //       id: item.id,
  //       order_id: splitOrderId,
  //       fooder_id: item.fooder_id,
  //       product_kot_id: item.KOT_id,
  //       phone: customerDetails?.mobile || "",
  //       table_id: item.table_id,
  //       menu_id: item.menu_id,
  //       product_id: item.product_id || item.id,
  //       product_type: item.product_type,
  //       product_name: item.name,
  //       quantity: item.quantity,
  //       max_quantity: item.max_quantity || item.quantity,
  //       product_price: String(item.price || item.withOutTaxPrice || 0),
  //       product_special_note: item.product_special_note || "",
  //       addon_item: 0,
  //       variant_id: item.variant_id,
  //       variant_details: item.variant_details || "",
  //       addons_items_details: item.addons_items_details || "[]",
  //       packaging_fee: item.packaging_fee || "0",
  //       item_kot_status: item.item_kot_status || 0,
  //       local_id: item.local_id,
  //       item_tax_type: String(item.tax_type),
  //       item_tax_percent: String(item.tax_percent),
  //     }));

  //     // Prepare SCH and tax details
  //     const schAmount = splitBillCalc.items.reduce(
  //       (sum, i) => sum + (i.itemSCH || 0),
  //       0
  //     );
  //     const taxAmount = splitBillCalc.items.reduce(
  //       (sum, i) => sum + (i.tax || 0),
  //       0
  //     );

  //     // Group tax by GST percentage and split into CGST/SGST
  //     const gstGroups = {};
  //     splitBillCalc.items.forEach((item) => {
  //       const percent = Number(item.tax_percent) || 0;
  //       if (!gstGroups[percent]) gstGroups[percent] = 0;
  //       gstGroups[percent] += item.tax || 0;
  //     });
  //     const taxDetails = Object.entries(gstGroups)
  //       .filter(([percent, amount]) => percent > 0 && amount > 0)
  //       .flatMap(([percent, amount]) => {
  //         const halfPercent = Number(percent) / 2;
  //         const halfAmount = amount / 2;
  //         return [
  //           {
  //             name: "CGST",
  //             percentage: halfPercent,
  //             amount: Number(halfAmount.toFixed(2)),
  //           },
  //           {
  //             name: "SGST",
  //             percentage: halfPercent,
  //             amount: Number(halfAmount.toFixed(2)),
  //           },
  //         ];
  //       });

  //     // Prepare payload
  //     const payload = {
  //       order_id: splitOrderId,
  //       bill_data: [
  //         {
  //           items_details,
  //           customer_details: {
  //             name: customerDetails?.name || "",
  //             address: customerDetails?.address || "",
  //             mobile: customerDetails?.mobile || "",
  //           },
  //           payment_details: {
  //             method: "Cash", // or your selected payment method
  //             amount: splitBillCalc.total,
  //             upiType: "",
  //             note: "",
  //             transaction_id: "",
  //             tip: 0,
  //           },
  //           amount_details: {
  //             total: splitBillCalc.total,
  //             subTotal: splitBillCalc.items.reduce(
  //               (sum, i) => sum + (i.itemBase || 0),
  //               0
  //             ),
  //             discountDetails: {
  //               discountType: splitbilldiscountType,
  //               discountRate: String(splitbilldiscountvalue),
  //               discountAmount: splitBillCalc.items.reduce(
  //                 (sum, i) => sum + (i.itemDiscount || 0),
  //                 0
  //               ),
  //             },
  //             schDetails: {
  //               name: schValue.name,
  //               percentage: schValue.percentage,
  //               amount: schAmount,
  //             },
  //             schAmount: schAmount,
  //             taxAmount: taxAmount,
  //             taxDetails: taxDetails,
  //             packingCharges: 0,
  //           },
  //           bill_number: lastsplitbillno + 1,
  //         },
  //       ],
  //       payment_status: 1,
  //       discountRate: String(splitbilldiscountvalue),
  //       discountType: splitbilldiscountType,
  //     };

  //     try {
  //       setFullLoader(true);
  //       const response = await axiosInstance.post(SaveSplitBillPost, payload);
  //       if (response.data?.status === "success") {
  //         Toaster.success("Split bill saved successfully!");
  //         const saved = response.data?.data;
  //         const savedBillData = response.data?.bills?.[0];

  //         const newBill = {
  //           id: savedBillData?.orders_bills_id,
  //           orders_bills_id: savedBillData?.orders_bills_id,
  //           bill_no: saved?.bill_no || lastsplitbillno + 1,
  //           order_id: splitOrderId,
  //           fooder_id: billItems[0]?.fooder_id || 1,
  //           amount_total: splitBillCalc.total,
  //           items: [...billItems],
  //           total: splitBillCalc.total,
  //           schValue: { ...schValue },
  //           discount: {
  //             type: splitbilldiscountType,
  //             value: splitbilldiscountvalue,
  //           },
  //         };

  //         // ✅ ADD THIS RIGHT AFTER newBill IS CREATED
  // setLastSavedBillNo(newBill.bill_no);

  //         if (savedBills.length === 0 && currentView === "tables") {
  //           handleFetchAllProducts();
  //         }

  //         // setSavedBills((prev) => [...prev, newBill]);
  //         // setCurrentBillNumber(currentBillNumber + 1);
  //         // setLastsplitbillno((prev) => prev + 1);
  //         // resetCurrentBill();

  //         setSavedBills((prev) => [...prev, newBill]);
  // setCurrentBillNumber((prev) => prev + 1);
  // setLastsplitbillno((prev) => prev + 1);

  // // ✅ Select the new bill
  // setSelectedBill(newBill);

  // // ✅ Auto-fill payment entry for the total amount
  // setPaymentEntries([
  //   {
  //     method: "Cash",
  //     amount: splitBillCalc.total.toFixed(2),
  //     tip: "0",
  //     upiSubMethod: "",
  //     transactionId: ""
  //   }
  // ]);

  // // ✅ Switch to payment tab automatically
  // setActiveTab("payment");

  // // ✅ Don’t reset current bill yet — do that after Paid
  // // resetCurrentBill(); ❌ REMOVE THIS FROM HERE

  //           // ✅ Enable "+ New Bill" button now
  //       setCanCreateNewBill(true);
  //       } else {
  //         Toaster.error(response.data?.message || "Failed to save split bill");
  //       }
  //     } catch (err) {
  //       Toaster.error(err.response?.data?.message || "Failed to save split bill");
  //     } finally {
  //       setFullLoader(false);
  //     }
  //   };

  const viewSavedBill = (bill) => {
    setSelectedBill(bill);
    setBillItems(bill.items);
    setSchValue(bill.schValue);
    setSplitbilldiscountType(bill.discount?.type);
    setSplitbilldiscountvalue(bill.discount.value);
  };

  const handleAddToBill = (item) => {
    const key = `${item.id}-${item.local_id}`;
    const updatedSplit = splitBillItems
      .map((i) => {
        if (`${i.id}-${i.local_id}` === key) {
          return { ...i, quantity: i.quantity - 1 };
        }
        return i;
      })
      .filter((i) => i.quantity > 0);
    setSplitBillItems(updatedSplit);

    const existingIndex = billItems.findIndex(
      (i) => `${i.id}-${i.local_id}` === key
    );
    if (existingIndex > -1) {
      const updatedBill = [...billItems];
      updatedBill[existingIndex].quantity += 1;
      setBillItems(updatedBill);
    } else {
      setBillItems([...billItems, { ...item, quantity: 1 }]);
    }

    // ✅ Mark bill as "unsaved"
    setCanCreateNewBill(false);
    setSchValue({
              name: splitBillItems[0]?.order_service_charge?.name || "",
              percentage: splitBillItems[0]?.order_service_charge?.percentage || 0,
            });
            setSplitbilldiscountvalue(0);
            setSplitbilldiscountType(0);
  };

  const updateBillItemQuantity = (id, local_id, delta, itemIndex) => {
    let movedItem = null; // for left-side update

    // Step 1: update billItems
    setBillItems((prev) => {
      const updated = [...prev];
      const target = updated[itemIndex];
      if (!target) return prev;

      const newQuantity = target.quantity + delta;
      movedItem = { ...target }; // save for later use

      if (newQuantity <= 0) {
        updated.splice(itemIndex, 1); // remove item
      } else {
        updated[itemIndex] = { ...target, quantity: newQuantity };
      }

      return updated;
    });

    // Step 2: update splitBillItems (left section)
    setSplitBillItems((prevLeft) => {
      const matchIndex = prevLeft.findIndex(
        (i) => i.id === id && i.local_id === local_id
      );

      if (delta < 0) {
        // - button: returning to left
        if (matchIndex !== -1) {
          return prevLeft.map((item, idx) =>
            idx === matchIndex ? { ...item, quantity: item.quantity + 1 } : item
          );
        } else if (movedItem) {
          return [...prevLeft, { ...movedItem, quantity: 1 }];
        }
      }

      if (delta > 0 && matchIndex !== -1) {
        // + button: reducing from left
        const updated = prevLeft.map((item, idx) =>
          idx === matchIndex ? { ...item, quantity: item.quantity - 1 } : item
        );
        return updated.filter((item) => item.quantity > 0);
      }

      return prevLeft;
    });
  };

  const removeBillItem = (id, local_id) => {
    const toReturn = billItems.find(
      (i) => i.id === id && i.local_id === local_id
    );

    if (toReturn) {
      setSplitBillItems((prevLeft) => {
        const exists = prevLeft.find(
          (i) => i.id === id && i.local_id === local_id
        );
        if (exists) {
          return prevLeft.map((i) =>
            i.id === id && i.local_id === local_id
              ? { ...i, quantity: i.quantity + toReturn.quantity }
              : i
          );
        } else {
          return [...prevLeft, { ...toReturn }];
        }
      });
    }

    setBillItems((prev) =>
      prev.filter((i) => !(i.id === id && i.local_id === local_id))
    );
  };

  const resetSplitBillState = () => {
    setBillItems([]);
    setSplitBillItems(initialSplitBillItems);
    setShowSplitBillModal(false);

    // Reset payment data
    resetPaymentData();
  };

  // Build attribute groups from modalProduct.variants
  const attributeGroups = React.useMemo(() => {
    const groups = {};
    if (modalProduct?.variants) {
      modalProduct.variants.forEach((variant) => {
        variant.combination_details.forEach((attr) => {
          if (!groups[attr.attribute_name]) groups[attr.attribute_name] = [];
          if (
            !groups[attr.attribute_name].some(
              (v) => v.attribute_value_id === attr.attribute_value_id
            )
          ) {
            groups[attr.attribute_name].push({
              attribute_value_id: attr.attribute_value_id,
              attribute_value_name: attr.attribute_value_name,
            });
          }
        });
      });
    }
    return groups;
  }, [modalProduct]);

  // Find selected variant based on selectedAttributes
  const selectedVariant = React.useMemo(() => {
    if (!modalProduct?.variants) return null;
    return modalProduct.variants.find((variant) =>
      variant.combination_details.every(
        (attr) =>
          selectedAttributes[attr.attribute_name] === attr.attribute_value_id
      )
    );
  }, [modalProduct, selectedAttributes]);

  const [selectedProductNewPrice, setSelectedProductNewPrice] = useState("");

  useEffect(() => {
    // let base = selectedVariant
    //   ? Number(selectedVariant.combination_price)
    //   : Number(modalProduct?.price) || 0;
    let base = selectedVariant
      ? Number(selectedVariant.combination_price)
      : Number(modalProduct?.proprice)
        ? Number(modalProduct.proprice)
        : Number(modalProduct?.price) || 0;

    const allAddons = modalProduct?.addons
      ? modalProduct.addons.flatMap((a) => a.addonItems)
      : [];
    const uniqueAddonsMap = new Map();
    allAddons.forEach((addon) => {
      if (!uniqueAddonsMap.has(addon.addonItemId)) {
        uniqueAddonsMap.set(addon.addonItemId, addon);
      }
    });
    const selectedAddons = Array.from(uniqueAddonsMap.values()).filter(
      (addon) => selectedDrinks.includes(addon.addonItemId)
    );
    const addonTotal = selectedAddons.reduce(
      (sum, addon) => sum + Number(addon.addon_item_price || 0),
      0
    );
    setSelectedProductNewPrice((base + addonTotal).toString());
  }, [showModal, selectedVariant, modalProduct, selectedDrinks]);

  // useEffect(() => {
  //   // console.log('ResponsivePOSLayout useEffect triggered - refreshProducts:', refreshProducts, 'onWaiterDetails:', !!onWaiterDetails);
  //   const fetchData = async () => {
  //     try {
  //       // console.log('Making API call to AllProduct...');
  //       const response = await axiosInstance.get(AllProduct);
  //       // console.log('AllProduct API response received:', response.data);
  //       setTblCategoryDetails(response.data.tblCategoryDetails || []);
  //       setMenuCategories(response.data.menus || []);
  //       setProducts(response.data.product || []);
  //       setWaiterDetails && setWaiterDetails(response.data.waiterDetails || []);

  //       if (response.data.service_charge_details) {
  //         setServiceChargeDetails(response.data.service_charge_details);
  //       } else {
  //         setServiceChargeDetails(null);
  //       }

  //       if (typeof onTblCategoryDetails === "function") {
  //         onTblCategoryDetails(response.data.tblCategoryDetails || []);
  //       }

  //       // Clear localStorage data for committed tables when in table view
  //       if (currentView === "tables") {
  //         const existingOrderList =
  //           JSON.parse(localStorage.getItem("orderList")) || {};
  //         const updatedOrderList = {};

  //         // Get all tables from the response
  //         const allTables = [];
  //         if (
  //           response.data.tblCategoryDetails &&
  //           Array.isArray(response.data.tblCategoryDetails)
  //         ) {
  //           response.data.tblCategoryDetails.forEach((category) => {
  //             if (
  //               category.table_categoryName_data &&
  //               Array.isArray(category.table_categoryName_data)
  //             ) {
  //               allTables.push(...category.table_categoryName_data);
  //             }
  //           });
  //         }

  //         // Keep data only for free tables (pos_committed === 0) and no orderId
  //         Object.keys(existingOrderList).forEach((tableId) => {
  //           const table = allTables.find(
  //             (t) => (t.id || t.table_id) == tableId
  //           );
  //           if (table && table.pos_committed === 0) {
  //             updatedOrderList[tableId] = existingOrderList[tableId];
  //           }
  //           // else: do not copy, so it is deleted
  //         });

  //         localStorage.setItem("orderList", JSON.stringify(updatedOrderList));
  //         // console.log(
  //         //   "localStorage cleaned after AllProduct response: kept data for free tables, removed data for committed tables"
  //         // );
  //       }

  //       if (typeof onWaiterDetails === "function") {
  //         onWaiterDetails(response.data.waiterDetails || []);
  //       }
  //       setLoadingTables(false);
  //       setLoadingMenu(false);
  //       setFullLoader(false); // Hide loader when API call completes successfully
  //     } catch (err) {
  //       console.error("AllProduct API error:", err);
  //       setTblCategoryDetails([]);
  //       setMenuCategories([]);
  //       setProducts([]);
  //       setLoadingTables(false);
  //       setLoadingMenu(false);
  //       setFullLoader(false); // Hide loader when API call fails
  //       setErrorTables(err);
  //       setErrorMenu(err);
  //       Toaster(err.message || "Something went wrong");
  //     }
  //   };
  //   fetchData();
  // }, [onWaiterDetails, refreshProducts]);

  useEffect(() => {
    const fetchSettledData = async () => {
      try {
        // Get today's date in YYYY-MM-DD format
        // const today = new Date();
        // const yyyy = today.getFullYear();
        // const mm = String(today.getMonth() + 1).padStart(2, "0");
        // const dd = String(today.getDate()).padStart(2, "0");
        // const dateStr = `${yyyy}-${mm}-${dd}`;
        const url = `${SetledAndUnsetledAmount}`;
        const res = await axiosInstance.get(url);
        // console.log("Settled/Unsettled API Response:", res.data); // Debug log
        setSettledData(res?.data?.data);
      } catch (err) {
        // console.log("Settled/Unsettled API Error:", err); // Debug log
        console.error(err);
        setSettledData({ unsettled: 0 });
      }
    };
    fetchSettledData();
  }, []);

  console.log(settledData, "utftu");

  // Expose openTableModal to parent
  useEffect(() => {
    if (onRequestTableModal) {
      onRequestTableModal(() => setTableModalOpen(true));
    }
  }, [onRequestTableModal]);

  // Sidebar logic
  const tableCategories = [
    "All",
    ...tblCategoryDetails.map((cat) => cat.table_categoryName),
  ];

  // TablesGrid logic
  const categoryNames = tblCategoryDetails.map((cat) => cat.table_categoryName);
  const filteredCategories = ["All", ...categoryNames];
  const categoriesToShow =
    selectedCategory === "All"
      ? tblCategoryDetails
      : tblCategoryDetails.filter(
        (cat) => cat.table_categoryName === selectedCategory
      );

  // Removed localStorage logic - tablesWithOrders is now always empty
  const tablesWithOrders = React.useMemo(() => {
    return new Set(); // Always return empty set since we don't use localStorage
  }, []);

  // const getColorStyle = (table) => {
  //   // Highest priority: exact status combinations
  //   if (table.pos_committed === 1 && table.kot_committed === 1) {
  //     return { backgroundColor: "#dc2626", color: "#fff" }; // Red - POS + KOT
  //   } else if (table.qr_committed === 1 && table.pos_committed === 1) {
  //     return { backgroundColor: "#3b82f6", color: "#fff" }; // Grey - QR + POS
  //   } else if (
  //     table.pos_committed === 1 &&
  //     table.kot_committed !== 1 &&
  //     table.qr_committed !== 1
  //   ) {
  //     return { backgroundColor: "#f59e0b", color: "#fff" }; // Yellow - POS only
  //   }

  //   // Check if table is free (pos_committed === 0) and has data in localStorage
  //   if (table.pos_committed === 0) {
  //     const tableId = table.id || table.table_id;
  //     if (tableId) {
  //       const existingOrderList =
  //         JSON.parse(localStorage.getItem("orderList")) || {};
  //       const savedOrder = existingOrderList[tableId];
  //       if (savedOrder && savedOrder.orders && savedOrder.orders.length > 0) {
  //         return { backgroundColor: "#10b981", color: "#fff" }; 
  //       }
  //     }
  //   }

  //   // Default: empty table
  //   return { backgroundColor: "#d1d5db", color: "#000" }; // Light Grey
  // };

  const getColorStyle = (table) => {
    let bgColor = "#d1d5db"; // Default
    let textColor = "#000";
    let hoverColor = "#9ca3af"; // Default dark grey

    if (table.pos_committed === 1 && table.kot_committed === 1) {
      bgColor = "#dc2626"; // Red
      textColor = "#fff";
      hoverColor = "#b91c1c"; // Darker red
    } else if (table.qr_committed === 1 && table.pos_committed === 1) {
      bgColor = "#3b82f6"; // Blue
      textColor = "#fff";
      hoverColor = "#2563eb"; // Darker blue
    } else if (
      table.pos_committed === 1 &&
      table.kot_committed !== 1 &&
      table.qr_committed !== 1
    ) {
      bgColor = "#f59e0b"; // Yellow
      textColor = "#fff";
      hoverColor = "#d97706"; // Darker yellow
    } else if (table.pos_committed === 0) {
      const tableId = table.id || table.table_id;
      if (tableId) {
        const existingOrderList =
          JSON.parse(localStorage.getItem("orderList")) || {};
        const savedOrder = existingOrderList[tableId];
        if (savedOrder && savedOrder.orders && savedOrder.orders.length > 0) {
          bgColor = "#10b981"; // Green
          textColor = "#fff";
          hoverColor = "#059669"; // Darker green
        }
      }
    }

    return {
      backgroundColor: bgColor,
      color: textColor,
      "--hover-color": hoverColor,
    };
  };


  const darkenColor = (hex, percent) => {
    const num = parseInt(hex.replace("#", ""), 16);
    let r = (num >> 16) - 255 * percent;
    let g = ((num >> 8) & 0x00ff) - 255 * percent;
    let b = (num & 0x0000ff) - 255 * percent;

    r = Math.max(0, Math.min(255, Math.floor(r)));
    g = Math.max(0, Math.min(255, Math.floor(g)));
    b = Math.max(0, Math.min(255, Math.floor(b)));

    return `rgb(${r}, ${g}, ${b})`;
  };



  const isTableEligibleForSplitBill = (table) => {
    return (
      table.pos_committed === 1 &&
      table.kot_committed !== 1 &&
      table.qr_committed !== 1
    );
  };

  const isEligibleForVoidBill = (savedOrder) => {
    return !(
      savedOrder &&
      Array.isArray(savedOrder.orders) &&
      savedOrder.orders.length > 0
    );
  };

  const isTableEmpty = (table) => {
    if (!table || table.pos_committed !== 0) return false;

    const tableId = table.id || table.table_id;
    const orderList = JSON.parse(localStorage.getItem("orderList")) || {};
    const savedOrder = orderList[tableId];

    return !(savedOrder && savedOrder.orders && savedOrder.orders.length > 0);
  };

  const menuProducts =
    selectedCategory === "All"
      ? products
      : products.filter((prod) => {
        const menu = menuCategories.find((m) => m.menu_id === prod.menu_id);
        return menu && menu.menu_name === selectedCategory;
      });

  // Calculator keypad handler
  const handleKeypadClick = (val) => {
    if (val === "C") {
      setEnteredPasscode("");
    } else if (val === "<") {
      setEnteredPasscode((prev) => prev.slice(0, -1));
    } else if (enteredPasscode.length < 6) {
      setEnteredPasscode((prev) => prev + val);
    }
  };

  // console.log("pendingTable", pendingTable);

  // Remove kotGroups and groupByKOT logic
  const handleSplitBill = () => {
    if (selectedTable && typeof openSplitBillModalFromSidebar === "function") {
      openSplitBillModalFromSidebar(selectedTable);
      setShowSettlePaidModal(false);
    } else {
      console.warn("openSplitBillModalFromSidebar is not available");
    }
  };

  const handleFinalPayment = async () => {
    try {
      const payload = {
        table_id: selectedTable?.id,
        payments: paymentEntries,
        total: total,
      };

      setFullLoader(true);
      const response = await axiosInstance.post("/api/payment/settle", payload);

      if (response.data.status === "success") {
        Toaster.success("Payment successful");
        setShowSettlePaidModal(false);
        handlePaymentSuccess(); // optional: refresh state
      } else {
        Toaster.error("Failed to complete payment");
      }
    } catch (error) {
      console.error(error);
      Toaster.error("Something went wrong");
    } finally {
      setFullLoader(false);
    }
  };

  const handleSettleBillPasscodeSubmit = async () => {
    if (!settlePasscode) {
      Toaster.error("Please enter passcode");
      return;
    }

    setSettleLoading(true);
    setFullLoader(true);

    try {
      const payload = {
        passcode: settlePasscode,
        table_id: pendingTable?.id,
        table_status: pendingTable?.pos_committed,
      };

      console.log("Sending payload:", payload);

      const response = await axiosInstance.post(PassCodeAPI, payload);

      if (response.data?.status === "success") {
        Toaster.success(response.data.message || "Access granted");
        setShowSettlePasscodeModal(false);
        setSettlePasscode("");

        // Set the bill data and calculate totals
        if (response.data.kot_details && response.data.kot_details.length > 0) {
          setSettleBillData(response.data);

          // Get discount and service charge details from first item
          const firstItem = response.data.kot_details[0];
          const discountType = firstItem.discount_type || 0;
          const discountValue = parseFloat(firstItem.discount_value) || 0;
          const schPercent = firstItem.order_service_charge?.percentage || 0;

          // Calculate bill totals
          const calculations = calculateSettleBillTotal(
            response.data.kot_details,
            discountType,
            discountValue,
            schPercent
          );

          setSettleBillCalculations(calculations);

          // Reset payment entries for new bill and set total amount
          setPaymentEntries([]);


          
          setCurrentPayment({
            method: "cash",
            amount: calculations.total.toFixed(2),
            tip: "",
            upiSubMethod: "",
            transactionId: "",
          });
          setPaymentMethod("cash");
        }

        setShowSettlePaidModal(true);
      } else {
        Toaster.error(response.data?.message || "Incorrect passcode");
        setSettlePasscode("");
      }
    } catch (error) {
      console.error("Passcode submit error:", error);
      Toaster.error(error?.response?.data?.message || "Something went wrong");
    } finally {
      setSettleLoading(false);
      setFullLoader(false);
    }
  };

  const handlePasscodeSubmit = async () => {
    if (!enteredPasscode) {
      Toaster.error("Please enter passcode");
      return;
    }
    setPasscodeLoading(true);
    try {
      setFullLoader(true);
      const appData = await getAppDataFromDB();
      const productList = appData?.product || [];
      console.log(productList, "IndexDB productList")
      setProducts(productList || []);

      //  Check if passcode matches any product.id
      // const match = productList.find(
      //   (p) => String(p.id) === String(enteredPasscode)
      // );

      // if (!match) {

      //   window.location.reload(true);
      //   return;
      // }

      const payload = {
        passcode: enteredPasscode,
        table_id: pendingTable?.id,
        table_status: pendingTable?.pos_committed,
      };
      const response = await axiosInstance.post(PassCodeAPI, payload);
      const { invoice_number, order_no } = response.data
      console.log(invoice_number, "invoice_number123")
      if (response.data && response.data.status === "success") {
        // Set service charge only if order_service_charge exists in response data
        // console.log("response.data", response.data.kot_details[0].order_service_charge);
        if (response.data.kot_details[0]?.order_service_charge) {
          setServiceChargeDetails(
            response.data.kot_details[0].order_service_charge || {}
          );
        }




        if (response.data.table_no) {
          setTablenotoprint(response.data.table_no);
        }

        if (response.data.message) {
          Toaster.success(response.data.message);
        } // Set order items from backend
        if (
          Array.isArray(response.data.kot_details) &&
          response.data.kot_details.length > 0
        ) {
          // Ensure packaging charges are set for delivery/counter items
          const processedItems = response.data.kot_details.map((item) => ({
            ...item,
            packaging_charges:
              orderMode === "DELIVERY" || orderMode === "COUNTER"
                ? item.packaging_charges || "0" // Default to ₹0 if not set
                : item.packaging_charges || "0",
          }));
          setOrderItems(processedItems);
          setIsNC(response.data.is_nc);
          // Extract customer details from first kot_details item if present
          const firstKot = response.data.kot_details[0];
          if (firstKot) {
            setCustomerDetails({
              name: firstKot.eater_name || "",
              mobile: firstKot.eater_phonenumber || "",
              address: firstKot.address || "",
              eater_suggestions: firstKot.eater_suggestions || "",
            });
            // Set discount value and mode from backend if available
            if (firstKot.discount_value !== undefined) {
              setDiscountValue(parseFloat(firstKot.discount_value) || 0);
            }
            if (firstKot.discount_type !== undefined) {
              setDiscountMode(parseInt(firstKot.discount_type) || 0);
            }
          }
        } else {
          // If no backend data, check localStorage for saved order
          const tableId = pendingTable?.id || pendingTable?.table_id;
          if (tableId) {
            const existingOrderList =
              JSON.parse(localStorage.getItem("orderList")) || {};
            const savedOrder = existingOrderList[tableId];
            if (
              savedOrder &&
              savedOrder.orders &&
              savedOrder.orders.length > 0 &&
              savedOrder.orders[0].KOT_no === ""
            ) {
              // Ensure packaging charges are set for delivery/counter items
              const processedOrders = savedOrder.orders.map((item) => ({
                ...item,
                packaging_charges:
                  orderMode === "DELIVERY" || orderMode === "COUNTER"
                    ? item.packaging_charges || "0" // Default to ₹5 if not set
                    : item.packaging_charges || "0",
              }));
              setOrderItems(processedOrders);
              console.log(
                `Loaded order data from localStorage for table ${tableId}:`,
                savedOrder.orders
              );
              // Restore other order-related state if available
              if (savedOrder.service_charge_details) {
                setServiceChargeDetails(savedOrder.service_charge_details);
              }
              if (savedOrder.staff) {
                onStaffDetails && onStaffDetails(savedOrder.staff);
                setStaffDetails(savedOrder.staff);
              }
              if (savedOrder.discountValues) {
                setDiscountValue(
                  parseFloat(savedOrder.discountValues.rate) || 0
                );
                setDiscountMode(parseInt(savedOrder.discountValues?.type) || 0);
              }
              if (savedOrder.orderNo) {
                setOrderNo(savedOrder.orderNo);
              }
              if (savedOrder.orderId) {
                // Note: orderId is handled in OrderSidebar component
              }
            }
          }
        }

        // If print intent is set, call print logic directly and reset state
        if (pendingPrint) {
          // Extract customer details from first kot item if available
          const firstKot = response.data.kot_details[0] || {};
          const extractedCustomerDetails = {
            name: firstKot.eater_name || "",
            mobile: firstKot.eater_phonenumber || "",
            address: firstKot.address || "",
            eater_suggestions: firstKot.eater_suggestions || "",
          };

          // Extract invoice_no from API
          const rawInvoice = response.data?.invoice_no || "";
          // If it comes like "Bill No.4425", clean it to just "4425"
          const invoice_number = rawInvoice || "";
          const order_numbers = response.data?.order_no || "";
          const date_creation = response.data?.order_creation_date || ""

          console.log("Invoice number from API:", invoice_number);


          // Call direct print with backend data
          await handleDirectPrintBill(
            response.data.kot_details,
            extractedCustomerDetails,
            pendingTable,
            firstKot.order_service_charge,
            response.data.is_nc,
            invoice_number,
            date_creation


          );




          // Reset print intent and close modal
          setPendingPrint(false);
          setShowPasscodeModal(false);
          setEnteredPasscode("");
          setPendingTable(null);
          return; // Don't proceed with normal table navigation
        }

        setShowPasscodeModal(false);
        setEnteredPasscode("");

        if (pendingTable) {
          onTableClick({
            ...pendingTable,
            table_categoryName: findCategoryNameForTable(pendingTable),
          });
          setPendingTable(null);
        }
        if (onStaffLogin && response.data.staff?.staff_name) {
          onStaffLogin(response.data.staff.staff_name);
          onStaffDetails(response.data.staff);
          setStaffDetails(response.data.staff);
        }
        if (onPasscodeSuccess) onPasscodeSuccess();
        if (pendingMode && setCurrentMode) setCurrentMode(pendingMode);
      } else {
        // Handle fail status - refresh table data and close modal
        if (response.data?.status === 'fail') {
          try {
            // Refresh real-time table data
            const realTimeRes = await axiosInstance.get('/api/products/realtimetabledata');
            setTblCategoryDetails(realTimeRes.data.tblCategoryDetails || []);

            // Close passcode modal
            setShowPasscodeModal(false);
            setEnteredPasscode("");
            setPendingTable(null);

            Toaster.error(response.data?.message || "Operation failed");
          } catch (refreshError) {
            console.error("Failed to refresh table data:", refreshError);
            Toaster.error("Failed to refresh table data");
          }
        } else {
          Toaster.error(response.data?.message || "Some error occured");
          setEnteredPasscode("");
          if (setCurrentMode) setCurrentMode("DINE IN");
        }




      }
      return { invoice_number, order_no };
    } catch (err) {
      console.log("err", err);
      Toaster.error(err.response?.data?.message || "Some error occured");
      setEnteredPasscode("");
      if (setCurrentMode) setCurrentMode("DINE IN");
    } finally {
      setPasscodeLoading(false);
      setFullLoader(false);
    }
  };

  function findCategoryNameForTable(table) {
    for (const cat of tblCategoryDetails) {
      if (cat.table_categoryName_data.some((t) => t.id === table.id)) {
        return cat.table_categoryName;
      }
    }
    return "";
  }

  // Helper to check if table id is in localStorage orderList
  function isTableInLocalStorage(table) {
    const orderList = JSON.parse(localStorage.getItem("orderList")) || {};
    const tableId = table.id || table.table_id;
    return !!orderList[tableId];
  }

  // Responsive layout
  // Mobile: Sidebar collapses to top, tables/menu below
  // Tablet: Sidebar collapses to top, tables/menu below
  // Desktop: Sidebar left, tables/menu center

  const passcodeInputRef = useRef(null);

  useEffect(() => {
    if (showPasscodeModal && passcodeInputRef.current) {
      passcodeInputRef.current.focus();
    }
  }, [showPasscodeModal]);

  React.useEffect(() => {
    if (modalProduct?.variants && Object.keys(attributeGroups).length > 0) {
      const initialSelected = {};
      Object.entries(attributeGroups).forEach(([groupName, values]) => {
        if (values.length > 0) {
          initialSelected[groupName] = values[0].attribute_value_id;
        }
      });
      setSelectedAttributes(initialSelected);
    }
  }, [modalProduct, attributeGroups]);

  React.useEffect(() => {
    setSelectedDrinks([]);
  }, [selectedAttributes]);

  useEffect(() => {
    const handleKeyUp = (event) => {
      if (event.key === "Enter") {
        // console.log("Enter key pressed");
        // console.log(isModal);

        if (showModal) {
          // alert("Enter key detected while modal is open");

          const button = document.getElementById("item_add_button");
          if (button) {
            button.click(); // Trigger button click
          }
        }
      }
    };

    window.addEventListener("keyup", handleKeyUp);

    return () => {
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [showModal]); // Add `isModal` as a dependency

  // Update contextMenu state to include direction
  const [contextMenu, setContextMenu] = useState({
    show: false,
    x: 0,
    y: 0,
    table: null,
    direction: "down",
  });
  const contextMenuRef = useRef(null);

  const MENU_HEIGHT = 180; // 5 items * ~52px each (adjust if needed)
  const MENU_MARGIN = 8;

  // Close context menu on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        contextMenuRef.current &&
        !contextMenuRef.current.contains(event.target)
      ) {
        setContextMenu({
          show: false,
          x: 0,
          y: 0,
          table: null,
          direction: "down",
        });
      }
    };
    if (contextMenu.show) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [contextMenu.show]);

  // Update right-click handler to set direction
  // const handleTableRightClick = (e, table) => {
  //   e.preventDefault();
  //   const viewportHeight = window.innerHeight;
  //   const spaceBelow = viewportHeight - e.clientY;
  //   const direction = spaceBelow < MENU_HEIGHT + MENU_MARGIN ? "up" : "down";
  //   setContextMenu({
  //     show: true,
  //     x: e.clientX,
  //     y: e.clientY,
  //     table,
  //     direction,
  //   });
  // };

  const handleTableRightClick = (e, table) => {
    e.preventDefault();

    // 🚫 Block menu for green tables
    if (table.pos_committed === 0) {
      const tableId = table.id || table.table_id;
      if (tableId) {
        const existingOrderList = JSON.parse(localStorage.getItem("orderList")) || {};
        const savedOrder = existingOrderList[tableId];
        if (savedOrder && savedOrder.orders && savedOrder.orders.length > 0) {
          return; // Don't open context menu
        }
      }
    }

    // 📏 Direction calculation
    let direction;
    if (table.pos_committed === 1 && table.kot_committed === 1) {
      // 🔴 Red table → always down
      direction = "down";
    } else {
      const viewportHeight = window.innerHeight;
      const spaceBelow = viewportHeight - e.clientY;
      direction = spaceBelow < MENU_HEIGHT + MENU_MARGIN ? "up" : "down";
    }
      const viewportHeight = window.innerHeight;
  const menuHeight = contextMenuRef.current?.offsetHeight || MENU_HEIGHT;

  // अगर नीचे की जगह कम है तो menu ऊपर खुलेगा
    direction =
    viewportHeight - e.clientY < menuHeight + MENU_MARGIN ? "up" : "down";


    // ✅ Show menu
    setContextMenu({
      show: true,
      x: e.clientX,
      y: e.clientY,
      table,
      direction,
    });
  };



  const { socket, socketId } = useSocketContext();

  const handleContextMenuAction = async (action) => {
    const table = contextMenu.table;
    switch (action) {
      case "view":
        // if (table.qr_committed === 1 && table.pos_committed === 1) {
        //   Toaster.error("Table booked from another system");
        //   return;
        // }
        setPendingTable(table);
        setShowPasscodeModal(true);
        break;
      case "void-bill":
        console.log(table);
        setVoidBillTable(table);
        setShowVoidBillModal(true);
        setVoidBillPasscode("");
        break;
      // case "split-bill":
      //   console.log("split-bill");

      //   break;
      case "split-bill":
        setPendingTable(table);
        setShowSplitBillPasscodeModal(true); // Open passcode modal
        break;

      case "switch-table":
        if (table.pos_committed === 1) {
          setSwitchTableOldTable(table);
          setShowSwitchTableModal(true);
        } else if (table.pos_committed === 0 && isTableInLocalStorage(table)) {
          // Switch locally: move order in localStorage to new table after selection
          setSwitchTableOldTable(table);
          setShowSwitchTableModal(true);
        } else {
          // Do nothing (option should not be shown anyway)
          return;
        }
        break;
      case "print-bill":
        // Set print intent and open passcode modal
        setPendingTable(table);
        setPendingPrint(true);
        setShowPasscodeModal(true);
        break;
      default:
        break;
    }
    setContextMenu({ show: false, x: 0, y: 0, table: null, direction: "down" });
  };

  const handleSplitBillPasscodeSubmit = async () => {
    if (!splitBillPasscode) {
      Toaster.error("Please enter passcode");
      return;
    }
    if (!pendingTable) return;
    // setSplitBillLoading(true);

    try {
      setFullLoader(true);
      const payload = {
        passcode: splitBillPasscode,
        table_id: pendingTable?.id,
        table_status: pendingTable?.pos_committed,
      };
      const response = await axiosInstance.post(PassCodeAPI, payload);

      // if (response.data?.status === "success") {
      //   Toaster.success(response.data?.message || "Access granted");
      //   setShowSplitBillPasscodeModal(false);
      //   setSplitBillPasscode("");
      //   setShowSplitBillModal(true);
      // }
      if (response.data?.status === "success") {
        Toaster.success(response.data?.message || "Access granted");
        setShowSplitBillPasscodeModal(false);
        setSplitBillPasscode("");

        // ✅ Call GET API to fetch split bill data
        try {
          setFullLoader(true);
          // setSplitBillLoadingData(true);

          const getResponse = await axiosInstance.get(
            `${GetOrderItemsSpilitBill}/${pendingTable?.id}`
          );

          const items = getResponse.data?.data || [];
          const bills = getResponse.data?.bills || [];
          const invoice_number = getResponse.data?.invoice_no || "";   // "Bill No.4425"
          const order_number = getResponse.data?.order_no || "";       // 105

          console.log("Invoice number from API:", invoice_number);
          console.log("Order number from API:", order_number);

          setSplitBillItems(items);

          // ✅ Set saved bills for UI display (bill_no, amount_total)
          if (Array.isArray(bills)) {
            setSavedBills(bills);
          }

          // ✅ Extract and store orderNo and orderId
          // ✅ Extract and store orderNo and orderId
          if (items.length > 0) {
            setSplitOrderNo(items[0].orderNo);
            setSplitOrderId(items[0].orderId);
          } else if (bills.length > 0) {
            setSplitOrderNo(bills[0].order_no); // or leave unchanged
            setSplitOrderId(bills[0].order_id);
          }

          console.log("splitOrderNo", splitOrderNo);
          console.log("splitOrderId", splitOrderId);

          // ✅ Extract and store orderNo from first item (if available)
          // if (items.length > 0 && items[0].orderNo) {
          //   setSplitOrderNo(items[0].orderNo);
          //   setSplitOrderId(items[0].orderId);
          // }

          setShowSplitBillModal(true);


          console.log("**********sch3")


          if (items.length > 0 && items[0].order_service_charge) {
            setSchValue({
              name: items[0].order_service_charge.name || "",
              percentage: items[0].order_service_charge.percentage || 0,
            });
          } else {
            setSchValue({ name: "", percentage: 0 });
          }

          if (items.length > 0 && items[0].discount_value) {
            // setSplitbilldiscountvalue(items[0].discount_value || 0);
            // setSplitbilldiscountType(items[0].discount_type || 0);
          } else {
            setSplitbilldiscountvalue(0);
            setSplitbilldiscountType(0);
          }

          if (getResponse.data?.last_bill_no) {
            // console.log(getResponse.data?.last_bill_no);
            setLastsplitbillno(getResponse.data.last_bill_no);


          } else {
            setLastsplitbillno(null);
          }
        } catch (err) {
          Toaster.error(
            err?.response?.data?.message || "Failed to load split bill data"
          );
        } finally {
          // setSplitBillLoadingData(false);
          setFullLoader(false);
        }
      } else {
        Toaster.error(response.data?.message || "Incorrect passcode");
        setSplitBillPasscode("");
      }
    } catch (err) {
      Toaster.error(err.response?.data?.message || "Something went wrong");
      setSplitBillPasscode("");
    } finally {
      setFullLoader(false);
    }
  };

  // Handler for void-bill passcode submit
  const handleVoidBillSubmit = async () => {
    if (!voidBillPasscode) {
      Toaster.error("Please enter passcode");
      return;
    }
    if (!voidBillTable) return;
    setVoidBillLoading(true);
    setFullLoader && setFullLoader(true);



    try {
      const appData = await getAppDataFromDB();
      const fooderidfromindexDb = appData?.fooder_id || null;
      const payload = {
        table_id: voidBillTable.id || voidBillTable.table_id,
        fooder_id: fooderidfromindexDb,
        passcode: voidBillPasscode,
      };
      const response = await axiosInstance.post(VoidBillAPI, payload);
      if (response.data && response.data.status === "success") {
        Toaster.success(response.data.message || "Bill voided successfully");

        // Clear localStorage data for the voided table
        const tableId = voidBillTable.id || voidBillTable.table_id;
        if (tableId) {
          const existingOrderList =
            JSON.parse(localStorage.getItem("orderList")) || {};
          delete existingOrderList[tableId];
          localStorage.setItem("orderList", JSON.stringify(existingOrderList));
          console.log(
            `Order data cleared from localStorage for table ${tableId} after void bill`
          );
        }

        // Refresh products/tables
        if (typeof setRefreshProducts === "function") {
          setRefreshProducts((prev) => !prev);
        }
        setShowVoidBillModal(false);
        setVoidBillTable(null);
        setVoidBillPasscode("");
      } else {
        Toaster.error(response.data?.message || "Failed to void bill");
      }
    } catch (err) {
      Toaster.error(err.response?.data?.message || "Failed to void bill");
    } finally {
      setVoidBillLoading(false);
      setFullLoader && setFullLoader(false);
    }
  };

  // Track which mode was requested for passcode
  const [pendingMode, setPendingMode] = useState(null);

  // When passcode modal is opened for DELIVER/COUNTER, set pendingMode
  useEffect(() => {
    if (
      showPasscodeModal &&
      (orderMode === "DELIVERY" || orderMode === "COUNTER")
    ) {
      setPendingMode(orderMode);
    }
    // If modal is closed, reset pendingMode
    if (!showPasscodeModal) {
      setPendingMode(null);
    }
  }, [showPasscodeModal, orderMode]);

  // Add state for switch table modal
  const [showSwitchTableModal, setShowSwitchTableModal] = useState(false);
  const [switchTableOldTable, setSwitchTableOldTable] = useState(null);
  const [switchTableNewTable, setSwitchTableNewTable] = useState(null);
  const [switchTablePasscode, setSwitchTablePasscode] = useState("");
  const [showSwitchTablePasscodeModal, setShowSwitchTablePasscodeModal] =
    useState(false);
  const [switchTableLoading, setSwitchTableLoading] = useState(false);

  // Handler for switch table passcode submit
  const handleSwitchTablePasscodeSubmit = async () => {
    if (!switchTablePasscode) {
      Toaster.error("Please enter passcode");
      return;
    }
    if (!switchTableOldTable || !switchTableNewTable || !switchTablePasscode)
      return;
    setSwitchTableLoading(true);
    try {
      const payload = {
        old_table_id: switchTableOldTable.id || switchTableOldTable.table_id,
        new_table_id: switchTableNewTable.id || switchTableNewTable.table_id,
        passcode: switchTablePasscode,
      };
      const response = await axiosInstance.post(
        "/api/table/switchtablefromtableview",
        payload
      );
      if (response.data && response.data.status === "success") {
        Toaster.success(response.data.message || "Table switched successfully");
        setShowSwitchTableModal(false);
        setShowSwitchTablePasscodeModal(false);
        setSwitchTableOldTable(null);
        setSwitchTableNewTable(null);
        setSwitchTablePasscode("");
        // Optionally refresh tables/products here
        setRefreshProducts(Date.now());
      } else {
        Toaster.error(response.data?.message || "Failed to switch table");
      }
    } catch (err) {
      Toaster.error(err.response?.data?.message || "Failed to switch table");
    } finally {
      setSwitchTableLoading(false);
    }
  };

  // console.log("switchTableOldTable", switchTableOldTable);

  const allFreeTables = tblCategoryDetails
    .flatMap((cat) =>
      Array.isArray(cat.table_categoryName_data)
        ? cat.table_categoryName_data
        : []
    )
    .filter(
      (table) =>
        !table.pos_committed &&
        (!switchTableOldTable ||
          (table.id !== switchTableOldTable.id &&
            table.table_id !== switchTableOldTable.table_id))
    );

  // Add this state at the top of the component
  const [addInProgress, setAddInProgress] = useState(false);
  // Add at the top of the component
  const [modalLoading, setModalLoading] = useState(false);
  // Add at the top of the component
  const [modalReady, setModalReady] = useState(false);

  // Reset addInProgress when modal closes
  useEffect(() => {
    if (!showModal) setAddInProgress(false);
  }, [showModal]);

  // useEffect to set modalReady true only when modalProduct and selectedProductNewPrice are set
  useEffect(() => {
    if (showModal && modalProduct && selectedProductNewPrice !== "") {
      setModalReady(true);
    } else {
      setModalReady(false);
    }
  }, [showModal, modalProduct, selectedProductNewPrice]);
  // Local handler for adding to order
  const handleAddToOrder = async () => {
    if (addInProgress) return;
    // Check if order has been generated for delivery/counter modes
    if (orderId && (orderMode === "DELIVERY" || orderMode === "COUNTER")) {
      Toaster.error("Can't add products after order is generated");
      return;
    }

    setAddInProgress(true);

    const productToAdd = { ...modalProduct };
    console.log(productToAdd, "productToadd**");
    // 🔹 Check if productToAdd.id exists in IndexedDB product list
    // const appData = await getAppDataFromDB();
    // const productList = appData?.product || [];
    // console.log(productList, "IndexDB productList");

    // const match = productList.find(
    //   (p) => Number(p.id) === Number(productToAdd.id)
    // );

    // if (!match) {
    //   // Product not found in DB → reload page
    //   window.location.reload();
    //   return;
    // }

    //   const appData = await getAppDataFromDB();
    // const productList = appData?.product || [];
    // console.log(productList, "IndexDB productList");

    // const match = productList.find((p) => {
    //   const productId = Number(productToAdd.id);
    //   const dbId = Number(p.id);
    //   return !isNaN(productId) && !isNaN(dbId) && dbId === productId;
    // });



    // if (!match) {
    //   // Product not found in DB → reload page
    //   window.location.reload();
    //   return;
    // }

    const appData = await getAppDataFromDB();
    const productList = appData?.product || [];
    console.log(productList, "IndexDB productList");

    const productId = Number(productToAdd.id);
    const productprice = parseFloat(productToAdd.price);
    const productproprice = parseFloat(productToAdd.proprice);

    const match = productList.find(p => Number(p.id) === productId);

    if (!match) {
      // No product with matching ID → reload
      window.location.reload();
      return;
    }

    // Price from DB
    // const dbPrice = parseFloat(match.price);

    // // If any price value is NaN → reload
    // if ([productprice, productproprice, dbPrice].some(val => isNaN(val))) {
    //   window.location.reload();
    //   return;
    // }

    // ✅ Both match found and prices are valid → continue




    const priceToAdd = Number(selectedProductNewPrice) || 0;
    const quantityToAdd = modalQuantity;
    const noteToAdd = modalNote;
    const selectedAddonsToAdd = [...selectedDrinks];
    const variantToAdd = selectedVariant;
    const staffDetailsToAdd = staffDetails;
    const selectedTableId = selectedTable?.id || "";
    const allAddons = productToAdd?.addons
      ? productToAdd.addons.flatMap((a) => a.addonItems)
      : [];
    const uniqueAddonsMap = new Map();
    allAddons.forEach((addon) => {
      if (!uniqueAddonsMap.has(addon.addonItemId)) {
        uniqueAddonsMap.set(addon.addonItemId, addon);
      }
    });
    const selectedAddons = Array.from(uniqueAddonsMap.values()).filter(
      (addon) => selectedAddonsToAdd.includes(addon.addonItemId)
    );
    setShowModal(false); // Close modal immediately
    setTimeout(() => {

      if (onAddToOrder && productToAdd) {
        const orderItem = {
          ...productToAdd,
          variant: variantToAdd,
          addons: selectedAddons,
          quantity: quantityToAdd,
          note: noteToAdd,
          price: priceToAdd,
          total: priceToAdd * quantityToAdd,
          local_id: productToAdd.local_id || Date.now(),
          fooder_id: productToAdd.fooder_id,
          table_id: selectedTableId,
          fooder_name: productToAdd.fooder_name || "",
          product_special_note: noteToAdd || "",
          isKOT: productToAdd.isKOT || false,
          isSaved: productToAdd.isSaved || false,
          KOT_id: productToAdd.KOT_id || "",
          KOT_no: productToAdd.KOT_no || "",
          KOT_time: productToAdd.KOT_time || "",
          selectedAddons: selectedAddons,
          selectedvariants: variantToAdd || { variantId: "0" },
          staffDetails: staffDetailsToAdd,
          // Set packaging charges for delivery/counter modes
          packaging_charges:
            orderMode === "DELIVERY" || orderMode === "COUNTER"
              ? productToAdd.packaging_charges || "5" // Default to ₹5 per item if not set
              : "0",
          withOutTaxPrice:
            productToAdd.tax_type === 0 || productToAdd.tax_type === "0"
              ? parseFloat(priceToAdd)
              : (parseFloat(priceToAdd) * parseFloat(100)) /
              (parseFloat(100) + parseFloat(productToAdd.tax_percent)),
        };
        onAddToOrder(orderItem);
      }
      setAddInProgress(false);
      setModalQuantity(1); // Reset to 1 after add
      setModalProduct(null); // Optionally reset modalProduct
    }, 0);
  };

  const isAddDisabled =
    addInProgress ||
    modalLoading ||
    !modalReady ||
    !modalProduct ||
    // Variant selection required
    (modalProduct.variants &&
      modalProduct.variants.length > 0 &&
      !selectedVariant) ||
    // Price must be valid and > 0
    !selectedProductNewPrice ||
    isNaN(Number(selectedProductNewPrice)) ||
    Number(selectedProductNewPrice) <= 0 ||
    // Required addons logic (if any group has a minimum > 0, check selection)
    (modalProduct.addons &&
      modalProduct.addons.some(
        (group) =>
          group.minimum_item > 0 &&
          selectedVariant &&
          group.addonVariantId === selectedVariant.variantId &&
          group.addonItems.filter((item) =>
            selectedDrinks.includes(item.addonItemId)
          ).length < group.minimum_item
      ));

  useEffect(() => {
    if (!socket) return;
    const handler = (data) => {
      if (data.socketId === socketId) return;
      if (currentView === "tables") {
        setRefreshProducts && setRefreshProducts(Date.now());
      }
    };
    socket.on("table_booked", handler);
    return () => socket.off("table_booked", handler);
  }, [socket, socketId, currentView, setRefreshProducts]);

  let minQty = 1;
  let minOrderQty = 1;
  if (modalProduct) {
    const parsedMin = Number(modalProduct.min_order_quantity);
    minQty = !isNaN(parsedMin) && parsedMin > 0 ? parsedMin : 1;
    minOrderQty = minQty;
  }

  // Add this before the return statement in the component:
  const splitBillCalc = calculateSplitBillTotal(
    billItems,
    splitbilldiscountType,
    splitbilldiscountvalue,
    Number(schValue.percentage)
  );
  // console.log("Split Bill Per-Item Calculation:", splitBillCalc.items);

  // Set default payment amount when splitBillCalc is available and payment tab is active
  useEffect(() => {
    if (
      activeTab === "payment" &&
      splitBillCalc?.total &&
      !currentPayment.amount
    ) {
      const dueAmount = Math.max(
        0,
        Number(splitBillCalc.total || 0) -
        paymentEntries.reduce((sum, p) => sum + Number(p.amount || 0), 0)
      );
          
      

      setCurrentPayment((prev) => ({
        ...prev,
        amount: dueAmount.toFixed(2),
      }));
    }
  }, [splitBillCalc?.total, activeTab, paymentEntries]);

  // Add this useEffect to control canCreateNewBill based on billItems and selectedBill
  useEffect(() => {
    if (billItems.length === 0 || selectedBill) {
      setCanCreateNewBill(true);
    } else {
      setCanCreateNewBill(false);
    }
  }, [billItems, selectedBill]);

  // Listen for splitBillModalTrigger from parent (Dashboard)
  useEffect(() => {
    // Only proceed if splitBillModalTrigger is actually triggered (not just recreated)
    if (
      splitBillModalTrigger &&
      splitBillModalTrigger.count > 0 &&
      splitBillModalTrigger.table &&
      !showSplitBillModal && // Prevent opening if already open
      splitBillModalTrigger.count > prevSplitBillCountRef.current // Only trigger if count actually increased
    ) {
      // Fetch split bill data for the given table, set state, and open modal (skip passcode)
      const fetchAndOpenSplitBill = async () => {
        try {
          setFullLoader(true);
          const getResponse = await axiosInstance.get(
            `${GetOrderItemsSpilitBill}/${splitBillModalTrigger.table.id}`
          );
          const items = getResponse.data?.data || [];
          const bills = getResponse.data?.bills || [];

          setSplitBillItems(items);
          if (Array.isArray(bills)) {
            setSavedBills(bills);
          }
          // if (items.length > 0 && items[0].orderNo) {
          //   setSplitOrderNo(items[0].orderNo);
          //   setSplitOrderId(items[0].orderId);
          // }

          // ✅ Extract and store orderNo and orderId
          if (items.length > 0) {
            setSplitOrderNo(items[0].orderNo);
            setSplitOrderId(items[0].orderId);
          } else if (bills.length > 0) {
            setSplitOrderNo(bills[0].order_no);
            setSplitOrderId(bills[0].order_id);
          }

          setPendingTable(splitBillModalTrigger.table);
          setShowSplitBillModal(true);

          if (items.length > 0 && items[0].order_service_charge) {
          console.log("**********sch5")

            setSchValue({
              name: items[0].order_service_charge.name || "",
              percentage: items[0].order_service_charge.percentage || 0,
            });
          } else {
            setSchValue({ name: "", percentage: 0 });
          }

          if (items.length > 0 && items[0].discount_value) {
            // setSplitbilldiscountvalue(items[0].discount_value || 0);
            // setSplitbilldiscountType(items[0].discount_type || 0);
          } else {
            setSplitbilldiscountvalue(0);
            setSplitbilldiscountType(0);
          }

          if (getResponse.data?.last_bill_no) {
            setLastsplitbillno(getResponse.data.last_bill_no);
          } else {
            setLastsplitbillno(null);
          }
        } catch (err) {
          Toaster.error(
            err?.response?.data?.message || "Failed to load split bill data"
          );
        } finally {
          setFullLoader(false);
        }
      };
      fetchAndOpenSplitBill();
      // Update the ref to track the current count
      prevSplitBillCountRef.current = splitBillModalTrigger.count;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [splitBillModalTrigger]);

  const handleFinalizeSplitBill = () => {
    if (!splitBillItems || splitBillItems.length === 0) {
      Toaster.error("No items to finalize.");
      return;
    }

    // Move all splitBillItems to billItems
    const mergedItems = [...billItems]; // copy existing right items

    splitBillItems.forEach((item) => {
      const index = mergedItems.findIndex(
        (i) => i.id === item.id && i.local_id === item.local_id
      );
      if (index !== -1) {
        mergedItems[index].quantity += item.quantity;
      } else {
        mergedItems.push({ ...item });
      }
    });

    setBillItems(mergedItems); // right section
    setSplitBillItems([]); // clear left section
    setActiveTab("items"); // switch to "items" tab if needed

    // Optional: Toast confirmation
    Toaster.success("Items finalized to the bill.");
  };

  useEffect(() => {
    if (!showSplitBillModal) {
 

      setCurrentPayment({
        method: paymentMethod,
        amount: "",
        tip: "",
        upiSubMethod: "",
        transactionId: "",
      });
    }
  }, [showSplitBillModal]);

  useEffect(() => {
    setPaymentMethod("Cash");

    const due = Math.max(
      0,
      Number(splitBillCalc?.total || 0) -
      paymentEntries.reduce((sum, p) => sum + Number(p.amount || 0), 0)
    ).toFixed(2);
          console.log("*********************14")

    setCurrentPayment({
      method: "Cash",
      amount: due,
      tip: "",
      upiSubMethod: "",
      transactionId: "",
    });
  }, [splitBillCalc?.total]);

  // useEffect(() => {
  //   if (currentView === "menu") {
  //     setSelectedCategory("All");

  //     console.log("**********************");
  //     console.log(selectedTable);

  //     if (selectedTable?.type === 2) {
  //       let productCount = 0;
  //       const filteredMenus = menusDB.reduce((acc, menu) => {
  //         const foreignProducts = products.filter(
  //           (p) =>
  //             p.menu_id === menu.menu_id &&
  //             p.is_foreign === 1 &&
  //             p.dine_in_service === 1
  //         );
  //         if (foreignProducts.length > 0) {
  //           productCount += foreignProducts.length;
  //           acc.push({
  //             ...menu,
  //             product_count: foreignProducts.length,
  //           });
  //         }
  //         return acc;
  //       }, []);

  //       setMenuCategories(filteredMenus);
  //       // setMenuProductsCount(productCount);
  //     } else {
  //       let productCount = 0;
  //       const filteredMenus = menusDB.reduce((acc, menu) => {
  //         const foreignProducts = products.filter(
  //           (p) =>
  //             p.menu_id === menu.menu_id &&
  //             p.is_foreign !== 1 &&
  //             p.dine_in_service === 1
  //         );
  //         if (foreignProducts.length > 0) {
  //           productCount += foreignProducts.length;
  //           acc.push({
  //             ...menu,
  //             product_count: foreignProducts.length,
  //           });
  //         }
  //         return acc;
  //       }, []);

  //       setMenuCategories(filteredMenus);
  //       // setMenuProductsCount(productCount);
  //     }
  //   }
  // }, [currentView]);

  useEffect(() => {
    if (currentView === "menu") {
      setSelectedCategory("All");

      let productCount = 0;
      const filteredMenus = menusDB.reduce((acc, menu) => {
        const filteredProducts = products.filter((p) => {
          const baseCondition =
            p.menu_id === menu.menu_id &&
            (selectedTable?.type === 2
              ? p.is_foreign === 1
              : p.is_foreign !== 1);

          // Delivery mode → केवल delivery_service
          if (orderMode === "DELIVERY") {
            return baseCondition && p.delivery_service === 1;
          }

          // Counter mode → केवल pick_up_service
          if (orderMode === "COUNTER") {
            return baseCondition && p.pick_up_service === 1;
          }

          // Default dine-in mode
          return baseCondition && p.dine_in_service === 1;
        });

        if (filteredProducts.length > 0) {
          productCount += filteredProducts.length;
          acc.push({
            ...menu,
            product_count: filteredProducts.length,
          });
        }
        return acc;
      }, []);

      setMenuCategories(filteredMenus);
      // setMenuProductsCount(productCount);
    }
  }, [currentView, orderMode, selectedTable, menusDB, products]);




  return (
    <>
      <div className="responsive-pos-layout d-flex flex-column flex-md-row  h-100">
        {/* Sidebar */}
        <aside
          className=" bg-white border-end p-3"
          style={{ minWidth: "260px", maxWidth: "200px", height: "auto" }}
        >
          {currentView === "tables" ? (

            <div
              className="d-flex flex-column justify-content-between"
              style={{ height: "100vh" }} // Not minHeight!
            >
              {/* Top Content */}
              <div>
                <h2 className="h5 fw-semibold text-dark mb-4">Tables Category </h2>

                <div className="d-flex flex-wrap gap-2 mb-4">
                  {tableCategories.map((category) => (
                    <button
                      key={category}
                      className={`btn btn-sm category-filter ${selectedCategory === category ? "active" : ""
                        }`}
                      onClick={() => setSelectedCategory(category)}
                    >
                      {category}
                    </button>
                  ))}
                </div>

                <div
                  className="d-flex flex-wrap gap-4 small text-muted mb-4"
                  style={{ fontSize: "13px" }}
                >
                  <LegendDot color="#d1d5db" label="Blank" />
                  <LegendDot color="#2563eb" label="Booked" />
                  <LegendDot color="#10b981" label="Running" />
                  <LegendDot color="#dc2626" label="Running KOT" />
                  <LegendDot color="#f59e0b" label="Printed" />
                </div>
                {staffType === 1 && (
                  <div className="text-muted mb-4" style={{ fontSize: "15px", color: "#1f2937" }}>
                    Today Settled Amount:
                    <strong style={{ color: "#10b981" }}>
                      ₹{!isNaN(Number(settledData?.settled_amount)) ? Number(settledData.settled_amount).toFixed(2) : '0.00'}
                    </strong>,
                    Unsettled Amount:
                    <strong style={{ color: "#dc2626" }}>
                      ₹{!isNaN(Number(settledData?.unsettled_amount)) ? Number(settledData.unsettled_amount).toFixed(2) : '0.00'}
                    </strong>
                  </div>
                )
                }




                <div
                  style={{
                    position: "fixed",
                    bottom: 0,
                    minWidth: "200px", width: "inherit",
                    padding: "10px 0",
                    textAlign: "center",
                    fontFamily: "Arial, sans-serif",

                    color: "#444",

                    background: "#fff",
                    marginTop: "300px",
                  }}
                >
                  {/* <div >
                    <strong>VYFOO Version:</strong>{" "}
                    <span style={{ color: "#000" }}>v1.0</span>
                  </div> */}
                  <div style={{ marginTop: "4px", }}>

                    <strong>VYFOO Version: <span style={{ color: "#000" }}>v1.0</span></strong><br />
                    © {new Date().getFullYear()}<br /><strong style={{ fontSize: "10px" }}><Link to="https://vyqda.com/" target="_blank" rel="noopener noreferrer" className="vyqda-link">Vyqda</Link> Technologies Pvt. Ltd. All Rights Reserved.</strong>
                  </div>
                </div>
              </div>



            </div>

          ) : (
            <div
              className="custom-scroll"
              style={{
                maxHeight: "calc(100vh - 150px)",
                overflowY: "auto",
                scrollbarWidth: "thin",
                msOverflowStyle: "none",
                paddingRight: "8px",
              }}
            >
              {/* All Menu Box */}
              <div
                className="p-3 rounded mt-1"
                style={{
                  backgroundColor: selectedCategory === "All" ? "#f59e0b" : "#fff",
                  color: selectedCategory === "All" ? "#fff" : "#232019",
                  cursor: "pointer",
                  // marginBottom: "15px",
                  borderRadius: "10px",
                }}
                onClick={() => setSelectedCategory("All")}
              >
                <div style={{ fontSize: "16px", fontWeight: 600 }}>All Menu</div>
                <div style={{ fontSize: "14px", opacity: selectedCategory === "All" ? 0.9 : 1 }}>
                  {menuCategories.reduce((sum, cat) => sum + (cat.product_count || 0), 0)} Items
                </div>
              </div>

              {/* Other Menu Categories */}
              <nav className="d-flex flex-column gap-2">
                {menuCategories.map((category) => {
                  const isSelected = selectedCategory === category.menu_name;
                  return (
                    <div
                      key={category.menu_id}
                      className="p-3"
                      style={{
                        backgroundColor: isSelected ? "#f59e0b" : "#fff",
                        color: isSelected ? "#fff" : "#232019",
                        cursor: "pointer",
                        borderRadius: "10px",
                        width: "208px",
                        boxShadow: isSelected ? "0 1px 4px rgba(0,0,0,0.2)" : "none",
                      }}
                      onClick={() => setSelectedCategory(category.menu_name)}
                    >
                      <div
                        style={{
                          fontWeight: 600,
                          fontSize: "15px",
                          marginBottom: "2px",
                        }}
                      >
                        {category.menu_name}
                      </div>
                      <div
                        style={{
                          fontSize: "14px",
                          color: isSelected ? "#fff" : "#555454",
                        }}
                      >
                        {category.product_count} Items
                      </div>
                    </div>
                  );
                })}
              </nav>
            </div>

          )}
        </aside>

        {/* Main Content */}
        <main
          className="flex-grow-1  d-flex flex-column p-2 custom-scroll"
          style={{ minHeight: 0, overflow: "auto", backgroundColor: "#f3f4f6", }}
        >
          {currentView === "tables" ? (
            loadingTables ? (
              <div className="d-flex justify-content-center align-items-center vh-100">
                <div className="spinner-border text-primary" role="status">
                  <span className="visually-hidden">Loading...</span>
                </div>
              </div>
            ) : (
              <div className="position-relative h-100 p-2" >
                {categoriesToShow.map((category) => (
                  <section
                    key={category.id || category.table_categoryName}
                    className="mb-5"

                  >
                    <h5 className="fw-semibold text-dark mb-3">
                      {category.table_categoryName}
                    </h5>
                    <div className="row row-cols-3 row-cols-md-3 row-cols-lg-5 g-3">
                      {category.table_categoryName_data.map((table) => {
                        const {
                          id,
                          table_no,
                          table_name,
                          pos_committed,
                          created_by,
                        } = table;
                        const displayName =
                          table_no !== undefined &&
                            table_no !== null &&
                            table_no !== ""
                            ? table_no
                            : table_name || "";


                        return (
                          <div key={`table-${id}`} className="col">
                            <div


                              onClick={() => {

                                // if (
                                //   table.qr_committed === 1 &&
                                //   table.pos_committed === 1
                                // ) {
                                //   Toaster.error(
                                //     "Table booked from another system"
                                //   );
                                //   return;
                                // }
                                setPendingTable(table);
                                setShowPasscodeModal(true);
                              }}
                              onContextMenu={(e) => {

                                staffType === 1 ? handleTableRightClick(e, table) : <></>


                              }

                              }
                              className={`rounded text-center position-relative p-3 d-flex flex-column justify-content-center align-items-center table-box ${selectedTable && selectedTable.id === table.id ? "selected-table" : ""
                                }`}
                              style={{
                                cursor: "pointer",
                                minHeight: "90px",
                                ...getColorStyle(table),
                                // ✅ Fixed width for responsiveness
                                maxWidth: "100%", // Prevents overflow
                                wordBreak: "break-word",
                                marginBottom: "20px",
                                textAlign: "center",
                              }}
                            >


                              {pos_committed &&
                                !(
                                  table.qr_committed === 1 &&
                                  table.pos_committed === 1
                                ) ? (
                                <div className="position-absolute top-0 end-0 m-1 d-flex gap-1">

                                  {/* <div
                                    className="d-flex align-items-center justify-content-center text-dark"
                                    style={{ width: 24, height: 24 }}
                                  >
                                    <FaEye size={14} />
                                  </div> */}


                                  {table.is_split === 1 && (
                                    <div
                                      className="d-flex align-items-center justify-content-center text-dark"
                                      style={{ width: 24, height: 24 }}
                                    >
                                      <i
                                        className="bi bi-terminal-split"
                                        style={{ fontSize: 14 }}
                                      ></i>
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <div className="position-absolute top-0 end-0 m-2 d-flex gap-1 text-white"></div>
                              )}
                              <div style={{ fontSize: "1.25rem", fontWeight: 700, lineHeight: "1.75rem" }}>{displayName}</div>
                              {created_by?.staff_name && (
                                <div
                                  style={{ fontSize: "1.4em", fontWeight: 500 }}
                                >
                                  {created_by.staff_name}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </section>
                ))}
              </div>
            )
          ) : loadingMenu ? (
            <div className="d-flex justify-content-center align-items-center vh-100">
              <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">Loading...</span>
              </div>
            </div>
          ) : (
            <div className="d-flex flex-column h-100">
              <div className="p-2 pb-2">
                <div className="position-relative">
                  <input
                    type="text"
                    className="form-control ps-5"
                    placeholder="Search Here"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                  <FaSearch className="position-absolute top-50 start-0 translate-middle-y ms-3 text-muted" style={{ fontSize: "14px" }} />
                  {searchTerm && (
                    <IoClose
                      className="position-absolute top-50 end-0 translate-middle-y me-3 text-danger"
                      style={{ cursor: "pointer" }}
                      onClick={() => setSearchTerm("")}
                      size={19}
                    />
                  )}
                </div>
              </div>
              <div className="flex-grow-1 px-2 pb-2">
  {(() => {
    // Filter products based on search term AND service availability
    const filteredProducts = menuProducts.filter((prod) => {
      // First filter by search term
      if (!prod.name.toLowerCase().includes(searchTerm.toLowerCase())) {
        return false;
      }
      
      // Then filter based on order mode and table type
      if (selectedTable?.type !== 2) {
        if (prod.is_foreign === 1) return false;
        
        // Check service availability based on order mode
        if (orderMode === "DELIVERY" && prod.delivery_service !== 1) return false;
        if (orderMode === "COUNTER" && prod.pick_up_service !== 1) return false;
        if (orderMode === "DINE IN" && prod.dine_in_service !== 1) return false;
      } else {
        if (selectedTable?.type === 2) {
          if (prod.is_foreign === 0) return false;
        } else {
          return false;
        }
      }
      
      return true;
    });

    // Show "No Product Found" if no products match all criteria
    if (filteredProducts.length === 0) {
      return (
        <div className="text-center text-muted mt-5">
          <h5>No Product Found</h5>
        </div>
      );
    }

    // Render the products that match all criteria
    return (
      <div className="row row-cols-1 row-cols-md-2 row-cols-lg-4 g-3">
        {filteredProducts.map((prod) => (
          <div key={prod.id} className="col">
            <div
              className="menu-item-card bg-white p-3 rounded shadow-sm border h-100 d-flex flex-column justify-content-between"
              onClick={() => {
                // Check if order has been generated for delivery/counter modes
                if (
                  orderId &&
                  (orderMode === "DELIVERY" || orderMode === "COUNTER")
                ) {
                  Toaster.error("Can't add products after order is generated");
                  return;
                }

                const minQty = Number(prod.min_order_quantity);
                setModalQuantity(!isNaN(minQty) && minQty > 0 ? minQty : 1);
                setModalProduct(prod);
                setModalNote("");
                setSelectedDrinks([]);
                setShowModal(true);
                setModalLoading(false);
              }}
            >
              {/* Title */}
              <h4
                className="mb-2"
                style={{
                  color: "#232019",
                  fontSize: "17px",
                  fontWeight: 500,
                  wordBreak: "break-word",
                }}
              >
                {prod.name}
              </h4>

              {/* Bottom: Price + Dot */}
              <div className="d-flex align-items-center justify-content-between mt-auto pt-2">
                <span
                  style={{
                    fontSize: "1.1rem",
                    fontWeight: 600,
                    color:
                      prod.product_type === 0
                        ? "#00bf63"
                        : prod.product_type === 1
                        ? "#f44336"
                        : prod.product_type === 2
                        ? "#ffbd59"
                        : "#111",
                  }}
                >
                  {prod.proprice && parseFloat(prod.proprice) < parseFloat(prod.price) ? (
                    <>
                      ₹{parseFloat(prod.proprice)}{" "}
                      <s
                        style={{
                          color:
                            prod.product_type === 0
                              ? "#00bf63"
                              : prod.product_type === 1
                              ? "#f44336"
                              : prod.product_type === 2
                              ? "#ffbd59"
                              : "#111",
                        }}
                      >
                        ₹{parseFloat(prod.price)}
                      </s>
                    </>
                  ) : (
                    <>₹{parseFloat(prod.price)}</>
                  )}
                </span>

                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: 22,
                    height: 22,
                    backgroundColor:
                      prod.product_type === 0
                        ? "#00bf63" // Green
                        : prod.product_type === 1
                        ? "#f44336" // Red
                        : prod.product_type === 2
                        ? "#ffbd59" // Yellow
                        : "#111", // Default dark
                    borderRadius: "50%",
                    color: "#fff",
                    fontWeight: "bold",
                    fontSize: 14,
                    cursor: "pointer",
                  }}
                >
                  +
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  })()}
</div>
               
              
              {/* Modal for product selection */}
              <Modal
                show={showModal && modalProduct}
                onHide={() => setShowModal(false)}
                centered
                size="lg"
              >
                {modalLoading ? (
                  <div
                    className="d-flex justify-content-center align-items-center"
                    style={{ minHeight: 200 }}
                  >
                    <Spinner animation="border" />
                  </div>
                ) : (
                  <>
                    <Modal.Header closeButton>
                      <Modal.Title>{modalProduct?.name}</Modal.Title>
                    </Modal.Header>
                    <Modal.Body>
                      {/* Add this block to define minQty and minOrderQty */}
                      {/* End of new block */}

                      {/* Variant Attribute Groups */}
                      {Object.entries(attributeGroups).map(
                        ([groupName, values], groupIdx) => {
                          // Show price on the second variant group (if 2+ groups) or first group (if only 1 group)
                          const shouldShowPrice =
                            Object.keys(attributeGroups).length === 1
                              ? groupIdx === 0
                              : groupIdx === 1;

                          return (
                            <div className="mb-3" key={groupName}>
                              <div className="fw-semibold mb-2">
                                {groupName}
                              </div>
                              <div className="d-flex gap-3 flex-wrap">
                                {values.map((val) => {
                                  // For the second variant group, find the variant that combines the selected first variant with this second variant value
                                  let variantPrice = modalProduct?.price || 0;

                                  if (
                                    shouldShowPrice &&
                                    Object.keys(attributeGroups).length > 1
                                  ) {
                                    // Find the variant that has both the selected first variant AND this second variant value
                                    const firstGroupName =
                                      Object.keys(attributeGroups)[0];
                                    const selectedFirstValue =
                                      selectedAttributes[firstGroupName];

                                    const matchingVariant =
                                      modalProduct?.variants?.find((variant) =>
                                        variant.combination_details.every(
                                          (attr) => {
                                            if (
                                              attr.attribute_name ===
                                              firstGroupName
                                            ) {
                                              return (
                                                attr.attribute_value_id ===
                                                selectedFirstValue
                                              );
                                            } else if (
                                              attr.attribute_name === groupName
                                            ) {
                                              return (
                                                attr.attribute_value_id ===
                                                val.attribute_value_id
                                              );
                                            }
                                            return true; // For any other attribute groups, accept any value
                                          }
                                        )
                                      );

                                    variantPrice =
                                      matchingVariant?.combination_price ||
                                      modalProduct?.price ||
                                      0;
                                  } else if (
                                    shouldShowPrice &&
                                    Object.keys(attributeGroups).length === 1
                                  ) {
                                    // For single variant group, find the variant with this specific value
                                    const variantWithThisValue =
                                      modalProduct?.variants?.find((variant) =>
                                        variant.combination_details.some(
                                          (attr) =>
                                            attr.attribute_name === groupName &&
                                            attr.attribute_value_id ===
                                            val.attribute_value_id
                                        )
                                      );
                                    variantPrice =
                                      variantWithThisValue?.combination_price ||
                                      modalProduct?.price ||
                                      0;
                                  }

                                  return (
                                    <div
                                      key={val.attribute_value_id}
                                      className={`p-3 rounded ${selectedAttributes[groupName] ===
                                          val.attribute_value_id
                                          ? "bg-warning text-white"
                                          : "bg-light"
                                        }`}
                                      style={{
                                        cursor: "pointer",
                                        minWidth: 100,
                                        textAlign: "center",
                                      }}
                                      onClick={() =>
                                        setSelectedAttributes({
                                          ...selectedAttributes,
                                          [groupName]: val.attribute_value_id,
                                        })
                                      }
                                    >
                                      <div className="fw-bold" style={{ fontSize: "15px" }}>
                                        {val.attribute_value_name}
                                      </div>
                                      {shouldShowPrice && (
                                        <div className="small mt-1" style={{ fontSize: "15px", fontWeight: "30px" }}>
                                          ₹{variantPrice}
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        }
                      )}
                      {/* Addons Section: Show only when a valid variant is selected and for the correct variantId */}
                      {selectedVariant && modalProduct?.addons ? (
                        modalProduct?.addons
                          .filter(
                            (addonGroup) =>
                              addonGroup.addonVariantId === selectedVariant.variantId
                          )
                          .map((addonGroup, idx) => (
                            <div className="mb-3" key={idx}>
                              <div className="fw-semibold mb-2" style={{ fontSize: "15px" }}>
                                {addonGroup.addon_group_name}
                              </div>
                              <div className="d-flex gap-3 flex-wrap">
                                {addonGroup.addonItems.map((addon) => {
                                  const isSelected = selectedDrinks.includes(
                                    addon.addonItemId
                                  );
                                  return (
                                    <div
                                      key={addon.addonItemId}
                                      className={`p-3 rounded ${isSelected ? "bg-warning text-white" : "bg-light"
                                        }`}
                                      style={{
                                        cursor: "pointer",
                                        minWidth: 100,
                                        textAlign: "center",
                                      }}
                                      onClick={() => {
                                        const max = addonGroup.maximum_item || 0;
                                        const selectedInGroup = addonGroup.addonItems
                                          .map((item) => item.addonItemId)
                                          .filter((id) => selectedDrinks.includes(id));

                                        if (
                                          !isSelected &&
                                          max > 0 &&
                                          selectedInGroup.length >= max
                                        ) {
                                          Toaster.error(
                                            `You can select up to ${max} item(s) in this group.`
                                          );
                                          return;
                                        }

                                        if (isSelected) {
                                          setSelectedDrinks(
                                            selectedDrinks.filter(
                                              (id) => id !== addon.addonItemId
                                            )
                                          );
                                        } else {
                                          setSelectedDrinks([
                                            ...selectedDrinks,
                                            addon.addonItemId,
                                          ]);
                                        }
                                      }}
                                    >
                                      <div className="fw-bold" style={{ fontSize: "15px" }}>
                                        {addon.addon_item_name}
                                      </div>
                                      <div style={{ fontSize: "15px" }}>
                                        ₹{addon.addon_item_price}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          ))
                      ) : (
                        modalProduct?.addons

                          .map((addonGroup, idx) => (
                            <div className="mb-3" key={idx}>
                              <div className="fw-semibold mb-2" style={{ fontSize: "15px" }}>
                                {addonGroup.addon_group_name}
                              </div>
                              <div className="d-flex gap-3 flex-wrap">
                                {addonGroup.addonItems.map((addon) => {
                                  const isSelected = selectedDrinks.includes(
                                    addon.addonItemId
                                  );
                                  return (
                                    <div
                                      key={addon.addonItemId}
                                      className={`p-3 rounded ${isSelected ? "bg-warning text-white" : "bg-light"
                                        }`}
                                      style={{
                                        cursor: "pointer",
                                        minWidth: 100,
                                        textAlign: "center",
                                      }}
                                      onClick={() => {
                                        const max = addonGroup.maximum_item || 0;
                                        const selectedInGroup = addonGroup.addonItems
                                          .map((item) => item.addonItemId)
                                          .filter((id) => selectedDrinks.includes(id));

                                        if (
                                          !isSelected &&
                                          max > 0 &&
                                          selectedInGroup.length >= max
                                        ) {
                                          Toaster.error(
                                            `You can select up to ${max} item(s) in this group.`
                                          );
                                          return;
                                        }

                                        if (isSelected) {
                                          setSelectedDrinks(
                                            selectedDrinks.filter(
                                              (id) => id !== addon.addonItemId
                                            )
                                          );
                                        } else {
                                          setSelectedDrinks([
                                            ...selectedDrinks,
                                            addon.addonItemId,
                                          ]);
                                        }
                                      }}
                                    >
                                      <div className="fw-bold" style={{ fontSize: "15px" }}>
                                        {addon.addon_item_name}
                                      </div>
                                      <div style={{ fontSize: "15px" }}>
                                        ₹{addon.addon_item_price}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          ))
                      )}





                      
                      <Form.Group className="mb-3">
                        <Form.Control
                          as="textarea"
                          rows={2}
                          maxLength={200}
                          placeholder="Special Note (optional)"
                          value={modalNote}
                          onChange={(e) => setModalNote(e.target.value)}
                        />
                        <div className="text-end small text-muted">
                          {modalNote.length}/200
                        </div>
                      </Form.Group>




<div className="mb-3">
                        <div className="d-flex align-items-center gap-2">
                          <Button
                            variant="outline-secondary"
                            onClick={() =>
                              setModalQuantity((qty) =>
                                Math.max(minOrderQty, qty - 1)
                              )
                            }
                            disabled={modalQuantity <= minOrderQty}
                          >
                            -
                          </Button>
                          <span>{modalQuantity}</span>
                          <Button
                            variant="outline-secondary"
                            onClick={() => setModalQuantity((qty) => qty + 1)}
                          >
                            +
                          </Button>
                        </div>
                      </div>




                      {/* Price and Add button */}
                      <div className="mt-4 d-flex align-items-center justify-content-between">
                        <div style={{ display: "flex", alignItems: "center" }}>
                          <span style={{ margin: "0 -4px", fontSize: "15px" }}>Price : </span>&nbsp;
                          <input
                            type="number"
                            min="0"
                            step="1"
                            value={selectedProductNewPrice}
                            onChange={(e) => {
                              let value = e.target.value;
                              if (value === "") value = "0";
                              if (/^\d*\.?\d*$/.test(value)) {
                                value = String(Number(value));
                                setSelectedProductNewPrice(value);
                              }
                            }}
                            style={{
                              width: "140px",           // ⬅️ Increased width
                              height: "35px",           // ⬅️ Increased height
                              textAlign: "center",
                              marginRight: "4px",
                              marginLeft: "4px",
                              border: "1px solid black",
                              borderRadius: "5px",
                              fontSize: "16px",         // ⬅️ Optional: increase font size for better visibility
                            }}
                            onKeyDown={(e) => {
                              if (
                                e.key === "Enter" &&
                                !addInProgress &&
                                !modalLoading
                              ) {
                                handleAddToOrder();
                              }
                            }}
                          />
                          <span style={{ margin: "0 4px", fontSize: "15px" }}>x</span>
                          <span style={{ margin: "0 4px", fontSize: "15px" }}>
                            {modalQuantity}
                          </span>
                          <span style={{ margin: "0 4px", fontSize: "15px" }}>=</span>
                          <h5 style={{ margin: "0 4px" }}>
                            ₹
                            {(selectedProductNewPrice * modalQuantity).toFixed(
                              2
                            )}


                            {/* {parseFloat(prod.proprice) && prod.proprice < prod.price ? (
    <>
      ₹{prod.proprice} <s style={{ color: "#888" }}>₹{prod.price}</s>
    </>
  ) : (
    <>₹{prod.price}</>
  )} */}


                          </h5>
                        </div>
                        <div className="d-flex gap-2">
                          <Button
                            variant="danger"
                            className="ms-2"
                            onClick={() => setShowModal(false)}
                            style={{ minWidth: 60 }}
                          >
                            Cancel
                          </Button>
                          <Button
                            id="item_add_button"
                            variant="warning"
                            className="ms-2 text-white"
                            style={{ minWidth: 60 }}
                            disabled={isAddDisabled}
                            onClick={() => {
                              handleAddToOrder();
                              setSearchTerm("");
                            }}
                          >
                            Add to Order
                          </Button>
                        </div>
                      </div>
                    </Modal.Body>
                  </>
                )}
              </Modal>
            </div>
          )}
        </main>
      </div>
      <style>{`
        @media (max-width: 767.98px) {
          .responsive-pos-layout {
            flex-direction: column !important;
          }
          .sidebar {
            width: 100% !important;
            min-width: 0 !important;
            max-width: 100% !important;
            border-right: none !important;
            border-bottom: 1px solid #eee !important;
          }
        }
        @media (min-width: 768px) {
          .responsive-pos-layout {
            flex-direction: row !important;
          }
          .sidebar {
            width: 280px !important;
            min-width: 220px !important;
            max-width: 320px !important;
            border-right: 1px solid #eee !important;
            border-bottom: none !important;
          }
        }
        .table-status-blank { background: #f0f0ec; }
        .table-status-booked { background: #71c5e8; }
        .table-status-running { background: #6ed398; }
        .table-status-running-kot { background: #e8485a; }
        .table-status-printed { background: #febc1a; }
      `}</style>

      <Modal
        show={showSplitBillPasscodeModal}
        onHide={() => {
          setShowSplitBillPasscodeModal(false);
          setSplitBillPasscode("");
          setPendingTable(null);
        }}
        centered
      >
        <Modal.Header closeButton>
          <Modal.Title>Enter Passcode to Split Bill</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <div className="d-flex flex-column align-items-center">
            <input
              type="password"
              className="form-control mb-3 text-center"
              style={{ width: 180, fontSize: 24, letterSpacing: 8 }}
              value={splitBillPasscode}
              name="split-bill-passcode" // 👈 Use a unique, non-sensitive name
              autoComplete="new-password" // 👈 Prevent browser from suggesting autofill
              inputMode="numeric"
              onChange={(e) => {
                const value = e.target.value.replace(/\D/g, "");
                setSplitBillPasscode(value);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSplitBillPasscodeSubmit();
              }}
              autoFocus
            />
            <div
              className="d-flex flex-wrap justify-content-center"
              style={{ width: 180 }}
            >
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 0].map((num) => (
                <Button
                  key={num}
                  variant="light"
                  className="m-1"
                  style={{ width: 50, height: 50, fontSize: 22 }}
                  onClick={() =>
                    setSplitBillPasscode((prev) =>
                      prev.length < 6 ? prev + num.toString() : prev
                    )
                  }
                >
                  {num}
                </Button>
              ))}
              <Button
                variant="secondary"
                className="m-1"
                style={{ width: 50, height: 50, fontSize: 22 }}
                onClick={() =>
                  setSplitBillPasscode((prev) => prev.slice(0, -1))
                }
              >
                &lt;
              </Button>
              <Button
                variant="danger"
                className="m-1"
                style={{ width: 50, height: 50, fontSize: 22 }}
                onClick={() => setSplitBillPasscode("")}
              >
                C
              </Button>
            </div>
          </div>
        </Modal.Body>
        <Modal.Footer>
          <Button
            variant="secondary"
            onClick={() => {
              setShowSplitBillPasscodeModal(false);
              setSplitBillPasscode("");
              setPendingTable(null);
            }}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleSplitBillPasscodeSubmit}
            disabled={splitBillPasscode.length === 0 || splitBillLoading}
          >
            {splitBillLoading ? "Please wait..." : "Enter"}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Passcode Modal */}
      <Modal
        show={showPasscodeModal}
        onHide={() => {
          setShowPasscodeModal(false);
          setEnteredPasscode("");
          setPendingTable(null);
          setCurrentMode && setCurrentMode("DINE IN");
        }}
        centered
      >
        <Modal.Header closeButton>
          <Modal.Title>Enter Passcode</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <div className="d-flex flex-column align-items-center">
            <input
              ref={passcodeInputRef}
              type="password"
              className="form-control mb-3 text-center"
              style={{ width: 180, fontSize: 24, letterSpacing: 8 }}
              value={enteredPasscode}
              readOnly={false}
              autoComplete="new-password" // 👈 key part
              name="passcode" // 👈 use a non-sensitive, generic name
              inputMode="numeric"
              autoFocus
              onChange={(e) => {
                const value = e.target.value;
                // Allow only digits (0-9)
                const numericValue = value.replace(/\D/g, "");
                setEnteredPasscode(numericValue);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handlePasscodeSubmit();
                }
              }}
            />
            <div
              className="d-flex flex-wrap justify-content-center"
              style={{ width: 180 }}
            >
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 0].map((num, idx) => (
                <Button
                  key={num}
                  variant="light"
                  className="m-1"
                  style={{ width: 50, height: 50, fontSize: 22 }}
                  onClick={() => handleKeypadClick(num.toString())}
                >
                  {num}
                </Button>
              ))}
              <Button
                variant="secondary"
                className="m-1"
                style={{ width: 50, height: 50, fontSize: 22 }}
                onClick={() => handleKeypadClick("<")}
              >
                &lt;
              </Button>
              <Button
                variant="danger"
                className="m-1"
                style={{ width: 50, height: 50, fontSize: 22 }}
                onClick={() => handleKeypadClick("C")}
              >
                C
              </Button>
            </div>
          </div>
        </Modal.Body>
        <Modal.Footer>
          <Button
            variant="secondary"
            onClick={() => {
              setShowPasscodeModal(false);
              setEnteredPasscode("");
              setPendingTable(null);
              setCurrentMode && setCurrentMode("DINE IN");
            }}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handlePasscodeSubmit}
            disabled={enteredPasscode.length === 0 || passcodeLoading}
          >
            {passcodeLoading ? "Please wait..." : "Enter"}
          </Button>
        </Modal.Footer>
      </Modal>
      {/* Passcode Modal for Void Bill */}
      <Modal
        show={showVoidBillModal}
        onHide={() => {
          setShowVoidBillModal(false);
          setVoidBillTable(null);
          setVoidBillPasscode("");
        }}
        centered
      >
        <Modal.Header closeButton>
          <Modal.Title>Enter Passcode to Void Bill</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <div className="d-flex flex-column align-items-center">
            <input
              type="password"
              className="form-control mb-3 text-center"
              style={{ width: 180, fontSize: 24, letterSpacing: 8 }}
              value={voidBillPasscode}
              readOnly={false}
              name="void-passcode" // 👈 Avoid using "password" or similar names
              autoComplete="new-password" // 👈 Tells browser not to autofill
              inputMode="numeric"
              autoFocus
              onChange={(e) => {
                const value = e.target.value;
                // Allow only digits (0-9)
                const numericValue = value.replace(/\D/g, "");
                setVoidBillPasscode(numericValue);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleVoidBillSubmit();
                }
              }}
            />
            <div
              className="d-flex flex-wrap justify-content-center"
              style={{ width: 180 }}
            >
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 0].map((num, idx) => (
                <Button
                  key={num}
                  variant="light"
                  className="m-1"
                  style={{ width: 50, height: 50, fontSize: 22 }}
                  onClick={() =>
                    setVoidBillPasscode((prev) =>
                      prev.length < 6 ? prev + num.toString() : prev
                    )
                  }
                >
                  {num}
                </Button>
              ))}
              <Button
                variant="secondary"
                className="m-1"
                style={{ width: 50, height: 50, fontSize: 22 }}
                onClick={() => setVoidBillPasscode((prev) => prev.slice(0, -1))}
              >
                &lt;
              </Button>
              <Button
                variant="danger"
                className="m-1"
                style={{ width: 50, height: 50, fontSize: 22 }}
                onClick={() => setVoidBillPasscode("")}
              >
                C
              </Button>
            </div>
          </div>
        </Modal.Body>
        <Modal.Footer>
          <Button
            variant="secondary"
            onClick={() => {
              setShowVoidBillModal(false);
              setVoidBillTable(null);
              setVoidBillPasscode("");
            }}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleVoidBillSubmit}
            disabled={voidBillPasscode.length === 0 || voidBillLoading}
          >
            {voidBillLoading ? "Please wait..." : "Void Bill"}
          </Button>
        </Modal.Footer>
      </Modal>
      {/* Switch Table Modal */}
      <Modal
        show={showSwitchTableModal}
        onHide={() => {
          setShowSwitchTableModal(false);
          setSwitchTableOldTable(null);
        }}
        centered
      >
        <Modal.Header closeButton>
          <Modal.Title>Select New Table</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {tblCategoryDetails.map((category) => {
            // Filter out the currently selected table from free tables
            const freeTables = category.table_categoryName_data.filter(
              (table) =>
                table.pos_committed === 0 && table.id !== selectedTable?.id
            );
            if (freeTables.length === 0) return null;
            return (
              <div
                key={category.id || category.table_categoryName}
                className="mb-4"
              >
                <h6 className="mb-3">{category.table_categoryName}</h6>
                <div className="d-flex flex-wrap gap-3">
                  {freeTables.map((table) => (
                    <div
                      key={table.id}
                      className="bg-light rounded px-4 py-2 text-center"
                      style={{ minWidth: "120px", cursor: "pointer" }}
                      onClick={() => {
                        if (
                          switchTableOldTable &&
                          switchTableOldTable.pos_committed === 0 &&
                          isTableInLocalStorage(switchTableOldTable)
                        ) {
                          // Local switch: move order in localStorage
                          const orderList =
                            JSON.parse(localStorage.getItem("orderList")) || {};
                          const oldId =
                            switchTableOldTable.id ||
                            switchTableOldTable.table_id;
                          const newId = table.id || table.table_id;
                          if (orderList[oldId]) {
                            orderList[newId] = {
                              ...orderList[oldId],
                              table_id: newId,
                            };
                            delete orderList[oldId];
                            localStorage.setItem(
                              "orderList",
                              JSON.stringify(orderList)
                            );
                          }
                          setSwitchTableOldTable(null);
                          setSwitchTableNewTable(null);
                          setShowSwitchTableModal(false);
                          setRefreshProducts(Date.now());
                          Toaster.success("Table switched successfully.");
                        } else {
                          // Committed table: require passcode
                          setSwitchTableNewTable(table);
                          setShowSwitchTableModal(false);
                          setShowSwitchTablePasscodeModal(true);
                        }
                      }}
                    >
                      <div style={{ fontSize: "1.2rem" }}>{table.table_no || ""}</div>
                      {table.table_name ? (
                        <div style={{ fontSize: "1.2rem", color: "#888" }}>
                          {table.table_name}
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>
                <hr />
              </div>
            );
          })}
        </Modal.Body>
        <Modal.Footer>
          <Button
            variant="secondary"
            onClick={() => {
              setShowSwitchTableModal(false);
              setSwitchTableOldTable(null);
            }}
          >
            Cancel
          </Button>
        </Modal.Footer>
      </Modal>
      {/* Switch Table Passcode Modal */}
      <Modal
        show={showSwitchTablePasscodeModal}
        onHide={() => {
          setShowSwitchTablePasscodeModal(false);
          setSwitchTablePasscode("");
          setSwitchTableNewTable(null);
        }}
        centered
      >
        <Modal.Header closeButton>
          <Modal.Title>Enter Passcode to Switch Table</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <div className="d-flex flex-column align-items-center">
            <input
              type="password"
              className="form-control mb-3 text-center"
              style={{ width: 180, fontSize: 24, letterSpacing: 8 }}
              value={switchTablePasscode}
              readOnly={false}
              autoFocus
              name="switch-table-passcode" // 👈 Use a non-sensitive, unique name
              autoComplete="new-password" // 👈 Prevent autofill
              inputMode="numeric"
              onChange={(e) => {
                const value = e.target.value;
                // Allow only digits (0-9)
                const numericValue = value.replace(/\D/g, "");
                setSwitchTablePasscode(numericValue);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleSwitchTablePasscodeSubmit();
                }
              }}
              disabled={switchTableLoading}
            />
            <div
              className="d-flex flex-wrap justify-content-center"
              style={{ width: 180 }}
            >
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 0].map((num, idx) => (
                <Button
                  key={num}
                  variant="light"
                  className="m-1"
                  style={{ width: 50, height: 50, fontSize: 22 }}
                  onClick={() =>
                    setSwitchTablePasscode((prev) =>
                      prev.length < 6 ? prev + num.toString() : prev
                    )
                  }
                  disabled={switchTableLoading}
                >
                  {num}
                </Button>
              ))}
              <Button
                variant="secondary"
                className="m-1"
                style={{ width: 50, height: 50, fontSize: 22 }}
                onClick={() =>
                  setSwitchTablePasscode((prev) => prev.slice(0, -1))
                }
                disabled={switchTableLoading}
              >
                &lt;
              </Button>
              <Button
                variant="danger"
                className="m-1"
                style={{ width: 50, height: 50, fontSize: 22 }}
                onClick={() => setSwitchTablePasscode("")}
                disabled={switchTableLoading}
              >
                C
              </Button>
            </div>
          </div>
        </Modal.Body>
        <Modal.Footer>
          <Button
            variant="secondary"
            onClick={() => {
              setShowSwitchTablePasscodeModal(false);
              setSwitchTablePasscode("");
              setSwitchTableNewTable(null);
            }}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleSwitchTablePasscodeSubmit}
          // disabled={switchTablePasscode.length === 0 || switchTableLoading}
          >
            {switchTableLoading ? "Please wait..." : "Switch Table"}
          </Button>
        </Modal.Footer>
      </Modal>

      <Modal
        show={showSettlePasscodeModal}
        onHide={() => {
          setShowSettlePasscodeModal(false);
          setSettlePasscode("");
        }}
        centered
      >
        <div onContextMenu={(e) => e.preventDefault()}>
          <Modal.Header closeButton>
            <Modal.Title>Enter Passcode to Settle Bill</Modal.Title>
          </Modal.Header>

          <Modal.Body>
            <div className="d-flex flex-column align-items-center">
              <input
                type="password"
                className="form-control mb-3 text-center"
                style={{ width: 180, fontSize: 24, letterSpacing: 8 }}
                value={settlePasscode}
                name="settle-passcode" // 👈 use a custom, non-sensitive name
                autoComplete="new-password" // 👈 disables autofill suggestions
                inputMode="numeric"
                onChange={(e) => {
                  const numericValue = e.target.value.replace(/\D/g, ""); // allow digits only
                  setSettlePasscode(numericValue.slice(0, 6)); // limit to 6 digits
                }}
                onKeyDown={(e) => {
                  if (
                    e.key === "Enter" &&
                    settlePasscode.length > 0 &&
                    !settleLoading
                  ) {
                    handleSettleBillPasscodeSubmit();
                  }
                }}
                autoFocus
              />

              <div
                className="d-flex flex-wrap justify-content-center"
                style={{ width: 180 }}
              >
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 0].map((num) => (
                  <Button
                    key={num}
                    variant="light"
                    className="m-1"
                    style={{ width: 50, height: 50, fontSize: 22 }}
                    onClick={() => {
                      if (settlePasscode.length < 6)
                        setSettlePasscode((prev) => prev + num.toString());
                    }}
                  >
                    {num}
                  </Button>
                ))}
                <Button
                  variant="secondary"
                  className="m-1"
                  style={{ width: 50, height: 50, fontSize: 22 }}
                  onClick={() => setSettlePasscode((prev) => prev.slice(0, -1))}
                >
                  &lt;
                </Button>
                <Button
                  variant="danger"
                  className="m-1"
                  style={{ width: 50, height: 50, fontSize: 22 }}
                  onClick={() => setSettlePasscode("")}
                >
                  C
                </Button>
              </div>
            </div>
          </Modal.Body>

          <Modal.Footer>
            <Button
              variant="secondary"
              onClick={() => {
                setShowSettlePasscodeModal(false);
                setSettlePasscode("");
              }}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleSettleBillPasscodeSubmit}
              disabled={settlePasscode.length === 0 || settleLoading}
            >
              {settleLoading ? "Please wait..." : "Enter"}
            </Button>
          </Modal.Footer>
        </div>
      </Modal>

      {contextMenu.show && !isTableEmpty(contextMenu.table) && (
        <div
          ref={contextMenuRef}
          style={{
            position: "fixed",
            left: contextMenu.x,
             top:
      contextMenu.direction === "up"
        ? contextMenu.y - (contextMenuRef.current?.offsetHeight || MENU_HEIGHT)
        : contextMenu.y,
            zIndex: 9999,
            background: "#fff",
            border: "1px solid #e5e7eb",
            borderRadius: 12,
            boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
            minWidth: 210,
            padding: "8px 0",
            transition:
              "opacity 0.18s cubic-bezier(.4,0,.2,1), transform 0.18s cubic-bezier(.4,0,.2,1)",
            opacity: contextMenu.show ? 1 : 0,
            transform: contextMenu.show
              ? "translateY(0px)"
              : contextMenu.direction === "up"
                ? "translateY(10px)"
                : "translateY(-10px)",
            fontFamily: "inherit",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "10px 20px",
              cursor: "pointer",
              fontSize: 15,
              color: "#222",
              transition: "background 0.15s",
              borderBottom: "1px solid #f3f4f6",
            }}
            onClick={() => handleContextMenuAction("view")}
            onMouseEnter={(e) => (e.currentTarget.style.background = "#f3f4f6")}
            onMouseLeave={(e) =>
              (e.currentTarget.style.background = "transparent")
            }
          >
            <FaEye style={{ color: "#2563eb", fontSize: 17 }} />
            <span>View</span>
          </div>


          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "10px 20px",
              cursor: "pointer",
              fontSize: 15,
              color: "#222",
              transition: "background 0.15s",
              borderBottom: "1px solid #f3f4f6",
            }}
            onClick={() => handleContextMenuAction("void-bill")}
            onMouseEnter={(e) => (e.currentTarget.style.background = "#f3f4f6")}
            onMouseLeave={(e) =>
              (e.currentTarget.style.background = "transparent")
            }
          >
            <FaTrashAlt style={{ color: "#ef4444", fontSize: 17 }} />
            <span>Void Bills</span>
          </div>

          {isTableEligibleForSplitBill(contextMenu.table) && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "10px 20px",
                cursor: "pointer",
                fontSize: 15,
                color: "#222",
                transition: "background 0.15s",
                borderBottom: "1px solid #f3f4f6",
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.background = "#f3f4f6")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.background = "transparent")
              }
              onClick={() => {
                if (contextMenu?.table) {
                  setPendingTable(contextMenu.table); // ✅ Set the pending table
                }
                setShowSettlePasscodeModal(true); // ✅ Open the passcode modal
                setContextMenu({
                  show: false,
                  x: 0,
                  y: 0,
                  table: null,
                  direction: "down",
                });
                // openSplitBillModal(selectedTable)
              }}
            >
              <FaMoneyBillAlt style={{ color: "#22c55e", fontSize: 17 }} />
              <span>Settle Bill</span>
            </div>
          )}

          {/* <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: "10px 20px", cursor: "pointer", fontSize: 15, color: '#222', transition: 'background 0.15s', borderBottom: '1px solid #f3f4f6' }}
            onClick={() => handleContextMenuAction("split-bill")}
            onMouseEnter={e => e.currentTarget.style.background = '#f3f4f6'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
          >
            <FaClone style={{ color: '#06b6d4', fontSize: 17 }} />
            <span>Split Bill</span>
          </div> */}
          {/* <div
  style={{
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '10px 20px',
    cursor: 'pointer',
    fontSize: '15px',
    color: '#222',
    transition: 'background 0.2s, color 0.2s',
    borderRadius: '4px',
  }}
  onClick={() => handleContextMenuAction("split-bill")}
  onMouseEnter={(e) => {
    e.currentTarget.style.background = '#f0f9fa';
  }}
  onMouseLeave={(e) => {
    e.currentTarget.style.background = 'transparent';
  }}
>
  <FaClone style={{ color: '#06b6d4', fontSize: '16px' }} />
  <span style={{ fontWeight: '500' }}>Split Bill</span>
</div> */}

          {isTableEligibleForSplitBill(contextMenu.table) && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                padding: "10px 20px",
                cursor: "pointer",
                fontSize: "15px",
                color: "#222",
                borderBottom: "1px solid #f3f4f6",
                transition: "background 0.2s, color 0.2s",
                borderRadius: "4px",
              }}
              onClick={() => handleContextMenuAction("split-bill")}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "#f0f9fa";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "transparent";
              }}
            >
              <FaClone style={{ color: "#06b6d4", fontSize: "16px" }} />
              <span>Split Bill</span>
            </div>
          )}
          {!(contextMenu.table?.pos_committed === 1 && contextMenu.table?.kot_committed === 1) && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "10px 20px",
                cursor: "pointer",
                fontSize: 15,
                color: "#222",
                transition: "background 0.15s",
                borderBottom: "1px solid #f3f4f6",
              }}
              onClick={() => handleContextMenuAction("print-bill")}
              onMouseEnter={(e) => (e.currentTarget.style.background = "#f3f4f6")}
              onMouseLeave={(e) =>
                (e.currentTarget.style.background = "transparent")
              }
            >
              <FaPrint style={{ color: "#06b6d4", fontSize: 17 }} />
              <span>Print Bill</span>
            </div>
          )}
          {contextMenu.table &&
            (
              // 🔴 Red table case → show
              (contextMenu.table.pos_committed === 1 && contextMenu.table.kot_committed === 1) ||

              // 🟦 Blue / Local storage case → show
              (contextMenu.table.qr_committed === 1 && contextMenu.table.pos_committed === 1) ||
              isTableInLocalStorage(contextMenu.table)
            ) && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "10px 20px",
                  cursor: "pointer",
                  fontSize: 15,
                  color: "#222",
                  transition: "background 0.15s",
                  borderBottom: "1px solid #f3f4f6",
                }}
                onClick={() => handleContextMenuAction("switch-table")}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.background = "#f3f4f6")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.background = "transparent")
                }
              >
                <TiArrowRepeat style={{ color: "#06b6d4", fontSize: 17 }} />
                <span>Switch Table</span>
              </div>
            )}
        </div>
      )}

      {/* {showSettlePaidModal && (
  <Modal
    show={true}
    onHide={() => setShowSettlePaidModal(false)}
    size="lg"
    centered
  >
    <Modal.Header closeButton>
      <Modal.Title>Bill Settlement</Modal.Title>
    </Modal.Header>
    <Modal.Body>
      <div className="p-3 custom-scroll" style={{ height: "100%", overflow: "auto" }}>
        <h5 className="fw-bold">Total Amount: ₹ {total}</h5>

        <button className="btn btn-info w-100 mb-3" onClick={handleSplitBill}>
          Split Bill
        </button>

        <div className="form-check form-check-inline mb-2">
          {["Cash", "Card", "NEFT", "UPI", "Zomato", "Swiggy", "Dineout", "Hold"].map((method) => (
            <div className="form-check form-check-inline" key={method}>
              <input
                className="form-check-input"
                type="radio"
                name="paymentOption"
                value={method}
                checked={paymentMethod === method}
                onChange={() => setPaymentMethod(method)}
              />
              <label className="form-check-label ms-1">{method}</label>
            </div>
          ))}
        </div>

        <div className="form-group mt-2">
          <label>Customer Paid</label>
          <div className="input-group">
            <input
              type="number"
              className="form-control"
              value={paidAmount}
              onChange={(e) => setPaidAmount(e.target.value)}
            />
            <span className="input-group-text bg-warning">₹</span>
          </div>
        </div>

        <div className="form-group mt-2">
          <label>Tip</label>
          <div className="input-group">
            <input
              type="number"
              className="form-control"
              value={tipAmount}
              onChange={(e) => setTipAmount(e.target.value)}
            />
            <span className="input-group-text bg-warning">₹</span>
          </div>
        </div>

        <div className="form-group mt-2">
          <label>Transaction / Reference ID</label>
          <input
            type="text"
            className="form-control"
            placeholder="Enter Transaction / Reference ID"
            value={transactionId}
            onChange={(e) => setTransactionId(e.target.value)}
          />
        </div>

        <div className="form-group mt-3">
          <button
            className="btn btn-warning w-100"
            onClick={() => {
              setPaymentEntries((prev) => [
                ...prev,
                {
                  method: paymentMethod,
                  amount: Number(paidAmount),
                  tip: Number(tipAmount),
                  transaction_id: transactionId,
                },
              ]);
              setPaidAmount("");
              setTipAmount("");
              setTransactionId("");
            }}
          >
            Pay
          </button>
        </div>

        <div className="form-group mt-2">
          <label>Due</label>
          <div className="input-group">
            <input
              type="text"
              className="form-control bg-light"
              value={dueAmount}
              readOnly
            />
            <span className="input-group-text bg-warning">₹</span>
          </div>
        </div>

        <table className="table table-bordered mt-3">
          <thead>
            <tr>
              <th>Method</th>
              <th>Amount</th>
              <th>Tip</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {paymentEntries.map((entry, index) => (
              <tr key={index}>
                <td>{entry.method}</td>
                <td>{entry.amount}</td>
                <td>{entry.tip || 0}</td>
                <td>
                  <button
                    className="btn btn-sm btn-danger"
                    onClick={() => {
                      const updated = [...paymentEntries];
                      updated.splice(index, 1);
                      setPaymentEntries(updated);
                    }}
                  >
                    ❌
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="d-flex justify-content-end mt-4">
          <button className="btn btn-success" onClick={handleFinalPayment}>
            Paid
          </button>
        </div>
      </div>
    </Modal.Body>
  </Modal>
)} */}

      {showSettlePaidModal && (
        <Modal
          show={true}
          onHide={() => setShowSettlePaidModal(false)}
          size="lg"
          centered
          className="payment-modal"
        >
          <Modal.Header closeButton className="bg-light">
            <Modal.Title className="fw-bold">Bill Settlement</Modal.Title>
          </Modal.Header>
          <Modal.Body
            className="p-4 custom-scroll"
            style={{ maxHeight: "80vh", overflowY: "auto" }}
          >
            {/* Bill Details */}
            {settleBillData && settleBillData.kot_details && (
              <div className="mb-4">
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <h6 className="fw-bold">Order Details</h6>
                  <span className="text-primary">
                    Order #{settleBillData.kot_details[0]?.orderNo || "N/A"}
                  </span>
                </div>

                <div className="d-flex justify-content-between align-items-center mb-3">
                  <h6 className="fw-bold">Total Amount</h6>
                  <span className="text-success">
                    ₹{settleBillCalculations.total.toFixed(2)}
                  </span>
                </div>

                <div
                  className="btn btn-warning btn-sm"
                  onClick={() => setShowOrderDetails((prev) => !prev)}
                >
                  {showOrderDetails ? "Hide Order" : "View Order"}
                </div>

                <div
                  className="overflow-hidden transition-all"
                  style={{
                    maxHeight: showOrderDetails ? "1000px" : "0px",
                    opacity: showOrderDetails ? 1 : 0,
                    transition: "all 0.5s ease-in-out",
                  }}
                >
                  {/* Bill Items */}
                  <div className="table-responsive mb-3 mt-3">
                    <table className="table table-sm">
                      <thead className="table-light">
                        <tr>
                          <th>Item</th>
                          <th>Qty</th>
                          <th>Price</th>
                          <th>Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {settleBillData.kot_details.map((item, index) => (
                          <tr key={index}>
                            <td>{item.name}</td>
                            <td>{item.quantity}</td>
                            <td>₹{item.price}</td>
                            <td>₹{(item.price * item.quantity).toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Bill Summary */}
                  <div className="card">
                    <div className="card-body">
                      <h6 className="fw-bold mb-3">Bill Summary</h6>
                      <div className="d-flex justify-content-between mb-2">
                        <span>Subtotal:</span>
                        <span>
                          ₹{settleBillCalculations.subtotal.toFixed(2)}
                        </span>
                      </div>
                      {settleBillCalculations.discount > 0 && (
                        <div className="d-flex justify-content-between mb-2">
                          <span>Discount:</span>
                          <span className="text-success">
                            -₹{settleBillCalculations.discount.toFixed(2)}
                          </span>
                        </div>
                      )}
                      {settleBillCalculations.serviceCharge > 0 && (
                        <div className="d-flex justify-content-between mb-2">
                          <span>Service Charge:</span>
                          <span>
                            ₹{settleBillCalculations.serviceCharge.toFixed(2)}
                          </span>
                        </div>
                      )}
                      {settleBillCalculations.tax > 0 && (
                        <div className="d-flex justify-content-between mb-2">
                          <span>Tax:</span>
                          <span>₹{settleBillCalculations.tax.toFixed(2)}</span>
                        </div>
                      )}
                      {settleBillCalculations.roundOff !== 0 && (
                        <div className="d-flex justify-content-between mb-2">
                          <span>Round Off:</span>
                          <span
                            className={
                              settleBillCalculations.roundOff > 0
                                ? "text-success"
                                : "text-danger"
                            }
                          >
                            {settleBillCalculations.roundOff > 0 ? "+" : ""}₹
                            {settleBillCalculations.roundOff.toFixed(2)}
                          </span>
                        </div>
                      )}
                      <hr />
                      <div className="d-flex justify-content-between">
                        <h5 className="fw-bold">Total Amount:</h5>
                        <h4 className="fw-bold text-primary">
                          ₹{settleBillCalculations.total.toFixed(2)}
                        </h4>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Payment Options */}
            <div className="mb-4">
              <h6 className="fw-bold mb-3">Select Payment Option</h6>
              <div className="d-flex flex-wrap gap-2">
                {paymentMethodsToShow.map((method) => (
                  <div className="payment-method-option" key={method}>
                    <input
                      className="payment-method-radio"
                      type="radio"
                      name="paymentMethod"
                      id={method}
                      checked={paymentMethod === method.toLowerCase()}
                      onChange={() => {
                        const lowerMethod = method.toLowerCase();
                        const isThirdParty = [
                          "zomato",
                          "swiggy",
                          "dineout",
                        ].includes(lowerMethod);
                        const wasThirdParty = [
                          "zomato",
                          "swiggy",
                          "dineout",
                        ].includes(paymentMethod);

                        // When switching FROM third-party TO regular payment method
                        if (wasThirdParty && !isThirdParty) {
       
                          

                          setCurrentPayment({
                            method: lowerMethod,
                            amount: settleBillCalculations.total.toFixed(2), // Auto-fill with total amount
                            tip: "",
                            upiSubMethod: "",
                            transactionId: "",
                          });
                        }
                        // When switching TO third-party payment method
                        else if (isThirdParty) {
         

                          setCurrentPayment({
                            method: lowerMethod,
                            amount: "",
                            tip: "",
                            upiSubMethod: "",
                            transactionId: "",
                          });
                          setPaymentEntries([]);
                        }
                        // When switching between regular payment methods (UPI, Cash, Card)
                        else if (!isThirdParty && !wasThirdParty) {
       
                          
                          setCurrentPayment((prev) => ({
                            ...prev,
                            method: lowerMethod,
                          }));
                        }

                        setPaymentMethod(lowerMethod);
                      }}
                    />
                    <label className="payment-method-label" htmlFor={method}>
                      {method}
                    </label>
                  </div>
                ))}
              </div>
            </div>

            {/* UPI Method Dropdown and Transaction ID */}
            {paymentMethod === "upi" &&
              (() => {
                const settleDueAmount =
                  settleBillCalculations.total > 0
                    ? (
                      settleBillCalculations.total -
                      paymentEntries.reduce(
                        (sum, entry) => sum + parseFloat(entry.amount || 0),
                        0
                      )
                    ).toFixed(2)
                    : dueAmount;
                return parseFloat(settleDueAmount) > 0;
              })() && (
                <div className="payment-details-container mb-4 p-3 bg-light rounded">
                  <div className="mb-3">
                    <label className="form-label fw-bold">
                      Select UPI Method <span className="text-danger">*</span>
                    </label>
                    <select
                      className="form-select"
                      value={currentPayment.upiSubMethod}
                      onChange={(e) =>
                        setCurrentPayment((cp) => ({
                          ...cp,
                          upiSubMethod: e.target.value,
                        }))
                      }
                    >
                      <option value="">Select Method</option>
                      <option value="Google Pay">Google Pay</option>
                      <option value="PhonePe">PhonePe</option>
                      <option value="Paytm">Paytm</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <div className="mb-3">
                    <label className="form-label fw-bold">
                      Transaction / Reference ID{" "}
                      {/* <span className="text-danger">*</span> */}
                    </label>
                    <input
                      type="text"
                      className="form-control"
                      value={currentPayment.transactionId}
                      onChange={(e) =>
                        setCurrentPayment((cp) => ({
                          ...cp,
                          transactionId: e.target.value,
                        }))
                      }
                      placeholder="Enter Transaction / Reference ID"
                    />
                  </div>
                </div>
              )}

            {/* Payment Details and Actions */}
            {paymentMethod === "hold" ? (
              <div className="mb-4">
                <h6 className="fw-bold mb-3">
                  Reason <span className="text-danger">*</span>
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
                  className="btn btn-danger w-100 py-2 mt-3"
                  onClick={async () => {
                    if (!reason || reason.trim() === "") {
                      Toaster.error("Please fill the reason");
                      return;
                    }

                    // ✅ Step 1: Safely get orderId from kot_details
                    const orderIdFromKot =
                      settleBillData?.kot_details?.[0]?.orderId;
                    if (!orderIdFromKot) {
                      Toaster.error("Order ID is missing");
                      return;
                    }

                    // ✅ Step 2: Get total and round off safely
                    const rawTotal = Number(settleBillCalculations?.total || 0);
                    const roundOff = Number(
                      settleBillCalculations?.roundOff || 0
                    );
                    const finalTotal = rawTotal + roundOff;

                    // ✅ Step 3: Get SCH details (with fallback)
                    const schDetails = settleBillData?.kot_details?.[0]
                      ?.order_service_charge || {
                      name: "SCH",
                      percentage: 0,
                      foreigner_percentage: 10,
                    };

                    // ✅ Step 4: Build payload
                    const payload = {
                      id: orderIdFromKot,
                      subtotal: 0,
                      service_charge: schDetails?.percentage || 0,
                      tax_amount: null,
                      total: finalTotal,
                      discount_type: discountMode?.toString() || "0",
                      discount_rate: discountValue?.toString() || "0",
                      payment_type: "Hold",
                      unpaid_reason: reason,
                      payment_status: 2,
                      service_charge_details: {
                        name: schDetails?.name || "SCH",
                        percentage: schDetails?.percentage?.toString() || "0",
                        foreigner_percentage:
                          schDetails?.foreigner_percentage || 10,
                      },
                    };

                    // ✅ Step 5: Call API
                    setFullLoader(true);
                    try {
                      const response = await axiosInstance.post(
                        "/api/payment/holdpaymentfordinein",
                        payload
                      );
                      if (response.data?.status === "success") {
                        setRefreshProducts(Date.now());
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
                        setShowSettlePaidModal(false);

                        // if (onPaymentSuccess) onPaymentSuccess();
                      } else {
                        Toaster.error(
                          response.data?.message ||
                          "Failed to put order on hold"
                        );
                      }
                    } catch (err) {
                      const errorMsg =
                        err.response?.data?.message ||
                        err.message ||
                        "Failed to put order on hold";
                      // console.error("Hold payment error:", errorMsg);
                      Toaster.error(`${errorMsg}`);
                    } finally {
                      setFullLoader(false);
                    }
                  }}
                >
                  Save
                </button>
              </div>
            ) : ["zomato", "swiggy", "dineout"].includes(paymentMethod) ? (
              <div className="mb-3">
                <button
                  className="btn btn-warning w-100 py-2"
                  onClick={async () => {
                    setFullLoader(true);

                    try {
                      const orderIdFromKot =
                        settleBillData?.kot_details?.[0]?.orderId;
                      const orderItems =
                        settleBillData?.kot_details?.[0]?.items || [];
                      // console.log("✅ Final orderItems =", orderItems);
                      const payload = {
                        id: orderIdFromKot,
                        subtotal: settleBillCalculations.subtotal.toFixed(2),
                        discount_type: discountMode.toString(),
                        discount_rate: discountValue.toString(),
                        discount_value:
                          settleBillCalculations.discount.toFixed(2),
                        payment_details: [
                          {
                            method:
                              paymentMethod.charAt(0).toUpperCase() +
                              paymentMethod.slice(1),
                            amount: settleBillCalculations.total.toFixed(2),
                            tip: 0,
                            upiType: "",
                            note: "",
                            transaction_id: "",
                          },
                        ],
                        due_amount: 0,
                        service_charge: serviceChargeDetails?.percentage || 0,
                        service_charge_details: serviceChargeDetails || {
                          name: "SCH",
                          percentage: 0,
                        },
                        tax_amount: settleBillCalculations.tax.toFixed(2),
                        // tax_details: Object.keys({ ...cgstMap, ...sgstMap })
                        //   .map(rate => [
                        //     cgstMap[rate] && { name: 'CGST', percentage: Number(rate), amount: cgstMap[rate].toFixed(2) },
                        //     sgstMap[rate] && { name: 'SGST', percentage: Number(rate), amount: sgstMap[rate].toFixed(2) }
                        //   ])
                        //   .flat()
                        //   .filter(Boolean),
                        tax_details: settleBillCalculations.taxDetails || [],
                        paided_amount: settleBillCalculations.total.toFixed(2),
                        total: settleBillCalculations.total.toFixed(2),
                        payment_status: 1,
                        round_up_amount:
                          settleBillCalculations.roundOff.toFixed(2),
                        item: settleBillData.kot_details.map((item) => ({
                          product_id: item.id,
                          product_name: item.name,
                          quantity: item.quantity,
                          price: item.price,
                          withOutTaxPrice: item.withOutTaxPrice,
                          withTaxPrice: item.withTaxPrice,
                          packaging_charges: item.packaging_charges || 0,
                          tax_percent: item.tax_percent,
                          tax_type: item.tax_type,
                          product_type: item.product_type || 0,
                          dine_in_service: item.dine_in_service || 1,
                          delivery_service: item.delivery_service || 1,
                          pick_up_service: item.pick_up_service || 1,
                          min_order_quantity: item.min_order_quantity || 1,
                          fooder_id: item.fooder_id,
                          table_id: item.table_id,
                          fooder_name: item.fooder_name || "",
                          product_special_note: item.product_special_note || "",
                          isKOT: item.isKOT,
                          isSaved: item.isSaved,
                          KOT_id: item.KOT_id,
                          KOT_no: item.KOT_no,
                          KOT_time: item.KOT_time,
                          selectedAddons: item.selectedAddons || [],
                          selectedvariants: item.selectedvariants || {},
                          variant_id: item.variant_id,
                          addons: item.addons || [],
                          attributes: item.attributes || [],
                        })),
                      };

                      const response = await axiosInstance.post(
                        "/api/payment/partialpaymentfordinein",
                        payload
                      );

                      if (response.data?.status === "success") {
                        Toaster.success(
                          response.data.message || "Payment successful"
                        );
                        setRefreshProducts(Date.now());
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
                        setShowSettlePaidModal(false);
                      }
                    } catch (error) {
                      // console.error('Payment error:', err?.response?.data || err.message || err);
                      Toaster.error(
                        error?.response?.data?.message || "Payment failed"
                      );
                    } finally {
                      setFullLoader(false);
                    }
                  }}
                >
                  Paid
                </button>

                {/* <button
      className="btn btn-warning"
      onClick={async () => {
        setFullLoader(true);
        try {

          
          const basePayload = {
            subtotal: calculateSubtotal().toFixed(2),
            discount_type: discountMode.toString(),
            discount_rate: discountValue.toString(),
            discount_value: totalDiscount.toFixed(2),
            payment_details: [{
              method: paymentMethod.charAt(0).toUpperCase() + paymentMethod.slice(1),
              amount: (total + roundOffValue).toFixed(2),
              tip: 0,
              upiType: '',
              note: '',
              transaction_id: '',
            }],
            due_amount: 0,
            service_charge: serviceChargeDetails?.percentage || 0,
            service_charge_details: serviceChargeDetails || { name: "SCH", percentage: 0 },
            tax_amount: totalTax.toFixed(2),
            tax_details: Object.keys({ ...cgstMap, ...sgstMap })
              .map(rate => [
                cgstMap[rate] && { name: 'CGST', percentage: Number(rate), amount: cgstMap[rate].toFixed(2) },
                sgstMap[rate] && { name: 'SGST', percentage: Number(rate), amount: sgstMap[rate].toFixed(2) }
              ])
              .flat()
              .filter(Boolean),
            paided_amount: (total + roundOffValue).toFixed(2),
            total: (total + roundOffValue).toFixed(2),
            payment_status: 1,
            round_up_amount: Number(roundOffValue),
            item: orderItems.map(item => ({
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
          const response = await axiosInstance.post('/api/payment/partialpaymentfordinein', payload);

          if (response.data?.status === 'success') {
            Toaster.success(response.data.message || 'Payment successful');
            setPaymentEntries([]);
            setCurrentPayment({
              method: paymentMethod,
              amount: '',
              tip: '',
              upiSubMethod: '',
              transactionId: ''
            });
            setCustomerDetails({ name: '', mobile: '', address: '' });
            setCustomerPhone('');
            if (onPaymentSuccess) onPaymentSuccess();
          } else {
            Toaster.error(response.data?.message || 'Payment failed');
          }
} catch (err) {
  console.error('Raw Error:', err);

  if (err.response) {
    console.error('Response Data:', err.response.data);
    console.error('Status:', err.response.status);
    console.error('Headers:', err.response.headers);
    Toaster.error(err.response.data?.message || 'Server error: Payment failed');
  } else if (err.request) {
    console.error('No response received:', err.request);
    Toaster.error('No response from server');
  } else {
    console.error('Unexpected error:', err.message);
    Toaster.error(err.message || 'Unknown error occurred');
  }
}
 {
          setFullLoader(false);
        }
      }}
    >
      Paid
    </button> */}
              </div>
            ) : (
              <>
                <div className="payment-details-container mb-4 p-3 bg-light rounded">
                  <h6 className="fw-bold mb-3">Customer Paid</h6>
                  <div className="row g-3">
                    <div className="col-md-6">
                      <div className="form-floating">
                        {/* <input
                    type="number"
                    className="form-control"
                    id="amountPaid"
                    placeholder="Amount"
                    value={currentPayment.amount}
                    onChange={e => {
                      const val = e.target.value;
                      if (parseFloat(val) < 0) return;
                      setCurrentPayment({ ...currentPayment, amount: val });
                      setPayClicked(false);
                    }}
                  /> */}
                        <input
                          type="number"
                          className="form-control"
                          id="amountPaid"
                          placeholder="Amount"
                          value={currentPayment.amount}
                          onChange={(e) => {
                            if (
                              ["zomato", "swiggy", "dineout"].includes(
                                paymentMethod
                              )
                            )
                              return;

                            const val = e.target.value;
                            if (parseFloat(val) < 0) return;
                            setCurrentPayment({
                              ...currentPayment,
                              amount: val,
                            });
                            setPayClicked(false);
                          }}
                          disabled={["zomato", "swiggy", "dineout"].includes(
                            paymentMethod
                          )}
                        />
                        <label htmlFor="amountPaid">Amount</label>
                      </div>
                    </div>
                    <div className="col-md-6">
                      <div className="form-floating">
                        <input
                          type="number"
                          className="form-control"
                          id="tipAmount"
                          placeholder="Tip"
                          value={currentPayment.tip}
                          onChange={(e) =>
                            setCurrentPayment({
                              ...currentPayment,
                              tip: e.target.value,
                            })
                          }
                          min="0"
                        />
                        <label htmlFor="tipAmount">Tip</label>
                      </div>
                    </div>
                  </div>
                  <div className="d-flex justify-content-end mt-2">
                    <button
                      className="btn btn-primary mt-3"
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
                        const settleDueAmount =
                          settleBillCalculations.total > 0
                            ? (
                              settleBillCalculations.total -
                              paymentEntries.reduce(
                                (sum, entry) =>
                                  sum + parseFloat(entry.amount || 0),
                                0
                              )
                            ).toFixed(2)
                            : dueAmount;
                        if (
                          parseFloat(currentPayment.amount) > settleDueAmount
                        ) {
                          Toaster.error(
                            "You cannot enter an amount higher than the due"
                          );
                          return;
                        }
                        if (paymentMethod === "upi") {
                          if (!currentPayment.upiSubMethod) {
                            Toaster.error("Please select a UPI method");
                            return;
                          }
                          // if (!currentPayment.transactionId) {
                          //   Toaster.error(
                          //     "Please enter a transaction/reference ID"
                          //   );
                          //   return;
                          // }
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
                            transactionId:
                              paymentMethod === "upi"
                                ? currentPayment.transactionId
                                : undefined,
                          },
                        ];
                        setPaymentEntries(newEntries);
                        // Calculate new due and prefill input
                        const paid = newEntries.reduce(
                          (sum, entry) => sum + parseFloat(entry.amount || 0),
                          0
                        );
                        const newDue =
                          (settleBillCalculations.total > 0
                            ? settleBillCalculations.total
                            : total) - paid;

     
                            
                        setCurrentPayment({
                          method: paymentMethod,
                          amount: newDue > 0 ? newDue.toFixed(2) : "",
                          tip: "",
                          upiSubMethod: "",
                          transactionId: "",
                        });
                        setPayClicked(true);
                      }}
                    >
                      <i className="bi bi-plus-circle me-2"></i>{" "}
                      {/*{payClicked ? 'Add Payment' : 'Pay'}*/} Pay
                    </button>
                  </div>
                </div>

                {/* Payment List Table */}
                {paymentEntries.length > 0 && (
                  <div className="mb-4">
                    <h6 className="fw-bold mb-3">Payment History</h6>
                    <div className="table-responsive">
                      <table className="table table-hover">
                        <thead className="table-light">
                          <tr>
                            <th>Method</th>
                            <th>Amount</th>
                            <th>Tip</th>
                            <th>Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {paymentEntries.map((entry, idx) => (
                            <tr key={idx}>
                              <td>{entry.method}</td>
                              <td>₹{entry.amount}</td>
                              <td>₹{entry.tip || "0.00"}</td>
                              <td className="text-center">
                                <button
                                  className="btn btn-sm btn-outline-danger"
                                  onClick={() => {
                                    const updatedEntries =
                                      paymentEntries.filter(
                                        (_, i) => i !== idx
                                      );
                                    setPaymentEntries(updatedEntries);

                                    // Calculate remaining due amount and update input field
                                    const totalPaid = updatedEntries.reduce(
                                      (sum, entry) =>
                                        sum + parseFloat(entry.amount || 0),
                                      0
                                    );
                                    const remainingDue =
                                      (settleBillCalculations.total > 0
                                        ? settleBillCalculations.total
                                        : total) - totalPaid;

   
                                        

                                    setCurrentPayment({
                                      ...currentPayment,
                                      amount:
                                        remainingDue > 0
                                          ? remainingDue.toFixed(2)
                                          : "",
                                    });
                                  }}
                                >
                                  <i className="bi bi-trash"></i>
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Due Section */}
                {(() => {
                  {
                    /* const settleDueAmount = settleBillCalculations.total > 0 
              ? (settleBillCalculations.total - paymentEntries.reduce((sum, entry) => sum + parseFloat(entry.amount || 0), 0)).toFixed(2)
              : dueAmount; */
                  }
                  const settleDueAmount = [
                    "zomato",
                    "swiggy",
                    "dineout",
                  ].includes(paymentMethod)
                    ? 0
                    : (
                      settleBillCalculations.total -
                      paymentEntries.reduce(
                        (sum, entry) => sum + parseFloat(entry.amount || 0),
                        0
                      )
                    ).toFixed(2);
                  return (
                    settleDueAmount > 0 && (
                      <div className="payment-balance mb-4">
                        <div className="d-flex justify-content-between align-items-center p-3 bg-light rounded">
                          <h6 className="fw-bold mb-0">Balance Due:</h6>
                          <h5 className="fw-bold mb-0 text-danger">
                            ₹{settleDueAmount}
                          </h5>
                        </div>
                      </div>
                    )
                  );
                })()}

                {/* Paid Button */}
                <div className="payment-confirm">
                  {/* <button
              className="btn btn-success w-100 py-2"
              disabled={(() => {
                const settleDueAmount = settleBillCalculations.total > 0 
                  ? (settleBillCalculations.total - paymentEntries.reduce((sum, entry) => sum + parseFloat(entry.amount || 0), 0)).toFixed(2)
                  : dueAmount;
                return parseFloat(settleDueAmount) > 0 || !settleBillData?.kot_details?.[0]?.orderId;
              })()}
              onClick={handleSettleBillPayment}
            >
              <i className="bi bi-check-circle me-2"></i>Paid
            </button> */}
                  {/* Only show Paid button if at least 2 payments exist */}
                  {paymentEntries.length > 0 && (
                    <div className="d-flex justify-content-end mt-2">
                      <button
                        className="btn btn-success"
                        // disabled={
                        //   // Disable if:
                        //   // 1. Payment is still due (remaining balance > 0)
                        //   parseFloat(
                        //     settleBillCalculations.total > 0
                        //       ? (settleBillCalculations.total -
                        //          paymentEntries.reduce((sum, entry) => sum + parseFloat(entry.amount || 0), 0)
                        //          .toFixed(2))
                        //       : dueAmount
                        //   ) > 0 ||
                        //   // 2. No valid order ID
                        //   !settleBillData?.kot_details?.[0]?.orderId
                        // }
                        onClick={handleSettleBillPayment}
                      >
                        <i className="bi bi-check-circle me-2"></i>Paid
                      </button>
                    </div>
                  )}
                </div>
              </>
            )}
          </Modal.Body>
        </Modal>
      )}

      {showSplitBillModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(0, 0, 0, 0.3)",
            zIndex: 9999,
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <div
            className="custom-scroll"
            style={{
              backgroundColor: "#fff",
              borderRadius: "10px",
              width: "90%",
              maxWidth: "1100px",
              height: "calc(100vh - 40px)",
              overflowY: "auto",
              boxShadow: "0 4px 20px rgba(0,0,0,0.25)",
              padding: "24px",
              position: "relative",
            }}
          >
            {/* Close Button */}
            {/* <button
  onClick={() => {
    setShowSplitBillModal(false);
    setBillItems([]);
    setSplitBillItems(initialSplitBillItems);

    if (activeTab === "payment") {
      // ✅ Reset payment-related state here
      setPaymentEntries([]);
      setCurrentPayment({
        method: "",
        amount: "",
        tip: "",
        upiSubMethod: "",
        transactionId: "",
      });
      setPaymentMethod("Cash");
      setTipAmount(0);
      setTransactionId("");
      setSelectedBill(null);
      setActiveTab("items");
    }
  }}
  style={{
    position: "absolute",
    top: 10,
    right: 15,
    border: "none",
    background: "transparent",
    fontSize: 27,
    fontWeight: "bold",
    cursor: "pointer",
  }}
>
  ×
</button> */}

            <button
              onClick={() => {
                // Reset all bill-related states
                setShowSplitBillModal(false);
                setIsBillPaid(false);
                setShowPaymentTable(false);
                setBillItems([]);
                setSplitBillItems(initialSplitBillItems);
                setSelectedBill(null); // <-- set to false as requested
                setActiveTab("items");

                // Reset payment-related states regardless of current tab
                setPaymentEntries([]);

                

                setCurrentPayment({
                  method: "Cash",
                  amount: "",
                  tip: "",
                  upiSubMethod: "",
                  transactionId: "",
                });
                setPaymentMethod("Cash");
                setTipAmount(0);
                setTransactionId("");

                // Reset any other related states
                setSplitbilldiscountvalue(0);
                setSplitbilldiscountType(0);
          console.log("**********sch6")

                setSchValue({ percentage: "", name: "SCH" });
              }}
              style={{
                position: "absolute",
                top: 10,
                right: 15,
                border: "none",
                background: "transparent",
                fontSize: "27px",
                fontWeight: "bold",
                cursor: "pointer",
                color: "#555",
                transition: "color 0.2s ease",
                padding: "0 8px",
                lineHeight: 1,
                ":hover": {
                  color: "#000",
                  background: "rgba(0,0,0,0.05)",
                  borderRadius: "50%",
                },
                ":active": {
                  transform: "scale(0.95)",
                },
              }}
              aria-label="Close split bill modal"
            >
              ×
            </button>

            {/* Modal Title */}
            <h4 style={{ marginBottom: "20px" }}>
              Split Bill {splitOrderNo ? `(Order #${splitOrderNo})` : ""}
            </h4>

            <div
              style={{
                padding: "12px",
                borderRadius: "8px",
                marginBottom: "16px",
              }}
            >
              {savedBills.length === 0 ? (
                ""
              ) : (
                <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                  {savedBills.map((bill) => {
                    const isBlocked =
                      activeTab === "items" &&
                      billItems.length > 0 &&
                      !selectedBill; // New bill in progress with unsaved items

                    const isClickable = !bill.is_paid && !isBlocked;

                    return (
                      <div
                        key={bill.orders_bills_id}
                        onClick={() => {
                          if (!isClickable) {
                            if (bill.is_paid) {
                              Toaster.warning(
                                "This bill is already marked as paid.",
                                "error"
                              );
                            } else if (isBlocked) {
                              Toaster.warning(
                                "⚠️ Please save or cancel the current split bill before switching.",
                                "warning"
                              );
                            }
                            return;
                          }

                          handleClick(bill);
                          setPendingTable((prev) => ({
                            ...prev,
                            bill_no: bill.bill_no,
                          }));
                        }}
                        style={{
                          padding: "8px 12px",
                          backgroundColor: bill.is_paid
                            ? "#6ed398"
                            : bill.bill_no
                              ? "#ffd166"
                              : "#fff",
                          borderRadius: "4px",
                          border: "1px solid #ddd",
                          opacity: bill.is_paid || isBlocked ? 0.6 : 1,
                          cursor:
                            bill.is_paid || isBlocked
                              ? "not-allowed"
                              : "pointer",
                          minWidth: "80px",
                          textAlign: "center",
                        }}
                      >
                        <div style={{ fontWeight: "bold" }}>
                          Table {pendingTable?.table_no || "-"}-{bill.bill_no}
                          {/* Table */}
                        </div>
                        {/* <div>₹{parseFloat(bill.amount_total).toFixed(2)}</div> */}
                        <div>
                          {/* ₹{Math.round(parseFloat(bill.amount_total)).toFixed(2)} */}
                          ₹{(parseFloat(bill.amount_total)).toFixed(2)}

                        </div>

                      </div>
                    );
                  })}

                  <div
                    onClick={() => {
                      if (!canCreateNewBill) {
                        Toaster.error("Please save the current bill first.");
                        return;
                      }
                      handleCreateNewSplitBill();
                    }}
                    style={{
                      padding: "8px 12px",
                      backgroundColor: canCreateNewBill ? "#f1f1f1" : "#e5e5e5",
                      borderRadius: "4px",
                      border: "1px dashed #bbb",
                      cursor: canCreateNewBill ? "pointer" : "not-allowed",
                      minWidth: "80px",
                      textAlign: "center",
                      color: canCreateNewBill ? "#333" : "#999",
                      opacity: canCreateNewBill ? 1 : 0.6,
                    }}
                  >
                    <div style={{ fontWeight: "bold", fontSize: "18px" }}>
                      + New Bill
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div style={{ display: "flex", gap: "24px" }}>
              <div
                className="custom-scroll"
                style={{
                  flex: 1,
                  backgroundColor: "#f4f3f0",
                  borderRadius: "8px",
                  padding: "16px",
                  height: "calc(95vh - 200px)",
                  overflowY: "auto",
                }}
              >
                <>
                  <h6>
                    Order {splitOrderNo ? `(#${splitOrderNo})` : ""} Items
                  </h6>
                  <table style={{ width: "100%", marginTop: "10px" }}>
                    <thead>
                      <tr style={{ textAlign: "left" }}>
                        <th>Items</th>
                        <th>Qty</th>
                        <th>Price</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {splitBillItems.length === 0 ? (
                        <tr>
                          <td
                            colSpan="4"
                            style={{
                              textAlign: "center",
                              padding: "20px",
                              color: "#888",
                            }}
                          >
                            No items found
                          </td>
                        </tr>
                      ) : (
                        splitBillItems.map((item, index) => (
                          <>
                            <tr
                              key={`${item.id}-${item.local_id}-${index}`}
                              style={{ borderBottom: "10px solid transparent" }}
                            >
                              <td>
                                <strong>{item.name}</strong> ({item.quantity})
                                <br />
                                {/* <small>
                              <b>Staff:</b>{" "}
                              {item.staffDetails?.staff_name || "N/A"}
                            </small> */}
                              </td>

                              <td>{item.quantity}</td>
                              <td>
                                <small
                                  style={{ color: "#555", marginTop: "4px" }}
                                >
                                  ₹{(item.price * item.quantity).toFixed(2)}
                                </small>
                              </td>
                              <td>
                                <button
                                  style={{
                                    backgroundColor: "#64c4c8",
                                    color: "#fff",
                                    border: "none",
                                    padding: "4px 10px",
                                    borderRadius: "4px",
                                    fontSize: "13px",
                                    cursor: selectedBill?.is_paid
                                      ? "not-allowed"
                                      : "pointer",
                                    opacity: selectedBill?.is_paid ? 0.6 : 1,
                                  }}
                                  onClick={() => {
                                    if (selectedBill) return;
                                    handleAddToBill(item);
                                  }}
                                  disabled={
                                    !!selectedBill && selectedBill.is_paid
                                  }
                                >
                                  Add
                                </button>
                              </td>
                            </tr>
                          </>
                        ))
                      )}
                    </tbody>
                    {splitBillItems.length > 0 && (
                      <tfoot>
                        <tr>
                          <td
                            colSpan="4"
                            style={{ textAlign: "right", paddingTop: "20px" }}
                          >
                            {/* <button className="btn btn-primary"  onClick={handleFinalizeSplitBill}>
      Finalize
    </button> */}
                            <button
                              className="btn btn-primary"
                              style={{
                                backgroundColor: "#64c4c8",
                                color: "#fff",
                                border: "none",
                                padding: "4px 10px",
                                borderRadius: "4px",
                                fontSize: "13px",
                                cursor: selectedBill?.is_paid
                                  ? "not-allowed"
                                  : "pointer",
                                opacity: selectedBill?.is_paid ? 0.6 : 1,
                              }}
                              disabled={!!selectedBill} // disable if any bill is selected
                              onClick={() => {
                                if (!!selectedBill) return; // prevent action if selectedBill
                                handleFinalizeSplitBill();
                              }}
                            >
                              Finalize
                            </button>
                          </td>
                        </tr>
                      </tfoot>
                    )}
                  </table>
                </>
              </div>

              {/* Right Side: Bill Section */}

              <div
                style={{
                  flex: 1,
                  backgroundColor: "#f4f3f0",
                  borderRadius: "8px",
                  padding: "16px",
                }}
              >
                {/* <h6>#1 Bill</h6> */}
                {/* <h6>
                  Table {pendingTable?.table_no || "-"}
                  -{pendingTable?.bill_no || ""}
                </h6> */}
                <h6>
                  Table {pendingTable?.table_no || "-"}
                  {selectedBill?.bill_no ? ` - ${selectedBill.bill_no}` : ""}
                </h6>

                {/* Tabs */}

                <div style={{ display: "flex", marginBottom: "10px" }}>
                  <button
                    style={{
                      flex: 1,
                      background: activeTab === "items" ? "black" : "white",
                      color: activeTab === "items" ? "white" : "black",
                      border: "1px solid black",
                    }}
                    onClick={() => setActiveTab("items")}
                  >
                    Items
                  </button>
                  <button
                    style={{
                      flex: 1,
                      background: activeTab === "details" ? "black" : "white",
                      color: activeTab === "details" ? "white" : "black",
                      border: "1px solid black",
                    }}
                    onClick={() => setActiveTab("details")}
                  >
                    Details
                  </button>
                  <button
                    style={{
                      flex: 1,
                      background: activeTab === "payment" ? "black" : "white",
                      color: activeTab === "payment" ? "white" : "black",
                      border: "1px solid black",
                    }}
                    onClick={() => {
                      if (!selectedBill) {
                        Toaster.error("Please save bill first");
                        return;
                      }
                      setActiveTab("payment");
                    }}
                  >
                    Mark Paid{" "}
                  </button>
                </div>

                {/* Print Bill Button */}
                {/* <div style={{ marginBottom: "10px" }}>
                  <button
                    style={{
                      width: "100%",
                      background: "#22c55e",
                      color: "white",
                      border: "none",
                      padding: "8px 12px",
                      borderRadius: "4px",
                      fontSize: "14px",
                      cursor: billItems.length > 0 ? "pointer" : "not-allowed",
                      opacity: billItems.length > 0 ? 1 : 0.5,
                    }}
                    disabled={billItems.length === 0}
                      onClick={() => handleSplitBillPrint()}
                  >
                    🖨️ Print Bill
                  </button>
                </div> */}

                {activeTab === "items" && (
                  <>
                    <div
                      style={{
                        maxHeight: "calc(100vh - 500px)",
                        overflowY: "auto",
                      }}
                      className="custom-scroll"
                    >
                      <table style={{ width: "100%" }}>
                        <thead>
                          <tr style={{ textAlign: "left" }}>
                            <th>Items</th>
                            <th>Qty</th>
                            <th>Price</th>
                            <th>Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {billItems.length === 0 ? (
                            <tr>
                              <td
                                colSpan="4"
                                style={{
                                  textAlign: "center",
                                  padding: "20px",
                                  color: "#888",
                                }}
                              >
                                No items in bill
                              </td>
                            </tr>
                          ) : (
                            billItems.map((item, index) => (
                              <tr
                                key={`${item.id}-${item.local_id}-${index}`}
                                style={{
                                  borderBottom: "10px solid transparent",
                                }}
                              >
                                <td>
                                  {item.name}
                                  <br />
                                  {/* <small>
                                    <b>Staff:</b>{" "}
                                    {item.staffDetails?.staff_name || "N/A"}
                                  </small> */}
                                </td>
                               <td style={{ verticalAlign: "middle", padding: "6px" }}>
  <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
    {/* Minus Button */}
    <button
      style={{
        width: "24px",
        height: "24px",
        borderRadius: "4px",
        border: "1px solid #ccc",
        backgroundColor: isBillSaved ? "#eee" : "#f8f9fa",
        color: "#333",
        fontSize: "14px",
        fontWeight: "bold",
        cursor: isBillSaved ? "not-allowed" : "pointer",
        transition: "all 0.2s ease",
        lineHeight: "1",
        padding: "0",
      }}
      onClick={() =>
        !isBillSaved &&
        updateBillItemQuantity(item.id, item.local_id, -1, index)
      }
      disabled={isBillSaved}
    >
      –
    </button>

    {/* Quantity Input */}
    <input
      value={item.quantity}
      readOnly
      style={{
        width: "32px",
        height: "24px",
        textAlign: "center",
        border: "1px solid #ddd",
        borderRadius: "4px",
        backgroundColor: "#fff",
        fontWeight: "500",
        fontSize: "13px",
        padding: "0",
      }}
    />

    {/* Plus Button */}
    <button
      style={{
        width: "24px",
        height: "24px",
        borderRadius: "4px",
        border: "1px solid #007bff",
        backgroundColor:
          isBillSaved ||
          getMaxAvailableQuantity(item.id, item.local_id) === 0
            ? "#ddd"
            : "#007bff",
        color:
          isBillSaved ||
          getMaxAvailableQuantity(item.id, item.local_id) === 0
            ? "#888"
            : "#fff",
        fontSize: "14px",
        fontWeight: "bold",
        cursor:
          isBillSaved ||
          getMaxAvailableQuantity(item.id, item.local_id) === 0
            ? "not-allowed"
            : "pointer",
        transition: "all 0.2s ease",
        lineHeight: "1",
        padding: "0",
      }}
      onClick={() => {
        if (isBillSaved) return;
        if (getMaxAvailableQuantity(item.id, item.local_id) === 0) return;

        updateBillItemQuantity(item.id, item.local_id, 1, index);
      }}
      disabled={
        isBillSaved || getMaxAvailableQuantity(item.id, item.local_id) === 0
      }
    >
      +
    </button>
  </div>
</td>


                                <td>
                                  <small
                                    style={{ color: "#555", marginTop: "4px" }}
                                  >
                                    ₹{(item.price * item.quantity).toFixed(2)}
                                  </small>
                                </td>

                                <td>
                                  {/* <button
                                    onClick={() =>
                                      removeBillItem(item.id, item.local_id)
                                    }
                                    style={{
                                      color: "red",
                                      fontWeight: "bold",
                                      border: "none",
                                      background: "transparent",
                                      fontSize: "18px",
                                      cursor: "pointer",
                                    }}
                                  >
                                    ×
                                  </button> */}
                                  <button
                                    onClick={() =>
                                      !isBillSaved &&
                                      removeBillItem(item.id, item.local_id)
                                    }
                                    disabled={isBillSaved}
                                    style={{
                                      color: "red",
                                      fontWeight: "bold",
                                      border: "none",
                                      background: "transparent",
                                      fontSize: "18px",
                                      cursor: isBillSaved
                                        ? "not-allowed"
                                        : "pointer",
                                      opacity: isBillSaved ? 0.5 : 1,
                                    }}
                                  >
                                    ×
                                  </button>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                      <div ref={billEndRef} />
                    </div>

                    {billItems.length > 0 && (
                      <div
                        style={{
                          marginTop: "30px",
                          width: "100%",

                          alignSelf: "flex-end",
                          backgroundColor: "#f4f3f0",
                        }}
                      >
                        {/* Bill Calculation Breakdown */}
                        <div style={{ fontSize: "14px", marginBottom: "10px" }}>
                          {/* Items Total */}
                          <div className="d-flex justify-content-between mb-2">
                            <span>Items ({billItems.length})</span>
                            <span>
                              ₹{" "}
                              {splitBillCalc.items
                                .reduce(
                                  (sum, item) => sum + (item.itemBase || 0),
                                  0
                                )
                                .toFixed(2)}
                            </span>
                          </div>

                          {/* Discount */}
                          <div className="d-flex justify-content-between align-items-center mb-2">
                            <span>
                              Discount{" "}
                              <select
                                value={splitbilldiscountType}
                                onChange={(e) =>
                                  !isBillSaved &&
                                  setSplitbilldiscountType(
                                    Number(e.target.value)
                                  )
                                }
                                disabled={isBillSaved}
                                style={{
                                  padding: "2px 6px",
                                  marginLeft: "6px",
                                  marginRight: "4px",
                                  border: "1px solid #ccc",
                                  borderRadius: "4px",
                                }}
                              >
                                <option value={0}>%</option>
                                <option value={1}>₹</option>
                              </select>
                              <input
                                type="number"
                                value={splitbilldiscountvalue}
                                onChange={(e) => {
                                  if (isBillSaved) return;

                                  let input = e.target.value;
                                  if (!/^\d*\.?\d{0,2}$/.test(input)) return;

                                  let val = parseFloat(input);
                                  if (isNaN(val)) val = 0;

                                  if (splitbilldiscountType === 0) {
                                    if (val < 0 || val > 100) return;
                                  } else {
                                    const itemBaseTotal =
                                      splitBillCalc.items.reduce(
                                        (sum, item) =>
                                          sum + (item.itemBase || 0),
                                        0
                                      );
                                    if (val > itemBaseTotal) return;
                                  }

                                  setSplitbilldiscountvalue(input);
                                }}
                                disabled={isBillSaved}
                                style={{
                                  width: "60px",
                                  padding: "2px",
                                  border: "1px solid #ccc",
                                  borderRadius: "4px",
                                  textAlign: "center",
                                  marginRight: "4px",
                                }}
                              />
                            </span>
                            <span>
                              -₹{" "}
                              {splitBillCalc.items
                                .reduce(
                                  (sum, item) => sum + (item.itemDiscount || 0),
                                  0
                                )
                                .toFixed(2)}
                            </span>
                          </div>

                          {/* SCH */}
                          <div className="d-flex justify-content-between align-items-center mb-2">
                            <span>
                              {schValue.name || "SCH"}{""}
                              <input
                                type="number"
                                value={schValue.percentage}
                                onChange={(e) => {
                                  if (isBillSaved) return;

                                  let input = e.target.value;
                                  if (!/^\d*\.?\d{0,2}$/.test(input)) return;

                                  let val = parseFloat(input);
                                  if (isNaN(val)) val = 0;
                                  if (val < 0 || val > 100) return;

                                  setSchValue({
                                    ...schValue,
                                    percentage: input,
                                  });
                                }}
                                disabled={isBillSaved}
                                style={{
                                  width: "50px",
                                  padding: "2px",
                                  border: "1px solid #ccc",
                                  borderRadius: "4px",
                                  textAlign: "center",
                                  marginLeft: "4px",
                                  marginRight: "4px",
                                }}
                              />
                              %
                            </span>
                            <span>
                              ₹{" "}
                              {splitBillCalc.items
                                .reduce((sum, i) => sum + (i.itemSCH || 0), 0)
                                .toFixed(2)}
                            </span>
                          </div>

                          {/* Tax Breakdown */}

                          {/* Total Tax (combined CGST + SGST) */}
                          {/* <div className="d-flex justify-content-between mb-2">
                            <span>Total Tax</span>
                            <span>
                              ₹{" "}
                              {splitBillCalc.items
                                .reduce((sum, item) => sum + (item.tax || 0), 0)
                                .toFixed(2)}
                            </span>
                          </div>

                       
                          <div className="d-flex justify-content-between mt-3 fw-bold fs-5 border-top pt-2">
                            <span>Total</span>
                            <span>₹ {splitBillCalc.total.toFixed(2)}</span>
                          </div> */}

                          {/* Total Tax (combined CGST + SGST) */}
                          <div className="d-flex justify-content-between mb-2">
                            <span>Total Tax</span>
                            <span>
                              ₹{" "}
                              {splitBillCalc.items
                                .reduce((sum, item) => sum + (item.tax || 0), 0)
                                .toFixed(2)}
                            </span>
                          </div>

                          {/* Round Off */}
                          {/* <div className="d-flex justify-content-between mb-2">
  <span>Round Off</span>
  <span>
    ₹{" "}
    {(
      Math.round(splitBillCalc.total) - splitBillCalc.total
    ).toFixed(2)}
  </span>
</div> */}

                          {/* Total */}
                          <div className="d-flex justify-content-between mt-3 fw-bold fs-5 border-top pt-2">
                            <span>Total</span>
                            {/* <span>₹ {Math.round(splitBillCalc.total).toFixed(2)}</span> */}
                            <span>₹ {Number(splitBillCalc.total).toFixed(2)}</span>

                          </div>

                        </div>

                        {/* Buttons Section */}
                        <div className="d-flex justify-content-end gap-2 mt-3">
                          {!selectedBill ? (
                            <>
                              {/* 🟡 Save Bill */}
                              <button
                                style={{
                                  backgroundColor: "#fbbf24",
                                  border: "none",
                                  padding: "6px 12px",
                                  borderRadius: "6px",
                                  fontWeight: 500,
                                  cursor: "pointer",
                                  color: "#fff"
                                }}
                                onClick={() => handleSaveSplitBill("save")} // pass mode
                              >
                                Save Bill
                              </button>

                              <button
                                style={{

                                  backgroundColor: "#2563eb",
                                  border: "none",
                                  padding: "6px 12px",
                                  borderRadius: "6px",
                                  fontWeight: 500,
                                  color: "#fff",
                                  cursor: billItems.length > 0 ? "pointer" : "not-allowed",
                                  opacity: billItems.length > 0 ? 1 : 0.5,
                                }}
                                disabled={billItems.length === 0}
                                onClick={() => handleSplitBillPrint()}
                              >
                                Save & Print Bill
                              </button>

                              {/* 🟢 Save & Paid */}
                              <button
                                style={{
                                  backgroundColor: "green",
                                  color: "#fff",
                                  border: "none",
                                  padding: "10px 20px",
                                  borderRadius: "6px",
                                  fontSize: "14px",
                                  fontWeight: "600",
                                  cursor: "pointer",
                                }}
                                onClick={() =>
                                  handleSaveSplitBill("saveAndPaid")
                                } // pass mode
                              >
                                Save & Paid
                              </button>
                            </>
                          ) : (
                            <>
                              {/* <button
                    style={{
                      
                       backgroundColor: "#2563eb",
                                  border: "none",
                                  padding: "6px 12px",
                                  borderRadius: "6px",
                                  fontWeight: 500,
                                  color:"#fff",
                      cursor: billItems.length > 0 ? "pointer" : "not-allowed",
                      opacity: billItems.length > 0 ? 1 : 0.5,
                    }}
                    disabled={billItems.length === 0}
                      onClick={() => handleSplitBillPrint()}
                  >
                     Print Bill
                  </button> */}
                              <button
                                style={{
                                  backgroundColor: "red",
                                  border: "none",
                                  padding: "6px 12px",
                                  borderRadius: "6px",
                                  fontWeight: 500,
                                  cursor: "pointer",
                                  color: "#fff",
                                }}
                                onClick={handleCancelSplitBill}
                              >
                                Cancel Bill
                              </button>
                            </>
                          )}

                          {/* <button
                            style={{
                              backgroundColor: "#2cbfc6",
                              border: "none",
                              padding: "6px 12px",
                              borderRadius: "6px",
                              fontWeight: 500,
                              cursor: "pointer",
                              color: "#fff"
                            }}
                          >
                            Print Bill
                          </button> */}
                        </div>
                      </div>
                    )}
                  </>
                )}

                {activeTab === "details" && (
                  <div>
                    <h5>Customer Details</h5>
                    <hr />

                    <div
                      style={{
                        display: "flex",
                        gap: "10px",
                        marginBottom: "10px",
                      }}
                    >
                      <div style={{ flex: 1 }}>
                        <label  >Mobile</label>
                        <input
                          type="text"
                          placeholder="Enter Mobile"
                          className="form-control"
                          maxLength={10}
                          value={customerDetails.mobile}
                          onChange={async (e) => {
                            const raw = e.target.value;

                            // ❌ Prevent anything except digits
                            if (!/^\d*$/.test(raw)) return;

                            // ✅ Accept only up to 10 digits
                            const val = raw.slice(0, 10);
                            setCustomerDetails((prev) => ({
                              ...prev,
                              mobile: val,
                            }));

                            // ✅ Trigger API if length === 10
                            if (val.length === 10) {
                              try {
                                const res = await axiosInstance.get(
                                  `${GET_EATER_DETAILS}?eater_phonenumber=${val}`
                                );

                                if (
                                  res.data?.status === "success" &&
                                  res.data?.data
                                ) {
                                  setCustomerDetails(res.data.data);
                                  Toaster.success("Existing customer");
                                } else {
                                  setCustomerDetails({
                                    ...customerDetails,
                                    mobile: val,
                                    name: "",
                                    address: "",
                                  });
                                  Toaster.info(
                                    "New customer, please fill details"
                                  );
                                }
                              } catch (err) {
                                setCustomerDetails({
                                  ...customerDetails,
                                  mobile: val,
                                  name: "",
                                  address: "",
                                });
                                Toaster.error("Failed to fetch customer");
                              }
                            }
                          }}
                          onPaste={(e) => {
                            const paste = e.clipboardData.getData("text");
                            if (!/^\d{1,10}$/.test(paste)) {
                              e.preventDefault(); // block paste if not valid digits
                              Toaster.error("Only digits (max 10) are allowed");
                            }
                          }}
                        />
                      </div>

                      <div style={{ flex: 1 }}>
                        <label>Name</label>
                        <input
                          type="text"
                          placeholder="Enter Name"
                          className="form-control"
                          value={customerDetails.name}
                          onChange={(e) =>
                            setCustomerDetails((prev) => ({
                              ...prev,
                              name: e.target.value,
                            }))
                          }
                        />
                      </div>
                    </div>

                    <div style={{ marginBottom: "20px" }}>
                      <label>Address</label>
                      <input
                        type="text"
                        placeholder="Enter Address"
                        className="form-control"
                        value={customerDetails.address}
                        onChange={(e) =>
                          setCustomerDetails((prev) => ({
                            ...prev,
                            address: e.target.value,
                          }))
                        }
                      />
                    </div>
                  </div>
                )}

                {activeTab === "payment" && (
                  <div className="mb-4">
                    <h5 className="fw-bold mb-3">

                      Bill Amount: ₹
                      {Number(splitBillCalc?.total || 0).toFixed(2)}
                    </h5>
                    {/* <h5 className="fw-bold mb-3">
                                    Bill Amount: ₹{Math.round(Number(splitBillCalc?.total || 0))}
                                   </h5> */}


                    <h6 className="fw-bold mb-2">Select Payment Option</h6>
                    <div className="d-flex flex-wrap gap-3 mb-3">
                      {["Cash", "Card", "NEFT", "UPI"].map((method) => (
                        <div
                          key={method}
                          className="form-check form-check-inline"
                        >
                          <input
                            className="form-check-input"
                            type="radio"

                            id={method}
                            checked={paymentMethod === method}
                            onChange={() => {
                              setPaymentMethod(method);

                              const dueAmount =
                                Number(splitBillCalc?.total || 0) -
                                paymentEntries.reduce(
                                  (sum, p) => sum + Number(p.amount || 0),
                                  0
                                );
       
                                

                              setCurrentPayment({
                                method: method,
                                amount:
                                  dueAmount > 0 ? dueAmount.toFixed(2) : "",
                                tip: "",
                                upiSubMethod: "",
                                transactionId: "",
                              });
                            }}
                          />

                          <label className="form-check-label" htmlFor={method}>
                            {method}
                          </label>

                        </div>
                      ))}
                    </div>

                    {/* Payment Amount */}

                    {/* <div className="mb-3">
                 <label className="form-label">
                   Payment Amount <span className="text-danger">*</span>
                 </label>
               
                  <input
                   type="number"
                   className="form-control"
                   inputMode="decimal"
                   placeholder={`₹${Math.max(
                     0,
                     Number(splitBillCalc.total || 0) -
                     paymentEntries.reduce((sum, p) => sum + Number(p.amount || 0), 0)
                   ).toFixed(2)}`}
               
               value={currentPayment.amount}
               
               
                   onChange={(e) => {
                     const val = e.target.value;
                     // Allow empty string or valid decimal numbers
                     if (val === "" || /^\d*\.?\d{0,2}$/.test(val)) {
                       setCurrentPayment(prev => ({
                         ...prev,
                         amount: val
                       }));
                     }
                   }}
                   onFocus={(e) => {
                     // Auto-select the amount when focused for easy editing
                     e.target.select();
                   }}
                 />
               
               </div> */}
                    {paymentMethod === "UPI" &&
                      parseFloat(currentPayment.amount || 0) > 0 && (
                        <>
                          <div className="mb-3">
                            <label htmlFor="methodSelect">
                              Select UPI Method{" "}
                              <span className="text-danger">*</span>
                            </label>
                            <select
                              className="form-select"
                              id="methodSelect"
                              value={currentPayment?.upiSubMethod}
                              onChange={(e) =>
                                setCurrentPayment((cp) => ({
                                  ...cp,
                                  upiSubMethod: e.target.value,
                                }))
                              }
                            >
                              <option value="">Select Method</option>
                              <option value="Google Pay">Google Pay</option>
                              <option value="PhonePe">PhonePe</option>
                              <option value="Paytm">Paytm</option>
                              <option value="Other">Other</option>
                            </select>


                          </div>

                          <div className="mb-3">
                            <label htmlFor="transactionIdInput">
                              Transaction / Reference ID{" "}
                              {/* <span className="text-danger">*</span> */}
                            </label>
                            <input
                              type="text"
                              className="form-control"
                              id="transactionIdInput"
                              placeholder="Enter Transaction ID"
                              value={currentPayment.transactionId}
                              onChange={(e) =>
                                setCurrentPayment((cp) => ({
                                  ...cp,
                                  transactionId: e.target.value,
                                }))
                              }
                            />
                          </div>
                        </>
                      )}

                    <div className="mb-3">
                      <label className="form-label">
                        Payment Amount <span className="text-danger">*</span>
                      </label>

                      {/* <input
                   type="number"
                   className="form-control"
                   inputMode="decimal"
                   value={
                     currentPayment.amount !== ""
                       ? currentPayment.amount
                       : (
                           Math.max(
                             0,
                             Number(splitBillCalc.total || 0) -
                               paymentEntries.reduce(
                                 (sum, p) => sum + Number(p.amount || 0),
                                 0
                               )
                           ).toFixed(2)
                         )
                   }
                   onChange={(e) => {
                     const val = e.target.value;
                     if (parseFloat(val) < 0) return;
                     setCurrentPayment((prev) => ({
                       ...prev,
                       amount: val
                     }));
                     setPayClicked?.(false); // optional flag if you're using `Pay`/`Add` button toggle
                   }}
                   onFocus={(e) => {
                     e.target.select();
                   }}
                 /> */}

                      {/* <input
                 type="number"
                 className="form-control"
                 inputMode="decimal"
                 value={
                   currentPayment.amount !== ""
                     ? currentPayment.amount
                     : (
                         Math.max(
                           0,
                           Number(splitBillCalc.total || 0) -
                             paymentEntries.reduce((sum, p) => sum + Number(p.amount || 0), 0)
                         ).toFixed(2)
                       )
                 }
                 onChange={(e) => {
                   const val = e.target.value;
                   if (val === "" || /^\d*\.?\d{0,2}$/.test(val)) {
                     setCurrentPayment((prev) => ({
                       ...prev,
                       amount: val
                     }));
                     setPayClicked?.(false);
                   }
                 }}
                 onFocus={(e) => e.target.select()}
               /> */}

                      <input
                        type="number"
                        className="form-control"
                        inputMode="decimal"
                        disabled
                        placeholder={`₹${Math.max(
                          0,
                          Number(splitBillCalc?.total || 0) -
                          paymentEntries.reduce(
                            (sum, p) => sum + Number(p.amount || 0),
                            0
                          )
                        ).toFixed(2)}`}
                        value={currentPayment.amount}
                        onChange={(e) => {
                          const val = e.target.value;
                          // Allow empty string or valid decimal numbers
                          if (val === "" || /^\d*\.?\d{0,2}$/.test(val)) {
                            setCurrentPayment((prev) => ({
                              ...prev,
                              amount: val,
                            }));
                            setPayClicked?.(false); // Optional, retain if using Pay/Add toggle
                          }
                        }}
                        onFocus={(e) => {
                          // Auto-select the amount when focused for easy editing
                          e.target.select();
                        }}
                        onBlur={(e) => {
                          // If the field is empty when user leaves it, set it to the default amount
                          if (!e.target.value && splitBillCalc?.total) {
                            const dueAmount = Math.max(
                              0,
                              Number(splitBillCalc.total || 0) -
                              paymentEntries.reduce(
                                (sum, p) => sum + Number(p.amount || 0),
                                0
                              )
                            );
                            setCurrentPayment((prev) => ({
                              ...prev,
                              amount: dueAmount.toFixed(2),
                            }));
                          }
                        }}
                      />
                    </div>

                    {/* Tip */}
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

                    {/* UPI Options */}


                    {/* Add Payment Button */}

                    {/* <button
                 className="btn btn-sm btn-primary mb-3"
                 onClick={() => {
                   const round = (val) =>
                     Math.round((val + Number.EPSILON) * 100) / 100;
               
                   const amt = round(parseFloat(currentPayment.amount) || 0);
                   const tip = round(parseFloat(currentPayment.tip) || 0);
               
                   // ✅ Basic validation only
                   if (amt <= 0) {
                     Toaster.error("Please enter a valid amount");
                     return;
                   }
               
                   // ✅ For UPI, require a sub-method
                   if (paymentMethod === "UPI" && !currentPayment.upiSubMethod) {
                     Toaster.error("Please select a UPI method");
                     return;
                   }
               
                   // ✅ Add the entry without checking over/under payment
                   setPaymentEntries((prev) => [
                     ...prev,
                     {
                       method: paymentMethod,
                       amount: amt,
                       tip: tip,
                       upiSubMethod: currentPayment.upiSubMethod || "",
                       transactionId: currentPayment.transactionId || ""
                     }
                   ]);
               
                   setShowPaymentTable(true);
               
                   // ✅ Reset the form
                   setCurrentPayment({
                     method: "",
                     amount: "",
                     tip: "",
                     upiSubMethod: "",
                     transactionId: ""
                   });
                 }}
               >
                 Add Payment Entry
               </button> */}

                    <button
                      disabled={
                        !currentPayment.amount ||
                        parseFloat(currentPayment.amount || 0) <= 0
                      }
                      className="btn btn-sm btn-primary mb-3"
                      onClick={() => {
                        const round = (val) =>
                          Math.round((val + Number.EPSILON) * 100) / 100;

                        const amt = round(
                          parseFloat(currentPayment.amount || 0)
                        );
                        const tip = round(parseFloat(currentPayment.tip || 0));
                        const billTotal = round(
                          Number(splitBillCalc?.total || 0)
                        );
                        const paid = paymentEntries.reduce(
                          (sum, entry) => sum + parseFloat(entry.amount || 0),
                          0
                        );
                        const due = round(billTotal - paid);

                        if (!amt || amt <= 0) {
                          Toaster.error("Please enter a valid amount");
                          return;
                        }

                        if (amt > due) {
                          Toaster.error(
                            "You cannot enter an amount higher than the due"
                          );
                          return;
                        }

                        if (paymentMethod === "UPI") {
                          if (!currentPayment.upiSubMethod) {
                            Toaster.error("Please select a UPI method");
                            return;
                          }
                          // if (!currentPayment.transactionId) {
                          //   Toaster.error(
                          //     "Please enter a transaction/reference ID"
                          //   );
                          //   return;
                          // }
                        }

                        const newEntries = [
                          ...paymentEntries,
                          {
                            method:
                              paymentMethod === "UPI"
                                ? `UPI by ${currentPayment.upiSubMethod}`
                                : paymentMethod.charAt(0).toUpperCase() +
                                paymentMethod.slice(1),
                            amount: amt.toFixed(2),
                            tip: tip.toFixed(2),
                            transactionId:
                              paymentMethod === "UPI"
                                ? currentPayment.transactionId
                                : undefined,
                          },
                        ];

                        setPaymentEntries(newEntries);

                        const newDue = round(
                          billTotal -
                          newEntries.reduce(
                            (sum, e) => sum + parseFloat(e.amount || 0),
                            0
                          )
                        );

                        setCurrentPayment({
                          method: paymentMethod,
                          amount: newDue > 0 ? newDue.toFixed(2) : "",
                          tip: "",
                          upiSubMethod: "",
                          transactionId: "",
                        });

                        setShowPaymentTable(true);
                        setPayClicked?.(true); // optional flag for button label change
                      }}
                    >
                      Pay
                      {/* {payClicked ? "Add" : "Pay"} */}
                    </button>

                    {/* Payment Table */}
                    {paymentEntries.length > 0 && (
                      <div className="mb-3">
                        <table className="table table-bordered">
                          <thead>
                            <tr>
                              <th>Method</th>
                              <th>Amount</th>
                              <th>Tip</th>
                              <th>Action</th>
                            </tr>
                          </thead>
                          <tbody>
                            {paymentEntries.map((entry, idx) => (
                              <tr key={idx}>
                                <td>
                                  {entry.method}
                                  {entry.method === "UPI" &&
                                    entry.upiSubMethod && (
                                      <div
                                        style={{
                                          fontSize: "12px",
                                          color: "#555",
                                        }}
                                      >
                                        <i className="bi bi-upc-scan me-1"></i>
                                        {entry.upiSubMethod}
                                      </div>
                                    )}
                                </td>
                                <td>₹{Number(entry.amount).toFixed(2)}</td>
                                {/* <td>₹{Math.round(Number(entry.amount))}</td> */}

                                <td>₹{Number(entry.tip || 0).toFixed(2)}</td>
                                <td>
                                  {/* <button
                       className="btn btn-outline-danger btn-sm d-flex align-items-center justify-content-center"
                       onClick={() =>
                         setPaymentEntries((prev) => prev.filter((_, i) => i !== idx))
                       }
                     >
                       <i className="bi bi-trash"></i>
                     </button> */}
                                  <button
                                    className="btn btn-outline-danger btn-sm d-flex align-items-center justify-content-center"
                                    onClick={() => {
                                      setPaymentEntries((prev) => {
                                        const updated = prev.filter(
                                          (_, i) => i !== idx
                                        );

                                        // 👇 Calculate new due
                                        const total = Number(
                                          splitBillCalc?.total || 0
                                        );
                                        const paid = updated.reduce(
                                          (sum, p) =>
                                            sum + Number(p.amount || 0),
                                          0
                                        );
                                        const newDue = Math.max(
                                          0,
                                          total - paid
                                        );

                                        // 👇 Update input value to reflect due
                                        setCurrentPayment((prevPay) => ({
                                          ...prevPay,
                                          amount: newDue.toFixed(2),
                                        }));

                                        return updated;
                                      });
                                    }}
                                  >
                                    <i className="bi bi-trash"></i>
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>

                        {(() => {
                          const round = (val) =>
                            Math.round((val + Number.EPSILON) * 100) / 100;

                          const totalPaid = round(
                            paymentEntries.reduce(
                              (sum, p) => sum + (parseFloat(p.amount) || 0),
                              0
                            )
                          );
                          {/* const totalPaid = Math.round(
  paymentEntries.reduce(
    (sum, p) => sum + (parseFloat(p.amount) || 0),
    0
  )
); */}


                          const totalTip = round(
                            paymentEntries.reduce(
                              (sum, p) => sum + (parseFloat(p.tip) || 0),
                              0
                            )
                          );

                          const dueAmount = Math.max(
                            0,
                            round((splitBillCalc?.total || 0) - totalPaid)
                          );
                          {/* const dueAmount = Math.max(
  0,
  Math.round((splitBillCalc?.total || 0) - totalPaid)
); */}


                          return (
                            <>
                              <p>
                                <strong>Total Paid:</strong> ₹
                                {totalPaid.toFixed(2)}
                              </p>
                              <p>
                                <strong>Total Tip:</strong> ₹
                                {totalTip.toFixed(2)}
                              </p>
                              <p>
                                <strong>Due:</strong> ₹{dueAmount.toFixed(2)}
                              </p>
                            </>
                          );
                        })()}
                      </div>
                    )}

                    <hr />

                    {/* Action Buttons */}
                    <div className="d-flex justify-content-end gap-3">
                      {Math.abs(
                        Number(splitBillCalc?.total || 0) -
                        paymentEntries.reduce(
                          (sum, p) => sum + Number(p.amount || 0),
                          0
                        )
                      ) < 0.01 && (
                          <>
                            <button
                              className="btn btn-success"
                              onClick={() => {
                                const round = (val) =>
                                  Math.round((val + Number.EPSILON) * 100) / 100;

                                const billTotal = round(
                                  Number(splitBillCalc?.total || 0)
                                );
                                const totalPaid = round(
                                  paymentEntries.reduce(
                                    (sum, p) => sum + parseFloat(p.amount || 0),
                                    0
                                  )
                                );

                                if (totalPaid < billTotal) {
                                  const due = round(billTotal - totalPaid);
                                  Toaster.error(
                                    `Payment incomplete. Still due: ₹${due.toFixed(
                                      2
                                    )}`
                                  );
                                  return;
                                }

                                handleMarkSplitBillPaid();
                              }}
                            >
                              Paid{" "}
                            </button>
                            <button
                              className="btn btn-success"
                              onClick={async () => {
                                const round = (val) =>
                                  Math.round((val + Number.EPSILON) * 100) / 100;

                                const billTotal = round(
                                  Number(splitBillCalc?.total || 0)
                                );
                                const totalPaid = round(
                                  paymentEntries.reduce(
                                    (sum, p) => sum + parseFloat(p.amount || 0),
                                    0
                                  )
                                );

                                if (totalPaid < billTotal) {
                                  const due = round(billTotal - totalPaid);
                                  Toaster.error(
                                    `Payment incomplete. Still due: ₹${due.toFixed(
                                      2
                                    )}`
                                  );
                                  return;
                                }

                                // First mark as paid
                                await handleMarkSplitBillPaid();

                                // Then print the bill
                                setTimeout(() => {
                                  handleSplitBillPrint();
                                }, 1000);
                              }}
                            >
                              Paid & Print Bill
                            </button>
                          </>
                        )}

                      {/* <button className="btn btn-success" onClick={handleMarkSplitBillPaid}>
                       Paid
                     </button> */}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export async function fetchAllProducts({
  setTblCategoryDetails,
  setMenuCategories,
  setProducts,
  setWaiterDetails,
  setServiceChargeDetails,
  setFullLoader,
  setLoadingTables,
  setLoadingMenu,
  setErrorTables,
  setErrorMenu,
  Toaster,
  onTblCategoryDetails,
  onWaiterDetails,
}) {
  try {
    setFullLoader(true);
    const response = await axiosInstance.get(AllProduct);
    setTblCategoryDetails(response.data.tblCategoryDetails || []);
    setMenuCategories(response.data.menus || []);

    setMenusDB(response.data.menus || []);
    setProducts(response.data.product || []);
    setWaiterDetails && setWaiterDetails(response.data.waiterDetails || []);
    setServiceChargeDetails(response.data.service_charge_details);
    if (typeof onTblCategoryDetails === "function") {
      onTblCategoryDetails(response.data.tblCategoryDetails || []);
    }
    if (typeof onWaiterDetails === "function") {
      onWaiterDetails(response.data.waiterDetails || []);
    }
    setLoadingTables(false);
    setLoadingMenu(false);
  } catch (err) {
    setTblCategoryDetails([]);
    setMenuCategories([]);
    setProducts([]);
    setLoadingTables(false);
    setLoadingMenu(false);
    setErrorTables(err);
    setErrorMenu(err);
    Toaster(err.message || "Something went wrong");
  } finally {
    setFullLoader(false);
  }
}

export default ResponsivePOSLayout;
