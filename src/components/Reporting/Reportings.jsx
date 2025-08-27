import React, { useState } from "react";
import { Link } from "react-router-dom";
import MainHeader from "../MainHeader";
import Sidebar from "../Sidebar"; 
import styles from "./Reports.module.css";
const Reporting = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const toggleSidebar = () => {
    setIsSidebarOpen((prev) => !prev);
  };

  const reports = [
  {
    title: "GST Reports",
    links: [
      {
        to: "/gst-report",
        title: "GST Report",
        desc: "This GST Report include tax details by orders with date range",
      },
    ],
  },
  {
    title: "Sales Reports",
    links: [
      {
        to: "/sales-report",
        title: "Daily Sales Report",
        desc:
          "A daily sales report is a record of a business's sales activity for any one day. It includes statistics on the amount of products sold, revenue generated, applicable discounts given, and other relevant factors.",
      },
    ],
  },
  {
    title: "Items Reports",
    links: [
      {
        to: "/item-report",
        title: "Items Reports",
        desc:
          "This report shows sales of each items with their respective quantities sold.",
      },
    ],
  },
  {
    title: "Orders Reports",
    links: [
      {
        to: "/order-report",
        title: "Orders Report",
        desc:
          "This report provides insights into orders categorized by type and payment status, offering a comprehensive overview for informed decision-making.",
      },
    ],
  },
  {
    title: "Customised Reports",
    links: [
      {
        to: "/customised-sales-report",
        title: "Customised Sales Reports",
        desc:
          "A Customized Sales Report provides detailed insights into a business's sales performance within a specified date and time range, encompassing product sales, revenue, discounts, and more.",
      },
    ],
  },
  {
    title: "Coupon Reports",
    links: [
      {
        to: "/coupon-report",
        title: "Coupon Reports",
        desc:
          "A Customized Coupon Report provides detailed insights into a business’s coupon usage within a specified date and time range, encompassing applied coupon codes, discount amounts, redemption frequency, and their overall impact on revenue.",
      },
    ],
  },
];


  return (
    <>
      {/* Fixed Header */}
      <div style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 1040 }}>
        <MainHeader toggleSidebar={toggleSidebar} />
      </div>

      <div className="d-flex">
        {/* Sidebar */}
        <Sidebar isOpen={isSidebarOpen} />

        {/* Main Content */}
         {/* <div
      className={styles.root}
      style={{ marginLeft: isSidebarOpen ? 250 : 60 }}
    > */}
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
      <h3 className={styles.heading} style={{marginTop:"7px"}}>Reports</h3>
      <div className={styles.grid} style={{marginTop:"22px"}}>
        {reports.map((report, i) => (
          <div className={styles.card} key={report.title}>
            <div className={styles.cardTitle}>{report.title}</div>
            {report.links.map((link) => (
              <Link className={styles.reportLink} to={link.to} key={link.title}>
                <div className={styles.reportTitle}>{link.title}</div>
                <div className={styles.reportDesc}>{link.desc}</div>
              </Link>
            ))}
          </div>
        ))}
      </div>
    </div>
      </div>
    </>
  );
};

export default Reporting;
