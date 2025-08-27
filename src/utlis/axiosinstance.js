// src/api/axiosInstance.js
import axios from 'axios';
import {BaseURL} from "../BaseURL/baseURL.jsx"
import Toaster from '../utlis/Toaster.js';

const axiosInstance = axios.create({
//   baseURL: apiBaseURL,
baseURL: BaseURL,
withCredentials: true, // Include cookies (for sessions/auth)
});

// Add a response interceptor
axiosInstance.interceptors.response.use(
  response => response,
  error => {
    if (error.response && error.response.status === 401) {
      const currentPath = window.location.pathname;

      const isLoginPage =
        currentPath === '/login' ||
        currentPath === '/forget-password' ||
        currentPath.startsWith('/resetpassword/');

      if (!isLoginPage) {
        console.warn("Unauthorized. Redirecting to login...");
        
        window.location.href = '/login';
      }
    }

    return Promise.reject(error);
  }
);

// axiosInstance.interceptors.response.use(
//   response => response,
//   error => {
//     if (error.response && error.response.status === 401) {
//       const currentPath = window.location.pathname;

//       const isLoginPage =
//         currentPath === '/login' ||
//         currentPath === '/forget-password' ||
//         currentPath.startsWith('/resetpassword/');

//       if (!isLoginPage) {
//         // ✅ Show toaster
//         Toaster({
//           type: 'error',
//           message: 'Session expired. Please login again.',
//         });

//         // ✅ Redirect after a short delay (optional)
//         setTimeout(() => {
//           window.location.href = '/login';
//         }, 2000); // 2 seconds delay
//       }
//     }

//     return Promise.reject(error);
//   }
// );

export default axiosInstance;
