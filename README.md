# KR Staff POS Backend

A robust Express.js backend server for Staff POS system with authentication, database management, and RESTful API endpoints using MySQL.

## Features

- 🔐 JWT-based authentication
- 🗄️ MySQL database with mysql2
- 🛡️ Security middleware (Helmet, CORS, Rate Limiting)
- ✅ Input validation with express-validator
- 🏗️ Modular folder structure
- 📝 Comprehensive error handling
- 🔄 Password hashing with bcryptjs

## Prerequisites

- Node.js (v14 or higher)
- MySQL (v8.0 or higher) - Database should be running
- npm or yarn package manager

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd krstaffposbackend
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp env.example .env
```

4. Configure your `.env` file with your MySQL connection details:
```env
PORT=5000
NODE_ENV=development
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=krstaffpos
DB_PORT=3306
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRE=24h
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

5. Start the server:
```bash
# Development mode with nodemon
npm run dev

# Production mode
npm start
```

## API Endpoints

### Authentication

#### POST `/api/auth/login`
Login with email and password.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "id": 1,
      "name": "User Name",
      "email": "user@example.com",
      "role": "admin"
    },
    "token": "jwt_token_here"
  }
}
```

#### GET `/api/auth/me`
Get current user profile (requires authentication).

**Headers:**
```
Authorization: Bearer <jwt_token>
```

#### PUT `/api/auth/update-profile`
Update user profile (requires authentication).

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Request Body:**
```json
{
  "name": "Updated Name",
  "email": "updated@example.com"
}
```

#### PUT `/api/auth/change-password`
Change user password (requires authentication).

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Request Body:**
```json
{
  "currentPassword": "oldpassword",
  "newPassword": "newpassword123"
}
```

#### POST `/api/auth/logout`
Logout user (requires authentication).

**Headers:**
```
Authorization: Bearer <jwt_token>
```

### Health Check

#### GET `/api/health`
Check server status.

**Response:**
```json
{
  "success": true,
  "message": "Server is running",
  "timestamp": "2023-01-01T00:00:00.000Z"
}
```

## Project Structure

```
krstaffposbackend/
├── config/
│   └── db.js                 # Database connection
├── controllers/
│   └── authController.js     # Authentication logic
├── middleware/
│   ├── auth.js              # Authentication middleware
│   └── errorHandler.js      # Error handling middleware
├── models/
│   └── User.js              # User model
├── routes/
│   ├── auth.js              # Authentication routes
│   └── index.js             # Main routes
├── .env                     # Environment variables
├── env.example              # Environment variables template
├── package.json             # Dependencies and scripts
├── server.js                # Main server file
└── README.md                # Project documentation
```

## Database Schema

### Users Table
```sql
CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  role ENUM('admin', 'manager', 'staff') DEFAULT 'staff',
  isActive BOOLEAN DEFAULT TRUE,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_email (email),
  INDEX idx_role (role),
  INDEX idx_isActive (isActive)
);
```

## User Roles

- **admin**: Full system access
- **manager**: Management level access
- **staff**: Basic staff access

## Security Features

- Password hashing with bcryptjs
- JWT token authentication
- Rate limiting to prevent abuse
- CORS protection
- Helmet security headers
- Input validation and sanitization
- Error handling without exposing sensitive information

## Error Handling

The application includes comprehensive error handling for:
- Database connection errors
- Authentication failures
- Validation errors
- JWT token errors
- MySQL-specific errors
- General server errors

## Development

### Available Scripts

- `npm start`: Start the server in production mode
- `npm run dev`: Start the server in development mode with nodemon
- `npm test`: Run tests (to be implemented)

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | 5000 |
| `NODE_ENV` | Environment mode | development |
| `DB_HOST` | MySQL host | localhost |
| `DB_USER` | MySQL username | root |
| `DB_PASSWORD` | MySQL password | - |
| `DB_NAME` | MySQL database name | krstaffpos |
| `DB_PORT` | MySQL port | 3306 |
| `JWT_SECRET` | JWT signing secret | - |
| `JWT_EXPIRE` | JWT token expiration | 24h |
| `RATE_LIMIT_WINDOW_MS` | Rate limit window | 900000 (15 min) |
| `RATE_LIMIT_MAX_REQUESTS` | Max requests per window | 100 |

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the ISC License. 