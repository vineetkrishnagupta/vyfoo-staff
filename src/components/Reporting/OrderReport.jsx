

import { useEffect, useState } from "react";
import "./OrderReport.css";
import Sidebar from "../Sidebar";
import MainHeader from "../MainHeader";
import { GetReportByOrderTypeURL } from "../../BaseURL/baseURL";
import axiosInstance from "../../utlis/axiosinstance";
import Toaster from "../../utlis/Toaster";
import { Link } from "react-router-dom";
import jsPDF from "jspdf";
import "jspdf-autotable";
import * as XLSX from "xlsx";
import LoadingModal from "../../utlis/LoadingModal";
import {getAppDataFromDB} from "../../utlis/indexedDB";



const OrderReport = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [data, setData] = useState([]);
  const [displayFilters, setDisplayFilters] = useState({
  order_mode: "all",
  payment_status: "all"
});

  const [foodeName, setFooderName] = useState("");
  const [reportData, setReportData] = useState({
    totalSubtotal: "",
    totalDiscount: "",
    totalTotal: "",
    totalServiceCharge: "",
    totalTax: "",
    currency_symbol: "",
    start_date: "",
    end_date: "",
    totalCustomerPaidAmount: "",
    totalCustomerDueAmount: "",
    order_mode: "",
    payment_status: "",
    totalPackingCharges: "",
    totalRoundUpAmount: "",
  });
  const [reportDataByType, setReportDataByType] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
   const [fullLoader, setFullLoader] =  useState(false);


  // Utility to format date like 2025-08-01
function formatDateRange(dateStr) {
  if (!dateStr) return "NA";
  const [datePart] = dateStr.split("T");
  return datePart;
}

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

const downloadPdfDocument = () => {
  const doc = new jsPDF("landscape");
  const pageWidth = doc.internal.pageSize.getWidth();

  // Helpers
  const formatDate = (dateStr) => {
    if (!dateStr) return "NA";
    const [yyyy, mm, dd] = dateStr.split("T")[0].split("-");
    return `${dd}/${mm}/${yyyy}`;
  };

  const centerText = (text, y, fontSize = 12, isBold = false) => {
    doc.setFont("times", isBold ? "bold" : "normal");
    doc.setFontSize(fontSize);
    const textWidth = doc.getTextWidth(text);
    const x = (pageWidth - textWidth) / 2;
    doc.text(text, x, y);
  };

  // Data to display
  // const restaurantName = reportData.restaurant_name || "Lava Pub Restaurant";
  const restaurantName = foodeName || "";
  const reportTitle = "Order Report";
  const reportDate = `Report Date: ${getCurrentDateFormatted()}`;
  const dateRange = `Date Range: ${formatDate(reportData.start_date)} to ${formatDate(reportData.end_date)}`;

  // Header Section (centered)
  centerText(restaurantName, 15, 16, true);
  centerText(reportTitle, 25, 12);
  centerText(dateRange, 32, 12);
  centerText(reportDate, 39, 12);

  // Table
  doc.autoTable({
    html: "#pdfContent",
    startY: 45,
    theme: "grid",
    styles: {
      font: "times",
      fontSize: 9,
      cellPadding: 1,
      overflow: "linebreak",
    },
    headStyles: {
      fillColor: [220, 220, 220],
      textColor: [0, 0, 0],
      halign: "center",
      valign: "middle",
      fontStyle: "bold",
    },
    bodyStyles: {
      fillColor: [255, 255, 255],
      textColor: [0, 0, 0],
      halign: "left",
      valign: "middle",
    },
    footStyles: {
      fillColor: [220, 220, 220],
      textColor: [0, 0, 0],
      halign: "left",
      valign: "middle",
      fontStyle: "bold",
    },
    columnStyles: {
      0: { halign: "left", cellWidth: 35 },
      1: { halign: "left", cellWidth: 20 },
      2: { halign: "left" },
      3: { halign: "left" },
      4: { halign: "left" },
      5: { halign: "left" },
      6: { halign: "left", cellWidth: 20 },
      7: { halign: "left" },
    },
    margin: { top: 10, left: 10, right: 10 },
    didParseCell: function (data) {
      if (data.row.section === "body" && data.column.dataKey === 0) {
        data.cell.styles.halign = "left";
      }
    },
  });

  doc.save(
    `Order_Report-${formatDate(reportData.start_date)}-${formatDate(reportData.end_date)}.pdf`
  );
};



const exportToExcel = () => {
  const table_elt = document.getElementById("pdfContent");

  const workbook = XLSX.utils.table_to_book(table_elt);

  XLSX.writeFile(
    workbook,
    `Order_Report-${formatDateRange(reportData.start_date)}-${formatDateRange(
      reportData.end_date
    )}.xlsx`
  );
};

  const toggleSidebar = () => {
    setIsSidebarOpen((prev) => !prev);
  };

  function padNumber(number, length) {
    return String(number).padStart(length, '0');
  }

  // Helper functions to get today's and tomorrow's date in yyyy-mm-ddT00:00 format
  function getToday() {
    const today = new Date();
    const yyyy = today.getFullYear();
    let mm = today.getMonth() + 1;
    let dd = today.getDate();

    if (mm < 10) mm = "0" + mm;
    if (dd < 10) dd = "0" + dd;

    return `${yyyy}-${mm}-${dd}`;
  }
  function getTomorrow() {
    const today = new Date();
    today.setDate(today.getDate() + 1);
    const yyyy = today.getFullYear();
    let mm = today.getMonth() + 1;
    let dd = today.getDate();

    if (mm < 10) mm = "0" + mm;
    if (dd < 10) dd = "0" + dd;

    return `${yyyy}-${mm}-${dd}`;
}

  // Fix: Default order_mode to "all"
 const [formData, setFormData] = useState({
    start_date: `${getToday()}T00:00`,
    end_date: `${getTomorrow()}T00:00`,
    order_mode: "",
    payment_status: "all"
  });

  // Fix: Convert dd/mm/yyyy to yyyy-mm-dd for API
  // function convertToISOFormat(inputDate) {
  //   // inputDate: "dd/mm/yyyy hh:mm AM/PM"
  //   const [datePart, timePart, ampm] = inputDate.split(/[\s:]+/);
  //   const [dd, mm, yyyy] = datePart.split("/");
  //   let hours = parseInt(timePart, 10);
  //   let minutes = parseInt(inputDate.split(":")[1], 10);

  //   let period = ampm || inputDate.split(" ")[2];
  //   if (period === "PM" && hours !== 12) hours += 12;
  //   if (period === "AM" && hours === 12) hours = 0;

  //   // Return yyyy-mm-ddTHH:MM (correct order)
  //   return `${yyyy}-${padNumber(mm, 2)}-${padNumber(dd, 2)}T${padNumber(hours, 2)}:${padNumber(minutes, 2)}`;
  // }

  // Fixed: Correctly parse 12 AM as 00:00 and 12 PM as 12:00
  // function convertToISOFormat(inputDate) {
  //   // inputDate: "dd/mm/yyyy hh:mm AM/PM"
  //   const [datePart, timePart, ampm] = inputDate.split(/[\s:]+/);
  //   const [dd, mm, yyyy] = datePart.split("/");
  //   let hours = parseInt(timePart, 10);
  //   let minutes = parseInt(inputDate.split(":")[1], 10);

  //   let period = ampm || inputDate.split(" ")[2];
  //   if (period === "PM" && hours !== 12) hours += 12;
  //   if (period === "AM" && hours === 12) hours = 0;

  //   return `${yyyy}-${padNumber(mm, 2)}-${padNumber(dd, 2)}T${padNumber(hours, 2)}:${padNumber(minutes, 2)}`;
  // }

  function convertToISOFormat(inputDate) {
  if (!inputDate.includes("/")) {
    // Already in yyyy-mm-ddTHH:MM format
    return inputDate;
  }

  // Handle dd/mm/yyyy hh:mm AM/PM
  const [datePart, timePart, ampm] = inputDate.split(/[\s:]+/);
  const [dd, mm, yyyy] = datePart.split("/");
  let hours = parseInt(timePart, 10);
  let minutes = parseInt(inputDate.split(":")[1], 10);

  let period = ampm || inputDate.split(" ")[2];
  if (period === "PM" && hours !== 12) hours += 12;
  if (period === "AM" && hours === 12) hours = 0;

  return `${yyyy}-${padNumber(mm, 2)}-${padNumber(dd, 2)}T${padNumber(hours, 2)}:${padNumber(minutes, 2)}`;
}


  function formatDate(dateTimeStr) {
    const [datePart, timePart] = dateTimeStr.split("T");
    const [year, month, day] = datePart.split("-");
    const [hours, minutes] = timePart.split(":");
    const h = parseInt(hours, 10);
    const period = h >= 12 ? "PM" : "AM";
    const hour12 = h % 12 || 12;
    return `${day}/${month}/${year} ${hour12}:${minutes} ${period}`;
  }

  function getCurrentDateFormatted() {
    const today = new Date();
    const dd = String(today.getDate()).padStart(2, "0");
    const mm = String(today.getMonth() + 1).padStart(2, "0");
    const yyyy = today.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleResetClick = () => {
    setFormData({
      start_date: "08/01/2025 12:00 AM",
      end_date: "08/02/2025 12:00 AM",
      order_mode: "",
      payment_status: "all",
    });
    setData([]);
    setReportDataByType(null);
    setReportData({
      totalSubtotal: "",
      totalDiscount: "",
      totalTotal: "",
      totalServiceCharge: "",
      totalTax: "",
      currency_symbol: "",
      start_date: "",
      end_date: "",
      totalCustomerPaidAmount: "",
      totalCustomerDueAmount: "",
      order_mode: "",
      payment_status: "",
      totalPackingCharges: "",
      totalRoundUpAmount: "",
    });
  };

  // const handleSubmitClick = async (e) => {
  //   e.preventDefault();

  //   if (formData.start_date === "") {
  //     Toaster.error("error", "Start Date can not be empty");
  //   } else if (formData.end_date === "") {
  //     Toaster.error("error", "End Date can not be empty");
  //   } else {
  //     setIsLoading(true);
  //     setFullLoader(true);
  //     try {
  //       const response = await axiosInstance.get(GetReportByOrderTypeURL, {
  //        params: {
  //           start_date: convertToISOFormat(formData.start_date),
  //           end_date: convertToISOFormat(formData.end_date),
  //           order_mode: formData.order_mode,
  //           payment_status: formData.payment_status,

  //         },
  //       });

  //       if (response.status === 200 && response.data.data) {
  //         setData(response.data.data);
  //         setReportDataByType(
  //           response.data.orderTypeTotals ? response.data.orderTypeTotals : null
  //         );
  //         setReportData({
  //           totalSubtotal: response.data.totalSubtotal,
  //           totalDiscount: response.data.totalDiscount,
  //           totalTotal: response.data.totalTotal,
  //           totalServiceCharge: response.data.totalServiceCharge,
  //           totalTax: response.data.totalTax,
  //           currency_symbol: response.data.currency_symbol,
  //           start_date: response.data.start_date,
  //           end_date: response.data.end_date,
  //           totalCustomerPaidAmount: response.data.totalCustomerPaidAmount,
  //           totalCustomerDueAmount: response.data.totalCustomerDueAmount,
  //           order_mode: response.data.order_mode,
  //           payment_status: response.data.payment_status,
  //           totalPackingCharges: response.data.totalPackingCharges,
  //           totalRoundUpAmount: response.data.totalRoundUpAmount,
  //         });
  //       } else if (response.status === 200 && response.data.message) {
  //         Toaster.success(response.data.message);
  //         setData([]);
  //         setReportDataByType(null);
  //         setReportData({
  //           totalSubtotal: "",
  //           totalDiscount: "",
  //           totalTotal: "",
  //           totalServiceCharge: "",
  //           totalTax: "",
  //           currency_symbol: "",
  //           start_date: "",
  //           end_date: "",
  //           totalCustomerPaidAmount: "",
  //           totalCustomerDueAmount: "",
  //           order_mode: "",
  //           payment_status: "",
  //           totalPackingCharges: "",
  //           totalRoundUpAmount: "",
  //         });
  //       }
  //     } catch (error) {
  //       if (error.response && error.response.data.message) {
  //         Toaster.error("error", error.response.data.message);
  //       } else {
  //         Toaster.error("error", error.message);
  //       }
  //       console.log(error);
  //     } finally {
  //       setFullLoader(false);
  //       setIsLoading(false);
  //     }
    
  //   }
  // };

  // Dummy for details click
  
  const handleSubmitClick = async (e) => {
  e.preventDefault();

if (!formData.start_date || !formData.start_date.includes("T")) {
  Toaster.error( "Please select a start date");
  return;
}
if (!formData.end_date || !formData.end_date.includes("T")) {
  Toaster.error("Please select a end date");
  return;
}

  setDisplayFilters({
    order_mode: formData.order_mode || "all",
    payment_status: formData.payment_status || "all"
  });

  // ✅ Only reached if all validations passed
  setIsLoading(true);
  setFullLoader(true);

  try {
    const response = await axiosInstance.get(GetReportByOrderTypeURL, {
      params: {
        start_date: convertToISOFormat(formData.start_date),
        end_date: convertToISOFormat(formData.end_date),
        order_mode: formData.order_mode,
        payment_status: formData.payment_status,
      },
    });

    if (response.status === 200 && response.data.data) {
      setData(response.data.data);
      setReportDataByType(response.data.orderTypeTotals || null);
      setReportData({
        totalSubtotal: response.data.totalSubtotal,
        totalDiscount: response.data.totalDiscount,
        totalTotal: response.data.totalTotal,
        totalServiceCharge: response.data.totalServiceCharge,
        totalTax: response.data.totalTax,
        currency_symbol: response.data.currency_symbol,
        start_date: response.data.start_date,
        end_date: response.data.end_date,
        totalCustomerPaidAmount: response.data.totalCustomerPaidAmount,
        totalCustomerDueAmount: response.data.totalCustomerDueAmount,
        order_mode: response.data.order_mode,
        payment_status: response.data.payment_status,
        totalPackingCharges: response.data.totalPackingCharges,
        totalRoundUpAmount: response.data.totalRoundUpAmount,
      });
    } else if (response.status === 200 && response.data.message) {
      Toaster.success(response.data.message);
      setData([]);
      setReportDataByType(null);
      setReportData({
        totalSubtotal: "",
        totalDiscount: "",
        totalTotal: "",
        totalServiceCharge: "",
        totalTax: "",
        currency_symbol: "",
        start_date: "",
        end_date: "",
        totalCustomerPaidAmount: "",
        totalCustomerDueAmount: "",
        order_mode: "",
        payment_status: "",
        totalPackingCharges: "",
        totalRoundUpAmount: "",
      });
    }
  } catch (error) {
    if (error.response?.data?.message) {
      Toaster.error("error", error.response.data.message);
    } else {
      Toaster.error("error", error.message);
    }
    console.error(error);
  } finally {
    setFullLoader(false);
    setIsLoading(false);
  }
};

  
  const handleDetailsClick = (id) => {
    // Implement as needed
  };

  

  return (
    <>
      <div
        style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 1040 }}
      >
        <MainHeader toggleSidebar={toggleSidebar} />
      </div>
      <div className="d-flex">
        <Sidebar isOpen={isSidebarOpen} />
        <div
          className="custom-scroll"
          style={{
            marginLeft: isSidebarOpen ? "250px" : "60px",
            marginTop: "56px",
            padding: "20px",
            transition: "margin-left 0.3s ease",
            width: "100%",
            height: "calc(100vh - 56px)",
            overflowY: "auto",
            background: "#f4f5f7",
          }}
        >
          <div className="orders-report-container">
            {/* Header */}
            <div className="header-row">
              <div className="header-title">Orders Report</div>
              <Link className="back-btn text-decoration-none" to="/reports">Go Back</Link>
            </div>
            <div className="desc-text">
              This report provides insights into orders categorized by type and
              payment status, offering a comprehensive overview for informed
              decision-making.
            </div>

            {/* Filters */}
            <div className="filters-row cardBox">
              {/* <div className="filter-group">
                <label>Start Date*</label>
                <input
                  type="text"
                  name="start_date"
                  value={formData.start_date}
                  onChange={handleInputChange}
                />
              </div>
              <div className="filter-group">
                <label>End Date*</label>
                <input
                  type="text"
                  name="end_date"
                  value={formData.end_date}
                  onChange={handleInputChange}
                />
              </div> */}
          
                <div className="csr-filter-group">
                  <label>Start Date<span className="text-danger">*</span></label>
                  <div className="csr-input-icon">
                    <input 
                      className="csr-input" 
                      type="datetime-local" 
                      name="start_date"
                      value={formData.start_date}
                      onChange={handleInputChange}
                      
                    />
                  
                  </div>
                </div>
                <div className="csr-filter-group">
                  <label>End Date<span className="text-danger">*</span></label>
                  <div className="csr-input-icon">
                    <input 
                      className="csr-input" 
                      type="datetime-local" 
                      name="end_date"
                      value={formData.end_date}
                      onChange={handleInputChange}
                     
                    />
                 
                  </div>
                  </div>
                

              <div className="csr-filter-group">
                <label>Order Type</label>
                <select
                  name="order_mode"
                  value={formData.order_mode}
                  onChange={handleInputChange}
                >
                  <option value="all">All</option>
                  <option value="dine_in">Dine In</option>
                  <option value="delivery">Delivery</option>
                  <option value="take_away">Take Away</option>
                </select>
              </div>

    

              <div className="csr-filter-group">
                <label>Payment Status</label>
                <select
                  name="payment_status"
                  value={formData.payment_status}
                  onChange={handleInputChange}
                >
                  <option value="all">All</option>
                  <option value="1">Paid</option>
                  <option value="0">Unpaid</option>
                  <option value="3">Partially Unpaid</option>
                  <option value="2">Hold</option>
                </select>
              </div>
            </div>

            <div className="filters-actions">
              <button
                className="submit-btn"
                onClick={handleSubmitClick}
                disabled={isLoading}
              >
                {isLoading ? "Loading..." : "Submit"}
              </button>
              <button className="reset-btn" onClick={handleResetClick}>
                Reset
              </button>
            </div>

            {data.length === 0 ? (
              ""
            ) : (
              <div className="table-actions-row">
                <div></div>
              <div>
  <button className="yellow-btn" onClick={downloadPdfDocument}>
    Generate PDF
  </button>
  <button className="yellow-btn" onClick={exportToExcel}>
    Export to Excel
  </button>
</div>

              </div>
            )}

            {/* Table Info */}
            {/* {data.length === 0 ? (
              ""
            ) : (
              <div className="table-meta-row">
              

                <span>
                  {" "}
                  Order Type:{" "}
                  {formData.order_mode === "all"
                    ? "All"
                    : formData.order_mode === "dine_in"
                    ? "Dine In"
                    : formData.order_mode === "delivery"
                    ? "Delivery"
                    : "Take Away"}{" "}
                </span>
                <span>
                  {" "}
                  Payment Status:{" "}
                  {formData.payment_status === "all"
                    ? "All"
                    : formData.payment_status === "1"
                    ? "Paid"
                    : formData.payment_status === "0"
                    ? "Unpaid"
                    : formData.payment_status === "3"
                    ? "Partially Unpaid"
                    : "Hold"}{" "}
                </span>
              </div>
            )} */}

 


            {/* Main Table */}

            <div className="report-table-wrapper">
                {data.length === 0 ? (
                ""
              ) : (
                <div className="report-table-meta">
                  <div>
                    Date Range:{" "}
                    {reportData.start_date
                      ? formatDate(reportData.start_date)
                      : ""}{" "}
                    -{" "}
                    {reportData.end_date ? formatDate(reportData.end_date) : ""}
                  </div>
          <div>
  Order Type:{" "}
  {displayFilters.order_mode === "" || displayFilters.order_mode === "all"
    ? "All"
    : displayFilters.order_mode === "dine_in"
    ? "Dine In"
    : displayFilters.order_mode === "delivery"
    ? "Delivery"
    : "Take Away"}
</div>

<div>
  Payment Status:{" "}
  {displayFilters.payment_status === "all"
    ? "All"
    : displayFilters.payment_status === "1"
    ? "Paid"
    : displayFilters.payment_status === "0"
    ? "Unpaid"
    : displayFilters.payment_status === "3"
    ? "Partially Unpaid"
    : "Hold"}
</div>

                </div>
              )}

                <LoadingModal isLoading={fullLoader} />

               {data.length === 0 ? (
                ""
                ) : (
                  <>
                    <div className="table-title-row">
    <span>Order Report</span>
    <span>Report Date: {getCurrentDateFormatted()}</span>
  </div>
                  
                  <div className="report-table-title">
                <span>Order Report</span>
                <span>Report Date: {getCurrentDateFormatted()}</span>
              </div>
              </>)}

              <div className="report-table-responsive">
                {data.length === 0 ? (
                  ""
                ) : (
                  <table id="pdfContent" className="report-table">
                    <thead>
                      <tr>
                        <th>Order Date</th>
                        <th>Bill No</th>
                        <th>Order ID</th>
                        <th>Order Type</th>
                        <th>Payment Status</th>
                        <th>Subtotal</th>
                        <th>Discount</th>
                        <th>Service Charge</th>
                        <th>Tax</th>
                        <th>Packaging Charges</th>
                        <th>Round off Amount</th>
                        <th>Total Amount</th>
                        <th>Paid Amount</th>
                        <th>Due Amount</th>
                      </tr>
                    </thead>

                    <tbody>
                      {data.length === 0 ? (
                        ""
                      ) : (
                        <>
                          {data.map((item, index) => (
                            <tr key={index}>
                              <td>{item.creation_date_formatted}</td>
                              <td
                              
                                onClick={() => handleDetailsClick(item.id)}
                              >
                                {item.invoice_no}
                              </td>
                              <td
                               
                                onClick={() => handleDetailsClick(item.id)}
                              >
                                {item.order_number_qrcode}
                              </td>
                              <td>{item.order_type}</td>
                              <td>{item.payment_status_lable}</td>
                              <td>Rs.{parseFloat(item.subtotal).toFixed(2)}</td>
                              <td>Rs.{parseFloat(item.discount).toFixed(2)}</td>
                              <td>
                                Rs.{parseFloat(item.service_charge).toFixed(2)}
                              </td>
                              <td>Rs.{parseFloat(item.tax).toFixed(2)}</td>
                              <td>
                                Rs.{parseFloat(item.packaging_fee).toFixed(2)}
                              </td>
                              <td>
                                Rs.{parseFloat(item.round_up_amount).toFixed(2)}
                              </td>
                              <td>Rs.{parseFloat(item.total).toFixed(2)}</td>
                              <td>
                                Rs.
                                {parseFloat(item.customer_paid_amount).toFixed(
                                  2
                                )}
                              </td>
                              <td>
                                Rs.
                                {parseFloat(item.customer_due_amount).toFixed(
                                  2
                                )}
                              </td>
                            </tr>
                          ))}

                          {reportDataByType &&
                            Object.keys(reportDataByType).map(
                              (orderType, index) => (
                                <tr className="report-summary-row" key={index}>
                                  <td>{orderType}</td>
                                  <td colSpan={4}></td>
                                  <td>
                                    <b>(Subtotal)</b>
                                    <br />
                                    Rs.
                                    {parseFloat(
                                      reportDataByType[orderType].subtotal
                                    ).toFixed(2)}
                                  </td>
                                  <td>
                                    <b>(Discount)</b>
                                    <br />
                                    Rs.
                                    {parseFloat(
                                      reportDataByType[orderType].discount
                                    ).toFixed(2)}
                                  </td>
                                  <td>
                                    <b>(Service Charge)</b>
                                    <br />
                                    Rs.
                                    {parseFloat(
                                      reportDataByType[orderType].serviceCharge
                                    ).toFixed(2)}
                                  </td>
                                  <td>
                                    <b>(Tax)</b>
                                    <br />
                                    Rs.
                                    {parseFloat(
                                      reportDataByType[orderType].tax
                                    ).toFixed(2)}
                                  </td>
                                  <td>
                                    <b>(Packaging Charges)</b>
                                    <br />
                                    Rs.
                                    {parseFloat(
                                      reportDataByType[orderType]
                                        .totalPackingCharges
                                    ).toFixed(2)}
                                  </td>
                                  <td>
                                    <b>(Round off Amount)</b>
                                    <br />
                                    Rs.
                                    {parseFloat(
                                      reportDataByType[orderType]
                                        .totalRoundUpAmount
                                    ).toFixed(2)}
                                  </td>
                                  <td>
                                    <b>(Total Amount)</b>
                                    <br />
                                    Rs.
                                    {parseFloat(
                                      reportDataByType[orderType].total
                                    ).toFixed(2)}
                                  </td>
                                  <td>
                                    <b>(Paid Amount)</b>
                                    <br />
                                    Rs.
                                    {parseFloat(
                                      reportDataByType[orderType]
                                        .totalCustomerPaidAmount
                                    ).toFixed(2)}
                                  </td>
                                  <td>
                                    <b>(Due Amount)</b>
                                    <br />
                                    Rs.
                                    {parseFloat(
                                      reportDataByType[orderType]
                                        .totalCustomerDueAmount
                                    ).toFixed(2)}
                                  </td>
                                </tr>
                              )
                            )}

                          <tr className="report-total-row">
                            <td>Total ({data.length})</td>
                            <td colSpan={4}></td>
                            <td>
                              <b>(Subtotal)</b>
                              <br />
                              Rs.
                              {parseFloat(
                                reportData.totalSubtotal || 0
                              ).toFixed(2)}
                            </td>
                            <td>
                              <b>(Discount)</b>
                              <br />
                              Rs.
                              {parseFloat(
                                reportData.totalDiscount || 0
                              ).toFixed(2)}
                            </td>
                            <td>
                              <b>(Service Charge)</b>
                              <br />
                              Rs.
                              {parseFloat(
                                reportData.totalServiceCharge || 0
                              ).toFixed(2)}
                            </td>
                            <td>
                              <b>(Tax)</b>
                              <br />
                              Rs.
                              {parseFloat(reportData.totalTax || 0).toFixed(2)}
                            </td>
                            <td>
                              <b>(Packaging Charges)</b>
                              <br />
                              Rs.
                              {parseFloat(
                                reportData.totalPackingCharges || 0
                              ).toFixed(2)}
                            </td>
                            <td>
                              <b>(Round off Amount)</b>
                              <br />
                              Rs.
                              {parseFloat(
                                reportData.totalRoundUpAmount || 0
                              ).toFixed(2)}
                            </td>
                            <td>
                              <b>(Total Amount)</b>
                              <br />
                              Rs.
                              {parseFloat(reportData.totalTotal || 0).toFixed(
                                2
                              )}
                            </td>
                            <td>
                              <b>(Paid Amount)</b>
                              <br />
                              Rs.
                              {parseFloat(
                                reportData.totalCustomerPaidAmount || 0
                              ).toFixed(2)}
                            </td>
                            <td>
                              <b>(Due Amount)</b>
                              <br />
                              Rs.
                              {parseFloat(
                                reportData.totalCustomerDueAmount || 0
                              ).toFixed(2)}
                            </td>
                          </tr>
                        </>
                      )}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default OrderReport;
