import React, { useState, useEffect } from 'react';
import { 
  Receipt, 
  FileText, 
  Package, 
  Users, 
  Truck, 
  UserCheck, 
  Building2, 
  PieChart,
  Download,
  CheckCircle2,
  Smartphone,
  Monitor,
  X,
  Share2
} from 'lucide-react';

export default function Sidebar({ activePage, setActivePage, counts = {} }) {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [showGuideModal, setShowGuideModal] = useState(false);

  useEffect(() => {
    // Detect standalone / already installed mode
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
    if (isStandalone) {
      setIsInstalled(true);
    }

    // Capture PWA install prompt
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    // Capture successful installation
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const choiceResult = await deferredPrompt.userChoice;
      if (choiceResult.outcome === 'accepted') {
        setIsInstalled(true);
      }
      setDeferredPrompt(null);
    } else {
      // Browser didn't provide direct prompt (e.g. Safari iOS, Desktop Safari, or prompt already dismissed)
      setShowGuideModal(true);
    }
  };

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
      {/* BRAND HEADER */}
      <div className="sidebar-brand">
        <div className="brand-icon">
          <Receipt size={22} />
        </div>
        <div>
          <div className="brand-title">JAZLAN</div>
          <div className="brand-subtitle">Steels & Accounts</div>
        </div>
      </div>

      {/* NAVIGATION ITEMS */}
      <nav className="sidebar-nav">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activePage === item.id || (item.id === 'customers' && activePage === 'credit-customers');
          return (
            <button
              key={item.id}
              data-page={item.id}
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

      {/* PWA INSTALL BUTTON IN SIDE PANEL */}
      <div style={{ padding: '8px 10px', borderTop: '1px solid #edf2ee', backgroundColor: '#ffffff' }}>
        {isInstalled ? (
          <div 
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '8px', 
              padding: '8px 12px', 
              borderRadius: '8px', 
              backgroundColor: '#ecfdf5', 
              border: '1px solid #a7f3d0',
              fontSize: '11.5px',
              fontWeight: 700,
              color: '#065f46'
            }}
          >
            <CheckCircle2 size={16} color="#059669" />
            <div style={{ flex: 1 }}>
              <div>App Installed</div>
              <div style={{ fontSize: '10px', fontWeight: 500, color: '#047857' }}>Running as Desktop / Mobile PWA</div>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={handleInstallClick}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              gap: '9px',
              padding: '9px 12px',
              borderRadius: '8px',
              backgroundColor: '#059669',
              color: '#ffffff',
              border: 'none',
              cursor: 'pointer',
              fontSize: '12px',
              fontWeight: 700,
              boxShadow: '0 2px 6px rgba(5, 150, 105, 0.25)',
              transition: 'all 0.15s ease',
              textAlign: 'left'
            }}
            title="Install JAZLAN as Desktop / Mobile App (PWA)"
          >
            <div style={{
              width: '26px',
              height: '26px',
              borderRadius: '6px',
              backgroundColor: 'rgba(255, 255, 255, 0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}>
              <Download size={15} color="#ffffff" />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ lineHeight: 1.2 }}>Install App (PWA)</div>
              <div style={{ fontSize: '10px', fontWeight: 500, opacity: 0.9 }}>Add to Desktop / Mobile</div>
            </div>
          </button>
        )}
      </div>

      {/* FOOTER */}
      <div className="sidebar-footer" style={{ justifyContent: 'center' }}>
        <span style={{ fontSize: '11px', color: '#94a3b8' }}>v1.0.0 • Progressive Web App</span>
      </div>

      {/* PWA INSTALLATION GUIDE MODAL (IF NATIVE PROMPT IS NOT TRIGGERED AUTOMATICALLY) */}
      {showGuideModal && (
        <div className="modal-overlay" onClick={() => setShowGuideModal(false)} style={{ zIndex: 99999 }}>
          <div 
            className="modal-content" 
            onClick={(e) => e.stopPropagation()}
            style={{ 
              maxWidth: '460px', 
              padding: '22px', 
              borderRadius: '14px', 
              backgroundColor: '#ffffff',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '8px', backgroundColor: '#ecfdf5', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#059669' }}>
                  <Download size={18} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: '#0f172a' }}>Install JAZLAN App</h3>
                  <div style={{ fontSize: '11px', color: '#64748b' }}>Fast access without address bar or browser tabs</div>
                </div>
              </div>
              <button 
                type="button" 
                onClick={() => setShowGuideModal(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', fontSize: '18px' }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '12.5px', color: '#334155' }}>
              <div style={{ padding: '10px 12px', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0', display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                <Monitor size={18} color="#059669" style={{ flexShrink: 0, marginTop: '2px' }} />
                <div>
                  <strong style={{ display: 'block', color: '#0f172a', marginBottom: '2px' }}>Chrome & Edge (PC / Mac):</strong>
                  Look for the <strong>Install icon</strong> in your browser address bar (top-right next to the bookmark star), or click <strong>Menu (⋮) → "Install JAZLAN..."</strong>.
                </div>
              </div>

              <div style={{ padding: '10px 12px', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0', display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                <Smartphone size={18} color="#059669" style={{ flexShrink: 0, marginTop: '2px' }} />
                <div>
                  <strong style={{ display: 'block', color: '#0f172a', marginBottom: '2px' }}>Android (Chrome):</strong>
                  Tap the three dots <strong>(⋮)</strong> in the top-right corner of Chrome, then select <strong>"Install app"</strong> or <strong>"Add to Home screen"</strong>.
                </div>
              </div>

              <div style={{ padding: '10px 12px', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0', display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                <Share2 size={18} color="#059669" style={{ flexShrink: 0, marginTop: '2px' }} />
                <div>
                  <strong style={{ display: 'block', color: '#0f172a', marginBottom: '2px' }}>iPhone & iPad (Safari):</strong>
                  Tap the <strong>Share</strong> button (box with upward arrow) at the bottom toolbar, scroll down, and tap <strong>"Add to Home Screen"</strong>.
                </div>
              </div>
            </div>

            <div style={{ marginTop: '18px', display: 'flex', justifyContent: 'flex-end' }}>
              <button 
                type="button" 
                className="btn btn-primary"
                onClick={() => setShowGuideModal(false)}
                style={{ padding: '7px 18px', fontSize: '12px', fontWeight: 700 }}
              >
                Got It
              </button>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}
