import React from "react";
import "../utlis/LoadingModal.css";

const LoadingModal = ({ isLoading }) => {
  if (!isLoading) return null;

  return (
    <div className="loading-modal  ">
      <div className="loading-spinner "></div>
      <div className="loading-text"></div>
    </div>
  );
};

export default LoadingModal;
