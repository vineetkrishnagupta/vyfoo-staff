const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const http = require('http');
require('dotenv').config();
const pool = require('./config/db');
const errorHandler = require('./middleware/errorHandler');
const routes = require('./routes');
const socketManager = require('./socketManager');

const app = express();


app.use(cookieParser());
app.use(cors({
  origin: [
    'http://localhost:3000',
    'http://localhost:5173',
    'https://pos.scanka.com',
    'https://staffpos.shunyape.com',
    'https://staffpos.shunyape.com'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS']
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

app.use((req, res, next) => {
  req.ipAddress = req.header("x-forwarded-for");
  next();
});

app.use('/api', routes);

// app.get('/test', async (req, res) => {
//   try {
//     const [rows] = await pool.query('SELECT 1');
    
//     // Emit the message to the user's socket
//    // Test broadcast: send to all with fooderID=1 except sender
//     socketManager.emitToFooder(1, 'refresh-table', {
//       message: `Table 11 booked`, fooderID: 1
//     });

//     res.json({ success: true, message: 'Database connected', result: rows });
//   } catch (error) {
//     res.status(500).json({ success: false, message: 'Database connection failed', error: error.message });
//   }
// });

app.get('/test', async (req, res) => {
  try {
    const [rows] = await pool.query(`SELECT NOW() AS current_indian_time`);

    // Parse MySQL datetime string to Date object in UTC
    const utcDate = new Date(rows[0].current_indian_time);

    // Subtract 4 hours (4 * 60 * 60 * 1000 ms)
    const fixedDate = new Date(utcDate.getTime() - 4 * 60 * 60 * 1000);

    // Format to 'YYYY-MM-DD HH:mm:ss'
    const formattedDate = fixedDate.toISOString().slice(0, 19).replace('T', ' ');

    res.json({
      success: true,
      message: 'Database connected',
      result: [{ current_indian_time: formattedDate }]
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Database connection failed',
      error: error.message,
    });
  }
});

app.use('*', (req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

app.use(errorHandler);

const PORT = process.env.PORT || 3111;
const server = http.createServer(app);

socketManager.initialize(server);

server.listen(PORT, () => {
  console.log(`server is running on port : ${PORT}`);
});
