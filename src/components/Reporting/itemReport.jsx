

import { useState, useEffect } from "react";
import { GetItemReport, GetAllProductsNameURL } from "../../BaseURL/baseURL";
import MainHeader from "./../MainHeader";
import Sidebar from "./../Sidebar";
import axiosInstance from "../../utlis/axiosinstance";
import "./ItemReport.css";
import Toaster from "../../utlis/Toaster";
import LoadingModal from "../../utlis/LoadingModal";
import { Link } from "react-router-dom";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import jsPDF from "jspdf";
import "jspdf-autotable";
import * as XLSX from "xlsx";

const ItemsReport = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [data, setData] = useState([]);
  // const [formData, setFormData] = useState({
  //   start_date: new Date(), // Initialize with Date object
  //   end_date: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
  //   product_id: "all",
  //   payment_status: "all"
  // });
  const [formData, setFormData] = useState({
  start_date: new Date(new Date().setHours(0, 0, 0, 0)), // Today at 12:00 AM
  end_date: new Date(new Date(Date.now() + 24 * 60 * 60 * 1000).setHours(0, 0, 0, 0)), // Tomorrow at 12:00 AM
  product_id: "all",
  payment_status: "all"
});

  const [productData, setProductData] = useState([]);
  const [reportDate] = useState(new Date().toLocaleDateString('en-GB'));
  const [totalSubAmount, setSubAmount] = useState(0);
  const [totalDiscountAmount, setTotalDiscountAmount] = useState(0);
  const [totalSCHAmount, setTotalSCHAmount] = useState(0);
  const [totalTaxAmount, setTotalTaxAmount] = useState(0);
  const [totalFinalAmount, setTotalFinalAmount] = useState(0);
  const [totalQuantity, setTotalQuantity] = useState(0);
  const [fullLoader, setFullLoader] = useState(false);
  const [reportRange, setReportRange] = useState({
  start_date: formData.start_date,
  end_date: formData.end_date
});


  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    setIsLoading(true);
    setFullLoader(true);
    try {
      const response = await axiosInstance.get(GetAllProductsNameURL);
      if (response.status === 200 && response.data.data) {
        const modifiedData = [{ value: 'all', label: 'All Products' }];
        response.data.data.forEach((item) => {
          modifiedData.push({
            value: item.id,
            label: item.name,
          });
        });
        setProductData(modifiedData);
      }
    } catch (error) {
      const errorMsg = error.response?.data?.message || error.message;
      Toaster.error(errorMsg);
    } finally {
      setFullLoader(false);
      setIsLoading(false);
    }
  };

  const toggleSidebar = () => {
    setIsSidebarOpen((prev) => !prev);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleDateChange = (date, field) => {
    if (!date) return;
    setFormData((prev) => ({
      ...prev,
      [field]: date,
    }));
  };

  const handleResetClick = () => {
  setFormData({
    start_date: new Date(new Date().setHours(0, 0, 0, 0)), // Today at 12:00 AM
    end_date: new Date(new Date(Date.now() + 24 * 60 * 60 * 1000).setHours(0, 0, 0, 0)), // Tomorrow at 12:00 AM
    product_id: "all",
    payment_status: ""
  });
    setData([]);
    setSubAmount(0);
    setTotalDiscountAmount(0);
    setTotalSCHAmount(0);
    setTotalTaxAmount(0);
    setTotalFinalAmount(0);
    setTotalQuantity(0);
  };

  const formatDateForAPI = (date) => {
    if (!date || !(date instanceof Date)) return "";
    const pad = (num) => num.toString().padStart(2, '0');
    
    const year = date.getFullYear();
    const month = pad(date.getMonth() + 1);
    const day = pad(date.getDate());
    const hours = pad(date.getHours());
    const minutes = pad(date.getMinutes());
    
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  
    function formatDateRange(inputDate) {
        const parsedDate = new Date(inputDate);
        const day = parsedDate.getDate().toString().padStart(2, "0");
        const month = (parsedDate.getMonth() + 1).toString().padStart(2, "0");
        const year = parsedDate.getFullYear().toString();

        return day + month + year;
    }

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
const downloadPdfDocument = () => {
    if (!data.length) {
      Toaster.warning("No data available to export");
      return;
    }

    const doc = new jsPDF();
    
    // Add title
    doc.setFontSize(16);
    doc.text("Items Report", 105, 15, { align: 'center' });
    
    // Add report date and range
    doc.setFontSize(10);
    doc.text(`Report Date: ${reportDate}`, 14, 25);
    doc.text(`Date Range: ${formatDisplayDate(reportRange.start_date)} - ${formatDisplayDate(reportRange.end_date)}`, 14, 30);
    
    // Add table
    doc.autoTable({
      startY: 40,
      head: [['Product Name', 'Quantity', 'Sub Total', 'Discount', 'Service Charge', 'Tax', 'Total Amount']],
      body: data.map(item => [
        item.product_name,
        item.total_quantity,
        `Rs. ${(item.subtotal_product_price || 0).toFixed(2)}`,
        `Rs. ${(item.discount_price || 0).toFixed(2)}`,
        `Rs. ${(item.sch_price || 0).toFixed(2)}`,
        `Rs. ${(item.tax_price || 0).toFixed(2)}`,
        `Rs. ${((item.subtotal_product_price || 0) - (item.discount_price || 0) + (item.sch_price || 0) + (item.tax_price || 0)).toFixed(2)}`
      ]),
      foot: [
        [
          `Total (${data.length})`, 
          `Total Quantity: ${totalQuantity}`,
          `Rs. ${totalSubAmount.toFixed(2)}`,
          `Rs. ${totalDiscountAmount.toFixed(2)}`,
          `Rs. ${totalSCHAmount.toFixed(2)}`,
          `Rs. ${totalTaxAmount.toFixed(2)}`,
          `Rs. ${totalFinalAmount.toFixed(2)}`
        ]
      ],
      styles: {
        fontSize: 8,
        cellPadding: 2,
        overflow: 'linebreak'
      },
      headStyles: {
        fillColor: [220, 220, 220],
        textColor: [0, 0, 0],
        fontStyle: 'bold'
      },
      footStyles: {
        fillColor: [220, 220, 220],
        textColor: [0, 0, 0],
        fontStyle: 'bold'
      }
    });

    doc.save(`Items_Report_${formatDateForFilename(reportRange.start_date)}_${formatDateForFilename(reportRange.end_date)}.pdf`);
  };

  // Excel Export Function
  const exportToExcel = () => {
    if (!data.length) {
      Toaster.warning("No data available to export");
      return;
    }

    // Prepare data for Excel
    const excelData = data.map(item => ({
      'Product Name': item.product_name,
      'Quantity': item.total_quantity,
      'Sub Total': (item.subtotal_product_price || 0).toFixed(2),
      'Discount': (item.discount_price || 0).toFixed(2),
      'Service Charge': (item.sch_price || 0).toFixed(2),
      'Tax': (item.tax_price || 0).toFixed(2),
      'Total Amount': ((item.subtotal_product_price || 0) - (item.discount_price || 0) + (item.sch_price || 0) + (item.tax_price || 0)).toFixed(2)
    }));

    // Add totals row
    excelData.push({
      'Product Name': `Total (${data.length})`,
      'Quantity': totalQuantity,
      'Sub Total': totalSubAmount.toFixed(2),
      'Discount': totalDiscountAmount.toFixed(2),
      'Service Charge': totalSCHAmount.toFixed(2),
      'Tax': totalTaxAmount.toFixed(2),
      'Total Amount': totalFinalAmount.toFixed(2)
    });

    const worksheet = XLSX.utils.json_to_sheet(excelData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Items Report");
    
    // Add header information
    const headerInfo = [
      ["Items Report"],
      [`Report Date: ${reportDate}`],
      [`Date Range: ${formatDisplayDate(reportRange.start_date)} - ${formatDisplayDate(reportRange.end_date)}`],
      [""] // Empty row
    ];
    XLSX.utils.sheet_add_aoa(worksheet, headerInfo, { origin: "A1" });
    
    XLSX.writeFile(workbook, `Items_Report_${formatDateForFilename(reportRange.start_date)}_${formatDateForFilename(reportRange.end_date)}.xlsx`);
  };

  // Helper function for filename dates
  const formatDateForFilename = (date) => {
    if (!date) return "";
    const d = new Date(date);
    return `${d.getDate()}${d.getMonth()+1}${d.getFullYear()}`;
  };

  // // Format date for display
  // const formatDisplayDate = (date) => {
  //   if (!date) return "";
  //   if (date instanceof Date) {
  //     return date.toLocaleString();
  //   }
  //   return new Date(date).toLocaleString();
  // };

// // Helper function for filename dates
// const formatDateForFilename = (date) => {
//   if (!date) return "";
//   const d = new Date(date);
//   return `${d.getDate()}${d.getMonth()+1}${d.getFullYear()}`;
// };

 function convertToISOFormat(inputDate) {
    // If input is already a Date object
    if (inputDate instanceof Date) {
        const year = inputDate.getFullYear();
        const month = padNumber(inputDate.getMonth() + 1, 2);
        const day = padNumber(inputDate.getDate(), 2);
        const hours = padNumber(inputDate.getHours(), 2);
        const minutes = padNumber(inputDate.getMinutes(), 2);
        
        return `${year}-${month}-${day}T${hours}:${minutes}`;
    }
    
    // If input is a string in expected format (YYYY-MM-DDTHH:MM)
    if (typeof inputDate === 'string') {
        try {
            const [datePart, timePart] = inputDate.split('T');
            const [year, month, day] = datePart.split('-');
            const [hours, minutes] = timePart.split(':');
            
            return `${year}-${padNumber(month, 2)}-${padNumber(day, 2)}T${padNumber(hours, 2)}:${padNumber(minutes, 2)}`;
        } catch (error) {
            console.error('Failed to parse date string:', error);
            // Fallback to current date if parsing fails
            return convertToISOFormat(new Date());
        }
    }
    
    // For any other case, return current date
    console.warn('Invalid date format received, using current date instead');
    return convertToISOFormat(new Date());
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

    

  const handleSubmitClick = async (e) => {
    e.preventDefault();

    if (!formData.start_date) {
      Toaster.warning("Start Date cannot be empty");
      return;
    }
    if (!formData.end_date) {
      Toaster.warning("End Date cannot be empty");
      return;
    }

    setIsLoading(true);
    setFullLoader(true);
    try {
      const response = await axiosInstance.get(GetItemReport, {
     params: {
                        start_date: convertToISOFormat(formData.start_date),
                        end_date: convertToISOFormat(formData.end_date),
                        product_id: formData.product_id,
                        payment_status: formData.payment_status,

                    },
      });

      if (response.status === 200 && response.data.data) {
        let totals = {
          subtotal: 0,
          discount: 0,
          sch: 0,
          tax: 0,
          final: 0,
          quantity: 0
        };

        setReportRange({
          start_date: formData.start_date,
          end_date: formData.end_date
        });

        response.data.data.forEach((element) => {
          totals.subtotal += element.subtotal_product_price || 0;
          totals.discount += element.discount_price || 0;
          totals.sch += element.sch_price || 0;
          totals.tax += element.tax_price || 0;
          totals.final += (element.subtotal_product_price || 0) 
                        - (element.discount_price || 0) 
                        + (element.sch_price || 0) 
                        + (element.tax_price || 0);
          totals.quantity += parseInt(element.total_quantity) || 0;
        });

        setSubAmount(totals.subtotal);
        setTotalDiscountAmount(totals.discount);
        setTotalSCHAmount(totals.sch);
        setTotalTaxAmount(totals.tax);
        setTotalFinalAmount(totals.final);
        setTotalQuantity(totals.quantity);
        setData(response.data.data);

        if (response.data.data.length <= 0) {
          Toaster.success("Data not available!");
        }
      } else if (response.status === 200 && response.data.message) {
        Toaster.success(response.data.message);
        setData([]);
        setSubAmount(0);
      }
    } catch (error) {
      const errorMsg = error.response?.data?.message || error.message;
      Toaster.error(errorMsg);
      console.error(error);
    } finally {
      setIsLoading(false);
      setFullLoader(false);
    }
  };

  // Format date for display
  // const formatDisplayDate = (date) => {
  //   if (!date) return "";
  //   if (date instanceof Date) {
  //     return date.toLocaleString();
  //   }
  //   return new Date(date).toLocaleString();
  // };

  const formatDisplayDate = (date) => {
  if (!date) return "";
  const d = date instanceof Date ? date : new Date(date);
  return d.toLocaleDateString("en-GB"); // ✅ DD/MM/YYYY format
};


// function convertToInputFormat(date) {
//   const d = new Date(date);
//   const pad = (n) => String(n).padStart(2, '0');
//   return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
// }
function convertToInputFormat(date) {
  const d = new Date(date);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}



// function formatDateTimeLocal(date) {
//   if (!date) return '';
//   const d = new Date(date);
//   const pad = (n) => String(n).padStart(2, '0');
//   return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
// }
function formatDateTimeLocal(date) {
  if (!date) return '';
  const d = new Date(date);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
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
          <div className="items-report">
            <div className="ir-header">
              <h2>Items Report</h2>
              <Link className="ir-back-btn text-decoration-none" to="/reports">
                Go Back
              </Link>
            </div>
            <p className="ir-description">
              This report shows sales of each items with their respective quantities sold.
            </p>
            
            <div className="ir-form-card">
              <form className="ir-form" onSubmit={handleSubmitClick}>
                <div className="ir-form-row">
                  <div className="ir-form-group">
                    <label>Product</label>
                    <select 
                      className="ir-input"
                      name="product_id"
                      value={formData.product_id}
                      onChange={handleInputChange}
                      disabled={isLoading}
                    >
                      {productData.map((product) => (
                        <option key={product.value} value={product.value}>
                          {product.label}
                        </option>
                      ))}
                    </select>

                    
                  </div>
                 <div className="ir-form-group">
                  <label>Start Date<span className="text-danger">*</span></label>
                  <div className="csr-input-icon">
                <input
    className="ir-input"
  type="datetime-local"
  name="start_date"
  value={convertToInputFormat(formData.start_date)}
  onChange={(e) => handleDateChange(new Date(e.target.value), 'start_date')}
/>

                     {/* <span className="csr-date-icon" role="img" aria-label="calendar">&#128197;</span> */}
                  </div>
                </div>
               <div className="ir-form-group">
                  <label>End Date<span className="text-danger">*</span></label>
                  <div className="csr-input-icon">
                 <input 
   className="ir-input"
  type="datetime-local" 
  name="end_date"
  value={formatDateTimeLocal(formData.end_date)}
  onChange={(e) => handleDateChange(e.target.value, 'end_date')}
/>

                  {/* <span className="csr-date-icon" role="img" aria-label="calendar">&#128197;</span> */}
                  </div>
                </div>
           {/* <div className="ir-form-group">
                    <label>
                      Start Date<span className="ir-required">*</span>
                    </label>
                    <DatePicker
                      selected={formData.start_date instanceof Date ? formData.start_date : new Date(formData.start_date)}
                      onChange={(date) => handleDateChange(date, 'start_date')}
                      showTimeSelect
                      timeFormat="HH:mm"
                      timeIntervals={15}
                      dateFormat="MMMM d, yyyy h:mm aa"
                      className="ir-input"
                      placeholderText="Select start date and time"
                    />
                  </div>
                  <div className="ir-form-group">
                    <label>
                      End Date<span className="ir-required">*</span>
                    </label>
                    <DatePicker
                      selected={formData.end_date instanceof Date ? formData.end_date : new Date(formData.end_date)}
                      onChange={(date) => handleDateChange(date, 'end_date')}
                      showTimeSelect
                      timeFormat="HH:mm"
                      timeIntervals={15}
                      dateFormat="MMMM d, yyyy h:mm aa"
                      className="ir-input"
                      placeholderText="Select end date and time"
                      minDate={formData.start_date instanceof Date ? formData.start_date : new Date(formData.start_date)}
                    />
                  </div> */}
                 
              
          
       

                </div>
                <div className="ir-form-actions">
                  <button 
                    type="submit" 
                    className="ir-btn ir-btn-yellow"
                    disabled={isLoading}
                  >
                    {isLoading ? "Loading..." : "Submit"}
                  </button>
                  <button 
                    type="button" 
                    className="ir-btn ir-btn-gray"
                    onClick={handleResetClick}
                  >
                    Reset
                  </button>
                </div>
              </form>
            </div>

            {data.length > 0 && (
              <div className="ir-table-card">
                <div className="ir-table-actions">
                   <button 
                    className="ir-btn ir-btn-yellow"
                    onClick={downloadPdfDocument}
                  >
                    Generate PDF
                  </button>
                  <button 
                    className="ir-btn ir-btn-yellow"
                    onClick={exportToExcel}
                  >
                    Export To Excel
                  </button>
                </div>
                <div className="ir-table-title">
                  <h3>Items Report</h3>
                  <span>Report Date : {reportDate}</span>
                </div>
                {/* <div className="ir-table-range">
                  <strong>Date Range:</strong> {formData.start_date.toLocaleString()} - {formData.end_date.toLocaleString()}
                </div> */}
                <div className="ir-table-range">
  <strong>Date Range:</strong> 
  {new Date(formData.start_date).toLocaleDateString("en-GB")} - {new Date(formData.end_date).toLocaleDateString("en-GB")}
</div>

                
                <table className="ir-table">
                  <thead>
                    <tr>
                      <th>Product Name</th>
                      <th>Quantity</th>
                      <th>Sub Total</th>
                      <th>Discount</th>
                      <th>Service Charge</th>
                      <th>Tax</th>
                      <th>Total Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.map((item, index) => (
                      <tr key={index}>
                        <td>{item.product_name}</td>
                        <td>{item.total_quantity}</td>
                        <td>Rs. {item.subtotal_product_price?.toFixed(2) || '0.00'}</td>
                        <td>Rs. {item.discount_price?.toFixed(2) || '0.00'}</td>
                        <td>Rs. {item.sch_price?.toFixed(2) || '0.00'}</td>
                        <td>Rs. {item.tax_price?.toFixed(2) || '0.00'}</td>
                        <td>
                          Rs. {(
                            (item.subtotal_product_price || 0) - 
                            (item.discount_price || 0) + 
                            (item.sch_price || 0) + 
                            (item.tax_price || 0)
                          ).toFixed(2)}
                        </td>
                      </tr>
                    ))}
                    <tr className="ir-table-total-row">
                      <td>Total ({data.length})</td>
                      <td>Total Quantity : ({totalQuantity})</td>
                      <td>
                        <span>(Total Subtotal)</span><br/>
                        <strong>Rs.{totalSubAmount.toFixed(2)}</strong>
                      </td>
                      <td>
                        <span>(Total Discount)</span><br/>
                        <strong>Rs.{totalDiscountAmount.toFixed(2)}</strong>
                      </td>
                      <td>
                        <span>(Total Service Charge)</span><br/>
                        <strong>Rs.{totalSCHAmount.toFixed(2)}</strong>
                      </td>
                      <td>
                        <span>(Total Tax)</span><br/>
                        <strong>Rs.{totalTaxAmount.toFixed(2)}</strong>
                      </td>
                      <td>
                        <span>(Total Amount)</span><br/>
                        <strong>Rs.{totalFinalAmount.toFixed(2)}</strong>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}
            <LoadingModal isLoading={fullLoader} />
          </div>
        </div>
      </div>
    </>
  );
};

export default ItemsReport;