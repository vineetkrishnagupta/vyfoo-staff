// import React, { createContext, useContext, useState, useEffect } from 'react';
// import axiosInstance from './utlis/axiosinstance';
// import { useNavigate } from 'react-router-dom';
// import { logoutAPI, getStaff } from './BaseURL/baseURL';
// import Toaster from './utlis/Toaster';
// import { clearAppDataFromDB } from './utlis/indexedDB';
// const AuthContext = createContext();

// export const AuthProvider = ({ children }) => {
//   const [user, setUser] = useState(null);
//   const [loading, setLoading] = useState(true);

//   const [flag, setFlag] = useState(false);

//   const navigate = useNavigate();



// useEffect(() => {
//   const checkAuth = async () => {
//     setLoading(true);
//     try {
//       const response = await axiosInstance.get(getStaff);
//       if (response.data.success) {
//         setUser(response.data.data.staff);
//         // navigate('/pos');
//       } else {
//         setUser(null);
//         Toaster.error(response.data.message || "Authorization failed.");
//         navigate('/login');
//       }
//     } catch (error) {
//       setUser(null);

//       // Safely extract message from response, or fallback
//       let errorMessage = "Something went wrong. Please try again.";
//       if (error.response && error.response.data && error.response.data.message) {
//         errorMessage = error.response.data.message;
//       } else if (error.message) {
//         errorMessage = error.message;
//       }

//       // Toaster.error(errorMessage); // ✅ Show toaster here
//       navigate('/login');
//     } finally {
//       setLoading(false);
//     }
//   };

//   checkAuth();
//   // eslint-disable-next-line
// }, []);


//   const logout = async () => {
//     try {
//       await axiosInstance.post(logoutAPI);
//       Toaster.success("Logout successful!");
//     } catch (error) {
//       Toaster.error(response.data.message || "Logout failed. Please try again.");
//       // Optionally handle error (e.g., show a message)
//     } finally {
//       await clearAppDataFromDB();
//       setUser(null);
//       navigate('/login');
//     }
//   };

//   return (
//     <AuthContext.Provider value={{ user, setUser, loading, setLoading, logout, setFlag, flag }}>
//       {children}
//     </AuthContext.Provider>
//   );
// };

// export const useAuth = () => useContext(AuthContext); 

import React, { createContext, useContext, useState, useEffect } from 'react';
import axiosInstance from './utlis/axiosinstance';
import { useNavigate } from 'react-router-dom';
import { logoutAPI, getStaff } from './BaseURL/baseURL';
import Toaster from './utlis/Toaster';
import { clearAppDataFromDB } from './utlis/indexedDB';
const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);


  const [flage, setFlage] = useState(false);

  const navigate = useNavigate();



// useEffect(() => {
//   const checkAuth = async () => {
//     setLoading(true);
//     try {
//       const response = await axiosInstance.get(getStaff);
//       if (response.data.success) {
//         setUser(response.data.data.staff);
//         navigate('/pos');
//       } else {
//         setUser(null);
//         Toaster.error(response.data.message || "Authorization failed.");
//         navigate('/login');
//       }
//     } catch (error) {
//       setUser(null);

//       // Safely extract message from response, or fallback
//       let errorMessage = "Something went wrong. Please try again.";
//       if (error.response && error.response.data && error.response.data.message) {
//         errorMessage = error.response.data.message;
//       } else if (error.message) {
//         errorMessage = error.message;
//       }

//       // Toaster.error(errorMessage); // ✅ Show toaster here
//       navigate('/login');
//     } finally {
//       setLoading(false);
//     }
//   };

//   checkAuth();
//   // eslint-disable-next-line
// }, []);


useEffect(() => {
  const checkAuth = async () => {
    setLoading(true);
    try {
      const response = await axiosInstance.get(getStaff);
      console.log(response.data);
      
      if (response.data.success) {
        setUser(response.data.data.staff);

        // 👇 List of paths where you DON'T want to redirect to /pos
        const excludedPaths = [
          "/live-order",
          "/reports",
          "/sales-report",
          "/gst-report",
          "/item-report",
          "/customised-sales-report",
          "/order-report",
          "/coupon-report",
          "/kot"
        ];

        // ✅ Check current path
        const currentPath = window.location.pathname;

        // ❌ Redirect only if current path is NOT in excluded list
        if (!excludedPaths.includes(currentPath)) {
          navigate("/pos");
        }

      } else {
        setUser(null);
        Toaster.error(response.data.message || "Authorization failed.");
        navigate("/login");
      }
    } catch (error) {
      setUser(null);
      let errorMessage = "Something went wrong. Please try again.";
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.message) {
        errorMessage = error.message;
      }

      // Toaster.error(errorMessage);
      navigate("/login");
    } finally {
      setLoading(false);
    }
  };

  checkAuth();
  // eslint-disable-next-line
}, []);


  // const logout = async () => {
  //   try {
  //     await axiosInstance.post(logoutAPI);
  //     Toaster.success("Logout successful!");
  //   } catch (error) {
  //     Toaster.error(response.data.message || "Logout failed. Please try again.");
  //     // Optionally handle error (e.g., show a message)
  //   } finally {
  //     await clearAppDataFromDB();

  //     setUser(null);
  //     navigate('/login');
  //   }
  // };

  const logout = async () => {
  try {
    const response = await axiosInstance.post(logoutAPI);
    Toaster.success(response.data.message || "Logout successful!");
  } catch (error) {
    console.log(error)
    Toaster.error(error.response?.data?.message || "Logout failed. Please try again.");
  } finally {
    await clearAppDataFromDB();

    localStorage.clear();  // Clear all localStorage data on logout
    
    setUser(null);
    navigate('/login');
  }
};


  return (
    <AuthContext.Provider value={{ user, setUser, loading, setLoading, logout, setFlage, flage }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext); 