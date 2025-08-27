import React, { useEffect, useState } from "react";
import "./CustomisedSalesReport.css";
import Sidebar from "../Sidebar";
import MainHeader from "../MainHeader";
import axiosInstance from "../../utlis/axiosinstance";
import { GetCustomisedSalesReportURL } from "../../BaseURL/baseURL";
import Toaster from "../../utlis/Toaster";
import LoadingModal from "../../utlis/LoadingModal";
import jsPDF from "jspdf";
import "jspdf-autotable";
import * as XLSX from "xlsx";
import { Link } from "react-router-dom";
import {getAppDataFromDB} from "../../utlis/indexedDB";

function CustomisedSalesReport() {
  const [fullLoader, setFullLoader] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
   const [pdfOrderType, setPdfOrderType] = useState('');
  const [paymentType, setPaymentType] = useState('');
  const [formData, setFormData] = useState({
    start_date: "",
    end_date: "",
    order_mode: "all",
    payment_mode: "all",
    payment_status: "all"
  });
  const [appliedFilters, setAppliedFilters] = useState({
  order_mode: "all",
  payment_status: "all"
});

  const [data, setData] = useState({});
  const [orderTypeCounts, setOrderTypeCounts] = useState({});
  const [foodeName, setFooderName] = useState("");
  
  const toggleSidebar = () => {
    setIsSidebarOpen((prev) => !prev);
  };

    useEffect(() => {
    // Get today's 12:00 AM
    const today = new Date();
    today.setHours(0, 0, 0, 0); // sets to 12:00 AM

    // Tomorrow's 12:00 AM = add 24 hours
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Format to YYYY-MM-DDTHH:mm
    const formatDateTime = (date) => {
      const yyyy = date.getFullYear();
      const mm = String(date.getMonth() + 1).padStart(2, "0");
      const dd = String(date.getDate()).padStart(2, "0");
      const hh = String(date.getHours()).padStart(2, "0");
      const min = String(date.getMinutes()).padStart(2, "0");
      return `${yyyy}-${mm}-${dd}T${hh}:${min}`;
    };

    setFormData({
      start_date: formatDateTime(today),
      end_date: formatDateTime(tomorrow),
      order_mode: "all",
    payment_mode: "all",
    payment_status: "all"
    });
  }, []);

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

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // const convertToISOFormat = (dateTimeString) => {
  //   return new Date(dateTimeString).toISOString();
  // };

   function padNumber(number, length) {
        return String(number).padStart(length, '0');
    }

  function convertToISOFormat(inputDate) {
        const [datePart, timePart] = inputDate.split('T');
        const [year, month, day] = datePart.split('-');
        const [hours, minutes] = timePart.split(':');

        const isoFormattedDate = `${year}-${padNumber(month, 2)}-${padNumber(day, 2)}T${padNumber(hours, 2)}:${padNumber(minutes, 2)}`;

        return isoFormattedDate;
    }

  const handleSubmitClick = async (e) => {
    e.preventDefault();

    if (!formData.start_date) {
      Toaster.warning("Please provide a valid start date and time");
      return;
    }
    else if (!formData.end_date) {
      Toaster.warning("Please provide a valid end date and time");
      return;
    }

    setIsLoading(true);
    setFullLoader(true);
    try {
      const response = await axiosInstance.get(GetCustomisedSalesReportURL, {
        params: {
          start_date: convertToISOFormat(formData.start_date),
          end_date: convertToISOFormat(formData.end_date),
          order_mode: formData.order_mode,
          payment_mode: formData.payment_mode,
          payment_status: formData.payment_status,
        }
      });
      
      // if (response.status === 200 && response.data.salesByOrderType) {
      //   setData(response.data);
      //   setOrderTypeCounts(response.data.orderTypeCounts || {});
      // } 
      if (response.status === 200 && response.data.salesByOrderType) {
  setData(response.data);
  setOrderTypeCounts(response.data.orderTypeCounts || {});

    
  setPaymentType('')
  setPdfOrderType('')
  
  // Lock current dropdown values for report UI
  setAppliedFilters({
    order_mode: formData.order_mode,
    payment_status: formData.payment_status
  });
}
else if (response.status === 200 && response.data.message) {
        Toaster.success(response.data.message);
        setData({});
      }
    } catch (error) {
      Toaster.error(error.response?.data?.message || error.message);
      console.error(error);
    } finally {
      setIsLoading(false);
      setFullLoader(false);
    }
  };

  const handleResetClick = () => {
    setFormData({
      start_date: "",
      end_date: "",
      order_mode: "all",
      payment_mode: "all",
      payment_status: "all"
    });
    setData({});
  };

//  const downloadPdfDocument = () => {
//   const doc = new jsPDF();
  
//   // Add title
//   doc.setFontSize(16);
//   doc.setTextColor(255, 203, 68); // #ffcb44
//   doc.setFont("gilroy", "bold");
//   doc.text(`${data.restaurantName || "Restaurant"} (Customised Sales Report)`, 105, 20, { align: 'center' });
  
//   // Reset font for the rest of the content
//   doc.setFont("times");
//   doc.setTextColor(0, 0, 0);
  
//   // Create the HTML table content for autoTable
//   const pdfContent = document.createElement('div');
//   pdfContent.innerHTML = `
//     <table id="pdfContent" class="table table-bordered">
//       <thead>
//         <tr>
//           <th colSpan="2">
//             <h5>Report Details</h5>
//           </th>
//         </tr>
//       </thead>
//       <tbody>
//         <tr>
//           <td>Reports:</td>
//           <td>${convertDateTime(data.start_date)} To ${convertDateTime(data.end_date)}</td>
//         </tr>
//         <tr>
//           <td>Order Type:</td>
//           <td>${formData.order_mode === 'all' ? 'All' : 
//               formData.order_mode === 'dine_in' ? 'Dine In' : 
//               formData.order_mode === 'delivery' ? 'Delivery' : 'Take Away'}</td>
//         </tr>
//         <tr>
//           <td>Payment Status:</td>
//           <td>${formData.payment_status === 'all' ? 'All' : 
//               formData.payment_status === '1' ? 'Paid' : 'Partially'}</td>
//         </tr>
//         <tr>
//           <th colSpan="2">
//             <h6>Summary</h6>
//           </th>
//         </tr>
//         <tr>
//           <td>Total Sales:</td>
//           <td>${data.currency_symbol || "₹"}${data.totalOfAllTotals || "0.00"}</td>
//         </tr>
//         <tr>
//           <td>Total Transactions:</td>
//           <td>${data.totalTransaction || "0"}</td>
//         </tr>
//         <tr>
//           <td>Average Transaction Value:</td>
//           <td>${data.currency_symbol || "₹"}${data.average_transation || "0.00"}</td>
//         </tr>
//         <tr>
//           <td>No of Person Served:</td>
//           <td>${data.totalEaters || "0"}</td>
//         </tr>
//         <tr>
//           <td>Aquire Customer:</td>
//           <td>${data.totalAquireCustomerCount || "0"}</td>
//         </tr>
//         <tr>
//           <th colSpan="2">
//             <h6>Sales Breakdown by Order Types</h6>
//           </th>
//         </tr>
//         ${(formData.order_mode === 'all' || formData.order_mode === 'delivery') ? `
//         <tr>
//           <td>Delivery:</td>
//           <td>${data.currency_symbol || "₹"}${data.salesByOrderType?.delivery?.total || "0.00"}</td>
//         </tr>
//         <tr>
//           <td>Transactions:</td>
//           <td>${orderTypeCounts.delivery || "0"}</td>
//         </tr>
//         ` : ''}
//         ${(formData.order_mode === 'all' || formData.order_mode === 'dine_in') ? `
//         <tr>
//           <td>Dine-in:</td>
//           <td>${data.currency_symbol || "₹"}${data.salesByOrderType?.dine_in?.total || "0.00"}</td>
//         </tr>
//         <tr>
//           <td>Transactions:</td>
//           <td>${orderTypeCounts.dine_in || "0"}</td>
//         </tr>
//         ` : ''}
//         ${(formData.order_mode === 'all' || formData.order_mode === 'take_away') ? `
//         <tr>
//           <td>Take Away:</td>
//           <td>${data.currency_symbol || "₹"}${data.salesByOrderType?.take_away?.total || "0.00"}</td>
//         </tr>
//         <tr>
//           <td>Transactions:</td>
//           <td>${orderTypeCounts.take_away || "0"}</td>
//         </tr>
//         ` : ''}
//         ${data.menuTotalsArray && data.menuTotalsArray.length > 0 ? `
//         <tr>
//           <th colSpan="2">
//             <h6>Category Wise Breakdown</h6>
//           </th>
//         </tr>
//         ${data.menuTotalsArray.map(item => `
//         <tr>
//           <td>${item.menu_name}:</td>
//           <td>${data.currency_symbol || "₹"}${item.total || "0.00"}</td>
//         </tr>
//         `).join('')}
//         ` : ''}
//         ${data.paymentType ? `
//         <tr>
//           <th colSpan="2">
//             <h6>Payment Type Breakdown</h6>
//           </th>
//         </tr>
//         <tr>
//           <td>Cash:</td>
//           <td>${data.currency_symbol || "₹"}${parseFloat(data.paymentType.cash || 0).toFixed(2)}</td>
//         </tr>
//         <tr>
//           <td>UPI:</td>
//           <td>${data.currency_symbol || "₹"}${parseFloat(data.paymentType.upi || 0).toFixed(2)}</td>
//         </tr>
//         <tr>
//           <td>Card:</td>
//           <td>${data.currency_symbol || "₹"}${parseFloat(data.paymentType.card || 0).toFixed(2)}</td>
//         </tr>
//         ${data.paymentType.qr ? `
//         <tr>
//           <td>QR:</td>
//           <td>${data.currency_symbol || "₹"}${parseFloat(data.paymentType.qr || 0).toFixed(2)}</td>
//         </tr>
//         ` : ''}
//         ` : ''}
//         <tr>
//           <th colSpan="2">
//             <h6>Other Information</h6>
//           </th>
//         </tr>
//         <tr>
//           <td>Total Discounts:</td>
//           <td>${data.currency_symbol || "₹"}${(
//             (orderTypeCounts.dine_in ? parseFloat(data.salesByOrderType?.dine_in?.discount || 0) : 0) +
//             (orderTypeCounts.take_away ? parseFloat(data.salesByOrderType?.take_away?.discount || 0) : 0) +
//             (orderTypeCounts.delivery ? parseFloat(data.salesByOrderType?.delivery?.discount || 0) : 0)
//           ).toFixed(2)}</td>
//         </tr>
//         <tr>
//           <td>Total Service Charge:</td>
//           <td>${data.currency_symbol || "₹"}${(
//             (orderTypeCounts.dine_in ? parseFloat(data.salesByOrderType?.dine_in?.serviceCharge || 0) : 0) +
//             (orderTypeCounts.take_away ? parseFloat(data.salesByOrderType?.take_away?.serviceCharge || 0) : 0) +
//             (orderTypeCounts.delivery ? parseFloat(data.salesByOrderType?.delivery?.serviceCharge || 0) : 0)
//           ).toFixed(2)}</td>
//         </tr>
//         <tr>
//           <td>Total Tax:</td>
//           <td>${data.currency_symbol || "₹"}${(
//             (orderTypeCounts.dine_in ? parseFloat(data.salesByOrderType?.dine_in?.tax || 0) : 0) +
//             (orderTypeCounts.take_away ? parseFloat(data.salesByOrderType?.take_away?.tax || 0) : 0) +
//             (orderTypeCounts.delivery ? parseFloat(data.salesByOrderType?.delivery?.tax || 0) : 0)
//           ).toFixed(2)}</td>
//         </tr>
//       </tbody>
//     </table>
//   `;
  
//   document.body.appendChild(pdfContent);
  
//   doc.autoTable({
//     html: "#pdfContent",
//     styles: {
//       font: "times",
//       fontSize: 10,
//       cellPadding: 1,
//       overflow: "linebreak",
//     },
//     headStyles: {
//       fillColor: "#006495",
//       textColor: "#ffffff",
//       halign: "right",
//       valign: "middle",
//       fontStyle: "bold",
//       fontSize: 7,
//       margin: 0
//     },
//     bodyStyles: {
//       fillColor: [255, 255, 255],
//       textColor: [0, 0, 0],
//       halign: "right",
//       valign: "middle",
//     },
//     footStyles: {
//       fillColor: [220, 220, 220],
//       textColor: [0, 0, 0],
//       halign: "left",
//       valign: "middle",
//       fontStyle: "bold",
//     },
//     margin: { top: 30, left: 10, right: 10 },
//     didParseCell: function (data) {
//       if (data.row.section === "body" && data.column.dataKey === 0) {
//         data.cell.styles.halign = "left";
//       }
//       if (data.row.section === "head" && data.row.index === 0) {
//         data.cell.styles.halign = "center";
//       }
//       if (data.cell && data.cell.raw instanceof HTMLTableCellElement) {
//         const h4 = data.cell.raw.querySelector('h4');
//         if (h4) {
//           data.cell.styles.fontSize = 16;
//           data.cell.styles.halign = 'center';
//           data.cell.styles.textColor = '#ffcb44';
//           data.cell.styles.font = 'gilroy';
//         }
//         const h5 = data.cell.raw.querySelector('h5');
//         if (h5) {
//           data.cell.styles.fontSize = 9;
//           data.cell.styles.halign = 'left';
//           data.cell.styles.fontStyle = 'bold';
//         }
//         const h6 = data.cell.raw.querySelector('h6');
//         if (h6) {
//           data.cell.styles.fontSize = 12;
//           data.cell.styles.halign = 'center';
//           data.cell.styles.fontStyle = 'bold';
//         }
//       }
//     },
//   });
  
//   // Remove the temporary element
//   document.body.removeChild(pdfContent);
  
//   doc.save(`Customised-Report-${formData.start_date} to ${formData.end_date}.pdf`);
// };

const downloadPdfDocument = () => {
  const doc = new jsPDF();

  const rupeeSymbol = "\u20B9"; // Unicode ₹ symbol

  // Add title
  doc.setFontSize(16);
  doc.setTextColor(255, 203, 68); // #ffcb44
  doc.setFont("helvetica", "bold");
  doc.text(`${foodeName || ""} (Customised Sales Report)`, 105, 20, { align: 'center' });

  // Reset font for the rest of the content
  doc.setFont("times");
  doc.setTextColor(0, 0, 0);

  // Create the HTML table content for autoTable
  const pdfContent = document.createElement('div');
  pdfContent.innerHTML = `
    <table id="pdfContent" class="table table-bordered">
      <thead>
        <tr>
          <th colSpan="2"><h5>Report Details</h5></th>
        </tr>
      </thead>
      <tbody>
        <tr><td>Reports:</td><td>${convertDateTime(data.start_date)} To ${convertDateTime(data.end_date)}</td></tr>
        <tr><td>Order Type:</td><td>${appliedFilters.order_mode === 'all' ? 'All' : appliedFilters.order_mode === 'dine_in' ? 'Dine In' : appliedFilters.order_mode === 'delivery' ? 'Delivery' : 'Take Away'}</td></tr>
        <tr><td>Payment Status:</td><td>${appliedFilters.payment_status === 'all' ? 'All' : appliedFilters.payment_status === '1' ? 'Paid' : 'Partially'}</td></tr>


    

        <tr><th colSpan="2"><h6>Summary</h6></th></tr>
        <tr><td>Total Sales:</td><td>${data.totalOfAllTotals || "0.00"}</td></tr>
        <tr><td>Total Transactions:</td><td>${data.totalTransaction || "0"}</td></tr>
        <tr><td>Average Transaction Value:</td><td>${data.average_transation || "0.00"}</td></tr>
        <tr><td>No of Person Served:</td><td>${data.totalEaters || "0"}</td></tr>
        <tr><td>Aquire Customer:</td><td>${data.totalAquireCustomerCount || "0"}</td></tr>

        <tr><th colSpan="2"><h6>Sales Breakdown by Order Types</h6></th></tr>
        ${(formData.order_mode === 'all' || formData.order_mode === 'delivery') ? `
          <tr><td>Delivery:</td><td>${data.salesByOrderType?.delivery?.total || "0.00"}</td></tr>
          <tr><td>Transactions:</td><td>${orderTypeCounts.delivery || "0"}</td></tr>
        ` : ''}
        ${(formData.order_mode === 'all' || formData.order_mode === 'dine_in') ? `
          <tr><td>Dine-in:</td><td>${data.salesByOrderType?.dine_in?.total || "0.00"}</td></tr>
          <tr><td>Transactions:</td><td>${orderTypeCounts.dine_in || "0"}</td></tr>
        ` : ''}
        ${(formData.order_mode === 'all' || formData.order_mode === 'take_away') ? `
          <tr><td>Take Away:</td><td>${data.salesByOrderType?.take_away?.total || "0.00"}</td></tr>
          <tr><td>Transactions:</td><td>${orderTypeCounts.take_away || "0"}</td></tr>
        ` : ''}

        ${data.menuTotalsArray?.length > 0 ? `
        <tr><th colSpan="2"><h6>Category Wise Breakdown</h6></th></tr>
        ${data.menuTotalsArray.map(item => `
          <tr><td>${item.menu_name}:</td><td>${item.total || "0.00"}</td></tr>
        `).join('')}` : ''}

        ${data.paymentType ? `
        <tr><th colSpan="2"><h6>Payment Type Breakdown</h6></th></tr>
        <tr><td>Cash:</td><td>${parseFloat(data.paymentType.cash || 0).toFixed(2)}</td></tr>
        <tr><td>UPI:</td><td>${parseFloat(data.paymentType.upi || 0).toFixed(2)}</td></tr>
        <tr><td>Card:</td><td>${parseFloat(data.paymentType.card || 0).toFixed(2)}</td></tr>
        ${data.paymentType.qr ? `<tr><td>QR:</td><td>${parseFloat(data.paymentType.qr || 0).toFixed(2)}</td></tr>` : ''}
        ` : ''}

        <tr><th colSpan="2"><h6>Other Information</h6></th></tr>
        <tr><td>Total Discounts:</td><td>${(
          (orderTypeCounts.dine_in ? parseFloat(data.salesByOrderType?.dine_in?.discount || 0) : 0) +
          (orderTypeCounts.take_away ? parseFloat(data.salesByOrderType?.take_away?.discount || 0) : 0) +
          (orderTypeCounts.delivery ? parseFloat(data.salesByOrderType?.delivery?.discount || 0) : 0)
        ).toFixed(2)}</td></tr>
        <tr><td>Total Service Charge:</td><td>${(
          (orderTypeCounts.dine_in ? parseFloat(data.salesByOrderType?.dine_in?.serviceCharge || 0) : 0) +
          (orderTypeCounts.take_away ? parseFloat(data.salesByOrderType?.take_away?.serviceCharge || 0) : 0) +
          (orderTypeCounts.delivery ? parseFloat(data.salesByOrderType?.delivery?.serviceCharge || 0) : 0)
        ).toFixed(2)}</td></tr>
        <tr><td>Total Tax:</td><td>${(
          (orderTypeCounts.dine_in ? parseFloat(data.salesByOrderType?.dine_in?.tax || 0) : 0) +
          (orderTypeCounts.take_away ? parseFloat(data.salesByOrderType?.take_away?.tax || 0) : 0) +
          (orderTypeCounts.delivery ? parseFloat(data.salesByOrderType?.delivery?.tax || 0) : 0)
        ).toFixed(2)}</td></tr>
      </tbody>
    </table>
  `;

  document.body.appendChild(pdfContent);

  doc.autoTable({
    html: "#pdfContent",
    styles: {
      font: "times",
      fontSize: 10,
      cellPadding: 1,
      overflow: "linebreak",
    },
    headStyles: {
      fillColor: "#006495",
      textColor: "#ffffff",
      halign: "right",
      valign: "middle",
      fontStyle: "bold",
      fontSize: 7,
    },
    bodyStyles: {
      fillColor: [255, 255, 255],
      textColor: [0, 0, 0],
      halign: "right",
      valign: "middle",
    },
    margin: { top: 30, left: 10, right: 10 },
    didParseCell: function (data) {
      if (data.row.section === "body" && data.column.dataKey === 0) {
        data.cell.styles.halign = "left";
      }
      if (data.cell && data.cell.raw instanceof HTMLTableCellElement) {
        const h5 = data.cell.raw.querySelector('h5');
        if (h5) {
          data.cell.styles.fontSize = 9;
          data.cell.styles.halign = 'left';
          data.cell.styles.fontStyle = 'bold';
        }
        const h6 = data.cell.raw.querySelector('h6');
        if (h6) {
          data.cell.styles.fontSize = 12;
          data.cell.styles.halign = 'center';
          data.cell.styles.fontStyle = 'bold';
        }
      }
    },
  });

  document.body.removeChild(pdfContent);
  doc.save(`Customised-Report-${formData.start_date} to ${formData.end_date}.pdf`);
};


  const exportToExcel = () => {
    // Create a worksheet
    const wsData = [];
    
    // Add title
    wsData.push([`${data.restaurantName || ""} (Customised Sales Report)`]);
    wsData.push([]);
    
    // Add report details
    wsData.push(["Reports:", `${convertDateTime(data.start_date)} To ${convertDateTime(data.end_date)}`]);
    wsData.push(["Order Type:", formData.order_mode === 'all' ? 'All' : 
                formData.order_mode === 'dine_in' ? 'Dine In' : 
                formData.order_mode === 'delivery' ? 'Delivery' : 'Take Away']);
    wsData.push(["Payment Status:", formData.payment_status === 'all' ? 'All' : 
                formData.payment_status === '1' ? 'Paid' : 'Partially']);
    wsData.push([]);
    
    // Add summary
    wsData.push(["Summary"]);
    wsData.push(["Total Sales:", `${data.currency_symbol || "₹"}${data.totalOfAllTotals || "0.00"}`]);
    wsData.push(["Total Transactions:", data.totalTransaction || "0"]);
    wsData.push(["Average Transaction Value:", `${data.currency_symbol || "₹"}${data.average_transation || "0.00"}`]);
    wsData.push(["No of Person Served:", data.totalEaters || "0"]);
    wsData.push(["Aquire Customer:", data.totalAquireCustomerCount || "0"]);
    wsData.push([]);
    
    // Add sales breakdown
    wsData.push(["Sales Breakdown by Order Types"]);
    if (formData.order_mode === 'all' || formData.order_mode === 'delivery') {
      wsData.push(["Delivery:", `${data.currency_symbol || "₹"}${data.salesByOrderType?.delivery?.total || "0.00"}`]);
      wsData.push(["", `Transactions: ${orderTypeCounts.delivery || "0"}`]);
    }
    if (formData.order_mode === 'all' || formData.order_mode === 'dine_in') {
      wsData.push(["Dine-in:", `${data.currency_symbol || "₹"}${data.salesByOrderType?.dine_in?.total || "0.00"}`]);
      wsData.push(["", `Transactions: ${orderTypeCounts.dine_in || "0"}`]);
    }
    if (formData.order_mode === 'all' || formData.order_mode === 'take_away') {
      wsData.push(["Take Away:", `${data.currency_symbol || "₹"}${data.salesByOrderType?.take_away?.total || "0.00"}`]);
      wsData.push(["", `Transactions: ${orderTypeCounts.take_away || "0"}`]);
    }
    wsData.push([]);
    
    // Add category breakdown
    if (data.menuTotalsArray && data.menuTotalsArray.length > 0) {
      wsData.push(["Category Wise Breakdown"]);
      data.menuTotalsArray.forEach(item => {
        wsData.push([item.menu_name, `${data.currency_symbol || "₹"}${item.total || "0.00"}`]);
      });
      wsData.push([]);
    }
    
    // Add payment type breakdown
    if (data.paymentType) {
      wsData.push(["Payment Type Breakdown"]);
      wsData.push(["Cash:", `${data.currency_symbol || "₹"}${parseFloat(data.paymentType.cash || 0).toFixed(2)}`]);
      wsData.push(["UPI:", `${data.currency_symbol || "₹"}${parseFloat(data.paymentType.upi || 0).toFixed(2)}`]);
      wsData.push(["Card:", `${data.currency_symbol || "₹"}${parseFloat(data.paymentType.card || 0).toFixed(2)}`]);
      if (data.paymentType.qr) {
        wsData.push(["QR:", `${data.currency_symbol || "₹"}${parseFloat(data.paymentType.qr || 0).toFixed(2)}`]);
      }
      wsData.push([]);
    }
    
    // Add other information
    wsData.push(["Other Information"]);
    wsData.push(["Total Discounts:", `${data.currency_symbol || "₹"}${(
      (orderTypeCounts.dine_in ? parseFloat(data.salesByOrderType?.dine_in?.discount || 0) : 0) +
      (orderTypeCounts.take_away ? parseFloat(data.salesByOrderType?.take_away?.discount || 0) : 0) +
      (orderTypeCounts.delivery ? parseFloat(data.salesByOrderType?.delivery?.discount || 0) : 0)
    ).toFixed(2)}`]);
    
    wsData.push(["Total Service Charge:", `${data.currency_symbol || "₹"}${(
      (orderTypeCounts.dine_in ? parseFloat(data.salesByOrderType?.dine_in?.serviceCharge || 0) : 0) +
      (orderTypeCounts.take_away ? parseFloat(data.salesByOrderType?.take_away?.serviceCharge || 0) : 0) +
      (orderTypeCounts.delivery ? parseFloat(data.salesByOrderType?.delivery?.serviceCharge || 0) : 0)
    ).toFixed(2)}`]);
    
    wsData.push(["Total Tax:", `${data.currency_symbol || "₹"}${(
      (orderTypeCounts.dine_in ? parseFloat(data.salesByOrderType?.dine_in?.tax || 0) : 0) +
      (orderTypeCounts.take_away ? parseFloat(data.salesByOrderType?.take_away?.tax || 0) : 0) +
      (orderTypeCounts.delivery ? parseFloat(data.salesByOrderType?.delivery?.tax || 0) : 0)
    ).toFixed(2)}`]);
    
    // Create workbook and worksheet
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Sales Report");
    
    // Save the Excel file
    XLSX.writeFile(wb, `Customised-Sales-Report-${getToday()}.xlsx`);
  };

  // const convertDateTime = (dateString) => {
  //   if (!dateString) return "";
  //   const date = new Date(dateString);
  //   return date.toLocaleDateString() + " " + date.toLocaleTimeString();
  // };

  const convertDateTime = (dateString) => {
  if (!dateString) return "";
  
  const date = new Date(dateString);
  
  // Format date as D/M/Y
  const day = date.getDate();
  const month = date.getMonth() + 1; // Months are 0-indexed
  const year = date.getFullYear();
  
  // Format time (keeping original time formatting)
  const timeString = date.toLocaleTimeString();
  
  return `${day}/${month}/${year} ${timeString}`;
};

  const formatDate = (date) => {
    if (!date) return "";
    const d = new Date(date);
    return d.toLocaleDateString();
  };

  const getToday = () => {
    const today = new Date();
    return today.toISOString().split('T')[0]; // Returns YYYY-MM-DD format
  };

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
          <div className="csr-root">
            {/* Header */}
            <div className="csr-header-row">
              <div>
                <div className="csr-header">Customised Sales Report</div>
                <div className="csr-desc">
                  A Customised Sales Report provides detailed insights into a business's sales performance within a specific selected date and time range, encompassing product sales, revenue, discounts, refunds, and more.
                </div>
              </div>
              <Link className="csr-back-btn text-decoration-none" to="/reports"> Go Back</Link>
            </div>

            {/* Filter Section */}
            <form className="csr-filters" onSubmit={handleSubmitClick}>
              <div className="csr-filter-row">
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
                    {/* <span className="csr-date-icon">&#128197;</span> */}
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
                    {/* <span className="csr-date-icon">&#128197;</span> */}
                  </div>
                </div>
                <div className="csr-filter-group">
                  <label>Order Type</label>
                  <select 
                    className="csr-input"
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
                    className="csr-input"
                    name="payment_status"
                    value={formData.payment_status}
                    onChange={handleInputChange}
                  >
                    <option value="all">All</option>
                    <option value="1">Paid</option>
                    <option value="3">Partially</option>
                  </select>
                </div>
              </div>
              <div className="csr-filter-actions">
                <button type="submit" className="csr-btn csr-btn-yellow" disabled={isLoading}>
                  {isLoading ? "Loading..." : "Submit"}
                </button>
                <button type="button" className="csr-btn csr-btn-gray" onClick={handleResetClick}>
                  Reset
                </button>
              </div>
            </form>

            <LoadingModal isLoading={fullLoader} />

            {Object.keys(data).length > 0 && (
              <>
                {/* Export Actions & Report Name */}
                <div className="csr-export-row">
                  <div />
                  <div>
                    <button 
                      className="csr-btn csr-btn-yellow" 
                      onClick={downloadPdfDocument}
                      disabled={isLoading}
                    >
                      Generate PDF
                    </button>
                    <button 
                      className="csr-btn csr-btn-yellow" 
                      onClick={exportToExcel}
                      disabled={isLoading}
                    >
                      Export to Excel
                    </button>
                  </div>
                </div>
               
                {/* Main Report Box */}
                <div className="csr-panel">
                  <div className="csr-report-meta" style={{fontSize:"12px"}}>
                    <div className="csr-report-title text-center mb-2">
                      {foodeName || ""} (Customised Sales Report)
                    </div>
                    <span><strong>Reports:</strong> {convertDateTime(data.start_date)} To {convertDateTime(data.end_date)}</span><br/>
                    <span>
                      {/* <strong>Order Type:</strong> {formData.order_mode === 'all' ? 'All' : 
                                 formData.order_mode === 'dine_in' ? 'Dine In' : 
                                 formData.order_mode === 'delivery' ? 'Delivery' : 'Take Away'} */}
                                 <strong>Order Type:</strong> {appliedFilters.order_mode === 'all' ? 'All' : 
   appliedFilters.order_mode === 'dine_in' ? 'Dine In' : 
   appliedFilters.order_mode === 'delivery' ? 'Delivery' : 'Take Away'}
                    </span><br/>
                    <span>
                      {/* <strong>Payment Status:</strong>
                       {formData.payment_status === 'all' ? 'All' : 
                                     formData.payment_status === '1' ? 'Paid' : 'Partially'} */}
                                     <strong>Payment Status:</strong> {appliedFilters.payment_status === 'all' ? 'All' : 
   appliedFilters.payment_status === '1' ? 'Paid' : 'Partially'}
                    </span>
                  </div>
                  <div className="csr-report-content">
                    <ul className="csr-tree">
                      <li>
                        <b>Summary</b>
                        <ul>
                          <li>Total Sales: {data.currency_symbol || ""}{data.totalOfAllTotals || "0.00"}</li>
                          <li>Total Transactions: {data.totalTransaction || "0"}</li>
                          <li>Average Transaction Value: {data.currency_symbol || ""}{data.average_transation || "0.00"}</li>
                          <li>No of Person Served: {data.totalEaters || "0"}</li>
                          <li>Aquire Customer: {data.totalAquireCustomerCount || "0"}</li>
                        </ul>
                      </li>
                      <li>
                        <b>Sales Distribution by Order Types</b>
                        <ul>
                          {/* {(formData.order_mode === 'all' || formData.order_mode === 'delivery') && (
                            <li>
                              Delivery: {data.currency_symbol || "£"}{data.salesByOrderType?.delivery?.total || "0.00"}
                              <ul><li>Transactions: {orderTypeCounts.delivery || "0"}</li></ul>
                            </li>
                          )} */}
{(appliedFilters.order_mode === 'all' || appliedFilters.order_mode === 'delivery') && (
  <li>
    Delivery: {data.currency_symbol || "₹"}{data.salesByOrderType?.delivery?.total || "0.00"}
    <ul><li>Transactions: {orderTypeCounts.delivery || "0"}</li></ul>
  </li>
)}
                          {/* {(formData.order_mode === 'all' || formData.order_mode === 'dine_in') && (
                            <li>
                              Dine-in: {data.currency_symbol || "£"}{data.salesByOrderType?.dine_in?.total || "0.00"}
                              <ul><li>Transactions: {orderTypeCounts.dine_in || "0"}</li></ul>
                            </li>
                          )} */}
{(appliedFilters.order_mode === 'all' || appliedFilters.order_mode === 'dine_in') && (
  <li>
    Dine-in: {data.currency_symbol || "₹"}{data.salesByOrderType?.dine_in?.total || "0.00"}
    <ul><li>Transactions: {orderTypeCounts.dine_in || "0"}</li></ul>
  </li>
)}
                          {/* {(formData.order_mode === 'all' || formData.order_mode === 'take_away') && (
                            <li>
                              Take Away: {data.currency_symbol || "£"}{data.salesByOrderType?.take_away?.total || "0.00"}
                              <ul><li>Transactions: {orderTypeCounts.take_away || "0"}</li></ul>
                            </li>
                          )} */}
{(appliedFilters.order_mode === 'all' || appliedFilters.order_mode === 'take_away') && (
  <li>
    Take Away: {data.currency_symbol || "₹"}{data.salesByOrderType?.take_away?.total || "0.00"}
    <ul><li>Transactions: {orderTypeCounts.take_away || "0"}</li></ul>
  </li>
)}
                        </ul>
                      </li>
                      {data.menuTotalsArray && data.menuTotalsArray.length > 0 && (
                        <li>
                          <b>Category Wise Breakdown</b>
                          <ul>
                            {data.menuTotalsArray.map(item => (
                              <li key={item.menu_name}>
                                {item.menu_name}: {data.currency_symbol || ""}{item.total || "0.00"}
                              </li>
                            ))}
                          </ul>
                        </li>
                      )}
                      {data.paymentType && (
                        <li>
                          <b>Payment Type Breakdown</b>
                          <ul>
                            {/* <li>Cash: {data.currency_symbol || ""}{parseFloat(data.paymentType.cash || 0).toFixed(2)}</li>
                            <li>UPI: {data.currency_symbol || ""}{parseFloat(data.paymentType.upi || 0).toFixed(2)}</li>
                            <li>Card: {data.currency_symbol || ""}{parseFloat(data.paymentType.card || 0).toFixed(2)}</li>
                             <li>Neft: {data.currency_symbol || ""}{parseFloat(data.paymentType.neft || 0).toFixed(2)}</li>
                            <li>Zomato: {data.currency_symbol || ""}{parseFloat(data.paymentType.zomato || 0).toFixed(2)}</li>
                            <li>Swiggy: {data.currency_symbol || ""}{parseFloat(data.paymentType.swiggy || 0).toFixed(2)}</li>
                            <li>Dineout: {data.currency_symbol || ""}{parseFloat(data.paymentType.dineout || 0).toFixed(2)}</li> */}
                            <li>
  Cash: {data.currency_symbol || ""}
  {isNaN(parseFloat(data?.paymentType?.cash)) ? "0.00" : parseFloat(data?.paymentType?.cash).toFixed(2)}
</li>
<li>
  UPI: {data.currency_symbol || ""}
  {isNaN(parseFloat(data?.paymentType?.upi)) ? "0.00" : parseFloat(data?.paymentType?.upi).toFixed(2)}
</li>
<li>
  Card: {data.currency_symbol || ""}
  {isNaN(parseFloat(data?.paymentType?.card)) ? "0.00" : parseFloat(data?.paymentType?.card).toFixed(2)}
</li>
<li>
  Neft: {data.currency_symbol || ""}
  {isNaN(parseFloat(data?.paymentType?.neft)) ? "0.00" : parseFloat(data?.paymentType?.neft).toFixed(2)}
</li>
<li>
  Zomato: {data.currency_symbol || ""}
  {isNaN(parseFloat(data?.paymentType?.zomato)) ? "0.00" : parseFloat(data?.paymentType?.zomato).toFixed(2)}
</li>
<li>
  Swiggy: {data.currency_symbol || ""}
  {isNaN(parseFloat(data?.paymentType?.swiggy)) ? "0.00" : parseFloat(data?.paymentType?.swiggy).toFixed(2)}
</li>
<li>
  Dineout: {data.currency_symbol || ""}
  {isNaN(parseFloat(data?.paymentType?.dineout)) ? "0.00" : parseFloat(data?.paymentType?.dineout).toFixed(2)}
</li>

                            {data.paymentType.qr && (
                              <li>QR: {data.currency_symbol || ""}{parseFloat(data.paymentType.qr || 0).toFixed(2)}</li>
                            )}
                          </ul>
                        </li>
                      )}
                      <li>
                        <b>Discounts</b>
                        <ul>
                          <li>
                            Total Discounts: {data.currency_symbol || "£"}
                            {(
                              (orderTypeCounts.dine_in ? parseFloat(data.salesByOrderType?.dine_in?.discount || 0) : 0) +
                              (orderTypeCounts.take_away ? parseFloat(data.salesByOrderType?.take_away?.discount || 0) : 0) +
                              (orderTypeCounts.delivery ? parseFloat(data.salesByOrderType?.delivery?.discount || 0) : 0)
                            ).toFixed(2)}
                          </li>
                        </ul>
                      </li>
                      <li>
                        <b>Service Charges</b>
                        <ul>
                          <li>
                            Total Service Charge: {data.currency_symbol || "£"}
                            {(
                              (orderTypeCounts.dine_in ? parseFloat(data.salesByOrderType?.dine_in?.serviceCharge || 0) : 0) +
                              (orderTypeCounts.take_away ? parseFloat(data.salesByOrderType?.take_away?.serviceCharge || 0) : 0) +
                              (orderTypeCounts.delivery ? parseFloat(data.salesByOrderType?.delivery?.serviceCharge || 0) : 0)
                            ).toFixed(2)}
                          </li>
                        </ul>
                      </li>
                      <li>
                        <b>Taxes</b>
                        <ul>
                          <li>
                            Total Tax: {data.currency_symbol || "£"}
                            {(
                              (orderTypeCounts.dine_in ? parseFloat(data.salesByOrderType?.dine_in?.tax || 0) : 0) +
                              (orderTypeCounts.take_away ? parseFloat(data.salesByOrderType?.take_away?.tax || 0) : 0) +
                              (orderTypeCounts.delivery ? parseFloat(data.salesByOrderType?.delivery?.tax || 0) : 0)
                            ).toFixed(2)}
                          </li>
                        </ul>
                      </li>
                    </ul>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

export default CustomisedSalesReport;

