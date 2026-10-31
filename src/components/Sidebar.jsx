import React from 'react';
import { 
  Receipt, 
  FileText, 
  Package, 
  Users, 
  Truck, 
  UserCheck, 
  Building2, 
  PieChart 
} from 'lucide-react';

export default function Sidebar({ activePage, setActivePage, counts = {} }) {
  const menuItems = [
    { id: 'billing', label: 'Billing', icon: Receipt, badge: 'New Bill' },
    { id: 'invoices', label: 'Invoices', icon: FileText, count: counts.invoices },
    { id: 'products', label: 'Products', icon: Package, count: counts.products },
    { id: 'customers', label: 'Customers & Credits', icon: Users, count: counts.customers, badge: counts.creditCustomers > 0 ? `${counts.creditCustomers} Dues` : null },
    { id: 'vehicles', label: 'Vehicles', icon: Truck, count: counts.vehicles },
    { id: 'employees', label: 'Employees', icon: UserCheck, count: counts.employees },
    { id: 'suppliers', label: 'Suppliers', icon: Building2, count: counts.suppliers, badge: counts.creditSuppliers > 0 ? `${counts.creditSuppliers} Dues` : null },
    { id: 'accounts', label: 'Accounts & Profit', icon: PieChart, badge: 'Financials' },
  ];

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <div className="brand-icon">
          <Receipt size={22} />
        </div>
        <div>
          <div className="brand-title">JAZLAN</div>
          <div className="brand-subtitle">Steels & Accounts</div>
        </div>
      </div>

      <nav className="sidebar-nav">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activePage === item.id || (item.id === 'customers' && activePage === 'credit-customers');
          return (
            <button
              key={item.id}
              onClick={() => setActivePage(item.id)}
              className={`nav-link ${isActive ? 'active' : ''}`}
            >
              <Icon size={18} />
              <span>{item.label}</span>
              {item.badge && (
                <span className="nav-badge">
                  {item.badge}
                </span>
              )}
              {item.count !== undefined && item.count > 0 && (
                <span className="nav-badge">{item.count}</span>
              )}
            </button>
          );
        })}
      </nav>

      <div className="sidebar-footer">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#10b981', boxShadow: '0 0 8px rgba(16, 185, 129, 0.6)' }}></div>
          <span style={{ fontWeight: 600, color: '#334155' }}>Hostinger MySQL</span>
        </div>
        <span style={{ fontSize: '11px', color: '#94a3b8' }}>v1.0.0</span>
      </div>
    </aside>
  );
}
