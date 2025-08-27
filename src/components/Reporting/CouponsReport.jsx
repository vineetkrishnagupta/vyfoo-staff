
import React, { useState, useEffect } from 'react';
import "./CouponsReport.css";
import MainHeader from '../MainHeader';
import Sidebar from '../Sidebar';
import axiosInstance from '../../utlis/axiosinstance';
import { GetAllCouponCodeName, GetAllCouponReport } from "../../BaseURL/baseURL"
import Toaster from '../../utlis/Toaster';
import LoadingModal from '../../utlis/LoadingModal';
import { Link } from 'react-router-dom';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import * as XLSX from 'xlsx';

function CouponsReport() {
  const [fullLoader, setFullLoader] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [data, setData] = useState([]);
  const [productData, setProductData] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState('');
  const [reportDataByType, setReportDataByType] = useState(null);
  const [displayCoupon, setDisplayCoupon] = useState("");

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
  const [formData, setFormData] = useState({
    start_date: `${getToday()}T00:00`,
    end_date: `${getTomorrow()}T00:00`,
    order_mode: "",
    payment_status: "all"
  });

  //     const handleResetClick = () => {
  //   setFormData({
  //     start_date: "08/01/2025 12:00 AM",
  //     end_date: "08/02/2025 12:00 AM",
  //     order_mode: "",
  //     payment_status: "all",
  //   });
  //   setData([]);
  //   setReportDataByType(null);
  //   setReportData({
  //     totalSubtotal: "",
  //     totalDiscount: "",
  //     totalTotal: "",
  //     totalServiceCharge: "",
  //     totalTax: "",
  //     currency_symbol: "",
  //     start_date: "",
  //     end_date: "",
  //     totalCustomerPaidAmount: "",
  //     totalCustomerDueAmount: "",
  //     order_mode: "",
  //     payment_status: "",
  //     totalPackingCharges: "",
  //     totalRoundUpAmount: "",
  //   });
  // };

  const handleResetClick = () => {
    setFormData({
      start_date: `${getToday()}T00:00`,
      end_date: `${getTomorrow()}T00:00`,
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

  const formatDateRange = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return `${date.getDate()}-${date.getMonth() + 1}-${date.getFullYear()}`;
  };

  const downloadPdfDocument = () => {
    const doc = new jsPDF('landscape');

    // Get page width for centering
    const pageWidth = doc.internal.pageSize.getWidth();

    // Add centered header information
    doc.setFontSize(16);
    doc.setTextColor(0, 0, 0);
    doc.setFont("helvetica", "bold");
    doc.text("Coupon Report", pageWidth / 2, 15, { align: 'center' });

    // Add centered report date
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`Report Date: ${getCurrentDateFormatted()}`, pageWidth / 2, 22, { align: 'center' });

    // Add centered filter information
    let yPosition = 30;
    doc.setFontSize(10);

    // Date Range - centered
    doc.text(
      `Date: ${reportData.start_date && formatDate(reportData.start_date)} - ${reportData.end_date && formatDate(reportData.end_date)}`,
      pageWidth / 2,
      yPosition,
      { align: 'center' }
    );
    yPosition += 7;

    // Order Type - centered
    doc.text(
      `Order Type: ${reportData.order_mode === '' ? 'All' :
        reportData.order_mode === 'dine_in' ? 'Dine In' :
          reportData.order_mode === 'delivery' ? 'Delivery' : 'Take Away'
      }`,
      pageWidth / 2,
      yPosition,
      { align: 'center' }
    );
    yPosition += 7;

    // Payment Status - centered
    doc.text(
      `Payment Status: ${reportData.payment_status === 'all' ? 'All' :
        reportData.payment_status === '1' ? 'Paid' :
          reportData.payment_status === '3' ? 'Partially Unpaid' :
            reportData.payment_status === '2' ? 'Hold' : 'Unpaid'
      }`,
      pageWidth / 2,
      yPosition,
      { align: 'center' }
    );
    yPosition += 7;

    // Coupons - centered
    doc.text(
      `Coupons: ${selectedProduct ? productData.find(p => p.value === selectedProduct)?.label || selectedProduct : "All"}`,
      pageWidth / 2,
      yPosition,
      { align: 'center' }
    );
    yPosition += 10;

    // Generate the table (unchanged from original)
    doc.autoTable({
      html: "#pdfContent",
      startY: yPosition,
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
      margin: { left: 10, right: 10 },
      didParseCell: function (data) {
        if (data.row.section === "body" && data.column.dataKey === 0) {
          data.cell.styles.halign = "left";
        }
      },
    });

    // Save the PDF with the same filename format
    doc.save(
      `Coupon_Report-${formatDateRange(reportData.start_date)}-${formatDateRange(
        reportData.end_date
      )}.pdf`
    );
  };

  const exportToExcel = () => {
    const table_elt = document.getElementById("pdfContent");
    const workbook = XLSX.utils.table_to_book(table_elt);
    XLSX.writeFile(
      workbook,
      `Coupon_Report-${formatDateRange(reportData.start_date)}-${formatDateRange(
        reportData.end_date
      )}.xlsx`
    );
  };


  const toggleSidebar = () => {
    setIsSidebarOpen((prev) => !prev);
  };

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

  function getCurrentDateFormatted() {
    const today = new Date();
    const day = today.getDate();
    const month = today.getMonth() + 1;
    const year = today.getFullYear();

    const formattedDate = `${day < 10 ? "0" : ""}${day}/${month < 10 ? "0" : ""
      }${month}/${year}`;

    return formattedDate;
  }


  function formatDate(dateTimeStr) {
    // Split the input date and time string into parts
    let parts = dateTimeStr.split('T');
    let datePart = parts[0];
    let timePart = parts[1];

    // Split the date part into year, month, and day
    let dateParts = datePart.split('-');
    let year = dateParts[0];
    let month = dateParts[1];
    let day = dateParts[2];

    // Format the date as dd/mm/yyyy
    let formattedDate = `${day}/${month}/${year}`;

    // Split the time part into hours and minutes
    let timeParts = timePart.split(':');
    let hours = parseInt(timeParts[0], 10);
    let minutes = timeParts[1];

    // Convert hours to 12-hour format with AM/PM
    let period = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12 || 12; // Handle midnight (0) as 12 AM

    // Format the time as hh:mm AM/PM
    let formattedTime = `${hours}:${minutes} ${period}`;

    // Return the combined formatted date and time
    return `${formattedDate} ${formattedTime}`;
  }

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

    if (!formData.start_date === "") {
      Toaster.error("Please select a start date");
      return;
    } else if (!formData.end_date === "") {
      Toaster.error("Please select a end date");
      return;
    }
    // ✅ Save coupon for display
    setDisplayCoupon(selectedProduct || "");

    setIsLoading(true);
    setFullLoader(true);
    try {
      const response = await axiosInstance.get(GetAllCouponReport, {
        params: {
          start_date: convertToISOFormat(formData.start_date),
          end_date: convertToISOFormat(formData.end_date),
          order_mode: formData.order_mode,
          payment_status: formData.payment_status,
          coupon_code: selectedProduct
        }
      });

      if (response.status === 200 && response.data.data) {
        setData(response.data.data);
        setReportDataByType(
          response.data.orderTypeTotals ? response.data.orderTypeTotals : null
        );
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
        });
      }
    } catch (error) {
      if (error.response && error.response.data.message) {
        Toaster.error("error", error.response.data.message);
      } else {
        Toaster.error(error.message);
      }
      console.log(error);
    } finally {
      setFullLoader(false);
      setIsLoading(false);
    }


  };

  const getCouponData = async () => {
    setIsLoading(true);
    setFullLoader(true);
    try {
      const response = await axiosInstance.get(GetAllCouponCodeName);

      if (response.status === 200 && response.data.data) {
        const modifiedData = response.data.data.map((item) => ({
          value: item.id,
          label: item.coupon_code,
        }));
        setProductData(modifiedData);
      } else if (response.status === 200 && response.data.message) {
        setProductData([]);
      }
    } catch (error) {
      if (error.response && error.response.data.message) {
        addToast("error", error.response.data.message);
      } else {
        addToast("error", error.message);
      }
      console.log(error);
    }
    finally {
      setFullLoader(false);
      setFullLoader(false)
    }

  };

  useEffect(() => {
    getCouponData();
  }, []);

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
          <div className="cr-container">
            <div className="cr-header-bar">
              <div></div>
              <Link className="cr-go-back-btn text-decoration-none" to="/reports">Go Back</Link>
            </div>
            <div className="cr-title">Coupons Report</div>
            <div className="cr-desc">
              This report provides insights into Coupon categorized by type and payment status, offering a comprehensive overview for informed decision-making.
            </div>
            <div className="cr-filters">
              <div className="row g-3 align-items-end">
                {/* Start Date */}
                <div className="col-md-3">
                  <label className="form-label">Start Date<span className="text-danger">*</span></label>
                  <input
                    className="form-control"
                    type="datetime-local"
                    name="start_date"
                    value={formData.start_date}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                  />
                </div>

                {/* End Date */}
                <div className="col-md-3">
                  <label className="form-label">End Date<span className="text-danger">*</span></label>
                  <input
                    className="form-control"
                    type="datetime-local"
                    name="end_date"
                    value={formData.end_date}
                    onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                  />
                </div>

                {/* Order Type */}
                <div className="col-md-2">
                  <label className="form-label">Order Type</label>
                  <select
                    className="form-select"
                    value={formData.order_mode}
                    onChange={(e) => setFormData({ ...formData, order_mode: e.target.value })}
                  >
                    <option value="">All</option>
                    <option value="dine_in">Dine In</option>
                    <option value="delivery">Delivery</option>
                    <option value="take_away">Take Away</option>
                  </select>
                </div>

                {/* Coupon Code */}
                <div className="col-md-2">
                  <label className="form-label">Coupon Code</label>
                  <select
                    className="form-select"
                    value={selectedProduct}
                    onChange={(e) => setSelectedProduct(e.target.value)}
                  >
                    <option value="">All</option>
                    {productData.map((item) => (
                      <option key={item.value} value={item.value}>{item.label}</option>
                    ))}
                  </select>
                </div>

                {/* Payment Status */}
                <div className="col-md-2">
                  <label className="form-label">Payment Status</label>
                  <select
                    className="form-select"
                    value={formData.payment_status}
                    onChange={(e) => setFormData({ ...formData, payment_status: e.target.value })}
                  >
                    <option value="all">All</option>
                    <option value="1">Paid</option>
                    <option value="3">Partially Unpaid</option>
                    <option value="0">Unpaid</option>
                  </select>
                </div>

                {/* Buttons */}
              
              </div>
              <br />
                <div className="col-md-2 d-flex gap-2">
                  <button className="cr-submit-btn" onClick={handleSubmitClick}>Submit</button>
                  <button className="cr-reset-btn" onClick={handleResetClick}>Reset</button>
                </div>
            </div>


            <LoadingModal isLoading={fullLoader} />


            {data.length === 0 ? (
              "") : (
              <div className="cr-report-card">
                <div className="cr-report-bar">
                  <div className="cr-report-title">Coupon Report</div>
                  <div className="cr-report-btns">
                    <button className="cr-pdf-btn" onClick={downloadPdfDocument}>
                      Generate PDF
                    </button>
                    <button className="cr-excel-btn" onClick={exportToExcel}>
                      Export To Excel
                    </button>
                  </div>
                </div>
                <div className="cr-report-date">Report Date: {getCurrentDateFormatted()}</div>
                <div className="cr-info-lines">
                  <div>
                    <strong>Date Range:</strong> {reportData.start_date && formatDate(reportData.start_date)} - {reportData.end_date && formatDate(reportData.end_date)}
                  </div>
                  <div>
                    <strong>Order Type:</strong> {reportData.order_mode === '' && 'All'}
                    {reportData.order_mode === 'dine_in' && 'Dine In'}
                    {reportData.order_mode === 'delivery' && 'Delivery'}
                    {reportData.order_mode === 'take_away' && 'Take Away'}
                  </div>
                  <div>
                    <strong>Payment Status:</strong> {reportData.payment_status === 'all' && 'All'}
                    {reportData.payment_status === '1' && 'Paid'}
                    {reportData.payment_status === '3' && 'Partially Unpaid'}
                    {reportData.payment_status === '2' && 'Hold'}
                    {reportData.payment_status === '0' && 'Unpaid'}
                  </div>
                  {/* <div>
                  <strong>Coupons:</strong> {selectedProduct ? productData.find(p => p.value === selectedProduct)?.label || selectedProduct : "All"}
                </div> */}
                  <div>
                    <strong>Coupons:</strong>{" "}
                    {displayCoupon
                      ? productData.find(p => p.value === displayCoupon)?.label || displayCoupon
                      : "All"}
                  </div>

                </div>
                <div className="cr-table-wrap">
                  <table id="pdfContent" className="cr-table">
                    <thead>
                      <tr>
                        <th>Order Date</th>
                        <th>Bill No</th>
                        <th>Order ID</th>
                        <th>Order Type</th>
                        <th>Coupon Code</th>
                        <th>Payment Status</th>
                        <th>Subtotal</th>
                        <th>Discount</th>
                        <th>Service Charge</th>
                        <th>Tax</th>
                        <th>Packaging Charges</th>
                        <th>Round Off Amount</th>
                        <th>Total Amount</th>
                        <th>Paid Amount</th>
                        <th>Due Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.length === 0 ? (
                        <tr>
                          <td colSpan="15" className="text-center">
                            No data found
                          </td>
                        </tr>
                      ) : (
                        <>
                          {data.map((item, index) => (
                            <tr key={index}>
                              <td>{item.creation_date_formatted}</td>
                              <td className="kr-mouse-pointer kr-hyper-link" onClick={() => handleDetailsClick(item.id)}>
                                {item.invoice_no}
                              </td>
                              <td className="kr-mouse-pointer kr-hyper-link" onClick={() => handleDetailsClick(item.id)}>
                                #{item.order_number_qrcode}
                              </td>
                              <td>{item.order_type}</td>
                              <td>{item.coupon_code}</td>
                              <td>{item.payment_status_lable}</td>
                              <td>Rs.{parseFloat(item.subtotal).toFixed(2)}</td>
                              <td>Rs.{parseFloat(item.discount).toFixed(2)}</td>
                              <td>Rs.{parseFloat(item.service_charge).toFixed(2)}</td>
                              <td>Rs.{parseFloat(item.tax).toFixed(2)}</td>
                              <td>Rs.{parseFloat(item.packaging_fee).toFixed(2)}</td>
                              <td>Rs.{parseFloat(item.round_up_amount).toFixed(2)}</td>
                              <td>Rs.{parseFloat(item.total).toFixed(2)}</td>
                              <td>Rs.{parseFloat(item.customer_paid_amount).toFixed(2)}</td>
                              <td>Rs.{parseFloat(item.customer_due_amount).toFixed(2)}</td>
                            </tr>
                          ))}

                          {reportDataByType && Object.keys(reportDataByType).map((orderType, index) => (
                            <tr key={index} className="cr-label-row">
                              <td colSpan={6}>{orderType}</td>
                              <td>
                                <div>(Subtotal)</div>
                                <div><b>Rs.{parseFloat(reportDataByType[orderType].subtotal).toFixed(2)}</b></div>
                              </td>
                              <td>
                                <div>(Discount)</div>
                                <div><b>Rs.{parseFloat(reportDataByType[orderType].discount).toFixed(2)}</b></div>
                              </td>
                              <td>
                                <div>(Service Charge)</div>
                                <div><b>Rs.{parseFloat(reportDataByType[orderType].serviceCharge).toFixed(2)}</b></div>
                              </td>
                              <td>
                                <div>(Tax)</div>
                                <div><b>Rs.{parseFloat(reportDataByType[orderType].tax).toFixed(2)}</b></div>
                              </td>
                              <td>
                                <div>(Packaging Charges)</div>
                                <div><b>Rs.{parseFloat(reportDataByType[orderType].totalPackingCharges).toFixed(2)}</b></div>
                              </td>
                              <td>
                                <div>(Round Off Amount)</div>
                                <div><b>Rs.{parseFloat(reportDataByType[orderType].totalRoundUpAmount).toFixed(2)}</b></div>
                              </td>
                              <td>
                                <div>(Total Amount)</div>
                                <div><b>Rs.{parseFloat(reportDataByType[orderType].total).toFixed(2)}</b></div>
                              </td>
                              <td>
                                <div>(Total Paid Amount)</div>
                                <div><b>Rs.{parseFloat(reportDataByType[orderType].totalCustomerPaidAmount).toFixed(2)}</b></div>
                              </td>
                              <td>
                                <div>(Total Due Amount)</div>
                                <div><b>Rs.{parseFloat(reportDataByType[orderType].totalCustomerDueAmount).toFixed(2)}</b></div>
                              </td>
                            </tr>
                          ))}

                          <tr className="cr-bold-row">
                            <td className="cr-total-label">Total ({data.length})</td>
                            <td></td>
                            <td></td>
                            <td></td>
                            <td></td>
                            <td></td>
                            <td>
                              <div>(Subtotal)</div>
                              <div><b>Rs.{reportData.totalSubtotal}</b></div>
                            </td>
                            <td>
                              <div>(Discount)</div>
                              <div><b>Rs.{reportData.totalDiscount}</b></div>
                            </td>
                            <td>
                              <div>(Service Charge)</div>
                              <div><b>Rs.{reportData.totalServiceCharge}</b></div>
                            </td>
                            <td>
                              <div>(Tax)</div>
                              <div><b>Rs.{reportData.totalTax}</b></div>
                            </td>
                            <td>
                              <div>(Packaging Charges)</div>
                              <div><b>Rs.{reportData.totalPackingCharges}</b></div>
                            </td>
                            <td>
                              <div>(Total Round Off Amount)</div>
                              <div><b>Rs.{reportData.totalRoundUpAmount}</b></div>
                            </td>
                            <td>
                              <div>(Total Amount)</div>
                              <div><b>Rs.{reportData.totalTotal}</b></div>
                            </td>
                            <td>
                              <div>(Total Paid Amount)</div>
                              <div><b>Rs.{reportData.totalCustomerPaidAmount}</b></div>
                            </td>
                            <td>
                              <div>(Total Due Amount)</div>
                              <div><b>Rs.{reportData.totalCustomerDueAmount}</b></div>
                            </td>
                          </tr>
                        </>
                      )}
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

export default CouponsReport;
