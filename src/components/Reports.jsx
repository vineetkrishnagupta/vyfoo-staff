import React, { useState, useEffect } from 'react';
import MainHeader from './MainHeader';
import Sidebar from './Sidebar';
import axiosInstance from '../utlis/axiosinstance';
import { ReportsDataAPI } from '../BaseURL/baseURL';
import LoadingModal from '../utlis/LoadingModal';
import Toaster from '../utlis/Toaster';
import jsPDF from "jspdf";
import "jspdf-autotable";
import * as XLSX from 'xlsx';

function Reports() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [date, setDate] = useState('');
  const [reportData, setReportData] = useState(null);
  const [fullLoader, setFullLoader] = useState(false);

  // Utility functions
  const getToday = () => {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB');
  };

  const formatDateRange = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB');
  };

  useEffect(() => {
    // Set default date to today in yyyy-mm-dd format
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    setDate(`${yyyy}-${mm}-${dd}`);
  }, []);

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

  const handleGenerateReport = async () => {
    if (!date) {
      alert('Please select a date!');
      return;
    }
    setFullLoader(true);
    try {
      const url = `${ReportsDataAPI}?date=${date}`;
      const res = await axiosInstance.get(url);

      // Check if backend returns success but with "Data Not Available" message
      if (res.data && res.data.status === "success") {
        if (res.data.message && res.data.message.includes("Data Not Available")) {
          Toaster.error(res.data.message);
          setReportData(null);
        } else {
          setReportData(res.data);
          Toaster.success("Report generated successfully");
        }
      } else {
        // Handle other success cases or set data
        setReportData(res.data);
      }
    } catch (err) {
      // Show backend error message if available
      if (err.response && err.response.data) {
        Toaster.error(
          typeof err.response.data === 'string'
            ? err.response.data
            : err.response.data.message || JSON.stringify(err.response.data)
        );
      } else {
        Toaster.error(err.message || "Failed to generate report");
      }
      setReportData(null);
    } finally {
      setFullLoader(false);
    }
  };

  const handleReset = () => {
    // Reset to today's date
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    setDate(`${yyyy}-${mm}-${dd}`);
    setReportData(null);
  };

  const handleGoBack = () => {
    window.history.back();
  };

  const [formData, setFormData] = useState({
    start_date: getToday(),
    end_date: "",
    order_mode: "",
  });

  const downloadPdfDocument = () => {
    if (!reportData) {
      Toaster.error("No report data available to generate PDF");
      return;
    }

    try {
      const doc = new jsPDF();

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
          margin: 0
        },
        bodyStyles: {
          fillColor: [255, 255, 255],
          textColor: [0, 0, 0],
          halign: "right",
          valign: "middle",
        },
        footStyles: {
          fillColor: [220, 220, 220],
          textColor: [0, 0, 0],
          halign: "left",
          valign: "middle",
          fontStyle: "bold",
        },
        margin: { top: 10, left: 10, right: 10 },
        didParseCell: function (data) {
          if (data.row.section === "body" && data.column.dataKey === 0) {
            // Left align the first column cells
            data.cell.styles.halign = "left";
          }
          if (data.row.section === "head" && data.row.index === 0) {
            // Center align the cells in the first row (header row)
            data.cell.styles.halign = "center";
          }
          if (data.cell && data.cell.raw instanceof HTMLTableCellElement) {
            const h4 = data.cell.raw.querySelector('h4');
            if (h4) {
              data.cell.styles.fontSize = 16;
              data.cell.styles.halign = 'center';
              data.cell.styles.textColor = '#ffcb44';
              data.cell.styles.font = 'gilroy';
            }
          }
          if (data.cell && data.cell.raw instanceof HTMLTableCellElement) {
            const h5 = data.cell.raw.querySelector('h5');
            if (h5) {
              data.cell.styles.fontSize = 9;
              data.cell.styles.halign = 'left';
              data.cell.styles.fontStyle = 'bold';
            }
          }
          if (data.cell && data.cell.raw instanceof HTMLTableCellElement) {
            const h6 = data.cell.raw.querySelector('h6');
            if (h6) {
              data.cell.styles.fontSize = 12;
              data.cell.styles.halign = 'center';
              data.cell.styles.fontStyle = 'bold';
            }
          }
        },
      });

      doc.save(
        `Daily-Sales-Report-${formatDateRange(date)}.pdf`
      );
      Toaster.success("PDF generated successfully");
    } catch (error) {
      Toaster.error("Failed to generate PDF: " + error.message);
    }
  };

  const exportToExcel = () => {
    if (!reportData) {
      Toaster.error("No report data available to export to Excel");
      return;
    }

    try {
      var table_elt = document.getElementById("excelContent");

      // Get the first row of the table
      var firstRow = table_elt.rows[0];

      // Apply text-align: center style to each cell in the first row
      for (var i = 0; i < firstRow.cells.length; i++) {
        firstRow.cells[i].style.textAlign = "center";
      }

      var workbook = XLSX.utils.table_to_book(table_elt);

      XLSX.writeFile(
        workbook,
        `Daily-Sales-Report-${getToday()}.xlsx`
      );
      Toaster.success("Excel file exported successfully");
    } catch (error) {
      Toaster.error("Failed to export Excel file: " + error.message);
    }
  };

  return (
    <>
      <div style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 1040 }} >
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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', }}>
  <h2 className='fw-bold mt-2 mb-0'>Daily Sales Report</h2>
  <div>
    <button
      onClick={downloadPdfDocument}
      style={{
        background: '#FFD966',
        color: '#333',
        border: 'none',
        borderRadius: 4,
        padding: '8px 14px',
        marginRight: 8,
        fontWeight: 500,
        cursor: 'pointer'
      }}
    >
      Generate PDF
    </button>
    <button
      onClick={exportToExcel}
      style={{
        background: '#FFD966',
        color: '#333',
        border: 'none',
        borderRadius: 4,
        padding: '8px 14px',
        fontWeight: 500,
        cursor: 'pointer'
      }}
    >
      Export to Excel
    </button>
  </div>
</div>

          <div style={{
            backgroundColor: 'white',
            borderRadius: '8px',
            padding: '20px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            position: 'relative',
            minHeight: '250px',
            marginTop: "15px"
          }}>
            {/* Top row: Title and Export buttons */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            
          
            </div>
            <p style={{ color: '#666', lineHeight: '1.5', marginBottom: 24 }}>
              Daily sales report is a record of a business' sales activity for any one day.
              It includes statistics on the amount of products sold, revenue generated,
              applicable discounts given, and other relevant factors.
            </p>
            {/* Form Row */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
              <label style={{ fontWeight: 500, color: '#333', marginRight: 8 }}>Date*</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                style={{
                  padding: '8px 12px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  width: '180px',
                  marginRight: 12
                }}
                required
              />
              <button
                style={{
                  backgroundColor: '#FFD966',
                  color: '#333',
                  padding: '8px 18px',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: fullLoader ? 'not-allowed' : 'pointer',
                  fontWeight: 500,
                  marginRight: 8,
                  opacity: fullLoader ? 0.6 : 1
                }}
                onClick={handleGenerateReport}
                disabled={fullLoader}
              >
                {fullLoader ? 'Loading...' : 'Submit'}
              </button>
              <button
                style={{
                  backgroundColor: '#eee',
                  color: '#333',
                  padding: '8px 18px',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontWeight: 500
                }}
                onClick={handleReset}
              >
                Reset
              </button>
            </div>
            {/* Report Data */}
            {reportData && (
              <div style={{ marginTop: 16 }}>
                {/* Summary Section */}
                <div style={{ marginBottom: 24 }}>
                  <div style={{ fontWeight: 700, fontSize: 18, borderBottom: '1.5px solid #eee', marginBottom: 8, paddingBottom: 4 }}>Summary</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 32 }}>
                    <div>Total Sales: <b>₹{Number(reportData.totalOfAllTotals).toFixed(2)}</b></div>
                    <div>Total Transactions: <b>{reportData.totalTransaction}</b></div>
                    <div>Average Transaction Value: <b>₹{Number(reportData.average_transation).toFixed(2)}</b></div>
                    <div>No. of Persons Served: <b>{reportData.totalEaters}</b></div>
                    <div>Acquired Customers: <b>{reportData.totalAquireCustomerCount}</b></div>
                  </div>
                </div>
                {/* Sales Breakdown by Order Type */}
                <div style={{ marginBottom: 24 }}>
                  <div style={{ fontWeight: 700, fontSize: 16, borderBottom: '1.5px solid #eee', marginBottom: 8, paddingBottom: 4 }}>Sales Breakdown by Order Type</div>
                  <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 8 }}>
                    <thead>
                      <tr style={{ background: '#f9f9f9' }}>
                        <th style={{ textAlign: 'left', padding: 6 }}>Type</th>
                        <th style={{ textAlign: 'right', padding: 6 }}>Total Sales</th>
                        <th style={{ textAlign: 'right', padding: 6 }}>Transactions</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td>Delivery</td>
                        <td style={{ textAlign: 'right' }}>₹{Number(reportData.salesByOrderType?.delivery?.total || 0).toFixed(2)}</td>
                        <td style={{ textAlign: 'right' }}>{reportData.orderTypeCounts?.delivery || 0}</td>
                      </tr>
                      <tr>
                        <td>Dine-in</td>
                        <td style={{ textAlign: 'right' }}>₹{Number(reportData.salesByOrderType?.dine_in?.total || 0).toFixed(2)}</td>
                        <td style={{ textAlign: 'right' }}>{reportData.orderTypeCounts?.dine_in || 0}</td>
                      </tr>
                      <tr>
                        <td>Take Away</td>
                        <td style={{ textAlign: 'right' }}>₹{Number(reportData.salesByOrderType?.take_away?.total || 0).toFixed(2)}</td>
                        <td style={{ textAlign: 'right' }}>{reportData.orderTypeCounts?.take_away || 0}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                {/* Category Sales Breakdown */}
                <div style={{ marginBottom: 24 }}>
                  <div style={{ fontWeight: 700, fontSize: 16, borderBottom: '1.5px solid #eee', marginBottom: 8, paddingBottom: 4 }}>Category Sales Breakdown</div>
                  <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 8 }}>
                    <thead>
                      <tr style={{ background: '#f9f9f9' }}>
                        <th style={{ textAlign: 'left', padding: 6 }}>Category</th>
                        <th style={{ textAlign: 'right', padding: 6 }}>Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reportData.menuTotalsArray && reportData.menuTotalsArray.map((menu) => (
                        <tr key={menu.menu_id}>
                          <td>{menu.menu_name}</td>
                          <td style={{ textAlign: 'right' }}>₹{Number(menu.total).toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {/* Payment Type Breakdown */}
                <div style={{ marginBottom: 24 }}>
                  <div style={{ fontWeight: 700, fontSize: 16, borderBottom: '1.5px solid #eee', marginBottom: 8, paddingBottom: 4 }}>Payment Type Breakdown</div>
                  <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 8 }}>
                    <thead>
                      <tr style={{ background: '#f9f9f9' }}>
                        <th style={{ textAlign: 'left', padding: 6 }}>Type</th>
                        <th style={{ textAlign: 'right', padding: 6 }}>Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr><td>Card</td><td style={{ textAlign: 'right' }}>₹{Number(reportData.paymentType?.card || 0).toFixed(2)}</td></tr>
                      <tr><td>Cash</td><td style={{ textAlign: 'right' }}>₹{Number(reportData.paymentType?.cash || 0).toFixed(2)}</td></tr>
                      <tr><td>UPI</td><td style={{ textAlign: 'right' }}>₹{Number(reportData.paymentType?.upi || 0).toFixed(2)}</td></tr>
                      <tr><td>NEFT</td><td style={{ textAlign: 'right' }}>₹{Number(reportData.paymentType?.neft || 0).toFixed(2)}</td></tr>
                      <tr><td>Zomato</td><td style={{ textAlign: 'right' }}>₹{Number(reportData.paymentType?.zomato || 0).toFixed(2)}</td></tr>
                      <tr><td>Swiggy</td><td style={{ textAlign: 'right' }}>₹{Number(reportData.paymentType?.swiggy || 0).toFixed(2)}</td></tr>
                      <tr><td>Dineout</td><td style={{ textAlign: 'right' }}>₹{Number(reportData.paymentType?.dineout || 0).toFixed(2)}</td></tr>
                    </tbody>
                  </table>
                </div>
                {/* Discounts */}
                <div style={{ marginBottom: 24 }}>
                  <div style={{ fontWeight: 700, fontSize: 16, borderBottom: '1.5px solid #eee', marginBottom: 8, paddingBottom: 4 }}>Discounts</div>
                  <div>Total Discounts: <b>₹{Number(reportData.totalDiscount || 0).toFixed(2)}</b></div>
                </div>
                {/* Service Charge */}
                <div style={{ marginBottom: 24 }}>
                  <div style={{ fontWeight: 700, fontSize: 16, borderBottom: '1.5px solid #eee', marginBottom: 8, paddingBottom: 4 }}>Service Charge</div>
                  <div>Total Service Charge: <b>₹{Number(reportData.salesByOrderType?.dine_in?.serviceCharge || 0) + Number(reportData.salesByOrderType?.take_away?.serviceCharge || 0) + Number(reportData.salesByOrderType?.delivery?.serviceCharge || 0)}</b></div>
                </div>
                {/* Taxes */}
                <div style={{ marginBottom: 24 }}>
                  <div style={{ fontWeight: 700, fontSize: 16, borderBottom: '1.5px solid #eee', marginBottom: 8, paddingBottom: 4 }}>Taxes</div>
                  <div>
                    Total Tax: <b>
                      ₹{(
                        Number(reportData.salesByOrderType?.dine_in?.tax || 0) +
                        Number(reportData.salesByOrderType?.take_away?.tax || 0) +
                        Number(reportData.salesByOrderType?.delivery?.tax || 0)
                      ).toFixed(2)}
                    </b>
                  </div>
                </div>
              </div>
            )}
          </div>
          {/* Loader Modal */}
          <LoadingModal isLoading={fullLoader} />

          {/* Hidden PDF Content */}
          <div style={{ display: 'none' }}>
            <table id="pdfContent" className="table table-bordered">
              <thead>
                <tr>
                  <th colSpan={8}>
                    <center>
                      <h4> {localStorage.getItem('restaurantName')} (Daily Sales Report)</h4>
                    </center>
                  </th>
                </tr>
                <tr style={{ textAlign: 'right' }}>
                  <th colSpan={8}>Download Date : {formatDate(getToday())}</th>
                </tr>
                <tr style={{ textAlign: 'right' }}>
                  <th colSpan={8}>Report's Date : {formatDate(date)}</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <th colSpan={8}>
                    <h6>Summary</h6>
                  </th>
                </tr>
                <tr>
                  <td colSpan={4}>
                    Total Sales:
                  </td>
                  <td colSpan={4}>
                    {"Rs."}{reportData?.totalOfAllTotals || 0}
                  </td>
                </tr>
                <tr>
                  <td colSpan={4}>
                    Total Transactions:
                  </td>
                  <td colSpan={4}>
                    {reportData?.totalTransaction || 0}
                  </td>
                </tr>
                <tr>
                  <td colSpan={4}>
                    Average Transaction Value:
                  </td>
                  <td colSpan={4}>
                    {"Rs."}{reportData?.average_transation || 0}
                  </td>
                </tr>
                <tr>
                  <td colSpan={4}>
                    No of Person Served:
                  </td>
                  <td colSpan={4}>
                    {reportData?.totalEaters || 0}
                  </td>
                </tr>
                <tr>
                  <td colSpan={4}>
                    Aquire Customer:
                  </td>
                  <td colSpan={4}>
                    {reportData?.totalAquireCustomerCount || 0}
                  </td>
                </tr>
                <tr>
                  <th colSpan={8}>
                    <h6>Sales Breakdown by Order Types</h6>
                  </th>
                </tr>
                <tr>
                  <th>
                    Delivery
                  </th>
                </tr>
                {reportData?.orderTypeCounts?.delivery ?
                  <tr>
                    <th colSpan={4}>
                      Total Sales: {"Rs."}{reportData.salesByOrderType.delivery.total}
                    </th>
                    <th colSpan={4}>
                      Transactions: {reportData.orderTypeCounts.delivery}
                    </th>
                  </tr>
                  : <tr>
                    <th colSpan={4}>
                      Total Sales: {"Rs."}0
                    </th>
                    <th colSpan={4}>
                      Transactions: 0
                    </th>
                  </tr>}
                <tr>
                  <th>
                    Dine In:
                  </th>
                </tr>
                {reportData?.orderTypeCounts?.dine_in ?
                  <tr>
                    <th colSpan={4}>
                      Total Sales: {"Rs."}{reportData.salesByOrderType.dine_in.total}
                    </th>
                    <th colSpan={4}>
                      Transactions: {reportData.orderTypeCounts.dine_in}
                    </th>
                  </tr>
                  : <tr>
                    <th colSpan={4}>
                      Total Sales: {"Rs."}0
                    </th>
                    <th colSpan={4}>
                      Transactions: 0
                    </th>
                  </tr>}
                <tr>
                  <th colSpan={4}>
                    Take Away:
                  </th>
                </tr>
                {reportData?.orderTypeCounts?.take_away ?
                  <tr>
                    <th colSpan={4}>
                      Total Sales: {"Rs."}{reportData.salesByOrderType.take_away.total}
                    </th>
                    <th colSpan={4}>
                      Transactions: {reportData.orderTypeCounts.take_away}
                    </th>
                  </tr>
                  : <tr>
                    <th colSpan={4}>
                      Total Sales: {"Rs."}0
                    </th>
                    <th colSpan={4}>
                      Transactions: 0
                    </th>
                  </tr>}
                <tr>
                  <th colSpan={8}>
                    <h6>Category Sales Breakdown</h6>
                  </th>
                </tr>
                {reportData?.menuTotalsArray?.map(item => (
                  <tr key={item.menu_name}>
                    <th colSpan={4}>
                      {item.menu_name}:
                    </th>
                    <th colSpan={4}>
                      {"Rs."}{item.total}
                    </th>
                  </tr>
                ))}
                {reportData?.paymentType ? <>
                  <tr>
                    <th colSpan={8}>
                      <h6>Payment Type Breakdown</h6>
                    </th>
                  </tr>
                  <tr>
                    <th colSpan={4}>
                      Card:
                    </th>
                    <th colSpan={4}>
                      {"Rs."}{parseFloat(reportData.paymentType.card || 0).toFixed(2)}
                    </th>
                  </tr>
                  <tr>
                    <th colSpan={4}>
                      Cash:
                    </th>
                    <th colSpan={4}>
                      {"Rs."}{parseFloat(reportData.paymentType.cash || 0).toFixed(2)}
                    </th>
                  </tr>
                  <tr>
                    <th colSpan={4}>
                      UPI:
                    </th>
                    <th colSpan={4}>
                      {"Rs."}{parseFloat(reportData.paymentType.upi || 0).toFixed(2)}
                    </th>
                  </tr>
                  <tr>
                    <th colSpan={4}>
                      NEFT:
                    </th>
                    <th colSpan={4}>
                      {"Rs."}{parseFloat(reportData.paymentType.neft || 0).toFixed(2)}
                    </th>
                  </tr>
                  <tr>
                    <th colSpan={4}>
                      Zomato:
                    </th>
                    <th colSpan={4}>
                      {"Rs."}{parseFloat(reportData.paymentType.zomato || 0).toFixed(2)}
                    </th>
                  </tr>
                  <tr>
                    <th colSpan={4}>
                      Swiggy:
                    </th>
                    <th colSpan={4}>
                      {"Rs."}{parseFloat(reportData.paymentType.swiggy || 0).toFixed(2)}
                    </th>
                  </tr>
                  <tr>
                    <th colSpan={4}>
                      Dineout:
                    </th>
                    <th colSpan={4}>
                      {"Rs."}{parseFloat(reportData.paymentType.dineout || 0).toFixed(2)}
                    </th>
                  </tr>
                </> : <></>}
                <tr>
                  <th colSpan={8}>
                    <h6>Discounts</h6>
                  </th>
                </tr>
                <tr>
                  <th colSpan={4}>
                    Total Discounts:
                  </th>
                  <th colSpan={4}>
                    {"Rs."}
                    {(
                      (reportData?.orderTypeCounts?.dine_in ? parseFloat(reportData.salesByOrderType.dine_in.discount || 0) : 0) +
                      (reportData?.orderTypeCounts?.take_away ? parseFloat(reportData.salesByOrderType.take_away.discount || 0) : 0) +
                      (reportData?.orderTypeCounts?.delivery ? parseFloat(reportData.salesByOrderType.delivery.discount || 0) : 0)
                    ).toFixed(2)}
                  </th>
                </tr>
                <tr>
                  <th colSpan={8}>
                    <h6>Service Charge</h6>
                  </th>
                </tr>
                <tr>
                  <th colSpan={4}>
                    Total Service Charge:
                  </th>
                  <th colSpan={4}>
                    {"Rs."}
                    {(
                      (reportData?.orderTypeCounts?.dine_in ? parseFloat(reportData.salesByOrderType.dine_in.serviceCharge || 0) : 0) +
                      (reportData?.orderTypeCounts?.take_away ? parseFloat(reportData.salesByOrderType.take_away.serviceCharge || 0) : 0) +
                      (reportData?.orderTypeCounts?.delivery ? parseFloat(reportData.salesByOrderType.delivery.serviceCharge || 0) : 0)
                    ).toFixed(2)}
                  </th>
                </tr>
                <tr>
                  <th colSpan={8}>
                    <h6>Tax</h6>
                  </th>
                </tr>
                <tr>
                  <th colSpan={4}>
                    Total Taxes:
                  </th>
                  <th colSpan={4}>
                    {"Rs."}
                    {(
                      (reportData?.orderTypeCounts?.dine_in ? parseFloat(reportData.salesByOrderType.dine_in.tax || 0) : 0) +
                      (reportData?.orderTypeCounts?.take_away ? parseFloat(reportData.salesByOrderType.take_away.tax || 0) : 0) +
                      (reportData?.orderTypeCounts?.delivery ? parseFloat(reportData.salesByOrderType.delivery.tax || 0) : 0)
                    ).toFixed(2)}
                  </th>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Hidden Excel Content */}
          <div style={{ display: 'none' }}>
            <table id="excelContent">
              <thead>
                <tr>
                  <th>
                    <center>
                      <h4> {localStorage.getItem('restaurantName')} (Daily Sales Report)</h4>
                    </center>
                  </th>
                </tr>
                <tr>
                  <th>Download Date : {formatDate(getToday())}</th>
                </tr>
                <tr>
                  <th>Report's Date : {formatDate(date)}</th>
                </tr>
              </thead>
              <tbody>
                <tr /><tr />
                <tr>
                  <th>
                    <b>Summary:</b>
                  </th>
                </tr>
                <tr>
                  <td>
                    Total Sales: {"Rs."}{reportData?.totalOfAllTotals || 0}
                  </td>
                </tr>
                <tr>
                  <td>
                    Total Transactions: {reportData?.totalTransaction || 0}
                  </td>
                </tr>
                <tr>
                  <td>
                    Average Transaction Value: {"Rs."}{reportData?.average_transation || 0}
                  </td>
                </tr>
                <tr>
                  <td>
                    No of Person Served: {reportData?.totalEaters || 0}
                  </td>
                </tr>
                <tr>
                  <td>
                    Aquire Customer: {reportData?.totalAquireCustomerCount || 0}
                  </td>
                </tr>
                <tr /><tr />
                <tr>
                  <th>
                    <b>Sales Breakdown by Order Types:</b>
                  </th>
                </tr>
                <tr />
                <tr>
                  <th>
                    Delivery
                  </th>
                </tr>
                {reportData?.orderTypeCounts?.delivery ?
                  <tr>
                    <th colSpan={4}>
                      Total Sales: {"Rs."}{reportData.salesByOrderType.delivery.total}
                    </th>
                    <th colSpan={4}>
                      Transactions: {reportData.orderTypeCounts.delivery}
                    </th>
                  </tr>
                  : <tr>
                    <th colSpan={4}>
                      Total Sales: {"Rs."}0
                    </th>
                    <th colSpan={4}>
                      Transactions: 0
                    </th>
                  </tr>}
                <tr />
                <tr>
                  <th>
                    Dine In:
                  </th>
                </tr>
                {reportData?.orderTypeCounts?.dine_in ?
                  <tr>
                    <th>
                      Total Sales: {"Rs."}{reportData.salesByOrderType.dine_in.total}
                    </th>
                    <th>
                      Transactions: {reportData.orderTypeCounts.dine_in}
                    </th>
                  </tr>
                  : <tr>
                    <th>
                      Total Sales: {"Rs."}0
                    </th>
                    <th>
                      Transactions: 0
                    </th>
                  </tr>}
                <tr />
                <tr>
                  <th>
                    Take Away:
                  </th>
                </tr>
                {reportData?.orderTypeCounts?.take_away ?
                  <tr>
                    <th>
                      Total Sales: {"Rs."}{reportData.salesByOrderType.take_away.total}
                    </th>
                    <th>
                      Transactions: {reportData.orderTypeCounts.take_away}
                    </th>
                  </tr>
                  : <tr>
                    <th>
                      Total Sales: {"Rs."}0
                    </th>
                    <th>
                      Transactions: 0
                    </th>
                  </tr>}
                <tr />
                <tr>
                  <th>
                    <b>Category Sales Breakdown:</b>
                  </th>
                </tr>
                {reportData?.menuTotalsArray?.map(item => (
                  <tr key={item.menu_name}>
                    <th>
                      {item.menu_name}:
                    </th>
                    <th>
                      {"Rs."}{item.total}
                    </th>
                  </tr>
                ))}
                {reportData?.paymentType ? <>
                  <tr />
                  <tr>
                    <th>
                      <h6>Payment Type Breakdown</h6>
                    </th>
                  </tr>
                  <tr>
                    <th>
                      Card:
                    </th>
                    <th>
                      {"Rs."}{parseFloat(reportData.paymentType.card || 0).toFixed(2)}
                    </th>
                  </tr>
                  <tr>
                    <th>
                      Cash:
                    </th>
                    <th>
                      {"Rs."}{parseFloat(reportData.paymentType.cash || 0).toFixed(2)}
                    </th>
                  </tr>
                  <tr>
                    <th>
                      UPI:
                    </th>
                    <th>
                      {"Rs."}{parseFloat(reportData.paymentType.upi || 0).toFixed(2)}
                    </th>
                  </tr>
                  <tr>
                    <th>
                      NEFT:
                    </th>
                    <th>
                      {"Rs."}{parseFloat(reportData.paymentType.neft || 0).toFixed(2)}
                    </th>
                  </tr>
                  <tr>
                    <th colSpan={4}>
                      Zomato:
                    </th>
                    <th colSpan={4}>
                      {"Rs."}{parseFloat(reportData.paymentType.zomato || 0).toFixed(2)}
                    </th>
                  </tr>
                  <tr>
                    <th colSpan={4}>
                      Swiggy:
                    </th>
                    <th colSpan={4}>
                      {"Rs."}{parseFloat(reportData.paymentType.swiggy || 0).toFixed(2)}
                    </th>
                  </tr>
                  <tr>
                    <th colSpan={4}>
                      Dineout:
                    </th>
                    <th colSpan={4}>
                      {"Rs."}{parseFloat(reportData.paymentType.dineout || 0).toFixed(2)}
                    </th>
                  </tr>
                </> : <></>}
                <tr />
                <tr>
                  <th>
                    Discounts:
                  </th>
                </tr>
                <tr>
                  <th>
                    Total Discounts:
                  </th>
                  <th>
                    {"Rs."}
                    {(
                      (reportData?.orderTypeCounts?.dine_in ? parseFloat(reportData.salesByOrderType.dine_in.discount || 0) : 0) +
                      (reportData?.orderTypeCounts?.take_away ? parseFloat(reportData.salesByOrderType.take_away.discount || 0) : 0) +
                      (reportData?.orderTypeCounts?.delivery ? parseFloat(reportData.salesByOrderType.delivery.discount || 0) : 0)
                    ).toFixed(2)}
                  </th>
                </tr>
                <tr />
                <tr>
                  <th>
                    ServiceCharge:
                  </th>
                </tr>
                <tr>
                  <th>
                    Service Charge:
                  </th>
                  <th>
                    {"Rs."}
                    {(
                      (reportData?.orderTypeCounts?.dine_in ? parseFloat(reportData.salesByOrderType.dine_in.serviceCharge || 0) : 0) +
                      (reportData?.orderTypeCounts?.take_away ? parseFloat(reportData.salesByOrderType.take_away.serviceCharge || 0) : 0) +
                      (reportData?.orderTypeCounts?.delivery ? parseFloat(reportData.salesByOrderType.delivery.serviceCharge || 0) : 0)
                    ).toFixed(2)}
                  </th>
                </tr>
                <tr />
                <tr>
                  <th>
                    Taxes:
                  </th>
                </tr>
                <tr>
                  <th>
                    Total Tax:
                  </th>
                  <th>
                    {"Rs."}
                    {(
                      (reportData?.orderTypeCounts?.dine_in ? parseFloat(reportData.salesByOrderType.dine_in.tax || 0) : 0) +
                      (reportData?.orderTypeCounts?.take_away ? parseFloat(reportData.salesByOrderType.take_away.tax || 0) : 0) +
                      (reportData?.orderTypeCounts?.delivery ? parseFloat(reportData.salesByOrderType.delivery.tax || 0) : 0)
                    ).toFixed(2)}
                  </th>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}

export default Reports;