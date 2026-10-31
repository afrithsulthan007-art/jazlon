import React from 'react';
import { PlusCircle, Search, RefreshCw, Database } from 'lucide-react';

export default function Topbar({ activePage, setActivePage, onRefresh, nextBillNo }) {
  const pageTitles = {
    billing: 'Billing Terminal',
    invoices: 'Invoices & Bills Register',
    products: 'Product Catalog & Pricing Rates',
    customers: 'Customers & Credits (Directory, Dues & Ledgers)',
    'credit-customers': 'Customers & Credits (Directory, Dues & Ledgers)',
    vehicles: 'Fleet & Vehicle Operations',
    employees: 'Employee Management & Payroll',
    suppliers: 'Suppliers & Accounts Payable',
    accounts: 'Accounts, Taxes & Profit Calculations',
  };

  return (
    <header className="topbar">
      <div className="topbar-title">
        <h1 className="page-heading">{pageTitles[activePage] || 'Billing System'}</h1>
        {activePage === 'billing' && nextBillNo && (
          <span className="badge-tag" style={{ backgroundColor: '#ecfdf5', color: '#065f46', border: '1px solid #a7f3d0' }}>
            Next Invoice: <strong>{nextBillNo}</strong>
          </span>
        )}
      </div>

      <div className="topbar-actions">
        {activePage !== 'billing' && (
          <button 
            className="btn btn-primary btn-sm"
            onClick={() => setActivePage('billing')}
          >
            <PlusCircle size={15} />
            New Bill
          </button>
        )}

        <button 
          className="btn btn-secondary btn-sm"
          onClick={onRefresh}
          title="Refresh Data"
        >
          <RefreshCw size={14} />
          Sync
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 12px', backgroundColor: '#f0fdf4', border: '1px solid #d1fae5', borderRadius: '6px', fontSize: '12px', fontWeight: 700, color: '#065f46' }}>
          <Database size={14} color="#059669" />
          <span>Hostinger MySQL</span>
        </div>
      </div>
    </header>
  );
}
