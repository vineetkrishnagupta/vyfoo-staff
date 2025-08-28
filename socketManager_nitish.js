const { Server } = require('socket.io');

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
          'https://pos.scanka.com'
        ],
        credentials: true
      },
      transports: ['polling', 'websocket'],
      allowUpgrades: true,
      pingTimeout: 60000,
      pingInterval: 25000,
      path: '/socket.io/',
    });

    this.io.on('connection', (socket) => {
      console.log(`Socket connected: ${socket.id}`);

      socket.on('register', ({ userID, fooderID }) => {
        try {
          socket.join(`fooder_${fooderID}`);
          this.socketToFooderMap.set(socket.id, fooderID);
          console.log(`User ${userID} registered socket ${socket.id} to fooder_${fooderID}`);
        } catch (err) {
          console.log(`Register error:`, err);
        }
      });


      socket.on('broadcastToFooder', ({ fooderID, event, data }) => {
        try {
          data.socketId = socket.id; // Include sender's socket.id in data
          socket.to(`fooder_${fooderID}`).emit(event, data);

          console.log(`Broadcasted '${event}' to fooder_${fooderID} (excluding socket ${socket.id})`);
        } catch (err) {
          console.error('broadcastToFooder error:', err);
        }
      });



      socket.on('disconnect', () => {
        const fooderID = this.socketToFooderMap.get(socket.id);
        if (fooderID) {
          socket.leave(`fooder_${fooderID}`);
          this.socketToFooderMap.delete(socket.id);
          console.log(`Socket ${socket.id} disconnected and left fooder_${fooderID}`);
        }
      });
    });
  }

  // Emit to all in fooder room except sender socket
  emitToFooder(fooderID, event, data, senderSocketID = null) {
    if (senderSocketID) {
      this.io.to(`fooder_${fooderID}`).except(senderSocketID).emit(event, data);
    } else {
      this.io.to(`fooder_${fooderID}`).emit(event, data);
    }
  }

  // Emit to fooder + table
  emitToFooderTable(fooderID, tableNo, event, data) {
    this.io.to(`fooder_${fooderID}_table_${tableNo}`).emit(event, data);
  }
}

module.exports = new SocketManager();





// const { Server } = require('socket.io');

// class SocketManager {
//   constructor() {
//     this.io = null;
//     this.socketToFooderMap = new Map(); // socket.id -> fooderID
//   }

//   initialize(server) {
//     this.io = new Server(server, {
//       cors: {
//         origin: [
//           'http://localhost:3000',
//           // 'https://1l12d5d5-3000.inc1.devtunnels.ms',
//           // 'https://pnn0n83t-3000.inc1.devtunnels.ms',
//           // 'https://pos.scanka.com',
//           'https://pos.vayulabs.shop'
//         ],
//         credentials: true
//       },
//       transports: ['polling', 'websocket'],
//       allowUpgrades: true,
//       pingTimeout: 60000,
//       pingInterval: 25000,
//       path: '/socket.io/',
//     });

//     this.io.on('connection', (socket) => {
//       console.log(`Socket connected: ${socket.id}`);

//       socket.on('register', ({ userID, fooderID }) => {
//         try {
//           socket.join(`fooder_${fooderID}`);
//           this.socketToFooderMap.set(socket.id, fooderID);
//           console.log(`User ${userID} registered socket ${socket.id} to fooder_${fooderID}`);
//         } catch (err) {
//           console.log(`Register error:`, err);
//         }
//       });

//       // Broadcast to all in same fooder room except this socket
//       // socket.on('broadcastToFooder', ({ fooderID, event, data }) => {
//       //   try {
//       //     socket.to(`fooder_${fooderID}`).emit(event, data);
//       //     console.log(`Broadcasted '${event}' to fooder_${fooderID} (excluding socket ${socket.id})`);
//       //   } catch (err) {
//       //     console.error('broadcastToFooder error:', err);
//       //   }
//       // });

//       // socket.on('broadcastToFooder', ({ fooderID, event, data }) => {
//       //   try {
//       //     this.io.to(`fooder_${fooderID}`).except(socket.id).emit(event, data);
//       //     console.log(`Broadcasted '${event}' to fooder_${fooderID} (excluding socket ${socket.id})`);
//       //   } catch (err) {
//       //     console.error('broadcastToFooder error:', err);
//       //   }
//       // });

//       socket.on('broadcastToFooder', ({ fooderID, event, data }) => {
//         try {
//           data.socketId = socket.id; // Include sender's socket.id in data
//           socket.to(`fooder_${fooderID}`).emit(event, data);

//           console.log(`Broadcasted '${event}' to fooder_${fooderID} (excluding socket ${socket.id})`);
//         } catch (err) {
//           console.error('broadcastToFooder error:', err);
//         }
//       });



//       socket.on('disconnect', () => {
//         const fooderID = this.socketToFooderMap.get(socket.id);
//         if (fooderID) {
//           socket.leave(`fooder_${fooderID}`);
//           this.socketToFooderMap.delete(socket.id);
//           console.log(`Socket ${socket.id} disconnected and left fooder_${fooderID}`);
//         }
//       });
//     });
//   }

//   // Emit to all in fooder room except sender socket
//   emitToFooder(fooderID, event, data, senderSocketID = null) {
//     if (senderSocketID) {
//       this.io.to(`fooder_${fooderID}`).except(senderSocketID).emit(event, data);
//     } else {
//       this.io.to(`fooder_${fooderID}`).emit(event, data);
//     }
//   }

//   // Emit to fooder + table
//   emitToFooderTable(fooderID, tableNo, event, data) {
//     this.io.to(`fooder_${fooderID}_table_${tableNo}`).emit(event, data);
//   }
// }

// module.exports = new SocketManager();
