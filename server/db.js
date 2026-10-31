require('dotenv').config();
const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'srv2203.hstgr.io',
  user: process.env.DB_USER || 'u530686607_jaslon',
  password: process.env.DB_PASSWORD || 'Jaslon@123',
  database: process.env.DB_NAME || 'u530686607_jaslon',
  port: Number(process.env.DB_PORT) || 3306,
  waitForConnections: true,
  connectionLimit: 20,
  queueLimit: 0,
  decimalNumbers: true,
  enableKeepAlive: true,
  keepAliveInitialDelay: 10000
});

function translateSql(sql) {
  if (!sql || typeof sql !== 'string') return sql;
  return sql
    .replace(/\s+COLLATE\s+NOCASE/gi, '')
    .replace(/strftime\s*\(\s*'%Y'\s*,\s*date\s*\)/gi, "DATE_FORMAT(date, '%Y')")
    .replace(/strftime\s*\(\s*'%Y-%m'\s*,\s*date\s*\)/gi, "DATE_FORMAT(date, '%Y-%m')")
    .replace(/MAX\s*\(\s*0\s*,\s*stock_qty\s*-\s*\?\s*\)/gi, "GREATEST(0, stock_qty - ?)");
}

function flattenParams(params) {
  if (!params || params.length === 0) return [];
  // If first param is array and only 1 param, flatten it
  if (params.length === 1 && Array.isArray(params[0])) {
    return params[0];
  }
  return params;
}

const db = {
  prepare(sql) {
    const formattedSql = translateSql(sql);
    return {
      async all(...params) {
        const flat = flattenParams(params);
        const [rows] = await pool.query(formattedSql, flat);
        return rows || [];
      },
      async get(...params) {
        const flat = flattenParams(params);
        const [rows] = await pool.query(formattedSql, flat);
        return (rows && rows.length > 0) ? rows[0] : null;
      },
      async run(...params) {
        const flat = flattenParams(params);
        const [result] = await pool.query(formattedSql, flat);
        return {
          lastInsertRowid: result.insertId,
          changes: result.affectedRows
        };
      }
    };
  },
  async exec(sql) {
    const formatted = translateSql(sql);
    const statements = formatted.split(';').map(s => s.trim()).filter(Boolean);
    for (const stmt of statements) {
      await pool.query(stmt);
    }
  },
  pragma() {
    // No-op for MySQL
  }
};

const { initMySQL } = require('./init-mysql');

async function initDatabase() {
  await initMySQL({
    host: process.env.DB_HOST || 'srv2203.hstgr.io',
    user: process.env.DB_USER || 'u530686607_jaslon',
    password: process.env.DB_PASSWORD || 'Jaslon@123',
    database: process.env.DB_NAME || 'u530686607_jaslon',
    port: Number(process.env.DB_PORT) || 3306
  });
}

async function getNextBillNumber() {
  const [rows] = await pool.query('SELECT MAX(bill_sequence) as maxSeq FROM bills');
  const row = rows[0];
  const nextSeq = (row && row.maxSeq ? Number(row.maxSeq) : 0) + 1;
  const padded = String(nextSeq).padStart(3, '0');
  return { bill_no: `JS${padded}`, sequence: nextSeq };
}

async function recalculateCustomer(customerId) {
  const [rows] = await pool.query(`
    SELECT
      COALESCE(SUM(total_amount), 0) as totalPurchase,
      COALESCE(SUM(amount_received), 0) as totalReceived,
      COALESCE(SUM(balance_due), 0) as totalBalance
    FROM bills
    WHERE customer_id = ?
  `, [customerId]);
  const row = rows[0];

  const [dirRows] = await pool.query(`
    SELECT COALESCE(SUM(amount), 0) as totalDirect
    FROM customer_payments
    WHERE customer_id = ?
  `, [customerId]);
  const directPayments = (dirRows[0] && dirRows[0].totalDirect) ? Number(dirRows[0].totalDirect) : 0;

  let totalAdjustments = 0;
  try {
    const [adjRows] = await pool.query(`
      SELECT COALESCE(SUM(amount), 0) as totalAdj
      FROM customer_adjustments
      WHERE customer_id = ?
    `, [customerId]);
    if (adjRows[0] && adjRows[0].totalAdj) totalAdjustments = Number(adjRows[0].totalAdj);
  } catch (e) {}

  const totalPaid = ((row && row.totalReceived) ? Number(row.totalReceived) : 0) + directPayments;
  const lifetimePurchase = ((row && row.totalPurchase) ? Number(row.totalPurchase) : 0) + totalAdjustments;
  const pendingCredit = Math.max(0, lifetimePurchase - totalPaid);

  await pool.query(`
    UPDATE customers
    SET lifetime_purchase = ?, total_paid = ?, pending_credit = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `, [lifetimePurchase, totalPaid, pendingCredit, customerId]);
}

async function recalculateVehicle(vehicleId) {
  const [dRows] = await pool.query(`
    SELECT COALESCE(SUM(amount), 0) as total FROM vehicle_expenses WHERE vehicle_id = ? AND expense_type = 'Diesel'
  `, [vehicleId]);
  const diesel = dRows[0] ? Number(dRows[0].total) : 0;

  const [sRows] = await pool.query(`
    SELECT COALESCE(SUM(amount), 0) as total FROM vehicle_expenses WHERE vehicle_id = ? AND expense_type = 'Service'
  `, [vehicleId]);
  const service = sRows[0] ? Number(sRows[0].total) : 0;

  const [oRows] = await pool.query(`
    SELECT COALESCE(SUM(amount), 0) as total FROM vehicle_expenses WHERE vehicle_id = ? AND expense_type = 'Other'
  `, [vehicleId]);
  const other = oRows[0] ? Number(oRows[0].total) : 0;

  await pool.query(`
    UPDATE vehicles
    SET total_diesel_cost = ?, total_service_cost = ?, total_other_cost = ?
    WHERE id = ?
  `, [diesel, service, other, vehicleId]);
}

async function recalculateEmployee(employeeId) {
  const [rows] = await pool.query(`
    SELECT COALESCE(SUM(amount), 0) as total FROM employee_payments WHERE employee_id = ?
  `, [employeeId]);
  const totalPaid = rows[0] ? Number(rows[0].total) : 0;

  await pool.query(`
    UPDATE employees
    SET total_paid_salary = ?
    WHERE id = ?
  `, [totalPaid, employeeId]);
}

async function recalculateSupplier(supplierId) {
  const [pRows] = await pool.query(`
    SELECT
      COALESCE(SUM(total_amount), 0) as totalPurchase,
      COALESCE(SUM(paid_amount), 0) as totalPaidInPurchases
    FROM supplier_purchases
    WHERE supplier_id = ?
  `, [supplierId]);
  const purchases = pRows[0];

  const [dRows] = await pool.query(`
    SELECT COALESCE(SUM(amount), 0) as totalDirect
    FROM supplier_payments
    WHERE supplier_id = ?
  `, [supplierId]);
  const directPayments = dRows[0] ? Number(dRows[0].totalDirect) : 0;

  const totalPurchases = (purchases && purchases.totalPurchase) ? Number(purchases.totalPurchase) : 0;
  const totalPaid = ((purchases && purchases.totalPaidInPurchases) ? Number(purchases.totalPaidInPurchases) : 0) + directPayments;
  const pendingCredit = Math.max(0, totalPurchases - totalPaid);

  await pool.query(`
    UPDATE suppliers
    SET total_purchases = ?, total_paid = ?, pending_credit = ?
    WHERE id = ?
  `, [totalPurchases, totalPaid, pendingCredit, supplierId]);
}

module.exports = {
  db,
  pool,
  initDatabase,
  getNextBillNumber,
  recalculateCustomer,
  recalculateVehicle,
  recalculateEmployee,
  recalculateSupplier
};
