const { Server } = require('socket.io');

// socket manager send by manoj sir


class SocketManager {
  constructor() {
    this.io = null;
    this.socketToFooderMap = new Map(); // socket.id -> fooderID
  }

  initialize(server) {
    this.io = new Server(server, {
      cors: {
        origin: [
          'http://localhost:3000',
          'https://pos.scanka.com',
          'https://staffpos.shunyape.com'
        ],
        credentials: true
      },
      transports: ['polling'],   // ✅ only polling
      allowUpgrades: false,      // ✅ don’t try to upgrade to websocket
      pingTimeout: 60000,        // wait 60s before marking dead
      pingInterval: 30000,       // poll every 30s (reduce overhead)
      path: '/socket.io/',
    });

    this.io.on('connection', (socket) => {
      console.log(`[+] Socket connected: ${socket.id}`);

      // --- Register socket to fooder room ---
      socket.on('register', ({ userID, fooderID }) => {
        try {
          if (!fooderID) return;
          socket.join(`fooder_${fooderID}`);
          this.socketToFooderMap.set(socket.id, fooderID);
          console.log(`User ${userID} registered -> fooder_${fooderID}`);
        } catch (err) {
          console.error(`Register error:`, err);
        }
      });

      // --- Broadcast within fooder (except sender) ---
      socket.on('broadcastToFooder', ({ fooderID, event, data }) => {
        try {
          if (!fooderID || !event) return;
          data = data || {};
          data.socketId = socket.id; // include sender ID

          // only emit if room exists
          if (this.io.sockets.adapter.rooms.has(`fooder_${fooderID}`)) {
            socket.to(`fooder_${fooderID}`).emit(event, data);
            console.log(
              `Broadcasted '${event}' to fooder_${fooderID} (excluding ${socket.id})`
            );
          }
        } catch (err) {
          console.error('broadcastToFooder error:', err);
        }
      });

      // --- Disconnect cleanup ---
      socket.on('disconnect', () => {
        const fooderID = this.socketToFooderMap.get(socket.id);
        if (fooderID) {
          socket.leave(`fooder_${fooderID}`);
          this.socketToFooderMap.delete(socket.id);
          console.log(`[-] Socket ${socket.id} left fooder_${fooderID}`);
        }
      });
    });
  }

  // Emit to all in fooder room (optionally exclude sender)
  emitToFooder(fooderID, event, data, senderSocketID = null) {
    if (!fooderID || !event) return;
    if (senderSocketID) {
      this.io.to(`fooder_${fooderID}`).except(senderSocketID).emit(event, data);
    } else {
      this.io.to(`fooder_${fooderID}`).emit(event, data);
    }
  }

  // Emit to fooder + table
  emitToFooderTable(fooderID, tableNo, event, data) {
    if (!fooderID || !tableNo || !event) return;
    this.io.to(`fooder_${fooderID}_table_${tableNo}`).emit(event, data);
  }
}

module.exports = new SocketManager();
