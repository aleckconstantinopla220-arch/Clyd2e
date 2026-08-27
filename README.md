# Clyd2e Store

## Architecture Overview

Your application now has:

- **Frontend**: React + Vite (runs on <http://localhost:5173>)
- **Backend**: Express.js server (runs on <http://localhost:3001>)
- **Data**: JSON files for products, users, and orders

## Running the Application

For a hosted frontend and backend on different domains, create a frontend environment
variable before building:

```bash
VITE_API_URL=https://your-api-domain.example.com
```

Keep it empty or unset when the frontend and Express server use the same domain. The
backend must be running and its storage must persist `orders.json`; ephemeral hosting
storage will not retain orders after a restart.

For Render, attach a persistent disk mounted at `/var/data` to the backend service and
set this environment variable:

```bash
ORDERS_DB_PATH=/var/data/orders.json
```

### Stripe payments

Purchases use Stripe-hosted Checkout. Configure the backend with the test secret key
through an environment variable; never put the `sk_` key in frontend code or commit it:

```bash
STRIPE_SECRET_KEY=sk_test_...
FRONTEND_URL=http://localhost:5173
```

The publishable key is not required for Stripe-hosted Checkout. Use Stripe test card
`4242 4242 4242 4242`, any future expiry date, and any CVC while testing.

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

- Direct navigation to the home module
- Product browsing and category filtering
- Cart and order placement
- Shipping status view
- Admin order management

The admin account is `aleckconstantinopla220@gmail.com`. You can override this
address at runtime with the `ADMIN_EMAIL` environment variable.

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

### GET /api/health

**Response:**

```json
{ "message": "Server is running" }
```

## Important Notes

📝 **File Structure:**

```
Clyd2e/
├── server.js              # Express backend server
├── users.json             # User database (auto-created)
├── src/
│   ├── components/
│   │   ├── Home.jsx
│   │   ├── Store.jsx
│   │   ├── Cart.jsx
│   │   └── Shipping.jsx
│   └── styles/
└── package.json
```

## Testing the System

1. Open the app at <http://localhost:5173>
2. The home module opens automatically
3. Browse the store, add products to the cart, and place an order

## Troubleshooting

- **"Cannot connect to server" error**: Make sure the backend is running on port 3001
- **Port already in use**: Change the PORT in server.js if port 3001 is busy
- **CORS errors**: Make sure the backend server is running before accessing the frontend
