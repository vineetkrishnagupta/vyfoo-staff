
import React, { useEffect, useState } from "react";
import "../App.css";
import { OrderDetailsGetAPI, UpdateOrderStatus } from "../BaseURL/baseURL";
import axiosInstance from "../utlis/axiosinstance";
import LoadingModal from "../utlis/LoadingModal";
import { useAuth } from "../AuthContext";
import printJS from "print-js";

export default function Notification() {
  const [fullLoader, setFullLoader] = useState(false);
  const { flage, setFlage } = useAuth();
  const [orderData, setOrderData] = useState(null);


  const [isPrintBill, setIsPrintBill] = useState(false);



  const [subTotal, setSubTotal] = useState(0);
  const [SCHRate, setSCHRate] = useState(0);
  const [discountRate, setDiscountRate] = useState();
  const [CGSTRate, setCGSTRate] = useState(0);
  const [SGSTRate, setSGSTRate] = useState(0);
  const [discountAmount, setDiscountAmount] = useState();
  const [schAmount, setSchAmount] = useState();
  const [cgstAmount, setCGSTAmount] = useState();
  const [sgstAmount, setSGSTAmount] = useState();
  const [totalAmountPaid, setTotalAmountPaid] = useState();




  const [cartProductPackingCharges, setCartProductPackingCharges] = useState(0);

  const [CGSTTaxT1, setCGSTTaxt1] = useState(0);
  const [CGSTTaxT2, setCGSTTaxt2] = useState(0);
  const [CGSTTaxT3, setCGSTTaxt3] = useState(0);
  const [CGSTTaxT4, setCGSTTaxt4] = useState(0);
  const [CGSTTaxT5, setCGSTTaxt5] = useState(0);


  const [SGSTTaxT1, setSGSTTaxt1] = useState(0);
  const [SGSTTaxT2, setSGSTTaxt2] = useState(0);
  const [SGSTTaxT3, setSGSTTaxt3] = useState(0);
  const [SGSTTaxT4, setSGSTTaxt4] = useState(0);
  const [SGSTTaxT5, setSGSTTaxt5] = useState(0);











  window.change_order_status_reject = async (id) => {
    try {
      setFullLoader(true);
      const data = { id: id, status: 4, order_preparation_time: "10" }; // 4 = Rejected
      const response = await axiosInstance.put(UpdateOrderStatus, data);
      console.log("Order status rejected successfully:", response.data);

      if (response.status === 200 && response.data.message) {
        setFlage(!flage)

        const elementToRemove = document.getElementById(`tb-${id}`);
        const parentElement = document.getElementById(
          "new_order_div_notification"
        );

        if (parentElement && parentElement.firstChild) {
          parentElement.removeChild(parentElement.firstChild);
          // handleFlag(!flagValue);
        }

        if (elementToRemove) {
          elementToRemove.parentNode.removeChild(elementToRemove);
        }
      }
    } catch (error) {
      console.error("Error rejecting order status:", error);
    } finally {
      setFullLoader(false);
    }
  };

  window.change_order_status_accept = async (id) => {
    try {
      setFullLoader(true);
      const data = { id: id, status: 1, order_preparation_time: "10" }; // 4 = Rejected
      const response = await axiosInstance.put(UpdateOrderStatus, data);
      console.log("Order status rejected successfully:", response.data);

      if (response.status === 200 && response.data.message) {
        setFlage(!flage)

        const elementToRemove = document.getElementById(`tb-${id}`);
        const parentElement = document.getElementById(
          "new_order_div_notification"
        );

        if (parentElement && parentElement.firstChild) {
          parentElement.removeChild(parentElement.firstChild);
          // handleFlag(!flagValue);
        }

        if (elementToRemove) {
          elementToRemove.parentNode.removeChild(elementToRemove);
        }
      }
    } catch (error) {
      console.error("Error rejecting order status:", error);
    } finally {
      setFullLoader(false);
    }
  };
  const [mute, setMute] = useState(true);
  const [noOfOrders, setNoOfOrders] = useState("0");
  const [hasChild, setHasChild] = useState(false);

  const handleMuteClick = () => {
    const audioPlayer = document.getElementById("audioPlayer");
    if (audioPlayer) {
      audioPlayer.pause();
      setMute(false);
    }
  };


  function removeAllChildElements() {
    setFlage(!flage)

    const parentElement = document.getElementById("gritter-notice-wrapper");
    const parentElement2 = document.getElementById(
      "new_order_div_notification"
    );

    if (parentElement) {
      while (parentElement.firstChild) {
        parentElement.removeChild(parentElement.firstChild);
        if (handleFlag && parentElement2 && parentElement2.firstChild) {
          parentElement2.removeChild(parentElement2.firstChild);
          // handleFlag(!flagValue);
        }
      }
    }

    // handleFlag(!flagValue);

  }
  useEffect(() => {
    const checkChildElements = () => {
      const childWrapper = document.getElementById("gritter-notice-wrapper");
      if (childWrapper && childWrapper.children.length > 0) {
        setHasChild(true);
        setNoOfOrders(childWrapper.children.length);
        setMute(true);
      } else {
        setHasChild(false);
      }
    };

    const logNewChildIds = (mutationsList) => {
      mutationsList.forEach((mutation) => {
        if (mutation.type === "childList") {
          mutation.addedNodes.forEach((node) => {
            if (node.id) {
              const idNumbers = node.id.match(/\d+/);
              if (idNumbers) {
                checkChildElements();
                // startTimerForDiv(idNumbers[0]);
              }
            }
          });

          mutation.removedNodes.forEach((node) => {
            if (node.id) {
              checkChildElements();
            }
          });
        }
      });
    };

    checkChildElements();

    const observer = new MutationObserver(logNewChildIds);

    const targetElement = document.getElementById("gritter-notice-wrapper");
    if (targetElement) {
      observer.observe(targetElement, { childList: true, subtree: true });
    }

    return () => {
      observer.disconnect();
    };
  }, []);
  window.minus_time = (id) => {
    let input = document.getElementById(`time-${id}`);
    let value = parseInt(input.value, 10);
    value = isNaN(value) ? 1 : value;
    if (value > 1) {
      value--;
      input.value = value;
    }
  };

  window.plus_time = (id) => {
    let input = document.getElementById(`time-${id}`);
    let value = parseInt(input.value, 10);
    value = isNaN(value) ? 1 : value;
    value++;
    input.value = value;
  };










  window.print_order_notification = async (id) => {
    try {
      const response = await axiosInstance.get(OrderDetailsGetAPI, {
        params: {
          id: id,
        },
       
      });

      if (response.status === 200 && response.data.data) {
        setOrderData(response.data.data);
        if (
          response.data.data.service_charge_details.percentage !== "0" &&
          !isNaN(
            parseFloat(response.data.data.service_charge_details.percentage)
          ) &&
          isFinite(response.data.data.service_charge_details.percentage)
        ) {
          setSCHRate(
            parseFloat(response.data.data.service_charge_details.percentage)
          );
        }

        if (
          response.data.data.discount_rate !== "0" &&
          !isNaN(parseFloat(response.data.data.discount_rate)) &&
          isFinite(response.data.data.discount_rate)
        ) {
          setDiscountRate(parseFloat(response.data.data.discount_rate));
        } else {
          setDiscountRate();
        }

        if (
          response.data.data.tax_details &&
          response.data.data.tax_details.length !== 0
        ) {
          response.data.data.tax_details.forEach((item) => {
            if (item.name === "CGST") {
              setCGSTRate(parseFloat(item.percentage));
            } else if (item.name === "SGST") {
              setSGSTRate(parseFloat(item.percentage));
            }
          });
        }
      }
    } catch (error) {
      // if (error.response && error.response.data.message) {
      //   addToast("error", error.response.data.message);
      // } else {
      //   addToast("error", error.message);
      // }
      console.log(error);
    }
  };







  function isValidPrice(price) {
    const pricePattern = /^\d+(\.\d{1,2})?$/;

    if (!pricePattern.test(price)) {
      return parseFloat(price).toFixed(2);
    }
    return price;
  }




  const formatTimestampForDate = (timestampStr) => {
    const timestamp = parseInt(timestampStr, 10);
    const dateObject = new Date(timestamp * 1000);

    const day = dateObject.getDate();
    const month = dateObject.toLocaleString("default", { month: "short" });
    const year = dateObject.getFullYear();

    return `${day} ${month} ${year}`;
  };

  const formatTimestampForTime = (timestampStr) => {
    const timestamp = parseInt(timestampStr, 10);
    const dateObject = new Date(timestamp * 1000);

    let hours = dateObject.getHours();
    const minutes = dateObject.getMinutes();
    const ampm = hours >= 12 ? "pm" : "am";

    if (hours > 12) {
      hours -= 12;
    }

    return `${hours}:${minutes.toString().padStart(2, "0")} ${ampm}`;
  };


  const capitalizeFirstLetter = (str) => {
    if (str) {
      const words = str.split(" ");

      const capitalizedWords = words.map((word) => {
        if (word.length === 0) {
          return "";
        }
        return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
      });

      const capitalizedString = capitalizedWords.join(" ");

      return capitalizedString;
    }
  };

  useEffect(() => {

    console.log()
    if (orderData && orderData.details && isPrintBill && totalAmountPaid) {
      const handlePrintBill = async () => {
        if (orderData && orderData.details && isPrintBill && totalAmountPaid) {
          printJS({
            printable: "contentToPrintBillNotification",
            type: "html",
            targetStyles: ["*"],
            font_size: '8pt'
          });

          setIsPrintBill(false);
        }
      };
      handlePrintBill();
    }
  }, [isPrintBill, orderData, totalAmountPaid]);
  useEffect(() => {
    if (orderData && orderData.details) {
      // const subtotal = orderData.details.reduce(
      //   (total, item) =>
      //     total +
      //     (item.product_proprice
      //       ? item.product_proprice * item.quantity
      //       : item.product_price * item.quantity),
      //   0
      // );

      // setSubTotal(parseFloat(subtotal).toFixed(2));

      // let discountedAmount = 0;
      // let discount = 0;
      // let deliveryCharge = 0;
      // let packagingFee = 0;

      // if (orderData.discount_type === "percent") {
      //   discount =
      //     (parseFloat(subtotal).toFixed(2) * (discountRate || 0)) / 100;
      //   discountedAmount = parseFloat(subtotal).toFixed(2) - discount;
      // } else if (orderData.discount_type === "amount") {
      //   discount = parseFloat(discountRate) || 0;
      //   discountedAmount = parseFloat(subtotal).toFixed(2) - discount;
      // }

      // const sch = (discountedAmount * (SCHRate || 0)) / 100;
      // const taxableAmount = discountedAmount + sch;

      // const cgst = (taxableAmount * (CGSTRate || 0)) / 100;
      // const sgst = (taxableAmount * (SGSTRate || 0)) / 100;

      // if (
      //   orderData &&
      //   orderData.delivery_charge &&
      //   parseFloat(orderData.delivery_charge) > 0
      // ) {
      //   deliveryCharge = parseFloat(orderData.delivery_charge).toFixed(2);
      // }

      // if (
      //   orderData &&
      //   orderData.packaging_fee &&
      //   parseFloat(orderData.packaging_fee) > 0
      // ) {
      //   packagingFee = parseFloat(orderData.packaging_fee).toFixed(2);
      // }

      // const totalPaid =
      //   parseFloat(taxableAmount) +
      //   parseFloat(cgst) +
      //   parseFloat(sgst) +
      //   parseFloat(deliveryCharge) +
      //   parseFloat(packagingFee);

      // setDiscountAmount(parseFloat(discount).toFixed(2));
      // setSchAmount(parseFloat(sch).toFixed(2));
      // setCGSTAmount(parseFloat(cgst).toFixed(2));
      // setSGSTAmount(parseFloat(sgst).toFixed(2));
      // setTotalAmountPaid(parseFloat(totalPaid).toFixed(2));











      let withOutTaxPrice = 0
      let subTotal = 0;
      let tempDiscount = 0;
      let tempDiscountRow = 0;


      let tempServicCharge = 0;
      let tempServicChargeRow = 0;

      let tempTax = 0;
      let tempTaxRow = 0;

      let GSTTaxT1 = 0;
      let GSTTaxT2 = 0;
      let GSTTaxT3 = 0;
      let GSTTaxT4 = 0;
      let GSTTaxT5 = 0;

      let packingCharges = 0;


      orderData.details.forEach((i) => {


        // newPrice: selectedProduct.proprice
        // ? selectedProduct.proprice
        // : selectedProduct.price,

        packingCharges += i.quantity * parseInt(i.packaging_fee)

        if (i.product_proprice) {
          withOutTaxPrice = parseInt(i.item_tax_type) === 0 ? parseFloat(i.product_proprice) : (parseFloat(i.product_proprice) * parseFloat(100)) / (parseFloat(100) + parseFloat(i.item_tax_percent))

        } else {
          withOutTaxPrice = parseInt(i.item_tax_type) === 0 ? parseFloat(i.product_price) : (parseFloat(i.product_price) * parseFloat(100)) / (parseFloat(100) + parseFloat(i.item_tax_percent))
        }


        subTotal += (i.quantity) * withOutTaxPrice

        if (orderData.discount_type === "percent") {
          tempDiscount += (((i.quantity) * withOutTaxPrice) * parseFloat(orderData.discount_rate)) / 100
          tempDiscountRow = (((i.quantity) * withOutTaxPrice) * parseFloat(orderData.discount_rate)) / 100
        } else {
          // tempDiscount += (((i.quantity) * withOutTaxPrice) - parseFloat(orderData.discount_rate))
          // tempDiscountRow = (((i.quantity) * withOutTaxPrice) - parseFloat(orderData.discount_rate))
          tempDiscount += ((i.quantity * withOutTaxPrice) - ((i.quantity * withOutTaxPrice) - parseFloat(orderData.discount_rate))) * i.quantity
          tempDiscountRow = ((i.quantity * withOutTaxPrice) - ((i.quantity * withOutTaxPrice) - parseFloat(orderData.discount_rate))) * i.quantity
        }


        tempServicCharge += ((((i.quantity) * withOutTaxPrice) - tempDiscountRow) * parseFloat(SCHRate)) / 100
        tempServicChargeRow = ((((i.quantity) * withOutTaxPrice) - tempDiscountRow) * parseFloat(SCHRate)) / 100



        tempTax += ((((i.quantity) * withOutTaxPrice) + tempServicChargeRow - tempDiscountRow) * parseFloat(i.item_tax_percent)) / 100
        tempTaxRow = ((((i.quantity) * withOutTaxPrice) + tempServicChargeRow - tempDiscountRow) * parseFloat(i.item_tax_percent)) / 100

        if (parseInt(i.item_tax_percent) === 0) {

          GSTTaxT1 += ((((i.quantity) * withOutTaxPrice) + tempServicChargeRow - tempDiscountRow) * parseFloat(i.item_tax_percent)) / 100
          setCGSTTaxt1(GSTTaxT1 / 2)
          setSGSTTaxt1(GSTTaxT1 / 2)

        }

        if (parseInt(i.item_tax_percent) === 5) {

          GSTTaxT2 += ((((i.quantity) * withOutTaxPrice) + tempServicChargeRow - tempDiscountRow) * parseFloat(i.item_tax_percent)) / 100

          setCGSTTaxt2((GSTTaxT2 / 2).toFixed(2))
          setSGSTTaxt2((GSTTaxT2 / 2).toFixed(2))
        }

        if (parseInt(i.item_tax_percent) === 12) {

          GSTTaxT3 += ((((i.quantity) * withOutTaxPrice) + tempServicChargeRow - tempDiscountRow) * parseFloat(i.item_tax_percent)) / 100

          setCGSTTaxt3((GSTTaxT3 / 2).toFixed(2))
          setSGSTTaxt3((GSTTaxT3 / 2).toFixed(2))
        }

        if (parseInt(i.item_tax_percent) === 18) {

          GSTTaxT4 += ((((i.quantity) * withOutTaxPrice) + tempServicChargeRow - tempDiscountRow) * parseFloat(i.item_tax_percent)) / 100
          setCGSTTaxt4((GSTTaxT4 / 2).toFixed(2))
          setSGSTTaxt4((GSTTaxT4 / 2).toFixed(2))
        }

        if (parseInt(i.item_tax_percent) === 28) {

          GSTTaxT5 += ((((i.quantity) * withOutTaxPrice) + tempServicChargeRow - tempDiscountRow) * parseFloat(i.item_tax_percent)) / 100
          setCGSTTaxt5((GSTTaxT5 / 2).toFixed(2))
          setSGSTTaxt5((GSTTaxT5 / 2).toFixed(2))
        }



      })
      setSubTotal(subTotal.toFixed(2))
      setDiscountAmount(tempDiscount.toFixed(2))
      setSchAmount(tempServicCharge.toFixed(2))
      setTotalAmountPaid((subTotal + tempServicCharge - tempDiscount + tempTax).toFixed(2))

      if (orderData.order_type !== "dine_in") {
        setCartProductPackingCharges(packingCharges)
        setTotalAmountPaid((parseFloat(subTotal + tempServicCharge - tempDiscount + tempTax) + parseFloat(packingCharges)).toFixed(2))
      }






















      setIsPrintBill(true);
    }
  }, [orderData, discountRate, SCHRate, CGSTRate, SGSTRate]);


  return (
    <>
      <style>
        {`
          /* General container fix */
    .toastmodal,
    .toast-container,
    .toast-body,
    .toast-header,
    .toastscroll,
    .toastmodal * {
      pointer-events: auto !important;
      z-index: 9999 !important;
      position: relative;
      box-sizing: border-box;
    }

    .toast-container {
      background-color: white;
      border-radius: 5px;

    }

    /* Toast container wrapper */
    .toastmodal {

      position: fixed;
      /* or absolute */
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      display: flex;
      justify-content: center;
      /* Horizontal center */
      align-items: center;
      /* Vertical center */
      background-color: rgba(15, 13, 13, 0.682);
      /* optional background */
      z-index: 9999;
      /* if it should appear above everything */
    }

    .toastmodal h6 {
      font-size: 15px;
    }

    /* Scroll area */
    .toastcss {
      max-height: 90vh;

      overflow-y: auto;
      padding: 0;
    }

    /* Toast inner scroll */
    .toastscroll {
      max-height: 70vh;
      overflow-y: auto;

    }

    /* Toast content box */
    .toast-body {
      background-color: #fff;
      padding: 10px !important;

    }

    /* Toast header */
    .toast-header {
      padding: 12px 20px;
      background-color: #f7f7f7;
      border-bottom: 1px solid #ddd;
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 10px !important;
      margin-top: 10px !important;

    }

    .toast-header .btn-close {
      margin-right: 0.375rem !important;
      margin-left: 0.75rem !important;
    }

    .custom-scroll::-webkit-scrollbar {
      width: 6px;
    }

    .custom-scroll::-webkit-scrollbar-thumb {
      background-color: rgba(0, 0, 0, 0.2);
      border-radius: 4px;
    }

    .custom-scroll::-webkit-scrollbar-track {
      background: transparent;
    }

    .custom-scroll {
      scrollbar-width: thin;
      scrollbar-color: rgba(0, 0, 0, 0.2) transparent;
    }


    .actionli .btn {
      font-size: 14px;
      padding: 3px 7px;
      margin-bottom: 5px;
    }

    /* Badge styles */
    .badge-opacity-success {
      background-color: rgb(16, 185, 129);

      padding: 4px 8px;
      border-radius: 10px;
      font-size: 13px !important;
      font-weight: 500;
      display: inline-block;
      margin-top: 5px;
    }

    .badge-opacity-warning {
      background-color: rgb(245, 158, 11);

      padding: 4px 8px;
      border-radius: 10px;
      font-size: 13px !important;
      font-weight: 500;
      display: inline-block;
    }

    /* Print text clickable */
    .text-primary {
      color: #007bff !important;
      cursor: pointer;
      user-select: none;
    }

    /* Set time +/- UI */
    .quandiv1 {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-top: 10px;
    }

    .minus1,
    .plus1 {
      width: 30px;
      height: 30px;
      font-size: 18px;
      font-weight: bold;
      border: 1px solid #ccc;
      background-color: #f8f9fa;
      color: #333;
      border-radius: 4px;
      cursor: pointer;
    }

    .qty1 {
      width: 50px;
      height: 30px;
      text-align: center;
      border: 1px solid #ccc;
      border-radius: 4px;
      background-color: #fff;
    }

    /* Responsive handling */
    @media screen and (max-width: 576px) {
      .toastmodal {
        right: 10px !important;
        left: 10px !important;
        max-width: unset;
      }

      .toast-body {
        padding: 15px;
      }
    }

    /* Optional: prevent backdrop issues from libraries like Bootstrap */
    /* .modal-backdrop,
    .backdrop,
    .overlay,
    .toast-backdrop {
      pointer-events: none !important;
      z-index: 0 !important;
      display: none !important;
    } */


    .handleChangeOrderStatus_accept {
      margin-left: 10px !important;
    }

    .notify {
      position: fixed;
      top: 10px;
      right: 10px;
      z-index: 1060;
      box-sizing: border-box;
      width: 390px;
      right: 10px;
    }

    .notify .alert {
      padding: 1rem 1rem !important;
    }

    .alert-dark {
      background-color: #000000 !important;
      border-color: #000;
      color: #fff !important;
    }

    .alert-dismissible {
      padding-right: 3rem;
    }

    .alert-dismissible .btn-close {
      position: absolute;
      top: 0;
      right: 0;
      z-index: 2;
      padding: 1.25rem 1rem;
    }


    .closeicon2 {
      position: relative;
      top: -2px;
      right: -3px;
      float: right;
      font-size: 21px;
      font-weight: 700;
      line-height: 1;
      color: #fff !important;
      text-shadow: 0 1px 0 #fff;
      cursor: pointer;
    }`}
      </style>
      <div>
        <div className="row">
          <div className={`toastmodal ${hasChild ? "" : "d-none"}`}>
            <div className="toast-container position-fixed  p-1 toastcss" style={{ width: "500px" }}>

              <div className="toast-header actionli">
                <strong className="me-auto" style={{ marginLeft: "15px", fontSize: "14px" }}>{noOfOrders} New Order</strong>

                <button
                  type="button"
                  className={
                    mute ? "btn btn-outline-info btn-fw" : "btn btn-outline-danger btn-fw"
                  }
                  disabled={!mute}
                  onClick={handleMuteClick}
                >
                  Mute
                  {mute ? (
                    <i className="menu-icon mdi mdi-volume-high vsalign"></i>
                  ) : (
                    <i className="menu-icon mdi mdi-volume-mute vsalign"></i>
                  )}
                </button>

                <button
                  type="button"
                  className="btn-close"
                  aria-label="Close"
                  onClick={removeAllChildElements}
                ></button>
              </div>
              <div id="gritter-notice-wrapper" className="toastscroll">



              </div>
            </div>
          </div>

        </div>

      </div>

      <div className="">
        <div id="gritter-notice-wrapper2" className="notify">

        </div>
      </div>












      <div style={{ display: "none" }}>
        <div id="contentToPrintBillNotification">



<>
  <style
    dangerouslySetInnerHTML={{
      __html: `
        // body {
        //   font-family: 'Arial', sans-serif;
         
        
       
        // }
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
      `,
    }}
  />
  <div style={{ textAlign: "end" }}>
    <strong>Bill No. {orderData?.invoice_number}</strong>
  </div>

  
  {orderData?.fooder_logo && (
    <img
      src={orderData.fooder_logo}
      className="logo"
      alt="Logo"
    />
  )}
  <div className="bill-header">{capitalizeFirstLetter(orderData?.fooders_name)}</div>
  <div className="company-info">{capitalizeFirstLetter(orderData?.f_address)}</div>
  <div className="company-info">
    {orderData?.f_city}, {orderData?.f_state} - {orderData?.f_zipcode}
  </div>
  {orderData?.f_landline && (
    <div className="company-info">Phone: {orderData.f_landline}</div>
  )}
  {orderData?.fooders_gstin && (
    <div className="company-info">GST Number: {orderData.fooders_gstin}</div>
  )}
  <div style={{ marginTop: 10, fontSize: 12 }}>
    <div>
      <strong>Name:</strong> {capitalizeFirstLetter(orderData?.eater_name)}
    </div>
    <div style={{ display: "flex", justifyContent: "space-between" }}>
      <div>
        <strong>Date:</strong> {formatTimestampForDate(orderData?.creation_date)}
      </div>
      <div>
        <strong>Time:</strong> {formatTimestampForTime(orderData?.creation_date)}
      </div>
    </div>
    <div style={{ display: "flex", justifyContent: "space-between" }}>
      <div>
        <strong>
          {orderData?.order_type === "dine_in"
            ? orderData?.table_no
            : orderData?.order_type?.toUpperCase().replace("_", " ")}
        </strong>
      </div>
      <div>
        <strong>Order #{orderData?.order_number_qrcode}</strong>
      </div>
    </div>
  </div>
  <div className="bill-header">Original Receipt</div>

  <table>
    <thead>
      <tr>
        <th className="text-left">Item</th>
        <th className="text-center">Qty</th>
        <th className="text-right">Rate</th>
        <th className="text-right">Amt</th>
      </tr>
    </thead>
    <tbody>
      {orderData?.details?.map((order, index) => (
        <tr key={index}>
          <td>
            {capitalizeFirstLetter(order.product_name)}
            {order.variant_details &&
              JSON.parse(order.variant_details).combination_details?.map((i, idx) => (
                <div key={idx}>
                  <b>{i.attribute_name}: </b> {i.attribute_value_name}
                </div>
              ))}
            {order.addons_items_details &&
              JSON.parse(order.addons_items_details).map((i, no) => (
                <div key={no}>
                  <b>{no + 1}.</b> {i.addon_item_name}
                </div>
              ))}
          </td>
          <td className="text-center">{order.quantity}</td>
          <td className="text-right">
            ₹{isValidPrice(order.product_proprice || order.product_price)}
          </td>
          <td className="text-right">
            ₹{isValidPrice(
              (order.product_proprice || order.product_price) * order.quantity
            )}
          </td>
        </tr>
      ))}
    </tbody>
  </table>

  <div className="section-divider" />

  <div style={{ fontSize: 14 }}>
    <div style={{ display: "flex", justifyContent: "space-between" }}>
      <span>Subtotal:</span>
      <span>₹{subTotal}</span>
    </div>

    {discountRate && orderData.discount_type === "percent" && (
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <span>Discount ({discountRate}%)</span>
        <span>₹{discountAmount}</span>
      </div>
    )}
    {discountRate && orderData.discount_type === "amount" && (
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <span>Discount</span>
        <span>₹{discountAmount}</span>
      </div>
    )}

    {SCHRate !== 0 && (
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <span>{orderData?.service_charge_details?.name} ({SCHRate}%)</span>
        <span>₹{schAmount}</span>
      </div>
    )}

    {CGSTTaxT2 !== 0 && (
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <span>CGST(2.5%)</span>
        <span>₹{CGSTTaxT2}</span>
      </div>
    )}
    {SGSTTaxT2 !== 0 && (
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <span>SGST(2.5%)</span>
        <span>₹{SGSTTaxT2}</span>
      </div>
    )}
    {CGSTTaxT3 !== 0 && (
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <span>CGST(6%)</span>
        <span>₹{CGSTTaxT3}</span>
      </div>
    )}
    {SGSTTaxT3 !== 0 && (
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <span>SGST(6%)</span>
        <span>₹{SGSTTaxT3}</span>
      </div>
    )}
    {CGSTTaxT4 !== 0 && (
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <span>CGST(9%)</span>
        <span>₹{CGSTTaxT4}</span>
      </div>
    )}
    {SGSTTaxT4 !== 0 && (
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <span>SGST(9%)</span>
        <span>₹{SGSTTaxT4}</span>
      </div>
    )}
    {CGSTTaxT5 !== 0 && (
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <span>CGST(14%)</span>
        <span>₹{CGSTTaxT5}</span>
      </div>
    )}
    {SGSTTaxT5 !== 0 && (
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <span>SGST(14%)</span>
        <span>₹{SGSTTaxT5}</span>
      </div>
    )}

    {cartProductPackingCharges !== 0 && orderData?.order_type !== "dine_in" && (
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <span>Packaging Charges</span>
        <span>₹{cartProductPackingCharges}</span>
      </div>
    )}

    {orderData?.delivery_charge && parseFloat(orderData.delivery_charge) > 0 && (
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <span>Delivery Charge</span>
        <span>₹{parseFloat(orderData.delivery_charge).toFixed(2)}</span>
      </div>
    )}

    {orderData?.packaging_fee && parseFloat(orderData.packaging_fee) > 0 && (
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <span>Packaging Fee</span>
        <span>₹{parseFloat(orderData.packaging_fee).toFixed(2)}</span>
      </div>
    )}

    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        fontSize: 15,
        marginTop: 5,
      }}
    >
      <strong>Total:</strong>
      <strong>₹{totalAmountPaid}</strong>
    </div>
  </div>

  <div className="section-divider" />

  <div className="footer">
    {orderData?.fooders_fssai_number && (
      <div>FSSAI Number: {orderData.fooders_fssai_number}</div>
    )}
   
    {orderData?.payment_status !== undefined && (
      <div style={{ marginTop: 6 }}>
        Payment Status:{" "}
        {{
          0: "Unpaid",
          1: "Paid",
          2: "Hold",
          3: "Partially Paid",
        }[orderData.payment_status]}
      </div>
    )}
    {orderData?.billing_notes && (
      <div style={{ marginTop: 6 }}>{orderData.billing_notes}</div>
    )}
    <p style={{ marginTop: 6 }}>Thank you for your visit!</p>
  </div>
</>


 
        </div>
      </div>

















      {fullLoader && <LoadingModal isLoading={fullLoader} />}
    </>
  );
}
