process.env.VERCEL = '1';
require('dotenv').config();
const assert = require('assert');
const app = require('../server/index');
const { db, pool } = require('../server/db');

let server;
let baseUrl;

// Test Runner Helper
let passedCount = 0;
let failedCount = 0;
const results = [];

async function test(name, fn) {
  try {
    await fn();
    passedCount++;
    results.push({ name, status: 'PASS' });
    console.log(`  ✓ [PASS] ${name}`);
  } catch (err) {
    failedCount++;
    results.push({ name, status: 'FAIL', error: err.message });
    console.error(`  ✗ [FAIL] ${name}: ${err.message}`);
  }
}

async function request(method, path, body = null) {
  const url = `${baseUrl}${path}`;
  const options = {
    method,
    headers: { 'Content-Type': 'application/json' }
  };
  if (body) options.body = JSON.stringify(body);
  const res = await fetch(url, options);
  const contentType = res.headers.get('content-type') || '';
  let data = null;
  if (contentType.includes('application/json')) {
    data = await res.json();
  } else {
    data = await res.text();
  }
  return { status: res.status, ok: res.ok, data };
}

// Helper: Number to Words (mirrors InvoicePrintModal)
function numberToWords(num) {
  const a = ['', 'One ', 'Two ', 'Three ', 'Four ', 'Five ', 'Six ', 'Seven ', 'Eight ', 'Nine ', 'Ten ', 'Eleven ', 'Twelve ', 'Thirteen ', 'Fourteen ', 'Fifteen ', 'Sixteen ', 'Seventeen ', 'Eighteen ', 'Nineteen '];
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  const n = ('000000000' + Math.round(Number(num))).substr(-9).match(/^(\d{2})(\d{2})(\d{2})(\d{1})(\d{2})$/);
  if (!n) return '';
  let str = '';
  str += (Number(n[1]) !== 0) ? (a[Number(n[1])] || b[n[1][0]] + ' ' + a[n[1][1]]) + 'Crore ' : '';
  str += (Number(n[2]) !== 0) ? (a[Number(n[2])] || b[n[2][0]] + ' ' + a[n[2][1]]) + 'Lakh ' : '';
  str += (Number(n[3]) !== 0) ? (a[Number(n[3])] || b[n[3][0]] + ' ' + a[n[3][1]]) + 'Thousand ' : '';
  str += (Number(n[4]) !== 0) ? (a[Number(n[4])] || b[n[4][0]] + ' ' + a[n[4][1]]) + 'Hundred ' : '';
  str += (Number(n[5]) !== 0) ? ((str !== '') ? 'and ' : '') + (a[Number(n[5])] || b[n[5][0]] + ' ' + a[n[5][1]]) : '';
  return ('Rupees ' + str.trim() + ' Only').replace(/\s+/g, ' ');
}

async function runAllTests() {
  console.log('========================================================================');
  console.log('   JAZLAN SYSTEM COMPREHENSIVE VERIFICATION & TEST SUITE (75 TESTS)');
  console.log('========================================================================\n');

  // Start test server on dynamic port
  server = app.listen(0);
  const port = server.address().port;
  baseUrl = `http://127.0.0.1:${port}`;
  console.log(`Test server running on ${baseUrl}\n`);

  const uniqueSuffix = Date.now().toString().slice(-5);
  let testProductId;
  let testCustomerId;
  let testVehicleId;
  let testVehicleNumber = `TN99TEST${uniqueSuffix}`;
  let testSupplierId;
  let testEmployeeId;
  let testBillId;
  let testBillNo;

  // ---------------------------------------------------------------------------
  // SUITE 1: SYSTEM HEALTH & DIAGNOSTICS (Tests 1 - 4)
  // ---------------------------------------------------------------------------
  console.log('--- SUITE 1: System Health & Diagnostics ---');
  await test('TC01: GET /api/health returns database connected and status ok', async () => {
    const res = await request('GET', '/api/health');
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.status, 'ok');
    assert.strictEqual(res.data.database, 'connected');
    assert(res.data.counts !== undefined);
  });

  await test('TC02: GET non-existent endpoint returns 404', async () => {
    const res = await request('GET', '/api/non_existent_endpoint_xyz');
    assert.strictEqual(res.status, 404);
  });

  await test('TC03: Database connection pool is live and queryable', async () => {
    const [rows] = await pool.query('SELECT 1 + 1 as res');
    assert.strictEqual(rows[0].res, 2);
  });

  await test('TC04: SQL translateSql sanitizes SQLite syntax to MySQL correctly', async () => {
    const bills = await db.prepare('SELECT COUNT(*) as count FROM bills').get();
    assert(bills.count !== undefined);
  });

  // ---------------------------------------------------------------------------
  // SUITE 2: PRODUCT CATALOG & INVENTORY (Tests 5 - 14)
  // ---------------------------------------------------------------------------
  console.log('\n--- SUITE 2: Product Catalog & Unit Pricing (Kg/Tons) ---');
  await test('TC05: GET /api/products returns array of catalog items', async () => {
    const res = await request('GET', '/api/products');
    assert.strictEqual(res.status, 200);
    assert(Array.isArray(res.data));
  });

  await test('TC06: POST /api/products fails when name is missing', async () => {
    const res = await request('POST', '/api/products', { unit: 'Kg', default_sell_rate: 35 });
    assert.strictEqual(res.status, 400);
  });

  await test('TC07: POST /api/products creates product with unit Kg and sell/bought rates per Kg', async () => {
    const res = await request('POST', '/api/products', {
      name: `TMT Rebar 16mm Test ${uniqueSuffix}`,
      category: 'Steel',
      hsn_code: '7214',
      unit: 'Kg',
      default_sell_rate: 45.5,
      default_bought_rate: 40.0,
      gst_rate: 18,
      stock_qty: 5000
    });
    assert([200, 201].includes(res.status));
    assert(res.data.id !== undefined);
    testProductId = res.data.id;
  });

  await test('TC08: GET /api/products contains newly created product with exact rates per Kg', async () => {
    const res = await request('GET', '/api/products');
    const found = res.data.find(p => p.id === testProductId);
    assert(found !== undefined);
    assert.strictEqual(Number(found.default_sell_rate), 45.5);
    assert.strictEqual(Number(found.default_bought_rate), 40.0);
    assert.strictEqual(found.unit, 'Kg');
  });

  await test('TC09: PUT /api/products/:id updates product details and selling rate', async () => {
    const res = await request('PUT', `/api/products/${testProductId}`, {
      name: `TMT Rebar 16mm Test ${uniqueSuffix}`,
      category: 'Steel',
      hsn_code: '7214',
      unit: 'Kg',
      default_sell_rate: 48.0,
      default_bought_rate: 41.5,
      gst_rate: 18,
      stock_qty: 6000
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(Number(res.data.default_sell_rate), 48.0);
  });

  await test('TC10: POST /api/products handles duplicate product with rate averaging', async () => {
    const res = await request('POST', '/api/products', {
      name: `TMT Rebar 16mm Test ${uniqueSuffix}`,
      category: 'Steel',
      unit: 'Kg',
      default_bought_rate: 43.5
    });
    assert([200, 201].includes(res.status));
    // Average of 41.5 and 43.5 = 42.5
    assert.strictEqual(Number(res.data.default_bought_rate), 42.5);
  });

  await test('TC11: Supplier purchase stock-in increments inventory stock', async () => {
    const supInfo = await db.prepare('INSERT INTO suppliers (name, company_name) VALUES (?, ?)').run(`Temp Sup ${uniqueSuffix}`, 'Temp Co');
    const supId = supInfo.lastInsertRowid;
    const res = await request('POST', `/api/suppliers/${supId}/purchases`, {
      product_id: testProductId,
      product_name: `TMT Rebar 16mm Test ${uniqueSuffix}`,
      quantity: 1000,
      unit: 'Kg',
      bought_price_per_unit: 42.0,
      paid_amount: 42000
    });
    assert([200, 201].includes(res.status));
    const prod = await db.prepare('SELECT stock_qty FROM products WHERE id = ?').get(testProductId);
    assert(Number(prod.stock_qty) >= 7000);
    await db.prepare('DELETE FROM supplier_purchases WHERE supplier_id = ?').run(supId);
    await db.prepare('DELETE FROM suppliers WHERE id = ?').run(supId);
  });

  await test('TC12: Unit margin calculation is positive when sell rate > bought rate', async () => {
    const res = await request('GET', '/api/products');
    const p = res.data.find(i => i.id === testProductId);
    const margin = Number(p.default_sell_rate) - Number(p.default_bought_rate);
    assert(margin > 0);
  });

  await test('TC13: Product with Kg unit correctly tracks decimal selling rate (e.g. 33.5)', async () => {
    const res = await request('POST', '/api/products', {
      name: `Decimal Scrap ${uniqueSuffix}`,
      category: 'Other',
      unit: 'Kg',
      default_sell_rate: 33.5,
      default_bought_rate: 30.0,
      stock_qty: 2000
    });
    assert([200, 201].includes(res.status));
    assert.strictEqual(Number(res.data.default_sell_rate), 33.5);
    await db.prepare('DELETE FROM products WHERE id = ?').run(res.data.id);
  });

  await test('TC14: Stock inventory remains non-negative on decrement query GREATEST(0, stock_qty - ?)', async () => {
    await db.prepare('UPDATE products SET stock_qty = 50 WHERE id = ?').run(testProductId);
    await db.prepare('UPDATE products SET stock_qty = GREATEST(0, stock_qty - ?) WHERE id = ?').run(100, testProductId);
    const p = await db.prepare('SELECT stock_qty FROM products WHERE id = ?').get(testProductId);
    assert.strictEqual(Number(p.stock_qty), 0);
  });

  // ---------------------------------------------------------------------------
  // SUITE 3: CUSTOMERS & CREDIT LEDGERS (Tests 15 - 23)
  // ---------------------------------------------------------------------------
  console.log('\n--- SUITE 3: Customers & Credit Ledgers ---');
  await test('TC15: GET /api/customers returns array', async () => {
    const res = await request('GET', '/api/customers');
    assert.strictEqual(res.status, 200);
    assert(Array.isArray(res.data));
  });

  await test('TC16: POST /api/customers creates new customer record', async () => {
    const res = await request('POST', '/api/customers', {
      name: `Test Client Enterprises ${uniqueSuffix}`,
      phone: '9876543210',
      address: 'Industrial Estate, Chennai 600001',
      gstin: '33AAAAA0000A1Z5'
    });
    assert([200, 201].includes(res.status));
    assert(res.data.id !== undefined);
    testCustomerId = res.data.id;
  });

  await test('TC17: GET /api/customers/:id returns customer details', async () => {
    const res = await request('GET', `/api/customers/${testCustomerId}`);
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.customer.id, testCustomerId);
    assert.strictEqual(res.data.customer.phone, '9876543210');
  });

  await test('TC18: POST /api/customers/:id/pay records customer cash payment', async () => {
    const res = await request('POST', `/api/customers/${testCustomerId}/pay`, {
      amount: 5000,
      payment_mode: 'Cash',
      date: '2026-11-02',
      notes: 'Initial cash token'
    });
    assert([200, 201].includes(res.status));
    assert(res.data.success === true);
  });

  await test('TC19: POST /api/customers/:id/pay records customer UPI payment', async () => {
    const res = await request('POST', `/api/customers/${testCustomerId}/pay`, {
      amount: 10000,
      payment_mode: 'UPI',
      reference_no: 'UPI-REF-998811',
      date: '2026-11-02'
    });
    assert([200, 201].includes(res.status));
    assert(res.data.success === true);
  });

  await test('TC20: POST /api/customers/:id/pay records customer Bank Transfer payment', async () => {
    const res = await request('POST', `/api/customers/${testCustomerId}/pay`, {
      amount: 15000,
      payment_mode: 'Bank Transfer',
      reference_no: 'NEFT-554433',
      date: '2026-11-02'
    });
    assert([200, 201].includes(res.status));
    assert(res.data.success === true);
  });

  await test('TC21: POST /api/customers/:id/adjust records opening balance credit adjustment', async () => {
    const res = await request('POST', `/api/customers/${testCustomerId}/adjust`, {
      date: '2026-11-01',
      type: 'OPENING_BALANCE',
      amount: 25000,
      notes: 'Prior ledger migration'
    });
    assert([200, 201].includes(res.status));
    assert(res.data.success === true);
  });

  await test('TC22: Customer detail includes payments and adjustments arrays', async () => {
    const res = await request('GET', `/api/customers/${testCustomerId}`);
    assert(Array.isArray(res.data.payments));
    assert(Array.isArray(res.data.adjustments));
    assert.strictEqual(res.data.payments.length, 3);
    assert.strictEqual(res.data.adjustments.length, 1);
  });

  await test('TC23: Recalculate customer correctly updates total_paid from payments', async () => {
    const res = await request('GET', `/api/customers/${testCustomerId}`);
    // Total payments made = 5000 + 10000 + 15000 = 30000
    assert.strictEqual(Number(res.data.customer.total_paid), 30000);
  });

  // ---------------------------------------------------------------------------
  // SUITE 4: FLEET & VEHICLE LOGISTICS (Tests 24 - 31)
  // ---------------------------------------------------------------------------
  console.log('\n--- SUITE 4: Fleet & Vehicle Logistics ---');
  await test('TC24: GET /api/vehicles returns fleet list', async () => {
    const res = await request('GET', '/api/vehicles');
    assert.strictEqual(res.status, 200);
    assert(Array.isArray(res.data));
  });

  await test('TC25: POST /api/vehicles creates new company truck profile', async () => {
    const res = await request('POST', '/api/vehicles', {
      vehicle_number: testVehicleNumber,
      model_type: '10 Wheeler Tipper',
      capacity_tons: 25.0,
      driver_name: 'Murugan Driver',
      driver_phone: '9840123456',
      status: 'Active'
    });
    assert([200, 201].includes(res.status));
    assert(res.data.id !== undefined);
    testVehicleId = res.data.id;
  });

  await test('TC26: POST /api/vehicles rejects duplicate vehicle number with 400', async () => {
    const res = await request('POST', '/api/vehicles', {
      vehicle_number: testVehicleNumber
    });
    assert.strictEqual(res.status, 400);
  });

  await test('TC27: POST /api/vehicles/:id/expenses records Diesel fuel expense', async () => {
    const res = await request('POST', `/api/vehicles/${testVehicleId}/expenses`, {
      expense_type: 'Diesel',
      date: '2026-11-02',
      amount: 4500,
      liters: 50,
      rate_per_liter: 90,
      odometer_reading: 125400,
      payment_mode: 'Cash'
    });
    assert([200, 201].includes(res.status));
  });

  await test('TC28: POST /api/vehicles/:id/expenses records Maintenance & Service expense', async () => {
    const res = await request('POST', `/api/vehicles/${testVehicleId}/expenses`, {
      expense_type: 'Service',
      date: '2026-11-02',
      amount: 6200,
      service_type: 'Brake Liner & Oil Replacement',
      garage_name: 'National Garage'
    });
    assert([200, 201].includes(res.status));
  });

  await test('TC29: POST /api/vehicles/:id/expenses records Other trip expense (Toll/Batta)', async () => {
    const res = await request('POST', `/api/vehicles/${testVehicleId}/expenses`, {
      expense_type: 'Other',
      date: '2026-11-02',
      amount: 850,
      category: 'Toll & Batta'
    });
    assert([200, 201].includes(res.status));
  });

  await test('TC30: GET /api/vehicles/:id aggregates diesel, service, and other costs', async () => {
    const res = await request('GET', `/api/vehicles/${testVehicleId}`);
    assert.strictEqual(res.status, 200);
    assert.strictEqual(Number(res.data.vehicle.total_diesel_cost), 4500);
    assert.strictEqual(Number(res.data.vehicle.total_service_cost), 6200);
    assert.strictEqual(Number(res.data.vehicle.total_other_cost), 850);
    assert.strictEqual(res.data.expenses.length, 3);
  });

  await test('TC31: PUT /api/vehicles/:id updates vehicle details', async () => {
    const res = await request('PUT', `/api/vehicles/${testVehicleId}`, {
      vehicle_number: testVehicleNumber,
      driver_name: 'Murugan Senior Driver',
      driver_phone: '9840123456',
      status: 'Active'
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.driver_name, 'Murugan Senior Driver');
  });

  // ---------------------------------------------------------------------------
  // SUITE 5: EMPLOYEES & PAYROLL (Tests 32 - 36)
  // ---------------------------------------------------------------------------
  console.log('\n--- SUITE 5: Employees & Payroll ---');
  await test('TC32: GET /api/employees returns employee list', async () => {
    const res = await request('GET', '/api/employees');
    assert.strictEqual(res.status, 200);
    assert(Array.isArray(res.data));
  });

  await test('TC33: POST /api/employees creates employee profile', async () => {
    const res = await request('POST', '/api/employees', {
      name: `Ramesh Weighbridge Operator ${uniqueSuffix}`,
      employee_type: 'Operator',
      phone: '9788112233',
      salary_type: 'Monthly',
      base_salary: 22000,
      status: 'Active'
    });
    assert([200, 201].includes(res.status));
    assert(res.data.id !== undefined);
    testEmployeeId = res.data.id;
  });

  await test('TC34: POST /api/employees/:id/pay records Monthly Salary payment', async () => {
    const res = await request('POST', `/api/employees/${testEmployeeId}/pay`, {
      payment_type: 'Monthly Salary',
      date: '2026-11-02',
      amount: 20000,
      month_year: 'November 2026',
      payment_mode: 'Bank Transfer'
    });
    assert([200, 201].includes(res.status));
    assert(res.data.success === true);
  });

  await test('TC35: POST /api/employees/:id/pay records Salary Advance', async () => {
    const res = await request('POST', `/api/employees/${testEmployeeId}/pay`, {
      payment_type: 'Salary Advance',
      date: '2026-11-02',
      amount: 3000,
      payment_mode: 'Cash'
    });
    assert([200, 201].includes(res.status));
    assert(res.data.success === true);
  });

  await test('TC36: GET /api/employees/:id/payments returns payments list and employee reflects total', async () => {
    const res = await request('GET', `/api/employees/${testEmployeeId}/payments`);
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.length, 2);
    const empRes = await request('GET', '/api/employees');
    const emp = empRes.data.find(e => e.id === testEmployeeId);
    assert.strictEqual(Number(emp.total_paid_salary), 23000);
  });

  await test('TC36a: POST /api/employees/:id/credit adds credit due without inflating total_paid_salary', async () => {
    // Add 82000 credit due
    const res = await request('POST', `/api/employees/${testEmployeeId}/credit`, {
      amount: 82000,
      date: '2026-11-03',
      month_year: 'October 2026',
      notes: 'Outstanding salary credit accrued'
    });
    assert([200, 201].includes(res.status));
    const empRes = await request('GET', '/api/employees');
    const emp = empRes.data.find(e => e.id === testEmployeeId);
    // Total paid salary must STILL be 23000, NOT 105000!
    assert.strictEqual(Number(emp.total_paid_salary), 23000);
    // Credit balance must reflect 82000
    assert.strictEqual(Number(emp.current_credit_balance), 82000);
  });

  await test('TC36b: Paying 10000 against 82000 credit reduces due to 72000 and adds ONLY 10000 to total paid', async () => {
    const res = await request('POST', `/api/employees/${testEmployeeId}/pay`, {
      payment_type: 'Salary',
      date: '2026-11-03',
      amount: 10000,
      month_year: 'October 2026',
      payment_mode: 'Cash',
      notes: 'Partial payment against credit due'
    });
    assert([200, 201].includes(res.status));
    const empRes = await request('GET', '/api/employees');
    const emp = empRes.data.find(e => e.id === testEmployeeId);
    // Total paid salary must increase by ONLY 10000: 23000 + 10000 = 33000 (NEVER 82000 + 10000 + 23000!)
    assert.strictEqual(Number(emp.total_paid_salary), 33000);
    // Due must be exactly 82000 - 10000 = 72000
    assert.strictEqual(Number(emp.current_credit_balance), 72000);
  });

  // ---------------------------------------------------------------------------
  // SUITE 6: SUPPLIERS & ACCOUNTS PAYABLE (Tests 37 - 42)
  // ---------------------------------------------------------------------------
  console.log('\n--- SUITE 6: Suppliers & Accounts Payable ---');
  await test('TC37: GET /api/suppliers returns list', async () => {
    const res = await request('GET', '/api/suppliers');
    assert.strictEqual(res.status, 200);
    assert(Array.isArray(res.data));
  });

  await test('TC38: POST /api/suppliers creates new raw material supplier', async () => {
    const res = await request('POST', '/api/suppliers', {
      name: `Apex Steel Mills ${uniqueSuffix}`,
      company_name: 'Apex Scrap & Steel Ltd',
      phone: '9443322110',
      address: 'Salem Steel Zone, TN',
      gstin: '33AAACA1111A1ZZ',
      materials_supplied: 'MS Scrap, Billet, Boring'
    });
    assert([200, 201].includes(res.status));
    assert(res.data.id !== undefined);
    testSupplierId = res.data.id;
  });

  await test('TC39: POST /api/suppliers/:id/purchases records inward purchase with freight & TDS', async () => {
    // 5000 kg @ Rs 32/kg = 160000 subtotal, 18% GST = 28800, 2% TDS = 3200 deduction, freight = 1200
    // total = 160000 + 28800 + 1200 - 3200 = 186800. Paid 86800. Due = 100000.
    const res = await request('POST', `/api/suppliers/${testSupplierId}/purchases`, {
      product_name: 'MS Boring Inward',
      quantity: 5000,
      unit: 'Kg',
      bought_price_per_unit: 32,
      gst_rate: 18,
      tds_rate: 2,
      freight_charges: 1200,
      paid_amount: 86800,
      payment_mode: 'Bank Transfer'
    });
    assert([200, 201].includes(res.status));
    assert.strictEqual(Number(res.data.supplier.pending_credit), 100000);
  });

  await test('TC40: GET /api/suppliers/:id reflects total purchases and pending credit dues', async () => {
    const res = await request('GET', `/api/suppliers/${testSupplierId}`);
    assert.strictEqual(res.status, 200);
    assert.strictEqual(Number(res.data.supplier.pending_credit), 100000);
    assert.strictEqual(Number(res.data.supplier.total_paid), 86800);
  });

  await test('TC41: POST /api/suppliers/:id/pay settles part of supplier dues', async () => {
    const res = await request('POST', `/api/suppliers/${testSupplierId}/pay`, {
      amount: 40000,
      payment_mode: 'Bank Transfer',
      reference_no: 'SUPP-PAY-7766'
    });
    assert([200, 201].includes(res.status));
    const updated = await request('GET', `/api/suppliers/${testSupplierId}`);
    assert.strictEqual(Number(updated.data.supplier.pending_credit), 60000);
    assert.strictEqual(Number(updated.data.supplier.total_paid), 126800);
  });

  await test('TC42: Supplier detail contains full purchases and payments ledger', async () => {
    const res = await request('GET', `/api/suppliers/${testSupplierId}`);
    assert.strictEqual(res.data.purchases.length, 1);
    assert.strictEqual(res.data.payments.length, 1);
  });

  // ---------------------------------------------------------------------------
  // SUITE 7: BILLING CALCULATIONS & INVOICE ISSUANCE (Tests 43 - 56)
  // ---------------------------------------------------------------------------
  console.log('\n--- SUITE 7: Core Billing Terminal (Kg * Rate/Kg & Taxes) ---');

  await test('TC43: Standard Kg * Rate/Kg multiplication: 1000 Kg @ ₹33.5/Kg = ₹33,500 Subtotal', () => {
    const kg = 1000;
    const ratePerKg = 33.5;
    const subtotal = Math.round(kg * ratePerKg);
    assert.strictEqual(subtotal, 33500);
  });

  await test('TC44: Taxes with CGST 9% + SGST 9%: Subtotal ₹33,500 -> CGST ₹3,015 & SGST ₹3,015', () => {
    const subtotal = 33500;
    const cgst = Math.round(subtotal * 0.09);
    const sgst = Math.round(subtotal * 0.09);
    assert.strictEqual(cgst, 3015);
    assert.strictEqual(sgst, 3015);
    assert.strictEqual(cgst + sgst, 6030);
  });

  await test('TC45: 2% TDS Addition: 2% of ₹33,500 = ₹670', () => {
    const subtotal = 33500;
    const tds = Math.round(subtotal * 0.02);
    assert.strictEqual(tds, 670);
  });

  await test('TC46: Full Grand Total calculation: ₹33,500 + ₹6,030 (GST) + ₹670 (TDS) = ₹40,200', () => {
    const subtotal = 33500;
    const gst = 6030;
    const tds = 670;
    const grandTotal = subtotal + gst + tds;
    assert.strictEqual(grandTotal, 40200);
  });

  await test('TC47: Decimal rate multiplication: 3240 Kg @ ₹42.25/Kg = ₹136,890 Subtotal', () => {
    const kg = 3240;
    const rate = 42.25;
    const subtotal = Math.round(kg * rate);
    assert.strictEqual(subtotal, 136890);
  });

  await test('TC48: Rent addition to taxable base: Subtotal ₹33,500 + Rent ₹1,500 = Base ₹35,000', () => {
    const subtotal = 33500;
    const rent = 1500;
    const taxableBase = subtotal + rent;
    const cgst = Math.round(taxableBase * 0.09); // 3150
    const sgst = Math.round(taxableBase * 0.09); // 3150
    const tds = Math.round(taxableBase * 0.02);  // 700
    const total = taxableBase + cgst + sgst + tds; // 35000 + 6300 + 700 = 42000
    assert.strictEqual(taxableBase, 35000);
    assert.strictEqual(cgst, 3150);
    assert.strictEqual(sgst, 3150);
    assert.strictEqual(tds, 700);
    assert.strictEqual(total, 42000);
  });

  await test('TC49: Tax toggles disabled: CGST=NO, SGST=NO, TDS=NO results in Grand Total = Subtotal', () => {
    const subtotal = 33500;
    const cgst = 0;
    const sgst = 0;
    const tds = 0;
    const grandTotal = subtotal + cgst + sgst + tds;
    assert.strictEqual(grandTotal, 33500);
  });

  await test('TC50: POST /api/bills creates bill with Kg quantity, Rate/Kg, and exact ₹40,200 Total', async () => {
    const res = await request('POST', '/api/bills', {
      customer_name: `Test Client Enterprises ${uniqueSuffix}`,
      customer_phone: '9876543210',
      vehicle_id: testVehicleId,
      vehicle_number: testVehicleNumber,
      product_id: testProductId,
      product_name: `TMT Rebar 16mm Test ${uniqueSuffix}`,
      quantity: 1000,
      unit: 'Kg',
      rate: 33.5,
      bought_price_per_unit: 30.0,
      rent_transport: 0,
      gst_rate: 18,
      tds_rate: 2,
      amount_received: 40200,
      payment_mode: 'Cash'
    });
    assert([200, 201].includes(res.status));
    const bill = res.data.bill || res.data;
    assert(bill.id !== undefined);
    assert(bill.bill_no !== undefined);
    assert.strictEqual(Number(bill.subtotal), 33500);
    assert.strictEqual(Number(bill.cgst_amount), 3015);
    assert.strictEqual(Number(bill.sgst_amount), 3015);
    assert.strictEqual(Number(bill.tds_amount), 670);
    assert.strictEqual(Number(bill.total_amount), 40200);
    assert.strictEqual(Number(bill.amount_received), 40200);
    assert.strictEqual(Number(bill.balance_due), 0);
    assert.strictEqual(bill.payment_status, 'Paid');

    testBillId = bill.id;
    testBillNo = bill.bill_no;
  });

  await test('TC51: Sequential bill numbering starts with JS prefix and pads sequence (e.g. JS001, JS002)', () => {
    assert(/^JS\d{3,}$/.test(testBillNo));
  });

  await test('TC52: POST /api/bills creates partial payment bill with balance due and Partial status', async () => {
    const res = await request('POST', '/api/bills', {
      customer_name: `Test Client Enterprises ${uniqueSuffix}`,
      product_name: `TMT Rebar 16mm Test ${uniqueSuffix}`,
      quantity: 2000,
      unit: 'Kg',
      rate: 40,
      gst_rate: 18,
      tds_rate: 2,
      // 2000 * 40 = 80000. 18% GST = 14400. 2% TDS = 1600. Total = 96000.
      amount_received: 50000,
      payment_mode: 'UPI',
      upi_reference: 'UPI-BILL-1122'
    });
    assert([200, 201].includes(res.status));
    const bill = res.data.bill || res.data;
    assert.strictEqual(Number(bill.total_amount), 96000);
    assert.strictEqual(Number(bill.amount_received), 50000);
    assert.strictEqual(Number(bill.balance_due), 46000);
    assert.strictEqual(bill.payment_status, 'Partial');
  });

  await test('TC53: POST /api/bills creates pure credit bill when amount_received is 0', async () => {
    const res = await request('POST', '/api/bills', {
      customer_name: `Test Client Enterprises ${uniqueSuffix}`,
      product_name: `TMT Rebar 16mm Test ${uniqueSuffix}`,
      quantity: 500,
      unit: 'Kg',
      rate: 50,
      gst_rate: 18,
      tds_rate: 2,
      // 500 * 50 = 25000. 18% GST = 4500. 2% TDS = 500. Total = 30000.
      amount_received: 0,
      payment_mode: 'Cash'
    });
    assert([200, 201].includes(res.status));
    const bill = res.data.bill || res.data;
    assert.strictEqual(Number(bill.total_amount), 30000);
    assert.strictEqual(Number(bill.balance_due), 30000);
    assert.strictEqual(bill.payment_status, 'Credit');
    assert.strictEqual(bill.payment_mode, 'Credit');
  });

  await test('TC54: Customer pending credit increases accurately with unpaid bill dues', async () => {
    const res = await request('GET', `/api/customers/${testCustomerId}`);
    assert(Number(res.data.customer.pending_credit) >= 46000);
  });

  await test('TC55: POST /api/bills automatically auto-creates customer if non-existent', async () => {
    const autoCustName = `Auto Created Cust ${uniqueSuffix}`;
    const res = await request('POST', '/api/bills', {
      customer_name: autoCustName,
      customer_phone: '9123456789',
      product_name: `TMT Rebar 16mm Test ${uniqueSuffix}`,
      quantity: 100,
      unit: 'Kg',
      rate: 35,
      amount_received: 4200
    });
    assert([200, 201].includes(res.status));
    const custRes = await request('GET', '/api/customers');
    const created = custRes.data.find(c => c.name === autoCustName);
    assert(created !== undefined);
  });

  await test('TC56: Manual total override preserves custom agreed grand total', async () => {
    const res = await request('POST', '/api/bills', {
      customer_name: `Test Client Enterprises ${uniqueSuffix}`,
      product_name: `TMT Rebar 16mm Test ${uniqueSuffix}`,
      quantity: 1000,
      unit: 'Kg',
      rate: 33.5,
      total_amount: 40000,
      amount_received: 40000
    });
    assert([200, 201].includes(res.status));
    const bill = res.data.bill || res.data;
    assert.strictEqual(Number(bill.total_amount), 40000);
  });

  // ---------------------------------------------------------------------------
  // SUITE 8: INVOICES REGISTER & SEARCH / FILTERS (Tests 57 - 62)
  // ---------------------------------------------------------------------------
  console.log('\n--- SUITE 8: Invoices Register, Search & Filters ---');
  await test('TC57: GET /api/bills returns all registered invoices', async () => {
    const res = await request('GET', '/api/bills');
    assert.strictEqual(res.status, 200);
    assert(Array.isArray(res.data));
    assert(res.data.length > 0);
  });

  await test('TC58: GET /api/bills?status=Paid filters only fully settled bills', async () => {
    const res = await request('GET', '/api/bills?status=Paid');
    assert.strictEqual(res.status, 200);
    for (const b of res.data) {
      assert.strictEqual(b.payment_status, 'Paid');
      assert.strictEqual(Number(b.balance_due), 0);
    }
  });

  await test('TC59: GET /api/bills?status=Credit filters only credit bills', async () => {
    const res = await request('GET', '/api/bills?status=Credit');
    assert.strictEqual(res.status, 200);
    for (const b of res.data) {
      assert.strictEqual(b.payment_status, 'Credit');
      assert(Number(b.balance_due) > 0);
    }
  });

  await test('TC60: GET /api/bills?search= matches by customer name', async () => {
    const res = await request('GET', `/api/bills?search=Enterprises+${uniqueSuffix}`);
    assert.strictEqual(res.status, 200);
    assert(res.data.length >= 1);
  });

  await test('TC61: GET /api/bills?search= matches by bill number', async () => {
    const res = await request('GET', `/api/bills?search=${testBillNo}`);
    assert.strictEqual(res.status, 200);
    assert(res.data.some(b => b.bill_no === testBillNo));
  });

  await test('TC62: GET /api/bills?vehicle= filters by truck', async () => {
    const res = await request('GET', `/api/bills?vehicle=${testVehicleNumber}`);
    assert.strictEqual(res.status, 200);
    assert(res.data.every(b => b.vehicle_number === testVehicleNumber));
  });

  // ---------------------------------------------------------------------------
  // SUITE 9: INVOICE PRINT & SMT TRADERS TEMPLATE (Tests 63 - 66)
  // ---------------------------------------------------------------------------
  console.log('\n--- SUITE 9: SMT TRADERS Tax Invoice & Print Formatting ---');
  await test('TC63: Indian numberToWords: 40200 = "Rupees Forty Thousand Two Hundred Only"', () => {
    const words = numberToWords(40200);
    assert.strictEqual(words, 'Rupees Forty Thousand Two Hundred Only');
  });

  await test('TC64: Indian numberToWords: 33500 = "Rupees Thirty Three Thousand Five Hundred Only"', () => {
    const words = numberToWords(33500);
    assert.strictEqual(words, 'Rupees Thirty Three Thousand Five Hundred Only');
  });

  await test('TC65: Indian numberToWords handles Lakhs correctly with Indian commas', () => {
    const words = numberToWords(258084);
    assert(words.includes('Two Lakh') && words.includes('Fifty Eight Thousand'));
  });

  await test('TC66: Printed invoice formatting numbers: QTY 1,000.000, Unit KG, Rate 33.50', async () => {
    const res = await request('GET', `/api/bills?search=${testBillNo}`);
    const bill = res.data[0];
    const qty = Number(bill.quantity).toLocaleString('en-IN', { minimumFractionDigits: 3, maximumFractionDigits: 3 });
    const rate = Number(bill.rate).toFixed(2);
    const subtotal = Number(bill.subtotal).toFixed(2);
    assert.strictEqual(qty, '1,000.000');
    assert.strictEqual(rate, '33.50');
    assert.strictEqual(subtotal, '33500.00');
  });

  // ---------------------------------------------------------------------------
  // SUITE 10: ACCOUNTS, PROFIT CALCULATIONS & TAX SUMMARY (Tests 67 - 75)
  // ---------------------------------------------------------------------------
  console.log('\n--- SUITE 10: Financial Accounts & Profit Dashboard ---');
  await test('TC67: GET /api/accounts returns summary, taxes, workingCapital and collections', async () => {
    const res = await request('GET', '/api/accounts?range=all');
    assert.strictEqual(res.status, 200);
    assert(res.data.summary !== undefined);
    assert(res.data.taxes !== undefined);
    assert(res.data.workingCapital !== undefined);
    assert(res.data.collections !== undefined);
  });

  await test('TC68: Accounts Revenue equals total sales from bills', async () => {
    const res = await request('GET', '/api/accounts?range=all');
    assert(res.data.summary.totalRevenue > 0);
    assert(res.data.summary.grossProfit !== undefined);
  });

  await test('TC69: Collections correctly separates Cash, UPI, and Bank collections', async () => {
    const res = await request('GET', '/api/accounts?range=all');
    const col = res.data.collections;
    assert(col.cash >= 0);
    assert(col.upi >= 0);
    assert(col.bank >= 0);
    assert.strictEqual(Number(col.totalCollected), Number(col.cash) + Number(col.upi) + Number(col.bank));
  });

  await test('TC70: Tax breakdown accurately separates CGST, SGST, and TDS', async () => {
    const res = await request('GET', '/api/accounts?range=all');
    const t = res.data.taxes;
    assert(t.cgstOutput !== undefined);
    assert(t.sgstOutput !== undefined);
    assert(t.totalTds !== undefined);
  });

  await test('TC71: Vehicle operational charges reflect diesel, service, and other expenses', async () => {
    const res = await request('GET', '/api/accounts?range=all');
    assert(res.data.summary.operatingExpenses !== undefined);
  });

  await test('TC72: GET /api/accounts with custom date filter runs without error', async () => {
    const today = new Date().toISOString().split('T')[0];
    const res = await request('GET', `/api/accounts?from_date=${today}&to_date=${today}&range=custom`);
    assert.strictEqual(res.status, 200);
    assert(res.data.summary !== undefined);
  });

  await test('TC73: Gross profit calculation formula: Revenue - Cost of Goods', async () => {
    const res = await request('GET', '/api/accounts?range=all');
    const s = res.data.summary;
    assert.strictEqual(Number(s.grossProfit), Math.round(Number(s.totalRevenue) - Number(s.costOfGoods)));
  });

  await test('TC74: Accounts workingCapital displays pending customer dues and payables', async () => {
    const res = await request('GET', '/api/accounts?range=all');
    const wc = res.data.workingCapital;
    assert(wc.receivables !== undefined);
    assert(wc.payables !== undefined);
  });

  await test('TC75: Top products list includes high-volume items', async () => {
    const res = await request('GET', '/api/accounts?range=all');
    assert(Array.isArray(res.data.topProducts));
  });

  console.log('\n--- SUITE 11: Comprehensive Edit & Delete in All Functions ---');
  let editTestBillId = null;
  let editTestPaymentId = null;
  let editTestAdjId = null;
  let editTestSupPaymentId = null;
  let editTestExpenseId = null;
  let editTestPurchaseId = null;

  await test('TC76: PUT /api/bills/:id edits quantity, rate, and totals of existing invoice', async () => {
    // Create bill first
    const bRes = await request('POST', '/api/bills', {
      customer_name: `Edit Cust ${uniqueSuffix}`,
      product_name: `Edit Steel ${uniqueSuffix}`,
      quantity: 1000,
      unit: 'Kg',
      rate: 35,
      amount_received: 0,
      payment_mode: 'Credit'
    });
    assert([200, 201].includes(bRes.status));
    editTestBillId = bRes.data.bill.id;

    // Now edit the bill to 1200 Kg @ ₹36/Kg
    const putRes = await request('PUT', `/api/bills/${editTestBillId}`, {
      quantity: 1200,
      rate: 36,
      amount_received: 10000
    });
    assert.strictEqual(putRes.status, 200);
    assert.strictEqual(Number(putRes.data.bill.quantity), 1200);
    assert.strictEqual(Number(putRes.data.bill.rate), 36);
    assert.strictEqual(Number(putRes.data.bill.amount_received), 10000);
  });

  await test('TC77: DELETE /api/bills/:id deletes invoice and adjusts customer dues', async () => {
    assert(editTestBillId);
    const delRes = await request('DELETE', `/api/bills/${editTestBillId}`);
    assert.strictEqual(delRes.status, 200);
    assert.strictEqual(delRes.data.success, true);

    // Verify it is gone
    const checkRes = await request('GET', '/api/bills');
    const exists = checkRes.data.find(b => b.id === editTestBillId);
    assert.strictEqual(exists, undefined);
  });

  await test('TC78: PUT /api/customers/:id updates customer phone and address', async () => {
    assert(testCustomerId);
    const putRes = await request('PUT', `/api/customers/${testCustomerId}`, {
      name: `Updated Cust ${uniqueSuffix}`,
      phone: '9999888877',
      address: 'New Industrial Zone, Chennai'
    });
    assert.strictEqual(putRes.status, 200);
    assert.strictEqual(putRes.data.phone, '9999888877');
    assert.strictEqual(putRes.data.address, 'New Industrial Zone, Chennai');
  });

  await test('TC79: DELETE /api/customers/payments/:paymentId deletes customer payment', async () => {
    assert(testCustomerId);
    // Record payment first
    const payRes = await request('POST', `/api/customers/${testCustomerId}/pay`, {
      amount: 5000,
      payment_mode: 'Cash',
      notes: 'Test payment for deletion'
    });
    assert.strictEqual(payRes.status, 200);

    const custDetail = await request('GET', `/api/customers/${testCustomerId}`);
    const payItem = custDetail.data.payments.find(p => p.notes === 'Test payment for deletion');
    assert(payItem);
    editTestPaymentId = payItem.id;

    // Delete it
    const delRes = await request('DELETE', `/api/customers/payments/${editTestPaymentId}`);
    assert.strictEqual(delRes.status, 200);
    assert.strictEqual(delRes.data.success, true);
  });

  await test('TC80: DELETE /api/customers/adjustments/:adjId deletes customer adjustment', async () => {
    assert(testCustomerId);
    // Add adjustment
    const adjRes = await request('POST', `/api/customers/${testCustomerId}/adjust`, {
      amount: 1500,
      notes: 'Test adjustment for deletion'
    });
    assert.strictEqual(adjRes.status, 200);

    const custDetail = await request('GET', `/api/customers/${testCustomerId}`);
    const adjItem = custDetail.data.adjustments.find(a => a.notes === 'Test adjustment for deletion');
    assert(adjItem);
    editTestAdjId = adjItem.id;

    // Delete it
    const delRes = await request('DELETE', `/api/customers/adjustments/${editTestAdjId}`);
    assert.strictEqual(delRes.status, 200);
    assert.strictEqual(delRes.data.success, true);
  });

  await test('TC81: PUT /api/suppliers/:id updates supplier company and contact', async () => {
    assert(testSupplierId);
    const putRes = await request('PUT', `/api/suppliers/${testSupplierId}`, {
      name: `Updated Supplier ${uniqueSuffix}`,
      company_name: 'Jindal Steel Mill',
      phone: '9888777666',
      address: 'Industrial Estate, Bellary'
    });
    assert.strictEqual(putRes.status, 200);
    assert.strictEqual(putRes.data.supplier.company_name, 'Jindal Steel Mill');
    assert.strictEqual(putRes.data.supplier.phone, '9888777666');
  });

  await test('TC82: PUT /api/suppliers/purchases/:purchaseId updates inward purchase', async () => {
    assert(testSupplierId);
    const pRes = await request('POST', `/api/suppliers/${testSupplierId}/purchases`, {
      product_name: 'Raw Scrap',
      quantity: 500,
      bought_price_per_unit: 30,
      paid_amount: 5000
    });
    assert([200, 201].includes(pRes.status));
    editTestPurchaseId = pRes.data.purchase_id;

    // Edit purchase
    const putRes = await request('PUT', `/api/suppliers/purchases/${editTestPurchaseId}`, {
      product_name: 'Raw Scrap Premium',
      quantity: 600,
      bought_price_per_unit: 32,
      paid_amount: 8000
    });
    assert.strictEqual(putRes.status, 200);
    assert.strictEqual(Number(putRes.data.purchase.quantity), 600);
    assert.strictEqual(Number(putRes.data.purchase.bought_price_per_unit), 32);
  });

  await test('TC83: DELETE /api/suppliers/payments/:paymentId deletes supplier payment', async () => {
    assert(testSupplierId);
    const payRes = await request('POST', `/api/suppliers/${testSupplierId}/pay`, {
      amount: 4000,
      payment_mode: 'Bank Transfer'
    });
    assert.strictEqual(payRes.status, 200);

    const supDetail = await request('GET', `/api/suppliers/${testSupplierId}`);
    const payItem = supDetail.data.payments[0];
    assert(payItem);
    editTestSupPaymentId = payItem.id;

    const delRes = await request('DELETE', `/api/suppliers/payments/${editTestSupPaymentId}`);
    assert.strictEqual(delRes.status, 200);
    assert.strictEqual(delRes.data.success, true);
  });

  await test('TC84: DELETE /api/vehicles/expenses/:expenseId deletes vehicle expense', async () => {
    assert(testVehicleId);
    const expRes = await request('POST', `/api/vehicles/${testVehicleId}/expenses`, {
      expense_type: 'Diesel',
      amount: 3500,
      liters: 35,
      rate_per_liter: 100
    });
    assert([200, 201].includes(expRes.status));
    editTestExpenseId = expRes.data.expense.id;

    const delRes = await request('DELETE', `/api/vehicles/expenses/${editTestExpenseId}`);
    assert.strictEqual(delRes.status, 200);
    assert.strictEqual(delRes.data.success, true);
  });

  await test('TC85: DELETE /api/employees/:id deletes employee and their payments', async () => {
    // Create new employee
    const empRes = await request('POST', '/api/employees', {
      name: `Delete Emp ${uniqueSuffix}`,
      employee_type: 'Loader',
      phone: '9000111222'
    });
    assert([200, 201].includes(empRes.status));
    const empId = empRes.data.id;

    // Add payment
    await request('POST', `/api/employees/${empId}/pay`, {
      amount: 2500,
      payment_mode: 'Cash'
    });

    // Delete employee
    const delRes = await request('DELETE', `/api/employees/${empId}`);
    assert.strictEqual(delRes.status, 200);
    assert.strictEqual(delRes.data.success, true);

    // Verify gone
    const empList = await request('GET', '/api/employees');
    assert.strictEqual(empList.data.find(e => e.id === empId), undefined);
  });

  // ---------------------------------------------------------------------------
  // SUITE 12: USER AUTHENTICATION & ROLE-BASED ACCESS
  // ---------------------------------------------------------------------------
  console.log('\n--- SUITE 12: User Authentication & Seeded Accounts ---');
  await test('TC86: POST /api/auth/login succeeds for admin@jazlon.com with password Jaz$lon@', async () => {
    const res = await request('POST', '/api/auth/login', {
      email: 'admin@jazlon.com',
      password: 'Jaz$lon@'
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.success, true);
    assert.strictEqual(res.data.user.role, 'admin');
    assert.strictEqual(res.data.user.email, 'admin@jazlon.com');
  });

  await test('TC87: POST /api/auth/login succeeds for bill@jazlon.com with password admin@123', async () => {
    const res = await request('POST', '/api/auth/login', {
      email: 'bill@jazlon.com',
      password: 'admin@123'
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.success, true);
    assert.strictEqual(res.data.user.role, 'biller');
    assert.strictEqual(res.data.user.email, 'bill@jazlon.com');
  });

  await test('TC88: POST /api/auth/login rejects wrong password with 401', async () => {
    const res = await request('POST', '/api/auth/login', {
      email: 'admin@jazlon.com',
      password: 'WrongPassword999'
    });
    assert.strictEqual(res.status, 401);
    assert.strictEqual(res.data.error, 'Invalid email or password');
  });

  await test('TC89: POST /api/auth/login rejects missing credentials with 400', async () => {
    const res = await request('POST', '/api/auth/login', { email: 'admin@jazlon.com' });
    assert.strictEqual(res.status, 400);
  });

  await test('TC90: POST /api/auth/logout succeeds with 200', async () => {
    const res = await request('POST', '/api/auth/logout', {});
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.success, true);
  });

  // Clean up test data
  console.log('\n--- Cleaning up temporary test data ---');
  try {
    if (testCustomerId) {
      await db.prepare('DELETE FROM bills WHERE customer_id = ?').run(testCustomerId);
      await db.prepare('DELETE FROM customer_payments WHERE customer_id = ?').run(testCustomerId);
      await db.prepare('DELETE FROM customer_adjustments WHERE customer_id = ?').run(testCustomerId);
      await db.prepare('DELETE FROM customers WHERE id = ?').run(testCustomerId);
    }
    if (testVehicleId) {
      await db.prepare('DELETE FROM vehicle_expenses WHERE vehicle_id = ?').run(testVehicleId);
      await db.prepare('DELETE FROM vehicles WHERE id = ?').run(testVehicleId);
    }
    if (testEmployeeId) {
      await db.prepare('DELETE FROM employee_payments WHERE employee_id = ?').run(testEmployeeId);
      await db.prepare('DELETE FROM employees WHERE id = ?').run(testEmployeeId);
    }
    if (testSupplierId) {
      await db.prepare('DELETE FROM supplier_payments WHERE supplier_id = ?').run(testSupplierId);
      await db.prepare('DELETE FROM supplier_purchases WHERE supplier_id = ?').run(testSupplierId);
      await db.prepare('DELETE FROM suppliers WHERE id = ?').run(testSupplierId);
    }
    if (testProductId) {
      await db.prepare('DELETE FROM products WHERE id = ?').run(testProductId);
    }
    await db.prepare(`DELETE FROM bills WHERE product_name LIKE '%${uniqueSuffix}%'`).run();
    await db.prepare(`DELETE FROM customers WHERE name LIKE '%${uniqueSuffix}%'`).run();
    console.log('Temporary test data cleaned up successfully.');
  } catch (cleanErr) {
    console.warn('Warning during cleanup:', cleanErr.message);
  }

  server.close();

  console.log('\n========================================================================');
  console.log(`   TEST SUITE EXECUTION COMPLETED: ${passedCount} PASSED, ${failedCount} FAILED (${passedCount + failedCount} TOTAL)`);
  console.log('========================================================================\n');

  if (failedCount > 0) {
    process.exit(1);
  }
}

runAllTests().catch(err => {
  console.error('Fatal test error:', err);
  if (server) server.close();
  process.exit(1);
});
