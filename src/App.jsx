import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import Topbar from './components/Topbar';
import LoginPage from './pages/LoginPage';
import BillingPage from './pages/BillingPage';
import InvoicesPage from './pages/InvoicesPage';
import ProductsPage from './pages/ProductsPage';
import CustomersPage from './pages/CustomersPage';
import VehiclesPage from './pages/VehiclesPage';
import EmployeesPage from './pages/EmployeesPage';
import SuppliersPage from './pages/SuppliersPage';
import AccountsPage from './pages/AccountsPage';

export default function App() {
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem('jazlan_auth_user');
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      return null;
    }
  });

  const [activePage, setActivePage] = useState('billing');
  const [nextBillNo, setNextBillNo] = useState('JS001');
  const [counts, setCounts] = useState({
    invoices: 0,
    products: 0,
    customers: 0,
    vehicles: 0,
    employees: 0,
    suppliers: 0
  });

  // Guard routes for biller role: strictly limit to billing and invoices
  useEffect(() => {
    if (user?.role === 'biller' && activePage !== 'billing' && activePage !== 'invoices') {
      setActivePage('billing');
    }
  }, [user, activePage]);

  const handleLogout = () => {
    try {
      fetch('/api/auth/logout', { method: 'POST' }).catch(() => {});
    } catch (e) {}
    localStorage.removeItem('jazlan_auth_user');
    localStorage.removeItem('jazlan_auth_token');
    setUser(null);
    setActivePage('billing');
  };

  const fetchGlobalData = async () => {
    try {
      const [nextRes, countsRes] = await Promise.all([
        fetch('/api/bills/next-number').then(r => r.json()).catch(() => ({})),
        fetch('/api/stats/counts').then(r => r.json()).catch(() => ({}))
      ]);

      if (nextRes && nextRes.bill_no) {
        setNextBillNo(nextRes.bill_no);
      }

      if (countsRes) {
        setCounts({
          invoices: Number(countsRes.invoices || 0),
          products: Number(countsRes.products || 0),
          customers: Number(countsRes.customers || 0),
          creditCustomers: Number(countsRes.creditCustomers || 0),
          vehicles: Number(countsRes.vehicles || 0),
          employees: Number(countsRes.employees || 0),
          suppliers: Number(countsRes.suppliers || 0),
          creditSuppliers: Number(countsRes.creditSuppliers || 0)
        });
      }
    } catch (err) {
      console.warn('Sync warning:', err.message);
    }
  };

  useEffect(() => {
    if (user) {
      fetchGlobalData();
    }
  }, [user]);

  const handleBillCreated = () => {
    fetchGlobalData();
  };

  // If user is not authenticated, render Login Page
  if (!user) {
    return <LoginPage onLogin={(loggedUser) => setUser(loggedUser)} />;
  }

  const isBiller = user.role === 'biller';

  return (
    <div className="app-container">
      {/* SIDEBAR NAVIGATION */}
      <Sidebar 
        activePage={activePage} 
        setActivePage={setActivePage} 
        counts={counts}
        currentUser={user}
        onLogout={handleLogout}
      />

      {/* MAIN VIEWPORT */}
      <div className="main-wrapper">
        <Topbar 
          activePage={activePage} 
          setActivePage={setActivePage} 
          onRefresh={fetchGlobalData}
          nextBillNo={nextBillNo}
          currentUser={user}
          onLogout={handleLogout}
        />

        <main>
          {activePage === 'billing' && (
            <BillingPage 
              onBillCreated={handleBillCreated} 
              nextBillNo={nextBillNo}
              currentUser={user}
            />
          )}

          {activePage === 'invoices' && (
            <InvoicesPage 
              onInvoiceUpdated={fetchGlobalData}
              currentUser={user}
            />
          )}

          {/* Admin-only pages */}
          {!isBiller && activePage === 'products' && (
            <ProductsPage 
              onProductUpdated={fetchGlobalData} 
            />
          )}

          {!isBiller && (activePage === 'customers' || activePage === 'credit-customers') && (
            <CustomersPage 
              onCustomerUpdated={fetchGlobalData} 
              initialTab="all"
            />
          )}

          {!isBiller && activePage === 'vehicles' && (
            <VehiclesPage 
              onVehicleUpdated={fetchGlobalData} 
            />
          )}

          {!isBiller && activePage === 'employees' && (
            <EmployeesPage 
              onEmployeeUpdated={fetchGlobalData} 
            />
          )}

          {!isBiller && activePage === 'suppliers' && (
            <SuppliersPage 
              onSupplierUpdated={fetchGlobalData} 
            />
          )}

          {!isBiller && activePage === 'accounts' && (
            <AccountsPage 
              onAccountUpdated={fetchGlobalData} 
            />
          )}
        </main>
      </div>
    </div>
  );
}
