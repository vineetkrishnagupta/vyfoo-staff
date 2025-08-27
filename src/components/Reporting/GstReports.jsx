

// import { Link } from "react-router-dom";
// import { useState } from "react";
// import MainHeader from "../MainHeader";
// import Sidebar from "../Sidebar"; 
// import styles from "./GSTReport.module.css";
// import {GetGSTReportURL} from "../../BaseURL/baseURL"

// function GstReports() {
//       const [isSidebarOpen, setIsSidebarOpen] = useState(true);
//      const [startDate, setStartDate] = useState("31/07/2025");
//   const [endDate, setEndDate] = useState("31/07/2025");
//       const toggleSidebar = () => {
//         setIsSidebarOpen((prev) => !prev);
//       };

//       const dummyData = [
//   {
//     date: "31 Jul 2025",
//     bill: "5225",
//     status: "Accept and in-progress order",
//     subtotal: "Rs.200.00",
//     discount: "Rs.0.00",
//     service: "Rs.0.00",
//     tax: "Rs.0.00",
//     packaging: "Rs.0.00",
//     paid: "Rs.225.00",
//   },
//   // Add more objects for a longer table, can repeat this one
// ];
// while (dummyData.length < 15) dummyData.push({ ...dummyData[0], bill: String(5225 + dummyData.length) });
//   const handleSubmitClick = async (e) => {
//     e.preventDefault();

//     if (formData.start_date === "") {
//       addToast("error", "Start Date can not be empty");
//     } else if (new Date(formData.start_date) > new Date(getToday())) {
//       addToast("error", "Start Date can not be future Date");
//     } else if (formData.end_date === "") {
//       addToast("error", "End Date can not be empty");
//     } else if (new Date(formData.end_date) > new Date(getToday())) {
//       addToast("error", "End Date can not be future Date");
//     } else if (new Date(formData.start_date) > new Date(formData.end_date)) {
//       addToast("error", "End Date can not be previous of Start Date");
//     } else {
//       setIsLoading(true);
//       try {
//         const response = await axios.get(GetGSTReportURL, {
//           params: {
//             start_date: formData.start_date,
//             end_date: formData.end_date,
//           },
//           headers: { authorization: `Bearer ${token}` },
//         });

//         if (response.status === 200 && response.data.data) {
//           setData(response.data.data);
//           setReportData({
//             totalSubtotal: response.data.totalSubtotal,
//             totalDiscount: response.data.totalDiscount,
//             totalTotal: response.data.totalTotal,
//             totalPackingCharges:response.data.totalPackingCharges,
//             totalServiceCharge: response.data.totalServiceCharge,
//             totalTax: response.data.totalTax,
//             currency_symbol: response.data.currency_symbol,
//             start_date: response.data.start_date,
//             end_date: response.data.end_date,
//           });
//         } else if (response.status === 200 && response.data.message) {
//           addToast("success", response.data.message);
//           setData([]);
//           setReportData({
//             totalSubtotal: "",
//             totalDiscount: "",
//             totalTotal: "",
//             totalServiceCharge: "",
//             totalTax: "",
//             currency_symbol: "",
//             start_date: "",
//             end_date: "",
//           });
//         }
//       } catch (error) {
//         if (error.response && error.response.data.message) {
//           addToast("error", error.response.data.message);
//         } else {
//           addToast("error", error.message);
//         }
//         console.log(error);
//       }
//       setIsLoading(false);
//     }
//   };

//   return (
//     <>
//          <div style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 1040 }}>
//         <MainHeader toggleSidebar={toggleSidebar} />
//       </div>
//        <div className="d-flex">
//         {/* Sidebar */}
//         <Sidebar isOpen={isSidebarOpen} />
//         <div
//           className="custom-scroll"
//           style={{
//             marginLeft: isSidebarOpen ? "250px" : "60px",
//             marginTop: "56px",
//             padding: "20px",
//             transition: "margin-left 0.3s ease",
//             width: "100%",
//             height: "calc(100vh - 56px)",
//             overflowY: "auto",
//             background: "#f4f5f7",
//           }}
//         >

//         <div className={styles.page}>
//       {/* Header bar */}
//       <div className={styles.headerRow}>
//         <div className={styles.title}>GST Report</div>
//         <button className={styles.backBtn}>Go Back</button>
//       </div>

//       {/* Date filter/search form */}
//       <div className={styles.formRow}>
//         <div className={styles.formFieldGroup}>
//           <div>
//             <label className={styles.formLabel}>Start Date</label>
//             <input
//               className={styles.input}
//               type="date"
//               value={startDate}
//               onChange={e => setStartDate(e.target.value)}
//             />
//           </div>
//           <div>
//             <label className={styles.formLabel}>End Date</label>
//             <input
//               className={styles.input}
//               type="date"
//               value={endDate}
//               onChange={e => setEndDate(e.target.value)}
//             />
//           </div>
//         </div>
//         <div className={styles.formBtnGroup}>
//           <button className={styles.submitBtn}>Submit</button>
//           <button className={styles.resetBtn}>Reset</button>
//         </div>
//       </div>

//       <div className={styles.panel}>
//         {/* Buttons above table */}
//         <div className={styles.panelTopRow}>
//           <div></div>
//           <div className={styles.extraBtns}>
//             <button className={styles.yellowBtn}>Generate PDF</button>
//             <button className={styles.yellowBtn}>Export to Excel</button>
//           </div>
//         </div>
//         {/* Table heading etc */}
//         <div className={styles.reportTitles}>
//           <div className={styles.panelTitle}>GST Report</div>
//           <div className={styles.panelSubTitle}>Report Date: 31/07/2025</div>
//           <div className={styles.panelDesc}>Sales date range: 31/07/2025 - 31/07/2025</div>
//         </div>
//         {/* Table */}
//         <div className={styles.tableWrapper}>
//         <table className={styles.table}>
//           <thead>
//             <tr>
//               <th>Order Date</th>
//               <th>Bill No</th>
//               <th>Status</th>
//               <th>Subtotal</th>
//               <th>Discount</th>
//               <th>Service Charge</th>
//               <th>Tax</th>
//               <th>Packaging Charge</th>
//               <th>Paid Amount</th>
//             </tr>
//           </thead>
//           <tbody>
//             {dummyData.map((row, i) => (
//               <tr key={i}>
//                 <td>{row.date}</td>
//                 <td>
//                   <a href="#" className={styles.billLink}>{row.bill}</a>
//                 </td>
//                 <td>{row.status}</td>
//                 <td>{row.subtotal}</td>
//                 <td>{row.discount}</td>
//                 <td>{row.service}</td>
//                 <td>{row.tax}</td>
//                 <td>{row.packaging}</td>
//                 <td>{row.paid}</td>
//               </tr>
//             ))}
//           </tbody>
//           <tfoot>
//             <tr>
//               <td>Total</td>
//               <td></td>
//               <td></td>
//               <td><b>Rs.6015.12</b></td>
//               <td><b>Rs.1185.00</b></td>
//               <td><b>Rs.108.31</b></td>
//               <td><b>Rs.81.67</b></td>
//               <td><b>Rs.5.00</b></td>
//               <td><b>Rs.4995.13</b></td>
//             </tr>
//           </tfoot>
//         </table>
//         </div>
//       </div>
//     </div>


//         </div>
// </div>
//     </>
//   )
// }

// export default GstReports


// import React, { useState } from "react";
// import axios from "axios";
// import MainHeader from "../MainHeader";
// import Sidebar from "../Sidebar";
// import styles from "./GSTReport.module.css";
// import { GetGSTReportURL } from "../../BaseURL/baseURL";
// import axiosInstance from "../../utlis/axiosinstance";

// function GstReports() {
//   const [isSidebarOpen, setIsSidebarOpen] = useState(true);
//   const [startDate, setStartDate] = useState("2025-07-31");
//   const [endDate, setEndDate] = useState("2025-07-31");
//   const [data, setData] = useState([]);
//   const [isLoading, setIsLoading] = useState(false);

//   const [reportData, setReportData] = useState({
//     totalSubtotal: "",
//     totalDiscount: "",
//     totalTotal: "",
//     totalPackingCharges: "",
//     totalServiceCharge: "",
//     totalTax: "",
//     currency_symbol: "",
//     start_date: "",
//     end_date: "",
//   });

//   const toggleSidebar = () => {
//     setIsSidebarOpen((prev) => !prev);
//   };

//   const getToday = () => new Date().toISOString().split("T")[0];

//   const handleSubmitClick = async (e) => {
//     e.preventDefault();

//     if (!startDate || new Date(startDate) > new Date(getToday())) {
//       alert("Invalid Start Date");
//       return;
//     }
//     if (!endDate || new Date(endDate) > new Date(getToday())) {
//       alert("Invalid End Date");
//       return;
//     }
//     if (new Date(startDate) > new Date(endDate)) {
//       alert("End Date cannot be before Start Date");
//       return;
//     }

//     setIsLoading(true);
//     try {
//       const response = await axiosInstance.get(GetGSTReportURL, {
//         params: { start_date: startDate, end_date: endDate },
//       });

//       if (response.status === 200 && response.data.data) {
//         setData(response.data.data);
//         setReportData({
//           totalSubtotal: response.data.totalSubtotal,
//           totalDiscount: response.data.totalDiscount,
//           totalTotal: response.data.totalTotal,
//           totalPackingCharges: response.data.totalPackingCharges,
//           totalServiceCharge: response.data.totalServiceCharge,
//           totalTax: response.data.totalTax,
//           currency_symbol: response.data.currency_symbol,
//           start_date: response.data.start_date,
//           end_date: response.data.end_date,
//         });
//       } else {
//         alert(response.data.message || "No data found");
//         setData([]);
//         setReportData({});
//       }
//     } catch (error) {
//       console.error("API Error:", error);
//       alert("Failed to fetch data. Check console for details.");
//     }
//     setIsLoading(false);
//   };

//   return (
//     <>
//       <div style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 1040 }}>
//         <MainHeader toggleSidebar={toggleSidebar} />
//       </div>
//       <div className="d-flex">
//         <Sidebar isOpen={isSidebarOpen} />
//         <div
//           className="custom-scroll"
//           style={{
//             marginLeft: isSidebarOpen ? "250px" : "60px",
//             marginTop: "56px",
//             padding: "20px",
//             transition: "margin-left 0.3s ease",
//             width: "100%",
//             height: "calc(100vh - 56px)",
//             overflowY: "auto",
//             background: "#f4f5f7",
//           }}
//         >
//           <div className={styles.page}>
//             <div className={styles.headerRow}>
//               <div className={styles.title}>GST Report</div>
//               <button className={styles.backBtn}>Go Back</button>
//             </div>

//             <div className={styles.formRow}>
//               <div className={styles.formFieldGroup}>
//                 <div>
//                   <label className={styles.formLabel}>Start Date</label>
//                   <input
//                     className={styles.input}
//                     type="date"
//                     value={startDate}
//                     onChange={(e) => setStartDate(e.target.value)}
//                   />
//                 </div>
//                 <div>
//                   <label className={styles.formLabel}>End Date</label>
//                   <input
//                     className={styles.input}
//                     type="date"
//                     value={endDate}
//                     onChange={(e) => setEndDate(e.target.value)}
//                   />
//                 </div>
//               </div>
//               <div className={styles.formBtnGroup}>
//                 <button className={styles.submitBtn} onClick={handleSubmitClick}>
//                   {isLoading ? "Loading..." : "Submit"}
//                 </button>
//                 <button
//                   className={styles.resetBtn}
//                   onClick={() => {
//                     setStartDate("");
//                     setEndDate("");
//                     setData([]);
//                     setReportData({});
//                   }}
//                 >
//                   Reset
//                 </button>
//               </div>
//             </div>

//             <div className={styles.panel}>
//               <div className={styles.panelTopRow}>
//                 <div></div>
//                 <div className={styles.extraBtns}>
//                   <button className={styles.yellowBtn}>Generate PDF</button>
//                   <button className={styles.yellowBtn}>Export to Excel</button>
//                 </div>
//               </div>
//               <div className={styles.reportTitles}>
//                 <div className={styles.panelTitle}>GST Report</div>
//                 <div className={styles.panelSubTitle}>
//                   Report Date: {new Date().toLocaleDateString()}
//                 </div>
//                 <div className={styles.panelDesc}>
//                   Sales date range: {startDate} - {endDate}
//                 </div>
//               </div>

//               <div className={styles.tableWrapper}>
//                 <table className={styles.table}>
//                   <thead>
//                     <tr>
//                       <th>Order Date</th>
//                       <th>Bill No</th>
//                       <th>Status</th>
//                       <th>Subtotal</th>
//                       <th>Discount</th>
//                       <th>Service Charge</th>
//                       <th>Tax</th>
//                       <th>Packaging Charge</th>
//                       <th>Paid Amount</th>
//                     </tr>
//                   </thead>
//                   <tbody>
//                     {data.length === 0 ? (
//                       <tr>
//                         <td colSpan="9" className="text-center">
//                           No data found
//                         </td>
//                       </tr>
//                     ) : (
//                       <>
//                         {data.map((item, index) => (
//                           <tr key={index}>
//                             <td>{item.creation_date_formatted}</td>
//                             <td>
//                               <a href="#" className={styles.billLink}>
//                                 {item.invoice_no}
//                               </a>
//                             </td>
//                             <td>{item.order_status_lable}</td>
//                             <td>Rs.{parseFloat(item.subtotal).toFixed(2)}</td>
//                             <td>Rs.{parseFloat(item.discount).toFixed(2)}</td>
//                             <td>Rs.{parseFloat(item.service_charge).toFixed(2)}</td>
//                             <td>Rs.{parseFloat(item.tax).toFixed(2)}</td>
//                             <td>Rs.{parseFloat(item.packaging_fee).toFixed(2)}</td>
//                             <td>Rs.{parseFloat(item.total).toFixed(2)}</td>
//                           </tr>
//                         ))}
//                         <tr>
//                           <th colSpan={3}>Total</th>
//                           <th>
//                             <p className="mb-0">(Subtotal)</p>
//                             Rs.{reportData.totalSubtotal}
//                           </th>
//                           <th>
//                             <p className="mb-0">(Discount)</p>
//                             Rs.{reportData.totalDiscount}
//                           </th>
//                           <th>
//                             <p className="mb-0">(Service Charge)</p>
//                             Rs.{reportData.totalServiceCharge}
//                           </th>
//                           <th>
//                             <p className="mb-0">(Tax)</p>
//                             Rs.{reportData.totalTax}
//                           </th>
//                           <th>
//                             <p className="mb-0">(Packaging)</p>
//                             Rs.{reportData.totalPackingCharges}
//                           </th>
//                           <th>
//                             <p className="mb-0">(Paid)</p>
//                             Rs.{reportData.totalTotal}
//                           </th>
//                         </tr>
//                       </>
//                     )}
//                   </tbody>
//                 </table>
//               </div>
//             </div>
//           </div>
//         </div>
//       </div>
//     </>
//   );
// }

// export default GstReports;

import React, { useState } from "react";
import axios from "axios";
import MainHeader from "../MainHeader";
import Sidebar from "../Sidebar";
import styles from "./GSTReport.module.css";
import { GetGSTReportURL } from "../../BaseURL/baseURL";
import axiosInstance from "../../utlis/axiosinstance";
import jsPDF from "jspdf";
import "jspdf-autotable";
import * as XLSX from "xlsx";
import { Link } from "react-router-dom";
import Toaster from "../../utlis/Toaster";
import LoadingModal from "../../utlis/LoadingModal";

function GstReports() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [data, setData] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [fullLoader, setFullLoader] =  useState(false);

  const [reportData, setReportData] = useState({
    totalSubtotal: "",
    totalDiscount: "",
    totalTotal: "",
    totalPackingCharges: "",
    totalServiceCharge: "",
    totalTax: "",
    currency_symbol: "",
    start_date: "",
    end_date: "",
  });

  const toggleSidebar = () => {
    setIsSidebarOpen((prev) => !prev);
  };

  const getToday = () => new Date().toISOString().split("T")[0];

  const formatDateRange = (dateStr) => {
    const date = new Date(dateStr);
    return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
  };

  function getCurrentDateFormatted() {
  const today = new Date();
  const day = today.getDate();
  const month = today.getMonth() + 1;
  const year = today.getFullYear();
  return `${day < 10 ? "0" : ""}${day}/${month < 10 ? "0" : ""}${month}/${year}`;
}

function formatDate(inputDate) {
  const [year, month, day] = inputDate.split("-");
  return `${day}/${month}/${year}`;
}


const downloadPdfDocument = () => {
  const doc = new jsPDF();

  const title = "GST Report";
  const reportDate = `Report Date : ${getCurrentDateFormatted()}`;
  const salesRange = `Sales date range: ${formatDate(reportData.start_date)} - ${formatDate(reportData.end_date)}`;

  // Header Text
  doc.setFont("times", "bold");
  doc.setFontSize(14);
  doc.text(title, doc.internal.pageSize.getWidth() / 2, 15, { align: "center" });

  doc.setFontSize(11);
  doc.text(reportDate, doc.internal.pageSize.getWidth() / 2, 22, { align: "center" });
  doc.text(salesRange, doc.internal.pageSize.getWidth() / 2, 28, { align: "center" });

  // Table
  doc.autoTable({
    html: "#pdfContent",
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
      1: { halign: "left", cellWidth: 10 },
      2: { halign: "left", cellWidth: 30},
      3: { halign: "left" },
      4: { halign: "left" },
      5: { halign: "left", cellWidth: 25 }, // STATUS column — widened
      6: { halign: "left", cellWidth: 20 },
      7: { halign: "left" },
    },
    margin: { top: 35, left: 10, right: 10 },
    didParseCell: function (data) {
      if (data.row.section === "body" && data.column.dataKey === 0) {
        data.cell.styles.halign = "left";
      }
    },
  });

  doc.save(
    `GST_Report-${formatDateRange(reportData.start_date)}-${formatDateRange(reportData.end_date)}.pdf`
  );
};




const exportToExcel = () => {
  const tableElt = document.getElementById("pdfContent");

  if (!tableElt) {
    console.error("Table element with id 'pdfContent' not found.");
    return;
  }

  function excelDateToJSDate(serial) {
  // Excel date serial ko JS Date me convert karna
  const utc_days = Math.floor(serial - 25569); // 25569 = 1 Jan 1970
  const utc_value = utc_days * 86400; // seconds
  const date_info = new Date(utc_value * 1000);

  const day = date_info.getDate().toString().padStart(2, "0");
  const month = (date_info.getMonth() + 1).toString().padStart(2, "0");
  const year = date_info.getFullYear();

  return `${day}/${month}/${year}`;
}


  // Extract table data into 2D array
  // const tableData = XLSX.utils.sheet_to_json(
  //   XLSX.utils.table_to_sheet(tableElt),
  //   { header: 1 }
  // );

  const tableData = XLSX.utils.sheet_to_json(
  XLSX.utils.table_to_sheet(tableElt),
  { header: 1 }
).map(row => {
  // Maan lete hain pehli column me order date ka serial number hai
  if (!isNaN(row[0])) {
    row[0] = excelDateToJSDate(row[0]);
  }
  return row;
});


  // Prepare custom header rows
  const title = ["GST Report"];
  const reportDate = [`Report Date: ${getCurrentDateFormatted()}`];
  const salesRange = [`Sales Date Range: ${formatDate(reportData.start_date)} - ${formatDate(reportData.end_date)}`];

  // Combine headers and table data
  const fullData = [
    title,
    reportDate,
    salesRange,
    [], // empty row for spacing
    ...tableData,
  ];

  // Convert array of arrays to sheet
  const worksheet = XLSX.utils.aoa_to_sheet(fullData);

  // Merge title and date rows to span full width (optional but cleaner)
  const colLength = tableData[0]?.length || 10;
  worksheet["!merges"] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: colLength - 1 } }, // GST Report
    { s: { r: 1, c: 0 }, e: { r: 1, c: colLength - 1 } }, // Report Date
    { s: { r: 2, c: 0 }, e: { r: 2, c: colLength - 1 } }, // Sales Date Range
  ];

  // Optional: Adjust column widths
  worksheet["!cols"] = Array(colLength).fill({ wch: 20 });

  // Build workbook
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "GST Report");

  // Save
  XLSX.writeFile(
    workbook,
    `GST_Report-${formatDateRange(reportData.start_date)}-${formatDateRange(reportData.end_date)}.xlsx`
  );
};


  const handleSubmitClick = async (e) => {
    e.preventDefault();

    if (!startDate || new Date(startDate) > new Date(getToday())) {
      Toaster.warning("Please select a start date");
      return;
    }
    if (!endDate || new Date(endDate) > new Date(getToday())) {
      Toaster.warning("Please select a end date");
      return;
    }
    if (new Date(startDate) > new Date(endDate)) {
      Toaster.warning("End Date cannot be before Start Date");
      return;
    }

    setIsLoading(true);
    setFullLoader(true);
    try {
      const response = await axiosInstance.get(GetGSTReportURL, {
        params: { start_date: startDate, end_date: endDate },
      });

      if (response.status === 200 && response.data.data) {
        setData(response.data.data);
        setReportData({
          totalSubtotal: response.data.totalSubtotal,
          totalDiscount: response.data.totalDiscount,
          totalTotal: response.data.totalTotal,
          totalPackingCharges: response.data.totalPackingCharges,
          totalServiceCharge: response.data.totalServiceCharge,
          totalTax: response.data.totalTax,
          currency_symbol: response.data.currency_symbol,
          start_date: response.data.start_date,
          end_date: response.data.end_date,
        });
      } else {
        Toaster.error(response.data.message || "No data found");
        setData([]);
        setReportData({});
      }
    } catch (error) {
      console.error("API Error:", error);
      Toaster.error(error.response.data.message || "Failed to fetch data. Check console for details.");
    } finally{
    setIsLoading(false);
    setFullLoader(false)
    }
  };

  // utils/dateUtils.js
function formatDateDMY(dateString) {
  const date = new Date(dateString);
  const day = date.getDate();
  const month = date.getMonth() + 1; // Months are 0-based
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}


  return (
    <>
      <div style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 1040 }}>
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
          <div className={styles.page}>
            <div className={styles.headerRow}>
              <div className={styles.title}>GST Report</div>
              <Link className={styles.backBtn} to="/reports" style={{textDecoration:"none"}}>Go Back</Link>
            </div>
            
            <div className={styles.cardBox}>
            <div className={styles.formRow}>
              <div className={styles.formFieldGroup}>
                <div>
                  <label className={styles.formLabel}>Start Date</label>
                  <input className={styles.input} type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                </div>
                <div>
                  <label className={styles.formLabel}>End Date</label>
                  <input className={styles.input} type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
                </div>
              </div>
              <div className={styles.formBtnGroup}>
                <button className={styles.submitBtn} onClick={handleSubmitClick}>{isLoading ? "Loading..." : "Submit"}</button>
                <button className={styles.resetBtn} onClick={() => { setStartDate(""); setEndDate(""); setData([]); setReportData({}); }}>Reset</button>
              </div>
            </div>
            </div>

             <LoadingModal isLoading={fullLoader} />

{data.length > 0 && (
            <div className={styles.panel}>
              <div className={styles.panelTopRow}>
                <div></div>
                <div className={styles.extraBtns}>
                  <button className={styles.yellowBtn} onClick={downloadPdfDocument}>Generate PDF</button>
                  <button className={styles.yellowBtn} onClick={exportToExcel}>Export to Excel</button>
                </div>
              </div>
              <div className={styles.reportTitles}>
                <div className={styles.panelTitle}>GST Report</div>
                <div className={styles.panelSubTitle}>Report Date: {new Date().toLocaleDateString()}</div>
                <div className={styles.panelDesc}>Sales date range: {startDate} - {endDate}</div>
              </div>

              <div className={styles.tableWrapper}>
                <table className={styles.table} id="pdfContent">
                  <thead>
                    <tr>
                      <th>Order Date</th>
                      <th>Bill No</th>
                      <th>Status</th>
                      <th>Subtotal</th>
                      <th>Discount</th>
                      <th>Service Charge</th>
                      <th>Tax</th>
                      <th>Packaging Charge</th>
                      <th>Paid Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {/* {data.length === 0 ? (
                      <tr><td colSpan="9" className="text-center">No data found</td></tr>
                    ) : (
                      <>
                        {data.map((item, index) => (
                          <tr key={index}>
                            <td>{item.creation_date_formatted}</td>
                            <td><a href="#" className={styles.billLink}>{item.invoice_no}</a></td>
                            <td>{item.order_status_lable}</td>
                            <td>Rs.{parseFloat(item.subtotal).toFixed(2)}</td>
                            <td>Rs.{parseFloat(item.discount).toFixed(2)}</td>
                            <td>Rs.{parseFloat(item.service_charge).toFixed(2)}</td>
                            <td>Rs.{parseFloat(item.tax).toFixed(2)}</td>
                            <td>Rs.{parseFloat(item.packaging_fee).toFixed(2)}</td>
                            <td>Rs.{parseFloat(item.total).toFixed(2)}</td>
                          </tr>
                        ))}
                       <tr>
  <th colSpan={3}>Total</th>
  <th>
    <div style={{ lineHeight: "1.2", textAlign: "center" }}>
      <div>(Subtotal)</div><br/>
      <div>Rs.{reportData.totalSubtotal}</div>
    </div>
  </th>
  <th>
    <div style={{ lineHeight: "1.2", textAlign: "center" }}>
      <div>(Discount)</div><br/>
      <div>Rs.{reportData.totalDiscount}</div>
    </div>
  </th>
  <th>
    <div style={{ lineHeight: "1.2", textAlign: "center" }}>
      <div>(Service Charge)</div><br/>
      <div>Rs.{reportData.totalServiceCharge}</div>
    </div>
  </th>
  <th>
    <div style={{ lineHeight: "1.2", textAlign: "center" }}>
      <div>(Tax)</div><br/>
      <div>Rs.{reportData.totalTax}</div>
    </div>
  </th>
  <th>
    <div style={{ lineHeight: "1.2", textAlign: "center" }}>
      <div>(Packaging)</div><br/>
      <div>Rs.{reportData.totalPackingCharges}</div>
    </div>
  </th>
  <th>
    <div style={{ lineHeight: "1.2", textAlign: "center" }}>
      <div>(Paid)</div><br/>
      <div>Rs.{reportData.totalTotal}</div>
    </div>
  </th>
</tr>

                      </>
                    )} */}
                    
  <>
    {data.map((item, index) => (
      <tr key={index}>
        {/* <td>{item.creation_date_formatted}</td> */}
       <td>
  {new Date(item.order_date).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  })}
</td>

        <td>{item.invoice_no}</td>
        <td>{item.order_status_lable}</td>
        <td>Rs.{parseFloat(item.subtotal).toFixed(2)}</td>
        <td>Rs.{parseFloat(item.discount).toFixed(2)}</td>
        <td>Rs.{parseFloat(item.service_charge).toFixed(2)}</td>
        <td>Rs.{parseFloat(item.tax).toFixed(2)}</td>
        <td>Rs.{parseFloat(item.packaging_fee).toFixed(2)}</td>
        <td>Rs.{parseFloat(item.total).toFixed(2)}</td>
      </tr>
    ))}
    
    <tr>
      <th colSpan={3}>Total</th>
      <th>
        <div style={{ lineHeight: "1.2", textAlign: "center" }}>
          <div>(Subtotal)</div><br/>
          <div>Rs.{reportData.totalSubtotal}</div>
        </div>
      </th>
      <th>
        <div style={{ lineHeight: "1.2", textAlign: "center" }}>
          <div>(Discount)</div><br/>
          <div>Rs.{reportData.totalDiscount}</div>
        </div>
      </th>
      <th>
        <div style={{ lineHeight: "1.2", textAlign: "center" }}>
          <div>(Service Charge)</div><br/>
          <div>Rs.{reportData.totalServiceCharge}</div>
        </div>
      </th>
      <th>
        <div style={{ lineHeight: "1.2", textAlign: "center" }}>
          <div>(Tax)</div><br/>
          <div>Rs.{reportData.totalTax}</div>
        </div>
      </th>
      <th>
        <div style={{ lineHeight: "1.2", textAlign: "center" }}>
          <div>(Packaging)</div><br/>
          <div>Rs.{reportData.totalPackingCharges}</div>
        </div>
      </th>
      <th>
        <div style={{ lineHeight: "1.2", textAlign: "center" }}>
          <div>(Paid)</div><br/>
          <div>Rs.{reportData.totalTotal}</div>
        </div>
      </th>
    </tr>
  </>


                  </tbody>
                </table>
              </div>
            </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

export default GstReports;

