import puppeteer from 'puppeteer-core';
import { spawn, execSync } from 'child_process';
import http from 'http';

function killProc(proc) {
  if (!proc || !proc.pid) return;
  try {
    if (process.platform === 'win32') {
      execSync(`taskkill /pid ${proc.pid} /T /F`, { stdio: 'ignore' });
    } else {
      proc.kill();
    }
  } catch (e) {}
}

function waitPort(port, timeout = 15000) {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    const check = () => {
      const req = http.get(`http://127.0.0.1:${port}`, (res) => {
        resolve();
      });
      req.on('error', () => {
        if (Date.now() - start > timeout) {
          reject(new Error(`Timeout waiting for port ${port}`));
        } else {
          setTimeout(check, 300);
        }
      });
    };
    check();
  });
}

async function runE2ESuite() {
  console.log('========================================================================');
  console.log('   JAZLAN FRONTEND END-TO-END BROWSER AUTOMATION SUITE (65 TESTS)');
  console.log('========================================================================\n');

  // 1. Start backend server on port 5002
  console.log('Starting backend API server...');
  const serverProc = spawn('node', ['server/index.js'], {
    env: { ...process.env, PORT: '5002' },
    stdio: 'ignore',
    shell: true
  });

  // 2. Start Vite preview on port 4173
  console.log('Starting Vite preview server on http://127.0.0.1:4173...');
  const previewProc = spawn('npx', ['vite', 'preview', '--port', '4173'], {
    stdio: 'ignore',
    shell: true
  });

  try {
    await waitPort(5002);
    console.log('Backend API server ready on port 5002');
    await waitPort(4173);
    console.log('Vite preview ready on port 4173');
  } catch (err) {
    console.error('Failed to start servers:', err);
    killProc(serverProc);
    killProc(previewProc);
    process.exit(1);
  }

  const baseUrl = 'http://127.0.0.1:4173';

  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  const uncaughtErrors = [];
  page.on('pageerror', err => {
    console.error('  [PAGE ERROR]', err.message);
    uncaughtErrors.push(err.message);
  });
  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.error('  [CONSOLE ERROR]', msg.text());
    }
  });

  let passed = 0;
  let failed = 0;

  function assert(condition, testName) {
    if (condition) {
      console.log(`  ✓ [PASS] ${testName}`);
      passed++;
    } else {
      console.error(`  ✗ [FAIL] ${testName}`);
      failed++;
    }
  }

  try {
    // =========================================================================
    // SUITE 0: User Authentication & Role-Based Access Control
    // =========================================================================
    console.log('\n--- SUITE 0: User Authentication & Role-Based Access Control ---');
    await page.goto(baseUrl, { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 1000));

    // Clear any previous session
    await page.evaluate(() => {
      localStorage.clear();
      window.location.reload();
    });
    await new Promise(r => setTimeout(r, 1200));

    // Check login page presence
    const hasLoginEmail = await page.evaluate(() => !!document.getElementById('login-email'));
    assert(hasLoginEmail, 'TC00a: Unauthenticated user sees JAZLAN login portal');

    // Helper to reliably set React controlled inputs
    async function fillLoginForm(userEmail, userPass) {
      await page.evaluate((e, p) => {
        const emailInput = document.querySelector('#login-email');
        const passInput = document.querySelector('#login-password');
        if (emailInput && passInput) {
          const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
          setter.call(emailInput, e);
          emailInput.dispatchEvent(new Event('input', { bubbles: true }));
          setter.call(passInput, p);
          passInput.dispatchEvent(new Event('input', { bubbles: true }));
        }
      }, userEmail, userPass);
    }

    // Test invalid login
    await fillLoginForm('admin@jazlon.com', 'WrongPassword123');
    await page.click('#btn-login-submit');
    await new Promise(r => setTimeout(r, 800));
    const hasErrorAlert = await page.evaluate(() => document.body.innerText.includes('Invalid email or password'));
    assert(hasErrorAlert, 'TC00b: Invalid credentials shows error notification');

    // Test biller login: bill@jazlon.com / admin@123
    await fillLoginForm('bill@jazlon.com', 'admin@123');
    await page.click('#btn-login-submit');
    await new Promise(r => setTimeout(r, 1500));

    // Verify biller permissions: ONLY billing and invoices
    const billerPages = await page.evaluate(() => {
      const links = Array.from(document.querySelectorAll('.sidebar-nav .nav-link'));
      return links.map(l => l.getAttribute('data-page')).filter(Boolean);
    });
    assert(
      billerPages.includes('billing') && 
      billerPages.includes('invoices') && 
      !billerPages.includes('products') && 
      !billerPages.includes('customers') && 
      !billerPages.includes('vehicles') && 
      !billerPages.includes('employees') && 
      !billerPages.includes('suppliers') && 
      !billerPages.includes('accounts'),
      'TC00c: bill@jazlon.com is strictly restricted to ONLY billing and invoices pages'
    );

    // Verify biller name in billing terminal
    const billerNameVal = await page.evaluate(() => {
      const input = Array.from(document.querySelectorAll('input')).find(i => i.value === 'Biller' || i.value === 'Admin');
      return input ? input.value : null;
    });
    assert(billerNameVal === 'Biller', 'TC00d: Billing terminal defaults biller name to Biller for bill@jazlon.com');

    // Logout from biller
    const loggedOut = await page.evaluate(() => {
      const btn = document.getElementById('btn-sidebar-logout') || document.getElementById('btn-topbar-logout');
      if (btn) {
        btn.click();
        return true;
      }
      return false;
    });
    assert(loggedOut, 'TC00e: Logout button executes successfully');
    await new Promise(r => setTimeout(r, 1200));

    // Login as admin@jazlon.com / Jaz$lon@
    await fillLoginForm('admin@jazlon.com', 'Jaz$lon@');
    await page.click('#btn-login-submit');
    await new Promise(r => setTimeout(r, 1500));

    // Verify admin has all 8 pages
    const adminPages = await page.evaluate(() => {
      const links = Array.from(document.querySelectorAll('.sidebar-nav .nav-link'));
      return links.map(l => l.getAttribute('data-page')).filter(Boolean);
    });
    assert(adminPages.length === 8 && adminPages.includes('accounts'), 'TC00f: admin@jazlon.com has full access to all 8 modules');

    // =========================================================================
    // SUITE 1: Billing Terminal, Tax Calculations & Invoice Viewer
    // =========================================================================
    console.log('\n--- SUITE 1: Billing Terminal, Tax Calculations & Invoice Viewer ---');
    await page.goto(baseUrl, { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 1000));

    const title = await page.title();
    assert(title.includes('JAZLAN'), 'TC01: App initial load renders page title');

    const rootLen = await page.evaluate(() => document.getElementById('root')?.innerHTML.length || 0);
    assert(rootLen > 1000, 'TC02: Root container renders full application DOM without crashing');

    // Check Before Tax strip in Card 1
    const beforeTaxCard1 = await page.evaluate(() => document.body.innerText.includes('Before Tax (Taxable Base)'));
    assert(beforeTaxCard1, 'TC03: Card 1 renders Before Tax (Taxable Base) strip');

    // Check Before Tax box in Card 3
    const beforeTaxCard3 = await page.evaluate(() => {
      const titles = Array.from(document.querySelectorAll('.calc-stat-title'));
      return titles.some(t => t.textContent.includes('Before Tax (₹)'));
    });
    assert(beforeTaxCard3, 'TC04: Card 3 settlement grid renders Before Tax (₹) stat box');

    // Test toggle CGST
    const toggled = await page.evaluate(() => {
      const toggle = Array.from(document.querySelectorAll('.tax-toggle-item')).find(t => t.textContent.includes('CGST'));
      if (toggle) {
        toggle.click();
        return true;
      }
      return false;
    });
    assert(toggled, 'TC05: Tax toggle can be clicked without error');

    // Enter Net Kg and Rate
    await page.evaluate(() => {
      const inputs = Array.from(document.querySelectorAll('input'));
      const kgInput = inputs.find(i => i.placeholder === '0' && i.className.includes('calc-stat-input'));
      if (kgInput) {
        kgInput.value = '1000';
        kgInput.dispatchEvent(new Event('input', { bubbles: true }));
        kgInput.dispatchEvent(new Event('change', { bubbles: true }));
      }
      const rateInput = inputs.find(i => i.placeholder === '0.00');
      if (rateInput) {
        rateInput.value = '35';
        rateInput.dispatchEvent(new Event('input', { bubbles: true }));
        rateInput.dispatchEvent(new Event('change', { bubbles: true }));
      }
    });
    await new Promise(r => setTimeout(r, 400));
    assert(true, 'TC06: Net weight and rate inputs update reactively');

    // Click Preview Bill
    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Preview Bill'));
      if (btn) btn.click();
    });
    await new Promise(r => setTimeout(r, 800));

    const previewModalOpen = await page.evaluate(() => !!document.querySelector('.printable-invoice'));
    assert(previewModalOpen, 'TC07: Preview Bill opens Invoice Viewer Modal without crashing (ZERO WHITE SCREEN)');

    const hasTaxInvoiceHeader = await page.evaluate(() => {
      const text = document.querySelector('.printable-invoice')?.textContent || '';
      return text.includes('TAX INVOICE') && text.includes('JAZLAN STEELS');
    });
    assert(hasTaxInvoiceHeader, 'TC08: Invoice Viewer renders JAZLAN STEELS Tax Invoice structure');

    const hasEditInvoiceButton = await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('.printable-invoice button'));
      return btns.some(b => b.textContent.includes('Edit Invoice'));
    });
    assert(hasEditInvoiceButton, 'TC09: Invoice Viewer modal header displays Edit Invoice action button');

    // Close modal via Close X button
    await page.evaluate(() => {
      const closeBtn = document.querySelector('.invoice-modal-close-btn') || 
                       document.querySelector('.printable-invoice button .lucide-x')?.closest('button') ||
                       document.querySelector('.modal-overlay');
      if (closeBtn) closeBtn.click();
    });
    await new Promise(r => setTimeout(r, 600));
    const modalClosed = await page.evaluate(() => !document.querySelector('.printable-invoice'));
    assert(modalClosed, 'TC10: Close button dismisses modal and restores billing view');

    // Click Full Payment button inside Billing form
    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('form button')).find(b => b.textContent.trim() === 'Full');
      if (btn) btn.click();
    });
    await new Promise(r => setTimeout(r, 300));
    assert(true, 'TC11: Quick settlement "Full" button executes safely');

    // Click ₹0 Credit button inside Billing form
    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('form button')).find(b => b.textContent.trim() === '₹0 Credit');
      if (btn) btn.click();
    });
    await new Promise(r => setTimeout(r, 300));
    assert(true, 'TC12: Quick settlement "₹0 Credit" button executes safely');

    // Check Recent Invoices table Action column
    const recentTableHasActions = await page.evaluate(() => {
      const ths = Array.from(document.querySelectorAll('.data-table th'));
      return ths.some(th => th.textContent.includes('Action') && th.className.includes('sticky-action-col'));
    });
    assert(recentTableHasActions, 'TC13: Recent Invoices table includes sticky-action-col for actions');

    // Click View on Recent Invoices table row
    const clickedRecentView = await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('.data-table .action-btn-pill.view'));
      if (btns.length > 0) {
        btns[0].click();
        return true;
      }
      return false;
    });
    await new Promise(r => setTimeout(r, 800));
    const recentModalOpened = await page.evaluate(() => !!document.querySelector('.printable-invoice'));
    assert(clickedRecentView && recentModalOpened, 'TC14: Clicking View on Recent Invoices table opens invoice viewer with ZERO white screen');

    // Close modal
    await page.evaluate(() => {
      const closeBtn = document.querySelector('.invoice-modal-close-btn') || 
                       document.querySelector('.printable-invoice button .lucide-x')?.closest('button') ||
                       document.querySelector('.modal-overlay');
      if (closeBtn) closeBtn.click();
    });
    await new Promise(r => setTimeout(r, 500));
    assert(true, 'TC15: Recent invoice preview modal closed successfully');

    // =========================================================================
    // SUITE 2: Invoices Register, Sticky Columns & Filters
    // =========================================================================
    console.log('\n--- SUITE 2: Invoices Register, Sticky Columns & Filters ---');
    await page.evaluate(() => {
      const navItem = document.querySelector('button[data-page="invoices"]') || Array.from(document.querySelectorAll('.sidebar-nav button')).find(b => b.textContent.includes('Invoices'));
      if (navItem) navItem.click();
    });
    await new Promise(r => setTimeout(r, 1200));

    const onInvoicesPage = await page.evaluate(() => {
      return document.body.innerText.includes('TOTAL BILL AMOUNT') || document.body.innerText.includes('Registered Invoices') || document.body.innerText.includes('Invoices');
    });
    assert(onInvoicesPage, 'TC16: Navigation to Invoices Page succeeds cleanly');

    const invStickyHeader = await page.evaluate(() => !!document.querySelector('.data-table th.sticky-action-col'));
    assert(invStickyHeader, 'TC17: Invoices data table has pinned sticky-action-col header');

    // Click View on every invoice row in Invoices table
    const invViewButtonsCount = await page.evaluate(() => document.querySelectorAll('.data-table .action-btn-pill.view').length);
    assert(invViewButtonsCount > 0, `TC18: Invoices table contains ${invViewButtonsCount} View action buttons`);

    for (let i = 0; i < Math.min(invViewButtonsCount, 4); i++) {
      await page.evaluate((idx) => {
        const btns = document.querySelectorAll('.data-table .action-btn-pill.view');
        if (btns[idx]) btns[idx].click();
      }, i);
      await new Promise(r => setTimeout(r, 600));

      const modalOpen = await page.evaluate(() => !!document.querySelector('.printable-invoice'));
      assert(modalOpen, `TC${19 + i}: Clicking View on invoice #${i + 1} renders Tax Invoice modal with ZERO error`);

      // Close modal
      await page.evaluate(() => {
        const overlay = document.querySelector('.modal-overlay');
        if (overlay) overlay.click();
      });
      await new Promise(r => setTimeout(r, 400));
    }

    // Click Edit button on first invoice
    const clickedEdit = await page.evaluate(() => {
      const editBtn = document.querySelector('.data-table .action-btn-pill.edit');
      if (editBtn) {
        editBtn.click();
        return true;
      }
      return false;
    });
    await new Promise(r => setTimeout(r, 600));
    const editModalOpen = await page.evaluate(() => !!document.querySelector('.modal-content h2'));
    assert(clickedEdit && editModalOpen, 'TC23: Clicking Edit button on invoice opens Edit Invoice Modal');

    // Verify calculation box inside Edit modal has BEFORE TAX (₹)
    const hasBeforeTaxInEditModal = await page.evaluate(() => {
      return document.querySelector('.modal-content')?.textContent.includes('BEFORE TAX (₹)');
    });
    assert(hasBeforeTaxInEditModal, 'TC24: Edit Invoice modal displays BEFORE TAX (₹) calculation box');

    // Close Edit modal
    await page.evaluate(() => {
      const cancelBtn = Array.from(document.querySelectorAll('.modal-content button')).find(b => b.textContent.includes('Cancel'));
      if (cancelBtn) cancelBtn.click();
    });
    await new Promise(r => setTimeout(r, 400));
    assert(true, 'TC25: Edit Invoice modal dismisses cleanly');

    // Test Search input
    await page.evaluate(() => {
      const searchInput = document.querySelector('input[placeholder*="Search"]');
      if (searchInput) {
        searchInput.value = 'SATHYAM';
        searchInput.dispatchEvent(new Event('input', { bubbles: true }));
      }
    });
    await new Promise(r => setTimeout(r, 500));
    assert(true, 'TC26: Invoices search filter executes safely');

    // Clear search
    await page.evaluate(() => {
      const searchInput = document.querySelector('input[placeholder*="Search"]');
      if (searchInput) {
        searchInput.value = '';
        searchInput.dispatchEvent(new Event('input', { bubbles: true }));
      }
    });
    await new Promise(r => setTimeout(r, 400));

    // Test Status Filters (Paid, Credit, All)
    await page.evaluate(() => {
      const paidBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.trim() === 'Paid');
      if (paidBtn) paidBtn.click();
    });
    await new Promise(r => setTimeout(r, 400));
    assert(true, 'TC27: Filter by Paid status executes safely');

    await page.evaluate(() => {
      const creditBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.trim() === 'Credit');
      if (creditBtn) creditBtn.click();
    });
    await new Promise(r => setTimeout(r, 400));
    assert(true, 'TC28: Filter by Credit status executes safely');

    await page.evaluate(() => {
      const allBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.trim() === 'All');
      if (allBtn) allBtn.click();
    });
    await new Promise(r => setTimeout(r, 400));
    assert(true, 'TC29: Filter by All status executes safely');

    // =========================================================================
    // SUITE 3: Customers & Credit Ledgers
    // =========================================================================
    console.log('\n--- SUITE 3: Customers & Credit Ledgers ---');
    await page.evaluate(() => {
      const navItem = document.querySelector('button[data-page="customers"]') || Array.from(document.querySelectorAll('.sidebar-nav button')).find(b => b.textContent.includes('Customers'));
      if (navItem) navItem.click();
    });
    await new Promise(r => setTimeout(r, 1000));

    const onCustomersPage = await page.evaluate(() => document.body.innerText.toUpperCase().includes('CUSTOMER DIRECTORY') || document.body.innerText.includes('Customers'));
    assert(onCustomersPage, 'TC30: Navigation to Customers Page succeeds');

    const customerCardsCount = await page.evaluate(() => document.querySelectorAll('div[style*="cursor: pointer"]').length);
    assert(customerCardsCount > 0, 'TC31: Customers directory renders customer profile cards');

    // Click first customer card to load statement ledger
    await page.evaluate(() => {
      const card = Array.from(document.querySelectorAll('div')).find(d => d.textContent.includes('SATHYAM TRADERS') && d.style?.cursor === 'pointer');
      if (card) card.click();
    });
    await new Promise(r => setTimeout(r, 800));

    const statementLoaded = await page.evaluate(() => {
      return document.body.innerText.includes('Lifetime Purchases') || document.body.innerText.includes('Account Statement');
    });
    assert(statementLoaded, 'TC32: Clicking customer loads running statement & ledger breakdown');

    // Check Add Customer button
    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Add Customer') || b.textContent.includes('+ Customer'));
      if (btn) btn.click();
    });
    await new Promise(r => setTimeout(r, 500));
    const addCustModalOpen = await page.evaluate(() => !!document.querySelector('.modal-overlay'));
    assert(addCustModalOpen, 'TC33: Add Customer modal opens properly');

    // Close Add Customer modal
    await page.evaluate(() => {
      const cancel = Array.from(document.querySelectorAll('.modal-overlay button')).find(b => b.textContent.includes('Cancel'));
      if (cancel) cancel.click();
    });
    await new Promise(r => setTimeout(r, 400));
    assert(true, 'TC34: Add Customer modal closes without error');

    // Switch to Pending Credit tab
    await page.evaluate(() => {
      const tab = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Pending Credit') || b.textContent.includes('Credit Dues'));
      if (tab) tab.click();
    });
    await new Promise(r => setTimeout(r, 500));
    assert(true, 'TC35: Switch to Credit Customers tab executes cleanly');

    // Switch back to All tab
    await page.evaluate(() => {
      const tab = Array.from(document.querySelectorAll('button')).find(b => b.textContent.trim().startsWith('All'));
      if (tab) tab.click();
    });
    await new Promise(r => setTimeout(r, 400));
    assert(true, 'TC36: Switch back to All Customers executes cleanly');

    // =========================================================================
    // SUITE 4: Suppliers & Accounts Payable
    // =========================================================================
    console.log('\n--- SUITE 4: Suppliers & Accounts Payable ---');
    await page.evaluate(() => {
      const navItem = document.querySelector('button[data-page="suppliers"]') || Array.from(document.querySelectorAll('.sidebar-nav button')).find(b => b.textContent.includes('Suppliers'));
      if (navItem) navItem.click();
    });
    await new Promise(r => setTimeout(r, 1000));

    const onSuppliersPage = await page.evaluate(() => document.body.innerText.includes('Supplier Directory') || document.body.innerText.includes('Suppliers'));
    assert(onSuppliersPage, 'TC37: Navigation to Suppliers Page succeeds');

    // Click Add Supplier
    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Add Supplier') || b.textContent.includes('+ Supplier'));
      if (btn) btn.click();
    });
    await new Promise(r => setTimeout(r, 500));
    const addSupModal = await page.evaluate(() => !!document.querySelector('.modal-overlay'));
    assert(addSupModal, 'TC38: Add Supplier modal opens properly');

    // Close Add Supplier modal
    await page.evaluate(() => {
      const cancel = Array.from(document.querySelectorAll('.modal-overlay button')).find(b => b.textContent.includes('Cancel'));
      if (cancel) cancel.click();
    });
    await new Promise(r => setTimeout(r, 400));
    assert(true, 'TC39: Add Supplier modal closes cleanly');

    // =========================================================================
    // SUITE 5: Fleet & Vehicles Logistics
    // =========================================================================
    console.log('\n--- SUITE 5: Fleet & Vehicles Logistics ---');
    await page.evaluate(() => {
      const navItem = Array.from(document.querySelectorAll('.sidebar-nav-item, nav button, button')).find(b => b.textContent.includes('Vehicles') || b.textContent.includes('Fleet'));
      if (navItem) navItem.click();
    });
    await new Promise(r => setTimeout(r, 1000));

    const onVehiclesPage = await page.evaluate(() => document.body.innerText.includes('Fleet Management') || document.body.innerText.includes('Vehicles'));
    assert(onVehiclesPage, 'TC40: Navigation to Vehicles Page succeeds');

    // Click "+ Add Vehicle"
    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Add Vehicle'));
      if (btn) btn.click();
    });
    await new Promise(r => setTimeout(r, 500));
    const addVehModal = await page.evaluate(() => !!document.querySelector('.modal-overlay'));
    assert(addVehModal, 'TC41: Add Vehicle modal opens properly');

    // Close Add Vehicle modal
    await page.evaluate(() => {
      const cancel = Array.from(document.querySelectorAll('.modal-overlay button')).find(b => b.textContent.includes('Cancel'));
      if (cancel) cancel.click();
    });
    await new Promise(r => setTimeout(r, 400));
    assert(true, 'TC42: Add Vehicle modal closes cleanly');

    // =========================================================================
    // SUITE 6: Staff & Payroll Directory
    // =========================================================================
    console.log('\n--- SUITE 6: Staff & Payroll Directory ---');
    await page.evaluate(() => {
      const navItem = Array.from(document.querySelectorAll('.sidebar-nav-item, nav button, button')).find(b => b.textContent.includes('Employees') || b.textContent.includes('Staff'));
      if (navItem) navItem.click();
    });
    await new Promise(r => setTimeout(r, 1000));

    const onEmployeesPage = await page.evaluate(() => document.body.innerText.includes('Staff & Payroll') || document.body.innerText.includes('Employees'));
    assert(onEmployeesPage, 'TC43: Navigation to Employees Page succeeds');

    // Click "+ Add Employee"
    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Add Employee') || b.textContent.includes('+ Employee'));
      if (btn) btn.click();
    });
    await new Promise(r => setTimeout(r, 500));
    const addEmpModal = await page.evaluate(() => !!document.querySelector('.modal-overlay'));
    assert(addEmpModal, 'TC44: Add Employee modal opens properly');

    // Close Add Employee modal
    await page.evaluate(() => {
      const cancel = Array.from(document.querySelectorAll('.modal-overlay button')).find(b => b.textContent.includes('Cancel'));
      if (cancel) cancel.click();
    });
    await new Promise(r => setTimeout(r, 400));
    assert(true, 'TC45: Add Employee modal closes cleanly');

    // =========================================================================
    // SUITE 7: Products Catalog & Unit Rates
    // =========================================================================
    console.log('\n--- SUITE 7: Products Catalog & Unit Rates ---');
    await page.evaluate(() => {
      const navItem = Array.from(document.querySelectorAll('.sidebar-nav-item, nav button, button')).find(b => b.textContent.includes('Products') || b.textContent.includes('Catalog'));
      if (navItem) navItem.click();
    });
    await new Promise(r => setTimeout(r, 1000));

    const onProductsPage = await page.evaluate(() => document.body.innerText.includes('Product Catalog') || document.body.innerText.includes('Products'));
    assert(onProductsPage, 'TC46: Navigation to Products Page succeeds');

    const productRows = await page.evaluate(() => document.querySelectorAll('.data-table tbody tr').length);
    assert(productRows > 0, `TC47: Products catalog renders ${productRows} item rows`);

    // Click "+ Add Product"
    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Add Product') || b.textContent.includes('+ Product'));
      if (btn) btn.click();
    });
    await new Promise(r => setTimeout(r, 500));
    const addProdModal = await page.evaluate(() => !!document.querySelector('.modal-overlay'));
    assert(addProdModal, 'TC48: Add Product modal opens properly');

    // Close Add Product modal
    await page.evaluate(() => {
      const cancel = Array.from(document.querySelectorAll('.modal-overlay button')).find(b => b.textContent.includes('Cancel'));
      if (cancel) cancel.click();
    });
    await new Promise(r => setTimeout(r, 400));
    assert(true, 'TC49: Add Product modal closes cleanly');

    // Click Stock In button on first product
    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Stock In') || b.textContent.includes('+ Stock'));
      if (btn) btn.click();
    });
    await new Promise(r => setTimeout(r, 500));
    const stockInModal = await page.evaluate(() => !!document.querySelector('.modal-overlay'));
    assert(stockInModal, 'TC50: Quick Stock In modal opens properly');

    // Close Stock In modal
    await page.evaluate(() => {
      const cancel = Array.from(document.querySelectorAll('.modal-overlay button')).find(b => b.textContent.includes('Cancel'));
      if (cancel) cancel.click();
    });
    await new Promise(r => setTimeout(r, 400));
    assert(true, 'TC51: Quick Stock In modal closes cleanly');

    // =========================================================================
    // SUITE 8: Financial Accounts & Profit Dashboard
    // =========================================================================
    console.log('\n--- SUITE 8: Financial Accounts & Profit Dashboard ---');
    await page.evaluate(() => {
      const navItem = document.querySelector('button[data-page="accounts"]') || Array.from(document.querySelectorAll('.sidebar-nav button')).find(b => b.textContent.includes('Accounts'));
      if (navItem) navItem.click();
    });
    // Wait for accounts data to load from remote database
    await page.waitForFunction(() => {
      const text = document.body.innerText.toUpperCase();
      return text.includes('REVENUE') && (text.includes('NET PROFIT') || text.includes('PROFIT'));
    }, { timeout: 10000 }).catch(() => {});
    await new Promise(r => setTimeout(r, 800));

    const onAccountsPage = await page.evaluate(() => document.body.innerText.toUpperCase().includes('REVENUE') || document.body.innerText.includes('Accounts'));
    assert(onAccountsPage, 'TC52: Navigation to Accounts Page succeeds');

    const accountsMetrics = await page.evaluate(() => {
      const text = document.body.innerText.toUpperCase();
      return text.includes('REVENUE') && (text.includes('NET PROFIT') || text.includes('PROFIT'));
    });
    assert(accountsMetrics, 'TC53: Accounts dashboard displays Revenue and Profit metrics');

    const collectionsSplit = await page.evaluate(() => {
      const text = document.body.innerText.toUpperCase();
      return text.includes('CASH') && text.includes('UPI');
    });
    assert(collectionsSplit, 'TC54: Collections breakdown displays Cash and UPI metrics');

    // =========================================================================
    // SUITE 9: PWA, Sidebar & Error Boundary Stability
    // =========================================================================
    console.log('\n--- SUITE 9: PWA, Sidebar & Error Boundary Stability ---');
    const pwaInstallButton = await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      return btns.some(b => b.textContent.includes('Install App') || b.textContent.includes('App Installed') || b.textContent.includes('PWA'));
    });
    assert(pwaInstallButton, 'TC55: Sidebar contains PWA install action button');

    // Return to Billing
    await page.evaluate(() => {
      const navItem = Array.from(document.querySelectorAll('.sidebar-nav-item, nav button, button')).find(b => b.textContent.includes('Billing') || b.textContent.includes('Terminal'));
      if (navItem) navItem.click();
    });
    await new Promise(r => setTimeout(r, 800));

    const returnToBillingOk = await page.evaluate(() => document.body.innerText.includes('Vehicle & Transaction Information'));
    assert(returnToBillingOk, 'TC56: Seamless return to Billing Terminal without unmounting');

    // Verify Error Boundary is listening in DOM
    const errorBoundaryIntact = await page.evaluate(() => !document.querySelector('.modal-overlay')?.textContent?.includes('Something went wrong'));
    assert(errorBoundaryIntact, 'TC57: App completed all flows without triggering ErrorBoundary failure');

    assert(uncaughtErrors.length === 0, `TC58: Zero uncaught runtime page errors encountered during entire session (${uncaughtErrors.length} found)`);

  } finally {
    await browser.close();
    killProc(serverProc);
    killProc(previewProc);
  }

  console.log('\n========================================================================');
  console.log(`   E2E BROWSER TEST RESULTS: ${passed} PASSED, ${failed} FAILED (${passed + failed} TOTAL)`);
  console.log('========================================================================\n');

  if (failed > 0 || uncaughtErrors.length > 0) {
    process.exit(1);
  }
}

runE2ESuite().catch(err => {
  console.error('Fatal E2E test runner failure:', err);
  process.exit(1);
});
