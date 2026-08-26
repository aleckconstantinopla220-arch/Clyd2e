# Login & Registration System with Database

## Architecture Overview

Your application now has:

- **Frontend**: React + Vite (runs on <http://localhost:5173>)
- **Backend**: Express.js server (runs on <http://localhost:3001>)
- **Database**: JSON-based user database (users.json)

## Running the Application

### Option 1: Run Both Frontend & Backend Together (Recommended)

```bash
npm run dev:all
```

This will start:

- Backend server on <http://localhost:3001>
- Frontend dev server on <http://localhost:5173>

### Option 2: Run Separately

**Terminal 1 - Start Backend Server:**

```bash
npm run server
```

The server will run on <http://localhost:3001>

**Terminal 2 - Start Frontend Development Server:**

```bash
npm run dev
```

The frontend will run on <http://localhost:5173>

## Features

### User Registration

1. Click "Sign up here" on the login page
2. Enter email, password (minimum 6 characters), confirm password
3. Accept terms and conditions
4. Submit → Account is saved to `users.json`
5. Automatically logged in and redirected to home page

### User Login

1. Enter registered email and password
2. Submit → Credentials validated against database
3. If valid → redirected to home page with welcome message
4. If invalid → error message displayed

### Database (users.json)

Located in the project root. Each user object contains:

```json
{
  "id": "1629234982000",
  "email": "user@example.com",
  "password": "hashedPassword",
  "createdAt": "2026-08-17T..."
}
```

## API Endpoints

### POST /api/register

**Request:**

```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response (201):**

```json
{
  "message": "Account created successfully",
  "user": { "id": "...", "email": "..." }
}
```

### POST /api/login

**Request:**

```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response (200):**

```json
{
  "message": "Login successful",
  "user": { "id": "...", "email": "..." }
}
```

### GET /api/health

**Response:**

```json
{ "message": "Server is running" }
```

## Important Notes

⚠️ **Security**: Passwords are currently stored as plain text in the database. For production, implement proper password hashing using bcrypt or similar.

📝 **File Structure:**

```
Clyd2e/
├── server.js              # Express backend server
├── users.json             # User database (auto-created)
├── src/
│   ├── components/
│   │   ├── Login.jsx      # Updated to use API
│   │   ├── Register.jsx   # Updated to use API
│   │   └── Home.jsx
│   └── styles/
└── package.json
```

## Testing the System

1. Open browser at <http://localhost:5173>
2. Click "Sign up here"
3. Register with email: <test@example.com>, password: password123
4. You'll be logged in and see the home page
5. Click Logout
6. Login with the registered credentials
7. Check `users.json` to see the stored user data

## Troubleshooting

- **"Cannot connect to server" error**: Make sure the backend is running on port 3001
- **Port already in use**: Change the PORT in server.js if port 3001 is busy
- **CORS errors**: Make sure the backend server is running before accessing the frontend

Enjoy your new login and registration system! 🎉
