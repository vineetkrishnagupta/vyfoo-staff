// src/context/SocketContext.js
import React, { createContext, useContext, useMemo } from "react";
import { useWebSocket } from "./hooks/useWebSocket";
import { BaseURL } from "./BaseURL/baseURL";
import { useAuth } from "./AuthContext";


const SocketContext = createContext();

export const SocketProvider = ({ children }) => {
  const { user } = useAuth();
  const { socket, emit, isConnected, socketId } = useWebSocket(
    BaseURL,
    user?.id,
    user?.fooderID || user?.fooder_id
  );

  // Memoize the context value
  const value = useMemo(
    () => ({
      socket,
      emit,
      isConnected,
      socketId,
    }),
    [socket, emit, isConnected, socketId]
  );

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocketContext = () => useContext(SocketContext);
