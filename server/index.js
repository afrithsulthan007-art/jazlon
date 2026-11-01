const express = require('express');
const cors = require('cors');
const {
  db,
  pool,
  initDatabase,
  getNextBillNumber,
  recalculateCustomer,
  recalculateVehicle,
  recalculateEmployee,
  recalculateSupplier
} = require('./db');

const app = express();
const PORT = process.env.PORT || 5002;

app.use(cors());
app.use(express.json());

// Health & Database Diagnostics API
app.get('/api/health', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT 1 + 1 as ping');
    const [prodCount] = await pool.query('SELECT COUNT(*) as count FROM products');
    const [custCount] = await pool.query('SELECT COUNT(*) as count FROM customers');
    const [billCount] = await pool.query('SELECT COUNT(*) as count FROM bills');
    res.json({
      status: 'ok',
      database: 'connected',
      counts: {
        products: prodCount[0].count,
        customers: custCount[0].count,
        bills: billCount[0].count
      }
    });
  } catch (err) {
    res.status(500).json({
      status: 'error',
      database: 'disconnected',
      error: err.message,
      code: err.code
    });
  }
});

// Initialize MySQL database (run on local server startup; skipped on serverless cold starts)
if (!process.env.VERCEL) {
  initDatabase().catch(console.error);
}

// -----------------------------------------------------------------------------
// 1. PRODUCTS / MATERIALS API
// -----------------------------------------------------------------------------
app.get('/api/products', async (req, res) => {
  try {
    const products = await db.prepare('SELECT * FROM products ORDER BY name ASC').all();
    res.json(products);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/products', async (req, res) => {
  try {
    const { name, category, hsn_code, unit, default_sell_rate, default_bought_rate, gst_rate, stock_qty } = req.body;
    if (!name) return res.status(400).json({ error: 'Product name is required' });

    // Check if product already exists
    const existing = await db.prepare('SELECT * FROM products WHERE LOWER(TRIM(name)) = LOWER(TRIM(?))').get(name.trim());
    if (existing) {
      const oldRate = Number(existing.default_bought_rate || 0);
      const newRate = Number(default_bought_rate || 0);
      let calculatedRate = oldRate;
      if (newRate > 0) {
        if (oldRate > 0 && oldRate !== newRate) {
          calculatedRate = Math.round(((oldRate + newRate) / 2) * 100) / 100;
        } else {
          calculatedRate = newRate;
        }
      }
      await db.prepare(`
        UPDATE products
        SET category = COALESCE(?, category),
            hsn_code = COALESCE(?, hsn_code),
            unit = COALESCE(?, unit),
            default_sell_rate = CASE WHEN ? > 0 THEN ? ELSE default_sell_rate END,
            default_bought_rate = ?,
            gst_rate = COALESCE(?, gst_rate),
            stock_qty = stock_qty + ?
        WHERE id = ?
      `).run(
        category || existing.category,
        hsn_code || existing.hsn_code,
        unit || existing.unit,
        Number(default_sell_rate || 0),
        Number(default_sell_rate || 0),
        calculatedRate,
        gst_rate !== undefined ? Number(gst_rate) : existing.gst_rate,
        Number(stock_qty || 0),
        existing.id
      );

      const product = await db.prepare('SELECT * FROM products WHERE id = ?').get(existing.id);
      return res.status(200).json(product);
    }

    const info = await db.prepare(`
      INSERT INTO products (name, category, hsn_code, unit, default_sell_rate, default_bought_rate, gst_rate, stock_qty)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      name.trim(),
      category || 'Steel',
      hsn_code || '7214',
      unit || 'Tons',
      Number(default_sell_rate || 0),
      Number(default_bought_rate || 0),
      Number(gst_rate || 18),
      Number(stock_qty || 0)
    );

    const product = await db.prepare('SELECT * FROM products WHERE id = ?').get(info.lastInsertRowid);
    res.status(201).json(product);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/products/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, category, hsn_code, unit, default_sell_rate, default_bought_rate, gst_rate, stock_qty } = req.body;
    if (!name) return res.status(400).json({ error: 'Product name is required' });

    await db.prepare(`
      UPDATE products
      SET name = ?, category = ?, hsn_code = ?, unit = ?, default_sell_rate = ?, default_bought_rate = ?, gst_rate = ?, stock_qty = ?
      WHERE id = ?
    `).run(
      name.trim(),
      category || 'Steel',
      hsn_code || '7214',
      unit || 'Tons',
      Number(default_sell_rate || 0),
      Number(default_bought_rate || 0),
      Number(gst_rate || 18),
      Number(stock_qty || 0),
      id
    );

    const product = await db.prepare('SELECT * FROM products WHERE id = ?').get(id);
    res.json(product);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/products/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await db.prepare('DELETE FROM products WHERE id = ?').run(id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// -----------------------------------------------------------------------------
// 2. CUSTOMERS API
// -----------------------------------------------------------------------------
app.get('/api/customers', async (req, res) => {
  try {
    const customers = await db.prepare(`
      SELECT 
        c.*,
        (SELECT COUNT(*) FROM bills WHERE customer_id = c.id) as total_bills,
        (SELECT MAX(date) FROM bills WHERE customer_id = c.id) as last_bill_date
      FROM customers c
      ORDER BY c.name COLLATE NOCASE ASC
    `).all();
    res.json(customers);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/customers/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const customer = await db.prepare('SELECT * FROM customers WHERE id = ?').get(id);
    if (!customer) return res.status(404).json({ error: 'Customer not found' });

    const bills = await db.prepare('SELECT * FROM bills WHERE customer_id = ? ORDER BY id DESC').all(id);
    const payments = await db.prepare('SELECT * FROM customer_payments WHERE customer_id = ? ORDER BY id DESC').all(id);
    const adjustments = await db.prepare('SELECT * FROM customer_adjustments WHERE customer_id = ? ORDER BY id DESC').all(id);

    res.json({ customer, bills, payments, adjustments });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/customers', async (req, res) => {
  try {
    const { name, phone, address, gstin } = req.body;
    if (!name) return res.status(400).json({ error: 'Customer name is required' });

    // Check if customer already exists
    const existing = await db.prepare('SELECT * FROM customers WHERE LOWER(TRIM(name)) = LOWER(TRIM(?))').get(name.trim());
    if (existing) {
      return res.json(existing);
    }

    const info = await db.prepare(`
      INSERT INTO customers (name, phone, address, gstin)
      VALUES (?, ?, ?, ?)
    `).run(name.trim(), phone || '', address || '', gstin || '');

    const customer = await db.prepare('SELECT * FROM customers WHERE id = ?').get(info.lastInsertRowid);
    res.status(201).json(customer);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/customers/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, phone, address, gstin } = req.body;

    await db.prepare(`
      UPDATE customers 
      SET name = ?, phone = ?, address = ?, gstin = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(name.trim(), phone || '', address || '', gstin || '', id);

    await recalculateCustomer(id);
    const customer = await db.prepare('SELECT * FROM customers WHERE id = ?').get(id);
    res.json(customer);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/customers/:id/pay', async (req, res) => {
  try {
    const { id } = req.params;
    const { amount, date, payment_mode, reference_no, notes } = req.body;
    const payAmt = Number(amount);
    if (!payAmt || payAmt <= 0) return res.status(400).json({ error: 'Valid payment amount is required' });

    const payDate = date || new Date().toISOString().split('T')[0];
    const info = await db.prepare(`
      INSERT INTO customer_payments (customer_id, date, amount, payment_mode, reference_no, notes)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(id, payDate, payAmt, payment_mode || 'Cash', reference_no || '', notes || '');

    // Record into accounts ledger
    await db.prepare(`
      INSERT INTO accounts_ledger (date, type, category, reference_type, reference_id, amount, payment_mode, description)
      VALUES (?, 'Income', 'Customer Payment', 'CustomerPayment', ?, ?, ?, ?)
    `).run(payDate, info.lastInsertRowid, payAmt, payment_mode || 'Cash', `Payment from customer ID ${id}`);

    await recalculateCustomer(id);
    const customer = await db.prepare('SELECT * FROM customers WHERE id = ?').get(id);
    res.json({ success: true, customer });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/customers/:id/adjust', async (req, res) => {
  try {
    const { id } = req.params;
    const { amount, date, notes, type, ref_no } = req.body;
    const adjAmt = Number(amount);
    if (!adjAmt || adjAmt <= 0) return res.status(400).json({ error: 'Valid amount is required' });

    await db.prepare(`
      INSERT INTO customer_adjustments (customer_id, date, type, ref_no, amount, notes)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(id, date || new Date().toISOString().split('T')[0], type || 'OPENING_BALANCE', ref_no || 'OPENING-BAL', adjAmt, notes || 'Opening Balance / Handover Dues');

    await recalculateCustomer(id);
    const customer = await db.prepare('SELECT * FROM customers WHERE id = ?').get(id);
    res.json({ success: true, customer });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/customers/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await db.prepare('DELETE FROM customer_payments WHERE customer_id = ?').run(id);
    await db.prepare('DELETE FROM customer_adjustments WHERE customer_id = ?').run(id);
    await db.prepare('DELETE FROM bills WHERE customer_id = ?').run(id);
    await db.prepare('DELETE FROM customers WHERE id = ?').run(id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// -----------------------------------------------------------------------------
// 3. VEHICLES API
// -----------------------------------------------------------------------------
app.get('/api/vehicles', async (req, res) => {
  try {
    const vehicles = await db.prepare(`
      SELECT 
        v.*,
        (SELECT COUNT(*) FROM bills WHERE vehicle_id = v.id) as total_trips,
        (SELECT COUNT(*) FROM vehicle_expenses WHERE vehicle_id = v.id) as total_expense_count
      FROM vehicles v
      ORDER BY v.vehicle_number ASC
    `).all();
    res.json(vehicles);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/vehicles/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const vehicle = await db.prepare('SELECT * FROM vehicles WHERE id = ?').get(id);
    if (!vehicle) return res.status(404).json({ error: 'Vehicle not found' });

    const expenses = await db.prepare('SELECT * FROM vehicle_expenses WHERE vehicle_id = ? ORDER BY date DESC, id DESC').all(id);
    const trips = await db.prepare('SELECT * FROM bills WHERE vehicle_id = ? ORDER BY date DESC').all(id);

    res.json({ vehicle, expenses, trips });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/vehicles', async (req, res) => {
  try {
    const { vehicle_number, model_type, capacity_tons, driver_name, driver_phone } = req.body;
    if (!vehicle_number) return res.status(400).json({ error: 'Vehicle number is required' });

    const info = await db.prepare(`
      INSERT INTO vehicles (vehicle_number, model_type, capacity_tons, driver_name, driver_phone)
      VALUES (?, ?, ?, ?, ?)
    `).run(
      vehicle_number.trim().toUpperCase(),
      model_type || 'Truck',
      Number(capacity_tons || 10),
      driver_name || '',
      driver_phone || ''
    );

    const vehicle = await db.prepare('SELECT * FROM vehicles WHERE id = ?').get(info.lastInsertRowid);
    res.status(201).json(vehicle);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/vehicles/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { vehicle_number, model_type, capacity_tons, driver_name, driver_phone, status } = req.body;

    await db.prepare(`
      UPDATE vehicles
      SET vehicle_number = ?, model_type = ?, capacity_tons = ?, driver_name = ?, driver_phone = ?, status = ?
      WHERE id = ?
    `).run(
      vehicle_number.trim().toUpperCase(),
      model_type || 'Truck',
      Number(capacity_tons || 10),
      driver_name || '',
      driver_phone || '',
      status || 'Active',
      id
    );

    await recalculateVehicle(id);
    const vehicle = await db.prepare('SELECT * FROM vehicles WHERE id = ?').get(id);
    res.json(vehicle);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/vehicles/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await db.prepare('DELETE FROM vehicles WHERE id = ?').run(id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Add Vehicle Expense (+ Diesel, + Service, + Other)
app.post('/api/vehicles/:id/expenses', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      expense_type, // 'Diesel', 'Service', 'Other'
      date,
      amount,
      liters,
      rate_per_liter,
      service_type,
      garage_name,
      category,
      odometer_reading,
      payment_mode,
      receipt_no,
      notes
    } = req.body;

    if (!expense_type || !amount) {
      return res.status(400).json({ error: 'Expense type and amount are required' });
    }

    const expDate = date || new Date().toISOString().split('T')[0];
    const expAmt = Number(amount);

    const info = await db.prepare(`
      INSERT INTO vehicle_expenses (
        vehicle_id, expense_type, date, amount, liters, rate_per_liter,
        service_type, garage_name, category, odometer_reading, payment_mode,
        receipt_no, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      expense_type,
      expDate,
      expAmt,
      Number(liters || 0),
      Number(rate_per_liter || 0),
      service_type || null,
      garage_name || null,
      category || null,
      Number(odometer_reading || 0),
      payment_mode || 'Cash',
      receipt_no || null,
      notes || null
    );

    // Ledger entry for accounts
    await db.prepare(`
      INSERT INTO accounts_ledger (date, type, category, reference_type, reference_id, amount, payment_mode, description)
      VALUES (?, 'Expense', ?, 'VehicleExpense', ?, ?, ?, ?)
    `).run(
      expDate,
      `Vehicle ${expense_type}`,
      info.lastInsertRowid,
      expAmt,
      payment_mode || 'Cash',
      `Vehicle #${id} ${expense_type} expense: ₹${expAmt}`
    );

    await recalculateVehicle(id);
    const updatedVehicle = await db.prepare('SELECT * FROM vehicles WHERE id = ?').get(id);
    const newExpense = await db.prepare('SELECT * FROM vehicle_expenses WHERE id = ?').get(info.lastInsertRowid);

    res.status(201).json({ success: true, vehicle: updatedVehicle, expense: newExpense });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// -----------------------------------------------------------------------------
// 4. EMPLOYEES API
// -----------------------------------------------------------------------------
app.get('/api/employees', async (req, res) => {
  try {
    const employees = await db.prepare(`
      SELECT 
        e.*,
        (SELECT COUNT(*) FROM employee_payments WHERE employee_id = e.id) as payment_count,
        (SELECT MAX(date) FROM employee_payments WHERE employee_id = e.id) as last_payment_date
      FROM employees e
      ORDER BY e.name ASC
    `).all();
    res.json(employees);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/employees', async (req, res) => {
  try {
    const { name, employee_type, phone, salary_type, base_salary, current_credit_balance, join_date } = req.body;
    if (!name || !employee_type) {
      return res.status(400).json({ error: 'Employee name and type are required' });
    }

    const info = await db.prepare(`
      INSERT INTO employees (name, employee_type, phone, salary_type, base_salary, current_credit_balance, join_date)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      name.trim(),
      employee_type,
      phone || '',
      salary_type || 'Monthly',
      Number(base_salary || 0),
      Number(current_credit_balance || 0),
      join_date || new Date().toISOString().split('T')[0]
    );

    const employee = await db.prepare('SELECT * FROM employees WHERE id = ?').get(info.lastInsertRowid);
    res.status(201).json(employee);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/employees/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, employee_type, phone, salary_type, base_salary, current_credit_balance, status } = req.body;

    await db.prepare(`
      UPDATE employees
      SET name = ?, employee_type = ?, phone = ?, salary_type = ?, base_salary = ?, current_credit_balance = ?, status = ?
      WHERE id = ?
    `).run(
      name.trim(),
      employee_type,
      phone || '',
      salary_type || 'Monthly',
      Number(base_salary || 0),
      Number(current_credit_balance || 0),
      status || 'Active',
      id
    );

    const employee = await db.prepare('SELECT * FROM employees WHERE id = ?').get(id);
    res.json(employee);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Pay Salary / Advance / Credit to Employee
app.post('/api/employees/:id/pay', async (req, res) => {
  try {
    const { id } = req.params;
    const { amount, date, payment_type, month_year, payment_mode, notes } = req.body;
    const payAmt = Number(amount);
    if (!payAmt || payAmt <= 0) return res.status(400).json({ error: 'Valid payment amount is required' });

    const payDate = date || new Date().toISOString().split('T')[0];

    const info = await db.prepare(`
      INSERT INTO employee_payments (employee_id, date, payment_type, amount, month_year, payment_mode, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      payDate,
      payment_type || 'Salary',
      payAmt,
      month_year || 'Current Month',
      payment_mode || 'Cash',
      notes || ''
    );

    // If paying salary against pending balance, adjust current_credit_balance
    const emp = await db.prepare('SELECT * FROM employees WHERE id = ?').get(id);
    let newCredit = emp.current_credit_balance;
    if (payment_type === 'Salary') {
      newCredit = Math.max(0, newCredit - payAmt);
    } else if (payment_type === 'Advance') {
      newCredit = newCredit - payAmt; // Employee owes back or has taken advance
    }

    await db.prepare('UPDATE employees SET current_credit_balance = ? WHERE id = ?').run(newCredit, id);
    await recalculateEmployee(id);

    // Accounts ledger
    await db.prepare(`
      INSERT INTO accounts_ledger (date, type, category, reference_type, reference_id, amount, payment_mode, description)
      VALUES (?, 'Expense', 'Salary', 'EmployeePayment', ?, ?, ?, ?)
    `).run(
      payDate,
      info.lastInsertRowid,
      payAmt,
      payment_mode || 'Cash',
      `Salary/payment to ${emp.name} (${emp.employee_type})`
    );

    const updatedEmp = await db.prepare('SELECT * FROM employees WHERE id = ?').get(id);
    const payments = await db.prepare('SELECT * FROM employee_payments WHERE employee_id = ? ORDER BY date DESC').all(id);

    res.json({ success: true, employee: updatedEmp, payments });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Add Credit Due to Employee (reminds owner to pay later)
app.post('/api/employees/:id/credit', async (req, res) => {
  try {
    const { id } = req.params;
    const { amount, date, month_year, notes } = req.body;
    const creditAmt = Number(amount);
    if (!creditAmt || creditAmt <= 0) {
      return res.status(400).json({ error: 'Valid credit amount is required' });
    }

    const creditDate = date || new Date().toISOString().split('T')[0];

    // 1. Record in employee_payments as 'Credit Due'
    await db.prepare(`
      INSERT INTO employee_payments (employee_id, date, payment_type, amount, month_year, payment_mode, notes)
      VALUES (?, ?, 'Credit Due', ?, ?, 'Credit', ?)
    `).run(
      id,
      creditDate,
      creditAmt,
      month_year || 'Current Period',
      notes || 'Salary credit added to dues (to pay later)'
    );

    // 2. Increase current_credit_balance
    await db.prepare(`
      UPDATE employees 
      SET current_credit_balance = current_credit_balance + ? 
      WHERE id = ?
    `).run(creditAmt, id);

    const updatedEmp = await db.prepare('SELECT * FROM employees WHERE id = ?').get(id);
    const payments = await db.prepare('SELECT * FROM employee_payments WHERE employee_id = ? ORDER BY date DESC, id DESC').all(id);

    res.json({ success: true, employee: updatedEmp, payments, message: `Added ₹${creditAmt.toLocaleString('en-IN')} to credit due balance` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/employees/:id/payments', async (req, res) => {
  try {
    const { id } = req.params;
    const payments = await db.prepare('SELECT * FROM employee_payments WHERE employee_id = ? ORDER BY date DESC, id DESC').all(id);
    res.json(payments);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// -----------------------------------------------------------------------------
// 5. SUPPLIERS API
// -----------------------------------------------------------------------------
app.get('/api/suppliers', async (req, res) => {
  try {
    const suppliers = await db.prepare(`
      SELECT 
        s.*,
        (SELECT COUNT(*) FROM supplier_purchases WHERE supplier_id = s.id) as total_purchase_orders,
        (SELECT MAX(purchase_date) FROM supplier_purchases WHERE supplier_id = s.id) as last_purchase_date
      FROM suppliers s
      ORDER BY s.pending_credit DESC
    `).all();
    res.json(suppliers);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/suppliers', async (req, res) => {
  try {
    const { name, company_name, phone, address, gstin, materials_supplied } = req.body;
    if (!name) return res.status(400).json({ error: 'Supplier name is required' });

    const info = await db.prepare(`
      INSERT INTO suppliers (name, company_name, phone, address, gstin, materials_supplied)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      name.trim(),
      company_name || '',
      phone || '',
      address || '',
      gstin || '',
      materials_supplied || 'Steel & Raw Materials'
    );

    const supplier = await db.prepare('SELECT * FROM suppliers WHERE id = ?').get(info.lastInsertRowid);
    res.status(201).json(supplier);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/suppliers/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const supplier = await db.prepare('SELECT * FROM suppliers WHERE id = ?').get(id);
    if (!supplier) return res.status(404).json({ error: 'Supplier not found' });

    const purchases = await db.prepare('SELECT * FROM supplier_purchases WHERE supplier_id = ? ORDER BY purchase_date DESC').all(id);
    const payments = await db.prepare('SELECT * FROM supplier_payments WHERE supplier_id = ? ORDER BY date DESC').all(id);

    res.json({ supplier, purchases, payments });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Record new Purchase from Supplier (Raw Material Bought / Stock In)
app.post('/api/suppliers/:id/purchases', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      purchase_date,
      invoice_no,
      product_id,
      product_name,
      quantity,
      unit,
      bought_price_per_unit,
      gst_rate,
      tds_rate,
      freight_charges,
      paid_amount,
      payment_mode,
      vehicle_number,
      total_amount,
      notes
    } = req.body;

    const qty = Number(quantity || 0);
    const rate = Number(bought_price_per_unit || 0);
    const subtotal = qty * rate;
    const gRate = Number(gst_rate !== undefined ? gst_rate : 0);
    const totalGst = subtotal * (gRate / 100);
    const cgst = totalGst / 2;
    const sgst = totalGst / 2;
    const tRate = Number(tds_rate || 0);
    const tds = subtotal * (tRate / 100);
    const freight = Number(freight_charges || 0);
    const calculatedTotal = Math.round(subtotal + totalGst + freight - tds);
    const totalAmount = total_amount !== undefined ? Math.round(Number(total_amount)) : calculatedTotal;
    const paid = Number(paid_amount || 0);
    const balance = Math.max(0, totalAmount - paid);
    const status = balance <= 0 ? 'Paid' : (paid > 0 ? 'Partial' : 'Credit');

    const pDate = purchase_date || new Date().toISOString().split('T')[0];
    const combinedNotes = [notes, vehicle_number ? `Vehicle: ${vehicle_number}` : ''].filter(Boolean).join(' • ');

    const info = await db.prepare(`
      INSERT INTO supplier_purchases (
        supplier_id, purchase_date, invoice_no, product_id, product_name, quantity, unit,
        bought_price_per_unit, subtotal, gst_rate, cgst_amount, sgst_amount,
        tds_rate, tds_amount, freight_charges, total_amount, paid_amount,
        balance_due, payment_status, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      pDate,
      invoice_no || `SUP-${Date.now().toString().slice(-5)}`,
      product_id ? Number(product_id) : null,
      product_name || 'Raw Material',
      qty,
      unit || 'Tons',
      rate,
      subtotal,
      gRate,
      cgst,
      sgst,
      tRate,
      tds,
      freight,
      totalAmount,
      paid,
      balance,
      status,
      combinedNotes || ''
    );

    // 1. Update Product Inventory Stock & Latest Bought Cost (Averaged if price changed)
    let matchedProduct = null;
    if (product_id) {
      matchedProduct = await db.prepare('SELECT * FROM products WHERE id = ?').get(product_id);
    }
    if (!matchedProduct && product_name) {
      matchedProduct = await db.prepare('SELECT * FROM products WHERE LOWER(TRIM(name)) = LOWER(TRIM(?))').get(product_name.trim());
    }

    if (matchedProduct) {
      const oldBought = Number(matchedProduct.default_bought_rate || 0);
      const newBought = Number(rate || 0);
      let calculatedBoughtRate = oldBought;

      if (newBought > 0) {
        if (oldBought > 0 && oldBought !== newBought) {
          // Take average of old bought price and new bought price
          calculatedBoughtRate = Math.round(((oldBought + newBought) / 2.0) * 100) / 100;
        } else {
          calculatedBoughtRate = newBought;
        }
      }

      await db.prepare(`
        UPDATE products 
        SET stock_qty = stock_qty + ?,
            default_bought_rate = ?
        WHERE id = ?
      `).run(qty, calculatedBoughtRate, matchedProduct.id);
    } else if (product_name && product_name.trim()) {
      try {
        const infoProd = await db.prepare(`
          INSERT INTO products (name, category, hsn_code, unit, default_sell_rate, default_bought_rate, gst_rate, stock_qty)
          VALUES (?, 'Steel', '7214', ?, 0, ?, ?, ?)
        `).run(product_name.trim(), unit || 'Tons', rate, gRate || 18, qty);
        matchedProduct = await db.prepare('SELECT * FROM products WHERE id = ?').get(infoProd.lastInsertRowid);
      } catch (e) {
        // ignore duplicate
      }
    }

    // 2. Ledger entry for bought price / expense
    await db.prepare(`
      INSERT INTO accounts_ledger (date, type, category, reference_type, reference_id, amount, payment_mode, description)
      VALUES (?, 'Expense', 'Raw Material Purchase', 'SupplierPurchase', ?, ?, ?, ?)
    `).run(
      pDate,
      info.lastInsertRowid,
      paid > 0 ? paid : totalAmount,
      payment_mode || 'Bank Transfer',
      `Material purchase from supplier #${id} (${product_name || 'Goods'}) - Total: ₹${totalAmount}, Paid: ₹${paid}, Credit: ₹${balance}`
    );

    await recalculateSupplier(id);
    const updatedSup = await db.prepare('SELECT * FROM suppliers WHERE id = ?').get(id);
    const updatedProduct = matchedProduct ? await db.prepare('SELECT * FROM products WHERE id = ?').get(matchedProduct.id) : null;

    res.status(201).json({
      success: true,
      supplier: updatedSup,
      product: updatedProduct,
      purchase_id: info.lastInsertRowid
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete Supplier Purchase (Cancel Inward Stock & reverse credit)
app.delete('/api/suppliers/purchases/:purchaseId', async (req, res) => {
  try {
    const { purchaseId } = req.params;
    const purchase = await db.prepare('SELECT * FROM supplier_purchases WHERE id = ?').get(purchaseId);
    if (!purchase) return res.status(404).json({ error: 'Purchase record not found' });

    // Revert inventory addition
    if (purchase.product_id) {
      await db.prepare('UPDATE products SET stock_qty = MAX(0, stock_qty - ?) WHERE id = ?').run(purchase.quantity, purchase.product_id);
    } else if (purchase.product_name) {
      await db.prepare('UPDATE products SET stock_qty = MAX(0, stock_qty - ?) WHERE LOWER(TRIM(name)) = LOWER(TRIM(?))').run(purchase.quantity, purchase.product_name.trim());
    }

    await db.prepare('DELETE FROM supplier_purchases WHERE id = ?').run(purchaseId);
    await db.prepare("DELETE FROM accounts_ledger WHERE reference_type = 'SupplierPurchase' AND reference_id = ?").run(purchaseId);

    await recalculateSupplier(purchase.supplier_id);
    const updatedSup = await db.prepare('SELECT * FROM suppliers WHERE id = ?').get(purchase.supplier_id);

    res.json({ success: true, supplier: updatedSup });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Pay Supplier (reducing supplier credit)
app.post('/api/suppliers/:id/pay', async (req, res) => {
  try {
    const { id } = req.params;
    const { amount, date, payment_mode, reference_no, notes } = req.body;
    const payAmt = Number(amount);
    if (!payAmt || payAmt <= 0) return res.status(400).json({ error: 'Valid payment amount is required' });

    const payDate = date || new Date().toISOString().split('T')[0];

    const info = await db.prepare(`
      INSERT INTO supplier_payments (supplier_id, date, amount, payment_mode, reference_no, notes)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(id, payDate, payAmt, payment_mode || 'Bank Transfer', reference_no || '', notes || '');

    // Ledger entry
    await db.prepare(`
      INSERT INTO accounts_ledger (date, type, category, reference_type, reference_id, amount, payment_mode, description)
      VALUES (?, 'Expense', 'Supplier Payment', 'SupplierPayment', ?, ?, ?, ?)
    `).run(payDate, info.lastInsertRowid, payAmt, payment_mode || 'Bank Transfer', `Payment to supplier ID ${id}`);

    await recalculateSupplier(id);
    const updatedSup = await db.prepare('SELECT * FROM suppliers WHERE id = ?').get(id);
    res.json({ success: true, supplier: updatedSup });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/suppliers/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await db.prepare('DELETE FROM supplier_payments WHERE supplier_id = ?').run(id);
    await db.prepare('DELETE FROM supplier_purchases WHERE supplier_id = ?').run(id);
    await db.prepare('DELETE FROM suppliers WHERE id = ?').run(id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// -----------------------------------------------------------------------------
// 6. BILLS / INVOICES API (JS001, JS002, ...)
// -----------------------------------------------------------------------------
app.get('/api/bills/next-number', async (req, res) => {
  try {
    const next = await getNextBillNumber();
    res.json(next);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/bills', async (req, res) => {
  try {
    const { search, status, from_date, to_date, exact_date, vehicle } = req.query;
    let query = `
      SELECT b.*,
             COALESCE(NULLIF(b.driver_name, ''), v.driver_name, '') as driver_name,
             COALESCE(NULLIF(b.supplier_name, ''), (
               SELECT s.name 
               FROM supplier_purchases sp 
               JOIN suppliers s ON sp.supplier_id = s.id 
               WHERE LOWER(TRIM(sp.product_name)) = LOWER(TRIM(b.product_name)) 
               ORDER BY sp.id DESC LIMIT 1
             ), 'Direct / Steel Mill') as supplier_name,
             COALESCE(p.default_bought_rate, (
               SELECT p2.default_bought_rate FROM products p2 WHERE LOWER(TRIM(p2.name)) = LOWER(TRIM(b.product_name)) LIMIT 1
             ), b.bought_price_per_unit, 0) as catalog_bought_rate
      FROM bills b
      LEFT JOIN vehicles v ON b.vehicle_id = v.id OR (b.vehicle_number IS NOT NULL AND b.vehicle_number != '' AND UPPER(REPLACE(TRIM(v.vehicle_number), ' ', '')) = UPPER(REPLACE(TRIM(b.vehicle_number), ' ', '')))
      LEFT JOIN products p ON b.product_id = p.id
      WHERE 1=1
    `;
    const params = [];

    if (search) {
      query += ` AND (b.bill_no LIKE ? OR b.customer_name LIKE ? OR b.product_name LIKE ? OR b.vehicle_number LIKE ? OR b.driver_name LIKE ? OR v.driver_name LIKE ?)`;
      const s = `%${search}%`;
      params.push(s, s, s, s, s, s);
    }

    if (status && status !== 'All') {
      query += ` AND b.payment_status = ?`;
      params.push(status);
    }

    if (exact_date) {
      query += ` AND b.date = ?`;
      params.push(exact_date);
    } else {
      if (from_date) {
        query += ` AND b.date >= ?`;
        params.push(from_date);
      }

      if (to_date) {
        query += ` AND b.date <= ?`;
        params.push(to_date);
      }
    }

    if (vehicle && vehicle !== 'All') {
      const cleanVeh = vehicle.trim();
      query += ` AND (
        UPPER(REPLACE(TRIM(b.vehicle_number), ' ', '')) = UPPER(REPLACE(TRIM(?), ' ', ''))
        OR b.vehicle_id = (SELECT id FROM vehicles WHERE UPPER(REPLACE(TRIM(vehicle_number), ' ', '')) = UPPER(REPLACE(TRIM(?), ' ', '')) LIMIT 1)
      )`;
      params.push(cleanVeh, cleanVeh);
    }

    query += ' ORDER BY b.bill_sequence DESC, b.id DESC';
    const bills = await db.prepare(query).all(...params);
    res.json(bills);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/bills/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const bill = await db.prepare('SELECT * FROM bills WHERE id = ? OR bill_no = ?').get(id, id);
    if (!bill) return res.status(404).json({ error: 'Bill not found' });

    const customer = await db.prepare('SELECT * FROM customers WHERE id = ?').get(bill.customer_id);
    const vehicle = bill.vehicle_id ? await db.prepare('SELECT * FROM vehicles WHERE id = ?').get(bill.vehicle_id) : null;

    res.json({ bill, customer, vehicle });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create New Bill (Billing Page)
app.post('/api/bills', async (req, res) => {
  try {
    const {
      customer_name,
      customer_phone,
      customer_address,
      customer_gstin,
      vehicle_id,
      vehicle_number,
      driver_name,
      supplier_name,
      product_id,
      product_name,
      quantity,
      unit,
      rate,
      bought_price_per_unit,
      rent_transport,
      gst_rate,
      tds_rate,
      amount_received,
      payment_mode,
      upi_reference,
      notes,
      biller_name,
      date,
      time
    } = req.body;

    if (!customer_name || !product_name || !quantity || !rate) {
      return res.status(400).json({ error: 'Customer name, product, quantity, and rate are required' });
    }

    // 1. AUTO-SAVE / GET CUSTOMER
    let customer = await db.prepare('SELECT * FROM customers WHERE LOWER(TRIM(name)) = LOWER(TRIM(?))').get(customer_name.trim());
    if (!customer) {
      const custInfo = await db.prepare(`
        INSERT INTO customers (name, phone, address, gstin)
        VALUES (?, ?, ?, ?)
      `).run(customer_name.trim(), customer_phone || '', customer_address || '', customer_gstin || '');
      customer = await db.prepare('SELECT * FROM customers WHERE id = ?').get(custInfo.lastInsertRowid);
    } else {
      // Update phone or address if provided and was empty
      if ((customer_phone && !customer.phone) || (customer_address && !customer.address)) {
        await db.prepare('UPDATE customers SET phone = COALESCE(NULLIF(?, ""), phone), address = COALESCE(NULLIF(?, ""), address) WHERE id = ?')
          .run(customer_phone || '', customer_address || '', customer.id);
      }
    }

    // 2. RESOLVE VEHICLE & DRIVER
    let resolvedVehicleId = vehicle_id ? Number(vehicle_id) : null;
    let resolvedVehicleNumber = vehicle_number ? vehicle_number.trim().toUpperCase() : null;
    let resolvedDriver = driver_name ? driver_name.trim() : null;

    if (resolvedVehicleId) {
      const v = await db.prepare('SELECT vehicle_number, driver_name FROM vehicles WHERE id = ?').get(resolvedVehicleId);
      if (v) {
        if (!resolvedVehicleNumber) resolvedVehicleNumber = v.vehicle_number;
        if (!resolvedDriver && v.driver_name) resolvedDriver = v.driver_name;
      }
    }
    if (!resolvedDriver && resolvedVehicleNumber) {
      const v = await db.prepare('SELECT driver_name FROM vehicles WHERE UPPER(REPLACE(TRIM(vehicle_number), " ", "")) = UPPER(REPLACE(TRIM(?), " ", ""))').get(resolvedVehicleNumber);
      if (v && v.driver_name) resolvedDriver = v.driver_name;
    }

    let resolvedSupplier = supplier_name ? supplier_name.trim() : null;
    if (!resolvedSupplier && product_name) {
      const sp = await db.prepare('SELECT s.name FROM supplier_purchases sp JOIN suppliers s ON sp.supplier_id = s.id WHERE LOWER(TRIM(sp.product_name)) = LOWER(TRIM(?)) ORDER BY sp.id DESC LIMIT 1').get(product_name.trim());
      if (sp) resolvedSupplier = sp.name;
    }
    if (!resolvedSupplier) resolvedSupplier = 'Direct / Steel Mill';

    // 3. FINANCIAL CALCULATIONS
    const qty = Number(quantity);
    const itemRate = Number(rate);
    const subtotal = qty * itemRate;
    const rent = Number(rent_transport || 0);

    const gRate = Number(gst_rate !== undefined ? gst_rate : 18);
    const taxableAmount = subtotal + rent;
    const gstTotal = (taxableAmount * gRate) / 100;
    const cgst = gstTotal / 2;
    const sgst = gstTotal / 2;

    const tRate = Number(tds_rate || 0);
    const tdsAmount = (taxableAmount * tRate) / 100;

    const totalAmount = Math.round(taxableAmount + gstTotal + tdsAmount);
    const received = Number(amount_received || 0);
    const balanceDue = Math.max(0, totalAmount - received);
    const finalPaymentMode = received === 0 ? 'Credit' : (payment_mode || 'Cash');

    let paymentStatus = 'Paid';
    if (balanceDue > 0 && received > 0) {
      paymentStatus = 'Partial';
    } else if (balanceDue > 0 && received === 0) {
      paymentStatus = 'Credit';
    }

    // 4. GENERATE SEQUENTIAL BILL NUMBER (JS001, JS002, ...)
    const { bill_no, sequence } = await getNextBillNumber();
    const billDate = date || new Date().toISOString().split('T')[0];
    const now = new Date();
    const billTime = time || now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });

    // 5. INSERT BILL RECORD
    const insertBill = await db.prepare(`
      INSERT INTO bills (
        bill_no, bill_sequence, date, time, customer_id, customer_name,
        vehicle_id, vehicle_number, driver_name, supplier_name, product_id, product_name,
        quantity, unit, rate, bought_price_per_unit, rent_transport,
        subtotal, gst_rate, cgst_amount, sgst_amount, tds_rate, tds_amount,
        total_amount, amount_received, balance_due, payment_mode, payment_status,
        upi_reference, notes, biller_name
      ) VALUES (
        ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?,
        ?, ?, ?
      )
    `);

    const info = await insertBill.run(
      bill_no,
      sequence,
      billDate,
      billTime,
      customer.id,
      customer.name,
      resolvedVehicleId,
      resolvedVehicleNumber,
      resolvedDriver,
      resolvedSupplier,
      product_id ? Number(product_id) : null,
      product_name.trim(),
      qty,
      unit || 'Tons',
      itemRate,
      Number(bought_price_per_unit || 0),
      rent,
      subtotal,
      gRate,
      cgst,
      sgst,
      tRate,
      tdsAmount,
      totalAmount,
      received,
      balanceDue,
      finalPaymentMode,
      paymentStatus,
      upi_reference || null,
      notes || null,
      biller_name || 'Admin'
    );

    const billId = info.lastInsertRowid;

    // 6. RECORD IN CUSTOMER PAYMENTS IF AMOUNT WAS RECEIVED
    if (received > 0) {
      await db.prepare(`
        INSERT INTO customer_payments (customer_id, bill_id, date, amount, payment_mode, reference_no, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(customer.id, billId, billDate, received, payment_mode || 'Cash', bill_no, `Payment for invoice ${bill_no}`);
    }

    // 7. RECORD IN ACCOUNTS LEDGER (Sales income)
    await db.prepare(`
      INSERT INTO accounts_ledger (date, type, category, reference_type, reference_id, amount, payment_mode, description)
      VALUES (?, 'Income', 'Sales', 'Bill', ?, ?, ?, ?)
    `).run(billDate, billId, totalAmount, finalPaymentMode, `Sale Bill #${bill_no} to ${customer.name}`);

    // 8. DEDUCT INVENTORY / STOCK OUT
    if (product_id) {
      await db.prepare('UPDATE products SET stock_qty = MAX(0, stock_qty - ?) WHERE id = ?').run(qty, product_id);
    } else if (product_name) {
      await db.prepare('UPDATE products SET stock_qty = MAX(0, stock_qty - ?) WHERE LOWER(TRIM(name)) = LOWER(TRIM(?))').run(qty, product_name.trim());
    }

    // 9. RECALCULATE CUSTOMER LIFETIME STATS AUTOMATICALLY
    await recalculateCustomer(customer.id);

    const createdBill = await db.prepare(`
      SELECT b.*,
             COALESCE(NULLIF(b.driver_name, ''), v.driver_name, '') as driver_name,
             COALESCE(NULLIF(b.supplier_name, ''), (
               SELECT s.name 
               FROM supplier_purchases sp 
               JOIN suppliers s ON sp.supplier_id = s.id 
               WHERE LOWER(TRIM(sp.product_name)) = LOWER(TRIM(b.product_name)) 
               ORDER BY sp.id DESC LIMIT 1
             ), 'Direct / Steel Mill') as supplier_name
      FROM bills b
      LEFT JOIN vehicles v ON b.vehicle_id = v.id OR (b.vehicle_number IS NOT NULL AND b.vehicle_number != '' AND UPPER(REPLACE(TRIM(v.vehicle_number), ' ', '')) = UPPER(REPLACE(TRIM(b.vehicle_number), ' ', '')))
      WHERE b.id = ?
    `).get(billId);
    const updatedCustomer = await db.prepare('SELECT * FROM customers WHERE id = ?').get(customer.id);

    res.status(201).json({
      success: true,
      bill: createdBill,
      customer: updatedCustomer
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete / Cancel Bill
app.delete('/api/bills/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const bill = await db.prepare('SELECT * FROM bills WHERE id = ?').get(id);
    if (!bill) return res.status(404).json({ error: 'Bill not found' });

    // Restore stock to products
    if (bill.product_id) {
      await db.prepare('UPDATE products SET stock_qty = stock_qty + ? WHERE id = ?').run(bill.quantity, bill.product_id);
    } else if (bill.product_name) {
      await db.prepare('UPDATE products SET stock_qty = stock_qty + ? WHERE LOWER(TRIM(name)) = LOWER(TRIM(?))').run(bill.quantity, bill.product_name.trim());
    }

    await db.prepare('DELETE FROM bills WHERE id = ?').run(id);
    await db.prepare('DELETE FROM customer_payments WHERE bill_id = ?').run(id);
    await db.prepare("DELETE FROM accounts_ledger WHERE reference_type = 'Bill' AND reference_id = ?").run(id);

    await recalculateCustomer(bill.customer_id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// -----------------------------------------------------------------------------
// 7. ACCOUNTS & FINANCIALS API
// -----------------------------------------------------------------------------
app.get('/api/accounts', async (req, res) => {
  try {
    let { from_date, to_date, date, range, product } = req.query;

    const todayObj = new Date();
    const formatDateStr = (d) => d.toISOString().split('T')[0];

    // Compute range if provided
    if (range) {
      if (range === '1w') {
        const d = new Date();
        d.setDate(d.getDate() - 7);
        from_date = formatDateStr(d);
        to_date = formatDateStr(todayObj);
      } else if (range === '30d') {
        const d = new Date();
        d.setDate(d.getDate() - 30);
        from_date = formatDateStr(d);
        to_date = formatDateStr(todayObj);
      } else if (range === '3m') {
        const d = new Date();
        d.setMonth(d.getMonth() - 3);
        from_date = formatDateStr(d);
        to_date = formatDateStr(todayObj);
      } else if (range === '6m') {
        const d = new Date();
        d.setMonth(d.getMonth() - 6);
        from_date = formatDateStr(d);
        to_date = formatDateStr(todayObj);
      } else if (range === '1y') {
        const d = new Date();
        d.setFullYear(d.getFullYear() - 1);
        from_date = formatDateStr(d);
        to_date = formatDateStr(todayObj);
      } else if (range === '5y') {
        const d = new Date();
        d.setFullYear(d.getFullYear() - 5);
        from_date = formatDateStr(d);
        to_date = formatDateStr(todayObj);
      } else if (range === 'all') {
        from_date = null;
        to_date = null;
      }
    } else if (date && !from_date && !to_date) {
      from_date = date;
      to_date = date;
    } else if (from_date && !to_date) {
      to_date = from_date;
    } else if (!from_date && to_date) {
      from_date = to_date;
    }

    let billFilter = '1=1';
    const billParams = [];

    if (from_date && to_date) {
      billFilter += ' AND date BETWEEN ? AND ?';
      billParams.push(from_date, to_date);
    }
    if (product && product !== 'All') {
      billFilter += ' AND LOWER(TRIM(product_name)) = LOWER(TRIM(?))';
      billParams.push(product.trim());
    }

    let purchaseFilter = '1=1';
    const purchaseParams = [];
    if (from_date && to_date) {
      purchaseFilter += ' AND purchase_date BETWEEN ? AND ?';
      purchaseParams.push(from_date, to_date);
    }
    if (product && product !== 'All') {
      purchaseFilter += ' AND LOWER(TRIM(product_name)) = LOWER(TRIM(?))';
      purchaseParams.push(product.trim());
    }

    let expenseFilter = '1=1';
    let salaryFilter = '1=1';
    let ledgerFilter = '1=1';
    const generalDateParams = [];

    if (from_date && to_date) {
      expenseFilter = 'date BETWEEN ? AND ?';
      salaryFilter = 'date BETWEEN ? AND ?';
      ledgerFilter = 'date BETWEEN ? AND ?';
      generalDateParams.push(from_date, to_date);
    }

    // 1. Total Sales (Revenue summation of Total Bill Amount)
    const salesRow = await db.prepare(`
      SELECT 
        COALESCE(SUM(total_amount), 0) as totalRevenue,
        COALESCE(SUM(subtotal), 0) as totalSubtotal,
        COALESCE(SUM(cgst_amount), 0) as totalCgstOutput,
        COALESCE(SUM(sgst_amount), 0) as totalSgstOutput,
        COALESCE(SUM(tds_amount), 0) as totalTdsOutput,
        COALESCE(SUM(amount_received), 0) as totalReceived,
        COALESCE(SUM(balance_due), 0) as totalReceivables,
        COALESCE(SUM(quantity * bought_price_per_unit), 0) as costOfSoldGoods
      FROM bills
      WHERE ${billFilter}
    `).get(...billParams);

    // 2. Bought Price (Sum of all stocks / bought materials: quantity * respective bought rate from product page)
    let stockBoughtQuery = 'SELECT COALESCE(SUM(stock_qty * default_bought_rate), 0) as totalStockBought FROM products';
    const stockBoughtParams = [];
    if (product && product !== 'All') {
      stockBoughtQuery += ' WHERE LOWER(TRIM(name)) = LOWER(TRIM(?))';
      stockBoughtParams.push(product.trim());
    }
    const stockBoughtRow = await db.prepare(stockBoughtQuery).get(...stockBoughtParams);
    const totalStockBought = stockBoughtRow.totalStockBought;

    // Supplier purchases
    const purchasesRow = await db.prepare(`
      SELECT 
        COALESCE(SUM(total_amount), 0) as totalBoughtPrice,
        COALESCE(SUM(subtotal), 0) as totalPurchasesSubtotal,
        COALESCE(SUM(cgst_amount), 0) as totalCgstInput,
        COALESCE(SUM(sgst_amount), 0) as totalSgstInput,
        COALESCE(SUM(tds_amount), 0) as totalTdsInput,
        COALESCE(SUM(paid_amount), 0) as totalPaidToSuppliers,
        COALESCE(SUM(balance_due), 0) as totalPayablesToSuppliers
      FROM supplier_purchases
      WHERE ${purchaseFilter}
    `).get(...purchaseParams);

    // 3. Vehicle Expenses Breakdown
    const vehDiesel = (await db.prepare(`
      SELECT COALESCE(SUM(amount), 0) as total FROM vehicle_expenses WHERE expense_type = 'Diesel' AND ${expenseFilter}
    `).get(...generalDateParams))?.total || 0;

    const vehService = (await db.prepare(`
      SELECT COALESCE(SUM(amount), 0) as total FROM vehicle_expenses WHERE expense_type = 'Service' AND ${expenseFilter}
    `).get(...generalDateParams))?.total || 0;

    const vehOther = (await db.prepare(`
      SELECT COALESCE(SUM(amount), 0) as total FROM vehicle_expenses WHERE expense_type = 'Other' AND ${expenseFilter}
    `).get(...generalDateParams))?.total || 0;

    // 4. Employee Salaries & Wages
    const employeeSalaries = (await db.prepare(`
      SELECT COALESCE(SUM(amount), 0) as total FROM employee_payments WHERE ${salaryFilter}
    `).get(...generalDateParams))?.total || 0;

    // 5. Total Customer Credit Pending across all customers
    const allPendingCredit = (await db.prepare('SELECT COALESCE(SUM(pending_credit), 0) as total FROM customers').get())?.total || 0;
    // 6. Total Supplier Credit Pending across all suppliers
    const allPendingSupplierCredit = (await db.prepare('SELECT COALESCE(SUM(pending_credit), 0) as total FROM suppliers').get())?.total || 0;
    // 7. Total Employee Credit Balance pending
    const allEmployeeCredit = (await db.prepare('SELECT COALESCE(SUM(current_credit_balance), 0) as total FROM employees').get())?.total || 0;

    // Financial calculations
    // User Specification:
    // Revenue generated = summation of Total Bill Amount over desired period
    // Bought = summation of all stocks from product page (quantity in tons * respective bought rate)
    // Net Profit = Revenue - Bought
    const totalRevenue = salesRow.totalRevenue;
    const costOfGoods = totalStockBought; // Bought price from stock inventory
    const grossProfit = Math.round(totalRevenue - costOfGoods);

    // Vehicle Charges (Diesel, Maintenance & Service, Other vehicle expenses)
    const vehicleCharges = vehDiesel + vehService + vehOther;
    const totalSalaries = employeeSalaries;
    const totalOperatingExpenses = vehicleCharges + totalSalaries;

    // Taxes Breakdown
    const cgstOutput = salesRow.totalCgstOutput;
    const sgstOutput = salesRow.totalSgstOutput;
    const cgstInput = purchasesRow.totalCgstInput;
    const sgstInput = purchasesRow.totalSgstInput;
    const netCgstPayable = Math.max(0, cgstOutput - cgstInput);
    const netSgstPayable = Math.max(0, sgstOutput - sgstInput);
    const totalGstPayable = netCgstPayable + netSgstPayable;
    const totalTds = salesRow.totalTdsOutput + purchasesRow.totalTdsInput;

    // Deductions & Taxes
    const cgstDeduction = netCgstPayable > 0 ? netCgstPayable : cgstOutput;
    const sgstDeduction = netSgstPayable > 0 ? netSgstPayable : sgstOutput;
    const tdsDeduction = totalTds;
    const totalTaxes = cgstDeduction + sgstDeduction + tdsDeduction;

    const totalDeductions = costOfGoods + cgstDeduction + sgstDeduction + tdsDeduction + vehicleCharges + totalSalaries;
    // Net profit = Revenue - Bought (User Specification)
    const netProfit = Math.round(totalRevenue - costOfGoods);
    const netProfitMargin = totalRevenue > 0 ? ((netProfit / totalRevenue) * 100).toFixed(1) : 0;

    // Recent Ledger Entries
    const recentLedger = await db.prepare(`
      SELECT * FROM accounts_ledger 
      WHERE ${ledgerFilter} 
      ORDER BY date DESC, id DESC 
      LIMIT 50
    `).all(...(from_date && to_date ? [from_date, to_date] : []));

    // 1. Highest Selling Products
    const topProducts = await db.prepare(`
      SELECT 
        COALESCE(product_name, 'TMT Steel') as name,
        COALESCE(SUM(quantity), 0) as quantity,
        COALESCE(unit, 'Tons') as unit,
        COALESCE(SUM(total_amount), 0) as revenue,
        COUNT(*) as billsCount
      FROM bills
      WHERE ${billFilter}
      GROUP BY product_name
      ORDER BY revenue DESC
      LIMIT 6
    `).all(...billParams);

    // 2. Timeline Analytics (Adapted to Range: 1w, 30d, 3m, 6m, 1y, 5y, all)
    let timelineType = 'monthly';
    let timelinePoints = [];

    if (range === '1w' || range === '30d') {
      timelineType = 'daily';
      const numDays = range === '1w' ? 7 : 30;
      const salesByDay = await db.prepare(`
        SELECT 
          date,
          COALESCE(SUM(total_amount), 0) as revenue,
          COALESCE(SUM(quantity * bought_price_per_unit), 0) as cost,
          COALESCE(SUM(cgst_amount), 0) as cgst,
          COALESCE(SUM(sgst_amount), 0) as sgst,
          COALESCE(SUM(tds_amount), 0) as tds
        FROM bills
        WHERE date BETWEEN ? AND ?
        GROUP BY date
      `).all(from_date, to_date);
      const salesMap = Object.fromEntries(salesByDay.map(s => [s.date, s]));

      const vehByDay = Object.fromEntries((await db.prepare(`
        SELECT date, COALESCE(SUM(amount), 0) as total FROM vehicle_expenses WHERE date BETWEEN ? AND ? GROUP BY date
      `).all(from_date, to_date)).map(v => [v.date, v.total]));

      const salByDay = Object.fromEntries((await db.prepare(`
        SELECT date, COALESCE(SUM(amount), 0) as total FROM employee_payments WHERE date BETWEEN ? AND ? GROUP BY date
      `).all(from_date, to_date)).map(s => [s.date, s.total]));

      const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      const mNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

      for (let i = numDays - 1; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dayStr = formatDateStr(d);
        const s = salesMap[dayStr] || { revenue: 0, cost: 0, cgst: 0, sgst: 0, tds: 0 };
        const vExp = vehByDay[dayStr] || 0;
        const sExp = salByDay[dayStr] || 0;
        const deductions = s.cost + s.cgst + s.sgst + s.tds + vExp + sExp;
        const profit = Math.round(s.revenue - deductions);

        const label = numDays === 7
          ? `${dayNames[d.getDay()]} ${d.getDate()}`
          : `${d.getDate()} ${mNames[d.getMonth()]}`;

        timelinePoints.push({
          key: dayStr,
          label,
          revenue: s.revenue,
          profit
        });
      }
    } else if (range === '5y') {
      timelineType = 'yearly';
      const currentYear = new Date().getFullYear();
      const salesByYear = await db.prepare(`
        SELECT 
          strftime('%Y', date) as year,
          COALESCE(SUM(total_amount), 0) as revenue,
          COALESCE(SUM(quantity * bought_price_per_unit), 0) as cost,
          COALESCE(SUM(cgst_amount), 0) as cgst,
          COALESCE(SUM(sgst_amount), 0) as sgst,
          COALESCE(SUM(tds_amount), 0) as tds
        FROM bills
        GROUP BY strftime('%Y', date)
      `).all();
      const salesMap = Object.fromEntries(salesByYear.map(s => [s.year, s]));

      const vehByYear = Object.fromEntries((await db.prepare(`
        SELECT strftime('%Y', date) as year, COALESCE(SUM(amount), 0) as total FROM vehicle_expenses GROUP BY strftime('%Y', date)
      `).all()).map(v => [v.year, v.total]));

      const salByYear = Object.fromEntries((await db.prepare(`
        SELECT strftime('%Y', date) as year, COALESCE(SUM(amount), 0) as total FROM employee_payments GROUP BY strftime('%Y', date)
      `).all()).map(s => [s.year, s.total]));

      for (let y = currentYear - 4; y <= currentYear; y++) {
        const yStr = String(y);
        const s = salesMap[yStr] || { revenue: 0, cost: 0, cgst: 0, sgst: 0, tds: 0 };
        const vExp = vehByYear[yStr] || 0;
        const sExp = salByYear[yStr] || 0;
        const deductions = s.cost + s.cgst + s.sgst + s.tds + vExp + sExp;
        const profit = Math.round(s.revenue - deductions);

        timelinePoints.push({
          key: yStr,
          label: yStr,
          revenue: s.revenue,
          profit
        });
      }
    } else {
      // 3m, 6m, 1y, all (Monthly granularity)
      timelineType = 'monthly';
      let numMonths = 6;
      if (range === '3m') numMonths = 3;
      else if (range === '1y') numMonths = 12;
      else if (range === 'all') numMonths = 6;

      const salesByMonth = await db.prepare(`
        SELECT 
          strftime('%Y-%m', date) as month,
          COALESCE(SUM(total_amount), 0) as revenue,
          COALESCE(SUM(quantity * bought_price_per_unit), 0) as cost,
          COALESCE(SUM(cgst_amount), 0) as cgst,
          COALESCE(SUM(sgst_amount), 0) as sgst,
          COALESCE(SUM(tds_amount), 0) as tds
        FROM bills
        GROUP BY strftime('%Y-%m', date)
      `).all();
      const salesMap = Object.fromEntries(salesByMonth.map(s => [s.month, s]));

      const vehByMonth = Object.fromEntries((await db.prepare(`
        SELECT strftime('%Y-%m', date) as month, COALESCE(SUM(amount), 0) as total FROM vehicle_expenses GROUP BY strftime('%Y-%m', date)
      `).all()).map(v => [v.month, v.total]));

      const salByMonth = Object.fromEntries((await db.prepare(`
        SELECT strftime('%Y-%m', date) as month, COALESCE(SUM(amount), 0) as total FROM employee_payments GROUP BY strftime('%Y-%m', date)
      `).all()).map(s => [s.month, s.total]));

      const now = new Date();
      const mNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

      for (let i = numMonths - 1; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const mKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        const s = salesMap[mKey] || { revenue: 0, cost: 0, cgst: 0, sgst: 0, tds: 0 };
        const vExp = vehByMonth[mKey] || 0;
        const sExp = salByMonth[mKey] || 0;
        const deductions = s.cost + s.cgst + s.sgst + s.tds + vExp + sExp;
        const profit = Math.round(s.revenue - deductions);

        timelinePoints.push({
          key: mKey,
          label: `${mNames[d.getMonth()]} '${String(d.getFullYear()).slice(2)}`,
          revenue: s.revenue,
          profit
        });
      }
    }

    const timelineAnalytics = {
      type: timelineType,
      range: range || 'all',
      points: timelinePoints
    };

    // 3. Collections Breakdown (Cash, UPI, Bank Transfer, Total Credit)
    const cashFromBills = (await db.prepare(`
      SELECT COALESCE(SUM(amount_received), 0) as total FROM bills WHERE payment_mode = 'Cash' AND ${billFilter}
    `).get(...billParams))?.total || 0;

    const upiFromBills = (await db.prepare(`
      SELECT COALESCE(SUM(amount_received), 0) as total FROM bills WHERE payment_mode = 'UPI' AND ${billFilter}
    `).get(...billParams))?.total || 0;

    const bankFromBills = (await db.prepare(`
      SELECT COALESCE(SUM(amount_received), 0) as total FROM bills WHERE payment_mode IN ('Bank Transfer', 'NEFT', 'Cheque') AND ${billFilter}
    `).get(...billParams))?.total || 0;

    let custPayFilter = '1=1';
    if (from_date && to_date) custPayFilter = 'date BETWEEN ? AND ?';

    const cashFromCust = (await db.prepare(`
      SELECT COALESCE(SUM(amount), 0) as total FROM customer_payments WHERE payment_mode = 'Cash' AND ${custPayFilter}
    `).get(...(from_date && to_date ? [from_date, to_date] : [])))?.total || 0;

    const upiFromCust = (await db.prepare(`
      SELECT COALESCE(SUM(amount), 0) as total FROM customer_payments WHERE payment_mode = 'UPI' AND ${custPayFilter}
    `).get(...(from_date && to_date ? [from_date, to_date] : [])))?.total || 0;

    const bankFromCust = (await db.prepare(`
      SELECT COALESCE(SUM(amount), 0) as total FROM customer_payments WHERE payment_mode IN ('Bank Transfer', 'NEFT', 'Cheque') AND ${custPayFilter}
    `).get(...(from_date && to_date ? [from_date, to_date] : [])))?.total || 0;

    const totalCash = cashFromBills + cashFromCust;
    const totalUpi = upiFromBills + upiFromCust;
    const totalBank = bankFromBills + bankFromCust;
    const totalCollected = totalCash + totalUpi + totalBank;

    // Credit from bills in period, plus overall customer dues
    const billCreditPeriod = (await db.prepare(`
      SELECT COALESCE(SUM(balance_due), 0) as total FROM bills WHERE ${billFilter}
    `).get(...billParams))?.total || 0;

    const collections = {
      cash: totalCash,
      upi: totalUpi,
      bank: totalBank,
      totalCollected,
      credit: allPendingCredit,
      billCreditPeriod
    };

    res.json({
      summary: {
        totalRevenue,
        costOfGoods,
        boughtPrice: costOfGoods,
        grossProfit,
        grossProfitMargin: totalRevenue > 0 ? ((grossProfit / totalRevenue) * 100).toFixed(1) : 0,
        cgst: cgstDeduction,
        sgst: sgstDeduction,
        tds: tdsDeduction,
        totalTaxes,
        vehicleCharges,
        employeeSalaries: totalSalaries,
        totalDeductions,
        operatingExpenses: {
          diesel: vehDiesel,
          service: vehService,
          vehicleOther: vehOther,
          employeeSalaries: totalSalaries,
          total: totalOperatingExpenses
        },
        netProfit,
        netProfitMargin
      },
      taxes: {
        cgstOutput,
        sgstOutput,
        cgstInput,
        sgstInput,
        netCgstPayable,
        netSgstPayable,
        totalGstPayable,
        totalTds
      },
      workingCapital: {
        receivables: allPendingCredit,
        payables: allPendingSupplierCredit,
        employeeDues: allEmployeeCredit
      },
      topProducts,
      monthlyAnalytics: timelinePoints,
      timelineAnalytics,
      collections,
      recentLedger
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Direct Ledger Entry for Other Expense / Income
app.post('/api/accounts/ledger', async (req, res) => {
  try {
    const { date, type, category, amount, payment_mode, description } = req.body;
    const info = await db.prepare(`
      INSERT INTO accounts_ledger (date, type, category, reference_type, reference_id, amount, payment_mode, description)
      VALUES (?, ?, ?, 'Direct', NULL, ?, ?, ?)
    `).run(
      date || new Date().toISOString().split('T')[0],
      type || 'Expense',
      category || 'Office',
      Number(amount || 0),
      payment_mode || 'Cash',
      description || ''
    );
    res.status(201).json({ success: true, id: info.lastInsertRowid });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Serve built frontend assets if dist exists (Single Codebase Production)
const path = require('path');
const fs = require('fs');
const distPath = path.resolve(__dirname, '..', 'dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  app.use((req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

if (!process.env.VERCEL) {
  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Jazlan Server] Billing & Accounts API running on http://127.0.0.1:${PORT}`);
  });

  server.on('error', (err) => {
    console.error(`[Jazlan Server] Failed to listen on port ${PORT}:`, err.message);
    process.exit(1);
  });
}

module.exports = app;

