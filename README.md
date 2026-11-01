# JAZLAN Steels & Accounts Management System

A billing, invoicing, fleet logistics, and accounts management platform for steel trading and distribution operations.

---

## Features

- **Billing Terminal**: Fast invoice generation with live GST (CGST 9% + SGST 9%) and 2% TDS calculations, company fleet selection, customer credit tracking, and instant PDF/print preview.
- **Invoices & Register**: Complete registry of all issued invoices, payment settlements, balance dues, and profit margins.
- **Product Catalog**: Live material management with pricing tiers and bought cost averaging.
- **Customers & Ledgers**: Credit directories, running transaction ledgers, payment recordings, and balance settlements.
- **Fleet & Vehicle Logistics**: Vehicle profile management, capacity tracking, and operational expenses (Diesel, Service, Repairs).
- **Employee Management & Payroll**: Employee database, wage tracking, and salary advance/credit records.
- **Suppliers & Accounts Payable**: Purchase order logging, material sourcing, and supplier credit management.
- **Accounts & Profit Calculations**: Financial summaries, tax withholding reports, and net profit analysis.

---

## Tech Stack

- **Frontend**: React 19, Vite, Lucide React icons, Vanilla CSS responsive design
- **Backend**: Node.js, Express 5
- **Database**: Hostinger Remote MySQL via `mysql2` connection pooling

---

## Getting Started

### 1. Environment Configuration

Create a `.env` file in the root directory (based on `.env.example`):

```env
PORT=5002
DB_HOST=your_db_host
DB_USER=your_db_user
DB_PASSWORD=your_mysql_password
DB_NAME=your_db_name
DB_PORT=3306
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Start Development Server

```bash
npm run dev
```

This runs:
- Express Backend on `http://127.0.0.1:5002`
- Vite Client on `http://localhost:5173` (or next available port, e.g. `5174`)

### 4. Build for Production

```bash
npm run build
npm start
```
