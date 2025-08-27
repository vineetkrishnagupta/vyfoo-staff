import React, { useEffect, useState, useRef } from "react";
import axiosInstance from "../utlis/axiosinstance";
import Toaster from "../utlis/Toaster";
import { KotGetAPI } from "../BaseURL/baseURL";
import LoadingModal from "../utlis/LoadingModal";
import { getAppDataFromDB } from "../utlis/indexedDB";

import MainHeader from "./MainHeader";
import Sidebar from "./Sidebar";
import { Link } from "react-router-dom";
import { FaBars } from "react-icons/fa";
import { useAuth } from "../AuthContext";

// CSS styles for KOT cards and status badges
const styles = `
  .kot-card {
    border: 1px solid #e0e0e0;
    border-radius: 8px;
    padding: 16px;
    margin-bottom: 16px;
    background: white;
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    transition: all 0.3s ease;
  }

  .kot-card:hover {
    box-shadow: 0 4px 8px rgba(0,0,0,0.15);
  }

  .kot-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 12px;
  }

  .kot-header-right {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .kot-id {
    font-weight: bold;
    font-size: 16px;
    color: #333;
  }

  .kot-time {
    font-size: 14px;
    color: #666;
  }

  .status-badge {
    padding: 4px 8px;
    border-radius: 12px;
    font-size: 12px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .status-queue {
    background-color: #e9ecef;
    color: #495057;
  }

  .status-cooking {
    background-color: #fff3cd;
    color: #856404;
  }

  .status-ready {
    background-color: #d4edda;
    color: #155724;
  }

  .status-cancelled {
    background-color: #f8d7da;
    color: #721c24;
  }

  .status-unknown {
    background-color: #e2e3e5;
    color: #383d41;
  }

  .kot-table {
    font-size: 14px;
    color: #666;
    margin-bottom: 12px;
  }

  .kot-items {
    margin-bottom: 16px;
  }

  .kot-items p {
    margin: 4px 0;
    font-size: 14px;
    color: #333;
  }

  .kot-actions {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 8px;
  }

  .btn-cook {
    flex: 1;
    padding: 8px 16px;
    border: none;
    border-radius: 6px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .btn-cook:hover:not(:disabled) {
    transform: translateY(-1px);
    box-shadow: 0 2px 4px rgba(0,0,0,0.2);
  }

  .btn-cook:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .btn-primary {
    background-color: #007bff;
    color: white;
  }

  .btn-warning {
    background-color: #ffc107;
    color: #212529;
  }

  .btn-success {
    background-color: #28a745;
    color: white;
  }

  .btn-danger {
    background-color: #dc3545;
    color: white;
  }

  .btn-secondary {
    background-color: #6c757d;
    color: white;
  }

  .btn-print {
    padding: 8px 12px;
    background-color: #f8f9fa;
    border: 1px solid #dee2e6;
    border-radius: 6px;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .btn-print:hover:not(:disabled) {
    background-color: #e9ecef;
    transform: translateY(-1px);
  }

  .btn-print:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none;
  }

  .kot-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
    // gap: 16px;
    // padding: 16px 0;
  }

  .dashboard-title {
    text-align: center;
    margin-bottom: 24px;
    color: #333;
    font-size: 24px;
    font-weight: 600;
  }
`;

// Inject styles
if (typeof document !== 'undefined' && !document.getElementById('kot-styles')) {
  const styleSheet = document.createElement('style');
  styleSheet.id = 'kot-styles';
  styleSheet.textContent = styles;
  document.head.appendChild(styleSheet);
}

// Print function for individual KOT
// const printIndividualKOT = async (kot) => {
//   try {
//     const appData = await getAppDataFromDB();
//     const enableSilentPrinting = Number(appData?.enable_silent_printing) || 0;

//     const kotNo = kot.kot;
//     const kotTime = kot.time;
//     const tableNo = kot.table_no;
//     const orderType = kot.order_type;

//     // Convert time to proper format for ESC/POS
//     const currentDate = new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
//     const currentTime = kot.time || new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hour12: true });

//     const itemsText = kot.items.map(item => {
//       const itemName = item.product_name;
//       const quantity = item.quantity;
//       return `${itemName}${' '.repeat(Math.max(1, 20 - itemName.length))}${quantity}`;
//     }).join('\n');

//     // ESC/POS format for thermal printer
//     const kotData = `ESC @
// ESC ! 0x08
// ESC a 0x01
// ${kotNo}
// ESC ! 0x00
// ESC a 0x00
// Date : ${currentDate}
// Time : ${currentTime}
// ${orderType} : ${tableNo}

// ESC ! 0x08
// Item${' '.repeat(15)}Qty
// ESC ! 0x00
// ================================
// ${itemsText}
// ================================

// ESC d 5
// GS V 0x41 0x03`;

//     // HTML version for browser print
//     const itemsHtmlRows = kot.items.map(item => {
//       const itemName = item.product_name;
//       const qty = item.quantity;
//       return `<tr><td>${itemName}</td><td class="text-right">${qty}</td></tr>`;
//     }).join("");

//     const kotHTML = `
//     <html>
//       <head>
//         <style>
//           body { font-family: 'Courier New', monospace; padding: 20px; font-size: 14px; }
//           .text-center { text-align: center; }
//           .text-right { text-align: right; }
//           table { width: 100%; border-collapse: collapse; margin-top: 10px; }
//           th, td { padding: 4px; border-bottom: 1px dashed #ccc; }
//           hr { border: none; border-top: 1px dashed #000; margin: 10px 0; }
//         </style>
//       </head>
//       <body>
//         <div class="text-center">
//           <h2 style="margin: 0;">${kotNo}</h2>
//           <p style="margin: 0;">Date: ${currentDate} &nbsp; Time: ${currentTime}</p>
//           <p style="margin: 0;">Mode: ${orderType} | Table: ${tableNo}</p>
//         </div>
//         <hr />
//         <table>
//           <thead><tr><th>Item</th><th class="text-right">Qty</th></tr></thead>
//           <tbody>${itemsHtmlRows}</tbody>
//         </table>
//         <hr />
//         <p class="text-center">Generated by POS</p>
//       </body>
//     </html>`;

//     if (enableSilentPrinting === 1) {
//       // Silent print to thermal printer
//       const printResponse = await fetch('http://localhost:3111/print', {
//         method: 'POST',
//         headers: { 'Content-Type': 'application/json' },
//         body: JSON.stringify({ printerType: 'kot', data: kotData }),
//       });

//       if (printResponse.ok) {
//         Toaster.success("KOT printed successfully");
//       } else {
//         const errorText = await printResponse.text();
//         throw new Error(errorText || "Failed to print KOT");
//       }
//     } else {
//       // Browser print using iframe
//       let iframe = document.getElementById("print-iframe-kot");
//       if (!iframe) {
//         iframe = document.createElement("iframe");
//         iframe.id = "print-iframe-kot";
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
//   } catch (error) {
//     console.error('KOT print error:', error);
//     Toaster.error(error.message || 'Failed to print KOT');
//   }
// };

// const printIndividualKOT = async (kot) => {
//   try {
//     const appData = await getAppDataFromDB();
//     const enableSilentPrinting = Number(appData?.enable_silent_printing) || 0;

//     const kotNo = kot.kot;
//     const kotTime = kot.time;
//     const tableNo = kot.table_no;
//     const orderType = kot.order_type;
//     const orderNo = kot.order_number; // make sure kot has this

//     const currentDate = new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
//     const currentTime = kot.time || new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hour12: true });

//     const itemsText = kot.items.map(item => {
//       const itemName = item.product_name;
//       const quantity = item.quantity;
//       return `${itemName}${' '.repeat(Math.max(1, 20 - itemName.length))}${quantity}`;
//     }).join('\n');

//     // ESC/POS data
//     const kotData = `ESC @
// ESC ! 0x08
// ESC a 0x01
// ${kotNo}
// ESC ! 0x00
// ESC a 0x00
// Date : ${currentDate}
// Time : ${currentTime}
// ${orderType} : ${tableNo}

// ESC ! 0x08
// Item${' '.repeat(15)}Qty
// ESC ! 0x00
// ================================
// ${itemsText}
// ================================

// ESC d 5
// GS V 0x41 0x03`;

//     // Styled HTML for browser print (same design as your example)
//     const itemsHtmlRows = kot.items.map(item => {
//       const itemName = item.product_name;
//       const qty = item.quantity;

//       const variantText = item.variant?.attribute_name && item.variant?.attribute_value_name
//         ? `<div style="font-size: 14px;">${item.variant.attribute_name}: ${item.variant.attribute_value_name}</div>`
//         : "";

//       const addonsText = Array.isArray(item.addons) && item.addons.length > 0
//         ? `<div style="font-size: 14px;">Addons: ${item.addons.map(a => a.name).join(", ")}</div>`
//         : "";

//       const notesText = item.notes
//         ? `<div style="font-size: 14px;">${item.notes}</div>`
//         : "";

//       return `
//         <tr>
//           <td>
//             ${itemName}
//             ${variantText}
//             ${addonsText}
//             ${notesText}
//           </td>
//           <td class="text-right">${qty}</td>
//         </tr>
//       `;
//     }).join("");

//     const shouldShowTableNo = tableNo != null && tableNo !== '';

//     const kotHTML = `
//     <html>
//       <head>
//         <style>
//           body { font-family: 'Arial', sans-serif; font-size: 14px; padding: 6px; margin-inline: 4px; }
//           .text-center { text-align: center; }
//           .text-right { text-align: right; }
//           .header-row, .info-row { display: flex; justify-content: space-between; margin: 4px 0; }
//           h2 { margin: 0; font-size: 16px; }
//           table { width: 100%; border-collapse: collapse; margin-top: 10px; }
//           th, td { padding-top: 2px; font-size: 14px; }
//           thead { border-top: 1px solid #000; border-bottom: 1px solid #000; padding-block: 2px; }
//           th { text-align: left; font-weight: bold; font-size: 14px; }
//           .bold { font-weight: bold; }
//         </style>
//       </head>
//       <body>
//         <div class="text-center">
//           <h2>${kotNo}</h2>
//         </div>
//         <div class="header-row">
//           <div>Date: ${currentDate}</div>
//           <div>Time: ${currentTime}</div>
//         </div>
//         <div class="info-row">
//          <div>
//   <span class="bold">
//     ${tableNo ? tableNo : (orderType ? orderType : "")}
//   </span>
// </div>

//           ${orderNo ? `<div>Order: #${orderNo}</div>`: ""}
//         </div>
//         <table>
//           <thead>
//             <tr>
//               <th>Item</th>
//               <th class="text-right">Qty</th>
//             </tr>
//           </thead>
//           <tbody>
//             ${itemsHtmlRows}
//           </tbody>
//         </table>
//       </body>
//     </html>`;

//     if (enableSilentPrinting === 1) {
//       const printResponse = await fetch('http://localhost:3111/print', {
//         method: 'POST',
//         headers: { 'Content-Type': 'application/json' },
//         body: JSON.stringify({ printerType: 'kot', data: kotData }),
//       });

//       if (!printResponse.ok) {
//         throw new Error(await printResponse.text() || "Failed to print KOT");
//       }
//       Toaster.success("KOT printed successfully");
//     } else {
//       let iframe = document.getElementById("print-iframe-kot");
//       if (!iframe) {
//         iframe = document.createElement("iframe");
//         iframe.id = "print-iframe-kot";
//         iframe.style.position = "fixed";
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
//   } catch (error) {
//     console.error('KOT print error:', error);
//     Toaster.error(error.message || 'Failed to print KOT');
//   }
// };

const printIndividualKOT = async (kot) => {
  try {
    const appData = await getAppDataFromDB();
    const enableSilentPrinting = Number(appData?.enable_silent_printing) || 0;

    const kotNo = kot.kot;
    const kotTime = kot.time;
    const tableNo = kot.table_no;
    const orderType = kot.order_type;
    const orderNo = kot.order_number;

    const currentDate = new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
    const currentTime = kot.time || new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hour12: true });

    // ✅ Updated: Include variants and addons in thermal printer text
    const itemsText = kot.items.map(item => {
      const itemName = item.product_name;
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
      if (item.selectedAddons && Array.isArray(item.selectedAddons) && item.selectedAddons.length > 0) {
        item.selectedAddons.forEach((addon, no) => {
          itemDetails += `\n  ${no + 1}. ${addon.addon_item_name}`;
        });
      }
      
      // Add product special note if present
      if (item.product_special_note && item.product_special_note.trim()) {
        itemDetails += `\n  Note: ${item.product_special_note.trim()}`;
      }
      
      return itemDetails;
    }).join('\n');

    // ESC/POS data
    const kotData = `ESC @
ESC ! 0x08
ESC a 0x01
${kotNo}
ESC ! 0x00
ESC a 0x00
Date : ${currentDate}
Time : ${currentTime}
${orderType} : ${tableNo}

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
            <span>${item.product_name} </span>

            ${
              item?.selectedvariants && 
              item?.selectedvariants?.combination_details
                ? item.selectedvariants.combination_details
                    .map(i => `<div><b>${i.attribute_name}:</b> ${i.attribute_value_name}</div>`)
                    .join('')
                : ''
            }

            ${
              item?.selectedAddons &&
              item?.selectedAddons
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
          body { font-family: 'Arial', sans-serif; font-size: 14px; padding: 6px; margin-inline: 4px; }
          .text-center { text-align: center; }
          .text-right { text-align: right; }
          .header-row, .info-row { display: flex; justify-content: space-between; margin: 4px 0; }
          h2 { margin: 0; font-size: 16px; }
          table { width: 100%; border-collapse: collapse; margin-top: 10px; }
          th, td { padding-top: 6px; padding-bottom: 6px; font-size: 14px; vertical-align: top; }
          thead { border-top: 1px solid #000; border-bottom: 1px solid #000; padding-block: 2px; }
          th { text-align: left; font-weight: bold; font-size: 14px; }
          .bold { font-weight: bold; }
        </style>
      </head>
      <body>
        <div class="text-center">
          <h2>${kotNo}</h2>
        </div>
        <div class="header-row">
          <div>Date: ${currentDate}</div>
          <div>Time: ${currentTime}</div>
        </div>
        <div class="info-row">
         <div>
          <span class="bold">
            ${tableNo ? tableNo : (orderType ? orderType : "")}
          </span>
        </div>
          ${orderNo ? `<div>Order: #${orderNo}</div>`: ""}
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
    </html>`;

    if (enableSilentPrinting === 1) {
      const printResponse = await fetch('http://localhost:3111/print', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ printerType: 'kot', data: kotData }),
      });

      if (!printResponse.ok) {
        throw new Error(await printResponse.text() || "Failed to print KOT");
      }
      Toaster.success("KOT printed successfully");
    } else {
      let iframe = document.getElementById("print-iframe-kot");
      if (!iframe) {
        iframe = document.createElement("iframe");
        iframe.id = "print-iframe-kot";
        iframe.style.position = "fixed";
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
  } catch (error) {
    console.error('KOT print error:', error);
    Toaster.error(error.message || 'Failed to print KOT');
  }
};

/********************* 🟢 1. Single KOT Card *********************/
const KotCard = ({ kot, onStatusUpdate }) => {
  const [updating, setUpdating] = useState(false);
  const [printing, setPrinting] = useState(false);
   




  const handleStatusUpdate = async () => {
    if (updating) return;

    let newStatus;
    switch (kot.status) {
      case 0: // pending -> in process
        newStatus = 1;
        break;
      case 1: // in process -> complete
        newStatus = 2;
        break;
      case 2: // complete -> sent
        newStatus = 3;
        break;
      case 4: // cancel
        newStatus = 5;
        break;
      default:
        return;
    }

    setUpdating(true);
    try {
      const response = await axiosInstance.put('/api/kot/updatekotstatus', {
        id: kot.id,
        status: newStatus
      });

      if (response.data?.status === 'success') {
        Toaster.success('KOT status updated successfully');
        // Refresh the data by calling the parent's refresh function
        if (onStatusUpdate) {
          onStatusUpdate();
        }
      } else {
        Toaster.error(response.data?.message || 'Failed to update KOT status');
      }
    } catch (error) {
      console.error('KOT status update error:', error);
      Toaster.error(error.response?.data?.message || 'Failed to update KOT status');
    } finally {
      setUpdating(false);
    }
  };

  const handlePrintKOT = async () => {
    if (printing) return;
    
    setPrinting(true);
    try {
      await printIndividualKOT(kot);
    } catch (error) {
      console.error('Print KOT error:', error);
      // Error handling is already done in printIndividualKOT
    } finally {
      setPrinting(false);
    }
  };

  const getButtonText = () => {
    switch (kot.status) {
      case 0:
        return 'Start Cooking';
      case 1:
        return 'Finish Cooking';
      case 2:
        return 'Sent';
      case 4:
        return 'Cancel';
      default:
        return 'Update';
    }
  };

  const getButtonClass = () => {
    switch (kot.status) {
      case 0:
        return 'btn-cook btn-primary';
      case 1:
        return 'btn-cook btn-warning';
      case 2:
        return 'btn-cook btn-success';
      case 4:
        return 'btn-cook btn-danger';
      default:
        return 'btn-cook btn-secondary';
    }
  };
const getStatusBadge = () => {
  switch (kot.status) {
    case 0:
      return <span className="status-badge status-pending">Pending</span>;
    case 1:
      return <span className="status-badge status-inprocess">In Process</span>;
    case 2:
      return <span className="status-badge status-complete">Complete</span>;
    case 3:
      return <span className="status-badge status-sent">Sent</span>;
    case 4:
      return <span className="status-badge status-cancelled">Cancelled</span>;
    // case 5:
    //   return <span className="status-badge status-hide">Hidden</span>;
    default:
      return <span className="status-badge status-unknown">Unknown</span>;
  }
};


  const getCardStyle = () => {
    switch (kot.status) {
      case 0:
        return { backgroundColor: '#f8f9fa', borderLeft: '4px solid #6c757d' }; // Queue - Gray
      case 1:
        return { backgroundColor: '#fff3cd', borderLeft: '4px solid #ffc107' }; // Cooking - Yellow
      case 2:
        return { backgroundColor: '#d1edff', borderLeft: '4px solid #28a745' }; // Ready - Green
      // case 4:
      //   return { backgroundColor: '#f8d7da', borderLeft: '4px solid #dc3545' }; // Cancelled - Red
      default:
        return { backgroundColor: '#f8f9fa', borderLeft: '4px solid #6c757d' };
    }
  };

   
  
  
     
  

  return (
    <div className="kot-card" style={getCardStyle()}>
      <div className="kot-header">
        <span className="kot-id">{kot.kot}</span>
        <div className="kot-header-right">
          <span className="kot-time">{kot.time}</span>
          {getStatusBadge()}
        </div>
      </div>

      <div className="kot-table">
       {kot.order_type}  {kot.table_no} 
      </div>

      <div className="kot-items">
        {kot.items.map((itm, idx) => (
          <p key={idx}>
            {itm.quantity} {itm.product_name}
          </p>
        ))}
      </div>

      <div className="kot-actions">
        <button 
          className={getButtonClass()}
          onClick={handleStatusUpdate}
          disabled={updating}
        >
          {updating ? 'Updating...' : getButtonText()}
        </button>
        <button 
          className="btn-print"
          onClick={handlePrintKOT}
          disabled={printing}
          title="Print KOT"
        >
          {printing ? '⏳' : '🖨️'}
        </button>
      </div>
    </div>
  );
};

/********************* 🔵 2. Dashboard with auto‑refresh *********************/
const REFRESH_INTERVAL = 600; // seconds

const KotDashboard = () => {

  /* sidebar */
    const [kotStatusFilter, setKotStatusFilter] = useState("all");
    const [foodeName, setFooderName] = useState("");
       const [staffType, setStaffType] = useState(null);
  // const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  // const toggleSidebar = () => setIsSidebarOpen((s) => !s);
  
   const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    // const toggleSidebar = () => setIsSidebarOpen((s) => !s);
    const { logout } = useAuth();

  /* KOT data */
  const [kots, setKots] = useState([]);
  const [loading, setLoading] = useState(false);

  /* countdown */
  const [secondsLeft, setSecondsLeft] = useState(REFRESH_INTERVAL);
  const timerRef = useRef(null);

  /* ******************************************
     fetchLiveOrders – re‑usable fetch routine
  ******************************************* */

     const filteredKots = kotStatusFilter === "all" ? kots : kots.filter(k => {
  if (kotStatusFilter === "queue") return k.status === 0;
  if (kotStatusFilter === "cooking") return k.status === 1;
  if (kotStatusFilter === "ready") return k.status === 2;
  if (kotStatusFilter === "cancel") return k.status === 4;
  return true;
});

  // const fetchLiveOrders = async () => {
  //   try {
  //     setLoading(true);
  //     const { data } = await axiosInstance.get(KotGetAPI);

  //     if (data?.status === "success") {
  //       const mapped = (data.data || []).map((k) => ({
  //         id: k.id,
  //         kot: k.kot,                 // e.g. "KOT - 1"
  //         order_type: k.order_type,   // "DINE IN"
  //         table_no: k.table_no,       // "Table No- 6"
  //         time: k.time,               // "3:13 PM"
  //         status: k.status || 0, 
  //          order_number: k.order_number,     // KOT status: 0=pending, 1=in process, 2=complete, 4=cancel
  //         items: (k.final_kot_details || []).map((d) => ({
  //           product_name: d.product_name,
  //           quantity: d.quantity,
  //         })),
  //       }));
  //       setKots(mapped);
  //     } else {
  //       Toaster.error(data?.message || "Failed to fetch live orders");
  //       setKots([]);
  //     }
  //   } catch (err) {
  //     Toaster.error(
  //       err.response?.data?.message || err.message || "Failed to fetch live orders"
  //     );
  //     setKots([]);
  //   } finally {
  //     setLoading(false);
  //     setSecondsLeft(REFRESH_INTERVAL); // reset countdown
  //   }
  // };
  
  const fetchLiveOrders = async () => {
  try {
    setLoading(true);
    const { data } = await axiosInstance.get(KotGetAPI);

    if (data?.status === "success") {
      const mapped = (data.data || []).map((k) => ({
        id: k.id,
        kot: k.kot,
        order_type: k.order_type,
        table_no: k.table_no,
        time: k.time,
        status: k.status || 0,
        order_number: k.order_number,
        // ✅ Updated: Map items with variant and addon data
        items: (k.final_kot_details || []).map((d) => ({
          product_name: d.product_name || d.name,
          quantity: d.quantity,
          // Include variant data
          selectedvariants: d.selectedvariants || null,
          // Include addon data
          selectedAddons: d.selectedAddons || [],
          // Include notes
          product_special_note: d.product_special_note || d.note || "",
        })),
      }));
      setKots(mapped);
    } else {
      Toaster.error(data?.message || "Failed to fetch live orders");
      setKots([]);
    }
  } catch (err) {
    Toaster.error(
      err.response?.data?.message || err.message || "Failed to fetch live orders"
    );
    setKots([]);
  } finally {
    setLoading(false);
    setSecondsLeft(REFRESH_INTERVAL);
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
              setFooderName(appData.fooder_name);
                setStaffType(appData.staff_type);
             
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

  /* -------- mount + interval logic -------- */
  useEffect(() => {
    /* run immediately */
    fetchLiveOrders();

    /* every 1 s update countdown, every 600 s refetch */
    timerRef.current = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev === 1) {
          fetchLiveOrders();        // triggers new data
          return REFRESH_INTERVAL;  // restart countdown
        }
        return prev - 1;
      });
    }, 1000);

    /* cleanup on unmount */
    return () => clearInterval(timerRef.current);
  }, []);

  /* -------------------- UI -------------------- */
  return (
    <>
      {/* fixed top header */}
      {/* <div style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 1040 }}>
        <MainHeader toggleSidebar={toggleSidebar} />
      </div> */}

     
        {/* <Sidebar isOpen={isSidebarOpen} /> */}

        {/* main scroll‑area */}
         
         <nav
              className="navbar navbar-expand-lg px-3  fixed-top border-bottom"
              style={{ backgroundColor: "#FFFFFF", height: "80px", zIndex: 1100 ,paddingBlock:"32px", }}
            >
              <div className="container-fluid d-flex justify-content-between align-items-center py-3">
                <div className="d-flex align-items-center gap-3 ">
                  {/* <i
                    className="bi bi-list text-black fs-3 fw-bold"
                    style={{ cursor: "pointer", fontWeight: "bold" }}
                    role="button"
                    onClick={toggleSidebar}
                  ></i> */}
                  <FaBars className="fs-5"
                    style={{ cursor: "pointer", fontWeight: "bold" }}
                    role="button"

                     onClick={() => setIsSidebarOpen(!isSidebarOpen)} // Toggle state
                  />
        
                  <span className="text-black fw-bold fs-5">
                    VYFOO
                  </span>
                  <span className="text-black fw-semibold  fs-5" style={{fontWeight:"400"}}>
                    <span className="text-black">Hello</span>, {foodeName}
                  </span>
                </div>
        
                
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
      transform: isSidebarOpen ? 'translateX(0)' : 'translateX(-100%)', // Slide in/out
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
                fontSize:"17px",
                fontWeight:"600",
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
                 fontSize:"17px",
                fontWeight:"600",
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
      <br/><strong style={{fontSize:"10px"}}> Vyqda Technologies Pvt. Ltd. All Rights Reserved.</strong>
    </div>
  </div>
        </div>
                 
              
            <div className="d-flex justify-content-end align-items-center gap-3">
  <div style={{fontSize:"18px"}}>
   The Page will refresh in <strong>{secondsLeft}s</strong>
  </div>
  <Link
    className="btn btn-sm fw-semibold px-2 py-2 pos-btn-custom"
    style={{
      backgroundColor: "#f59e0b",
      color: "#fff",
      fontWeight: "700",
    }}
    to="/pos"
  >
    <span className="ps-1">New Order</span>
  </Link>
</div>

              </div>
            </nav>
        <div
          className="custom-scroll"
          style={{
            // marginLeft: isSidebarOpen ? "250px" : "60px",
            marginTop: "56px",
            padding: "20px",
            transition: "margin-left 0.3s ease",
            width: "100%",
            height: "calc(100vh - 56px)",
            overflowY: "auto",
            background: "#f4f5f7",
          }}
        >
        
          {/* <h3 className="fw-bold mt-2 mb-4">
            Today KOT
          </h3> */}

          <div className="bg-white shadow-sm rounded p-3 mt-4">
            {/* ---- refresh timer ---- */}
          
              <div className="d-flex align-items-center gap-3 flex-wrap">
  <div className="d-flex align-items-center">
    <span
      className="me-1"
      style={{
        display: "inline-block",
        width: "16px",
        height: "16px",
        backgroundColor: "#d1d5db", // grey
        borderRadius: "4px",
      }}
    ></span>
    <span>Queue KOT</span>
  </div>

  <div className="d-flex align-items-center">
    <span
      className="me-1"
      style={{
        display: "inline-block",
        width: "16px",
        height: "16px",
        backgroundColor: "#f59e0b", // yellow
        borderRadius: "4px",
      }}
    ></span>
    <span>Cooking KOT</span>
  </div>

  <div className="d-flex align-items-center">
    <span
      className="me-1"
      style={{
        display: "inline-block",
        width: "16px",
        height: "16px",
        backgroundColor: "#10b981", // green
        borderRadius: "4px",
      }}
    ></span>
    <span>Ready KOT</span>
  </div>

  {/* <div className="d-flex align-items-center">
    <span
      className="me-1"
      style={{
        display: "inline-block",
        width: "16px",
        height: "16px",
        backgroundColor: "#dc2626", // red
        borderRadius: "4px",
      }}
    ></span>
    <span>Cancel KOT</span>
  </div> */}
</div>

         

            {/* ---- dashboard ---- */}
            <div className="kot-dashboard">
              <h1 className="dashboard-title">{foodeName}</h1>
 <div className="d-flex justify-content-between align-items-center flex-wrap" style={{ gap: "12px" }}>
  {/* Left Side - Status Filters */}
  <div className="d-flex align-items-center flex-wrap" style={{ gap: "12px" }}>
    {[
      { label: "All", value: "all", color: "#2563eb" },
      { label: "Queue KOT", value: "queue", color: "#d1d5db" },
      { label: "Cooking KOT", value: "cooking", color: "#f59e0b" },
      { label: "Ready KOT", value: "ready", color: "#10b981" },
     
    ].map((item) => {
      const isActive = kotStatusFilter === item.value;

      return (
        <div
          key={item.value}
          onClick={() => setKotStatusFilter(item.value)}
          style={{
            cursor: "pointer",
            backgroundColor: isActive ? item.color : "#ffffff",
            color: isActive ? "#ffffff" : "#000000",
            padding: "6px 12px",
            borderRadius: "8px",
            display: "flex",
            alignItems: "center",
            fontWeight: "700",
            fontSize: "14px",
            border: `1px solid ${isActive ? item.color : "#d1d5db"}`,
            boxShadow: isActive ? "0 2px 6px rgba(0,0,0,0.1)" : "none",
            transition: "all 0.2s ease",
          }}
        >
          <span
            style={{
              width: "14px",
              height: "14px",
              backgroundColor: item.color,
              borderRadius: "3px",
              marginRight: "8px",
              display: "inline-block",
              border: "1px solid #ccc",
            }}
          ></span>
          {item.label}
        </div>
      );
    })}
  </div>

  {/* Right Side - Cancel Button */}
  <Link
    className="btn"
    style={{
      backgroundColor:"#dc2626",
      color:"#fff",
  
      padding: "6px 16px",
      fontWeight: "600",
      borderRadius: "8px",
      fontSize: "14px",
    }}
    to="/pos"
    // 👈 Replace with your actual function
  >
    Close
  </Link>
</div>




              {loading ? (
                <LoadingModal isLoading={loading} />
              ) : (
              <div className="kot-grid" style={{   marginTop:"20px", flexWrap: "wrap" }}>
  {filteredKots.length > 0 ? (
    filteredKots.map((kot) => (
      <KotCard key={kot.id} kot={kot} onStatusUpdate={fetchLiveOrders} />
    ))
  ) : (
    <div
      style={{
        color: "#000",
        fontSize: "18px",
        fontWeight: "500",
        textAlign: "center",
      }}
    >
      No KOT Data found
    </div>
  )}
</div>

              )}
            </div>
          </div>
        </div>
    
    </>
  );
};

export default KotDashboard;