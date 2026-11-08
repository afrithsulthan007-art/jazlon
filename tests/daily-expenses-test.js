process.env.VERCEL = '1';
require('dotenv').config();
const assert = require('assert');
const app = require('../server/index');
const http = require('http');

let server;
let baseUrl;

let passed = 0;
let failed = 0;

async function test(name, fn) {
  try {
    await fn();
    passed++;
    console.log(`  ✓ [PASS] ${name}`);
  } catch (err) {
    failed++;
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

async function run() {
  console.log('========================================================================');
  console.log('   DAILY EXPENSES & PROFIT INTEGRATION TEST SUITE');
  console.log('========================================================================\n');

  server = http.createServer(app);
  await new Promise(resolve => server.listen(0, resolve));
  const port = server.address().port;
  baseUrl = `http://127.0.0.1:${port}`;
  console.log(`Test server running on ${baseUrl}\n`);

  let createdExpenseId = null;
  let createdItemId = null;
  const testDate = new Date().toISOString().split('T')[0];

  await test('TC01: GET /api/drivers returns unified driver roster', async () => {
    const res = await request('GET', '/api/drivers');
    assert.strictEqual(res.status, 200);
    assert(Array.isArray(res.data), 'Drivers response must be an array');
    assert(res.data.length > 0, 'Should find at least 1 driver in database');
    const first = res.data[0];
    assert(first.name, 'Driver must have a name');
  });

  await test('TC02: GET /api/stats/counts includes dailyExpenses metric', async () => {
    const res = await request('GET', '/api/stats/counts');
    assert.strictEqual(res.status, 200);
    assert('dailyExpenses' in res.data, 'dailyExpenses should be in counts');
  });

  await test('TC03: POST /api/daily-expenses rejects missing driver name', async () => {
    const res = await request('POST', '/api/daily-expenses', {
      given_amount: 5000
    });
    assert.strictEqual(res.status, 400);
  });

  await test('TC04: POST /api/daily-expenses creates daily advance with multiple categorized line items', async () => {
    const res = await request('POST', '/api/daily-expenses', {
      driver_name: 'Murugan Driver (Test)',
      expense_date: testDate,
      given_amount: 5000,
      payment_mode: 'Cash',
      notes: 'Trichy route - advance & daily logging',
      items: [
        { category: 'Diesel Expense', note: 'Trichy BPCL 35L diesel', amount: 3200 },
        { category: 'Other Vehicle Expense', note: 'NH45 Toll Plaza FASTag', amount: 600 },
        { category: 'Other', note: 'Driver food & tea allowance', amount: 400 }
      ]
    });

    assert.strictEqual(res.status, 201);
    assert(res.data.success);
    const exp = res.data.expense;
    assert(exp.id, 'Created expense must have an ID');
    createdExpenseId = exp.id;
    assert.strictEqual(Number(exp.given_amount), 5000);
    assert.strictEqual(Number(exp.spent_amount), 4200);
    assert.strictEqual(Number(exp.balance_amount), 800);
    assert.strictEqual(exp.status, 'Partial');
    assert.strictEqual(exp.items.length, 3);
    createdItemId = exp.items[0].id;
  });

  await test('TC05: GET /api/daily-expenses returns newly created expense and accurate aggregates', async () => {
    const res = await request('GET', `/api/daily-expenses?from_date=${testDate}&to_date=${testDate}`);
    assert.strictEqual(res.status, 200);
    assert(Array.isArray(res.data.expenses));
    const found = res.data.expenses.find(e => e.id === createdExpenseId);
    assert(found, 'Created expense should be in returned list');
    assert.strictEqual(Number(found.diesel_amount), 3200);
    assert.strictEqual(Number(found.vehicle_other_amount), 600);
    assert.strictEqual(Number(found.other_amount), 400);
    assert.strictEqual(Number(found.spent_amount), 4200);
    assert.strictEqual(Number(found.balance_amount), 800);
  });

  await test('TC06: POST /api/daily-expenses/:id/items appends next classified item and transitions to Classified', async () => {
    // Add next item of 800 to exhaust the remaining 800 balance
    const res = await request('POST', `/api/daily-expenses/${createdExpenseId}/items`, {
      category: 'Other Vehicle Expense',
      note: 'Tyre puncture repair and air check',
      amount: 800
    });

    assert.strictEqual(res.status, 200);
    assert(res.data.success);
    const exp = res.data.expense;
    assert.strictEqual(Number(exp.spent_amount), 5000);
    assert.strictEqual(Number(exp.balance_amount), 0);
    assert.strictEqual(exp.status, 'Classified');
    assert.strictEqual(exp.items.length, 4);
  });

  await test('TC07: GET /api/accounts feeds daily expense categories into Operating Expenses & Profit Calculation', async () => {
    const res = await request('GET', `/api/accounts?date=${testDate}`);
    assert.strictEqual(res.status, 200);
    const summary = res.data.summary;
    assert(summary, 'Summary must exist in accounts response');
    const op = summary.operatingExpenses;
    assert(op, 'Operating expenses must exist');

    // Diesel category in accounts reflects daily diesel
    assert(Number(op.diesel) >= 3200, `Diesel should be >= 3200, got ${op.diesel}`);
    assert(Number(op.dailyDiesel) >= 3200, `dailyDiesel should be >= 3200, got ${op.dailyDiesel}`);

    // Other Vehicle category reflects daily other vehicle
    assert(Number(op.vehicleOther) >= 1400, `vehicleOther should be >= 1400 (600 + 800), got ${op.vehicleOther}`);

    // Other category reflects driver other allowance
    assert(Number(op.otherDailyExpenses) >= 400, `otherDailyExpenses should be >= 400, got ${op.otherDailyExpenses}`);

    // Total Operating Expenses includes all daily expenses
    assert(Number(op.total) >= 5000, `Total operating expenses must include at least 5000, got ${op.total}`);

    // Net Profit formula verification
    // Net profit = Revenue - Deductions (where deductions includes vehicleCharges + salaries + otherDailyExpenses)
    const expectedDeductions = summary.costOfGoods + summary.cgst + summary.sgst + summary.tds + summary.vehicleCharges + summary.employeeSalaries + (summary.otherDailyExpenses || 0);
    assert.strictEqual(summary.totalDeductions, expectedDeductions);
    const expectedNetProfit = Math.round(summary.totalRevenue - summary.totalDeductions);
    assert.strictEqual(summary.netProfit, expectedNetProfit);
  });

  await test('TC08: PUT /api/daily-expenses/:id updates given amount and notes', async () => {
    const res = await request('PUT', `/api/daily-expenses/${createdExpenseId}`, {
      given_amount: 6000,
      notes: 'Updated note: given 6000 total advance'
    });
    assert.strictEqual(res.status, 200);
    const exp = res.data.expense;
    assert.strictEqual(Number(exp.given_amount), 6000);
    assert.strictEqual(Number(exp.balance_amount), 1000);
    assert.strictEqual(exp.status, 'Partial');
  });

  await test('TC09: DELETE /api/daily-expenses/:id/items/:itemId removes line item and adjusts totals', async () => {
    const res = await request('DELETE', `/api/daily-expenses/${createdExpenseId}/items/${createdItemId}`);
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.success, true);
    // After removing 3200 item, spent becomes 5000 - 3200 = 1800, balance becomes 6000 - 1800 = 4200
    assert.strictEqual(Number(res.data.spent_amount), 1800);
    assert.strictEqual(Number(res.data.balance_amount), 4200);
  });

  await test('TC10: DELETE /api/daily-expenses/:id deletes entire record and cleans up ledger', async () => {
    const res = await request('DELETE', `/api/daily-expenses/${createdExpenseId}`);
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.success, true);

    // Verify deletion
    const getRes = await request('GET', `/api/daily-expenses/${createdExpenseId}`);
    assert.strictEqual(getRes.status, 404);
  });

  server.close();

  console.log('\n========================================================================');
  console.log(`   TEST EXECUTION COMPLETED: ${passed} PASSED, ${failed} FAILED (${passed + failed} TOTAL)`);
  console.log('========================================================================\n');

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

run().catch(err => {
  console.error('Fatal test error:', err);
  if (server) server.close();
  process.exit(1);
});

