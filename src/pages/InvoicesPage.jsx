import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  Search, 
  Printer, 
  DollarSign, 
  Trash2, 
  Calendar, 
  Filter,
  CheckCircle2,
  Clock,
  AlertCircle,
  Download,
  Truck,
  RotateCcw,
  Eye
} from 'lucide-react';
import InvoicePrintModal from '../components/InvoicePrintModal';

export default function InvoicesPage({ onInvoiceUpdated }) {
  const [bills, setBills] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');

  // Date and vehicle filter states
  const [datePreset, setDatePreset] = useState('all'); // 'all', '1day', '1week', '1month', '1year', 'single', 'custom'
  const [singleDate, setSingleDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [fromDate, setFromDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split('T')[0];
  });
  const [toDate, setToDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [vehicleFilter, setVehicleFilter] = useState('All');

  // Print modal state
  const [selectedBill, setSelectedBill] = useState(null);
  const [showPrintModal, setShowPrintModal] = useState(false);

  // Payment modal state
  const [paymentBill, setPaymentBill] = useState(null);
  const [payAmount, setPayAmount] = useState('');
  const [payMode, setPayMode] = useState('Cash');
  const [payRef, setPayRef] = useState('');
  const [paying, setPaying] = useState(false);

  const fetchBills = async () => {
    try {
      setLoading(true);
      let url = '/api/bills';
      const params = new URLSearchParams();
      if (search.trim()) params.append('search', search.trim());
      if (statusFilter !== 'All') params.append('status', statusFilter);
      if (vehicleFilter && vehicleFilter !== 'All') params.append('vehicle', vehicleFilter);

      const todayStr = new Date().toISOString().split('T')[0];

      if (datePreset === '1day') {
        params.append('exact_date', todayStr);
      } else if (datePreset === '1week') {
        const d = new Date();
        d.setDate(d.getDate() - 7);
        params.append('from_date', d.toISOString().split('T')[0]);
        params.append('to_date', todayStr);
      } else if (datePreset === '1month') {
        const d = new Date();
        d.setDate(d.getDate() - 30);
        params.append('from_date', d.toISOString().split('T')[0]);
        params.append('to_date', todayStr);
      } else if (datePreset === '1year') {
        const d = new Date();
        d.setFullYear(d.getFullYear() - 1);
        params.append('from_date', d.toISOString().split('T')[0]);
        params.append('to_date', todayStr);
      } else if (datePreset === 'single') {
        if (singleDate) params.append('exact_date', singleDate);
      } else if (datePreset === 'custom') {
        if (fromDate) params.append('from_date', fromDate);
        if (toDate) params.append('to_date', toDate);
      }
      // 'all' passes no date parameters

      if (params.toString()) url += `?${params.toString()}`;

      const res = await fetch(url);
      const data = await res.json();
      setBills(data || []);
    } catch (err) {
      console.error('Error fetching bills:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetch('/api/vehicles')
      .then(r => r.json())
      .then(data => setVehicles(data || []))
      .catch(err => console.error('Error fetching vehicles:', err));

    fetch('/api/products')
      .then(r => r.json())
      .then(data => setProducts(data || []))
      .catch(err => console.error('Error fetching products:', err));
  }, []);

  const getCatalogBoughtRate = (bill) => {
    if (!bill) return 0;
    const matched = products.find(p => p.id === bill.product_id || (p.name && bill.product_name && p.name.trim().toLowerCase() === bill.product_name.trim().toLowerCase()));
    if (matched && Number(matched.default_bought_rate) > 0) {
      return Number(matched.default_bought_rate);
    }
    if (bill.catalog_bought_rate !== undefined && Number(bill.catalog_bought_rate) > 0) {
      return Number(bill.catalog_bought_rate);
    }
    return Number(bill.bought_price_per_unit || 0);
  };

  useEffect(() => {
    fetchBills();
  }, [statusFilter, datePreset, singleDate, fromDate, toDate, vehicleFilter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchBills();
  };

  const handleResetFilters = () => {
    setSearch('');
    setStatusFilter('All');
    setDatePreset('all');
    setVehicleFilter('All');
    setSingleDate(new Date().toISOString().split('T')[0]);
    const d = new Date();
    d.setDate(d.getDate() - 30);
    setFromDate(d.toISOString().split('T')[0]);
    setToDate(new Date().toISOString().split('T')[0]);
  };

  const hasActiveFilters = Boolean(
    search.trim() ||
    statusFilter !== 'All' ||
    datePreset !== 'all' ||
    vehicleFilter !== 'All'
  );

  const handleExportCSV = () => {
    if (!bills || bills.length === 0) {
      alert('No invoices available to export for the selected filter.');
      return;
    }

    const headers = [
      'Bill No.',
      'Date',
      'Time',
      'Customer',
      'Material',
      'Qty (Kg)',
      'Qty (Tons)',
      'Selling Rate (Rs/Ton)',
      'Catalog Bought Rate (Rs/Ton)',
      'Total Bought Cost (Rs)',
      'Before Tax (Rs)',
      '2% TDS (Rs)',
      'CGST (Rs)',
      'SGST (Rs)',
      'Total Bill Amount (Rs)',
      'Profit (Rs)',
      'Supplier',
      'Transferred Amount (Rs)',
      'Pending Balance (Rs)',
      'Vehicle No.',
      'Driver',
      'Status',
      'Payment Mode',
      'Biller Name'
    ];

    const escapeCsv = (val) => {
      if (val === null || val === undefined) return '""';
      const str = String(val).replace(/"/g, '""');
      return `"${str}"`;
    };

    const rows = bills.map((b) => {
      const isKg = b.unit?.toLowerCase() === 'kg';
      const qtyKg = isKg 
        ? Math.round(Number(b.quantity) || 0) 
        : Math.round((Number(b.quantity) || 0) * 1000);
      const qtyTons = isKg 
        ? Number(((Number(b.quantity) || 0) / 1000).toFixed(3)) 
        : (Number(b.quantity) || 0);

      const itemRate = Number(b.rate) || 0;
      const rent = Number(b.rent_transport) || 0;
      const beforeTax = (Number(b.subtotal) || (qtyTons * itemRate)) + rent;
      const tdsVal = Number(b.tds_amount) > 0 
        ? Number(b.tds_amount) 
        : Math.round((beforeTax * (Number(b.tds_rate) || 2)) / 100);
      const cgstVal = Number(b.cgst_amount) || Math.round((beforeTax * 0.09));
      const sgstVal = Number(b.sgst_amount) || Math.round((beforeTax * 0.09));
      const totalAmt = Number(b.total_amount) || (beforeTax + cgstVal + sgstVal - tdsVal);

      // Bought cost extracted from product catalog & profit: total bill amount - (tds + cgst + sgst + bought cost)
      const catalogRate = getCatalogBoughtRate(b);
      const totalBoughtCost = Math.round(qtyTons * catalogRate);
      const invoiceProfit = Math.round(totalAmt - (tdsVal + cgstVal + sgstVal + totalBoughtCost));

      const transferred = Number(b.amount_received) || 0;
      const pending = Number(b.balance_due) || Math.max(0, totalAmt - transferred);
      const resolvedDriver = b.driver_name || vehicles.find(v => (b.vehicle_id && v.id === b.vehicle_id) || (b.vehicle_number && v.vehicle_number && v.vehicle_number.replace(/\s+/g, '').toUpperCase() === b.vehicle_number.replace(/\s+/g, '').toUpperCase()))?.driver_name || '—';

      return [
        escapeCsv(b.bill_no),
        escapeCsv(b.date),
        escapeCsv(b.time || ''),
        escapeCsv(b.customer_name),
        escapeCsv(b.product_name),
        qtyKg,
        qtyTons,
        itemRate,
        catalogRate,
        totalBoughtCost,
        beforeTax,
        tdsVal,
        cgstVal,
        sgstVal,
        totalAmt,
        invoiceProfit,
        escapeCsv(b.supplier_name || 'Direct / Steel Mill'),
        transferred,
        pending,
        escapeCsv(b.vehicle_number || 'Direct'),
        escapeCsv(resolvedDriver),
        escapeCsv(b.payment_status || 'Paid'),
        escapeCsv(b.payment_mode || 'Cash'),
        escapeCsv(b.biller_name || 'Admin')
      ].join(',');
    });

    const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    const dateStr = new Date().toISOString().split('T')[0];
    const vehTag = vehicleFilter !== 'All' ? `_${vehicleFilter.replace(/\s+/g, '_')}` : '';
    link.setAttribute('download', `Jazlan_Invoices_${datePreset}${vehTag}_${dateStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleOpenPrint = (bill) => {
    setSelectedBill(bill);
    setShowPrintModal(true);
  };

  const handleOpenPayment = (bill) => {
    setPaymentBill(bill);
    setPayAmount(bill.balance_due || '');
  };

  const handlePaySubmit = async (e) => {
    e.preventDefault();
    if (!payAmount || Number(payAmount) <= 0) {
      alert('Please enter a valid payment amount');
      return;
    }

    try {
      setPaying(true);
      const res = await fetch(`/api/customers/${paymentBill.customer_id}/pay`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: Number(payAmount),
          date: new Date().toISOString().split('T')[0],
          payment_mode: payMode,
          reference_no: payRef || paymentBill.bill_no,
          notes: `Settlement towards invoice ${paymentBill.bill_no}`
        })
      });

      if (!res.ok) throw new Error('Payment failed');

      alert('Payment recorded successfully!');
      setPaymentBill(null);
      fetchBills();
      if (onInvoiceUpdated) onInvoiceUpdated();
    } catch (err) {
      alert(err.message);
    } finally {
      setPaying(false);
    }
  };

  const handleDeleteBill = async (id, billNo) => {
    if (!window.confirm(`Are you sure you want to cancel and delete bill ${billNo}?`)) return;

    try {
      const res = await fetch(`/api/bills/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setBills(bills.filter(b => b.id !== id));
        if (onInvoiceUpdated) onInvoiceUpdated();
      }
    } catch (err) {
      alert('Failed to delete bill: ' + err.message);
    }
  };

  // KPI Totals across all invoices
  const totalBillAmount = bills.reduce((sum, b) => sum + (Number(b.total_amount) || 0), 0);
  const totalReceived = bills.reduce((sum, b) => sum + (Number(b.amount_received) || 0), 0);
  const totalBalanceDue = bills.reduce((sum, b) => sum + (Number(b.balance_due) || 0), 0);
  const totalCgst = bills.reduce((sum, b) => sum + (Number(b.cgst_amount) || 0), 0);
  const totalSgst = bills.reduce((sum, b) => sum + (Number(b.sgst_amount) || 0), 0);
  const totalTds = bills.reduce((sum, b) => sum + (Number(b.tds_amount) || 0), 0);

  return (
    <div className="page-content">
      {/* KPI METRIC CARDS ON TOP */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', 
        gap: '12px', 
        marginBottom: '18px' 
      }}>
        {/* 1. TOTAL BILL AMOUNT */}
        <div className="stat-card" style={{ borderLeft: '4px solid #059669', padding: '12px 14px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
            <span style={{ fontSize: '10px', fontWeight: 800, color: '#059669', letterSpacing: '0.5px' }}>TOTAL BILL AMOUNT</span>
            <FileText size={15} color="#059669" />
          </div>
          <div style={{ fontSize: '18px', fontWeight: 800, color: '#064e3b', fontFamily: 'monospace' }}>
            ₹{totalBillAmount.toLocaleString('en-IN')}
          </div>
          <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
            {hasActiveFilters ? 'Filtered Invoices' : 'All Invoices'} ({bills.length} bills)
          </div>
        </div>

        {/* 2. TOTAL RECEIVED (TRANSFERRED AMOUNT) */}
        <div className="stat-card" style={{ borderLeft: '4px solid #0284c7', padding: '12px 14px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
            <span style={{ fontSize: '10px', fontWeight: 800, color: '#0284c7', letterSpacing: '0.5px' }}>TOTAL RECEIVED (TRANSFERRED)</span>
            <CheckCircle2 size={15} color="#0284c7" />
          </div>
          <div style={{ fontSize: '18px', fontWeight: 800, color: '#0369a1', fontFamily: 'monospace' }}>
            ₹{totalReceived.toLocaleString('en-IN')}
          </div>
          <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
            Transferred / Settled
          </div>
        </div>

        {/* 3. PENDING BALANCE */}
        <div className="stat-card" style={{ borderLeft: '4px solid #dc2626', padding: '12px 14px', backgroundColor: totalBalanceDue > 0 ? '#fffdfd' : '#ffffff' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
            <span style={{ fontSize: '10px', fontWeight: 800, color: '#dc2626', letterSpacing: '0.5px' }}>PENDING BALANCE</span>
            <AlertCircle size={15} color="#dc2626" />
          </div>
          <div style={{ fontSize: '18px', fontWeight: 800, color: '#b91c1c', fontFamily: 'monospace' }}>
            ₹{totalBalanceDue.toLocaleString('en-IN')}
          </div>
          <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
            Outstanding Credit Dues
          </div>
        </div>

        {/* 4. TOTAL CGST */}
        <div className="stat-card" style={{ borderLeft: '4px solid #4f46e5', padding: '12px 14px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
            <span style={{ fontSize: '10px', fontWeight: 800, color: '#4f46e5', letterSpacing: '0.5px' }}>TOTAL CGST</span>
            <span style={{ fontSize: '9px', fontWeight: 800, backgroundColor: '#eef2ff', color: '#4f46e5', padding: '1px 5px', borderRadius: '3px' }}>Tax</span>
          </div>
          <div style={{ fontSize: '18px', fontWeight: 800, color: '#3730a3', fontFamily: 'monospace' }}>
            ₹{totalCgst.toLocaleString('en-IN')}
          </div>
          <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
            Central GST Output
          </div>
        </div>

        {/* 5. TOTAL SGST */}
        <div className="stat-card" style={{ borderLeft: '4px solid #7c3aed', padding: '12px 14px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
            <span style={{ fontSize: '10px', fontWeight: 800, color: '#7c3aed', letterSpacing: '0.5px' }}>TOTAL SGST</span>
            <span style={{ fontSize: '9px', fontWeight: 800, backgroundColor: '#f5f3ff', color: '#7c3aed', padding: '1px 5px', borderRadius: '3px' }}>Tax</span>
          </div>
          <div style={{ fontSize: '18px', fontWeight: 800, color: '#5b21b6', fontFamily: 'monospace' }}>
            ₹{totalSgst.toLocaleString('en-IN')}
          </div>
          <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
            State GST Output
          </div>
        </div>

        {/* 6. TOTAL 2% TDS */}
        <div className="stat-card" style={{ borderLeft: '4px solid #ea580c', padding: '12px 14px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
            <span style={{ fontSize: '10px', fontWeight: 800, color: '#ea580c', letterSpacing: '0.5px' }}>TOTAL 2% TDS</span>
            <span style={{ fontSize: '9px', fontWeight: 800, backgroundColor: '#fff7ed', color: '#ea580c', padding: '1px 5px', borderRadius: '3px' }}>2%</span>
          </div>
          <div style={{ fontSize: '18px', fontWeight: 800, color: '#9a3412', fontFamily: 'monospace' }}>
            ₹{totalTds.toLocaleString('en-IN')}
          </div>
          <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
            Total TDS Withholding
          </div>
        </div>
      </div>

      {/* FILTER & SEARCH BAR */}
      <div className="card" style={{ padding: '16px 20px', marginBottom: '18px' }}>
        {/* ROW 1: SEARCH, STATUS PILLS, EXPORT CSV BUTTON */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px', marginBottom: '14px' }}>
          
          <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: '8px', flex: 1, minWidth: '280px', maxWidth: '480px' }}>
            <div style={{ position: 'relative', flex: 1 }}>
              <Search size={15} color="#94a3b8" style={{ position: 'absolute', left: '12px', top: '10px' }} />
              <input
                type="text"
                className="form-input"
                placeholder="Search Bill No, Customer, Supplier, Vehicle, Driver..."
                style={{ paddingLeft: '34px', fontSize: '12.5px', height: '34px' }}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <button type="submit" className="btn btn-secondary btn-sm" style={{ padding: '0 14px', height: '34px', fontWeight: 600 }}>
              Search
            </button>
          </form>

          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Filter size={14} color="#64748b" />
              <span style={{ fontSize: '12px', fontWeight: 700, color: '#475569' }}>Status:</span>
              {['All', 'Paid', 'Partial', 'Credit'].map((st) => (
                <button
                  key={st}
                  className={`btn btn-sm ${statusFilter === st ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ padding: '4px 10px', fontSize: '11.5px', height: '30px' }}
                  onClick={() => setStatusFilter(st)}
                >
                  {st}
                </button>
              ))}
            </div>

            <button
              type="button"
              className="btn btn-primary btn-sm"
              style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '0 14px', height: '32px', fontSize: '12px', fontWeight: 700 }}
              onClick={handleExportCSV}
              title="Download currently filtered invoice records as Excel/CSV"
            >
              <Download size={14} />
              Export CSV
            </button>
          </div>

        </div>

        {/* ROW 2: ADVANCED FILTERS (DATE PRESETS, SPECIFIC DATE / CUSTOM RANGE, VEHICLE DELIVERY, RESET) */}
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between', 
          flexWrap: 'wrap', 
          gap: '12px', 
          paddingTop: '12px', 
          borderTop: '1px solid #f1f5f9' 
        }}>
          <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
            
            {/* DATE PRESET DROPDOWN */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Calendar size={15} color="#059669" />
              <span style={{ fontSize: '12px', fontWeight: 700, color: '#334155' }}>Period:</span>
              <select
                className="form-select"
                style={{ padding: '4px 8px', fontSize: '12px', fontWeight: 600, height: '32px', width: 'auto', minWidth: '175px' }}
                value={datePreset}
                onChange={(e) => setDatePreset(e.target.value)}
                title="Select date period or custom dates"
              >
                <option value="all">Complete Ledger Records</option>
                <option value="1day">Today (1 Day)</option>
                <option value="1week">Last 7 Days (1 Week)</option>
                <option value="1month">Last 30 Days (1 Month)</option>
                <option value="1year">Last 1 Year (1 Year)</option>
                <option value="single">Particular Single Date</option>
                <option value="custom">Custom Date Range (From - To)</option>
              </select>
            </div>

            {/* IF SINGLE DATE SELECTED */}
            {datePreset === 'single' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', padding: '2px 8px', borderRadius: '4px' }}>
                <span style={{ fontSize: '11.5px', fontWeight: 700, color: '#166534' }}>Date:</span>
                <input
                  type="date"
                  className="form-input"
                  style={{ padding: '2px 6px', fontSize: '11.5px', height: '28px', width: 'auto' }}
                  value={singleDate}
                  onChange={(e) => setSingleDate(e.target.value)}
                />
              </div>
            )}

            {/* IF CUSTOM DATE RANGE SELECTED */}
            {datePreset === 'custom' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', padding: '2px 8px', borderRadius: '4px' }}>
                <span style={{ fontSize: '11.5px', fontWeight: 700, color: '#166534' }}>From:</span>
                <input
                  type="date"
                  className="form-input"
                  style={{ padding: '2px 6px', fontSize: '11.5px', height: '28px', width: 'auto' }}
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                />
                <span style={{ fontSize: '11.5px', fontWeight: 700, color: '#166534' }}>To:</span>
                <input
                  type="date"
                  className="form-input"
                  style={{ padding: '2px 6px', fontSize: '11.5px', height: '28px', width: 'auto' }}
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                />
              </div>
            )}

            {/* VEHICLE DELIVERY DROPDOWN */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Truck size={15} color="#0284c7" />
              <span style={{ fontSize: '12px', fontWeight: 700, color: '#334155' }}>Vehicle:</span>
              <select
                className="form-select"
                style={{ padding: '4px 8px', fontSize: '12px', fontWeight: 600, height: '32px', width: 'auto', minWidth: '190px' }}
                value={vehicleFilter}
                onChange={(e) => setVehicleFilter(e.target.value)}
                title="Filter invoices by delivered vehicle"
              >
                <option value="All">All Vehicles (All Deliveries)</option>
                {vehicles.map((v) => (
                  <option key={v.id} value={v.vehicle_number}>
                    {v.vehicle_number} — {v.driver_name || 'Fleet'} ({v.model_type || 'Vehicle'})
                  </option>
                ))}
              </select>
            </div>

          </div>

          {/* ACTIVE FILTER BADGE / RESET BUTTON */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {hasActiveFilters && (
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11.5px', padding: '4px 10px', height: '30px', color: '#dc2626' }}
                onClick={handleResetFilters}
                title="Clear all filters and show complete records"
              >
                <RotateCcw size={12} />
                Reset Filters
              </button>
            )}
            <span style={{ fontSize: '11.5px', color: '#64748b', fontWeight: 600 }}>
              Filtered: <strong>{bills.length}</strong> invoices
            </span>
          </div>

        </div>
      </div>

      {/* BILLS TABLE */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="card-header" style={{ padding: '16px 22px', margin: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
          <div className="card-title">
            <FileText size={18} color="#059669" />
            <span>All Issued Invoices (Starting JS001)</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '12.5px', color: '#64748b' }}>
              Showing <strong>{bills.length}</strong> invoices
            </span>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11.5px', padding: '4px 10px', fontWeight: 700 }}
              onClick={handleExportCSV}
              title="Download currently filtered invoice records as Excel/CSV"
            >
              <Download size={13} color="#059669" />
              Export CSV
            </button>
          </div>
        </div>

        <div className="table-container" style={{ border: 'none', overflowX: 'auto' }}>
          <table className="data-table" style={{ width: '100%', minWidth: '1850px' }}>
            <thead>
              <tr>
                <th style={{ whiteSpace: 'nowrap', padding: '10px 12px' }}>Bill No.</th>
                <th style={{ whiteSpace: 'nowrap', padding: '10px 12px' }}>Date & Time</th>
                <th style={{ whiteSpace: 'nowrap', padding: '10px 12px' }}>Customer</th>
                <th style={{ whiteSpace: 'nowrap', padding: '10px 12px' }}>Material</th>
                <th style={{ whiteSpace: 'nowrap', padding: '10px 12px' }}>Quantity</th>
                <th style={{ whiteSpace: 'nowrap', padding: '10px 12px', textAlign: 'right' }}>Rate (₹)</th>
                <th style={{ whiteSpace: 'nowrap', padding: '10px 12px', textAlign: 'right' }}>Bought Cost (₹)</th>
                <th style={{ whiteSpace: 'nowrap', padding: '10px 12px', textAlign: 'right' }}>Before Tax (₹)</th>
                <th style={{ whiteSpace: 'nowrap', padding: '10px 12px', textAlign: 'right' }}>2% TDS (₹)</th>
                <th style={{ whiteSpace: 'nowrap', padding: '10px 12px', textAlign: 'right' }}>CGST (₹)</th>
                <th style={{ whiteSpace: 'nowrap', padding: '10px 12px', textAlign: 'right' }}>SGST (₹)</th>
                <th style={{ whiteSpace: 'nowrap', padding: '10px 12px', textAlign: 'right' }}>Total Bill Amount (₹)</th>
                <th style={{ whiteSpace: 'nowrap', padding: '10px 12px', textAlign: 'right' }}>Profit (₹)</th>
                <th style={{ whiteSpace: 'nowrap', padding: '10px 12px' }}>Supplier</th>
                <th style={{ whiteSpace: 'nowrap', padding: '10px 12px', textAlign: 'right' }}>Transferred Amount (₹)</th>
                <th style={{ whiteSpace: 'nowrap', padding: '10px 12px', textAlign: 'right' }}>Pending Balance (₹)</th>
                <th style={{ whiteSpace: 'nowrap', padding: '10px 12px' }}>Vehicle No.</th>
                <th style={{ whiteSpace: 'nowrap', padding: '10px 12px' }}>Driver</th>
                <th style={{ whiteSpace: 'nowrap', padding: '10px 12px' }}>Status</th>
                <th style={{ whiteSpace: 'nowrap', padding: '10px 12px', textAlign: 'center' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {bills.length === 0 ? (
                <tr>
                  <td colSpan="20" style={{ textAlign: 'center', padding: '36px', color: '#94a3b8' }}>
                    {loading ? 'Loading invoices...' : 'No invoices found matching your criteria.'}
                  </td>
                </tr>
              ) : (
                bills.map((bill) => {
                  const isKg = bill.unit?.toLowerCase() === 'kg';
                  const qtyInKg = isKg 
                    ? Math.round(Number(bill.quantity) || 0) 
                    : Math.round((Number(bill.quantity) || 0) * 1000);
                  const qtyInTons = isKg 
                    ? Number(((Number(bill.quantity) || 0) / 1000).toFixed(3)) 
                    : (Number(bill.quantity) || 0);

                  const catalogRate = getCatalogBoughtRate(bill);
                  const totalBoughtCost = Math.round(qtyInTons * catalogRate);

                  const beforeTax = Math.round((Number(bill.subtotal) || 0) + (Number(bill.rent_transport) || 0));
                  const tdsVal = Number(bill.tds_amount) > 0 
                    ? Number(bill.tds_amount) 
                    : Math.round((beforeTax * (Number(bill.tds_rate) || 2)) / 100);
                  const cgstVal = Number(bill.cgst_amount) || Math.round((beforeTax * 0.09));
                  const sgstVal = Number(bill.sgst_amount) || Math.round((beforeTax * 0.09));
                  const totalAmt = Number(bill.total_amount) || (beforeTax + cgstVal + sgstVal - tdsVal);

                  // Individual invoice profit: total bill amount - (tds + cgst + sgst + bought cost)
                  const invoiceProfit = Math.round(totalAmt - (tdsVal + cgstVal + sgstVal + totalBoughtCost));

                  return (
                    <tr key={bill.id}>
                      {/* 1. BILL NO */}
                      <td style={{ whiteSpace: 'nowrap', padding: '10px 12px' }}>
                        <span 
                          className="font-mono" 
                          style={{ fontWeight: 800, color: '#059669', cursor: 'pointer', textDecoration: 'underline' }}
                          onClick={() => handleOpenPrint(bill)}
                          title="Click to Print Invoice"
                        >
                          {bill.bill_no}
                        </span>
                      </td>

                      {/* 2. DATE & TIME */}
                      <td style={{ whiteSpace: 'nowrap', padding: '10px 12px' }}>
                        <div style={{ fontSize: '12px', fontWeight: 600, color: '#0f172a' }}>{bill.date}</div>
                        <div style={{ fontSize: '11px', color: '#64748b' }}>{bill.time}</div>
                      </td>

                      {/* 3. CUSTOMER */}
                      <td style={{ whiteSpace: 'nowrap', padding: '10px 12px' }}>
                        <div style={{ fontWeight: 700, color: '#0f172a' }}>{bill.customer_name}</div>
                      </td>

                      {/* 4. MATERIAL */}
                      <td style={{ whiteSpace: 'nowrap', padding: '10px 12px' }}>
                        <div style={{ fontWeight: 700, color: '#0f172a' }}>{bill.product_name}</div>
                      </td>

                      {/* 5. QUANTITY (BOTH KGS & TONS) */}
                      <td style={{ whiteSpace: 'nowrap', padding: '10px 12px' }}>
                        <div style={{ fontSize: '12.5px', color: '#059669', fontWeight: 800, fontFamily: 'monospace' }}>
                          {qtyInKg.toLocaleString('en-IN')} kg
                        </div>
                        <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>
                          {qtyInTons} {bill.unit || 'Tons'}
                        </div>
                      </td>

                      {/* 6. RATE */}
                      <td style={{ whiteSpace: 'nowrap', padding: '10px 12px', textAlign: 'right', fontWeight: 700 }} className="font-mono">
                        ₹{(Number(bill.rate) || 0).toLocaleString('en-IN')}
                      </td>

                      {/* 7. BOUGHT COST (FROM PRODUCT CATALOG) */}
                      <td style={{ whiteSpace: 'nowrap', padding: '10px 12px', textAlign: 'right' }} className="font-mono">
                        <div style={{ fontWeight: 700, color: '#1e293b' }}>
                          ₹{totalBoughtCost.toLocaleString('en-IN')}
                        </div>
                        <div style={{ fontSize: '10.5px', color: '#64748b' }}>
                          (@ ₹{catalogRate.toLocaleString('en-IN')}/T)
                        </div>
                      </td>

                      {/* 8. BEFORE TAX */}
                      <td style={{ whiteSpace: 'nowrap', padding: '10px 12px', textAlign: 'right', fontWeight: 700, color: '#334155' }} className="font-mono">
                        ₹{beforeTax.toLocaleString('en-IN')}
                      </td>

                      {/* 9. 2% TDS */}
                      <td style={{ whiteSpace: 'nowrap', padding: '10px 12px', textAlign: 'right', color: '#ea580c', fontWeight: 700 }} className="font-mono">
                        ₹{tdsVal.toLocaleString('en-IN')}
                      </td>

                      {/* 10. CGST */}
                      <td style={{ whiteSpace: 'nowrap', padding: '10px 12px', textAlign: 'right', color: '#4f46e5', fontWeight: 700 }} className="font-mono">
                        ₹{cgstVal.toLocaleString('en-IN')}
                      </td>

                      {/* 11. SGST */}
                      <td style={{ whiteSpace: 'nowrap', padding: '10px 12px', textAlign: 'right', color: '#7c3aed', fontWeight: 700 }} className="font-mono">
                        ₹{sgstVal.toLocaleString('en-IN')}
                      </td>

                      {/* 12. TOTAL BILL AMOUNT */}
                      <td style={{ whiteSpace: 'nowrap', padding: '10px 12px', textAlign: 'right', fontWeight: 800, color: '#064e3b' }} className="font-mono">
                        ₹{totalAmt.toLocaleString('en-IN')}
                      </td>

                      {/* 13. PROFIT */}
                      <td style={{ whiteSpace: 'nowrap', padding: '10px 12px', textAlign: 'right' }} className="font-mono">
                        <span style={{ 
                          fontWeight: 800, 
                          fontSize: '12px',
                          color: invoiceProfit >= 0 ? '#15803d' : '#b91c1c',
                          backgroundColor: invoiceProfit >= 0 ? '#f0fdf4' : '#fef2f2',
                          border: `1px solid ${invoiceProfit >= 0 ? '#bbf7d0' : '#fecaca'}`,
                          padding: '3px 8px',
                          borderRadius: '5px',
                          display: 'inline-block'
                        }}>
                          {invoiceProfit >= 0 ? `+₹${invoiceProfit.toLocaleString('en-IN')}` : `-₹${Math.abs(invoiceProfit).toLocaleString('en-IN')}`}
                        </span>
                      </td>

                      {/* 14. SUPPLIER */}
                      <td style={{ whiteSpace: 'nowrap', padding: '10px 12px' }}>
                        <span style={{ fontSize: '12px', fontWeight: 600, color: '#475569' }}>
                          {bill.supplier_name || 'Direct / Internal'}
                        </span>
                      </td>

                      {/* 12. TRANSFERRED AMOUNT (RECEIVED) */}
                      <td style={{ whiteSpace: 'nowrap', padding: '10px 12px', textAlign: 'right', color: '#15803d', fontWeight: 800 }} className="font-mono">
                        <div>₹{(Number(bill.amount_received) || 0).toLocaleString('en-IN')}</div>
                        <div style={{ fontSize: '10px', color: '#64748b', fontWeight: 600 }}>{bill.payment_mode || 'Cash'}</div>
                      </td>

                      {/* 13. PENDING BALANCE */}
                      <td style={{ whiteSpace: 'nowrap', padding: '10px 12px', textAlign: 'right', color: bill.balance_due > 0 ? '#b91c1c' : '#64748b', fontWeight: 800 }} className="font-mono">
                        ₹{(Number(bill.balance_due) || 0).toLocaleString('en-IN')}
                      </td>

                      {/* 14. VEHICLE NO. */}
                      <td style={{ whiteSpace: 'nowrap', padding: '10px 12px' }}>
                        <span style={{ padding: '3px 7px', backgroundColor: '#f1f5f9', borderRadius: '4px', fontSize: '11px', fontFamily: 'monospace', fontWeight: 700, color: '#1e293b' }}>
                          {bill.vehicle_number || 'Direct'}
                        </span>
                      </td>

                      {/* 15. DRIVER */}
                      <td style={{ whiteSpace: 'nowrap', padding: '10px 12px' }}>
                        <span style={{ fontSize: '12px', color: '#334155', fontWeight: 600 }}>
                          {bill.driver_name || vehicles.find(v => (bill.vehicle_id && v.id === bill.vehicle_id) || (bill.vehicle_number && v.vehicle_number && v.vehicle_number.replace(/\s+/g, '').toUpperCase() === bill.vehicle_number.replace(/\s+/g, '').toUpperCase()))?.driver_name || '—'}
                        </span>
                      </td>

                      {/* 16. STATUS */}
                      <td style={{ whiteSpace: 'nowrap', padding: '10px 12px' }}>
                        <span className={`badge-status ${bill.payment_status === 'Paid' ? 'badge-paid' : bill.payment_status === 'Partial' ? 'badge-partial' : 'badge-credit'}`}>
                          {bill.payment_status}
                        </span>
                      </td>

                      {/* 17. ACTION */}
                      <td style={{ whiteSpace: 'nowrap', padding: '10px 12px', textAlign: 'center' }}>
                        <div style={{ display: 'inline-flex', gap: '5px' }}>
                          <button 
                            type="button"
                            className="btn btn-secondary btn-sm"
                            style={{ padding: '3px 8px', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px' }}
                            onClick={() => handleOpenPrint(bill)}
                            title="View Tax Invoice Details"
                          >
                            <Eye size={12} color="#0284c7" />
                            View
                          </button>

                          <button 
                            type="button"
                            className="btn btn-secondary btn-sm"
                            style={{ padding: '3px 8px', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px' }}
                            onClick={() => handleOpenPrint(bill)}
                            title="Print Tax Invoice"
                          >
                            <Printer size={12} color="#059669" />
                            Print
                          </button>

                          {bill.balance_due > 0 && (
                            <button 
                              className="btn btn-success btn-sm"
                              onClick={() => handleOpenPayment(bill)}
                              title="Collect Pending Payment"
                            >
                              <DollarSign size={13} />
                              Pay
                            </button>
                          )}

                          <button 
                            className="btn-veh-icon delete"
                            onClick={() => handleDeleteBill(bill.id, bill.bill_no)}
                            title="Cancel Bill"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* INVOICE PRINT MODAL */}
      {showPrintModal && selectedBill && (
        <InvoicePrintModal 
          bill={selectedBill}
          customer={{ name: selectedBill.customer_name }}
          onClose={() => setShowPrintModal(false)}
        />
      )}

      {/* RECORD PAYMENT MODAL */}
      {paymentBill && (
        <div className="modal-overlay" onClick={() => setPaymentBill(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Record Payment for {paymentBill.bill_no}</h2>
              <button className="modal-close" onClick={() => setPaymentBill(null)}>×</button>
            </div>

            <form onSubmit={handlePaySubmit}>
              <div style={{ padding: '12px', backgroundColor: '#f8fafc', borderRadius: '6px', marginBottom: '16px', fontSize: '13px' }}>
                <div>Customer: <strong>{paymentBill.customer_name}</strong></div>
                <div>Invoice Total: <strong>₹{paymentBill.total_amount.toLocaleString('en-IN')}</strong></div>
                <div style={{ color: '#b91c1c' }}>Pending Balance Due: <strong>₹{paymentBill.balance_due.toLocaleString('en-IN')}</strong></div>
              </div>

              <div className="form-group">
                <label className="form-label">Payment Amount (₹) *</label>
                <input 
                  type="number"
                  step="0.01"
                  className="form-input"
                  value={payAmount}
                  onChange={(e) => setPayAmount(e.target.value)}
                  max={paymentBill.balance_due}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Payment Mode</label>
                <select className="form-select" value={payMode} onChange={(e) => setPayMode(e.target.value)}>
                  <option value="Cash">Cash</option>
                  <option value="UPI">UPI / GPay</option>
                  <option value="Bank Transfer">Bank Transfer / NEFT</option>
                  <option value="Cheque">Cheque</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Reference / Txn ID</label>
                <input 
                  type="text"
                  className="form-input"
                  placeholder="e.g. UTR / Receipt / Cheque No"
                  value={payRef}
                  onChange={(e) => setPayRef(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setPaymentBill(null)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-success" disabled={paying}>
                  {paying ? 'Saving...' : 'Confirm Receipt'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
