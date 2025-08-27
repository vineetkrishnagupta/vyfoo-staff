import React, { useState, useEffect, useRef } from "react";
import MainHeader from "./MainHeader";
import Sidebar from "./Sidebar";
import axiosInstance from "../utlis/axiosinstance";
import { LiveOrderGetAPI, OrderDetailsGetAPI, UpdateOrderStatus, PostPartialPaymentForDineIn } from "../BaseURL/baseURL";
import Toaster from "../utlis/Toaster";
import { calculateBillingSummary, formatCurrency } from "../utlis/billCalculations";
import { Modal } from "react-bootstrap";
import { getAppDataFromDB } from "../utlis/indexedDB";
import LoadingModal from "../utlis/LoadingModal";
import Notification from "./Notification";


import { useAuth } from "../AuthContext";
import Tooltip from "@mui/material/Tooltip";
 
function formatUnixTimestampToIST(unixTimestamp) {
  if (!unixTimestamp) return "";
  const date = new Date(Number(unixTimestamp) * 1000);
  const options = {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true, // 12-hour format
    timeZone: "Asia/Kolkata",
  };
  const dateTime = date.toLocaleString("en-GB", options);
  const [datePart, timePart] = dateTime.split(", ");
  return `${datePart}, ${timePart}`;
}


// Get payment status badge
function getPaymentStatusLabelAndClass(status) {
  switch (status) {
    case 1:
      return { label: "Paid", className: "bg-success text-white" };
    case 2:
      return { label: "Hold", className: "bg-warning text-dark" };
    case 3:
      return { label: "Partial", className: "bg-primary text-white" };
    default:
      return { label: "Unpaid", className: "bg-danger text-white" };
  }
}

function LiveOrder() {

  const { flage, setFlage } = useAuth();


  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const { data } = await axiosInstance.get(LiveOrderGetAPI);
        if (data?.status === "success") {
          setOrders(data.data || []);
        }
      } catch (error) {
        console.error("Error fetching live orders:", error);
      }
    };

    fetchOrders();
  }, [flage]);



  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loading1, setLoading1] = useState(false);

  const [showModal, setShowModal] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [orderDetails, setOrderDetails] = useState(null);

  const [filter, setFilter] = useState("all");
  const filteredOrders = orders?.filter((order) => {
    if (filter === "all") return true;
    if (filter === "pending") return order.status === 0;
    if (filter === "accepted") return order.status === 1;
    if (filter === "ready") return order.status === 2;
    return true;
  });

  const allOrders = orders?.length || 0;
  const pendingOrders = orders?.filter(order => order.status === 0).length;
  const acceptedOrders = orders?.filter(order => order.status === 1).length;
  const readyOrders = orders?.filter(order => order.status === 2).length;

  // Settlement modal states
  const [showSettlePaidModal, setShowSettlePaidModal] = useState(false);
  const [settleBillData, setSettleBillData] = useState(null);
  const [settleBillCalculations, setSettleBillCalculations] = useState({
    subtotal: 0,
    discount: 0,
    serviceCharge: 0,
    tax: 0,
    packagingFee: 0,
    total: 0,
    roundOff: 0,
    taxDetails: []
  });


  console.log(orderDetails, "orderDetails");
  console.log(JSON.stringify(settleBillCalculations), "settleBillCalculations");
  // Payment states
  const [paymentMethodsToShow] = useState([
    "Cash",
    "Card",
    "NEFT",
    "UPI",
    "Zomato",
    "Swiggy",
    "Dineout",
    "Hold"
  ]);
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [currentPayment, setCurrentPayment] = useState({
    method: 'cash',
    amount: '',
    tip: '',
    upiSubMethod: '',
    transactionId: ''
  });
  const [paymentEntries, setPaymentEntries] = useState([]);
  const [showOrderDetails, setShowOrderDetails] = useState(false);
  const [reason, setReason] = useState('');
  const [discountMode, setDiscountMode] = useState(0);
  const [discountValue, setDiscountValue] = useState(0);
  // Discount states for modal
  const [modalDiscountType, setModalDiscountType] = useState('%');
  const [modalDiscountValue, setModalDiscountValue] = useState(0);  // KOT Modal states
  const [showKOTModal, setShowKOTModal] = useState(false);
  const [kotData, setKotData] = useState([]);
  const [kotLoading, setKotLoading] = useState(false);
  const [currentOrderId, setCurrentOrderId] = useState(null);
  const [currentOrderNo, setCurrentOrderNo] = useState(null);

  // Print Bills Modal states
  const [showPrintBillsModal, setShowPrintBillsModal] = useState(false);
  const [billsData, setBillsData] = useState([]);
  const [billsLoading, setBillsLoading] = useState(false);
  const [showPaidOrPartiallyPaidModal, setShowPaidOrPartiallyPaidModal] = useState(false);

  const [productTotal, setProductTotal] = useState({});
  const [upi, setUpi] = useState("")
  const [showPayDue, setShowPayDue] = useState(false);
  const [paymentMode, setPaymentMode] = useState('Cash');
  const [table_notoshowonkot, setTable_notoshowonkot] = useState("")

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);
  const orderModalBodyRef = useRef(null);
  const settleModalBodyRef = useRef(null);
  const kotModalBodyRef = useRef(null);
  const printBillsModalBodyRef = useRef(null);

  useEffect(() => {
    if (showModal && orderModalBodyRef.current) {
      orderModalBodyRef.current.scrollTop = 0;
    }
  }, [showModal]);

  useEffect(() => {
    if (showSettlePaidModal && settleModalBodyRef.current) {
      settleModalBodyRef.current.scrollTop = 0;
    }
  }, [showSettlePaidModal]);

  useEffect(() => {
    if (showKOTModal && kotModalBodyRef.current) {
      kotModalBodyRef.current.scrollTop = 0;
    }
  }, [showKOTModal]);

  useEffect(() => {
    if (showPrintBillsModal && printBillsModalBodyRef.current) {
      printBillsModalBodyRef.current.scrollTop = 0;
    }
  }, [showPrintBillsModal]);
  // Calculate settle bill totals
  const calculateSettleBillSubtotal = (items) => {
    return items.reduce((sum, item) => sum + (item.withOutTaxPrice * item.quantity), 0);
  };

  const calculateSettleBillDiscount = (subtotal, discountType, discountValue) => {
    if (discountType === 0) {
      return (subtotal * discountValue) / 100;
    } else {
      return Math.min(discountValue, subtotal);
    }
  };
  // useEffect(() => {
  //   setProductTotal(calculateBillingSummary(orderDetails?.details,
  //     { 
  //                            mode: orderDetails?.discount_type === 'percent' ? 0 : 1, 
  //                            value: parseFloat(orderDetails?.discount_rate || 0) 
  //                          },
  //                          {
  //                            name: orderDetails?.service_charge_details?.name || 'SCH',
  //                            percentage: parseFloat(orderDetails?.service_charge_details?.percentage || 0)
  //                          },
  //                          { 
  //                            orderMode: 'DINE IN', 
  //                            isNC: false 
  //                          }
  //   ))
  // },[orderDetails])

  useEffect(() => {
    const allItems = orderDetails?.details || [];

    // Sirf active (non-cancelled) items ka array
    const activeItems = allItems.filter(item => item.is_cancelled !== 1);

    // Cancelled items ka subtotal agar active items na ho to dikhana
    let billingSummary = calculateBillingSummary(
      activeItems,
      {
        mode: orderDetails?.discount_type === 'percent' ? 0 : 1,
        value: parseFloat(orderDetails?.discount_rate || 0)
      },
      {
        name: orderDetails?.service_charge_details?.name || 'SCH',
        percentage: parseFloat(orderDetails?.service_charge_details?.percentage || 0)
      },
      {
        orderMode: 'DINE IN',
        isNC: false
      }
    );

    // Agar activeItems khali hain to cancelled ka total le aao
    if (activeItems.length === 0) {
      const cancelledTotal = allItems.reduce((sum, item) => {
        return sum + (parseFloat(item.product_price) * item.quantity);
      }, 0);

      billingSummary = {
        ...billingSummary,
        subtotal: cancelledTotal
      };
    }

    // Items count sirf active items ka
    setProductTotal({
      ...billingSummary,
      itemsCount: activeItems.length
    });
  }, [orderDetails]);


  console.log(productTotal, "productTotal");


  const change_order_status_reject = async (id) => {
    try {
      setLoading1(true);

      const data = { id: id, status: 4, order_preparation_time: "10" }; // 4 = Rejected
      const response = await axiosInstance.put(UpdateOrderStatus, data);

      if (response.data?.status === 'success') {
        Toaster.success(response.data.message);

        // Refresh orders list
        const { data: ordersRes } = await axiosInstance.get(LiveOrderGetAPI);
        if (ordersRes?.status === "success") {
          setOrders(ordersRes.data || []);
        }

        // ✅ Refresh order details directly
        const modalResponse = await axiosInstance.get(OrderDetailsGetAPI, {
          params: { id: id }
        });
        if (modalResponse.data?.data?.id) {
          setOrderDetails(modalResponse.data.data);
        }

        // ✅ Modal close
        setShowModal(false);

      } else {
        Toaster.error(response.data?.message || 'Failed to reject order');
      }
    } catch (error) {
      console.error("Error rejecting order status:", error);
    } finally {
      setLoading1(false);
    }
  };


  const change_order_status_accept = async (id) => {
    try {
      setLoading1(true);

      const data = { id: id, status: 1, order_preparation_time: "10" };
      const response = await axiosInstance.put(UpdateOrderStatus, data);

      if (response.data?.status === 'success') {
        Toaster.success(response.data.message);

        // Refresh orders list
        const { data: ordersRes } = await axiosInstance.get(LiveOrderGetAPI);
        if (ordersRes?.status === "success") {
          setOrders(ordersRes.data || []);
        }

        // ✅ Refresh order details directly
        const modalResponse = await axiosInstance.get(OrderDetailsGetAPI, {
          params: { id: id }
        });
        if (modalResponse.data?.data?.id) {
          setOrderDetails(modalResponse.data.data);
        }
      } else {
        Toaster.error(response.data?.message || 'Failed to accept order');
      }
    } catch (error) {
      console.error("Error accepting order:", error);
    } finally {
      setLoading1(false);
    }
  };


  const calculateSettleBillServiceCharge = (subtotalAfterDiscount, schPercent) => {
    return (subtotalAfterDiscount * schPercent) / 100;
  };

  const calculateSettleBillTax = (items, subtotal, discount, sch, schPercent) => {
    const taxMap = {};
    const taxDetails = [];

    items.forEach(item => {
      const rate = parseFloat(item.tax_percent) || 0;
      if (rate > 0) {
        const itemBase = item.withOutTaxPrice * item.quantity;
        const itemDiscount = subtotal > 0 ? (itemBase / subtotal) * discount : 0;
        const itemPriceAfterDiscount = itemBase - itemDiscount;
        const itemSCH = schPercent > 0 ? (itemPriceAfterDiscount * schPercent) / 100 : 0;
        const taxBase = itemPriceAfterDiscount + itemSCH;
        const itemTax = (taxBase * rate) / 100;
        taxMap[rate] = (taxMap[rate] || 0) + itemTax;
      }
    });

    // Convert tax map to details with CGST/SGST split
    Object.entries(taxMap).forEach(([rate, amount]) => {
      const halfRate = parseFloat(rate) / 2;
      const halfAmount = amount / 2;
      taxDetails.push(
        { name: "CGST", percentage: halfRate, amount: halfAmount },
        { name: "SGST", percentage: halfRate, amount: halfAmount }
      );
    });

    return {
      totalTax: Object.values(taxMap).reduce((sum, tax) => sum + tax, 0),
      taxDetails
    };
  };

  const calculateRoundOff = (rawTotal) => {
    return Math.round(rawTotal) - rawTotal;
  };

  const calculateSettleBillTotal = (items, discountType, discountValue, schPercent, order_type) => {
    const subtotal = calculateSettleBillSubtotal(items);
    const discount = calculateSettleBillDiscount(subtotal, discountType, discountValue);
    const subtotalAfterDiscount = subtotal - discount;
    const serviceCharge = calculateSettleBillServiceCharge(subtotalAfterDiscount, schPercent);
    const { totalTax, taxDetails } = calculateSettleBillTax(items, subtotal, discount, serviceCharge, schPercent);

    // Calculate packaging fee from all items (quantity * packaging_fee)
let packagingFee = 0

if(order_type !== 'dine_in'){
packagingFee = items.reduce((sum, item) => {
      const itemPackagingFee = parseFloat(item.packaging_fee || 0);
      return sum + (itemPackagingFee * item.quantity);
    }, 0);
}
      

    // Add packaging fee to total after all other calculations (not affected by discount/tax)
    const rawTotal = subtotalAfterDiscount + serviceCharge + totalTax + packagingFee;
    const roundOff = calculateRoundOff(rawTotal);
    const total = Math.round(rawTotal);

    return {
      subtotal,
      discount,
      serviceCharge,
      tax: totalTax,
      packagingFee,
      total,
      roundOff,
      taxDetails
    };
  };

  console.log(orders)


  const handleMarkAsPaid = async (orderId) => {
    try {
      setLoading1(true);

      const response = await axiosInstance.get(`/api/order/getorderitemsbyorderid?id=${orderId}`);

      if (response.data?.data) {
        const orderData = response.data.data;

        // Transform the order data to match the settlement format
        const kotDetails = orderData.items.map(item => ({
          id: item.id,
          name: item.name,
          quantity: item.quantity,
          price: parseFloat(item.price),
          withOutTaxPrice: parseFloat(item.withOutTaxPrice),
          withTaxPrice: parseFloat(item.price),
          tax_percent: parseFloat(item.tax_percent || 0),
          tax_type: item.tax_type || 1,
          packaging_charges: 0,
          packaging_fee: parseFloat(item.packaging_fee || 0), // Add packaging fee
          orderId: item.orderId,
          orderNo: item.orderNo,
          table_id: item.table_id,
          fooder_id: item.fooder_id,
          isKOT: true,
          isSaved: true,
          KOT_id: item.KOT_id,
          KOT_no: item.KOT_no,
          KOT_time: item.kot_timestamp,
          selectedAddons: [],
          selectedvariants: {},
          variant_id: item.variant_id,
          addons: [],
          attributes: [],
          discount_type: parseInt(orderData.discountDetails?.discount_type || 0),
          discount_value: parseFloat(orderData.discountDetails?.discount_value || 0),
          order_service_charge: {
            name: orderData.order_service_charge?.name || "SCH",
            percentage: parseFloat(orderData.order_service_charge?.percentage || 0)
          }
        }));

        const settlementData = {
          kot_details: kotDetails,
          order_type: orderData.order_type // ✅ Add order_type here
        };

        setSettleBillData(settlementData);

        // Get discount and service charge details
        const discountType = parseInt(orderData.discountDetails?.discount_type || 0);
        const discountValueFromAPI = parseFloat(orderData.discountDetails?.discount_value || 0);
        const schPercent = parseFloat(orderData.order_service_charge?.percentage || 0);

        // Calculate bill totals
        const calculations = calculateSettleBillTotal(
          kotDetails,
          discountType,
          discountValueFromAPI,
          schPercent,
          orderData.order_type
        );

        setSettleBillCalculations(calculations);

        // Reset payment entries for new bill and set total amount
        setPaymentEntries([]);
        setCurrentPayment({
          method: 'Cash',
          amount: calculations.total.toFixed(2),
          tip: '',
          upiSubMethod: '',
          transactionId: ''
        });
        setPaymentMethod('cash');
        setDiscountMode(discountType);
        setDiscountValue(discountValueFromAPI);

        setShowSettlePaidModal(true);
      } else {
        Toaster.error("Failed to load order details");
      }
    } catch (error) {
      console.error("Error loading order for settlement:", error);
      Toaster.error(error?.response?.data?.message || "Failed to load order details");
    } finally {
      setLoading1(false);
    }
  };

  // Helper function to handle common success actions
  const handlePaymentSuccess = async () => {
    // Reset state after successful payment
    setShowSettlePaidModal(false);
    setSettleBillData(null);
    setSettleBillCalculations({
      subtotal: 0,
      discount: 0,
      serviceCharge: 0,
      tax: 0,
      packagingFee: 0,
      total: 0,
      roundOff: 0,
      taxDetails: []
    });
    setPaymentEntries([]);
    setCurrentPayment({
      method: 'Cash',
      amount: '',
      tip: '',
      upiSubMethod: '',
      transactionId: ''
    });
    setPaymentMethod('cash');

    // Refresh orders list
    const { data } = await axiosInstance.get(LiveOrderGetAPI);
    if (data?.status === "success") {
      setOrders(data.data || []);
    }

    // Refresh modal data if it's open
    if (showModal && orderDetails?.id) {
      try {
        const modalResponse = await axiosInstance.get(OrderDetailsGetAPI, {
          params: { id: orderDetails.id }
        });
        if (modalResponse.data?.data?.id) {
          setOrderDetails(modalResponse.data.data);
        }
      } catch (modalError) {
        console.error('Error refreshing modal:', modalError);
      }
    }
  };


  const handleSettleBillPayment = async () => {
    if (!settleBillData || !settleBillData.kot_details || settleBillData.kot_details.length === 0) {
      Toaster.error("No bill data available");
      return;
    }

    setLoading1(true);
    try {
      const firstItem = settleBillData.kot_details[0];
      const orderId = firstItem.orderId;

      if (!orderId) {
        Toaster.error("Order ID not found");
        return;
      }

      // Get order type from settleBillData or fetch it
      const orderType = settleBillData.order_type; // This should be set when we fetch the data

      // Prepare payment details from payment entries
      const paymentDetails = paymentEntries.map(entry => ({
        method: entry.method,
        amount: entry.amount,
        tip: entry.tip || "0.00",
        upiType: entry.upiSubMethod || '',
        note: entry.note || '',
        transaction_id: entry.transactionId || '',
      }));

      // Calculate totals
      const totalPaid = paymentEntries.reduce(
        (sum, entry) => sum + parseFloat(entry.amount || 0),
        0
      );
      const dueAmount = (settleBillCalculations.total - totalPaid).toFixed(2);

      if (orderType === "dine_in") {
        // Original dine-in logic
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
            percentage: 0
          },
          tax_amount: settleBillCalculations.tax.toFixed(2),
          tax_details: settleBillCalculations.taxDetails || [],
          paided_amount: totalPaid.toFixed(2),
          total: settleBillCalculations.total.toFixed(2),
          payment_status: dueAmount <= 0 ? 1 : (totalPaid > 0 ? 3 : 0),
          round_up_amount: Number(settleBillCalculations.roundOff),
          item: settleBillData.kot_details.map(item => ({
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

        const response = await axiosInstance.post('/api/payment/partialpaymentfordinein', payload);

        if (response.data && response.data.status === 'success') {
          Toaster.success(response.data.message || 'Payment successful');
          handlePaymentSuccess();
        } else {
          Toaster.error(response.data?.message || 'Payment failed');
        }
      } else if (orderType === "delivery" || orderType === "take_away") {
        // New logic for delivery/take_away
        const payload = {
          order_id: orderId,
          subtotal: settleBillCalculations.subtotal.toFixed(2),
          discount_type: firstItem.discount_type?.toString() || "0",
          discount_rate: firstItem.discount_value?.toString() || "0",
          discount_value: settleBillCalculations.discount.toFixed(2),
          payment_details: paymentDetails,
          due_amount: dueAmount,
          service_charge: firstItem.order_service_charge?.percentage || 0,
          service_charge_details: {
            foreigner_service_charge_name: "foreigner_service_charge",
            foreigner_service_charge_value: 10
          },
          tax_amount: settleBillCalculations.tax.toFixed(2),
          tax_details: settleBillCalculations.taxDetails || [],
          paided_amount: totalPaid.toFixed(2),
          total: settleBillCalculations.total.toFixed(2),
          payment_status: dueAmount <= 0 ? 1 : (totalPaid > 0 ? 3 : 0),
          round_up_amount: Number(settleBillCalculations.roundOff),
          item: settleBillData.kot_details.map(item => ({
            product_id: item.id,
            product_name: item.name,
            quantity: item.quantity,
            price: item.price,
            withOutTaxPrice: item.withOutTaxPrice,
            packaging_charges: item.packaging_fee?.toString() || "0",
            tax_percent: item.tax_percent,
            tax_type: item.tax_type,
            product_type: item.product_type || 0,
            dine_in_service: item.dine_in_service || 1,
            delivery_service: item.delivery_service || 1,
            pick_up_service: item.pick_up_service || 1,
            min_order_quantity: item.min_order_quantity || 1,
            table_id: "",
            fooder_name: "",
            product_special_note: item.product_special_note || "",
            isKOT: item.isKOT,
            isSaved: item.isSaved,
            KOT_id: item.KOT_id,
            KOT_no: item.KOT_no,
            KOT_time: item.KOT_time,
            selectedAddons: item.selectedAddons || [],
            selectedvariants: item.selectedvariants || { variantId: "0" },
            addons: item.addons || [],
            attributes: item.attributes || [],
          })),
        };

        const response = await axiosInstance.post('/api/payment/posPaymentForDelivaryAndPickUp', payload);

        if (response.data && response.data.status === 'success') {
          Toaster.success(response.data.message || 'Payment successful');
          handlePaymentSuccess();
        } else {
          Toaster.error(response.data?.message || 'Payment failed');
        }
      }

    } catch (error) {
      console.error('Settle bill payment error:', error);
      Toaster.error(error?.response?.data?.message || 'Payment failed');
    } finally {
      setLoading1(false);
    }
  };

  useEffect(() => {
    const fetchLiveOrders = async () => {
      try {
        setDetailLoading(true);
        const { data } = await axiosInstance.get(LiveOrderGetAPI);
        if (data?.status === "success") {
          setOrders(data.data || []);
        } else {
          Toaster.error(data?.message || "Failed to fetch live orders");
        }
      } catch (error) {
        Toaster.error(
          error.response?.data?.message ||
          error.message ||
          "Failed to fetch live orders"
        );
      } finally {
        setDetailLoading(false);
      }
    };
    fetchLiveOrders();
  }, []);



  const handleView = async (orderId) => {
    setShowModal(true);
    setLoading(true)
    // setDetailLoading(true);
    setOrderDetails(null);

    try {

      const { data } = await axiosInstance.get(OrderDetailsGetAPI, {
        params: {
          id: orderId,
        }

      });

      if (data.data?.id) {
        setOrderDetails(data.data);
      } else {
        Toaster.error(data.message || "Failed to fetch order details");
      }
    } catch (error) {
      Toaster.error(
        error.response?.data?.message ||
        error.message ||
        "Failed to fetch order details"
      );
    } finally {
      // setDetailLoading(false);
      setLoading(false);
    }
  }; const handleMarkAsOrderReady = async (orderId) => {
    try {
      setLoading1(true);

      // Call API to mark order as ready
      const response = await axiosInstance.patch('/api/order/updateliveorderaction', {
        id: orderId,
        status: 2
      });

      if (response.data?.status === 'success') {
        Toaster.success('Order marked as ready successfully');

        // Refresh orders list
        const { data } = await axiosInstance.get(LiveOrderGetAPI);
        if (data?.status === "success") {
          setOrders(data.data || []);
        }

        // If modal is open and this is the same order, refresh modal data
        if (showModal && orderDetails?.id === orderId) {
          try {
            const modalResponse = await axiosInstance.get(OrderDetailsGetAPI, {
              params: { id: orderId }
            });
            if (modalResponse.data?.data?.id) {
              setOrderDetails(modalResponse.data.data);
            }
          } catch (modalError) {
            console.error('Error refreshing modal:', modalError);
          }
        }
      } else {
        Toaster.error(response.data?.message || 'Failed to mark order as ready');
      }
    } catch (error) {
      console.error('Mark as ready error:', error);
      Toaster.error(error?.response?.data?.message || 'Failed to mark order as ready');
    } finally {
      setLoading1(false);
    }
  };

  //   const handlePrintKOT = async (orderId) => {
  //     try {
  //       // setKotLoading(true);
  //       // setDetailLoading(true)
  //  setLoading1(true)
  //       setCurrentOrderId(orderId);

  //       // Fetch KOT data using the order items API
  //       const response = await axiosInstance.get(`/api/order/getorderitemsbyorderid?id=${orderId}`);

  //       if (response.data?.success === true && response.data?.data) {
  //         const data = response.data.data;
  //         const data2 = response.data
  //        console.log("kot data -",data);
  //         // Set order number from the first item
  //         if (data.items && data.items.length > 0) {
  //           setCurrentOrderNo(data.items[0].orderNo);
  //         }
  //         setTable_notoshowonkot(data2.table_no)

  //         // Group items by KOT ID
  //         const groupedKOTs = {};

  //         data.items.forEach(item => {
  //           const kotId = item.KOT_id;
  //           if (!groupedKOTs[kotId]) {
  //             groupedKOTs[kotId] = {
  //               kot_id: kotId,
  //               kot_no: item.KOT_no || `KOT-${kotId}`,
  //             table_no: data.table_no && data.table_no.trim() !== "" 
  //   ? data.table_no 
  //   : data.order_type.replace("_", " ").replace(/\b\w/g, c => c.toUpperCase()),
  //              order_mode: data.order_type.replace("_", " ").replace(/\b\w/g, c => c.toUpperCase()), 
  //               order_no: currentOrderNo || '', // Default to DINE IN as shown in image
  //               kot_timestamp: item.kot_timestamp,
  //               items: []
  //             };
  //           }
  //           groupedKOTs[kotId].items.push({
  //             id: item.id,
  //             local_id: item.local_id,
  //             unique_id: `${item.id}_${item.local_id}`, // Unique identifier
  //             name: item.name,
  //             order_no: item.orderNo,
  //             addons:item.addons,
  //             variant:item.variant,
  //             quantity: item.quantity,
  //             price: item.price,
  //             notes: item.product_special_note || ''
  //           });
  //         });

  //         setKotData(Object.values(groupedKOTs));
  //         setShowKOTModal(true);
  //       } else {
  //         Toaster.error('No KOT data found for this order');
  //       }
  //     } catch (error) {
  //       console.error('Fetch KOT data error:', error);
  //       Toaster.error('Failed to fetch KOT data');
  //     } finally {
  //       // setKotLoading(false);
  //       // setDetailLoading(false)
  //       setLoading1(false)

  //     }
  //   };

  // {paritial payment when modal open}

  const handlePrintKOT = async (orderId) => {
    try {
      setLoading1(true)
      setCurrentOrderId(orderId);

      // Fetch KOT data using the order items API
      const response = await axiosInstance.get(`/api/order/getorderitemsbyorderid?id=${orderId}`);

      if (response.data?.success === true && response.data?.data) {
        const data = response.data.data;
        const data2 = response.data
        console.log("kot data -", data);

        // Set order number from the first item
        if (data.items && data.items.length > 0) {
          setCurrentOrderNo(data.items[0].orderNo);
        }
        setTable_notoshowonkot(data2.table_no)

        // Group items by KOT ID
        const groupedKOTs = {};

        data.items.forEach(item => {
          const kotId = item.KOT_id;
          if (!groupedKOTs[kotId]) {
            groupedKOTs[kotId] = {
              kot_id: kotId,
              kot_no: item.KOT_no || `KOT-${kotId}`,
              table_no: data.table_no && data.table_no.trim() !== ""
                ? data.table_no
                : data.order_type.replace("_", " ").replace(/\b\w/g, c => c.toUpperCase()),
              order_mode: data.order_type.replace("_", " ").replace(/\b\w/g, c => c.toUpperCase()),
              order_no: currentOrderNo || '',
              kot_timestamp: item.kot_timestamp,
              items: []
            };
          }
          groupedKOTs[kotId].items.push({
            id: item.id,
            local_id: item.local_id,
            unique_id: `${item.id}_${item.local_id}`, // Unique identifier
            name: item.name,
            order_no: item.orderNo,
            // ✅ Include variants and addons
            selectedvariants: item.selectedvariants,
            addons: item.addons,
            quantity: item.quantity,
            price: item.price,
            product_special_note: item.product_special_note || ''
          });
        });

        setKotData(Object.values(groupedKOTs));
        setShowKOTModal(true);
      } else {
        Toaster.error('No KOT data found for this order');
      }
    } catch (error) {
      console.error('Fetch KOT data error:', error);
      Toaster.error('Failed to fetch KOT data');
    } finally {
      setLoading1(false)
    }
  };
  const handlePartialPayment = async (payload) => {
    try {
      setLoading1(true);
      console.log("📤 API Payload:", payload);

      const response = await axiosInstance.put(
        '/api/order/liveorderpartialpaidduepayment',
        payload
      );

      if (response.data?.status === 'success') {
        Toaster.success(response.data?.message || 'Partial payment updated successfully');

        // ✅ Modal close yaha pe kar rahe hain
        setShowPayDue(false);
        setShowPaidOrPartiallyPaidModal(false);

        setPaymentMode('Cash');
        setUpi('');

        // Reload orders
        const { data } = await axiosInstance.get(LiveOrderGetAPI);
        if (data?.status === "success") {
          setOrders(data.data || []);
        }

        // Reload current order details
        if (orderDetails?.id) {
          const orderDetailsResponse = await axiosInstance.get(OrderDetailsGetAPI, {
            params: { id: orderDetails.id }
          });
          if (orderDetailsResponse.data?.data?.id) {
            setOrderDetails(orderDetailsResponse.data.data);
          }
        }
      } else {
        Toaster.error(response.data?.message || 'Failed to update partial payment');
      }
    } catch (error) {
      console.error('Partial payment error:', error);
      Toaster.error(error?.response?.data?.message || 'Failed to update partial payment');
    } finally {
      setLoading1(false);
    }
  }







  const handleApplyDiscount = async () => {
    try {
      setLoading1(true);
      // setDetailLoading(true)

      // Validate discount value
      // if (!modalDiscountValue || parseFloat(modalDiscountValue) <= 0) {
      //   Toaster.error('Please enter a valid discount value');
      //   return;
      // }
      if (modalDiscountType === '%' && modalDiscountValue === "") {
        Toaster.error('Please enter a valid discount percentage');
        return;
      }

      if (modalDiscountType === '₹' && modalDiscountValue === "") {
        Toaster.error('Please enter a valid fixed discount value');
        return;
      }

      if (modalDiscountType === '%' && (modalDiscountValue < 0 || modalDiscountValue > 100)) {
        Toaster.error('Please enter a valid discount percentage (0-100)');
        return;
      }

      if (modalDiscountType === '₹' && (modalDiscountValue <= 0 || modalDiscountValue > orderDetails?.subtotal)) {
        Toaster.error('Please enter a valid fixed discount value');
        return;
      }

      // Call API to apply discount
      const response = await axiosInstance.patch('/api/order/applydiscount', {
        id: orderDetails?.id,
        discount_type: modalDiscountType === '%' ? 0 : 1,
        discount_rate: parseFloat(modalDiscountValue)
      });

      if (response.data?.status === 'success') {
        Toaster.success('Discount applied successfully');

        // Refresh modal data
        const { data } = await axiosInstance.get(OrderDetailsGetAPI, {
          params: {
            id: orderDetails?.id,
          }
        });

        if (data.data?.id) {
          setOrderDetails(data.data);
        }

        // Refresh live orders list
        const ordersResponse = await axiosInstance.get(LiveOrderGetAPI);
        if (ordersResponse.data?.status === "success") {
          setOrders(ordersResponse.data.data || []);
        }

        // Reset discount inputs
        setModalDiscountType('%');
        setModalDiscountValue(0);
      } else {
        Toaster.error(response.data?.message || 'Failed to apply discount');
      }
    } catch (error) {
      console.error('Apply discount error:', error);
      Toaster.error(error?.response?.data?.message || 'Failed to apply discount');
    } finally {
      setLoading1(false);
      // setDetailLoading(false);
    }
  };  // Handle actual printing of KOT

  const handlePrintKOTFromModal = async (kotId = null) => {
    try {
      if (!kotData || kotData.length === 0) return;

      // Find the specific KOT to print or use all KOTs if no specific kotId
      const kotsToPrint = kotId ? kotData.filter(kot => kot.kot_id === kotId) : kotData;

      if (kotsToPrint.length === 0) {
        Toaster.error('No KOT data found to print');
        return;
      }

      // Get printing settings from IndexedDB
      const appData = await getAppDataFromDB();
      const enableSilentPrinting = Number(appData?.enable_silent_printing) || 0;

      for (const kot of kotsToPrint) {
        const kotNo = kot.kot_no;
        const kotTime = new Date(parseInt(kot.kot_timestamp) * 1000);
        const tableNo = kot.table_no;
        const orderMode = kot.order_mode;
        const orderNo = kot.items[0].order_no;

        const currentDate = kotTime.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
        const currentTime = kotTime.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hour12: true });

        // ✅ Updated: Include variants and addons in thermal printer text
        const itemsText = kot.items.map(item => {
          const itemName = item.name;
          const quantity = item.quantity;

          // Build item details with variants and addons
          let itemDetails = `${itemName}${' '.repeat(Math.max(1, 20 - itemName.length))}${quantity}`;

          // Add variants if present
          if (item.selectedvariants && item.selectedvariants.combination_details) {
            item.selectedvariants.combination_details.forEach(variant => {
              itemDetails += `\n  ${variant.attribute_name}: ${variant.attribute_value_name}`;
            });
          }

          // Add addons if present
          if (item.addons && Array.isArray(item.addons) && item.addons.length > 0) {
            item.addons.forEach((addon, no) => {
              itemDetails += `\n  ${no + 1}. ${addon.addon_item_name}`;
            });
          }

          // Add product special note if present
          if (item.product_special_note && item.product_special_note.trim()) {
            itemDetails += `\n  Note: ${item.product_special_note.trim()}`;
          }

          return itemDetails;
        }).join('\n');

        const kotData = `ESC @
ESC ! 0x08
ESC a 0x01
${kotNo}
ESC ! 0x00
ESC a 0x00
Date : ${currentDate}
Time : ${currentTime}
${orderMode} : ${tableNo}

ESC ! 0x08
Item${' '.repeat(15)}Qty
ESC ! 0x00
================================
${itemsText}
================================

ESC d 5
GS V 0x41 0x03`;

        // ✅ Updated: Generate items HTML rows with variants and addons - same format as your bill
        const itemsHtmlRows = kot.items.map(item => {
          return `<tr>
          <td>
            <div style="display: flex; flex-direction: column; justify-content: center;">
              <span>${item.name} </span>

              ${item?.selectedvariants &&
              item?.selectedvariants?.combination_details
              ? item.selectedvariants.combination_details
                .map(i => `<div><b>${i.attribute_name}:</b> ${i.attribute_value_name}</div>`)
                .join('')
              : ''
            }

              ${item?.addons &&
            item?.addons
              .map((i, no) => `<div><b>${no + 1}.</b> ${i.addon_item_name}</div>`)
              .join("")
            }
               
            </div>
          </td>
          <td class="text-right">${item.quantity}</td>
        </tr>`;
        }).join("");

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

          <div class="info-row">
           <div>
            <span style="font-weight: bold;">
              ${tableNo ? tableNo : (orderMode ? orderMode : "")}
            </span>
          </div>
            ${orderNo ? `<div>Order: #${orderNo}</div>` : ""}
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
          try {
            const printResponse = await fetch('http://localhost:3111/print', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ printerType: 'kot', data: kotData }),
            });

            if (printResponse.ok) {
              Toaster.success(`KOT ${kotNo} printed successfully`);
            } else {
              const errorText = await printResponse.text();
              throw new Error(errorText || "Failed to print KOT");
            }
          } catch (error) {
            console.error('Silent print error:', error);
            Toaster.error(`Failed to print KOT ${kotNo}`);
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
            // Toaster.success(`KOT ${kotNo} sent to printer`);
          }, 300);
        }
      }

    } catch (error) {
      console.error('Print KOT error:', error);
      Toaster.error('Failed to print KOT');
    }
  };


  const handleCloseKOTModal = () => {
    setShowKOTModal(false);
    setKotData([]);
    setCurrentOrderId(null);
    setCurrentOrderNo(null);
  };  // Handle Print Bills button click
  const handlePrintBills = async (orderId) => {
    try {
      setLoading1(true);
      // setBillsLoading(true);
      // setDetailLoading(true)
      setCurrentOrderId(orderId);





      // Fetch bills data using new API endpoint
      const response = await axiosInstance.get(`/api/order/getAllBillsToPrint?order_id=${orderId}`);

      if (response.data?.status === 'success') {
        const billsData = response.data;


        // if(billsData.bills.length === 1){
        //   const bill = billsData.bills[0]
        //   console.log(bill.bill_type,bill.bill_no)
        //   handlePrintSpecificBill(bill.bill_type,bill.bill_no)
        //   return ;
        // }
        // setLoading(true)
        setBillsData(billsData);
        setCurrentOrderNo(billsData.order_no);
        setShowPrintBillsModal(true);
      } else {
        Toaster.error('No bill data found');
      }
    } catch (error) {
      console.error('Print bills error:', error);
      Toaster.error('Failed to fetch bill details');
    } finally {
      // setBillsLoading(false);
      // setDetailLoading(false);
      setLoading1(false);
    }
  };  // Handle printing of specific bill

  const handlePrintSpecificBill = async (billType, billNumber = null, splitBillNo) => {
    try {
      if (!billsData || !billsData.bills) {
        Toaster.error('No bill data available');
        return;
      }

      console.log("billType, billNumber")
      console.log(billType, billNumber)


      // Find the specific bill to print
      let billToPrint;
      if (billType === 'main') {
        billToPrint = billsData.bills.find(bill => bill.bill_type === 'main');
      } else {
        billToPrint = billsData.bills.find(bill => bill.bill_type === 'split' && bill.bill_no === billNumber && bill.split_bill_no === splitBillNo);
      }

      if (!billToPrint) {
        Toaster.error('Bill not found');
        return;
      }

      // Get app settings for silent printing
      const appData = await getAppDataFromDB();
      const enableSilentPrinting = Number(appData?.enable_silent_printing) || 0;

      // Generate bill content
      const billHTML = generateBillHTML(billToPrint, billsData, appData);
      const billESCPOS = generateBillESCPOS(billToPrint, billsData);

      const billTitle = billType === 'main' ? 'Main Bill' : `Bill #${billNumber}`;

      if (enableSilentPrinting === 1) {
        // Silent print to thermal printer
        try {
          const printResponse = await fetch('http://localhost:3111/print', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ printerType: 'bill', data: billESCPOS }),
          });

          if (printResponse.ok) {
            Toaster.success(`${billTitle} printed successfully`);
          } else {
            const errorText = await printResponse.text();
            throw new Error(errorText || "Failed to print bill");
          }
        } catch (error) {
          console.error('Silent print error:', error);
          Toaster.error(`Failed to print ${billTitle}`);
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
        doc.write(billHTML);
        doc.close();

        setTimeout(() => {
          iframe.contentWindow.focus();
          iframe.contentWindow.print();
          // Toaster.success(`${billTitle} sent to printer`);
        }, 300);
      }

      // Close modal after printing
      setShowPrintBillsModal(false);

    } catch (error) {
      console.error('Print bill error:', error);
      Toaster.error('Failed to print bill');
    }
  };// Handle printing main bill directly (when no split bills)

  const generateBillHTML = (billToPrint, orderData, appData) => {
    const currentDate = new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
    const currentTime = new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hour12: true });

    // const title = billToPrint.bill_type === 'main' ? 'Main Bill' : `Bill #${billToPrint.bill_no}`;
    const title = billToPrint.bill_type === 'main' ? 'Main Bill' : `Bill #${billToPrint.bill_no}`;
    const billNo = billToPrint.bill_no;
    const items = billToPrint.items || [];
    const summary = billToPrint.summary || {};
    const discount_type = billToPrint.discount_type || 0;
    const discount_rate = billToPrint.discount_rate || 0;

    const eater_name = billToPrint.eater_details?.eater_name || "";
    const orderType = billToPrint?.order_type?.replace(/_/g, " ").toUpperCase();
    const Disount = billToPrint?.discount || "";
    const paymentStatus = billToPrint?.payment_status || "";
    const creation_date = billToPrint?.creation_date || "";

    function convertUnixToDateTimeParts(unixTimestamp) {
      const timestamp = Number(unixTimestamp);
      if (isNaN(timestamp)) return { date: "", time: "" };

      const date = new Date(timestamp * 1000);

      const day = date.getDate();
      const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
        "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      const month = monthNames[date.getMonth()];
      const year = date.getFullYear();

      // Date format: "12 Aug 2025"
      const dateStr = `${day} ${month} ${year}`;

      // Time part
      let hours = date.getHours();
      const minutes = date.getMinutes();

      const ampm = hours >= 12 ? "PM" : "AM";
      hours = hours % 12;
      hours = hours ? hours : 12;
      const minutesStr = minutes < 10 ? "0" + minutes : minutes;

      const timeStr = `${hours}:${minutesStr} ${ampm}`;

      return { date: dateStr, time: timeStr };
    }

    const { date, time } = convertUnixToDateTimeParts(creation_date);

    // const itemsHtmlRows = items.map((item) => {
    //     return `<tr>
    //         <td>
    //             <div style="display: flex; flex-direction: column; justify-content: center;">
    //                 <span>${item.name}</span>

    //                 ${
    //                     item?.selectedvariants && 
    //                     item?.selectedvariants?.combination_details
    //                         ? item.selectedvariants.combination_details
    //                             .map(i => `<div><b>${i.attribute_name}:</b> ${i.attribute_value_name}</div>`)
    //                             .join('')
    //                         : ''
    //                 }

    //                 ${
    //                     item?.addons && item.addons.length > 0
    //                         ? item.addons.map((i, no) => `<div><b>${no + 1}.</b> ${i.addon_item_name}</div>`).join("")
    //                         : ""
    //                 }
    //             </div>
    //         </td>
    //         <td class="text-center">${item.quantity}</td>
    //         <td class="text-right">₹${parseFloat(item.price).toFixed(2)}</td>
    //         <td class="text-right">₹${(parseFloat(item.price) * item.quantity).toFixed(2)}</td>
    //     </tr>`;
    // }).join("");

    const itemsHtmlRows = items.map((item) => {
      // Normalize variants (handle both selectedvariants & selected_variants)
      const variants = item.selectedvariants || item.selected_variants || {};
      const variantDetails = variants?.combination_details?.map(v =>
        `<div><b>${v.attribute_name}:</b> ${v.attribute_value_name}</div>`
      ).join('') || "";

      // Normalize addons (handle both addons & selected_addons)
      const addons = item.addons || item.selected_addons || [];
      const addonsDetails = addons.map((a, i) =>
        `<div><b>${i + 1}.</b> ${a.addon_item_name}</div>`
      ).join('') || "";

      return `<tr>
        <td>
            <div style="display: flex; flex-direction: column; justify-content: center;">
                <span>${item.name}</span>
                ${variantDetails}
                ${addonsDetails}
            </div>
        </td>
        <td class="text-center">${item.quantity}</td>
        <td class="text-right">₹${parseFloat(item.price).toFixed(2)}</td>
        <td class="text-right">₹${(parseFloat(item.price) * item.quantity).toFixed(2)}</td>
    </tr>`;
    }).join("");


    return `
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
                font-size: 14px;
            }
            th, td {
                padding: 6px 4px;
                border-bottom: 1px solid #ccc;
            }
            .section-divider {
                border-top: 1px dashed #000;
                margin: 10px 0;
            }
            .bill-header {
                font-weight: bold;
                font-size: 12px;
                text-align: center;
                margin-top: 12px;
                margin-bottom: 8px;
            }
            .company-info {
                text-align: center;
                margin-bottom: 4px;
                font-size: 14px;
            }
            .logo {
                height: 100px;
                object-fit: contain;
                margin: 10px auto 5px;
                display: block;
            }
            .footer {
                text-align: center;
                margin-top: 15px;
                font-size: 13px;
            }
            .bold { font-weight: bold; }
        </style>
    </head>
    <body>
        <div style="text-align:end;"><strong>Bill No. ${billNo}</strong></div>

        <img src="${appData?.fooder_logo}" class="logo" alt="Logo" />

        <div class="bill-header">${appData?.fooder_name}</div>
        <div class="company-info">${appData?.f_address}, ${appData?.f_city}, ${appData?.f_state} - ${appData?.f_zipcode}</div>
        <div class="company-info">Phone: ${appData?.f_landline}</div>
        <div class="company-info">GST Number: ${appData?.fooder_gstin}</div>

        <div style="margin-top: 10px; font-size: 12px;">
            <div><strong>Name:</strong> ${eater_name?.length > 0 ? eater_name : ""}</div>
            <div style="display: flex; justify-content: space-between;">
                <div style="font-size: 10px;">Date: ${date}</div>
                <div style="font-size: 10px;">Time: ${time}</div>
            </div>
            <div style="display: flex; justify-content: space-between;">
                <div><strong>${orderType || "".toUpperCase()}</strong> ${orderData?.table_no ? `${orderData?.table_no}` : ""}</div>
                <div><strong>Order #${orderData?.order_no}</strong></div>
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
        <span>
          Discount${discount_type === 0 ? ` (${parseFloat( discount_rate).toFixed(2)}%)` : ":"}
        </span>
        <span>-₹${(summary.discount || 0).toFixed(2)}</span>
    </div>`
        : ''
      }



            
            ${summary.schAmount > 0
        ? `<div style="display: flex; justify-content: space-between;">
                    <span>${summary.schDetails?.name || 'SCH'} (${parseFloat(summary.schDetails?.percentage ).toFixed(2)|| 0}%):</span>
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

            ${summary.round_up_amount && summary.round_up_amount !== 0
        ? `<div style="display: flex; justify-content: space-between;">
        <span>Round Off:</span>
        <span>₹${summary.round_up_amount.toFixed(2)}</span>
    </div>`
        : ''
      }

            <div style="display: flex; justify-content: space-between; font-size: 15px; margin-top: 5px;">
                <strong>Total:</strong>
                <strong>₹${( (summary.total +summary.round_up_amount) || 0).toFixed(2)}</strong>
            </div>
        </div>

        <div class="section-divider"></div>

        <div class="footer">
            <div>FSSAI Number: ${appData?.fssai_number}</div>
            <div style="margin-top: 6px;">${appData?.billing_notes || ""}</div>
            <p style="margin-top: 6px;">Thank you for your visit!</p>
            ${paymentStatus !== "Unpaid" ? `<strong>${paymentStatus}</strong>` : ""}
        </div>
    </body>
    </html>
    `;
  };
  // Generate ESC/POS commands for bill printing
  const generateBillESCPOS = (billToPrint, orderData) => {
    const currentDate = new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
    const currentTime = new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hour12: true });

    const title = billToPrint.bill_type === 'main' ? 'Main Bill' : `Bill #${billToPrint.bill_no}`;
    const billNo = billToPrint.bill_no;
    const items = billToPrint.items || [];
    const summary = billToPrint.summary || {};

    const itemsText = items.map((item, index) => {
      const itemName = item.name;
      const quantity = item.quantity;
      const price = parseFloat(item.price);
      const total = (price * quantity).toFixed(2);
      return `${index + 1}. ${itemName}\n   ${quantity} x ₹${price} = ₹${total}`;
    }).join('\n');

    return `ESC @
ESC ! 0x08
ESC a 0x01
${title}
ESC ! 0x00
ESC a 0x00
Bill No: ${billNo}
Order #${orderData.order_no}
Date : ${currentDate}
Time : ${currentTime}
${orderData.table_no}

================================
${itemsText}
================================

Subtotal: ₹${(summary.subTotal || 0).toFixed(2)}
${summary.discount > 0 ? `Discount: -₹${summary.discount.toFixed(2)}\n` : ''}${summary.schAmount > 0 ? `${summary.schDetails?.name || 'SCH'}: ₹${summary.schAmount.toFixed(2)}\n` : ''}${summary.taxAmount > 0 ? `Tax: ₹${summary.taxAmount.toFixed(2)}\n` : ''}${summary.packingCharges > 0 ? `Packing: ₹${summary.packingCharges.toFixed(2)}\n` : ''}
ESC ! 0x08
Total: ₹${(summary.total || 0).toFixed(2)}
ESC ! 0x00

Thank you for your visit!

ESC d 5
GS V 0x41 0x03`;
  };

  // Close Print Bills Modal
  const handleClosePrintBillsModal = () => {
    setShowPrintBillsModal(false);
    setBillsData([]);
    setCurrentOrderId(null);
    setCurrentOrderNo(null);
  };

  const formatOrderType = (type) => {
    if (!type) return "";
    return type
      .toLowerCase()
      .replace(/_/g, " ")
      .replace(/\b\w/g, char => char.toUpperCase());
  };

  return (
    <>
      <style>
        {`
          .payment-method-option {
            position: relative;
            display: inline-block;
          }
          
          .payment-method-radio {
            position: absolute;
            opacity: 0;
            pointer-events: none;
          }
          
          .payment-method-label {
            display: inline-block;
            padding: 8px 16px;
            border: 2px solid #dee2e6;
            border-radius: 6px;
            background-color: #fff;
            cursor: pointer;
            transition: all 0.2s ease;
            margin: 0;
            font-weight: 500;
          }
          
          .payment-method-radio:checked + .payment-method-label {
            background-color: #007bff;
            color: white;
            border-color: #007bff;
          }
          
          .payment-method-label:hover {
            border-color: #007bff;
          }
        `}
      </style>
      <div style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 1040 }}>
        <MainHeader toggleSidebar={toggleSidebar} />
      </div>






      <div className="d-flex">
        <Sidebar isOpen={isSidebarOpen} />

        <div
          className="custom-scroll"
          style={{
            marginLeft: isSidebarOpen ? "250px" : "60px",
            marginTop: "80px",
            padding: "20px",
            transition: "margin-left 0.3s ease",
            width: "100%",
            height: "calc(100vh - 80px)",
            overflowY: "auto",
            background: "#F4F5F7",
          }}
        >
          <div>
            <h5 className="fw-semibold mb-4 mt-2">Live Orders</h5>
          </div>
          <div className="d-flex justify-content-between align-items-center mb-3">
            {orders?.length > 0 && (
              <div className="d-flex gap-2">

                <button
                  className={`btn border rounded fs-6 ${filter === "all"
                      ? "fw-semibold"
                      : "bg-white text-black"
                    }`}
                  style={{
                    backgroundColor: filter === "all" ? "#f59e0b" : "#ffffff",
                    color: filter === "all" ? "#ffffff" : "#000000",
                  }}
                  onClick={() => setFilter("all")}
                >
                  All Orders
                </button>

                <button
                  className={`btn border rounded fs-6 ${filter === "pending" ? "fw-semibold" : ""}`}
                  style={{
                    backgroundColor: filter === "pending" ? "#f59e0b" : "#ffffff",
                    color: filter === "pending" ? "#ffffff" : "#000000",
                  }}
                  onClick={() => setFilter("pending")}
                >
                  Pending Orders
                </button>

                <button
                  className={`btn border rounded fs-6 ${filter === "accepted" ? "fw-semibold" : ""}`}
                  style={{
                    backgroundColor: filter === "accepted" ? "#f59e0b" : "#ffffff",
                    color: filter === "accepted" ? "#ffffff" : "#000000",
                  }}
                  onClick={() => setFilter("accepted")}
                >
                  Accepted Orders
                </button>

                <button
                  className={`btn border rounded fs-6 ${filter === "ready" ? "fw-semibold" : ""}`}
                  style={{
                    backgroundColor: filter === "ready" ? "#f59e0b" : "#ffffff",
                    color: filter === "ready" ? "#ffffff" : "#000000",
                  }}
                  onClick={() => setFilter("ready")}
                >
                  Ready Orders
                </button>

              </div>
            )}
          </div>
          <hr />

          <div className="row g-3 mb-3">
            {/* All Orders */}
            <div className="col-12 col-sm-6 col-md-3">
              <div className="border rounded p-2 d-flex gap-2 bg-white justify-content-between px-4">
                <span className="fw-bold fs-1" style={{ color: "#FFCB44" }}>
                  <i className="bi bi-speedometer"></i>
                </span>
                <div className="d-flex flex-column align-items-center bg-white">
                  <span className="fw-bold fs-4" style={{ color: "#006495" }}>{allOrders}</span>
                  <span className="fw-semibold fs-6" style={{ color: "#006495" }}>All Orders</span>
                </div>
              </div>
            </div>

            {/* Pending Orders */}
            <div className="col-12 col-sm-6 col-md-3">
              <div className="border rounded p-2 d-flex gap-2 bg-white px-4 justify-content-between">
                <span className="fw-bold fs-1" style={{ color: "#FFCB44" }}>
                  <i className="bi bi-clock"></i>
                </span>
                <div className="d-flex flex-column align-items-center bg-white">
                  <span className="fw-bold fs-4" style={{ color: "#006495" }}>{pendingOrders}</span>
                  <span className="fw-semibold fs-6" style={{ color: "#006495" }}>Pending Orders</span>
                </div>
              </div>
            </div>

            {/* Accept Orders */}
            <div className="col-12 col-sm-6 col-md-3">
              <div className="border rounded p-2 d-flex px-4 justify-content-between  gap-2 bg-white">
                <span className="fw-bold fs-1" style={{ color: "#FFCB44" }}>
                  <i className="bi bi-truck"></i>
                </span>
                <div className="d-flex flex-column align-items-center">
                  <span className="fw-bold fs-4" style={{ color: "#006495" }}>{acceptedOrders}</span>
                  <span className="fw-semibold fs-6" style={{ color: "#006495" }}>Accept Orders</span>
                </div>
              </div>
            </div>

            {/* Ready Orders */}
            <div className="col-12 col-sm-6 col-md-3 ">
              <div className="border rounded p-2 d-flex justify-content-between px-4 gap-4 bg-white " >
                <span className="fw-bold fs-1" style={{ color: "#FFCB44" }}>
                  <i className="bi bi-speedometer2"></i>
                </span>
                <div className="d-flex flex-column align-items-center">
                  <span className="fw-bold fs-4" style={{ color: "#006495" }}>{readyOrders}</span>
                  <span className="fw-semibold fs-6" style={{ color: "#006495" }}>Ready Orders</span>
                </div>
              </div>
            </div>
          </div>

          <h5 className="fw-semibold mb-4 mt-2">Orders</h5>
          <div className="">
            {detailLoading ? (
              <LoadingModal isLoading={detailLoading} />
            ) : filteredOrders.length === 0 ? (
              <div className="text-center py-4">
                <p style={{ fontSize: "18px" }}>
                  {filter === "all" && "No orders available"}
                  {filter === "pending" && "No pending order available"}
                  {filter === "accepted" && "No accepted order available"}
                  {filter === "ready" && "No ready order available"}
                </p>
              </div>
            ) : (

              <>
                {/* Header Row */}
                <div className="d-flex justify-content-between align-items-center fw-semibold px-3 py-2 border rounded mb-2 bg-white">
                  <div className="d-flex w-100 " style={{ width: "50%" }}>
                    <div style={{ width: "25%", fontSize: "16px" }}><p className="mb-0">Order Id</p></div>
                    <div style={{ width: "25%", fontSize: "16px" }}><p className="mb-0">Name & Amount</p></div>
                    <div style={{ width: "25%", fontSize: "16px" }}><p className="mb-0">Payment Status</p></div>
                    <div style={{ width: "25%", fontSize: "16px" }}><p className="mb-0">Status</p></div>
                  </div>
                  <div style={{ width: "50%", textAlign: "right" }}>
                    <p className="mb-0 bg-white" style={{ fontSize: "16px" }}>Action</p>
                  </div>
                </div>

                {/* Orders List */}
                {filteredOrders.map((order, idx) => {
                  const { label, className } = getPaymentStatusLabelAndClass(order.payment_status);

                  return (
                    <div
                      key={order.id || idx}
                      className="d-flex justify-content-between align-items-center px-3 py-3 border rounded mb-2 bg-white shadow-sm"
                    >
                      {/* Left 70% section: grouped order info */}
                      <div className="d-flex align-items-center w-100 " style={{ width: "50%" }}>
                        {/* Order ID */}
                        <div style={{ width: "25%" }}>
                          <div className="fw-semibold " style={{ fontSize: "14px" }}>Order #{order.order_number_qrcode}</div>
                          <div className="fw-semibold" style={{ fontSize: "14px" }}>#{order.order_number}</div>
                          {/* <div className="text-muted ">{order.table_no}</div> */}
                          <div className="text-muted">
                            {order.order_type === "dine_in"
                              ? `Dine In (${order.table_no})`
                              : order.order_type
                                .replace("_", " ")
                                .replace(/\b\w/g, c => c.toUpperCase())}
                          </div>
                          <div className="text-muted ">{formatUnixTimestampToIST(order.creation_date)}</div>
                          <div className="text-muted ">Platform - {order.order_mode_label}</div>
                        </div>

                        {/* Name & Amount */}
                        <div style={{ width: "25%" }}>
                          <div className="fw-semibold fs-6">{order?.eater_name}</div>
                          <div className="fw-semibold fs-6">₹ {Number(order.total).toFixed(2)}</div>
                        </div>

                        {/* Payment Status */}
                        <div style={{ width: "20%" }}>
                          <span className={` rounded-pill   ${className}`} style={{ fontSize: "14px", padding: "6px 12px" }}>
                            {label}
                          </span>
                        </div>

                        {/* Order Status */}
                        <div style={{ width: "auto" }}>
                          <span className=" bg-success rounded-pill text-white" style={{ fontSize: "14px", padding: "6px 12px" }}>
                            {order.order_status_lable}
                          </span>
                        </div>
                      </div>

                      {/* Right 30% section: actions aligned to end */}
                      {
                        order.status !== 0 ? <>
                          <div style={{ width: "50%", textAlign: "right" }}>
                            <div className="d-flex gap-2 justify-content-end flex-wrap">
                              <button className="btn btn-sm btn-dark" onClick={() => handleView(order.id)}>
                                View
                              </button>
                              {order.order_status_lable !== "Order Ready" && (
                                <button className="btn btn-sm btn-success" onClick={() => handleMarkAsOrderReady(order.id)}>
                                  Mark Ready
                                </button>
                              )}
                              <button className="btn btn-sm btn-warning text-dark" onClick={() => handlePrintKOT(order.id)}>
                                Print KOT
                              </button>
                            </div>
                          </div>

                        </> : <></>
                      }

                      {
                        order.status == 0 ? <>
                          <div style={{ width: "50%", textAlign: "right" }}>
                            <div className="d-flex gap-2 justify-content-end flex-wrap">


                              <button className="btn btn-sm btn-warning text-dark" onClick={() => change_order_status_accept(order.id)}>
                                Accept
                              </button>

                              <button className="btn btn-sm btn-danger text-light" onClick={() => change_order_status_reject(order.id)}>
                                Reject
                              </button>

                              <button className="btn btn-sm btn-dark" onClick={() => handleView(order.id)}>
                                View
                              </button>

                            </div>
                          </div>

                        </> : <></>
                      }
                    </div>
                  );
                })}
              </>




            )}
          </div>
        </div>
      </div>

      {loading1 && <LoadingModal isLoading={loading1} />}

      {/* -------------------- MODAL -------------------- */}
      {showModal && (
        <div
          className="modal fade show"
          style={{ display: "block", background: "rgba(0,0,0,0.5)" }}
          tabIndex="-1"
          onClick={() => setShowModal(false)}
        >


          {(showKOTModal || showPrintBillsModal || showSettlePaidModal || showPaidOrPartiallyPaidModal) && (
            <div
              className="modal-backdrop fade show"
              style={{
                zIndex: 1200,
                background: "black(50%, 50%, 50%, 0.5)",
                blur: "5px",
                backdropFilter: "blur(5px)",
                position: "fixed",
                top: 0,
                left: 0,
                width: "100vw",
                height: "100vh"
              }}
            />
          )}
          {
            loading ? (
              <>
                <LoadingModal isLoading={loading} />



              </>
            ) : (
              <div
                className="modal-dialog modal-xl modal-dialog-scrollable custom-scroll"
                onClick={(e) => e.stopPropagation()}
                style={{ position: "relative", zIndex: 1070 }}
              >
                <div className="modal-content">
                  {/* Header */}
                  <div className="modal-header border-0">
                    <h5 className="modal-title fw-bold">Order Details</h5>
                    <button type="button" className="btn-close" onClick={() => setShowModal(false)} />
                  </div>

                  {/* Body */}
                  <div className="modal-body pt-0" ref={orderModalBodyRef}>
                    <>
                      {/* Top section: Metadata */}
                      <div className="d-flex justify-content-between align-items-start flex-wrap mb-4 pt-4 h-auto">
                        <div>
                          <h6 className="fw-bold mb-1">Order Id #{orderDetails?.order_number_qrcode}</h6>
                          <p className="mb-1 text-muted" style={{ fontSize: "14px" }}>#{orderDetails?.order_number}</p>
                          <p className="mb-1" style={{ fontSize: "14px" }}>{formatOrderType(orderDetails?.order_type)} {orderDetails?.table_no}</p>
                          <p className="mb-1" style={{ fontSize: "14px" }}>Platform: {orderDetails?.order_mode_label}</p>
                          <p className="mb-1" style={{ fontSize: "14px" }}>No of Person Served: {orderDetails?.totalPerson || 1}</p>

                          <p className="text-muted mb-1 " style={{ fontSize: "14px" }}>
                            Placed on: <span className="text-primary">{formatUnixTimestampToIST(orderDetails?.creation_date)}</span>
                          </p>

                        </div>


                        <div className="d-flex flex-column gap-3">
                          {/* === Button Group === */}
                          <div className="d-flex gap-2 flex-wrap">
                            {/* {orderDetails?.payment_status === 0 && orderDetails?.status !== 2 &&  (
      <button 
        className="btn  btn-sm"
        style={{ fontSize: "14px", backgroundColor:"#10B981",color:"white"}}
        onClick={() => handleMarkAsOrderReady(orderDetails?.id)}
      >
         Mark as Order Ready
      </button>
    )}

    {orderDetails?.payment_status === 0 && (
      <button 
        className="btn btn-sm "
         style={{ fontSize: "14px", backgroundColor:"#10B981",color:"white"}}
        onClick={() => handleMarkAsPaid(orderDetails?.id)}
      >
         Mark as Paid
      </button>
    )}

    <button 
      className="btn btn-outline-dark btn-sm"
      onClick={() => handlePrintKOT(orderDetails?.id)}
    >
      🖨 Print KOT
    </button> */}





                            {orderDetails.status !== 0 && (
                              <>
                                {orderDetails?.payment_status === 0 && orderDetails?.status !== 2 && (
                                  <button
                                    className="btn btn-sm"
                                    style={{ fontSize: "14px", backgroundColor: "#10B981", color: "white" }}
                                    onClick={() => handleMarkAsOrderReady(orderDetails?.id)}
                                  >
                                    Mark as Order Ready
                                  </button>
                                )}

                                {orderDetails?.payment_status === 0 && (
                                  <button
                                    className="btn btn-sm"
                                    style={{ fontSize: "14px", backgroundColor: "#10B981", color: "white" }}
                                    onClick={() => { orderDetails.is_split ? Toaster.error('This bill is already split. Please go to POS Split Bill menu On Table Right Click for settlement.') : handleMarkAsPaid(orderDetails?.id) }}
                                  >
                                    Mark as Paid
                                  </button>
                                )}

                                <button
                                  className="btn btn-outline-dark btn-sm"
                                  onClick={() => handlePrintKOT(orderDetails?.id)}
                                >
                                  🖨 Print KOT
                                </button>
                              </>
                            )}

                            {orderDetails?.status === 0 && (
                              <div style={{ width: "50%", textAlign: "right" }}>
                                <div className="d-flex justify-content-end gap-2">
                                  <button
                                    className="btn btn-sm btn-warning text-dark"
                                    onClick={() => change_order_status_accept(orderDetails.id)}
                                  >
                                    Accept
                                  </button>

                                  <button
                                    className="btn btn-sm btn-danger text-light"
                                    onClick={() => change_order_status_reject(orderDetails.id)}
                                  >
                                    Reject
                                  </button>
                                </div>
                              </div>
                            )}
                            <button
                              className="btn  btn-sm"
                              style={{ fontSize: "14px", backgroundColor: "#F59E0B", color: "white" }}
                              onClick={() => handlePrintBills(orderDetails?.id)}
                            >
                              🧾 Print BILL
                            </button>
                          </div>


                          <div className="d-flex  align-items-start gap-2">

                            {(() => {
                              const { label } = getPaymentStatusLabelAndClass(orderDetails?.payment_status);

                              let backgroundColor = "#DC2626"; // default red (Unpaid)

                              if (label === "Paid") backgroundColor = "#10B981";      // green
                              else if (label === "Hold") backgroundColor = "#F59E0B";  // yellow
                              else if (label === "Partial") backgroundColor = "#3B82F6"; // blue

                              return (
                                <span
                                  className="rounded-pill px-2 py-1 text-center text-white"
                                  style={{ fontSize: "14px", backgroundColor }}
                                >
                                  {label}
                                </span>
                              );
                            })()}





                            {orderDetails.status !== 0 && (
                              <span className=" rounded-pill text-white p-2 bg-primary py-1 text-center" style={{ fontSize: "14px" }}>
                                {orderDetails?.status_lable}
                              </span>
                            )}




                          </div>

                        </div>

                      </div>

                      {/* <div className="d-flex justify-content-between align-items-start flex-wrap mb-3">
                 <div className="d-flex flex-column align-items-start  ">
                     <div className="mb-1">
                      <span className="fw-bold fs-6">Status: </span>
                     <span className="badge rounded text-white p-2 bg-primary mb-2 py-1 text-center " style={{ fontSize: "14px" }}>
                       {orderDetails?.status_lable}
                     </span>
                     </div>
                   <div className="d-flex align-items-start">
                    <p className="fw-bold fs-6 "> Payment Status: {(() => {
                         const { label, className } = getPaymentStatusLabelAndClass(orderDetails?.payment_status);
                         return (
                           <span className="border badge rounded px-2 py-1 text-center bg-danger text-white" style={{ fontSize: "14px" }}>
                             {label}
                           </span>
                         );
                       })()}</p>
                   </div>
                 </div>
                
                 </div>
                  */}




                      {/* Mark as Ready / Paid - only show for unpaid orders */}
                      <div className="p-4 border rounded mb-4">


                        {/* Show only payment status badge when order is paid or partial paid */}

                        <div className="d-flex align-items-center justify-content-between">
                          {orderDetails.is_split && (
                            <p
                              className="text-info mb-2"
                              style={{
                                marginTop: "-15px",
                                cursor: "pointer",
                                color: "#0d6efd", // bootstrap primary link color
                                textDecoration: "underline"
                              }}
                              // onMouseEnter={(e) => e.target.style.textDecoration = "underline"}
                              // onMouseLeave={(e) => e.target.style.textDecoration = "none"}
                              onClick={() => handlePrintBills(orderDetails.id)}
                            >
                              <i className="bi bi-info-circle"></i> This order has split bills
                            </p>
                          )}

                          <div></div>

                          {(orderDetails?.payment_status === 1 || orderDetails?.payment_status === 3) && (

                            <div className="d-flex justify-content-end align-items-center mb-3">
                              {(() => {
                                const { label, className } = getPaymentStatusLabelAndClass(orderDetails?.payment_status);
                                return (
                                  <Tooltip
                                    title="Click here to view details"
                                    placement="top"
                                  >
                                    <div className="d-flex align-items-center">

                                      <p
                                        className=" fs-6 px-3 py-1 d-flex align-items-center gap-1"
                                        style={{ backgroundColor: "#CBF0EE", color: "#288A84", borderRadius: "20px", cursor: "pointer" }}
                                        onClick={() => {
                                          setShowPaidOrPartiallyPaidModal(true);
                                          setOrderDetails(orderDetails);

                                        }}
                                      >
                                        {label}
                                        <i className="bi bi-info-circle-fill fs-6" style={{ color: "#288A84" }}></i>
                                      </p>
                                    </div>
                                  </Tooltip>

                                );
                              })()}
                            </div>

                          )}
                        </div>



                        {/* Show badge and Mark as Paid button for hold orders */}
                        {orderDetails?.payment_status === 2 && (
                          <div className="d-flex justify-content-end align-items-center gap-3 mb-3">
                            {(() => {
                              const { label, className } = getPaymentStatusLabelAndClass(orderDetails?.payment_status);
                              return (
                                <Tooltip
                                  title={orderDetails?.holdReason}
                                  placement="top"
                                >
                                  <div className="d-flex align-items-center gap-1">

                                    <span className={`  fs-6 px-3 py-1 rounded-pill`} style={{ backgroundColor: "#FFF2D6", color: "#CC8C00", cursor: "pointer" }}>
                                      {label}
                                      <i className="bi bi-info-circle-fill fs-6  ms-1" ></i>
                                    </span>
                                  </div>
                                </Tooltip>
                              );
                            })()}
                            <button
                              className="btn btn-success btn-sm"
                              onClick={() => handleMarkAsPaid(orderDetails?.id)}
                            >
                              Mark as Paid
                            </button>
                          </div>
                        )}


                        {/* Restaurant Info */}
                        <div className="d-flex justify-content-between align-items-start mb-3">

                          {/* <p className="text-muted mb-1">{billsData.table_no}</p> */}


                          <div className="">
                            <h6 className="fw-bold">{orderDetails?.fooders_name}</h6>
                            <p className="mb-0" style={{ fontSize: "14px" }}><strong>📞</strong> {orderDetails?.f_landline}</p>
                            <p className="mb-0" style={{ fontSize: "14px" }}><strong>📍</strong> {orderDetails?.f_address}</p>
                            <p className="mb-0 text-muted" style={{ fontSize: "14px" }}>{orderDetails?.f_city}, {orderDetails?.f_state}, {orderDetails?.f_zipcode}</p>
                          </div>

                          <div>
                            {orderDetails?.eater_name.length > 0 && orderDetails?.eater_phonenumber.length > 0 && (
                              <div className="">
                                <div className="fw-bold mb-1 fs-6" >
                                  {orderDetails?.eater_name.charAt(0).toUpperCase() + orderDetails?.eater_name.slice(1)}
                                </div>
                                <div className=" mb-1 fs-6 ">
                                  <i className="bi bi-telephone"></i> Phone: {orderDetails?.eater_phonenumber}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>



                        <table className="table table-bordered">
                          <thead>
                            <tr>
                              <th style={{ width: 50 }}>S.No.</th>
                              <th>Product</th>
                              <th>Quantity</th>
                              <th>Price</th>
                              <th>Total</th>
                            </tr>
                          </thead>
                          <tbody>
                            {orderDetails?.details?.map((item, idx) => {
                              const isCancelled = item.is_cancelled === 1;

                              // ✅ Parse variants
                              let variantDetails = [];
                              try {
                                variantDetails = item.variant_details
                                  ? JSON.parse(item.variant_details).combination_details
                                  : [];
                              } catch {
                                variantDetails = [];
                              }

                              // ✅ Parse addons
                              let addons = [];
                              try {
                                addons = item.addons_items_details
                                  ? JSON.parse(item.addons_items_details)
                                  : [];
                              } catch {
                                addons = [];
                              }

                              return (
                                <tr key={item.id}>
                                  <td>{idx + 1}</td>
                                  <td>
                                    <div>
                                      {isCancelled ? <s>{item.product_name}</s> : item.product_name}
                                    </div>

                                    {/* ✅ Variants */}
                                    {variantDetails?.length > 0 &&
                                      variantDetails.map((v, vi) => (
                                        <div
                                          key={`var-${vi}`}
                                          style={{ fontSize: "12px", color: "#000" }}
                                        >
                                          <b>{v.attribute_name}:</b> {v.attribute_value_name}
                                        </div>
                                      ))}

                                    {/* ✅ Addons */}
                                    {addons?.length > 0 &&
                                      addons.map((a, ai) => (
                                        <div
                                          key={`addon-${ai}`}
                                          style={{ fontSize: "12px", color: "#000" }}
                                        >
                                          <b>{ai + 1}.</b> {a.addon_item_name}
                                        </div>
                                      ))}
                                  </td>

                                  <td>{item.quantity}</td>
                                  <td>
                                    {isCancelled ? (
                                      <s>₹ {parseFloat(item.product_price).toFixed(2)}</s>
                                    ) : (
                                      <>₹ {parseFloat(item.product_price).toFixed(2)}</>
                                    )}
                                  </td>
                                  <td>
                                    {isCancelled ? (
                                      <s>
                                        ₹ {(parseFloat(item.product_price) * item.quantity).toFixed(2)}
                                      </s>
                                    ) : (
                                      <>₹ {(parseFloat(item.product_price) * item.quantity).toFixed(2)}</>
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>

                          {/* <tbody>
    {orderDetails?.details?.map((item, idx) => {
      const isCancelled = item.is_cancelled === 1;
      const variantDetails = item.variant_details
        ? JSON.parse(item.variant_details).combination_details
        : [];

        

      return (
        <tr key={item.id}>
          <td>{idx + 1}</td>
          <td>
            <div>
              {isCancelled ? <s>{item.product_name}</s> : item.product_name}
            </div>
            {variantDetails?.length > 0 && (
              <small className="text-muted d-block">
                {variantDetails
                  .map((v) => `${v.attribute_name}: ${v.attribute_value_name}`)
                  .join(", ")}
              </small>
            )}
          </td>
          <td>{item.quantity}</td>
          <td>
            {isCancelled ? (
              <s>₹ {parseFloat(item.product_price).toFixed(2)}</s>
            ) : (
              <>₹ {parseFloat(item.product_price).toFixed(2)}</>
            )}
          </td>
          <td>
            {isCancelled ? (
              <s>
                ₹ {(parseFloat(item.product_price) * item.quantity).toFixed(2)}
              </s>
            ) : (
              <>₹ {(parseFloat(item.product_price) * item.quantity).toFixed(2)}</>
            )}
          </td>
        </tr>
      );
    })}
  </tbody> */}
                        </table>


                        {/* Add Items Section */}
                        {/* <h6 className="fw-bold mt-4">Add New Items</h6>
                 <div className="row align-items-end g-2 mb-3">
                   <div className="col-md-5">
                     <label className="form-label">Search Items</label>
                     <input type="text" className="form-control" placeholder="Type to search…" />
                   </div>
                   <div className="col-md-2">
                     <label className="form-label">Qty</label>
                     <input type="number" className="form-control" defaultValue={1} />
                   </div>
                   <div className="col-md-3">
                     <label className="form-label">Amount</label>
                     <input type="text" className="form-control" value="₹20" readOnly />
                   </div>
                   <div className="col-md-2">
                     <button className="btn btn-warning w-100">Add</button>
                   </div>                 </div> */}
                        {
                          orderDetails.status !== 0 ? <>
                            {orderDetails?.payment_status === 0 && (
                              <>
                                <h6 className="fw-bold mt-4">Add Discount</h6>
                                <div className="row g-2 align-items-end mb-4">
                                  <div className="col-md-3">
                                    <div className="input-group">
                                      <select
                                        className="form-select"
                                        value={modalDiscountType}
                                        onChange={(e) => setModalDiscountType(e.target.value)}
                                      >
                                        <option value="%">%</option>
                                        <option value="₹">₹</option>
                                      </select>
                                      <input
                                        type="number"
                                        className="form-control w-50"
                                        min={0}
                                        value={modalDiscountValue}
                                        onChange={(e) => {
                                          const value = e.target.value.trim();
                                          if (value === '' || !isNaN(value)) {
                                            setModalDiscountValue(value);
                                          }
                                        }
                                        }
                                        placeholder="Enter discount"
                                      />
                                    </div>
                                  </div>
                                  <div className="col-md-2">
                                    <button
                                      className="btn "
                                      style={{ backgroundColor: "#F59E0B", color: "white" }}
                                      onClick={handleApplyDiscount}
                                      disabled={loading}
                                    >
                                      Apply
                                    </button>
                                  </div>
                                </div>
                              </>
                            )}

                          </> : <></>
                        }


                        {/* Price Summary */}
                        <div className="d-flex justify-content-end">
                          <div style={{ width: "300px" }}>

                            {(() => {
                              // Active items only
                              const activeItems = (orderDetails?.details || []).filter(item => item.is_cancelled !== 1);

                              // Calculate packaging fee if delivery or take_away
                              let packagingFee = 0;
                              if (["delivery", "take_away"].includes(orderDetails?.order_type)) {
                                packagingFee = activeItems.reduce((sum, item) => {
                                  const feePerItem = parseFloat(item.packaging_fee || 0);
                                  return sum + (item.quantity * feePerItem);
                                }, 0);
                              }

                              // Calculate billing excluding packaging fee
                              const billingData = calculateBillingSummary(
                                activeItems,
                                {
                                  mode: orderDetails?.discount_type === 'percent' ? 0 : 1,
                                  value: parseFloat(orderDetails?.discount_rate || 0)
                                },
                                {
                                  name: orderDetails?.service_charge_details?.name || 'SCH',
                                  percentage: parseFloat(orderDetails?.service_charge_details?.percentage || 0)
                                },
                                {
                                  orderMode: 'DINE IN',
                                  isNC: false
                                }
                              );

                              // Final total
                              const finalTotal = billingData.total + packagingFee;

                              return (
                                <>
                                  <p className="d-flex justify-content-between">
                                    <span>Items({activeItems.length})</span>
                                    <span>{formatCurrency(billingData.subtotal)}</span>
                                  </p>

                                  {billingData.discount.amount > 0 && (
                                    <p className="d-flex justify-content-between text-success">
                                      <span>Discount ({billingData.discount.description})</span>
                                      <span>-{formatCurrency(billingData.discount.amount)}</span>
                                    </p>
                                  )}

                                  {billingData.serviceCharge.amount > 0 && (
                                    <p className="d-flex justify-content-between">
                                      <span>{billingData.serviceCharge.name} ({parseFloat( billingData.serviceCharge.percentage).toFixed(2)}%)</span>
                                      <span>{formatCurrency(billingData.serviceCharge.amount)}</span>
                                    </p>
                                  )}

                                  {billingData.taxSlabs.map((tax, i) => (
                                    <p className="d-flex justify-content-between" key={i}>
                                      <span>{tax.name} @{tax.percentage}%</span>
                                      <span>{formatCurrency(tax.amount)}</span>
                                    </p>
                                  ))}

                                  {packagingFee > 0 && (
                                    <p className="d-flex justify-content-between">
                                      <span>Packaging Charges</span>
                                      <span>{formatCurrency(packagingFee)}</span>
                                    </p>
                                  )}

                                  {Math.abs(orderDetails?.round_up_amount) > 0 && (
                                    <p className="d-flex justify-content-between">
                                      <span>Round off Amount</span>
                                      <span>{formatCurrency(orderDetails?.round_up_amount)}</span>
                                    </p>
                                  )}

                                  <hr />
                                  <h5 className="d-flex justify-content-between">
                                    <span>Total</span>
                                    <span className="text-danger">
                                      {formatCurrency(finalTotal + orderDetails?.round_up_amount)}
                                    </span>
                                  </h5>
                                </>
                              );
                            })()}


                          </div>
                        </div>
                      </div>

                    </>
                  </div>

                  {/* Footer */}
                  <div className="modal-footer border-0">
                    <button className="btn btn-light" onClick={() => setShowModal(false)}>
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )
          }
        </div>)}



      {/* {paid or partial payment modal pop up} */}
      {showPaidOrPartiallyPaidModal && (
        <>

          <Modal
            show={showPaidOrPartiallyPaidModal}
            onHide={() => {
              setShowPaidOrPartiallyPaidModal(false);
              setShowPayDue(false)
              setPaymentMode("Cash")
            }}
            size="md"
            centered={false}

            backdrop="static"
            keyboard={false}
          >
            <Modal.Header closeButton className="bg-light">
              <h5 className="mb-3">Payment Details: Order #{orderDetails?.order_number_qrcode}</h5>
            </Modal.Header>

            <Modal.Body className="p-4 custom-scroll" style={{ maxHeight: "80vh", overflowY: "auto" }}>
              {/* Payment Details Section */}
              <div className="mb-4">


                {/* Table */}
                <table className="table table-bordered">
                  <thead className="table-light">
                    <tr>
                      <th style={{ width: "10%" }}>No</th>
                      <th>Payment Method</th>
                      <th>Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orderDetails?.
                      partialPaymentDetail.map((payment, index) => (
                        <tr key={index}>
                          <td>{index + 1}</td>
                          <td>{payment.paymentType}</td>
                          <td>₹{payment.paidAmount}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>

                {/* Summary */}
                <div className="mt-3 px-2 d-flex align-items-center justify-content-between">
                  <div>
                    {(() => {
                      const baseTotal = Number(productTotal.total || 0);

                      // Get only active (non-cancelled) items
                      const activeItems = orderDetails?.details?.filter(
                        (item) => item.is_cancelled !== 1
                      ) || [];

                      // Calculate packaging fee if delivery or take_away
                      let packagingFee = 0;
                      if (["delivery", "take_away"].includes(orderDetails?.order_type)) {
                        packagingFee = activeItems.reduce((sum, item) => {
                          const feePerItem = parseFloat(item.packaging_fee || 0);
                          return sum + (item.quantity * feePerItem);
                        }, 0);
                      }

                      const finalTotal = baseTotal + packagingFee + orderDetails?.round_up_amount;

                      const paid = orderDetails?.partialPaymentDetail
                        ?.map((payment) => parseFloat(payment.paidAmount))
                        .reduce((a, b) => a + b, 0) || 0;

                      const due = finalTotal - paid;

                      return (
                        <>
                          <p className="fw-bold mb-1">
                            Total: ₹{finalTotal.toFixed(2)}
                          </p>
                          <div className="d-flex justify-content-between align-items-center mb-2 gap-2">
                            <span className="fw-semibold">Paid: ₹{paid.toFixed(2)}</span>
                            <span className="fw-semibold">Due: ₹{Math.abs ( due.toFixed(2)) }</span>
                          </div>
                        </>
                      );
                    })()}
                  </div>
                  <div>

                    {orderDetails?.payment_status === 3 && (
                      showPayDue ? (
                        <button
                          className="btn mt-2 me-2"
                          style={{
                            backgroundColor: "#34B1AA", // green
                            color: "white",
                          }}
                          onClick={() => {
                            // ✅ UPI Validation
                            if (paymentMode === "UPI" && (!upi || upi.trim() === "")) {
                              Toaster.warning("Please select a UPI method before submitting.");
                              return;
                            }

                            // Calculate packaging fee as in the UI
                            const baseTotal = Number(productTotal.total || 0);
                            const activeItems = orderDetails?.details?.filter(
                              (item) => item.is_cancelled !== 1
                            ) || [];
                            let packagingFee = 0;
                            if (["delivery", "take_away"].includes(orderDetails?.order_type)) {
                              packagingFee = activeItems.reduce((sum, item) => {
                                const feePerItem = parseFloat(item.packaging_fee || 0);
                                return sum + (item.quantity * feePerItem);
                              }, 0);
                            }
                            const finalTotal = baseTotal + packagingFee + orderDetails?.round_up_amount;

                            // Paid amount calculation
                            const paid =
                              orderDetails?.partialPaymentDetail
                                ?.map((payment) => parseFloat(payment.paidAmount))
                                .reduce((a, b) => a + b, 0) || 0;

                            const due = finalTotal - paid     ;

                            // Prepare order items
                            // const item = orderDetails?.details?.map((order) => ({
                            //   product_id: order.product_id,
                            //   product_name: order.product_name,
                            //   quantity: order.quantity,
                            //   product_price: order.product_price,
                            //   variant_details: order.variant_details,
                            //   addons: order.addons,
                            // }));
                            // Prepare order items (only non-cancelled items)

                            const item = orderDetails?.details
                              ?.filter((order) => order.is_cancelled !== 1)
                              ?.map((order) => ({
                                product_id: order.product_id,
                                product_name: order.product_name,
                                quantity: order.quantity,
                                product_price: order.product_price,
                                variant_details: order.variant_details,
                                addons: order.addons,
                              }));

                            // Payment details
                            const payment_details = {
                              method: paymentMode,
                              amount: due.toFixed(2),
                              ...(paymentMode === "UPI" && {
                                upiType: upi,
                                transaction_id: "",
                                note: "",
                              }),
                            };

                            // Payload
                            const payload = {
                              id: orderDetails?.details[0]?.order_id,
                              allPaymentDetail: orderDetails?.partialPaymentDetail,
                              total: finalTotal.toFixed(2),
                              due_amount: due.toFixed(2),
                              amount: due.toFixed(2),
                              item: item,
                              payment_details: payment_details,
                              payment_status: 1,
                            };

                            console.log("✅ Sending Payload:", payload);

                            // API Call — Modal close yaha nahi karna
                            handlePartialPayment(payload);
                          }}
                        >
                          Submit
                        </button>
                      ) : (
                        <button
                          className="btn mt-2 me-2"
                          style={{
                            backgroundColor: "#FFCA2C",
                            color: "#555454",
                          }}
                          onClick={() => setShowPayDue(true)}
                        >
                          Pay Due
                        </button>
                      )
                    )}


                    <button
                      className="btn  mt-2"
                      style={{ backgroundColor: "#F1F1F1", color: "#555454", hover: { backgroundColor: "#D8D8D8", color: "white" } }}
                      onClick={() => {
                        setShowPayDue(false);
                        setPaymentMode("Cash")
                        setShowPaidOrPartiallyPaidModal(false)
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
              {showPayDue && orderDetails?.payment_status === 3 && (
                <div className="d-flex gap-3 flex-wrap my-2">
                  {["Cash", "Card", "NEFT", "UPI"].map((mode) => (
                    <label key={mode} className="d-flex align-items-center gap-2">
                      <input
                        type="radio"
                        value={mode}
                        checked={paymentMode === mode}
                        onChange={(e) => setPaymentMode(e.target.value)}
                      />
                      {mode}
                    </label>
                  ))}
                </div>
              )}


              {paymentMode === "UPI" && orderDetails?.payment_status === 3 && (
                <div className="mb-3">
                  <label htmlFor="upiMethod" className="form-label fw-medium">
                    Select UPI Method <span className="text-danger">*</span>
                  </label>
                  <select
                    id="upiMethod"
                    className="form-select"
                    onChange={(e) => setUpi(e.target.value)}
                    defaultValue=""
                  >
                    <option value="" disabled>Select Method</option>
                    <option value="Google Pay">Google Pay</option>
                    <option value="Phone Pe">Phone Pe</option>
                    <option value="Paytm">Paytm</option>
                    <option value="Paytm">Others</option>
                  </select>
                </div>
              )}

            </Modal.Body>
          </Modal>
        </>
      )}


      {/* Settlement Payment Modal */}
      {showSettlePaidModal && (
        <Modal
          show={true}
          onHide={() => setShowSettlePaidModal(false)}
          size="lg"
          centered
          backdrop="static"
          keyboard={false}
          className="payment-modal"
        >
          <Modal.Header closeButton className="bg-light">
            <Modal.Title className="fw-bold">Bill Settlement</Modal.Title>
          </Modal.Header>
          <Modal.Body className="p-4 custom-scroll" style={{ maxHeight: "80vh", overflowY: "auto" }} ref={settleModalBodyRef}>
            {/* Bill Details */}
            {settleBillData && settleBillData.kot_details && (
              <div className="mb-4">
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <h6 className="fw-bold " style={{ fontSize: "18px" }}>Order Details</h6>
                  <span className="text-primary " style={{ fontSize: "18px" }}>Order #{settleBillData.kot_details[0]?.orderNo || 'N/A'}</span>
                </div>

                <div className="d-flex justify-content-between align-items-center mb-3">
                  <h6 className="fw-bold">Total Amount</h6>
                  <span className="text-success fw-bold fs-6">₹{settleBillCalculations.total.toFixed(2)}</span>
                </div>

                <button
                  className="btn btn-warning btn-sm"
                  onClick={() => setShowOrderDetails((prev) => !prev)}
                >
                  {showOrderDetails ? 'Hide Order' : 'View Order'}
                </button>

                {showOrderDetails && (
                  <div className="mt-3">
                    {/* Bill Items */}
                    <div className="table-responsive mb-3">
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
                          <span>₹{settleBillCalculations.subtotal.toFixed(2)}</span>
                        </div>
                        {settleBillCalculations.discount > 0 && (
                          <div className="d-flex justify-content-between mb-2">
                            <span>Discount:</span>
                            <span className="text-success">-₹{settleBillCalculations.discount.toFixed(2)}</span>
                          </div>
                        )}
                        {settleBillCalculations.serviceCharge > 0 && (
                          <div className="d-flex justify-content-between mb-2">
                            <span>Service Charge:</span>
                            <span>₹{settleBillCalculations.serviceCharge.toFixed(2)}</span>
                          </div>
                        )}
                        {settleBillCalculations.tax > 0 && (
                          <div className="d-flex justify-content-between mb-2">
                            <span>Tax:</span>
                            <span>₹{settleBillCalculations.tax.toFixed(2)}</span>
                          </div>
                        )}

                        {settleBillCalculations.packagingFee > 0 && (
                          <div className="d-flex justify-content-between mb-2">
                            <span>Packaging Charge:</span>
                            <span>₹{settleBillCalculations.packagingFee.toFixed(2)}</span>
                          </div>
                        )}

                        {settleBillCalculations.roundOff !== 0 && (
                          <div className="d-flex justify-content-between mb-2">
                            <span>Round Off:</span>
                            <span className={settleBillCalculations.roundOff > 0 ? "text-success" : "text-danger"}>
                              {settleBillCalculations.roundOff > 0 ? "+" : ""}₹{settleBillCalculations.roundOff.toFixed(2)}
                            </span>
                          </div>
                        )}
                        <hr />
                        <div className="d-flex justify-content-between">
                          <h5 className="fw-bold">Total Amount:</h5>
                          <h4 className="fw-bold text-primary">₹{settleBillCalculations.total.toFixed(2)}</h4>
                        </div> 
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}            {/* Payment Options */}
            <div className="mb-4">
              <h6 className="fw-bold mb-3">Select Payment Method</h6>
              <div className="d-flex flex-wrap gap-2">
                {paymentMethodsToShow.map((method) => (
                  <div className="payment-method-option" key={method}  style={{display: method === 'Hold' &&   settleBillCalculations.total === 0 ? 'none' : ''}}  >
                    <input
                      className="payment-method-radio"
                      type="radio"
                      name="paymentMethod"
                      id={`settlement-${method}`}
                      checked={paymentMethod === method.toLowerCase()}
                      onChange={() => {
                        const lowerMethod = method.toLowerCase();
                        setPaymentMethod(lowerMethod);

                        const totalPaid = paymentEntries.reduce((sum, entry) => sum + parseFloat(entry.amount || 0), 0);
                        const dueAmount = Math.max(settleBillCalculations.total - totalPaid, 0).toFixed(2);

                        if (!['hold', 'zomato', 'swiggy', 'dineout'].includes(lowerMethod)) {
                          setCurrentPayment({
                            method: lowerMethod,
                            amount: dueAmount > 0 ? dueAmount : '',
                            tip: '',
                            upiSubMethod: '',
                            transactionId: ''
                          });
                        } else {
                          setCurrentPayment({
                            method: lowerMethod,
                            amount: ''
                          });
                        }
                      }}

                    />
                    <label className="payment-method-label" htmlFor={`settlement-${method}`}>
                      {method}
                    </label>
                  </div>
                ))}
              </div>
            </div>            {/* Payment Amount Input */}
            {paymentMethod !== "hold" && settleBillCalculations.total > 0 && !["zomato", "swiggy", "dineout"].includes(paymentMethod) ? (
              <div className="mb-4">
                <label className="form-label fw-bold">
                  Amount <span className="text-danger">*</span>
                </label>
                <input
                  type="number"
                  className="form-control"

                  max={settleBillCalculations.total}
                  value={currentPayment.amount}
                  onChange={e => {
                    let value = e.target.value.replace(/\s+/g, '');

                    if (value === '') {
                      setCurrentPayment(prev => ({ ...prev, amount: '' }));
                      return;
                    }

                    value = value.replace(/^0+(?=\d)/, '');

                    let num = Number(value);

                    if (isNaN(num) || num < 0) num = 0;
                    if (num > settleBillCalculations.total) num = settleBillCalculations.total;

                    setCurrentPayment(prev => ({ ...prev, amount: num }));
                  }}
                  placeholder="Enter amount"
                />
              </div>
            ):<></>}            {/* UPI Method and Transaction ID */}
            {paymentMethod === "upi" && !["zomato", "swiggy", "dineout",].includes(paymentMethod) && (
              <div className="mb-4">
                <div className="mb-3">
                  <label className="form-label fw-bold">
                    UPI Method <span className="text-danger">*</span>
                  </label>
                  <select
                    className="form-select"
                    value={currentPayment.upiSubMethod}
                    onChange={e => setCurrentPayment(prev => ({ ...prev, upiSubMethod: e.target.value }))}
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
                    Transaction ID
                  </label>
                  <input
                    type="text"
                    className="form-control"
                    value={currentPayment.transactionId}
                    onChange={e => setCurrentPayment(prev => ({ ...prev, transactionId: e.target.value }))}
                    placeholder="Enter Transaction ID"
                  />
                </div>
              </div>
            )}

            {/* Hold Reason */}
            {paymentMethod === "hold" && (
              <div className="mb-4">
                <label className="form-label fw-bold">
                  Reason <span className="text-danger">*</span>
                </label>
                <input
                  type="text"
                  className="form-control"
                  value={reason}
                  onChange={e => setReason(e.target.value)}
                  placeholder="Enter reason for hold"
                />
              </div>
            )}            {/* Add Payment Button */}
            {paymentMethod !== "hold"  &&  settleBillCalculations.total && !["zomato", "swiggy", "dineout"].includes(paymentMethod) ? (
              <div className=" mb-4">
                <button
                  className="btn btn-primary"
                  disabled={Number(currentPayment.amount) === 0 || currentPayment.amount === ""}
                  onClick={() => {
                    const enteredAmount = parseFloat(currentPayment.amount);
                    const totalPaid = paymentEntries.reduce((sum, entry) => sum + parseFloat(entry.amount || 0), 0);
                    const dueAmount = Math.max(settleBillCalculations.total - totalPaid, 0);

                    if (enteredAmount === 0 && settleBillCalculations.total !== 0) {
                      Toaster.error("Please enter a valid amount");
                      return;
                    }
                    if (isNaN(enteredAmount) || enteredAmount < 0) {
                      Toaster.error("Please enter a valid amount");
                      return;
                    }
                    // Prevent overpayment
                    if (enteredAmount > dueAmount) {
                      Toaster.error(`Amount cannot be greater than due amount (${dueAmount})`);
                      return;
                    }
                    // if (paymentMethod === "upi" && (!currentPayment.upiSubMethod || !currentPayment.transactionId)) {
                    //   Toaster.error("Please fill UPI method and transaction ID");
                    //   return;
                    // }

                    if (paymentMethod === "upi" && (!currentPayment.upiSubMethod)) {
                      Toaster.error("Please fill the UPI method");
                      return;
                    }

                    setPaymentEntries(prev => {
                      const newEntries = [...prev, { ...currentPayment }];
                      const totalPaidNew = newEntries.reduce((sum, entry) => sum + parseFloat(entry.amount || 0), 0);
                      const dueAmountNew = Math.max(settleBillCalculations.total - totalPaidNew, 0).toFixed(2);
                      setCurrentPayment({
                        method: paymentMethod,
                        amount: dueAmountNew > 0 ? dueAmountNew : '',
                        tip: '',
                        upiSubMethod: '',
                        transactionId: ''
                      });
                      return newEntries;
                    });
                  }}
                >
                  <i className="bi bi-plus-circle me-2"></i>{" "}
                  {/*{payClicked ? 'Add Payment' : 'Pay'}*/} Pay
                </button>
              </div>
            ):<></>}
            {/* <LoadingModal isLoading={true} /> */}

            {/* Payment Entries */}
            {paymentEntries.length > 0 &&
              !["dineout", "swiggy", "zomato", "hold"].includes(paymentMethod) && (
                <div className="mb-4 ">
                  <h6 className="fw-bold">Payment Entries</h6>
                  <div className="table-responsive">
                    <table className="table table-sm ">
                      <thead className="table-light">
                        <tr>
                          <th>Payment Method</th>
                          <th>Amount</th>
                          <th>Tip Amount</th>
                          <th>Action</th>
                        </tr>
                      </thead>
                      <tbody className="pb-3">
                        {paymentEntries.map((entry, index) => (
                          <tr key={index}>
                            <td>{entry.method}</td>
                            <td>₹{entry.amount}</td>
                            <td>₹{entry?.tip || 0}</td>
                            <td style={{ cursor: "pointer" }}>
                              <div
                                onClick={() => {
                                  setPaymentEntries(prev => {
                                    const newEntries = prev.filter((_, i) => i !== index);
                                    const totalPaid = newEntries.reduce((sum, entry) => sum + parseFloat(entry.amount || 0), 0);
                                    const dueAmount = Math.max(settleBillCalculations.total - totalPaid, 0).toFixed(2);
                                    setCurrentPayment(prevPayment => ({
                                      ...prevPayment,
                                      amount: newEntries.length === 0 ? settleBillCalculations.total.toFixed(2) : (dueAmount > 0 ? dueAmount : '')
                                    }));
                                    return newEntries;
                                  });
                                }}
                              >
                                <i className="bi bi-trash text-danger fs-4 "></i>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="d-flex justify-content-between">
                    <span>Total Paid:</span>
                    <span>₹{paymentEntries.reduce((sum, entry) => sum + parseFloat(entry.amount || 0), 0).toFixed(2)}</span>
                  </div>
                  <div className="d-flex justify-content-between">
                    <span>Due Amount:</span>
                    <span>₹{(settleBillCalculations.total - paymentEntries.reduce((sum, entry) => sum + parseFloat(entry.amount || 0), 0)).toFixed(2)}</span>
                  </div>
                </div>
              )}            {/* Submit Payment Button */}
            <div className="d-flex gap-2">


              {paymentMethod === "hold" ? (
                <button
                  style={{ backgroundColor: "#dc3545", color: "#fff" }}
                  className="btn flex-fill"
                  onClick={async () => {
                    if (!reason || reason.trim() === "") {
                      Toaster.error("Please enter a reason");
                      return;
                    }

                    setLoading1(true);
                    try {
                      const firstItem = settleBillData.kot_details[0];
                      const orderId = firstItem.orderId;
                      const orderType = settleBillData.order_type;

                      if (orderType === "dine_in") {
                        // Original dine-in hold logic
                        const payload = {
                          id: orderId,
                          subtotal: 0,
                          service_charge: firstItem.order_service_charge?.percentage || 0,
                          tax_amount: null,
                          total: settleBillCalculations.total,
                          discount_type: discountMode?.toString() || "0",
                          discount_rate: discountValue?.toString() || "0",
                          payment_type: "Hold",
                          unpaid_reason: reason,
                          payment_status: 2,
                          service_charge_details: {
                            name: firstItem.order_service_charge?.name || "SCH",
                            percentage: firstItem.order_service_charge?.percentage?.toString() || "0",
                            foreigner_percentage: firstItem.order_service_charge?.foreigner_percentage || 10
                          }
                        };

                        const response = await axiosInstance.post("/api/payment/holdpaymentfordinein", payload);

                        if (response.data?.status === "success") {
                          Toaster.success(response.data.message || "Order put on hold");
                          await handlePaymentSuccess();
                          setReason("");
                        } else {
                          Toaster.error(response.data?.message || "Failed to put order on hold");
                        }
                      } else if (orderType === "delivery" || orderType === "take_away") {
                        // New hold logic for delivery/take_away
                        const payload = {
                          order_id: orderId,
                          payment_type: "Hold",
                          unpaid_reason: reason
                        };

                        const response = await axiosInstance.post("/api/payment/holdpaymentforcounteranddelivery", payload);

                        if (response.data?.status === "success") {
                          Toaster.success(response.data.message || "Order put on hold");
                          await handlePaymentSuccess();
                          setReason("");
                        } else {
                          Toaster.error(response.data?.message || "Failed to put order on hold");
                        }
                      }
                    } catch (error) {
                      Toaster.error(error?.response?.data?.message || "Failed to put order on hold");
                    } finally {
                      setLoading1(false);
                    }
                  }}
                  disabled={!reason || reason.trim() === ""}
                >
                  Save
                </button>
              ) : ["zomato", "swiggy", "dineout"].includes(paymentMethod) ? (
                <button
                  style={{ backgroundColor: "#ffc107", color: "#fff" }}
                  className="btn  flex-fill"
                  onClick={async () => {
                    setLoading1(true);
                    try {
                      const firstItem = settleBillData.kot_details[0];
                      const orderId = firstItem.orderId;

                      const payload = {
                        id: orderId,
                        subtotal: settleBillCalculations.subtotal.toFixed(2),
                        discount_type: discountMode.toString(),
                        discount_rate: discountValue.toString(),
                        discount_value: settleBillCalculations.discount.toFixed(2),
                        payment_details: [{
                          method: paymentMethod.charAt(0).toUpperCase() + paymentMethod.slice(1),
                          amount: settleBillCalculations.total.toFixed(2),
                          tip: 0,
                          upiType: '',
                          note: '',
                          transaction_id: '',
                        }],
                        due_amount: 0,
                        service_charge: firstItem.order_service_charge?.percentage || 0,
                        service_charge_details: firstItem.order_service_charge || { name: 'SCH', percentage: 0 },
                        tax_amount: settleBillCalculations.tax.toFixed(2),
                        tax_details: settleBillCalculations.taxDetails || [],
                        paided_amount: settleBillCalculations.total.toFixed(2),
                        total: settleBillCalculations.total.toFixed(2),
                        payment_status: 1,
                        round_up_amount: settleBillCalculations.roundOff.toFixed(2),
                        item: settleBillData.kot_details.map(item => ({
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

                      const response = await axiosInstance.post(PostPartialPaymentForDineIn, payload);
                      if (response.data?.status === 'success') {
                        Toaster.success(response.data.message || 'Payment successful');
                        setShowSettlePaidModal(false);

                        // Refresh orders list
                        const { data } = await axiosInstance.get(LiveOrderGetAPI);
                        if (data?.status === "success") {
                          setOrders(data.data || []);
                        }

                        // Refresh modal data if it's open
                        if (showModal && orderDetails?.id) {
                          try {
                            const modalResponse = await axiosInstance.get(OrderDetailsGetAPI, {
                              params: { id: orderDetails.id }
                            });
                            if (modalResponse.data?.data?.id) {
                              setOrderDetails(modalResponse.data.data);
                            }
                          } catch (modalError) {
                            console.error('Error refreshing modal:', modalError);
                          }
                        }
                      } else {
                        Toaster.error(response.data?.message || 'Payment failed');
                      }
                    } catch (error) {
                      Toaster.error(error?.response?.data?.message || 'Payment failed');
                    } finally {
                      setLoading1(false);
                    }
                  }}
                >
                  Paid
                </button>
              ) : (
                <>
                {settleBillCalculations.total > 0 ? 
                
                <button
                  className="btn btn-success flex-fill"
                  onClick={handleSettleBillPayment}
                  disabled={paymentEntries.length === 0}
                 
                >
                  <i className="bi bi-check-circle me-2"></i>Paid
                </button>
                : <>
                
                
              <button
                  style={{ backgroundColor: "#ffc107", color: "#fff" }}
                  className="btn  flex-fill"
                  onClick={async () => {
                    setLoading1(true);
                    try {
                      const firstItem = settleBillData.kot_details[0];
                      const orderId = firstItem.orderId;

                      const payload = {
                        id: orderId,
                        subtotal: settleBillCalculations.subtotal.toFixed(2),
                        discount_type: discountMode.toString(),
                        discount_rate: discountValue.toString(),
                        discount_value: settleBillCalculations.discount.toFixed(2),
                        payment_details: [{
                          method: paymentMethod.charAt(0).toUpperCase() + paymentMethod.slice(1),
                          amount: settleBillCalculations.total.toFixed(2),
                          tip: 0,
                          upiType: '',
                          note: '',
                          transaction_id: '',
                        }],
                        due_amount: 0,
                        service_charge: firstItem.order_service_charge?.percentage || 0,
                        service_charge_details: firstItem.order_service_charge || { name: 'SCH', percentage: 0 },
                        tax_amount: settleBillCalculations.tax.toFixed(2),
                        tax_details: settleBillCalculations.taxDetails || [],
                        paided_amount: settleBillCalculations.total.toFixed(2),
                        total: settleBillCalculations.total.toFixed(2),
                        payment_status: 1,
                        round_up_amount: settleBillCalculations.roundOff.toFixed(2),
                        item: settleBillData.kot_details.map(item => ({
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

                      const response = await axiosInstance.post(PostPartialPaymentForDineIn, payload);
                      if (response.data?.status === 'success') {
                        Toaster.success(response.data.message || 'Payment successful');
                        setShowSettlePaidModal(false);

                        // Refresh orders list
                        const { data } = await axiosInstance.get(LiveOrderGetAPI);
                        if (data?.status === "success") {
                          setOrders(data.data || []);
                        }

                        // Refresh modal data if it's open
                        if (showModal && orderDetails?.id) {
                          try {
                            const modalResponse = await axiosInstance.get(OrderDetailsGetAPI, {
                              params: { id: orderDetails.id }
                            });
                            if (modalResponse.data?.data?.id) {
                              setOrderDetails(modalResponse.data.data);
                            }
                          } catch (modalError) {
                            console.error('Error refreshing modal:', modalError);
                          }
                        }
                      } else {
                        Toaster.error(response.data?.message || 'Payment failed');
                      }
                    } catch (error) {
                      Toaster.error(error?.response?.data?.message || 'Payment failed');
                    } finally {
                      setLoading1(false);
                    }
                  }}
                >
                  Paid
                </button>
                </>}
                  
                </>
              
              )}
            </div>          </Modal.Body>
        </Modal>
      )}

      {/* KOT Print Modal */}
      {showKOTModal && (
        <Modal show={showKOTModal} onHide={handleCloseKOTModal} size="xl" centered backdrop="static"
          keyboard={false}>
          <Modal.Header closeButton>
            <Modal.Title>Order #{currentOrderNo} KOT's</Modal.Title>
          </Modal.Header>
          <Modal.Body className="p-2" ref={kotModalBodyRef}>
            {kotLoading ? (
              <div className="text-center py-4">
                <div className="spinner-border" role="status">
                  <span className="visually-hidden">Loading...</span>
                </div>
                <p className="mt-2">Loading KOT data...</p>
              </div>
            ) : kotData.length > 0 ? (
              <div>
                <div className="row g-3">
                  {kotData.map((kot, index) => (
                    <div key={index} className="col-md-4">
                      <div className="card h-100 border-0 shadow-sm m-2  rounded-3" style={{ backgroundColor: "#F0F0EC" }}>
                        <div className="card-body d-flex flex-column justify-content-between py-3">

                          {/* Centered KOT number and table no */}
                          <div className="text-center mb-2">
                            <h5 className="mb-1 fw-bold"> {kot.kot_no}</h5>
                            <p className="text-muted mb-0 fw-semibold fs-6">{table_notoshowonkot}</p>
                          </div>

                          {/* Order mode and time */}
                          <div className="d-flex justify-content-between mb-1 px-1">
                            <div className="fw-semibold fs-6">{kot.order_mode}</div>
                            <div className="text-muted fs-6 fw-semibold">{formatUnixTimestampToIST(kot.kot_timestamp)}</div>
                          </div>

                          {/* Item list */}
                          <div className="px-1">
                            <div className="d-flex fw-semibold text-dark  pb-1 mb-1" style={{ fontSize: "14px" }}>
                              <div style={{ width: "45%" }}>Item</div>
                              <div style={{ width: "15%" }} className="text-center">Qty</div>
                              <div style={{ width: "40%" }} className="text-end">Price</div>
                            </div>

                            {kot.items.map((item, itemIndex) => (
                              <div key={item.unique_id || itemIndex} className="d-flex mb-1" style={{ fontSize: "14px" }}>
                                <div style={{ width: "45%" }}>{item.name}</div>
                                <div style={{ width: "15%" }} className="text-center">{item.quantity}</div>
                                <div style={{ width: "40%" }} className="text-end">₹{Number(item.price).toFixed(2)}</div>
                              </div>
                            ))}
                          </div>

                          {/* Print Button */}
                          <div className="text-center mt-3">
                            <button
                              type="button"
                              className="btn btn-sm fw-bold text-white"
                              style={{ backgroundColor: "#20c997", borderRadius: "6px", padding: "6px 24px" }}
                              onClick={() => handlePrintKOTFromModal(kot.kot_id)}
                            >
                              Print
                            </button>
                          </div>

                        </div>
                      </div>
                    </div>
                  ))}
                </div>



                <div className="d-flex justify-content-end gap-2 mt-4">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={handleCloseKOTModal}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center py-4">
                <p>No KOT data available for this order.</p>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={handleCloseKOTModal}
                >
                  Close
                </button>
              </div>
            )}          </Modal.Body>
        </Modal>
      )}      {/* Print Bills Modal */}
      {showPrintBillsModal && (
        <Modal show={showPrintBillsModal} onHide={handleClosePrintBillsModal} size="lg" centered>
          <Modal.Header closeButton>
            <Modal.Title>Print Bills - Order #{currentOrderNo}</Modal.Title>
          </Modal.Header>
          <Modal.Body className="p-4" ref={printBillsModalBodyRef}>
            {billsLoading ? (
              <div className="text-center py-4">
                <div className="spinner-border" role="status">
                  <span className="visually-hidden">Loading...</span>
                </div>
                <p className="mt-2">Loading bill data...</p>
              </div>
            ) : billsData && billsData.bills ? (
              <div>
                <div className="mb-3">
                  {/* <p className="text-muted mb-1">{billsData.table_no}</p> */}
                  {billsData.is_split && (
                    <p className="text-info mb-2">
                      <i className="bi bi-info-circle"></i> This order has split bills
                    </p>
                  )}
                </div>

                <div className="row g-3">
                  {billsData.bills.map((bill, index) => (
                    <div key={index} className="col-6 col-md-4">
                      <button
                        type="button"
                        className="btn btn-outline-secondary w-100 py-3"
                        onClick={() => handlePrintSpecificBill(bill.bill_type, bill.bill_no, bill.split_bill_no)}
                        style={{
                          fontSize: '16px',
                          fontWeight: '500',
                          borderColor: '#dee2e6',
                          color: '#495057'
                        }}
                      >
                        {bill.bill_type === 'main' ? (
                          <>
                            Bill No #{bill.bill_no}
                            <br />
                            <small className="text-muted">Main Bill</small>
                          </>
                        ) : (
                          <>
                            #Bill {bill.split_bill_no}
                            <br />
                            <small className="text-muted">Split Bill</small>
                          </>
                        )}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center py-4">
                <p>No bill data available.</p>
              </div>
            )}
          </Modal.Body>
          <Modal.Footer>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleClosePrintBillsModal}
            >
              Cancel
            </button>
          </Modal.Footer>
        </Modal>
      )}
      <LoadingModal isLoading={loading} />

      <Notification />
    </>
  );
}

export default LiveOrder;



