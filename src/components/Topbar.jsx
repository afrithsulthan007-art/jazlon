import React from 'react';
import { PlusCircle, LogOut, ShieldCheck, User } from 'lucide-react';

export default function Topbar({ activePage, setActivePage, nextBillNo, currentUser, onLogout }) {
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

  const isBiller = currentUser?.role === 'biller';

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

      <div className="topbar-actions" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        {activePage !== 'billing' && (
          <button
            className="btn btn-primary btn-sm"
            onClick={() => setActivePage('billing')}
          >
            <PlusCircle size={15} />
            New Bill
          </button>
        )}

        {currentUser && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingLeft: '8px', borderLeft: '1px solid #e2e8f0' }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '4px 10px',
              borderRadius: '6px',
              backgroundColor: isBiller ? '#eff6ff' : '#ecfdf5',
              border: `1px solid ${isBiller ? '#bfdbfe' : '#a7f3d0'}`,
              fontSize: '11.5px',
              fontWeight: 700,
              color: isBiller ? '#1e40af' : '#065f46'
            }}>
              {isBiller ? <User size={13} color="#2563eb" /> : <ShieldCheck size={13} color="#059669" />}
              <span>{currentUser.name || (isBiller ? 'Biller' : 'Admin')}</span>
              <span style={{ opacity: 0.75, fontWeight: 500 }}>({currentUser.email})</span>
            </div>

            {onLogout && (
              <button
                type="button"
                id="btn-topbar-logout"
                onClick={onLogout}
                className="btn btn-outline btn-sm"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  padding: '5px 9px',
                  fontSize: '11.5px',
                  color: '#64748b',
                  borderColor: '#cbd5e1'
                }}
                title="Sign Out"
              >
                <LogOut size={13} />
                <span>Logout</span>
              </button>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
