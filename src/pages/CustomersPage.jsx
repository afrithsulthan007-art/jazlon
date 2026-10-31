import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Search, 
  Plus, 
  DollarSign, 
  Trash2, 
  Download, 
  AlertTriangle, 
  CheckCircle2, 
  Phone, 
  MapPin, 
  FileText,
  CreditCard,
  ArrowDownToLine,
  Calendar,
  X
} from 'lucide-react';

export default function CustomersPage({ onCustomerUpdated, initialTab = 'all' }) {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterTab, setFilterTab] = useState(initialTab === 'credit' ? 'credit' : 'all'); // 'all' | 'credit' | 'settled'
  const [selectedCustomerId, setSelectedCustomerId] = useState(null);
  const [customerDetail, setCustomerDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newAddress, setNewAddress] = useState('');
  const [newGstin, setNewGstin] = useState('');
  const [newOpeningCredit, setNewOpeningCredit] = useState('');
  const [savingCust, setSavingCust] = useState(false);

  // Payment Modal
  const [showPayModal, setShowPayModal] = useState(false);
  const [payAmount, setPayAmount] = useState('');
  const [payDate, setPayDate] = useState(new Date().toISOString().split('T')[0]);
  const [payMode, setPayMode] = useState('Cash');
  const [payRef, setPayRef] = useState('');
  const [payNotes, setPayNotes] = useState('');
  const [savingPay, setSavingPay] = useState(false);

  // Add Credit / Opening Balance Modal
  const [showCreditModal, setShowCreditModal] = useState(false);
  const [creditAmount, setCreditAmount] = useState('');
  const [creditDate, setCreditDate] = useState(new Date().toISOString().split('T')[0]);
  const [creditRef, setCreditRef] = useState('OPENING-BAL');
  const [creditNotes, setCreditNotes] = useState('Opening Balance / Handover Dues');
  const [savingCredit, setSavingCredit] = useState(false);

  const fetchCustomers = async (preserveSelectedId = null) => {
    try {
      setLoading(true);
      const res = await fetch('/api/customers');
      const data = await res.json();
      const list = Array.isArray(data) ? data : [];
      setCustomers(list);

      // Auto-select Sathyam Trader if present or first alphabetical customer
      if (list.length > 0) {
        const sathyam = list.find(c => c.name.toLowerCase().includes('sathyam'));
        const sorted = [...list].sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
        const defaultChoice = sathyam ? sathyam.id : sorted[0].id;
        const targetId = preserveSelectedId || selectedCustomerId || defaultChoice;
        const exists = sorted.find(c => c.id === targetId);
        const finalId = exists ? exists.id : defaultChoice;
        setSelectedCustomerId(finalId);
        loadCustomerDetail(finalId);
      } else {
        setSelectedCustomerId(null);
        setCustomerDetail(null);
      }
    } catch (err) {
      console.error('Error fetching customers:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadCustomerDetail = async (id) => {
    if (!id) return;
    try {
      setDetailLoading(true);
      const res = await fetch(`/api/customers/${id}`);
      const data = await res.json();
      setCustomerDetail(data);
    } catch (err) {
      console.error('Error loading customer detail:', err);
    } finally {
      setDetailLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  const handleSelectCustomer = (id) => {
    setSelectedCustomerId(id);
    loadCustomerDetail(id);
  };

  // Add New Customer
  const handleAddCustomerSubmit = async (e) => {
    e.preventDefault();
    if (!newName.trim()) return;

    try {
      setSavingCust(true);
      const res = await fetch('/api/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newName.trim(),
          phone: newPhone.trim(),
          address: newAddress.trim(),
          gstin: newGstin.trim()
        })
      });

      if (!res.ok) throw new Error('Failed to create customer');
      const created = await res.json();

      // If initial opening credit provided, add it
      if (Number(newOpeningCredit) > 0) {
        await fetch(`/api/customers/${created.id}/adjust`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            amount: Number(newOpeningCredit),
            date: new Date().toISOString().split('T')[0],
            ref_no: 'OPENING-BAL',
            notes: 'Opening Balance / Handover Dues'
          })
        });
      }

      setNewName('');
      setNewPhone('');
      setNewAddress('');
      setNewGstin('');
      setNewOpeningCredit('');
      setShowAddModal(false);
      fetchCustomers(created.id);
      if (onCustomerUpdated) onCustomerUpdated();
    } catch (err) {
      alert(err.message);
    } finally {
      setSavingCust(false);
    }
  };

  // Delete Customer
  const handleDeleteCustomer = async (cust, e) => {
    if (e) e.stopPropagation();
    if (!window.confirm(`Are you sure you want to remove "${cust.name}"? This will delete their ledger records.`)) {
      return;
    }

    try {
      const res = await fetch(`/api/customers/${cust.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete customer');
      fetchCustomers();
      if (onCustomerUpdated) onCustomerUpdated();
    } catch (err) {
      alert(err.message);
    }
  };

  // Open Record Payment Modal
  const handleOpenPayModal = () => {
    const cust = customerDetail?.customer;
    if (!cust) return;
    setPayAmount(cust.pending_credit > 0 ? cust.pending_credit : '');
    setPayDate(new Date().toISOString().split('T')[0]);
    setPayMode('Cash');
    setPayRef('');
    setPayNotes(`Payment from ${cust.name}`);
    setShowPayModal(true);
  };

  // Submit Payment
  const handlePaySubmit = async (e) => {
    e.preventDefault();
    const cust = customerDetail?.customer;
    if (!cust || !payAmount || Number(payAmount) <= 0) return;

    try {
      setSavingPay(true);
      const res = await fetch(`/api/customers/${cust.id}/pay`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: Number(payAmount),
          date: payDate,
          payment_mode: payMode,
          reference_no: payRef,
          notes: payNotes
        })
      });

      if (!res.ok) throw new Error('Failed to record payment');
      setShowPayModal(false);
      fetchCustomers(cust.id);
      loadCustomerDetail(cust.id);
      if (onCustomerUpdated) onCustomerUpdated();
    } catch (err) {
      alert(err.message);
    } finally {
      setSavingPay(false);
    }
  };

  // Open Add Credit Modal
  const handleOpenCreditModal = () => {
    setCreditAmount('');
    setCreditDate(new Date().toISOString().split('T')[0]);
    setCreditRef('OPENING-BAL');
    setCreditNotes('Opening Balance / Handover Dues');
    setShowCreditModal(true);
  };

  // Submit Credit / Adjustment
  const handleCreditSubmit = async (e) => {
    e.preventDefault();
    const cust = customerDetail?.customer;
    if (!cust || !creditAmount || Number(creditAmount) <= 0) return;

    try {
      setSavingCredit(true);
      const res = await fetch(`/api/customers/${cust.id}/adjust`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: Number(creditAmount),
          date: creditDate,
          ref_no: creditRef || 'OPENING-BAL',
          notes: creditNotes || 'Opening Balance / Handover Dues'
        })
      });

      if (!res.ok) throw new Error('Failed to record credit');
      setShowCreditModal(false);
      fetchCustomers(cust.id);
      loadCustomerDetail(cust.id);
      if (onCustomerUpdated) onCustomerUpdated();
    } catch (err) {
      alert(err.message);
    } finally {
      setSavingCredit(false);
    }
  };

  // Download CSV Export
  const handleDownloadCSV = () => {
    if (customers.length === 0) return;
    const headers = ['Customer Name', 'Phone', 'Address', 'GSTIN', 'Lifetime Purchase (₹)', 'Total Paid (₹)', 'Outstanding Credit (₹)', 'Status'];
    const rows = customers.map(c => [
      `"${c.name.replace(/"/g, '""')}"`,
      `"${c.phone || ''}"`,
      `"${(c.address || '').replace(/"/g, '""')}"`,
      `"${c.gstin || ''}"`,
      c.lifetime_purchase || 0,
      c.total_paid || 0,
      c.pending_credit || 0,
      (c.pending_credit || 0) > 0 ? 'Credit' : 'Settled'
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `customer_directory_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Alphabetical sorting (A-Z) & filtering with Credit Dues filter
  const filteredCustomers = customers
    .filter(c => {
      const matchesSearch = c.name.toLowerCase().includes(search.toLowerCase()) ||
        (c.phone && c.phone.includes(search)) ||
        (c.address && c.address.toLowerCase().includes(search.toLowerCase()));
      if (!matchesSearch) return false;
      if (filterTab === 'credit') return (c.pending_credit || 0) > 0;
      if (filterTab === 'settled') return (c.pending_credit || 0) <= 0;
      return true;
    })
    .sort((a, b) => {
      const aIsSathyam = a.name.toLowerCase().includes('sathyam');
      const bIsSathyam = b.name.toLowerCase().includes('sathyam');
      if (aIsSathyam && !bIsSathyam) return -1;
      if (!aIsSathyam && bIsSathyam) return 1;
      return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
    });

  // Aggregate stats
  const totalOutstanding = customers.reduce((sum, c) => sum + (c.pending_credit || 0), 0);
  const creditDebtorsCount = customers.filter(c => (c.pending_credit || 0) > 0).length;
  const settledAccountsCount = customers.filter(c => (c.pending_credit || 0) <= 0).length;

  const selectedCustomer = customerDetail?.customer || customers.find(c => c.id === selectedCustomerId);

  // Combine chronological ledger items
  const ledgerEntries = [];
  if (customerDetail) {
    if (customerDetail.adjustments) {
      customerDetail.adjustments.forEach(a => {
        ledgerEntries.push({
          id: `adj-${a.id}`,
          date: a.date,
          type: 'OPENING_BALANCE',
          ref: a.ref_no || 'OPENING-BAL',
          particulars: a.notes || 'Opening Balance / Handover Dues',
          debit: a.amount,
          credit: 0
        });
      });
    }

    if (customerDetail.bills) {
      customerDetail.bills.forEach(b => {
        ledgerEntries.push({
          id: `bill-${b.id}`,
          date: b.date,
          type: 'BILL',
          ref: b.bill_no,
          particulars: `${b.product_name} (${b.quantity} ${b.unit} @ ₹${b.rate}) • ${b.payment_mode}`,
          debit: b.total_amount,
          credit: b.amount_received || 0
        });
      });
    }

    if (customerDetail.payments) {
      customerDetail.payments.forEach(p => {
        ledgerEntries.push({
          id: `pay-${p.id}`,
          date: p.date,
          type: 'PAYMENT',
          ref: p.reference_no || 'Direct Pay',
          particulars: `Payment received via ${p.payment_mode}${p.notes ? ` • ${p.notes}` : ''}`,
          debit: 0,
          credit: p.amount
        });
      });
    }

    // Sort chronologically (oldest to newest)
    ledgerEntries.sort((a, b) => new Date(a.date) - new Date(b.date));

    // Calculate running balance
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
      
      {/* TOP 4 STAT KPI BOXES (Combined Customers & Credit Dues) */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', 
        gap: '14px', 
        marginBottom: '16px' 
      }}>
        {/* 1. CUSTOMER DIRECTORY */}
        <div 
          onClick={() => setFilterTab('all')}
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '10px',
            border: filterTab === 'all' ? '2px solid #2563eb' : '1px solid #e2e8f0',
            padding: '16px 20px',
            position: 'relative',
            cursor: 'pointer',
            boxShadow: filterTab === 'all' ? '0 2px 8px rgba(37, 99, 235, 0.12)' : 'none',
            transition: 'all 0.15s ease'
          }}
          title="Click to view all customer accounts"
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: '11px', fontWeight: 800, color: filterTab === 'all' ? '#2563eb' : '#64748b', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                CUSTOMER DIRECTORY
              </div>
              <div style={{ fontSize: '24px', fontWeight: 900, color: '#0f172a', marginTop: '6px' }}>
                {customers.length} <span style={{ fontSize: '15px', fontWeight: 700, color: '#64748b' }}>Accounts</span>
              </div>
              <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
                Contractors, builders & buyers
              </div>
            </div>
            <div style={{ color: '#2563eb' }}>
              <Users size={22} />
            </div>
          </div>
        </div>

        {/* 2. ACTIVE CREDIT DEBTORS */}
        <div 
          onClick={() => setFilterTab('credit')}
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '10px',
            border: filterTab === 'credit' ? '2px solid #dc2626' : '1px solid #e2e8f0',
            padding: '16px 20px',
            position: 'relative',
            cursor: 'pointer',
            boxShadow: filterTab === 'credit' ? '0 2px 8px rgba(220, 38, 38, 0.15)' : 'none',
            transition: 'all 0.15s ease'
          }}
          title="Click to filter customers with pending credit dues"
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: '11px', fontWeight: 800, color: '#dc2626', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                ACTIVE CREDIT DEBTORS
              </div>
              <div style={{ fontSize: '24px', fontWeight: 900, color: '#dc2626', marginTop: '6px' }}>
                {creditDebtorsCount} <span style={{ fontSize: '15px', fontWeight: 700, color: '#dc2626' }}>Due</span>
              </div>
              <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
                Customers with pending balance
              </div>
            </div>
            <div style={{ color: '#dc2626' }}>
              <AlertTriangle size={22} />
            </div>
          </div>
        </div>

        {/* 3. TOTAL OUTSTANDING DUES */}
        <div 
          onClick={() => setFilterTab('credit')}
          style={{
            backgroundColor: filterTab === 'credit' ? '#fffdfd' : '#ffffff',
            borderRadius: '10px',
            border: filterTab === 'credit' ? '2px solid #dc2626' : '1px solid #e2e8f0',
            padding: '16px 20px',
            position: 'relative',
            cursor: 'pointer',
            boxShadow: filterTab === 'credit' ? '0 2px 8px rgba(220, 38, 38, 0.15)' : 'none',
            transition: 'all 0.15s ease'
          }}
          title="Click to view total credit receivables"
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: '11px', fontWeight: 800, color: '#dc2626', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                TOTAL OUTSTANDING DUES
              </div>
              <div style={{ fontSize: '24px', fontWeight: 900, color: '#dc2626', fontFamily: 'monospace', marginTop: '6px' }}>
                ₹{totalOutstanding.toLocaleString('en-IN')}
              </div>
              <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
                Receivables from buyers
              </div>
            </div>
            <span style={{ 
              fontSize: '10.5px', 
              fontWeight: 800, 
              color: '#dc2626', 
              backgroundColor: '#fee2e2',
              padding: '2px 6px',
              borderRadius: '4px',
              letterSpacing: '0.5px', 
              textTransform: 'uppercase' 
            }}>
              PENDING DUES
            </span>
          </div>
        </div>

        {/* 4. SETTLED ACCOUNTS */}
        <div 
          onClick={() => setFilterTab('settled')}
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '10px',
            border: filterTab === 'settled' ? '2px solid #16a34a' : '1px solid #e2e8f0',
            padding: '16px 20px',
            position: 'relative',
            cursor: 'pointer',
            boxShadow: filterTab === 'settled' ? '0 2px 8px rgba(22, 163, 74, 0.15)' : 'none',
            transition: 'all 0.15s ease'
          }}
          title="Click to view cleared accounts with zero balance"
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: '11px', fontWeight: 800, color: filterTab === 'settled' ? '#16a34a' : '#64748b', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                SETTLED ACCOUNTS
              </div>
              <div style={{ fontSize: '24px', fontWeight: 900, color: '#16a34a', marginTop: '6px' }}>
                {settledAccountsCount} <span style={{ fontSize: '15px', fontWeight: 700, color: '#16a34a' }}>Cleared</span>
              </div>
              <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
                Customers with zero balance
              </div>
            </div>
            <span style={{ 
              fontSize: '10.5px', 
              fontWeight: 800, 
              color: '#16a34a', 
              backgroundColor: '#dcfce7',
              padding: '2px 6px',
              borderRadius: '4px',
              letterSpacing: '0.5px', 
              textTransform: 'uppercase' 
            }}>
              CLEARED
            </span>
          </div>
        </div>
      </div>

      {/* ACTION BAR: SEARCH, FILTER TABS, ADD CUSTOMER, DOWNLOAD CSV */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        gap: '12px', 
        marginBottom: '16px',
        flexWrap: 'wrap'
      }}>
        <div style={{ display: 'flex', gap: '10px', flex: 1, maxWidth: '480px', alignItems: 'center' }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <Search size={15} color="#94a3b8" style={{ position: 'absolute', left: '12px', top: '10px' }} />
            <input
              type="text"
              className="form-input"
              placeholder="Search customer name, phone, zone..."
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
              backgroundColor: '#2563eb',
              borderColor: '#1d4ed8',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              whiteSpace: 'nowrap'
            }}
            onClick={() => setShowAddModal(true)}
          >
            <Plus size={15} />
            Add Customer
          </button>
        </div>

        {/* COMBINED FILTER TABS */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', backgroundColor: '#f1f5f9', padding: '3px', borderRadius: '8px' }}>
          <button
            type="button"
            onClick={() => setFilterTab('all')}
            style={{
              padding: '6px 12px',
              fontSize: '12px',
              fontWeight: 700,
              borderRadius: '6px',
              border: 'none',
              cursor: 'pointer',
              backgroundColor: filterTab === 'all' ? '#ffffff' : 'transparent',
              color: filterTab === 'all' ? '#0f172a' : '#64748b',
              boxShadow: filterTab === 'all' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
            }}
          >
            All Accounts ({customers.length})
          </button>
          <button
            type="button"
            onClick={() => setFilterTab('credit')}
            style={{
              padding: '6px 12px',
              fontSize: '12px',
              fontWeight: 700,
              borderRadius: '6px',
              border: 'none',
              cursor: 'pointer',
              backgroundColor: filterTab === 'credit' ? '#fef2f2' : 'transparent',
              color: filterTab === 'credit' ? '#dc2626' : '#64748b',
              boxShadow: filterTab === 'credit' ? '0 1px 3px rgba(220,38,38,0.15)' : 'none',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px'
            }}
          >
            <AlertTriangle size={13} color={filterTab === 'credit' ? '#dc2626' : '#64748b'} />
            Credit Dues Only ({creditDebtorsCount})
          </button>
          <button
            type="button"
            onClick={() => setFilterTab('settled')}
            style={{
              padding: '6px 12px',
              fontSize: '12px',
              fontWeight: 700,
              borderRadius: '6px',
              border: 'none',
              cursor: 'pointer',
              backgroundColor: filterTab === 'settled' ? '#f0fdf4' : 'transparent',
              color: filterTab === 'settled' ? '#16a34a' : '#64748b',
              boxShadow: filterTab === 'settled' ? '0 1px 3px rgba(22,163,74,0.15)' : 'none'
            }}
          >
            Settled ({settledAccountsCount})
          </button>
        </div>

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
            color: '#2563eb',
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

      {/* MASTER-DETAIL SPLIT VIEW (LEFT: ALPHABETICAL CUSTOMERS, RIGHT: DETAILED STATEMENT) */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: '320px 1fr', 
        gap: '16px', 
        alignItems: 'start' 
      }}>
        
        {/* LEFT COLUMN: CUSTOMER LIST (ALPHABETICAL A-Z) */}
        <div style={{ 
          display: 'flex', 
          flexDirection: 'column', 
          gap: '10px', 
          maxHeight: 'calc(100vh - 280px)', 
          overflowY: 'auto',
          paddingRight: '4px' 
        }}>
          {filteredCustomers.length === 0 ? (
            <div style={{ 
              backgroundColor: '#ffffff', 
              borderRadius: '10px', 
              border: '1px solid #e2e8f0', 
              padding: '28px', 
              textAlign: 'center', 
              color: '#94a3b8', 
              fontSize: '13px' 
            }}>
              {loading ? 'Loading customers...' : 'No customers match your search.'}
            </div>
          ) : (
            filteredCustomers.map(cust => {
              const isSelected = cust.id === selectedCustomerId;
              const hasCredit = (cust.pending_credit || 0) > 0;

              return (
                <div
                  key={cust.id}
                  onClick={() => handleSelectCustomer(cust.id)}
                  style={{
                    backgroundColor: isSelected ? (hasCredit ? '#fffbfb' : '#f0fdf4') : '#ffffff',
                    borderRadius: '10px',
                    border: isSelected ? (hasCredit ? '2px solid #dc2626' : '2px solid #16a34a') : '1px solid #e2e8f0',
                    padding: '14px 16px',
                    cursor: 'pointer',
                    boxShadow: isSelected ? '0 4px 12px rgba(0, 0, 0, 0.08)' : 'none',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontWeight: 800, fontSize: '14.5px', color: '#0f172a' }}>
                      {cust.name}
                    </div>
                    <span style={{
                      fontSize: '11px',
                      fontWeight: 800,
                      padding: '2px 8px',
                      borderRadius: '4px',
                      backgroundColor: hasCredit ? '#fef2f2' : '#f0fdf4',
                      color: hasCredit ? '#dc2626' : '#15803d',
                      border: `1px solid ${hasCredit ? '#fecaca' : '#bbf7d0'}`
                    }}>
                      {hasCredit ? 'Credit Due' : 'Settled'}
                    </span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11.5px', color: '#64748b', marginTop: '6px' }}>
                    <span>Phone: <strong>{cust.phone || '—'}</strong></span>
                    <span>Zone: {cust.address ? (cust.address.length > 15 ? cust.address.slice(0, 15) + '...' : cust.address) : 'Yard'}</span>
                  </div>

                  {cust.address && (
                    <div style={{ fontSize: '11.5px', color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                      <MapPin size={11} color="#94a3b8" />
                      <span>{cust.address}</span>
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
                    <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 700 }}>Credit Due:</span>
                    <span style={{ 
                      fontSize: '15px', 
                      fontWeight: 900, 
                      color: hasCredit ? '#dc2626' : '#16a34a', 
                      fontFamily: 'monospace' 
                    }}>
                      ₹ {(cust.pending_credit || 0).toLocaleString('en-IN')}
                    </span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '6px' }}>
                    <button
                      type="button"
                      onClick={(e) => handleDeleteCustomer(cust, e)}
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
                        padding: '2px 6px'
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

        {/* RIGHT COLUMN: SELECTED CUSTOMER DETAILS & RUNNING LEDGER */}
        <div style={{ 
          backgroundColor: '#ffffff', 
          borderRadius: '12px', 
          border: '1px solid #e2e8f0', 
          padding: '20px 24px',
          minHeight: '480px'
        }}>
          {!selectedCustomer ? (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: '#94a3b8' }}>
              <Users size={36} color="#cbd5e1" style={{ margin: '0 auto 12px' }} />
              <div style={{ fontSize: '15px', fontWeight: 700, color: '#64748b' }}>No Customer Selected</div>
              <div style={{ fontSize: '12.5px', marginTop: '4px' }}>Select a customer from the left list to view lifetime purchases and account statement.</div>
            </div>
          ) : (
            <div>
              {/* CUSTOMER HEADER & ACTION BUTTONS */}
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
                      {selectedCustomer.name}
                    </h2>
                    <span style={{
                      fontSize: '11px',
                      fontWeight: 800,
                      padding: '2px 8px',
                      borderRadius: '4px',
                      backgroundColor: (selectedCustomer.pending_credit || 0) > 0 ? '#fef2f2' : '#f0fdf4',
                      color: (selectedCustomer.pending_credit || 0) > 0 ? '#dc2626' : '#15803d',
                      border: `1px solid ${(selectedCustomer.pending_credit || 0) > 0 ? '#fecaca' : '#bbf7d0'}`
                    }}>
                      {(selectedCustomer.pending_credit || 0) > 0 ? 'Credit Due' : 'Settled'}
                    </span>
                  </div>
                  <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
                    Phone: <strong>{selectedCustomer.phone || '—'}</strong>
                    {selectedCustomer.address && <> • Address: <strong>{selectedCustomer.address}</strong></>}
                    {selectedCustomer.gstin && <> • GSTIN: <strong className="font-mono">{selectedCustomer.gstin}</strong></>}
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '11px', fontWeight: 800, color: (selectedCustomer.pending_credit || 0) > 0 ? '#dc2626' : '#64748b', textTransform: 'uppercase' }}>
                      {(selectedCustomer.pending_credit || 0) > 0 ? 'Pending Credit Due' : 'Current Balance'}
                    </div>
                    <div style={{ 
                      fontSize: '24px', 
                      fontWeight: 900, 
                      color: (selectedCustomer.pending_credit || 0) > 0 ? '#dc2626' : '#16a34a', 
                      fontFamily: 'monospace' 
                    }}>
                      ₹ {(selectedCustomer.pending_credit || 0).toLocaleString('en-IN')}
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      type="button"
                      onClick={handleOpenCreditModal}
                      style={{
                        height: '34px',
                        padding: '0 12px',
                        fontSize: '12px',
                        fontWeight: 700,
                        borderRadius: '6px',
                        border: 'none',
                        backgroundColor: '#d97706',
                        color: '#ffffff',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '5px',
                        cursor: 'pointer',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      <Plus size={14} />
                      + Add Outstanding Credit
                    </button>

                    <button
                      type="button"
                      onClick={handleOpenPayModal}
                      style={{
                        height: '34px',
                        padding: '0 14px',
                        fontSize: '12px',
                        fontWeight: 700,
                        borderRadius: '6px',
                        border: 'none',
                        backgroundColor: '#16a34a',
                        color: '#ffffff',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '5px',
                        cursor: 'pointer',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      <DollarSign size={14} />
                      + Record Payment / Clear Due
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDeleteCustomer(selectedCustomer)}
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
                  <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Lifetime Purchases</div>
                  <div style={{ fontSize: '18px', fontWeight: 900, color: '#0f172a', fontFamily: 'monospace', marginTop: '2px' }}>
                    ₹ {(selectedCustomer.lifetime_purchase || 0).toLocaleString('en-IN')}
                  </div>
                </div>

                <div style={{ backgroundColor: '#f0fdf4', padding: '10px 14px', borderRadius: '8px', border: '1px solid #bbf7d0' }}>
                  <div style={{ fontSize: '11px', fontWeight: 700, color: '#16a34a', textTransform: 'uppercase' }}>Total Paid</div>
                  <div style={{ fontSize: '18px', fontWeight: 900, color: '#15803d', fontFamily: 'monospace', marginTop: '2px' }}>
                    ₹ {(selectedCustomer.total_paid || 0).toLocaleString('en-IN')}
                  </div>
                </div>

                <div style={{ 
                  backgroundColor: (selectedCustomer.pending_credit || 0) > 0 ? '#fef2f2' : '#f0fdf4', 
                  padding: '10px 14px', 
                  borderRadius: '8px', 
                  border: `1px solid ${(selectedCustomer.pending_credit || 0) > 0 ? '#fecaca' : '#bbf7d0'}` 
                }}>
                  <div style={{ 
                    fontSize: '11px', 
                    fontWeight: 700, 
                    color: (selectedCustomer.pending_credit || 0) > 0 ? '#dc2626' : '#16a34a', 
                    textTransform: 'uppercase' 
                  }}>
                    Outstanding Credit
                  </div>
                  <div style={{ 
                    fontSize: '18px', 
                    fontWeight: 900, 
                    color: (selectedCustomer.pending_credit || 0) > 0 ? '#dc2626' : '#15803d', 
                    fontFamily: 'monospace', 
                    marginTop: '2px' 
                  }}>
                    ₹ {(selectedCustomer.pending_credit || 0).toLocaleString('en-IN')}
                  </div>
                </div>
              </div>

              {/* ACCOUNT STATEMENT / RUNNING LEDGER TABLE */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <h3 style={{ fontSize: '14px', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                    Account Statement / Running Ledger
                  </h3>
                  <span style={{ fontSize: '11.5px', color: '#64748b' }}>
                    {ledgerEntries.length} transactions recorded
                  </span>
                </div>

                <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12.5px' }}>
                    <thead>
                      <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                        <th style={{ textAlign: 'left', padding: '10px 14px', fontWeight: 700, color: '#475569' }}>Date</th>
                        <th style={{ textAlign: 'left', padding: '10px 14px', fontWeight: 700, color: '#475569' }}>Ref / Particulars</th>
                        <th style={{ textAlign: 'right', padding: '10px 14px', fontWeight: 700, color: '#475569' }}>Debit (Bills)</th>
                        <th style={{ textAlign: 'right', padding: '10px 14px', fontWeight: 700, color: '#475569' }}>Credit (Paid)</th>
                        <th style={{ textAlign: 'right', padding: '10px 14px', fontWeight: 700, color: '#475569' }}>Balance</th>
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
                            No bills or payments recorded yet for this customer.
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
                                  backgroundColor: row.type === 'BILL' ? '#ecfdf5' : row.type === 'PAYMENT' ? '#f0fdf4' : '#eff6ff',
                                  color: row.type === 'BILL' ? '#047857' : row.type === 'PAYMENT' ? '#15803d' : '#2563eb'
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

            </div>
          )}
        </div>
      </div>

      {/* MODAL 1: ADD CUSTOMER */}
      {showAddModal && (
        <div className="modal-overlay" style={{ backdropFilter: 'blur(3px)', backgroundColor: 'rgba(15, 23, 42, 0.45)' }} onClick={() => setShowAddModal(false)}>
          <div 
            className="modal-content" 
            style={{ 
              maxWidth: '420px', 
              borderRadius: '16px', 
              padding: '18px 20px', 
              boxShadow: '0 25px 50px -12px rgba(15, 23, 42, 0.25)',
              border: 'none',
              animation: 'modalSlideIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
            }} 
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '12px', borderBottom: '1px solid #f1f5f9' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '30px', height: '30px', borderRadius: '8px', backgroundColor: '#eff6ff', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Users size={16} />
                </div>
                <div>
                  <h2 style={{ fontSize: '15px', fontWeight: 800, margin: 0, color: '#0f172a' }}>Add Customer</h2>
                  <div style={{ fontSize: '11px', color: '#64748b' }}>Contractor, builder or buyer profile</div>
                </div>
              </div>
              <button onClick={() => setShowAddModal(false)} style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '20px', cursor: 'pointer' }}>×</button>
            </div>

            <form onSubmit={handleAddCustomerSubmit} style={{ marginTop: '14px' }}>
              <div style={{ marginBottom: '10px' }}>
                <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                  Customer / Builder Name *
                </label>
                <input 
                  type="text"
                  className="form-input"
                  style={{ height: '36px', fontSize: '13px', borderRadius: '7px', border: '1.5px solid #cbd5e1', width: '100%', padding: '0 10px' }}
                  placeholder="e.g. AB Builders (Janardhanan)"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  required
                  autoFocus
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
                    style={{ height: '36px', fontSize: '13px', borderRadius: '7px', border: '1.5px solid #cbd5e1', width: '100%', padding: '0 10px' }}
                    placeholder="9842100000"
                    value={newPhone}
                    onChange={(e) => setNewPhone(e.target.value)}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                    Opening Credit (₹)
                  </label>
                  <input 
                    type="number"
                    step="0.01"
                    className="form-input font-mono"
                    style={{ height: '36px', fontSize: '13px', borderRadius: '7px', border: '1.5px solid #cbd5e1', width: '100%', padding: '0 10px' }}
                    placeholder="0"
                    value={newOpeningCredit}
                    onChange={(e) => setNewOpeningCredit(e.target.value)}
                  />
                </div>
              </div>

              <div style={{ marginBottom: '10px' }}>
                <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                  Site / Delivery Address
                </label>
                <input 
                  type="text"
                  className="form-input"
                  style={{ height: '36px', fontSize: '13px', borderRadius: '7px', border: '1.5px solid #cbd5e1', width: '100%', padding: '0 10px' }}
                  placeholder="e.g. Chennai Yard / Thillai Nagar"
                  value={newAddress}
                  onChange={(e) => setNewAddress(e.target.value)}
                />
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                  GSTIN (Optional)
                </label>
                <input 
                  type="text"
                  className="form-input font-mono"
                  style={{ height: '36px', fontSize: '13px', textTransform: 'uppercase', borderRadius: '7px', border: '1.5px solid #cbd5e1', width: '100%', padding: '0 10px' }}
                  placeholder="33AAAAA0000A1Z5"
                  value={newGstin}
                  onChange={(e) => setNewGstin(e.target.value.toUpperCase())}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                <button 
                  type="button" 
                  onClick={() => setShowAddModal(false)}
                  style={{ height: '33px', padding: '0 14px', fontSize: '12px', fontWeight: 600, borderRadius: '7px', border: '1px solid #cbd5e1', backgroundColor: '#ffffff', color: '#475569', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={savingCust}
                  style={{ height: '33px', padding: '0 16px', fontSize: '12px', fontWeight: 700, borderRadius: '7px', border: 'none', backgroundColor: '#2563eb', color: '#ffffff', cursor: savingCust ? 'not-allowed' : 'pointer' }}
                >
                  {savingCust ? 'Saving...' : 'Add Customer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: RECORD PAYMENT */}
      {showPayModal && (
        <div className="modal-overlay" style={{ backdropFilter: 'blur(3px)', backgroundColor: 'rgba(15, 23, 42, 0.45)' }} onClick={() => setShowPayModal(false)}>
          <div 
            className="modal-content" 
            style={{ 
              maxWidth: '420px', 
              borderRadius: '16px', 
              padding: '18px 20px', 
              boxShadow: '0 25px 50px -12px rgba(15, 23, 42, 0.25)',
              border: 'none',
              animation: 'modalSlideIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
            }} 
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '12px', borderBottom: '1px solid #f1f5f9' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '30px', height: '30px', borderRadius: '8px', backgroundColor: '#f0fdf4', color: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <DollarSign size={16} />
                </div>
                <div>
                  <h2 style={{ fontSize: '15px', fontWeight: 800, margin: 0, color: '#0f172a' }}>Record Payment</h2>
                  <div style={{ fontSize: '11px', color: '#64748b' }}>{selectedCustomer?.name}</div>
                </div>
              </div>
              <button onClick={() => setShowPayModal(false)} style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '20px', cursor: 'pointer' }}>×</button>
            </div>

            <form onSubmit={handlePaySubmit} style={{ marginTop: '14px' }}>
              <div style={{ padding: '10px 12px', backgroundColor: '#fef2f2', borderRadius: '8px', marginBottom: '12px', border: '1px solid #fecaca' }}>
                <div style={{ fontSize: '10.5px', color: '#991b1b', fontWeight: 700, textTransform: 'uppercase' }}>Current Outstanding Balance:</div>
                <div style={{ fontSize: '20px', fontWeight: 900, color: '#dc2626', fontFamily: 'monospace', marginTop: '1px' }}>
                  ₹ {(selectedCustomer?.pending_credit || 0).toLocaleString('en-IN')}
                </div>
              </div>

              <div style={{ marginBottom: '10px' }}>
                <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                  Payment Amount (₹) *
                </label>
                <input 
                  type="number"
                  step="0.01"
                  className="form-input font-mono"
                  style={{ height: '36px', fontSize: '15px', fontWeight: 800, color: '#15803d', borderRadius: '7px', border: '1.5px solid #cbd5e1', width: '100%', padding: '0 10px' }}
                  placeholder="0.00"
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
                    style={{ height: '36px', fontSize: '12.5px', borderRadius: '7px', border: '1.5px solid #cbd5e1', width: '100%', padding: '0 8px' }}
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
                    style={{ height: '36px', fontSize: '12.5px', borderRadius: '7px', border: '1.5px solid #cbd5e1', width: '100%', padding: '0 8px' }}
                    value={payMode}
                    onChange={(e) => setPayMode(e.target.value)}
                  >
                    <option value="Cash">Cash</option>
                    <option value="UPI">UPI / GPay</option>
                    <option value="Bank Transfer">Bank Transfer / NEFT</option>
                    <option value="Cheque">Cheque</option>
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
                  style={{ height: '36px', fontSize: '12.5px', borderRadius: '7px', border: '1.5px solid #cbd5e1', width: '100%', padding: '0 10px' }}
                  placeholder="e.g. UPI-98421001 / Cheque 40182"
                  value={payRef}
                  onChange={(e) => setPayRef(e.target.value)}
                />
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                  Notes
                </label>
                <input 
                  type="text"
                  className="form-input"
                  style={{ height: '36px', fontSize: '12.5px', borderRadius: '7px', border: '1.5px solid #cbd5e1', width: '100%', padding: '0 10px' }}
                  placeholder="e.g. Balance settlement"
                  value={payNotes}
                  onChange={(e) => setPayNotes(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                <button 
                  type="button" 
                  onClick={() => setShowPayModal(false)}
                  style={{ height: '33px', padding: '0 14px', fontSize: '12px', fontWeight: 600, borderRadius: '7px', border: '1px solid #cbd5e1', backgroundColor: '#ffffff', color: '#475569', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={savingPay}
                  style={{ height: '33px', padding: '0 16px', fontSize: '12px', fontWeight: 700, borderRadius: '7px', border: 'none', backgroundColor: '#16a34a', color: '#ffffff', cursor: savingPay ? 'not-allowed' : 'pointer' }}
                >
                  {savingPay ? 'Recording...' : 'Collect & Record Payment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: ADD OUTSTANDING CREDIT / OPENING BALANCE */}
      {showCreditModal && (
        <div className="modal-overlay" style={{ backdropFilter: 'blur(3px)', backgroundColor: 'rgba(15, 23, 42, 0.45)' }} onClick={() => setShowCreditModal(false)}>
          <div 
            className="modal-content" 
            style={{ 
              maxWidth: '420px', 
              borderRadius: '16px', 
              padding: '18px 20px', 
              boxShadow: '0 25px 50px -12px rgba(15, 23, 42, 0.25)',
              border: 'none',
              animation: 'modalSlideIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
            }} 
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '12px', borderBottom: '1px solid #f1f5f9' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '30px', height: '30px', borderRadius: '8px', backgroundColor: '#fffbeb', color: '#d97706', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Plus size={16} />
                </div>
                <div>
                  <h2 style={{ fontSize: '15px', fontWeight: 800, margin: 0, color: '#0f172a' }}>Add Outstanding Credit</h2>
                  <div style={{ fontSize: '11px', color: '#64748b' }}>{selectedCustomer?.name}</div>
                </div>
              </div>
              <button onClick={() => setShowCreditModal(false)} style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '20px', cursor: 'pointer' }}>×</button>
            </div>

            <form onSubmit={handleCreditSubmit} style={{ marginTop: '14px' }}>
              <div style={{ marginBottom: '10px' }}>
                <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                  Credit Amount (₹) *
                </label>
                <input 
                  type="number"
                  step="0.01"
                  className="form-input font-mono"
                  style={{ height: '36px', fontSize: '15px', fontWeight: 800, color: '#dc2626', borderRadius: '7px', border: '1.5px solid #cbd5e1', width: '100%', padding: '0 10px' }}
                  placeholder="0.00"
                  value={creditAmount}
                  onChange={(e) => setCreditAmount(e.target.value)}
                  required
                  autoFocus
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                    Date *
                  </label>
                  <input 
                    type="date"
                    className="form-input"
                    style={{ height: '36px', fontSize: '12.5px', borderRadius: '7px', border: '1.5px solid #cbd5e1', width: '100%', padding: '0 8px' }}
                    value={creditDate}
                    onChange={(e) => setCreditDate(e.target.value)}
                    required
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                    Reference / Voucher
                  </label>
                  <input 
                    type="text"
                    className="form-input font-mono"
                    style={{ height: '36px', fontSize: '12.5px', borderRadius: '7px', border: '1.5px solid #cbd5e1', width: '100%', padding: '0 8px' }}
                    placeholder="OPENING-BAL"
                    value={creditRef}
                    onChange={(e) => setCreditRef(e.target.value)}
                  />
                </div>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                  Particulars / Description
                </label>
                <input 
                  type="text"
                  className="form-input"
                  style={{ height: '36px', fontSize: '12.5px', borderRadius: '7px', border: '1.5px solid #cbd5e1', width: '100%', padding: '0 10px' }}
                  placeholder="e.g. Opening Balance / Handover Dues"
                  value={creditNotes}
                  onChange={(e) => setCreditNotes(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                <button 
                  type="button" 
                  onClick={() => setShowCreditModal(false)}
                  style={{ height: '33px', padding: '0 14px', fontSize: '12px', fontWeight: 600, borderRadius: '7px', border: '1px solid #cbd5e1', backgroundColor: '#ffffff', color: '#475569', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={savingCredit}
                  style={{ height: '33px', padding: '0 16px', fontSize: '12px', fontWeight: 700, borderRadius: '7px', border: 'none', backgroundColor: '#d97706', color: '#ffffff', cursor: savingCredit ? 'not-allowed' : 'pointer' }}
                >
                  {savingCredit ? 'Adding...' : 'Add Outstanding Credit'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
