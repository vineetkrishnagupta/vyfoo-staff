import { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';

const MAX_RECONNECT_ATTEMPTS = 5;
const RECONNECT_DELAY_MS = 2000; // 2 seconds

export const useWebSocket = (baseURL, userID, fooderID, eventHandlers = {}) => {
  const socketRef = useRef(null);
  const reconnectAttempts = useRef(0);
  const [isConnected, setIsConnected] = useState(false);
  const [socketId, setSocketId] = useState(null); // ✅ Track socket ID in state

  useEffect(() => {
    if (!baseURL || !userID || !fooderID) return;

    let reconnectTimeout;

    const connectSocket = () => {
      if (reconnectAttempts.current >= MAX_RECONNECT_ATTEMPTS) {
        console.warn('⚠️ Max reconnection attempts reached. Aborting...');
        return;
      }

      const socket = io(baseURL, {
        withCredentials: true,
        transports: ['polling', 'websocket'],
        path: '/socket.io/',
        reconnection: false, // disable built-in reconnection
      });

      socketRef.current = socket;

      const registerEvents = () => {
        socket.on('connect', () => {
          console.log('✅ Connected to socket:', socket.id);
          setIsConnected(true);
          setSocketId(socket.id); // ✅ Set the socket ID on connect
          reconnectAttempts.current = 0;
          socket.emit('register', { userID, fooderID });
          eventHandlers?.onConnect?.(socket);
        });

        socket.on('disconnect', (reason) => {
          console.log('🔌 Disconnected:', reason);
          setIsConnected(false);
          setSocketId(null); // ✅ Clear socket ID on disconnect
          eventHandlers?.onDisconnect?.(reason);
          scheduleReconnect();
        });

        socket.on('connect_error', (error) => {
          console.error('❌ Connect error:', error.message);
          eventHandlers?.onError?.(error);
          scheduleReconnect();
        });

        socket.on('reconnect', (attempt) => {
          console.log(`🔄 Reconnected after ${attempt} attempt(s)`);
          socket.emit('register', { userID, fooderID });
          eventHandlers?.onReconnect?.(attempt);
        });

        // Register custom events
        Object.entries(eventHandlers).forEach(([event, handler]) => {
          if (!['onConnect', 'onDisconnect', 'onError', 'onReconnect'].includes(event)) {
            socket.on(event, handler);
          }
        });
      };

      const scheduleReconnect = () => {
        if (reconnectTimeout) clearTimeout(reconnectTimeout);

        reconnectAttempts.current += 1;
        console.log(`🔁 Attempting reconnect ${reconnectAttempts.current}/${MAX_RECONNECT_ATTEMPTS}...`);

        reconnectTimeout = setTimeout(() => {
          connectSocket();
        }, RECONNECT_DELAY_MS);
      };

      registerEvents();
    };

    connectSocket();

    return () => {
      if (reconnectTimeout) clearTimeout(reconnectTimeout);

      if (socketRef.current) {
        // Unregister all event handlers
        Object.entries(eventHandlers).forEach(([event, handler]) => {
          if (!['onConnect', 'onDisconnect', 'onError', 'onReconnect'].includes(event)) {
            socketRef.current.off(event, handler);
          }
        });

        socketRef.current.off('connect');
        socketRef.current.off('disconnect');
        socketRef.current.off('connect_error');
        socketRef.current.off('reconnect');

        socketRef.current.disconnect();
        socketRef.current = null;
        setSocketId(null); // cleanup
      }
    };
  }, [baseURL, userID, fooderID]);

  return {
    socket: socketRef.current,
    emit: (event, data) => socketRef.current?.emit(event, data),
    socketId, // ✅ now tracked reactively
    isConnected,
  };
};
