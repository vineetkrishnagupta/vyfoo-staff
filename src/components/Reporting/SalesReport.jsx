

// import React, { useState, useEffect, useRef } from 'react';
// import MainHeader from '../MainHeader';
// import Sidebar from '../Sidebar';
// import axiosInstance from '../../utlis/axiosinstance';
// import { ReportsDataAPI } from '../../BaseURL/baseURL';

// import Toaster from '../../utlis/Toaster';
// import jsPDF from "jspdf";
// import "jspdf-autotable";
// import * as XLSX from 'xlsx';
// import { Link } from 'react-router-dom';
// import "./salesReport.css";
// import LoadingModal from '../../utlis/LoadingModal';

// function SalesReports() {
//   const [isSidebarOpen, setIsSidebarOpen] = useState(true);
//   const [date, setDate] = useState('');
//   const [reportData, setReportData] = useState(null);
//   const [fullLoader, setFullLoader] = useState(false);
//   const pdfRef = useRef(null);
//   const excelRef = useRef(null);

//   const getToday = () => {
//     const today = new Date();
//     return today.toISOString().split('T')[0];
//   };

//   const formatDate = (dateString) => {
//     return new Date(dateString).toLocaleDateString('en-GB');
//   };

//   const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

//   useEffect(() => {
//     setDate(getToday());
//   }, []);

//   const handleGenerateReport = async () => {
//     if (!date) return Toaster.error("Please select a date");
//     setFullLoader(true);
//     try {
//       const res = await axiosInstance.get(`${ReportsDataAPI}?date=${date}`);
//       if (res.data?.status === 'success') {
//         if (res.data.message?.includes("Data Not Available")) {
//           setReportData(null);
//           Toaster.error(res.data.message);
//         } else {
//           setReportData(res.data);
//           Toaster.success("Report generated successfully");
//         }
//       } else {
//         setReportData(res.data);
//       }
//     } catch (err) {
//       Toaster.error(err?.response?.data?.message || err.message || "Something went wrong");
//       setReportData(null);
//     } finally {
//       setFullLoader(false);
//     }
//   };

//   const handleReset = () => {
//     setDate(getToday());
//     setReportData(null);
//   };



// const downloadPdfDocument = () => {
//   if (!reportData) {
//     Toaster.error("No report data available to generate PDF");
//     return;
//   }

//   try {
//     const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });
//     const pageWidth = doc.internal.pageSize.getWidth();

//     // Blue header
//     const headerHeight = 54;
//     doc.setFillColor("#176ca7");
//     doc.rect(28, 28, pageWidth - 56, headerHeight, "F");

//     // Header: Restaurant Name + subtitle centered, dates right
//    // Title
// doc.setFont("helvetica", "bold");
// doc.setFontSize(16);
// doc.setTextColor(255, 255, 255);
// doc.text(
//   `${localStorage.getItem("restaurantName") || "Lava Pub & Restaurants"} (Daily Sales Report)`,
//   pageWidth / 2,
//   50,
//   { align: "center" }
// );

// // Dates under the title, still centered
// doc.setFont("helvetica", "normal");
// doc.setFontSize(10);
// doc.text(`Downloaded Date: ${formatDate(date)}`, pageWidth / 2, 65, { align: "center" });
// doc.text(`Report's Date: ${formatDate(date)}`, pageWidth / 2, 78, { align: "center" });



//     // Section Vertical Position
//     let y = 95;

//     // Section helper
//     function sectionHeader(txt) {
//       doc.setFontSize(13);
//       doc.setFont("helvetica", "bold");
//       doc.setTextColor(33, 37, 41);
//       doc.text(txt, pageWidth / 2, y, { align: "center" });
//       y += 22;
//     }
//     function keyValueRow(label, value) {
//       doc.setFontSize(11);
//       doc.setFont("helvetica", "normal");
//       doc.setTextColor(33, 37, 41);
//       doc.text(label, 50, y);
//       doc.text(String(value), pageWidth - 70, y, { align: "right" });
//       y += 18;
//     }

//     // SUMMARY
//     sectionHeader("Summary");
//     keyValueRow("Total Sales:", `Rs.${Number(reportData.totalOfAllTotals).toFixed(2)}`);
//     keyValueRow("Total Transactions:", reportData.totalTransaction);
//     keyValueRow("Average Transaction Value:", `Rs.${Number(reportData.average_transation).toFixed(2)}`);
//     keyValueRow("No of Person Served:", reportData.totalEaters);
//     keyValueRow("Aquire Customer:", reportData.totalAquireCustomerCount);

//     y += 10;
//     // SALES BREAKDOWN
//     sectionHeader("Sales Breakdown by Order Types");
//   ["delivery", "dine_in", "take_away"].forEach(type => {
//   const label =
//     type === "dine_in" ? "Dine In" :
//     type === "take_away" ? "Take Away" :
//     "Delivery";
//   keyValueRow(`${label} Total Sales:`, `Rs.${Number(reportData.salesByOrderType?.[type]?.total || 0).toFixed(2)}`);
//   keyValueRow(`${label} Transactions:`, `${reportData.orderTypeCounts?.[type] || 0}`);
//   y += 6;
// });

//     y += 12;

//     // CATEGORY SALES
//     sectionHeader("Category Sales Breakdown");
//     (reportData.menuTotalsArray || []).forEach(menu => {
//       keyValueRow(menu.menu_name + ":", `Rs.${Number(menu.total).toFixed(2)}`);
//     });
//     y += 12;

//     // PAYMENT
//     sectionHeader("Payment Type Breakdown");
//     ["card", "cash", "upi", "neft", "zomato", "swiggy", "dineout"].forEach(method => {
//       keyValueRow(
//         method.charAt(0).toUpperCase() + method.slice(1) + ":",
//         `Rs.${Number(reportData.paymentType?.[method] || 0).toFixed(2)}`
//       );
//     });
//     y += 12;

//     // DISCOUNTS
//     sectionHeader("Discounts");
//     keyValueRow("Total Discount:", `Rs.${Number(reportData.totalDiscount || 0).toFixed(2)}`);

//     y += 12;

//     // SERVICE CHARGE
//     sectionHeader("Service Charge");
//     keyValueRow(
//       "Total Service Charge:",
//       `Rs.${["dine_in", "take_away", "delivery"].reduce(
//         (sum, type) => sum + Number(reportData.salesByOrderType?.[type]?.serviceCharge || 0), 0
//       ).toFixed(2)}`
//     );

//     y += 12;

//     // TAX
//     sectionHeader("Tax");
//     keyValueRow(
//       "Total Taxes:",
//       `Rs.${["dine_in", "take_away", "delivery"].reduce(
//         (sum, type) => sum + Number(reportData.salesByOrderType?.[type]?.tax || 0), 0
//       ).toFixed(2)}`
//     );

//     doc.save(`Daily-Sales-Report-${formatDate(date)}.pdf`);
//     Toaster.success("PDF generated successfully");
//   } catch (error) {
//     Toaster.error("Failed to generate PDF: " + error.message);
//   }
// };

// const exportToExcel = () => {
//   if (!reportData) return Toaster.error("No report data available");

//   try {
//     if (excelRef?.current) excelRef.current.style.display = "block";

//     const table = document.getElementById("excelContent");
//     if (!table) throw new Error("Excel content not found");

//     const firstRow = table.rows[0];
//     if (firstRow) {
//       for (let i = 0; i < firstRow.cells.length; i++) {
//         firstRow.cells[i].style.textAlign = "center";
//       }
//     }

//     const workbook = XLSX.utils.table_to_book(table, { sheet: "Daily Sales Report" });
//     XLSX.writeFile(workbook, `Daily-Sales-Report-${getToday()}.xlsx`);
//     Toaster.success("Excel exported successfully");
//   } catch (err) {
//     Toaster.error("Failed to export Excel: " + err.message);
//   } finally {
//     if (excelRef?.current) excelRef.current.style.display = "none";
//   }
// };



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
//           <div className="srp-main">
//             <div className="srp-header-row">
//               <div>
//                 <h2 className="srp-title">Daily Sales Report</h2>
//                 <p className="srp-desc">
//                   A daily sales report is a record of a business' sales activity for any one day.
//                 </p>
//               </div>
//               <div>
//                 <Link to="/reports" className="srp-back-btn">Go Back</Link>
//               </div>
//             </div>
//             <div className="srp-form-row cardBox">
//               <label className="srp-form-label">Date<span className='text-danger'>*</span></label>
//               <input
//                 type="date"
//                 value={date}
//                 onChange={(e) => setDate(e.target.value)}
//                 className="srp-date-input"
//               />
//               <button
//                 className="srp-main-btn srp-submit"
//                 onClick={handleGenerateReport}
//                 disabled={fullLoader}
//                 style={{ minWidth: 96 }}
//               >
//                 {fullLoader ? "Loading..." : "Submit"}
//               </button>
//               <button className="srp-main-btn srp-reset" onClick={handleReset}>Reset</button>
//             </div>
//               {reportData && (
//             <div className="srp-panel">
//               <div className="srp-panel-head-bar">
//                 <div />
//                 <div className="srp-panel-btns">
//                   <button className="srp-main-btn srp-yellow" onClick={downloadPdfDocument}>Generate PDF</button>
//                   <button className="srp-main-btn srp-yellow" onClick={exportToExcel}>Export to Excel</button>
//                 </div>
//               </div>

//               <div className="srp-report-meta-bar">
//                 <div className="srp-meta-title">
//                   {localStorage.getItem("restaurantName") || "Restaurant"} (Daily Sales Report)
//                 </div>
//                 <div className="srp-meta-date">Report's Date: {date || "--/--/----"}</div>
//               </div>
//               <div className="srp-divider" />
//               <div className="srp-report-data">
              
//                   <ul className="srp-root-ul">
//                     <li>
//                       <b>Summary :</b>
//                       <ul>
//                         <li>Total Sales: ₹{Number(reportData.totalOfAllTotals).toFixed(2)}</li>
//                         <li>Total Transactions: {reportData.totalTransaction}</li>
//                         <li>Average Transaction Value: ₹{Number(reportData.average_transation).toFixed(2)}</li>
//                         <li>No. of Persons Served: {reportData.totalEaters}</li>
//                         <li>Acquired Customers: {reportData.totalAquireCustomerCount}</li>
//                       </ul>
//                     </li>
//                     <li>
//                       <b>Sales Breakdown by Order Types :</b>
//                       <ul>
//                         {["delivery", "dine_in", "take_away"].map((type) => (
//                           <li key={type}>
//                             <b>{type.replace("_", " ").replace(/\b\w/g, (l) => l.toUpperCase())}</b>
//                             <ul>
//                               <li>Total Sales: ₹{Number(reportData.salesByOrderType?.[type]?.total || 0).toFixed(2)}</li>
//                               <li>Transactions: {reportData.orderTypeCounts?.[type] || 0}</li>
//                             </ul>
//                           </li>
//                         ))}
//                       </ul>
//                     </li>
//                     <li>
//                       <b>Category Sales Breakdown :</b>
//                       <ul>
//                         {(reportData.menuTotalsArray || []).map(menu => (
//                           <li key={menu.menu_id}>{menu.menu_name}: ₹{Number(menu.total).toFixed(2)}</li>
//                         ))}
//                       </ul>
//                     </li>
//                     <li>
//                       <b>Payment Type Breakdown :</b>
//                       <ul>
//                         {["card", "cash", "upi", "neft", "zomato", "swiggy", "dineout"].map(method => (
//                           <li key={method}>{method.toUpperCase()}: ₹{Number(reportData.paymentType?.[method] || 0).toFixed(2)}</li>
//                         ))}
//                       </ul>
//                     </li>
//                     <li>
//                       <b>Discounts :</b>
//                       <ul>
//                         <li>Total Discounts: ₹{Number(reportData.totalDiscount || 0).toFixed(2)}</li>
//                       </ul>
//                     </li>
//                     <li>
//                       <b>Service Charge :</b>
//                       <ul>
//                         <li>Total Service Charge: ₹{
//                           ["dine_in", "take_away", "delivery"].reduce((sum, type) => sum + Number(reportData.salesByOrderType?.[type]?.serviceCharge || 0), 0).toFixed(2)}
//                         </li>
//                       </ul>
//                     </li>
//                     <li>
//                       <b>Taxes :</b>
//                       <ul>
//                         <li>Total Tax: ₹{
//                           ["dine_in", "take_away", "delivery"].reduce((sum, type) => sum + Number(reportData.salesByOrderType?.[type]?.tax || 0), 0).toFixed(2)}
//                         </li>
//                       </ul>
//                     </li>
//                   </ul>
             
//               </div>
//             </div>
//                )}
//           </div>
          
//         </div>
//       </div>

//        <LoadingModal isLoading={fullLoader} />
      

//       {/* Hidden Table for PDF */}
//       <div ref={pdfRef} style={{ display: "none" }}>
//         <table id="pdfContent">
//           <tbody>
//             <tr><td><h4>{localStorage.getItem("restaurantName") || "Restaurant"} (Daily Sales Report)</h4></td></tr>
//             <tr><td><h5>Report's Date: {date || "--/--/----"}</h5></td></tr>
//             <tr><td><h6>Total Sales: ₹{Number(reportData?.totalOfAllTotals || 0).toFixed(2)}</h6></td></tr>
//           </tbody>
//         </table>
//       </div>

//       {/* Hidden Table for Excel */}
//  {reportData && (
//   <table id="excelContent" style={{ display: "none" }}>
//     <thead>
//       <tr><th colSpan="2">Summary</th></tr>
//     </thead>
//     <tbody>
//       <tr><td>Total Sales</td><td>{Number(reportData.totalOfAllTotals || 0).toFixed(2)}</td></tr>
//       <tr><td>Total Transactions</td><td>{reportData.totalTransaction}</td></tr>

//       <tr><td colSpan="2"><strong>Sales Breakdown by Order Types</strong></td></tr>
//       <tr><td>Dine In Total Sales</td><td>Rs.{Number(reportData.salesByOrderType?.dine_in?.total || 0).toFixed(2)}</td></tr>
//       <tr><td>Dine In Transactions</td><td>{reportData.orderTypeCounts?.dine_in || 0}</td></tr>

//       <tr><td colSpan="2"><strong>Category Sales Breakdown</strong></td></tr>
//       {(reportData.menuTotalsArray || []).map((item) => (
//         <tr key={item.menu_name}><td>{item.menu_name}</td><td>Rs.{Number(item.total || 0).toFixed(2)}</td></tr>
//       ))}

//       <tr><td colSpan="2"><strong>Payment Type Breakdown</strong></td></tr>
//       {["card", "cash", "upi", "neft", "zomato", "swiggy", "dineout"].map((type) => (
//         <tr key={type}><td>{type.toUpperCase()}</td><td>Rs.{Number(reportData.paymentType?.[type] || 0).toFixed(2)}</td></tr>
//       ))}

//       <tr><td><strong>Total Discount</strong></td> 
//           <td>Rs.{Number(reportData.totalDiscount || 0).toFixed(2)}</td>
//       </tr>

//       <tr><td><strong>Total Service Charge</strong></td>
//           <td>Rs.{["dine_in", "take_away", "delivery"].reduce((sum, type) =>
//             sum + Number(reportData.salesByOrderType?.[type]?.serviceCharge || 0), 0).toFixed(2)}
//           </td>
//       </tr>

//       <tr><td><strong>Total Tax</strong></td>
//           <td>Rs.{["dine_in", "take_away", "delivery"].reduce((sum, type) =>
//             sum + Number(reportData.salesByOrderType?.[type]?.tax || 0), 0).toFixed(2)}
//           </td>
//       </tr>
//     </tbody>
//   </table>
// )}


//     </>
//   );
// }

// export default SalesReports;

// import React, { useState, useEffect, useRef } from 'react';
// import MainHeader from '../MainHeader';
// import Sidebar from '../Sidebar';
// import axiosInstance from '../../utlis/axiosinstance';
// import { ReportsDataAPI } from '../../BaseURL/baseURL';
// import Toaster from '../../utlis/Toaster';
// import jsPDF from "jspdf";
// import "jspdf-autotable";
// import * as XLSX from 'xlsx';
// import { Link } from 'react-router-dom';
// import "./salesReport.css";
// import LoadingModal from '../../utlis/LoadingModal';
// import {getAppDataFromDB} from "../../utlis/indexedDB";

// function SalesReports() {
//   const [isSidebarOpen, setIsSidebarOpen] = useState(true);
//   const [date, setDate] = useState('');
//   const [reportData, setReportData] = useState(null);
//   const [fullLoader, setFullLoader] = useState(false);
//   const [foodeName, setFooderName] = useState("");
//   const pdfRef = useRef(null);
//   const excelRef = useRef(null);

//   const getToday = () => {
//     const today = new Date();
//     return today.toISOString().split('T')[0];
//   };

//   const formatDate = (dateString) => {
//     return new Date(dateString).toLocaleDateString('en-GB');
//   };

//   const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

//   useEffect(() => {
//     setDate(getToday());
//   }, []);

//    useEffect(() => {
//          let isMounted = true;
//          let retryCount = 0;
//          const maxRetries = 5;
//          const retryDelay = 1000; // 1 second
       
//          const fetchAppData = async () => {
//            try {
//              const appData = await getAppDataFromDB();
//              if (appData && isMounted) {
//               setFooderName(appData.fooder_name);
//            setStaffType(appData.staff_type);
//            setStaffName(appData.staff_name);
             
//                console.log("App Data from IndexedDB:", appData);
//              } else if (!appData && retryCount < maxRetries && isMounted) {
             
//                retryCount++;
//                console.log(`Retrying to fetch app data (${retryCount}/${maxRetries})...`);
//                setTimeout(fetchAppData, retryDelay);
//              }
//            } catch (err) {
//              console.error("Failed to fetch app data from IndexedDB:", err);
//              // Retry on error as well
//              if (retryCount < maxRetries && isMounted) {
//                retryCount++;
//                setTimeout(fetchAppData, retryDelay);
//              }
//            }
//          };
     
//          fetchAppData();
     
//          // Also listen for custom events when IndexedDB data changes
//          const handleIndexedDBUpdate = (event) => {
//            if (isMounted) {
//              const appData = event.detail;
//              if (appData) {
//                setAppPermission(appData.app_permission);
//                setKotitemsdelete(appData.kot_items_delete);
//                setRoundOffAmountDB(appData.round_off_amount);
//                setStaffType(appData.staff_type);
//                console.log("App Data updated via event:", appData);
//              }
//            }
//          };
     
//          window.addEventListener('indexedDBUpdated', handleIndexedDBUpdate);
         
//          // Cleanup
//          return () => {
//            isMounted = false;
//            window.removeEventListener('indexedDBUpdated', handleIndexedDBUpdate);
//          };
//        }, []);

//   const handleGenerateReport = async () => {
//     if (!date) return Toaster.error("Please select a date");
//     setFullLoader(true);
//     try {
//       const res = await axiosInstance.get(`${ReportsDataAPI}?date=${date}`);
//       if (res.data?.status === 'success') {
//         if (res.data.message?.includes("Data Not Available")) {
//           setReportData(null);
//           Toaster.error(res.data.message);
//         } else {
//           setReportData(res.data);
//           Toaster.success("Report generated successfully");
//         }
//       } else {
//         setReportData(res.data);
//       }
//     } catch (err) {
//       Toaster.error(err?.response?.data?.message || err.message || "Something went wrong");
//       setReportData(null);
//     } finally {
//       setFullLoader(false);
//     }
//   };

//   const handleReset = () => {
//     setDate(getToday());
//     setReportData(null);
//   };

//   const downloadPdfDocument = () => {
//     if (!reportData) {
//       Toaster.error("No report data available to generate PDF");
//       return;
//     }

//     try {
//       const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });
//       const pageWidth = doc.internal.pageSize.getWidth();

//       // Blue header
//       const headerHeight = 54;
//       doc.setFillColor("#176ca7");
//       doc.rect(28, 28, pageWidth - 56, headerHeight, "F");

//       // Header: Restaurant Name + subtitle centered, dates right
//       doc.setFont("helvetica", "bold");
//       doc.setFontSize(16);
//       doc.setTextColor(255, 255, 255);
//       doc.text(
//         `${foodeName || ""} (Daily Sales Report)`,
//         pageWidth / 2,
//         50,
//         { align: "center" }
//       );

//       // Dates under the title, still centered
//       doc.setFont("helvetica", "normal");
//       doc.setFontSize(10);
//       doc.text(`Downloaded Date: ${formatDate(date)}`, pageWidth / 2, 65, { align: "center" });
//       doc.text(`Report's Date: ${formatDate(date)}`, pageWidth / 2, 78, { align: "center" });

//       // Section Vertical Position
//       let y = 95;

//       // Section helper
//       function sectionHeader(txt) {
        
//         doc.setFontSize(13);
//         doc.setFont("helvetica", "bold");
//         doc.setTextColor(33, 37, 41);
//         doc.text(txt, pageWidth / 2, y, { align: "center" });
//         y += 22;
//       }
//       function keyValueRow(label, value) {
//           const pageHeight = doc.internal.pageSize.getHeight();
//   const bottomMargin = 40;

//   if (y + 20 > pageHeight - bottomMargin) {
//     doc.addPage();
//     y = 40; // Reset y for the new page
//   }
//         doc.setFontSize(11);
//         doc.setFont("helvetica", "normal");
//         doc.setTextColor(33, 37, 41);
//         doc.text(label, 50, y);
//         doc.text(String(value), pageWidth - 70, y, { align: "right" });
//         y += 18;
//       }

//       // SUMMARY
//       sectionHeader("Summary");
//       keyValueRow("Total Sales:", `Rs.${Number(reportData.totalOfAllTotals).toFixed(2)}`);
//       keyValueRow("Net Sales:", `Rs.${Number(reportData.net_sells).toFixed(2)}`);
//       keyValueRow("Total Transactions:", reportData.totalTransaction);
//       keyValueRow("Average Transaction Value:", `Rs.${Number(reportData.average_transation).toFixed(2)}`);
//       keyValueRow("No of Person Served:", reportData.totalEaters);
//       keyValueRow("Aquire Customer:", reportData.totalAquireCustomerCount);

//       y += 10;
//       // SALES BREAKDOWN
//       sectionHeader("Sales Breakdown by Order Types");
//       ["delivery", "dine_in", "take_away"].forEach(type => {
//         const label =
//           type === "dine_in" ? "Dine In" :
//           type === "take_away" ? "Take Away" :
//           "Delivery";
//         keyValueRow(`${label} Total Sales:`, `Rs.${Number(reportData.salesByOrderType?.[type]?.total || 0).toFixed(2)}`);
//         keyValueRow(`${label} Transactions:`, `${reportData.orderTypeCounts?.[type] || 0}`);
//         y += 6;
//       });

//       y += 12;

//       // MAIN CATEGORY BREAKDOWN
//       sectionHeader("Main Category Breakdown");
//       (reportData.mainCategoryReport || []).forEach(category => {
//         keyValueRow(`${category.main_category_name}:`, `Rs.${Number(category.total || 0).toFixed(2)}`);
//         y += 6;
//         keyValueRow(`- Subtotal:`, `Rs.${Number(category.subtotal || 0).toFixed(2)}`);
//         y += 6;
//         keyValueRow(`- Discount:`, `Rs.${Number(category.discount || 0).toFixed(2)}`);
//         y += 6;
//       });

//       y += 12;

//       // CATEGORY SALES
//       sectionHeader("Menu Items Breakdown");
//       (reportData.menuTotalsArray || []).forEach(menu => {
//         keyValueRow(menu.menu_name + ":", `Rs.${Number(menu.total).toFixed(2)}`);
//       });
//       y += 12;

//       // PAYMENT
//       sectionHeader("Payment Type Breakdown");
//       ["card", "cash", "upi", "neft", "zomato", "swiggy", "dineout"].forEach(method => {
//         keyValueRow(
//           method.charAt(0).toUpperCase() + method.slice(1) + ":",
//           `Rs.${Number(reportData.paymentType?.[method] || 0).toFixed(2)}`
//         );
//       });
//       y += 12;

//       // DISCOUNTS
//       sectionHeader("Discounts");
//       keyValueRow("Total Discount:", `Rs.${Number(reportData.totalDiscount || 0).toFixed(2)}`);

//       y += 12;

//       // SERVICE CHARGE
//       sectionHeader("Service Charge");
//       keyValueRow(
//         "Total Service Charge:",
//         `Rs.${["dine_in", "take_away", "delivery"].reduce(
//           (sum, type) => sum + Number(reportData.salesByOrderType?.[type]?.serviceCharge || 0), 0
//         ).toFixed(2)}`
//       );

//       y += 12;

//       // TAX
//       sectionHeader("Tax");
//       keyValueRow(
//         "Total Taxes:",
//         `Rs.${["dine_in", "take_away", "delivery"].reduce(
//           (sum, type) => sum + Number(reportData.salesByOrderType?.[type]?.tax || 0), 0
//         ).toFixed(2)}`
//       );

//       doc.save(`Daily-Sales-Report-${formatDate(date)}.pdf`);
//       Toaster.success("PDF generated successfully");
//     } catch (error) {
//       Toaster.error("Failed to generate PDF: " + error.message);
//     }
//   };

//   const exportToExcel = () => {
//     if (!reportData) return Toaster.error("No report data available");

//     try {
//       if (excelRef?.current) excelRef.current.style.display = "block";

//       const table = document.getElementById("excelContent");
//       if (!table) throw new Error("Excel content not found");

//       const firstRow = table.rows[0];
//       if (firstRow) {
//         for (let i = 0; i < firstRow.cells.length; i++) {
//           firstRow.cells[i].style.textAlign = "center";
//         }
//       }

//       const workbook = XLSX.utils.table_to_book(table, { sheet: "Daily Sales Report" });
//       XLSX.writeFile(workbook, `Daily-Sales-Report-${getToday()}.xlsx`);
//       Toaster.success("Excel exported successfully");
//     } catch (err) {
//       Toaster.error("Failed to export Excel: " + err.message);
//     } finally {
//       if (excelRef?.current) excelRef.current.style.display = "none";
//     }
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
//           <div className="srp-main">
//             <div className="srp-header-row">
//               <div>
//                 <h2 className="srp-title">Daily Sales Report</h2>
//                 <p className="srp-desc">
//                   A daily sales report is a record of a business' sales activity for any one day.
//                 </p>
//               </div>
//               <div>
//                 <Link to="/reports" className="srp-back-btn">Go Back</Link>
//               </div>
//             </div>
//             <div className="srp-form-row cardBox">
//               <label className="srp-form-label">Date<span className='text-danger'>*</span></label>
//               <input
//                 type="date"
//                 value={date}
//                 onChange={(e) => setDate(e.target.value)}
//                 className="srp-date-input"
//               />
//               <button
//                 className="srp-main-btn srp-submit"
//                 onClick={handleGenerateReport}
//                 disabled={fullLoader}
//                 style={{ minWidth: 96 }}
//               >
//                 {fullLoader ? "Loading..." : "Submit"}
//               </button>
//               <button className="srp-main-btn srp-reset" onClick={handleReset}>Reset</button>
//             </div>
//             {reportData && (
//               <div className="srp-panel">
//                 <div className="srp-panel-head-bar">
//                   <div />
//                   <div className="srp-panel-btns">
//                     <button className="srp-main-btn srp-yellow" onClick={downloadPdfDocument}>Generate PDF</button>
//                     <button className="srp-main-btn srp-yellow" onClick={exportToExcel}>Export to Excel</button>
//                   </div>
//                 </div>

//                 <div className="srp-report-meta-bar">
//                   <div className="srp-meta-title">
//                     {foodeName || ""} (Daily Sales Report)
//                   </div>
//                   <div className="srp-meta-date">Report's Date: {date || "--/--/----"}</div>
//                 </div>
//                 <div className="srp-divider" />
//                 <div className="srp-report-data">
//                   <ul className="srp-root-ul">
//                     <li>
//                       <b>Summary :</b>
//                       <ul>
//                         <li >Total Sales: ₹{Number(reportData.totalOfAllTotals).toFixed(2)}</li>
//                         <li>Net Sales: ₹{Number(reportData.net_sells).toFixed(2)}</li>
//                         <li>Total Transactions: {reportData.totalTransaction}</li>
//                         <li>Average Transaction Value: ₹{Number(reportData.average_transation).toFixed(2)}</li>
//                         <li>No. of Persons Served: {reportData.totalEaters}</li>
//                         <li>Acquired Customers: {reportData.totalAquireCustomerCount}</li>
//                       </ul>
//                     </li>
//                     <li>
//                       <b>Sales Breakdown by Order Types :</b>
//                       <ul>
//                         {["delivery", "dine_in", "take_away"].map((type) => (
//                           <li key={type}>
//                             <b>{type.replace("_", " ").replace(/\b\w/g, (l) => l.toUpperCase())}</b>
//                             <ul>
//                               <li>Total Sales: ₹{Number(reportData.salesByOrderType?.[type]?.total || 0).toFixed(2)}</li>
//                               <li>Transactions: {reportData.orderTypeCounts?.[type] || 0}</li>
//                             </ul>
//                           </li>
//                         ))}
//                       </ul>
//                     </li>
//                     <li>
//                       <b>Main Category Breakdown :</b>
//                       <ul>
//                         {(reportData.mainCategoryReport || []).map(category => (
//                           <li key={category.main_category_id}>
//                             <b>{category.main_category_name}</b>
//                             <ul>
//                               <li>Subtotal: ₹{Number(category.subtotal || 0).toFixed(2)}</li>
//                               <li>Discount: ₹{Number(category.discount || 0).toFixed(2)}</li>
//                               <li>Total: ₹{Number(category.total || 0).toFixed(2)}</li>
//                             </ul>
//                           </li>
//                         ))}
//                       </ul>
//                     </li>
//                     <li>
//                       <b>Menu Items Breakdown :</b>
//                       <ul>
//                         {(reportData.menuTotalsArray || []).map(menu => (
//                           <li key={menu.menu_id}>{menu.menu_name}: ₹{Number(menu.total).toFixed(2)}</li>
//                         ))}
//                       </ul>
//                     </li>
//                     <li>
//                       <b>Payment Type Breakdown :</b>
//                       <ul>
//                         {["card", "cash", "upi", "neft", "zomato", "swiggy", "dineout"].map(method => (
//                           <li key={method}>{method.toUpperCase()}: ₹{Number(reportData.paymentType?.[method] || 0).toFixed(2)}</li>
//                         ))}
//                       </ul>
//                     </li>
//                     <li>
//                       <b>Discounts :</b>
//                       <ul>
//                         <li>Total Discounts: ₹{Number(reportData.totalDiscount || 0).toFixed(2)}</li>
//                       </ul>
//                     </li>
//                     <li>
//                       <b>Service Charge :</b>
//                       <ul>
//                         <li>Total Service Charge: ₹{
//                           ["dine_in", "take_away", "delivery"].reduce((sum, type) => sum + Number(reportData.salesByOrderType?.[type]?.serviceCharge || 0), 0).toFixed(2)}
//                         </li>
//                       </ul>
//                     </li>
//                     <li>
//                       <b>Taxes :</b>
//                       <ul>
//                         <li>Total Tax: ₹{
//                           ["dine_in", "take_away", "delivery"].reduce((sum, type) => sum + Number(reportData.salesByOrderType?.[type]?.tax || 0), 0).toFixed(2)}
//                         </li>
//                       </ul>
//                     </li>
//                   </ul>
//                 </div>
//               </div>
//             )}
//           </div>
//         </div>
//       </div>

//       <LoadingModal isLoading={fullLoader} />

//       {/* Hidden Table for PDF */}
//       <div ref={pdfRef} style={{ display: "none" }}>
//         <table id="pdfContent">
//           <tbody>
//             <tr><td><h4>{foodeName || ""} (Daily Sales Report)</h4></td></tr>
//             <tr><td><h5>Report's Date: {date || "--/--/----"}</h5></td></tr>
//             <tr><td><h6>Total Sales: ₹{Number(reportData?.totalOfAllTotals || 0).toFixed(2)}</h6></td></tr>
//           </tbody>
//         </table>
//       </div>

//       {/* Hidden Table for Excel */}
//       {reportData && (
//         <table id="excelContent" style={{ display: "none" }}>
//           <thead>
//             <tr><th colSpan="2">Summary</th></tr>
//           </thead>
//           <tbody>
//             <tr><td>Total Sales</td><td>₹{Number(reportData.totalOfAllTotals || 0).toFixed(2)}</td></tr>
//             <tr><td>Net Sales</td><td>₹{Number(reportData.net_sells || 0).toFixed(2)}</td></tr>
//             <tr><td>Total Transactions</td><td>{reportData.totalTransaction}</td></tr>

//             <tr><td colSpan="2"><strong>Sales Breakdown by Order Types</strong></td></tr>
//             <tr><td>Dine In Total Sales</td><td>₹{Number(reportData.salesByOrderType?.dine_in?.total || 0).toFixed(2)}</td></tr>
//             <tr><td>Dine In Transactions</td><td>{reportData.orderTypeCounts?.dine_in || 0}</td></tr>

//             <tr><td colSpan="2"><strong>Main Category Breakdown</strong></td></tr>
//             {(reportData.mainCategoryReport || []).map((category) => (
//               <>
//                 <tr key={category.main_category_id}>
//                   <td>{category.main_category_name}</td>
//                   <td>₹{Number(category.total || 0).toFixed(2)}</td>
//                 </tr>
//                 <tr>
//                   <td>- Subtotal</td>
//                   <td>₹{Number(category.subtotal || 0).toFixed(2)}</td>
//                 </tr>
//                 <tr>
//                   <td>- Discount</td>
//                   <td>₹{Number(category.discount || 0).toFixed(2)}</td>
//                 </tr>
//               </>
//             ))}

//             <tr><td colSpan="2"><strong>Menu Items Breakdown</strong></td></tr>
//             {(reportData.menuTotalsArray || []).map((item) => (
//               <tr key={item.menu_name}><td>{item.menu_name}</td><td>₹{Number(item.total || 0).toFixed(2)}</td></tr>
//             ))}

//             <tr><td colSpan="2"><strong>Payment Type Breakdown</strong></td></tr>
//             {["card", "cash", "upi", "neft", "zomato", "swiggy", "dineout"].map((type) => (
//               <tr key={type}><td>{type.toUpperCase()}</td><td>₹{Number(reportData.paymentType?.[type] || 0).toFixed(2)}</td></tr>
//             ))}

//             <tr><td><strong>Total Discount</strong></td> 
//                 <td>₹{Number(reportData.totalDiscount || 0).toFixed(2)}</td>
//             </tr>

//             <tr><td><strong>Total Service Charge</strong></td>
//                 <td>₹{["dine_in", "take_away", "delivery"].reduce((sum, type) =>
//                   sum + Number(reportData.salesByOrderType?.[type]?.serviceCharge || 0), 0).toFixed(2)}
//                 </td>
//             </tr>

//             <tr><td><strong>Total Tax</strong></td>
//                 <td>₹{["dine_in", "take_away", "delivery"].reduce((sum, type) =>
//                   sum + Number(reportData.salesByOrderType?.[type]?.tax || 0), 0).toFixed(2)}
//                 </td>
//             </tr>
//           </tbody>
//         </table>
//       )}
//     </>
//   );
// }

// export default SalesReports;




import React, { useState, useEffect, useRef } from 'react';
import MainHeader from '../MainHeader';
import Sidebar from '../Sidebar';
import axiosInstance from '../../utlis/axiosinstance';
import { ReportsDataAPI } from '../../BaseURL/baseURL';
import Toaster from '../../utlis/Toaster';
import jsPDF from "jspdf";
import "jspdf-autotable";
import * as XLSX from 'xlsx';
import { Link } from 'react-router-dom';
import "./salesReport.css";
import LoadingModal from '../../utlis/LoadingModal';
import {getAppDataFromDB} from "../../utlis/indexedDB";

function SalesReports() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [date, setDate] = useState('');
  const [reportData, setReportData] = useState(null);
  const [fullLoader, setFullLoader] = useState(false);
  const [foodeName, setFooderName] = useState("");
  const [staffType, setStaffType] = useState("");
  const [staffName, setStaffName] = useState("");
  const pdfRef = useRef(null);
  const excelRef = useRef(null);

  const getToday = () => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-GB');
  };

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

  useEffect(() => {
    setDate(getToday());
  }, []);

  useEffect(() => {
    let isMounted = true;
    let retryCount = 0;
    const maxRetries = 5;
    const retryDelay = 1000;

    const fetchAppData = async () => {
      try {
        const appData = await getAppDataFromDB();
        if (appData && isMounted) {
          setFooderName(appData.fooder_name);
          setStaffType(appData.staff_type);
          setStaffName(appData.staff_name);
        } else if (!appData && retryCount < maxRetries && isMounted) {
          retryCount++;
          setTimeout(fetchAppData, retryDelay);
        }
      } catch (err) {
        console.error("Failed to fetch app data:", err);
        if (retryCount < maxRetries && isMounted) {
          retryCount++;
          setTimeout(fetchAppData, retryDelay);
        }
      }
    };

    fetchAppData();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleGenerateReport = async () => {
    if (!date) return Toaster.error("Please select a date");
    setFullLoader(true);
    try {
      const res = await axiosInstance.get(`${ReportsDataAPI}?date=${date}`);
      if (res.data?.status === 'success') {
        if (res.data.message?.includes("Data Not Available")) {
          setReportData(null);
          Toaster.error(res.data.message);
        } else {
          setReportData(res.data);
          Toaster.success("Report generated successfully");
        }
      } else {
        setReportData(res.data);
      }
    } catch (err) {
      Toaster.error(err?.response?.data?.message || err.message || "Something went wrong");
      setReportData(null);
    } finally {
      setFullLoader(false);
    }
  };

  const handleReset = () => {
    setDate(getToday());
    setReportData(null);
  };

  const calculateTotalDiscount = () => {
    if (!reportData?.salesByOrderType) return 0;
    return ["dine_in", "delivery", "take_away"].reduce(
      (sum, type) => sum + Number(reportData.salesByOrderType[type]?.discount || 0),
      0
    );
  };

  const downloadPdfDocument = () => {
    if (!reportData) {
      Toaster.error("No report data available to generate PDF");
      return;
    }

    const totalDiscount = calculateTotalDiscount();

    try {
      const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });
      const pageWidth = doc.internal.pageSize.getWidth();

      // Header
      doc.setFillColor("#176ca7");
      doc.rect(28, 28, pageWidth - 56, 54, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(16);
      doc.setTextColor(255, 255, 255);
      doc.text(`${foodeName || ""} (Daily Sales Report)`, pageWidth / 2, 50, { align: "center" });
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.text(`Downloaded Date: ${formatDate(date)}`, pageWidth / 2, 65, { align: "center" });
      doc.text(`Report's Date: ${formatDate(date)}`, pageWidth / 2, 78, { align: "center" });

      let y = 95;

      function sectionHeader(txt) {
        doc.setFontSize(13);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(33, 37, 41);
        doc.text(txt, pageWidth / 2, y, { align: "center" });
        y += 22;
      }

      function keyValueRow(label, value) {
        const pageHeight = doc.internal.pageSize.getHeight();
        const bottomMargin = 40;
        if (y + 20 > pageHeight - bottomMargin) {
          doc.addPage();
          y = 40;
        }
        doc.setFontSize(11);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(33, 37, 41);
        doc.text(label, 50, y);
        doc.text(String(value), pageWidth - 70, y, { align: "right" });
        y += 18;
      }

      // Summary
      sectionHeader("Summary");
      keyValueRow("Total Sales:", `Rs.${Number(reportData.totalOfAllTotals).toFixed(2)}`);
      keyValueRow("Net Sales:", `Rs.${Number(reportData.net_sells).toFixed(2)}`);
      keyValueRow("Total Transactions:", reportData.totalTransaction);
      keyValueRow("Average Transaction Value:", `Rs.${Number(reportData.average_transation).toFixed(2)}`);
      keyValueRow("No of Person Served:", reportData.totalEaters);
      keyValueRow("Aquire Customer:", reportData.totalAquireCustomerCount);

      y += 10;
      
      // Sales Breakdown
      sectionHeader("Sales Breakdown by Order Types");
      ["dine_in", "delivery", "take_away"].forEach(type => {
        const label = type === "dine_in" ? "Dine In" : type === "take_away" ? "Take Away" : "Delivery";
        keyValueRow(`${label} Total Sales:`, `Rs.${Number(reportData.salesByOrderType?.[type]?.total || 0).toFixed(2)}`);
        keyValueRow(`${label} Transactions:`, `${reportData.orderTypeCounts?.[type] || 0}`);
        y += 6;
      });

      y += 12;

      // Main Category Breakdown
      sectionHeader("Main Category Breakdown");
      (reportData.mainCategoryReport || []).forEach(category => {
        keyValueRow(`${category.main_category_name}:`, `Rs.${Number(category.total || 0).toFixed(2)}`);
        y += 6;
        keyValueRow(`- Subtotal:`, `Rs.${Number(category.subtotal || 0).toFixed(2)}`);
        y += 6;
        keyValueRow(`- Discount:`, `Rs.${Number(category.discount || 0).toFixed(2)}`);
        y += 6;
      });

      y += 12;

      // Menu Items Breakdown
      sectionHeader("Menu Items Breakdown");
      (reportData.menuTotalsArray || []).forEach(menu => {
        keyValueRow(menu.menu_name + ":", `Rs.${Number(menu.total).toFixed(2)}`);
      });
      y += 12;

      // Payment Breakdown
      sectionHeader("Payment Type Breakdown");
      ["card", "cash", "upi", "neft", "zomato", "swiggy", "dineout"].forEach(method => {
        keyValueRow(
          method.charAt(0).toUpperCase() + method.slice(1) + ":",
          `Rs.${Number(reportData.paymentType?.[method] || 0).toFixed(2)}`
        );
      });
      y += 12;

      // Discounts
      sectionHeader("Discounts");
      keyValueRow("Total Discount:", `Rs.${totalDiscount.toFixed(2)}`);

      y += 12;

      // Service Charge
      sectionHeader("Service Charge");
      keyValueRow(
        "Total Service Charge:",
        `Rs.${["dine_in", "take_away", "delivery"].reduce(
          (sum, type) => sum + Number(reportData.salesByOrderType?.[type]?.serviceCharge || 0), 0
        ).toFixed(2)}`
      );

      y += 12;

      // Tax
      sectionHeader("Tax");
      keyValueRow(
        "Total Taxes:",
        `Rs.${["dine_in", "take_away", "delivery"].reduce(
          (sum, type) => sum + Number(reportData.salesByOrderType?.[type]?.tax || 0), 0
        ).toFixed(2)}`
      );

      doc.save(`Daily-Sales-Report-${formatDate(date)}.pdf`);
      Toaster.success("PDF generated successfully");
    } catch (error) {
      Toaster.error("Failed to generate PDF: " + error.message);
    }
  };

  const exportToExcel = () => {
    if (!reportData) return Toaster.error("No report data available");

    const totalDiscount = calculateTotalDiscount();

    try {
      if (excelRef?.current) excelRef.current.style.display = "block";

      const table = document.getElementById("excelContent");
      if (!table) throw new Error("Excel content not found");

      const workbook = XLSX.utils.table_to_book(table, { sheet: "Daily Sales Report" });
      XLSX.writeFile(workbook, `Daily-Sales-Report-${getToday()}.xlsx`);
      Toaster.success("Excel exported successfully");
    } catch (err) {
      Toaster.error("Failed to export Excel: " + err.message);
    } finally {
      if (excelRef?.current) excelRef.current.style.display = "none";
    }
  };

  const totalDiscount = reportData ? calculateTotalDiscount() : 0;

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
          <div className="srp-main">
            <div className="srp-header-row">
              <div>
                <h2 className="srp-title">Daily Sales Report</h2>
                <p className="srp-desc">
                  A daily sales report is a record of a business' sales activity for any one day.
                </p>
              </div>
              <div>
                <Link to="/reports" className="srp-back-btn">Go Back</Link>
              </div>
            </div>
            <div className="srp-form-row cardBox">
              <label className="srp-form-label">Date<span className='text-danger'>*</span></label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="srp-date-input"
              />
              <button
                className="srp-main-btn srp-submit"
                onClick={handleGenerateReport}
                disabled={fullLoader}
                style={{ minWidth: 96 }}
              >
                {fullLoader ? "Loading..." : "Submit"}
              </button>
              <button className="srp-main-btn srp-reset" onClick={handleReset}>Reset</button>
            </div>
            {reportData && (
              <div className="srp-panel">
                <div className="srp-panel-head-bar">
                  <div />
                  <div className="srp-panel-btns">
                    <button className="srp-main-btn srp-yellow" onClick={downloadPdfDocument}>Generate PDF</button>
                    <button className="srp-main-btn srp-yellow" onClick={exportToExcel}>Export to Excel</button>
                  </div>
                </div>

                <div className="srp-report-meta-bar">
                  <div className="srp-meta-title">
                    {foodeName || ""} (Daily Sales Report)
                  </div>
                  <div className="srp-meta-date">Report's Date: {date || "--/--/----"}</div>
                </div>
                <div className="srp-divider" />
                <div className="srp-report-data">
                  <ul className="srp-root-ul">
                    <li>
                      <b>Summary :</b>
                      <ul>
                        <li>Total Sales: ₹{Number(reportData.totalOfAllTotals).toFixed(2)}</li>
                        <li>Net Sales: ₹{Number(reportData.net_sells).toFixed(2)}</li>
                        <li>Total Transactions: {reportData.totalTransaction}</li>
                        <li>Average Transaction Value: ₹{Number(reportData.average_transation).toFixed(2)}</li>
                        <li>No. of Persons Served: {reportData.totalEaters}</li>
                        <li>Acquired Customers: {reportData.totalAquireCustomerCount}</li>
                      </ul>
                    </li>
                    <li>
                      <b>Sales Breakdown by Order Types :</b>
                      <ul>
                        {["dine_in", "delivery", "take_away"].map((type) => (
                          <li key={type}>
                            <b>{type.replace("_", " ").replace(/\b\w/g, (l) => l.toUpperCase())}</b>
                            <ul>
                              <li>Total Sales: ₹{Number(reportData.salesByOrderType?.[type]?.total || 0).toFixed(2)}</li>
                              <li>Transactions: {reportData.orderTypeCounts?.[type] || 0}</li>
                              <li>Discount: ₹{Number(reportData.salesByOrderType?.[type]?.discount || 0).toFixed(2)}</li>
                            </ul>
                          </li>
                        ))}
                      </ul>
                    </li>
                    <li>
                      <b>Main Category Breakdown :</b>
                      <ul>
                        {(reportData.mainCategoryReport || []).map(category => (
                          <li key={category.main_category_id}>
                            <b>{category.main_category_name}</b>
                            <ul>
                              <li>Subtotal: ₹{Number(category.subtotal || 0).toFixed(2)}</li>
                              <li>Discount: ₹{Number(category.discount || 0).toFixed(2)}</li>
                              <li>Total: ₹{Number(category.total || 0).toFixed(2)}</li>
                            </ul>
                          </li>
                        ))}
                      </ul>
                    </li>
                    <li>
                      <b>Menu Items Breakdown :</b>
                      <ul>
                        {(reportData.menuTotalsArray || []).map(menu => (
                          <li key={menu.menu_id}>{menu.menu_name}: ₹{Number(menu.total).toFixed(2)}</li>
                        ))}
                      </ul>
                    </li>
                    <li>
                      <b>Payment Type Breakdown :</b>
                      <ul>
                        {["card", "cash", "upi", "neft", "zomato", "swiggy", "dineout"].map(method => (
                          <li key={method}>{method.toUpperCase()}: ₹{Number(reportData.paymentType?.[method] || 0).toFixed(2)}</li>
                        ))}
                      </ul>
                    </li>
                    <li>
                      <b>Discounts :</b>
                      <ul>
                        <li>Total Discounts: ₹{totalDiscount.toFixed(2)}</li>
                      </ul>
                    </li>
                    <li>
                      <b>Service Charge :</b>
                      <ul>
                        <li>Total Service Charge: ₹{
                          ["dine_in", "take_away", "delivery"].reduce((sum, type) => sum + Number(reportData.salesByOrderType?.[type]?.serviceCharge || 0), 0).toFixed(2)}
                        </li>
                      </ul>
                    </li>
                    <li>
                      <b>Taxes :</b>
                      <ul>
                        <li>Total Tax: ₹{
                          ["dine_in", "take_away", "delivery"].reduce((sum, type) => sum + Number(reportData.salesByOrderType?.[type]?.tax || 0), 0).toFixed(2)}
                        </li>
                      </ul>
                    </li>
                  </ul>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <LoadingModal isLoading={fullLoader} />

      {/* Hidden Table for Excel */}
      {reportData && (
        <table id="excelContent" style={{ display: "none" }}>
          <thead>
            <tr><th colSpan="2">{foodeName || ""} (Daily Sales Report)</th></tr>
            <tr><th colSpan="2">Report Date: {date || "--/--/----"}</th></tr>
            <tr><th colSpan="2">Summary</th></tr>
          </thead>
          <tbody>
            <tr><td>Total Sales</td><td>₹{Number(reportData.totalOfAllTotals || 0).toFixed(2)}</td></tr>
            <tr><td>Net Sales</td><td>₹{Number(reportData.net_sells || 0).toFixed(2)}</td></tr>
            <tr><td>Total Transactions</td><td>{reportData.totalTransaction}</td></tr>

            <tr><td colSpan="2"><strong>Sales Breakdown by Order Types</strong></td></tr>
            {["dine_in", "delivery", "take_away"].map(type => (
              <React.Fragment key={type}>
                <tr>
                  <td>{type.replace("_", " ").replace(/\b\w/g, l => l.toUpperCase())} Total Sales</td>
                  <td>₹{Number(reportData.salesByOrderType?.[type]?.total || 0).toFixed(2)}</td>
                </tr>
                <tr>
                  <td>{type.replace("_", " ").replace(/\b\w/g, l => l.toUpperCase())} Transactions</td>
                  <td>{reportData.orderTypeCounts?.[type] || 0}</td>
                </tr>
                <tr>
                  <td>{type.replace("_", " ").replace(/\b\w/g, l => l.toUpperCase())} Discount</td>
                  <td>₹{Number(reportData.salesByOrderType?.[type]?.discount || 0).toFixed(2)}</td>
                </tr>
              </React.Fragment>
            ))}

            <tr><td colSpan="2"><strong>Main Category Breakdown</strong></td></tr>
            {(reportData.mainCategoryReport || []).map((category) => (
              <React.Fragment key={category.main_category_id}>
                <tr>
                  <td>{category.main_category_name}</td>
                  <td>₹{Number(category.total || 0).toFixed(2)}</td>
                </tr>
                <tr>
                  <td>- Subtotal</td>
                  <td>₹{Number(category.subtotal || 0).toFixed(2)}</td>
                </tr>
                <tr>
                  <td>- Discount</td>
                  <td>₹{Number(category.discount || 0).toFixed(2)}</td>
                </tr>
              </React.Fragment>
            ))}

            <tr><td colSpan="2"><strong>Menu Items Breakdown</strong></td></tr>
            {(reportData.menuTotalsArray || []).map((item) => (
              <tr key={item.menu_name}>
                <td>{item.menu_name}</td>
                <td>₹{Number(item.total || 0).toFixed(2)}</td>
              </tr>
            ))}

            <tr><td colSpan="2"><strong>Payment Type Breakdown</strong></td></tr>
            {["card", "cash", "upi", "neft", "zomato", "swiggy", "dineout"].map((type) => (
              <tr key={type}>
                <td>{type.toUpperCase()}</td>
                <td>₹{Number(reportData.paymentType?.[type] || 0).toFixed(2)}</td>
              </tr>
            ))}

            <tr><td><strong>Total Discount</strong></td><td>₹{totalDiscount.toFixed(2)}</td></tr>

            <tr>
              <td><strong>Total Service Charge</strong></td>
              <td>₹{["dine_in", "take_away", "delivery"].reduce((sum, type) =>
                sum + Number(reportData.salesByOrderType?.[type]?.serviceCharge || 0), 0).toFixed(2)}
              </td>
            </tr>

            <tr>
              <td><strong>Total Tax</strong></td>
              <td>₹{["dine_in", "take_away", "delivery"].reduce((sum, type) =>
                sum + Number(reportData.salesByOrderType?.[type]?.tax || 0), 0).toFixed(2)}
              </td>
            </tr>
          </tbody>
        </table>
      )}
    </>
  );
}

export default SalesReports;