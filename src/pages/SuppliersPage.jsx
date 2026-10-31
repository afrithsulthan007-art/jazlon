import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  Plus, 
  Search, 
  DollarSign, 
  ShoppingCart, 
  Eye, 
  FileText, 
  Phone,
  AlertCircle,
  CreditCard,
  ArrowDownToLine,
  Printer,
  Trash2,
  CheckCircle2,
  Download,
  MapPin,
  Calendar,
  X,
  Package
} from 'lucide-react';

export default function SuppliersPage({ onSupplierUpdated }) {
  const [suppliers, setSuppliers] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState('all'); // 'all' | 'credit'

  // Master-Detail Selection State
  const [selectedSupplierId, setSelectedSupplierId] = useState(null);
  const [supplierDetail, setSupplierDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [activeDetailTab, setActiveDetailTab] = useState('ledger'); // 'ledger' | 'purchases' | 'payments'

  // Add Supplier Modal
  const [showAddSupplier, setShowAddSupplier] = useState(false);
  const [supName, setSupName] = useState('');
  const [supCompany, setSupCompany] = useState('');
  const [supPhone, setSupPhone] = useState('');
  const [supAddress, setSupAddress] = useState('');
  const [supGstin, setSupGstin] = useState('');
  const [supMaterials, setSupMaterials] = useState('');
  const [savingSup, setSavingSup] = useState(false);

  // New Purchase / Material Inward Modal
  const [purchaseSupplier, setPurchaseSupplier] = useState(null);
  const [pProductId, setPProductId] = useState('');
  const [pProduct, setPProduct] = useState('');
  const [pQty, setPQty] = useState('');
  const [pBoughtRate, setPBoughtRate] = useState('');
  const [pVehicleNo, setPVehicleNo] = useState('');
  const [pPaidAmount, setPPaidAmount] = useState('0');
  const [savingPurchase, setSavingPurchase] = useState(false);

  // Pay Supplier Modal (To settle pending supplier credit)
  const [paySupplier, setPaySupplier] = useState(null);
  const [payAmount, setPayAmount] = useState('');
  const [payDate, setPayDate] = useState(new Date().toISOString().split('T')[0]);
  const [payMode, setPayMode] = useState('Bank Transfer');
  const [payRef, setPayRef] = useState('');
  const [payNotes, setPayNotes] = useState('');
  const [savingPay, setSavingPay] = useState(false);

  const fetchSuppliersAndProducts = async (preserveSelectedId = null) => {
    try {
      setLoading(true);
      const [sRes, pRes] = await Promise.all([
        fetch('/api/suppliers').then(r => r.json()),
        fetch('/api/products').then(r => r.json()).catch(() => [])
      ]);
      const list = Array.isArray(sRes) ? sRes : [];
      setSuppliers(list);
      setProducts(pRes || []);

      if (list.length > 0) {
        const sorted = [...list].sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
        const targetId = preserveSelectedId || selectedSupplierId || sorted[0].id;
        const exists = sorted.find(s => s.id === targetId);
        const finalId = exists ? exists.id : sorted[0].id;
        setSelectedSupplierId(finalId);
        loadSupplierDetail(finalId);
      } else {
        setSelectedSupplierId(null);
        setSupplierDetail(null);
      }
    } catch (err) {
      console.error('Error fetching suppliers:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadSupplierDetail = async (id) => {
    if (!id) return;
    try {
      setDetailLoading(true);
      const res = await fetch(`/api/suppliers/${id}`);
      const data = await res.json();
      setSupplierDetail(data);
    } catch (err) {
      console.error('Error loading supplier detail:', err);
    } finally {
      setDetailLoading(false);
    }
  };

  useEffect(() => {
    fetchSuppliersAndProducts();
  }, []);

  const handleSelectSupplier = (id) => {
    setSelectedSupplierId(id);
    loadSupplierDetail(id);
  };

  const handleAddSupplier = async (e) => {
    e.preventDefault();
    if (!supName.trim()) return;

    try {
      setSavingSup(true);
      const res = await fetch('/api/suppliers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: supName.trim(),
          company_name: supCompany.trim(),
          phone: supPhone.trim(),
          address: supAddress.trim(),
          gstin: supGstin.trim(),
          materials_supplied: supMaterials.trim()
        })
      });

      if (!res.ok) throw new Error('Failed to add supplier');
      const created = await res.json();

      setShowAddSupplier(false);
      setSupName('');
      setSupCompany('');
      setSupPhone('');
      setSupAddress('');
      setSupGstin('');
      setSupMaterials('');
      fetchSuppliersAndProducts(created.id);
      if (onSupplierUpdated) onSupplierUpdated();
    } catch (err) {
      alert(err.message);
    } finally {
      setSavingSup(false);
    }
  };

  const handleOpenPurchase = (sup) => {
    setPurchaseSupplier(sup);
    if (products.length > 0) {
      setPProductId(products[0].id);
      setPProduct(products[0].name);
      setPBoughtRate(products[0].default_bought_rate || 550);
    } else {
      setPProductId('');
      setPProduct('Fe550D TMT Rebars 12mm');
      setPBoughtRate(550);
    }
    setPQty('');
    setPVehicleNo('');
    setPPaidAmount('0');
  };

  const handleSavePurchase = async (e) => {
    e.preventDefault();
    const qNum = Number(pQty);
    if (!qNum || qNum <= 0) {
      alert('Please enter a valid quantity.');
      return;
    }

    try {
      setSavingPurchase(true);
      const res = await fetch(`/api/suppliers/${purchaseSupplier.id}/purchases`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product_id: pProductId || null,
          product_name: pProduct,
          quantity: qNum,
          unit: 'Tons',
          bought_price_per_unit: Number(pBoughtRate || 0),
          total_amount: pTotalVal,
          paid_amount: Number(pPaidAmount || 0),
          vehicle_number: pVehicleNo.trim().toUpperCase(),
          notes: pVehicleNo ? `Vehicle: ${pVehicleNo.trim().toUpperCase()}` : ''
        })
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to record purchase');
      }

      const activeSupId = purchaseSupplier.id;
      setPurchaseSupplier(null);
      fetchSuppliersAndProducts(activeSupId);
      loadSupplierDetail(activeSupId);
      if (onSupplierUpdated) onSupplierUpdated();
    } catch (err) {
      alert(err.message);
    } finally {
      setSavingPurchase(false);
    }
  };

  const handleOpenPay = (sup) => {
    setPaySupplier(sup);
    setPayAmount(sup.pending_credit || '');
    setPayDate(new Date().toISOString().split('T')[0]);
    setPayMode('Bank Transfer');
    setPayRef('');
    setPayNotes(`Payment settlement to ${sup.name}`);
  };

  const handlePaySupplierSubmit = async (e) => {
    e.preventDefault();
    if (!payAmount || Number(payAmount) <= 0) return;

    try {
      setSavingPay(true);
      const res = await fetch(`/api/suppliers/${paySupplier.id}/pay`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: Number(payAmount),
          date: payDate,
          payment_mode: payMode,
          reference_no: payRef,
          notes: payNotes || `Payment to settle supplier credit`
        })
      });

      if (!res.ok) throw new Error('Payment to supplier failed');

      const activeSupId = paySupplier.id;
      setPaySupplier(null);
      fetchSuppliersAndProducts(activeSupId);
      loadSupplierDetail(activeSupId);
      if (onSupplierUpdated) onSupplierUpdated();
    } catch (err) {
      alert(err.message);
    } finally {
      setSavingPay(false);
    }
  };

  const handleDeletePurchase = async (purchaseId) => {
    if (!window.confirm('Are you sure you want to cancel and delete this inward purchase? It will deduct the stock from inventory and reverse the credit balance.')) {
      return;
    }

    try {
      const res = await fetch(`/api/suppliers/purchases/${purchaseId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to cancel purchase');

      if (selectedSupplierId) {
        loadSupplierDetail(selectedSupplierId);
      }
      fetchSuppliersAndProducts(selectedSupplierId);
      if (onSupplierUpdated) onSupplierUpdated();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDeleteSupplier = async (sup, e) => {
    if (e) e.stopPropagation();
    if (!window.confirm(`Are you sure you want to remove supplier "${sup.name}"? This will also remove their inward purchases and payment entries.`)) {
      return;
    }

    try {
      const res = await fetch(`/api/suppliers/${sup.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete supplier');

      fetchSuppliersAndProducts();
      if (onSupplierUpdated) onSupplierUpdated();
    } catch (err) {
      alert(err.message);
    }
  };

  const handlePrintStatement = () => {
    window.print();
  };

  // Download CSV Export
  const handleDownloadCSV = () => {
    if (suppliers.length === 0) return;
    const headers = ['Supplier Name', 'Company Name', 'Phone', 'Address', 'GSTIN', 'Materials Supplied', 'Total Purchases (₹)', 'Amount Paid (₹)', 'Pending Credit (₹)', 'Status'];
    const rows = suppliers.map(s => [
      `"${s.name.replace(/"/g, '""')}"`,
      `"${(s.company_name || '').replace(/"/g, '""')}"`,
      `"${s.phone || ''}"`,
      `"${(s.address || '').replace(/"/g, '""')}"`,
      `"${s.gstin || ''}"`,
      `"${(s.materials_supplied || '').replace(/"/g, '""')}"`,
      s.total_purchases || 0,
      s.total_paid || 0,
      s.pending_credit || 0,
      (s.pending_credit || 0) > 0 ? 'Credit' : 'Settled'
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `suppliers_directory_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Tab Filtering
  const listToFilter = activeTab === 'credit'
    ? suppliers.filter(s => (s.pending_credit || 0) > 0)
    : suppliers;

  const filtered = listToFilter
    .filter(s => 
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      (s.company_name && s.company_name.toLowerCase().includes(search.toLowerCase())) ||
      (s.materials_supplied && s.materials_supplied.toLowerCase().includes(search.toLowerCase())) ||
      (s.phone && s.phone.includes(search))
    )
    .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));

  const totalPurchases = suppliers.reduce((s, sup) => s + (sup.total_purchases || 0), 0);
  const totalPaid = suppliers.reduce((s, sup) => s + (sup.total_paid || 0), 0);
  const totalPendingSupplierCredit = suppliers.reduce((s, sup) => s + (sup.pending_credit || 0), 0);
  const creditSuppliersCount = suppliers.filter(s => (s.pending_credit || 0) > 0).length;

  const selectedSupplier = supplierDetail?.supplier || suppliers.find(s => s.id === selectedSupplierId);

  // Live Purchase Calculations in Modal
  const pSubtotal = Number(pQty || 0) * Number(pBoughtRate || 0);
  const pTotalVal = Math.round(pSubtotal);
  const pBalanceVal = Math.max(0, pTotalVal - Number(pPaidAmount || 0));

  // Combine chronological ledger items
  const ledgerEntries = [];
  if (supplierDetail) {
    if (supplierDetail.supplier && (supplierDetail.supplier.total_purchases > 0 || supplierDetail.supplier.pending_credit > 0) && (!supplierDetail.purchases || supplierDetail.purchases.length === 0)) {
      ledgerEntries.push({
        id: `opening-${supplierDetail.supplier.id}`,
        date: supplierDetail.supplier.created_at ? supplierDetail.supplier.created_at.split(' ')[0] : 'Opening',
        type: 'OPENING',
        ref: 'OPENING-BALANCE',
        particulars: 'Opening Material Inward & Supplier Credit Dues',
        debit: supplierDetail.supplier.total_purchases || 0,
        credit: supplierDetail.supplier.total_paid || 0
      });
    }

    if (supplierDetail.purchases) {
      supplierDetail.purchases.forEach(p => {
        ledgerEntries.push({
          id: `pur-${p.id}`,
          date: p.purchase_date,
          type: 'PURCHASE',
          ref: p.invoice_no,
          particulars: `${p.product_name} (${p.quantity} ${p.unit} @ ₹${p.bought_price_per_unit || 0})${p.notes ? ` • ${p.notes}` : ''}`,
          debit: p.total_amount,
          credit: p.paid_amount || 0,
          purchaseId: p.id
        });
      });
    }

    if (supplierDetail.payments) {
      supplierDetail.payments.forEach(pay => {
        ledgerEntries.push({
          id: `pay-${pay.id}`,
          date: pay.date,
          type: 'PAYMENT',
          ref: pay.reference_no || 'Direct Pay',
          particulars: `Payment via ${pay.payment_mode}${pay.notes ? ` • ${pay.notes}` : ''}`,
          debit: 0,
          credit: pay.amount
        });
      });
    }

    // Sort chronologically (oldest to newest)
    ledgerEntries.sort((a, b) => new Date(a.date) - new Date(b.date));

    // Calculate running balance (Liability to supplier)
    let runningBalance = 0;
    ledgerEntries.forEach(item => {
      runningBalance += (item.debit - item.credit);
      item.runningBalance = runningBalance;
    });

    // Reverse to show newest first in statement table
    ledgerEntries.reverse();
  }

  return (
    <div className="page-content" style={{ maxWidth: '1440px', margin: '0 auto', padding: '16px' }}>
      
      {/* STATS CARDS */}
      <div className="stats-grid" style={{ marginBottom: '16px' }}>
        <div className="stat-card" style={{ borderLeft: '4px solid #059669' }}>
          <div className="stat-label">Total Suppliers / Mills</div>
          <div className="stat-value">{suppliers.length}</div>
          <div className="stat-subtitle">Registered manufacturers & stockists</div>
        </div>

        <div className="stat-card" style={{ borderLeft: '4px solid #059669' }}>
          <div className="stat-label">Total Raw Material Purchased</div>
          <div className="stat-value" style={{ color: '#059669' }}>
            ₹{totalPurchases.toLocaleString('en-IN')}
          </div>
          <div className="stat-subtitle">Cumulative inward bought goods</div>
        </div>

        <div className="stat-card" style={{ borderLeft: '4px solid #10b981' }}>
          <div className="stat-label">Total Paid to Suppliers</div>
          <div className="stat-value" style={{ color: '#10b981' }}>
            ₹{totalPaid.toLocaleString('en-IN')}
          </div>
          <div className="stat-subtitle">Paid upfront & bank settlements</div>
        </div>

        <div className="stat-card" style={{ borderLeft: '4px solid #b91c1c', backgroundColor: '#fef2f2' }}>
          <div className="stat-label" style={{ color: '#991b1b' }}>Supplier Credits (Pending Liability)</div>
          <div className="stat-value" style={{ color: '#b91c1c' }}>
            ₹{totalPendingSupplierCredit.toLocaleString('en-IN')}
          </div>
          <div className="stat-subtitle" style={{ color: '#991b1b', fontWeight: 700 }}>
            {creditSuppliersCount} suppliers with outstanding credit
          </div>
        </div>
      </div>

      {/* ACTION BAR: TABS, SEARCH, ADD SUPPLIER, DOWNLOAD CSV */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        gap: '12px', 
        marginBottom: '16px',
        flexWrap: 'wrap'
      }}>
        {/* TABS: ALL vs CREDIT SUPPLIERS */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            type="button"
            className={`btn btn-sm ${activeTab === 'all' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ 
              backgroundColor: activeTab === 'all' ? '#059669' : '#ffffff',
              borderColor: activeTab === 'all' ? '#047857' : '#cbd5e1',
              color: activeTab === 'all' ? '#ffffff' : '#0f172a',
              padding: '8px 16px',
              fontSize: '13px'
            }}
            onClick={() => setActiveTab('all')}
          >
            <Building2 size={15} />
            All Suppliers ({suppliers.length})
          </button>

          <button
            type="button"
            className={`btn btn-sm ${activeTab === 'credit' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ 
              backgroundColor: activeTab === 'credit' ? '#b91c1c' : '#ffffff',
              borderColor: activeTab === 'credit' ? '#991b1b' : '#cbd5e1',
              color: activeTab === 'credit' ? '#ffffff' : '#b91c1c',
              padding: '8px 16px',
              fontSize: '13px',
              fontWeight: 800
            }}
            onClick={() => setActiveTab('credit')}
          >
            <CreditCard size={15} />
            Credit Suppliers (Pending Dues) • {creditSuppliersCount}
          </button>
        </div>

        {/* SEARCH, ADD SUPPLIER, DOWNLOAD CSV */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ position: 'relative', width: '280px' }}>
            <Search size={15} color="#94a3b8" style={{ position: 'absolute', left: '12px', top: '10px' }} />
            <input
              type="text"
              className="form-input"
              placeholder="Search supplier, mill, material..."
              style={{ 
                paddingLeft: '34px', 
                height: '36px', 
                fontSize: '13px', 
                borderRadius: '8px', 
                border: '1.5px solid #cbd5e1' 
              }}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <button 
            type="button"
            className="btn btn-primary" 
            style={{ 
              height: '36px', 
              padding: '0 16px', 
              fontSize: '13px', 
              fontWeight: 700, 
              borderRadius: '8px',
              backgroundColor: '#059669',
              borderColor: '#047857',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              whiteSpace: 'nowrap'
            }}
            onClick={() => setShowAddSupplier(true)}
          >
            <Plus size={15} />
            Add Supplier
          </button>

          <button
            type="button"
            onClick={handleDownloadCSV}
            style={{
              height: '36px',
              padding: '0 14px',
              fontSize: '12.5px',
              fontWeight: 700,
              borderRadius: '8px',
              border: '1.5px solid #cbd5e1',
              backgroundColor: '#ffffff',
              color: '#059669',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              cursor: 'pointer'
            }}
          >
            <Download size={14} />
            Download CSV
          </button>
        </div>
      </div>

      {/* MASTER-DETAIL SPLIT VIEW (LEFT: SUPPLIER LIST, RIGHT: DETAILED STATEMENT) */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: '320px 1fr', 
        gap: '16px', 
        alignItems: 'start' 
      }}>
        
        {/* LEFT COLUMN: SUPPLIER LIST */}
        <div style={{ 
          display: 'flex', 
          flexDirection: 'column', 
          gap: '10px', 
          maxHeight: 'calc(100vh - 280px)', 
          overflowY: 'auto',
          paddingRight: '4px' 
        }}>
          {filtered.length === 0 ? (
            <div style={{ 
              backgroundColor: '#ffffff', 
              borderRadius: '10px', 
              border: '1px solid #e2e8f0', 
              padding: '28px', 
              textAlign: 'center', 
              color: '#94a3b8', 
              fontSize: '13px' 
            }}>
              {loading ? 'Loading suppliers...' : 'No suppliers match your search.'}
            </div>
          ) : (
            filtered.map(sup => {
              const isSelected = sup.id === selectedSupplierId;
              const hasCredit = (sup.pending_credit || 0) > 0;

              return (
                <div
                  key={sup.id}
                  onClick={() => handleSelectSupplier(sup.id)}
                  style={{
                    backgroundColor: '#ffffff',
                    borderRadius: '10px',
                    border: isSelected ? '2px solid #059669' : '1px solid #e2e8f0',
                    padding: '14px 16px',
                    cursor: 'pointer',
                    boxShadow: isSelected ? '0 4px 12px rgba(5, 150, 105, 0.15)' : 'none',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ fontWeight: 800, fontSize: '14px', color: '#0f172a' }}>
                      {sup.name}
                    </div>
                    <span style={{
                      fontSize: '11px',
                      fontWeight: 700,
                      padding: '2px 8px',
                      borderRadius: '4px',
                      backgroundColor: hasCredit ? '#fef2f2' : '#ecfdf5',
                      color: hasCredit ? '#dc2626' : '#047857'
                    }}>
                      {hasCredit ? 'Credit' : 'Settled'}
                    </span>
                  </div>

                  <div style={{ fontSize: '11.5px', color: '#64748b', marginTop: '2px' }}>
                    {sup.company_name || 'Manufacturer / Stockist'}
                  </div>

                  {sup.materials_supplied && (
                    <div style={{ marginTop: '5px' }}>
                      <span style={{
                        padding: '2px 6px',
                        backgroundColor: '#f1f5f9',
                        color: '#334155',
                        borderRadius: '4px',
                        fontSize: '10.5px',
                        fontWeight: 600
                      }}>
                        {sup.materials_supplied}
                      </span>
                    </div>
                  )}

                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11.5px', color: '#64748b', marginTop: '6px' }}>
                    <span>Phone: {sup.phone || '—'}</span>
                    <span>Orders: <strong>{sup.total_purchase_orders || 0}</strong></span>
                  </div>

                  {sup.address && (
                    <div style={{ fontSize: '11px', color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '3px' }}>
                      <MapPin size={11} color="#94a3b8" />
                      <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{sup.address}</span>
                    </div>
                  )}

                  <div style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center', 
                    marginTop: '10px',
                    paddingTop: '8px',
                    borderTop: '1px solid #f1f5f9'
                  }}>
                    <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>Supplier Credit:</span>
                    <span style={{ 
                      fontSize: '15px', 
                      fontWeight: 900, 
                      color: hasCredit ? '#dc2626' : '#16a34a', 
                      fontFamily: 'monospace' 
                    }}>
                      ₹ {(sup.pending_credit || 0).toLocaleString('en-IN')}
                    </span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px', paddingTop: '6px' }}>
                    <div style={{ display: 'flex', gap: '4px' }}>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); handleOpenPurchase(sup); }}
                        style={{
                          backgroundColor: '#ecfdf5',
                          border: '1px solid #a7f3d0',
                          color: '#065f46',
                          fontSize: '10.5px',
                          fontWeight: 700,
                          borderRadius: '4px',
                          padding: '2px 7px',
                          cursor: 'pointer'
                        }}
                      >
                        + Stock In
                      </button>
                      {hasCredit && (
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); handleOpenPay(sup); }}
                          style={{
                            backgroundColor: '#fef2f2',
                            border: '1px solid #fecaca',
                            color: '#b91c1c',
                            fontSize: '10.5px',
                            fontWeight: 700,
                            borderRadius: '4px',
                            padding: '2px 7px',
                            cursor: 'pointer'
                          }}
                        >
                          Pay Credit
                        </button>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={(e) => handleDeleteSupplier(sup, e)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#ef4444',
                        fontSize: '11px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '3px',
                        padding: '2px 4px'
                      }}
                    >
                      <Trash2 size={12} />
                      Remove
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* RIGHT COLUMN: SELECTED SUPPLIER DETAILS & RUNNING LEDGER */}
        <div style={{ 
          backgroundColor: '#ffffff', 
          borderRadius: '12px', 
          border: '1px solid #e2e8f0', 
          padding: '20px 24px',
          minHeight: '480px'
        }}>
          {!selectedSupplier ? (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: '#94a3b8' }}>
              <Building2 size={36} color="#cbd5e1" style={{ margin: '0 auto 12px' }} />
              <div style={{ fontSize: '15px', fontWeight: 700, color: '#64748b' }}>No Supplier Selected</div>
              <div style={{ fontSize: '12.5px', marginTop: '4px' }}>Select a supplier from the left list to view inward material purchases and account statement.</div>
            </div>
          ) : (
            <div>
              {/* SUPPLIER HEADER & ACTIONS */}
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'flex-start', 
                flexWrap: 'wrap', 
                gap: '16px',
                paddingBottom: '16px',
                borderBottom: '1px solid #f1f5f9'
              }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <h2 style={{ fontSize: '20px', fontWeight: 900, color: '#0f172a', margin: 0 }}>
                      {selectedSupplier.name}
                    </h2>
                    <span style={{
                      fontSize: '11px',
                      fontWeight: 700,
                      padding: '2px 8px',
                      borderRadius: '4px',
                      backgroundColor: (selectedSupplier.pending_credit || 0) > 0 ? '#fef2f2' : '#ecfdf5',
                      color: (selectedSupplier.pending_credit || 0) > 0 ? '#dc2626' : '#047857'
                    }}>
                      {(selectedSupplier.pending_credit || 0) > 0 ? 'Credit Dues' : 'Settled'}
                    </span>
                  </div>
                  <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
                    {selectedSupplier.company_name && <strong>{selectedSupplier.company_name} • </strong>}
                    Phone: <strong>{selectedSupplier.phone || '—'}</strong>
                    {selectedSupplier.address && <> • Yard/Works: <strong>{selectedSupplier.address}</strong></>}
                    {selectedSupplier.gstin && <> • GSTIN: <strong className="font-mono">{selectedSupplier.gstin}</strong></>}
                    {selectedSupplier.materials_supplied && <> • Materials: <strong>{selectedSupplier.materials_supplied}</strong></>}
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748b' }}>Pending Supplier Credit</div>
                    <div style={{ 
                      fontSize: '22px', 
                      fontWeight: 900, 
                      color: (selectedSupplier.pending_credit || 0) > 0 ? '#dc2626' : '#16a34a', 
                      fontFamily: 'monospace' 
                    }}>
                      ₹ {(selectedSupplier.pending_credit || 0).toLocaleString('en-IN')}
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      onClick={() => handleOpenPurchase(selectedSupplier)}
                      style={{
                        height: '34px',
                        padding: '0 12px',
                        fontSize: '12px',
                        fontWeight: 700,
                        borderRadius: '6px',
                        border: 'none',
                        backgroundColor: '#059669',
                        color: '#ffffff',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '5px',
                        cursor: 'pointer',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      <Plus size={14} />
                      + Stock In (Purchase)
                    </button>

                    <button
                      type="button"
                      onClick={() => handleOpenPay(selectedSupplier)}
                      style={{
                        height: '34px',
                        padding: '0 12px',
                        fontSize: '12px',
                        fontWeight: 700,
                        borderRadius: '6px',
                        border: 'none',
                        backgroundColor: '#dc2626',
                        color: '#ffffff',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '5px',
                        cursor: 'pointer',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      <DollarSign size={14} />
                      + Pay Supplier Credit
                    </button>

                    <button
                      type="button"
                      onClick={handlePrintStatement}
                      style={{
                        height: '34px',
                        padding: '0 10px',
                        fontSize: '12px',
                        fontWeight: 700,
                        borderRadius: '6px',
                        border: '1.5px solid #cbd5e1',
                        backgroundColor: '#ffffff',
                        color: '#334155',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        cursor: 'pointer'
                      }}
                      title="Print Supplier Statement"
                    >
                      <Printer size={13} />
                      Print
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDeleteSupplier(selectedSupplier)}
                      style={{
                        height: '34px',
                        padding: '0 10px',
                        fontSize: '12px',
                        fontWeight: 700,
                        borderRadius: '6px',
                        border: '1px solid #fecaca',
                        backgroundColor: '#ffffff',
                        color: '#dc2626',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        cursor: 'pointer'
                      }}
                    >
                      <Trash2 size={13} />
                      Remove
                    </button>
                  </div>
                </div>
              </div>

              {/* LIFETIME METRICS TILES */}
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(3, 1fr)', 
                gap: '12px', 
                marginTop: '16px',
                marginBottom: '20px'
              }}>
                <div style={{ backgroundColor: '#f8fafc', padding: '10px 14px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Total Purchases</div>
                  <div style={{ fontSize: '18px', fontWeight: 900, color: '#0f172a', fontFamily: 'monospace', marginTop: '2px' }}>
                    ₹ {(selectedSupplier.total_purchases || 0).toLocaleString('en-IN')}
                  </div>
                </div>

                <div style={{ backgroundColor: '#f0fdf4', padding: '10px 14px', borderRadius: '8px', border: '1px solid #bbf7d0' }}>
                  <div style={{ fontSize: '11px', fontWeight: 700, color: '#16a34a', textTransform: 'uppercase' }}>Total Paid to Supplier</div>
                  <div style={{ fontSize: '18px', fontWeight: 900, color: '#15803d', fontFamily: 'monospace', marginTop: '2px' }}>
                    ₹ {(selectedSupplier.total_paid || 0).toLocaleString('en-IN')}
                  </div>
                </div>

                <div style={{ 
                  backgroundColor: (selectedSupplier.pending_credit || 0) > 0 ? '#fef2f2' : '#f0fdf4', 
                  padding: '10px 14px', 
                  borderRadius: '8px', 
                  border: `1px solid ${(selectedSupplier.pending_credit || 0) > 0 ? '#fecaca' : '#bbf7d0'}` 
                }}>
                  <div style={{ 
                    fontSize: '11px', 
                    fontWeight: 700, 
                    color: (selectedSupplier.pending_credit || 0) > 0 ? '#dc2626' : '#16a34a', 
                    textTransform: 'uppercase' 
                  }}>
                    Pending Supplier Credit
                  </div>
                  <div style={{ 
                    fontSize: '18px', 
                    fontWeight: 900, 
                    color: (selectedSupplier.pending_credit || 0) > 0 ? '#dc2626' : '#15803d', 
                    fontFamily: 'monospace', 
                    marginTop: '2px' 
                  }}>
                    ₹ {(selectedSupplier.pending_credit || 0).toLocaleString('en-IN')}
                  </div>
                </div>
              </div>

              {/* DETAIL SUB-TABS: STATEMENT vs PURCHASES vs PAYMENTS */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px', borderBottom: '1px solid #e2e8f0', paddingBottom: '8px' }}>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {[
                    { id: 'ledger', label: `Statement / Running Ledger (${ledgerEntries.length})` },
                    { id: 'purchases', label: `Inward Stock Invoices (${supplierDetail?.purchases?.length || 0})` },
                    { id: 'payments', label: `Payment Settlements (${supplierDetail?.payments?.length || 0})` }
                  ].map(tab => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setActiveDetailTab(tab.id)}
                      style={{
                        border: 'none',
                        background: activeDetailTab === tab.id ? '#ecfdf5' : 'transparent',
                        color: activeDetailTab === tab.id ? '#059669' : '#64748b',
                        fontSize: '12.5px',
                        fontWeight: activeDetailTab === tab.id ? 800 : 600,
                        padding: '5px 12px',
                        borderRadius: '6px',
                        cursor: 'pointer'
                      }}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* SUB-TAB 1: STATEMENT / RUNNING LEDGER */}
              {activeDetailTab === 'ledger' && (
                <div>
                  <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12.5px' }}>
                      <thead>
                        <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                          <th style={{ textAlign: 'left', padding: '10px 14px', fontWeight: 700, color: '#475569' }}>Date</th>
                          <th style={{ textAlign: 'left', padding: '10px 14px', fontWeight: 700, color: '#475569' }}>Ref / Particulars</th>
                          <th style={{ textAlign: 'right', padding: '10px 14px', fontWeight: 700, color: '#475569' }}>Inward Bill (Debit)</th>
                          <th style={{ textAlign: 'right', padding: '10px 14px', fontWeight: 700, color: '#475569' }}>Paid (Credit)</th>
                          <th style={{ textAlign: 'right', padding: '10px 14px', fontWeight: 700, color: '#475569' }}>Balance Due</th>
                        </tr>
                      </thead>
                      <tbody>
                        {detailLoading ? (
                          <tr>
                            <td colSpan="5" style={{ textAlign: 'center', padding: '36px', color: '#94a3b8' }}>
                              Loading account statement...
                            </td>
                          </tr>
                        ) : ledgerEntries.length === 0 ? (
                          <tr>
                            <td colSpan="5" style={{ textAlign: 'center', padding: '36px', color: '#94a3b8' }}>
                              No purchases or payments recorded yet for this supplier.
                            </td>
                          </tr>
                        ) : (
                          ledgerEntries.map((row) => (
                            <tr key={row.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                              <td style={{ padding: '10px 14px', whiteSpace: 'nowrap', color: '#334155', fontWeight: 600 }}>
                                {row.date}
                              </td>
                              <td style={{ padding: '10px 14px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                                  <span style={{
                                    fontSize: '10.5px',
                                    fontWeight: 800,
                                    fontFamily: 'monospace',
                                    padding: '2px 6px',
                                    borderRadius: '4px',
                                    backgroundColor: row.type === 'PURCHASE' ? '#ecfdf5' : '#f0fdf4',
                                    color: row.type === 'PURCHASE' ? '#047857' : '#15803d'
                                  }}>
                                    {row.type}
                                  </span>
                                  <strong style={{ color: '#0f172a', fontSize: '12px' }}>{row.ref}</strong>
                                </div>
                                <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                                  {row.particulars}
                                </div>
                              </td>
                              <td style={{ textAlign: 'right', padding: '10px 14px', fontWeight: 700, color: row.debit > 0 ? '#dc2626' : '#94a3b8', fontFamily: 'monospace' }}>
                                {row.debit > 0 ? `₹ ${row.debit.toLocaleString('en-IN')}` : '—'}
                              </td>
                              <td style={{ textAlign: 'right', padding: '10px 14px', fontWeight: 700, color: row.credit > 0 ? '#15803d' : '#94a3b8', fontFamily: 'monospace' }}>
                                {row.credit > 0 ? `₹ ${row.credit.toLocaleString('en-IN')}` : '—'}
                              </td>
                              <td style={{ 
                                textAlign: 'right', 
                                padding: '10px 14px', 
                                fontWeight: 900, 
                                color: row.runningBalance > 0 ? '#dc2626' : '#15803d', 
                                fontFamily: 'monospace' 
                              }}>
                                ₹ {row.runningBalance.toLocaleString('en-IN')}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* SUB-TAB 2: INWARD PURCHASES TABLE */}
              {activeDetailTab === 'purchases' && (
                <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                    <thead>
                      <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                        <th style={{ textAlign: 'left', padding: '9px 12px', fontWeight: 700, color: '#475569' }}>Date</th>
                        <th style={{ textAlign: 'left', padding: '9px 12px', fontWeight: 700, color: '#475569' }}>Invoice No</th>
                        <th style={{ textAlign: 'left', padding: '9px 12px', fontWeight: 700, color: '#475569' }}>Material & Qty</th>
                        <th style={{ textAlign: 'right', padding: '9px 12px', fontWeight: 700, color: '#475569' }}>Total (₹)</th>
                        <th style={{ textAlign: 'right', padding: '9px 12px', fontWeight: 700, color: '#475569' }}>Paid (₹)</th>
                        <th style={{ textAlign: 'right', padding: '9px 12px', fontWeight: 700, color: '#475569' }}>Balance (Credit)</th>
                        <th style={{ textAlign: 'center', padding: '9px 12px', fontWeight: 700, color: '#475569' }}>Status</th>
                        <th style={{ textAlign: 'center', padding: '9px 12px', fontWeight: 700, color: '#475569' }}>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {supplierDetail?.purchases?.length === 0 ? (
                        <tr><td colSpan="8" style={{ textAlign: 'center', padding: '30px', color: '#94a3b8' }}>No purchase records found.</td></tr>
                      ) : (
                        supplierDetail?.purchases?.map(p => (
                          <tr key={p.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                            <td style={{ padding: '9px 12px', whiteSpace: 'nowrap' }}>{p.purchase_date}</td>
                            <td style={{ padding: '9px 12px', fontFamily: 'monospace', fontWeight: 700 }}>{p.invoice_no}</td>
                            <td style={{ padding: '9px 12px' }}>{p.product_name} ({p.quantity} {p.unit})</td>
                            <td style={{ padding: '9px 12px', textAlign: 'right', fontWeight: 800 }}>₹{p.total_amount.toLocaleString('en-IN')}</td>
                            <td style={{ padding: '9px 12px', textAlign: 'right', color: '#15803d', fontWeight: 700 }}>₹{p.paid_amount.toLocaleString('en-IN')}</td>
                            <td style={{ padding: '9px 12px', textAlign: 'right', color: p.balance_due > 0 ? '#dc2626' : '#15803d', fontWeight: 800 }}>
                              ₹{(p.balance_due || 0).toLocaleString('en-IN')}
                            </td>
                            <td style={{ padding: '9px 12px', textAlign: 'center' }}>
                              <span style={{
                                padding: '2px 7px',
                                borderRadius: '4px',
                                fontSize: '10.5px',
                                fontWeight: 700,
                                backgroundColor: p.payment_status === 'Paid' ? '#ecfdf5' : '#fef2f2',
                                color: p.payment_status === 'Paid' ? '#047857' : '#dc2626'
                              }}>
                                {p.payment_status}
                              </span>
                            </td>
                            <td style={{ padding: '9px 12px', textAlign: 'center' }}>
                              <button 
                                onClick={() => handleDeletePurchase(p.id)}
                                title="Cancel and reverse this purchase"
                                style={{
                                  border: 'none',
                                  background: 'none',
                                  color: '#ef4444',
                                  cursor: 'pointer',
                                  padding: '2px 4px'
                                }}
                              >
                                <Trash2 size={13} />
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              )}

              {/* SUB-TAB 3: PAYMENTS TABLE */}
              {activeDetailTab === 'payments' && (
                <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                    <thead>
                      <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                        <th style={{ textAlign: 'left', padding: '9px 12px', fontWeight: 700, color: '#475569' }}>Date</th>
                        <th style={{ textAlign: 'left', padding: '9px 12px', fontWeight: 700, color: '#475569' }}>Payment Mode</th>
                        <th style={{ textAlign: 'left', padding: '9px 12px', fontWeight: 700, color: '#475569' }}>Reference / UTR</th>
                        <th style={{ textAlign: 'left', padding: '9px 12px', fontWeight: 700, color: '#475569' }}>Notes</th>
                        <th style={{ textAlign: 'right', padding: '9px 12px', fontWeight: 700, color: '#475569' }}>Amount Paid (₹)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {supplierDetail?.payments?.length === 0 ? (
                        <tr><td colSpan="5" style={{ textAlign: 'center', padding: '30px', color: '#94a3b8' }}>No payment records logged yet.</td></tr>
                      ) : (
                        supplierDetail?.payments?.map(pay => (
                          <tr key={pay.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                            <td style={{ padding: '9px 12px', whiteSpace: 'nowrap' }}>{pay.date}</td>
                            <td style={{ padding: '9px 12px' }}>{pay.payment_mode}</td>
                            <td style={{ padding: '9px 12px', fontFamily: 'monospace' }}>{pay.reference_no || 'Direct'}</td>
                            <td style={{ padding: '9px 12px', color: '#64748b' }}>{pay.notes || '—'}</td>
                            <td style={{ padding: '9px 12px', textAlign: 'right', fontWeight: 800, color: '#15803d' }}>
                              ₹{pay.amount.toLocaleString('en-IN')}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              )}

            </div>
          )}
        </div>

      </div>

      {/* MODAL 1: ADD SUPPLIER */}
      {showAddSupplier && (
        <div className="modal-overlay" style={{ backdropFilter: 'blur(3px)', backgroundColor: 'rgba(15, 23, 42, 0.45)' }} onClick={() => setShowAddSupplier(false)}>
          <div className="modal-content" style={{ maxWidth: '440px', borderRadius: '12px', padding: '24px' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Building2 size={18} color="#059669" />
                <h2 style={{ fontSize: '17px', fontWeight: 800, margin: 0, color: '#0f172a' }}>
                  Register New Supplier / Mill
                </h2>
              </div>
              <button 
                onClick={() => setShowAddSupplier(false)}
                style={{ background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer', color: '#64748b' }}
              >
                ×
              </button>
            </div>

            <form onSubmit={handleAddSupplier}>
              <div style={{ marginBottom: '10px' }}>
                <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                  Supplier / Mill Name *
                </label>
                <input 
                  type="text" 
                  className="form-input" 
                  style={{ fontSize: '12.5px', height: '36px', padding: '0 10px', borderRadius: '7px', border: '1.5px solid #cbd5e1', width: '100%' }}
                  placeholder="e.g. Tata Tiscon Mills / JSW Distributor" 
                  value={supName} 
                  onChange={(e) => setSupName(e.target.value)} 
                  required 
                  autoFocus
                />
              </div>

              <div style={{ marginBottom: '10px' }}>
                <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                  Company / Entity Name
                </label>
                <input 
                  type="text" 
                  className="form-input" 
                  style={{ fontSize: '12.5px', height: '36px', padding: '0 10px', borderRadius: '7px', border: '1.5px solid #cbd5e1', width: '100%' }}
                  placeholder="e.g. Tata Steel BSL Ltd." 
                  value={supCompany} 
                  onChange={(e) => setSupCompany(e.target.value)} 
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                    Phone Number
                  </label>
                  <input 
                    type="text" 
                    className="form-input" 
                    style={{ fontSize: '12.5px', height: '36px', padding: '0 10px', borderRadius: '7px', border: '1.5px solid #cbd5e1', width: '100%' }}
                    placeholder="e.g. 044-28290000" 
                    value={supPhone} 
                    onChange={(e) => setSupPhone(e.target.value)} 
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                    GSTIN No.
                  </label>
                  <input 
                    type="text" 
                    className="form-input font-mono" 
                    style={{ fontSize: '12px', height: '36px', padding: '0 8px', borderRadius: '7px', border: '1.5px solid #cbd5e1', width: '100%' }}
                    placeholder="33AAAA..." 
                    value={supGstin} 
                    onChange={(e) => setSupGstin(e.target.value.toUpperCase())} 
                  />
                </div>
              </div>

              <div style={{ marginBottom: '10px' }}>
                <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                  Materials Supplied
                </label>
                <input 
                  type="text" 
                  className="form-input" 
                  style={{ fontSize: '12.5px', height: '36px', padding: '0 10px', borderRadius: '7px', border: '1.5px solid #cbd5e1', width: '100%' }}
                  placeholder="e.g. Fe550D TMT Rebars, MS Channels, Angles" 
                  value={supMaterials} 
                  onChange={(e) => setSupMaterials(e.target.value)} 
                />
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                  Factory / Yard Location
                </label>
                <input 
                  type="text" 
                  className="form-input" 
                  style={{ fontSize: '12.5px', height: '36px', padding: '0 10px', borderRadius: '7px', border: '1.5px solid #cbd5e1', width: '100%' }}
                  placeholder="e.g. Chennai Yard, Industrial Estate" 
                  value={supAddress} 
                  onChange={(e) => setSupAddress(e.target.value)} 
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '16px' }}>
                <button 
                  type="button" 
                  onClick={() => setShowAddSupplier(false)}
                  style={{
                    height: '33px',
                    padding: '0 14px',
                    fontSize: '12px',
                    fontWeight: 600,
                    borderRadius: '7px',
                    border: '1px solid #cbd5e1',
                    backgroundColor: '#ffffff',
                    color: '#475569',
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={savingSup} 
                  style={{ 
                    height: '33px',
                    padding: '0 16px',
                    fontSize: '12px',
                    fontWeight: 700,
                    borderRadius: '7px',
                    border: 'none',
                    backgroundColor: '#059669',
                    color: '#ffffff',
                    cursor: savingSup ? 'not-allowed' : 'pointer'
                  }}
                >
                  {savingSup ? 'Saving...' : 'Register Supplier'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: INWARD STOCK / MATERIAL PURCHASE */}
      {purchaseSupplier && (
        <div className="modal-overlay" style={{ backdropFilter: 'blur(3px)', backgroundColor: 'rgba(15, 23, 42, 0.45)' }} onClick={() => setPurchaseSupplier(null)}>
          <div className="modal-content" style={{ maxWidth: '480px', borderRadius: '12px', padding: '24px' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ShoppingCart size={18} color="#059669" />
                <h2 style={{ fontSize: '17px', fontWeight: 800, margin: 0, color: '#0f172a' }}>
                  Inward Stock / Raw Material Purchase
                </h2>
              </div>
              <button 
                onClick={() => setPurchaseSupplier(null)}
                style={{ background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer', color: '#64748b' }}
              >
                ×
              </button>
            </div>

            <div style={{ backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', padding: '8px 12px', borderRadius: '7px', marginBottom: '14px', fontSize: '12px', color: '#166534' }}>
              Supplier: <strong>{purchaseSupplier.name}</strong> • Current Credit Due: <strong>₹{(purchaseSupplier.pending_credit || 0).toLocaleString('en-IN')}</strong>
            </div>

            <form onSubmit={handleSavePurchase}>
              <div style={{ marginBottom: '10px' }}>
                <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                  Select Material Product *
                </label>
                <select 
                  className="form-select"
                  style={{ fontSize: '12.5px', height: '36px', padding: '0 8px', borderRadius: '7px', border: '1.5px solid #cbd5e1', width: '100%' }}
                  value={pProductId}
                  onChange={(e) => {
                    const found = products.find(p => p.id === Number(e.target.value));
                    if (found) {
                      setPProductId(found.id);
                      setPProduct(found.name);
                      setPBoughtRate(found.default_bought_rate || 550);
                    }
                  }}
                  required
                >
                  {products.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.unit})
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                    Quantity (Tons) *
                  </label>
                  <input 
                    type="number"
                    step="0.01"
                    className="form-input"
                    style={{ fontSize: '13px', height: '36px', padding: '0 10px', borderRadius: '7px', border: '1.5px solid #cbd5e1', width: '100%' }}
                    placeholder="e.g. 10.5"
                    value={pQty}
                    onChange={(e) => setPQty(e.target.value)}
                    required
                    autoFocus
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                    Bought Rate (₹/Ton) *
                  </label>
                  <input 
                    type="number"
                    step="0.01"
                    className="form-input"
                    style={{ fontSize: '13px', height: '36px', padding: '0 10px', borderRadius: '7px', border: '1.5px solid #cbd5e1', width: '100%' }}
                    placeholder="e.g. 55000"
                    value={pBoughtRate}
                    onChange={(e) => setPBoughtRate(e.target.value)}
                    required
                  />
                  {(() => {
                    const selProd = products.find(p => p.id === Number(pProductId)) || products.find(p => p.name === pProduct);
                    const oldRate = Number(selProd?.default_bought_rate || 0);
                    const newRate = Number(pBoughtRate || 0);
                    if (oldRate > 0 && newRate > 0 && oldRate !== newRate) {
                      const avg = Math.round(((oldRate + newRate) / 2.0) * 100) / 100;
                      return (
                        <div style={{ marginTop: '5px', fontSize: '11px', color: '#059669', fontWeight: 600, lineHeight: 1.3 }}>
                          ⚡ Catalog bought cost updates to: <strong>₹{avg.toLocaleString('en-IN')}</strong> (avg of ₹{oldRate.toLocaleString('en-IN')} & ₹{newRate.toLocaleString('en-IN')})
                        </div>
                      );
                    }
                    return null;
                  })()}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                    Delivery Vehicle No.
                  </label>
                  <input 
                    type="text"
                    className="form-input font-mono"
                    style={{ fontSize: '12.5px', height: '36px', padding: '0 10px', borderRadius: '7px', border: '1.5px solid #cbd5e1', width: '100%' }}
                    placeholder="TN 01 AB 1234"
                    value={pVehicleNo}
                    onChange={(e) => setPVehicleNo(e.target.value.toUpperCase())}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                    Paid Upfront (₹)
                  </label>
                  <input 
                    type="number"
                    step="1"
                    className="form-input"
                    style={{ fontSize: '13px', height: '36px', padding: '0 10px', borderRadius: '7px', border: '1.5px solid #cbd5e1', width: '100%' }}
                    placeholder="0 if fully on credit"
                    value={pPaidAmount}
                    onChange={(e) => setPPaidAmount(e.target.value)}
                  />
                </div>
              </div>

              {/* LIVE TOTALS BREAKDOWN */}
              <div style={{ backgroundColor: '#f8fafc', padding: '12px 14px', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#64748b' }}>
                  <span>Total Inward Value:</span>
                  <strong className="font-mono" style={{ color: '#0f172a', fontSize: '13px' }}>₹{pTotalVal.toLocaleString('en-IN')}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
                  <span>Paid Upfront:</span>
                  <strong className="font-mono" style={{ color: '#16a34a', fontSize: '13px' }}>₹{Number(pPaidAmount || 0).toLocaleString('en-IN')}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', fontWeight: 800, marginTop: '6px', paddingTop: '6px', borderTop: '1px solid #e2e8f0' }}>
                  <span style={{ color: '#b91c1c' }}>Added to Supplier Credit:</span>
                  <strong className="font-mono" style={{ color: '#b91c1c', fontSize: '14px' }}>₹{pBalanceVal.toLocaleString('en-IN')}</strong>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                <button 
                  type="button" 
                  onClick={() => setPurchaseSupplier(null)}
                  style={{
                    height: '33px',
                    padding: '0 14px',
                    fontSize: '12px',
                    fontWeight: 600,
                    borderRadius: '7px',
                    border: '1px solid #cbd5e1',
                    backgroundColor: '#ffffff',
                    color: '#475569',
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={savingPurchase} 
                  style={{ 
                    height: '33px',
                    padding: '0 16px',
                    fontSize: '12px',
                    fontWeight: 700,
                    borderRadius: '7px',
                    border: 'none',
                    backgroundColor: '#059669',
                    color: '#ffffff',
                    cursor: savingPurchase ? 'not-allowed' : 'pointer'
                  }}
                >
                  {savingPurchase ? 'Recording...' : 'Stock In & Record Purchase'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: PAY SUPPLIER (SETTLE CREDIT) */}
      {paySupplier && (
        <div className="modal-overlay" style={{ backdropFilter: 'blur(3px)', backgroundColor: 'rgba(15, 23, 42, 0.45)' }} onClick={() => setPaySupplier(null)}>
          <div className="modal-content" style={{ maxWidth: '440px', borderRadius: '12px', padding: '24px' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <DollarSign size={18} color="#dc2626" />
                <h2 style={{ fontSize: '17px', fontWeight: 800, margin: 0, color: '#0f172a' }}>
                  Pay Supplier / Clear Credit
                </h2>
              </div>
              <button 
                onClick={() => setPaySupplier(null)}
                style={{ background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer', color: '#64748b' }}
              >
                ×
              </button>
            </div>

            <div style={{ backgroundColor: '#fef2f2', border: '1px solid #fecaca', padding: '10px 14px', borderRadius: '8px', marginBottom: '14px' }}>
              <div style={{ fontSize: '12px', color: '#991b1b', fontWeight: 700 }}>
                Supplier: {paySupplier.name}
              </div>
              <div style={{ fontSize: '18px', fontWeight: 900, color: '#b91c1c', fontFamily: 'monospace', marginTop: '2px' }}>
                Pending Due: ₹{(paySupplier.pending_credit || 0).toLocaleString('en-IN')}
              </div>
            </div>

            <form onSubmit={handlePaySupplierSubmit}>
              <div style={{ marginBottom: '10px' }}>
                <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                  Amount to Pay (₹) *
                </label>
                <input 
                  type="number"
                  step="1"
                  className="form-input"
                  style={{ fontSize: '14px', fontWeight: 800, height: '36px', padding: '0 10px', borderRadius: '7px', border: '1.5px solid #cbd5e1', width: '100%', color: '#0f172a' }}
                  value={payAmount}
                  onChange={(e) => setPayAmount(e.target.value)}
                  required
                  autoFocus
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                    Payment Date *
                  </label>
                  <input 
                    type="date"
                    className="form-input"
                    style={{ fontSize: '12.5px', height: '36px', padding: '0 8px', borderRadius: '7px', border: '1.5px solid #cbd5e1', width: '100%' }}
                    value={payDate}
                    onChange={(e) => setPayDate(e.target.value)}
                    required
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                    Payment Mode
                  </label>
                  <select 
                    className="form-select" 
                    style={{ fontSize: '12.5px', height: '36px', padding: '0 8px', borderRadius: '7px', border: '1.5px solid #cbd5e1', width: '100%' }}
                    value={payMode} 
                    onChange={(e) => setPayMode(e.target.value)}
                  >
                    <option value="Bank Transfer">Bank Transfer / NEFT</option>
                    <option value="Cheque">Cheque</option>
                    <option value="UPI">UPI</option>
                    <option value="Cash">Cash</option>
                  </select>
                </div>
              </div>

              <div style={{ marginBottom: '10px' }}>
                <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                  Reference / UTR No.
                </label>
                <input 
                  type="text"
                  className="form-input font-mono"
                  style={{ fontSize: '12.5px', height: '36px', padding: '0 10px', borderRadius: '7px', border: '1.5px solid #cbd5e1', width: '100%' }}
                  placeholder="e.g. UTR128491029 / Cheque 482012"
                  value={payRef}
                  onChange={(e) => setPayRef(e.target.value)}
                />
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                  Notes
                </label>
                <input 
                  type="text"
                  className="form-input"
                  style={{ fontSize: '12.5px', height: '36px', padding: '0 10px', borderRadius: '7px', border: '1.5px solid #cbd5e1', width: '100%' }}
                  placeholder="e.g. Settling Invoice INV-8921"
                  value={payNotes}
                  onChange={(e) => setPayNotes(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                <button 
                  type="button" 
                  onClick={() => setPaySupplier(null)}
                  style={{
                    height: '33px',
                    padding: '0 14px',
                    fontSize: '12px',
                    fontWeight: 600,
                    borderRadius: '7px',
                    border: '1px solid #cbd5e1',
                    backgroundColor: '#ffffff',
                    color: '#475569',
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={savingPay} 
                  style={{ 
                    height: '33px',
                    padding: '0 16px',
                    fontSize: '12px',
                    fontWeight: 700,
                    borderRadius: '7px',
                    border: 'none',
                    backgroundColor: '#dc2626',
                    color: '#ffffff',
                    cursor: savingPay ? 'not-allowed' : 'pointer'
                  }}
                >
                  {savingPay ? 'Recording...' : 'Disburse Payment & Clear Credit'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
