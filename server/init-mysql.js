const mysql = require('mysql2/promise');

const schema = [
  `CREATE TABLE IF NOT EXISTS products (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    category VARCHAR(100) DEFAULT 'Steel',
    hsn_code VARCHAR(50) DEFAULT '7214',
    unit VARCHAR(50) DEFAULT 'Tons',
    default_sell_rate DOUBLE DEFAULT 0,
    default_bought_rate DOUBLE DEFAULT 0,
    gst_rate DOUBLE DEFAULT 18.0,
    stock_qty DOUBLE DEFAULT 100.0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  `CREATE TABLE IF NOT EXISTS customers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    phone VARCHAR(50),
    address TEXT,
    gstin VARCHAR(50),
    lifetime_purchase DOUBLE DEFAULT 0,
    total_paid DOUBLE DEFAULT 0,
    pending_credit DOUBLE DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  `CREATE TABLE IF NOT EXISTS vehicles (
    id INT AUTO_INCREMENT PRIMARY KEY,
    vehicle_number VARCHAR(100) NOT NULL UNIQUE,
    model_type VARCHAR(100) DEFAULT 'Truck',
    capacity_tons DOUBLE DEFAULT 10.0,
    driver_name VARCHAR(150),
    driver_phone VARCHAR(50),
    status VARCHAR(50) DEFAULT 'Active',
    total_diesel_cost DOUBLE DEFAULT 0,
    total_service_cost DOUBLE DEFAULT 0,
    total_other_cost DOUBLE DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  `CREATE TABLE IF NOT EXISTS vehicle_expenses (
    id INT AUTO_INCREMENT PRIMARY KEY,
    vehicle_id INT NOT NULL,
    expense_type VARCHAR(50) NOT NULL,
    date VARCHAR(20) NOT NULL,
    amount DOUBLE NOT NULL,
    liters DOUBLE DEFAULT 0,
    rate_per_liter DOUBLE DEFAULT 0,
    service_type VARCHAR(150),
    garage_name VARCHAR(150),
    category VARCHAR(100),
    odometer_reading DOUBLE DEFAULT 0,
    payment_mode VARCHAR(50) DEFAULT 'Cash',
    receipt_no VARCHAR(100),
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (vehicle_id) REFERENCES vehicles(id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  `CREATE TABLE IF NOT EXISTS employees (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    employee_type VARCHAR(100) NOT NULL,
    phone VARCHAR(50),
    salary_type VARCHAR(50) DEFAULT 'Monthly',
    base_salary DOUBLE DEFAULT 0,
    total_paid_salary DOUBLE DEFAULT 0,
    current_credit_balance DOUBLE DEFAULT 0,
    status VARCHAR(50) DEFAULT 'Active',
    join_date VARCHAR(20),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  `CREATE TABLE IF NOT EXISTS employee_payments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    employee_id INT NOT NULL,
    date VARCHAR(20) NOT NULL,
    payment_type VARCHAR(50) NOT NULL,
    amount DOUBLE NOT NULL,
    month_year VARCHAR(50),
    payment_mode VARCHAR(50) DEFAULT 'Cash',
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  `CREATE TABLE IF NOT EXISTS suppliers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    company_name VARCHAR(200),
    phone VARCHAR(50),
    address TEXT,
    gstin VARCHAR(50),
    materials_supplied TEXT,
    total_purchases DOUBLE DEFAULT 0,
    total_paid DOUBLE DEFAULT 0,
    pending_credit DOUBLE DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  `CREATE TABLE IF NOT EXISTS supplier_purchases (
    id INT AUTO_INCREMENT PRIMARY KEY,
    supplier_id INT NOT NULL,
    product_id INT,
    purchase_date VARCHAR(20) NOT NULL,
    invoice_no VARCHAR(100),
    product_name VARCHAR(200) NOT NULL,
    quantity DOUBLE NOT NULL,
    unit VARCHAR(50) DEFAULT 'Tons',
    bought_price_per_unit DOUBLE NOT NULL,
    subtotal DOUBLE NOT NULL,
    gst_rate DOUBLE DEFAULT 18.0,
    cgst_amount DOUBLE DEFAULT 0,
    sgst_amount DOUBLE DEFAULT 0,
    tds_rate DOUBLE DEFAULT 0,
    tds_amount DOUBLE DEFAULT 0,
    freight_charges DOUBLE DEFAULT 0,
    total_amount DOUBLE NOT NULL,
    paid_amount DOUBLE DEFAULT 0,
    balance_due DOUBLE DEFAULT 0,
    payment_status VARCHAR(50) DEFAULT 'Pending',
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  `CREATE TABLE IF NOT EXISTS supplier_payments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    supplier_id INT NOT NULL,
    date VARCHAR(20) NOT NULL,
    amount DOUBLE NOT NULL,
    payment_mode VARCHAR(50) DEFAULT 'Bank Transfer',
    reference_no VARCHAR(100),
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  `CREATE TABLE IF NOT EXISTS bills (
    id INT AUTO_INCREMENT PRIMARY KEY,
    bill_no VARCHAR(50) NOT NULL UNIQUE,
    bill_sequence INT NOT NULL,
    date VARCHAR(20) NOT NULL,
    time VARCHAR(20) NOT NULL,
    customer_id INT NOT NULL,
    customer_name VARCHAR(200) NOT NULL,
    vehicle_id INT,
    vehicle_number VARCHAR(100),
    driver_name VARCHAR(150),
    supplier_name VARCHAR(150),
    product_id INT,
    product_name VARCHAR(200) NOT NULL,
    quantity DOUBLE NOT NULL,
    unit VARCHAR(50) DEFAULT 'Tons',
    rate DOUBLE NOT NULL,
    bought_price_per_unit DOUBLE DEFAULT 0,
    rent_transport DOUBLE DEFAULT 0,
    subtotal DOUBLE NOT NULL,
    gst_rate DOUBLE DEFAULT 18.0,
    cgst_amount DOUBLE DEFAULT 0,
    sgst_amount DOUBLE DEFAULT 0,
    tds_rate DOUBLE DEFAULT 0,
    tds_amount DOUBLE DEFAULT 0,
    total_amount DOUBLE NOT NULL,
    amount_received DOUBLE DEFAULT 0,
    balance_due DOUBLE DEFAULT 0,
    payment_mode VARCHAR(50) DEFAULT 'Cash',
    payment_status VARCHAR(50) DEFAULT 'Paid',
    upi_reference VARCHAR(100),
    notes TEXT,
    biller_name VARCHAR(100) DEFAULT 'Admin',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (customer_id) REFERENCES customers(id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  `CREATE TABLE IF NOT EXISTS customer_payments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    customer_id INT NOT NULL,
    bill_id INT,
    date VARCHAR(20) NOT NULL,
    amount DOUBLE NOT NULL,
    payment_mode VARCHAR(50) DEFAULT 'Cash',
    reference_no VARCHAR(100),
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  `CREATE TABLE IF NOT EXISTS accounts_ledger (
    id INT AUTO_INCREMENT PRIMARY KEY,
    date VARCHAR(20) NOT NULL,
    type VARCHAR(50) NOT NULL,
    category VARCHAR(100) NOT NULL,
    reference_type VARCHAR(100),
    reference_id INT,
    amount DOUBLE NOT NULL,
    payment_mode VARCHAR(50) DEFAULT 'Cash',
    description TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  `CREATE TABLE IF NOT EXISTS customer_adjustments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    customer_id INT NOT NULL,
    date VARCHAR(20) NOT NULL,
    type VARCHAR(50) NOT NULL DEFAULT 'OPENING_BALANCE',
    ref_no VARCHAR(100) DEFAULT 'OPENING-BAL',
    amount DOUBLE NOT NULL,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  `CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(191) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    name VARCHAR(100) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'biller',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  `CREATE TABLE IF NOT EXISTS daily_expenses (
    id INT AUTO_INCREMENT PRIMARY KEY,
    expense_date VARCHAR(20) NOT NULL,
    driver_id INT,
    driver_name VARCHAR(150) NOT NULL,
    vehicle_id INT,
    vehicle_number VARCHAR(100),
    given_amount DOUBLE NOT NULL DEFAULT 0,
    spent_amount DOUBLE DEFAULT 0,
    balance_amount DOUBLE DEFAULT 0,
    status VARCHAR(50) DEFAULT 'Pending',
    payment_mode VARCHAR(50) DEFAULT 'Cash',
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  `CREATE TABLE IF NOT EXISTS daily_expense_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    daily_expense_id INT NOT NULL,
    category VARCHAR(100) NOT NULL,
    note TEXT,
    amount DOUBLE NOT NULL DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (daily_expense_id) REFERENCES daily_expenses(id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`
];

const indexes = [
  'CREATE INDEX idx_bills_customer ON bills(customer_id)',
  'CREATE INDEX idx_bills_date ON bills(date)',
  'CREATE INDEX idx_bills_seq ON bills(bill_sequence)',
  'CREATE INDEX idx_veh_exp ON vehicle_expenses(vehicle_id)',
  'CREATE INDEX idx_emp_pay ON employee_payments(employee_id)',
  'CREATE INDEX idx_sup_pur ON supplier_purchases(supplier_id)',
  'CREATE INDEX idx_cust_adj ON customer_adjustments(customer_id)',
  'CREATE INDEX idx_daily_exp_date ON daily_expenses(expense_date)',
  'CREATE INDEX idx_daily_exp_driver ON daily_expenses(driver_name)',
  'CREATE INDEX idx_daily_exp_items_parent ON daily_expense_items(daily_expense_id)',
  'CREATE INDEX idx_daily_exp_items_cat ON daily_expense_items(category)'
];

async function initMySQL(config) {
  const conn = await mysql.createConnection(config);
  console.log('Connected to Hostinger MySQL successfully!');

  for (const sql of schema) {
    await conn.query(sql);
  }
  console.log('Created all tables.');

  for (const idx of indexes) {
    try {
      await conn.query(idx);
    } catch (e) {
      // index already exists
    }
  }
  console.log('Created all indexes.');

  // Seed Default Users
  const crypto = require('crypto');
  const hashPassword = (pwd) => crypto.createHash('sha256').update(String(pwd)).digest('hex');

  await conn.query(`
    INSERT INTO users (email, password, name, role)
    VALUES (?, ?, 'Admin', 'admin')
    ON DUPLICATE KEY UPDATE password = VALUES(password), role = 'admin', name = 'Admin'
  `, ['admin@jazlan.com', hashPassword('Jaz$lan@')]);

  await conn.query(`
    INSERT INTO users (email, password, name, role)
    VALUES (?, ?, 'Biller', 'biller')
    ON DUPLICATE KEY UPDATE password = VALUES(password), role = 'biller', name = 'Biller'
  `, ['bill@jazlan.com', hashPassword('admin@123')]);

  console.log('Seeded default users: admin@jazlan.com & bill@jazlan.com');

  const [tables] = await conn.query('SHOW TABLES');
  console.log('Verified tables in DB:', tables.map(t => Object.values(t)[0]));
  await conn.end();
}

if (require.main === module) {
  require('dotenv').config();
  initMySQL({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: Number(process.env.DB_PORT) || 3306
  }).catch(err => {
    console.error('Migration error:', err);
    process.exit(1);
  });
}

module.exports = { initMySQL };

