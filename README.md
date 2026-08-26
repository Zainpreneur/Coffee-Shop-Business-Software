# ☕ Brew Base — Coffee Shop Business Software

A full-stack business management suite for a coffee shop: point of sale, menu &
recipe management, inventory tracking with automatic stock deduction, order
history, customer loyalty, staff accounts, and a reporting dashboard.

## Stack

- **Backend:** Node.js, Express, TypeScript, SQLite (`better-sqlite3`), JWT auth, Zod validation
- **Frontend:** React 19, TypeScript, Vite, Tailwind CSS v4, React Router, Recharts, Axios

No external services or cloud accounts are required — SQLite is a single file on disk.

## Features

- **Authentication & roles** — `admin`, `manager`, `cashier`, each with different access (e.g. only admins manage staff; only admins/managers manage menu & inventory).
- **Point of Sale** — tap-to-add menu grid, running cart, discounts, loyalty point redemption, tax calculation, checkout, printable-style receipt.
- **Automatic inventory deduction** — every menu item has a *recipe* of inventory ingredients; checking out an order deducts the right quantities and blocks the sale if stock is insufficient. Cancelling a completed order restocks it.
- **Inventory management** — stock levels, reorder thresholds, manual adjustments (restock, waste, corrections) with an audit trail.
- **Menu management** — categories, items, pricing, emoji icons, active/hidden toggle, and recipe editor linking items to inventory.
- **Orders** — searchable/filterable order history, order detail view, cancel & restock.
- **Customers & loyalty** — customer directory, points balance, points earned per purchase, points redeemable for discounts.
- **Staff management** (admin only) — create/edit/disable employee accounts and roles.
- **Dashboard** — today/7-day/all-time revenue, low-stock alerts, revenue-over-time chart, top-selling items chart.

## Project layout

```
backend/    Express + TypeScript API, SQLite database, seed script
frontend/   React + Vite + TypeScript single-page app
```

## Getting started

### 1. Backend

```bash
cd backend
cp .env.example .env
npm install
npm run seed   # creates the SQLite DB and demo data
npm run dev    # starts the API on http://localhost:4000
```

### 2. Frontend

In a second terminal:

```bash
cd frontend
cp .env.example .env
npm install
npm run dev    # starts the app on http://localhost:5173
```

Open http://localhost:5173 and sign in with one of the seeded demo accounts
(password for all: `password123`):

| Email | Role |
| --- | --- |
| admin@coffeeshop.test | Admin |
| manager@coffeeshop.test | Manager |
| cashier@coffeeshop.test | Cashier |

### Resetting the data

Delete `backend/data/coffeeshop.db*` and re-run `npm run seed` inside `backend/`.

## Building for production

```bash
# Backend
cd backend && npm run build && npm start

# Frontend
cd frontend && npm run build   # outputs static assets to frontend/dist
```

Serve `frontend/dist` with any static host (Nginx, Vercel, Netlify, etc.) and
point `VITE_API_URL` at your deployed backend URL. The backend can run on any
Node host — set `JWT_SECRET`, `DATABASE_PATH`, and `CORS_ORIGIN` via
environment variables in production (see `backend/.env.example`).

## API overview

All endpoints are under `/api` and (except `/api/auth/login` and
`/api/health`) require a `Authorization: Bearer <token>` header.

| Area | Routes |
| --- | --- |
| Auth | `POST /api/auth/login`, `GET /api/auth/me` |
| Menu | `GET/POST/PUT/DELETE /api/menu/categories`, `GET/POST/PUT/DELETE /api/menu/items` |
| Inventory | `GET/POST/PUT/DELETE /api/inventory`, `POST /api/inventory/:id/adjust`, `GET /api/inventory/:id/movements` |
| Orders | `GET /api/orders`, `GET /api/orders/:id`, `POST /api/orders/checkout`, `POST /api/orders/:id/cancel` |
| Customers | `GET/POST/PUT/DELETE /api/customers` |
| Employees | `GET/POST/PUT/DELETE /api/employees` (admin only) |
| Reports | `GET /api/reports/summary`, `/revenue-by-day`, `/top-items`, `/low-stock`, `/payment-methods` |

## Notes on the business logic

- **Tax rate** is a flat 8.25% sample rate, applied after discounts (`backend/src/routes/orders.ts`).
- **Loyalty points**: 1 point earned per $1 of order total; 1 point = $0.05 of discount when redeemed.
- **Recipes**: each menu item can consume any number of inventory items in configurable quantities. Checkout validates stock for *every* ingredient across the whole cart before committing, so a sale either fully succeeds or fails cleanly.
