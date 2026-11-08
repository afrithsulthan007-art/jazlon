import React, { useState, useEffect, useMemo } from 'react';
import { 
  Wallet,
  Plus,
  Search,
  Calendar,
  Filter,
  Fuel,
  Truck,
  Layers,
  CheckCircle2,
  AlertCircle,
  Clock,
  Trash2,
  Edit,
  Eye,
  Download,
  DollarSign,
  ArrowRight,
  TrendingDown,
  User,
  Phone,
  FileText,
  RotateCcw,
  Sparkles,
  Info,
  X
} from 'lucide-react';

export default function DailyExpensesPage({ onExpenseUpdated }) {
  const [expenses, setExpenses] = useState([]);
  const [stats, setStats] = useState({
    totalCount: 0,
    totalGiven: 0,
    totalSpent: 0,
    totalBalance: 0,
    dieselSpent: 0,
    vehicleOtherSpent: 0,
    otherSpent: 0
  });
  const [drivers, setDrivers] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [selectedDriver, setSelectedDriver] = useState('All');
  const [selectedStatus, setSelectedStatus] = useState('All');
  const [datePreset, setDatePreset] = useState('all'); // 'today' | 'yesterday' | 'week' | 'month' | 'all' | 'custom'
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);
  const [classifyingExpense, setClassifyingExpense] = useState(null);
  const [viewingExpense, setViewingExpense] = useState(null);
  const [saving, setSaving] = useState(false);

  // Form Fields
  const [formDriverName, setFormDriverName] = useState('');
  const [formDriverId, setFormDriverId] = useState(null);
  const [formDriverPhone, setFormDriverPhone] = useState('');
  const [formVehicleId, setFormVehicleId] = useState('');
  const [formVehicleNumber, setFormVehicleNumber] = useState('');
  const [formDate, setFormDate] = useState(new Date().toISOString().split('T')[0]);
  const [formGivenAmount, setFormGivenAmount] = useState('');
  const [formPaymentMode, setFormPaymentMode] = useState('Cash');
  const [formNotes, setFormNotes] = useState('');
  
  // Classification Line Items: [{ id, category, note, amount }]
  const [formItems, setFormItems] = useState([
    { id: 1, category: 'Diesel Expense', note: '', amount: '' }
  ]);

  // Quick Classify Modal Form items
  const [quickItems, setQuickItems] = useState([
    { id: 1, category: 'Diesel Expense', note: '', amount: '' }
  ]);

  // Fetch Drivers & Vehicles for selectors
  const fetchMetadata = async () => {
    try {
      const [drvRes, vehRes] = await Promise.all([
        fetch('/api/drivers').then(r => r.json()).catch(() => []),
        fetch('/api/vehicles').then(r => r.json()).catch(() => [])
      ]);
      setDrivers(drvRes || []);
      setVehicles(vehRes || []);
    } catch (err) {
      console.warn('Metadata fetch warning:', err);
    }
  };

  // Fetch Daily Expenses with current active filters
  const fetchExpenses = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();

      if (datePreset === 'today') {
        const todayStr = new Date().toISOString().split('T')[0];
        params.append('from_date', todayStr);
        params.append('to_date', todayStr);
      } else if (datePreset === 'yesterday') {
        const y = new Date();
        y.setDate(y.getDate() - 1);
        const yStr = y.toISOString().split('T')[0];
        params.append('from_date', yStr);
        params.append('to_date', yStr);
      } else if (datePreset === 'week') {
        const w = new Date();
        w.setDate(w.getDate() - 7);
        params.append('from_date', w.toISOString().split('T')[0]);
        params.append('to_date', new Date().toISOString().split('T')[0]);
      } else if (datePreset === 'month') {
        const m = new Date();
        m.setDate(1);
        params.append('from_date', m.toISOString().split('T')[0]);
        params.append('to_date', new Date().toISOString().split('T')[0]);
      } else if (datePreset === 'custom') {
        if (fromDate) params.append('from_date', fromDate);
        if (toDate) params.append('to_date', toDate);
      }

      if (selectedDriver && selectedDriver !== 'All') {
        params.append('driver', selectedDriver);
      }
      if (selectedStatus && selectedStatus !== 'All') {
        params.append('status', selectedStatus);
      }
      if (search && search.trim()) {
        params.append('search', search.trim());
      }

      const res = await fetch(`/api/daily-expenses?${params.toString()}`);
      const data = await res.json();
      setExpenses(data.expenses || []);
      if (data.stats) {
        setStats(data.stats);
      }
    } catch (err) {
      console.error('Error fetching daily expenses:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetadata();
  }, []);

  useEffect(() => {
    fetchExpenses();
  }, [datePreset, fromDate, toDate, selectedDriver, selectedStatus, search]);

  // Handle Driver Select in Add/Edit Form
  const handleDriverChange = (driverNameVal) => {
    setFormDriverName(driverNameVal);
    const matched = drivers.find(d => d.name.toLowerCase() === driverNameVal.toLowerCase());
    if (matched) {
      setFormDriverId(matched.employee_id || null);
      if (matched.phone) setFormDriverPhone(matched.phone);
      if (matched.vehicle_id) {
        setFormVehicleId(matched.vehicle_id);
        setFormVehicleNumber(matched.vehicle_number || '');
      }
    }
  };

  // Handle Vehicle Select in Add/Edit Form
  const handleVehicleChange = (vehIdVal) => {
    setFormVehicleId(vehIdVal);
    const matched = vehicles.find(v => String(v.id) === String(vehIdVal));
    if (matched) {
      setFormVehicleNumber(matched.vehicle_number);
      if (!formDriverName && matched.driver_name) {
        setFormDriverName(matched.driver_name);
        if (matched.driver_phone) setFormDriverPhone(matched.driver_phone);
      }
    } else {
      setFormVehicleNumber('');
    }
  };

  // Add Item Row in Main Form ("add option for next")
  const handleAddItemRow = (presetCategory = 'Diesel Expense') => {
    setFormItems(prev => [
      ...prev,
      { id: Date.now() + Math.random(), category: presetCategory, note: '', amount: '' }
    ]);
  };

  // Remove Item Row
  const handleRemoveItemRow = (index) => {
    setFormItems(prev => {
      const next = [...prev];
      next.splice(index, 1);
      return next.length > 0 ? next : [{ id: Date.now(), category: 'Diesel Expense', note: '', amount: '' }];
    });
  };

  // Update Item Row
  const handleItemFieldChange = (index, field, value) => {
    setFormItems(prev => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  // Calculate live sum in Add/Edit Form
  const formCalculations = useMemo(() => {
    const given = Number(formGivenAmount) || 0;
    let spent = 0;
    let diesel = 0;
    let vehOther = 0;
    let other = 0;

    for (const it of formItems) {
      const amt = Number(it.amount) || 0;
      spent += amt;
      const cat = it.category;
      if (cat.includes('Diesel')) diesel += amt;
      else if (cat.includes('Vehicle')) vehOther += amt;
      else other += amt;
    }

    const balance = given - spent;
    return { given, spent, balance, diesel, vehOther, other };
  }, [formGivenAmount, formItems]);

  // Open Add Modal
  const handleOpenAddModal = () => {
    setEditingExpense(null);
    setFormDriverName('');
    setFormDriverId(null);
    setFormDriverPhone('');
    setFormVehicleId('');
    setFormVehicleNumber('');
    setFormDate(new Date().toISOString().split('T')[0]);
    setFormGivenAmount('');
    setFormPaymentMode('Cash');
    setFormNotes('');
    setFormItems([{ id: 1, category: 'Diesel Expense', note: '', amount: '' }]);
    setShowAddModal(true);
  };

  // Open Edit Modal
  const handleOpenEditModal = (exp) => {
    setEditingExpense(exp);
    setFormDriverName(exp.driver_name || '');
    setFormDriverId(exp.driver_id || null);
    setFormVehicleId(exp.vehicle_id ? String(exp.vehicle_id) : '');
    setFormVehicleNumber(exp.vehicle_number || '');
    setFormDate(exp.expense_date || new Date().toISOString().split('T')[0]);
    setFormGivenAmount(exp.given_amount || '');
    setFormPaymentMode(exp.payment_mode || 'Cash');
    setFormNotes(exp.notes || '');

    if (exp.items && exp.items.length > 0) {
      setFormItems(exp.items.map(it => ({
        id: it.id,
        category: it.category,
        note: it.note || '',
        amount: it.amount
      })));
    } else {
      setFormItems([{ id: 1, category: 'Diesel Expense', note: '', amount: '' }]);
    }
    setShowAddModal(true);
  };

  // Save / Update Expense
  const handleSaveExpense = async (e) => {
    e.preventDefault();
    if (!formDriverName.trim()) {
      alert('Please enter or select a driver name.');
      return;
    }

    const cleanItems = formItems
      .filter(it => Number(it.amount) > 0 || (it.note && it.note.trim()))
      .map(it => ({
        category: it.category,
        note: it.note.trim(),
        amount: Number(it.amount) || 0
      }));

    const payload = {
      expense_date: formDate,
      driver_name: formDriverName.trim(),
      driver_id: formDriverId || null,
      vehicle_id: formVehicleId ? Number(formVehicleId) : null,
      vehicle_number: formVehicleNumber.trim().toUpperCase() || null,
      given_amount: Number(formGivenAmount) || 0,
      payment_mode: formPaymentMode,
      notes: formNotes.trim(),
      items: cleanItems
    };

    try {
      setSaving(true);
      const url = editingExpense ? `/api/daily-expenses/${editingExpense.id}` : '/api/daily-expenses';
      const method = editingExpense ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to save daily expense');
      }

      setShowAddModal(false);
      fetchExpenses();
      if (onExpenseUpdated) onExpenseUpdated();
    } catch (err) {
      alert(`Error: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  // Open Quick Classify Modal
  const handleOpenClassifyModal = (exp) => {
    setClassifyingExpense(exp);
    setQuickItems([{ id: 1, category: 'Diesel Expense', note: '', amount: '' }]);
  };

  // Add Item row in quick modal
  const handleAddQuickItemRow = (presetCategory = 'Diesel Expense') => {
    setQuickItems(prev => [
      ...prev,
      { id: Date.now() + Math.random(), category: presetCategory, note: '', amount: '' }
    ]);
  };

  // Remove Item in quick modal
  const handleRemoveQuickItemRow = (index) => {
    setQuickItems(prev => {
      const next = [...prev];
      next.splice(index, 1);
      return next.length > 0 ? next : [{ id: Date.now(), category: 'Diesel Expense', note: '', amount: '' }];
    });
  };

  // Update quick item field
  const handleQuickItemFieldChange = (index, field, value) => {
    setQuickItems(prev => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  // Save Quick Classification Items
  const handleSaveQuickItems = async (e) => {
    e.preventDefault();
    if (!classifyingExpense) return;

    const cleanItems = quickItems
      .filter(it => Number(it.amount) > 0)
      .map(it => ({
        category: it.category,
        note: it.note.trim(),
        amount: Number(it.amount) || 0
      }));

    if (cleanItems.length === 0) {
      alert('Please enter at least one valid expense amount.');
      return;
    }

    try {
      setSaving(true);
      const res = await fetch(`/api/daily-expenses/${classifyingExpense.id}/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: cleanItems })
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to record expense items');
      }

      setClassifyingExpense(null);
      fetchExpenses();
      if (onExpenseUpdated) onExpenseUpdated();
    } catch (err) {
      alert(`Error: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  // Delete an entire daily expense
  const handleDeleteExpense = async (id, driver) => {
    if (!window.confirm(`Are you sure you want to delete this daily expense record for ${driver}? All classified items will also be removed from accounts and profit calculations.`)) {
      return;
    }

    try {
      const res = await fetch(`/api/daily-expenses/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete daily expense');
      fetchExpenses();
      if (onExpenseUpdated) onExpenseUpdated();
    } catch (err) {
      alert(`Error: ${err.message}`);
    }
  };

  // Delete a specific line item from view modal
  const handleDeleteItem = async (expId, itemId) => {
    if (!window.confirm('Delete this line item?')) return;
    try {
      const res = await fetch(`/api/daily-expenses/${expId}/items/${itemId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete item');
      
      // Update viewing modal state
      setViewingExpense(prev => {
        if (!prev) return null;
        const remaining = (prev.items || []).filter(i => i.id !== itemId);
        const spent = remaining.reduce((s, it) => s + (Number(it.amount) || 0), 0);
        return {
          ...prev,
          items: remaining,
          spent_amount: spent,
          balance_amount: prev.given_amount - spent
        };
      });

      fetchExpenses();
      if (onExpenseUpdated) onExpenseUpdated();
    } catch (err) {
      alert(`Error: ${err.message}`);
    }
  };

  // Export Daily Expenses to CSV
  const handleExportCsv = () => {
    if (expenses.length === 0) {
      alert('No expense records to export.');
      return;
    }

    const headers = [
      'Date',
      'Driver Name',
      'Vehicle Number',
      'Given Amount (Rs)',
      'Diesel Spent (Rs)',
      'Vehicle Other Spent (Rs)',
      'Other Spent (Rs)',
      'Total Spent (Rs)',
      'Balance (Rs)',
      'Status',
      'Payment Mode',
      'Notes',
      'Classified Items Details'
    ];

    const rows = expenses.map(e => {
      const itemsStr = (e.items || [])
        .map(i => `[${i.category}: Rs.${i.amount} - ${i.note || 'N/A'}]`)
        .join('; ');

      return [
        e.expense_date,
        `"${(e.driver_name || '').replace(/"/g, '""')}"`,
        `"${(e.vehicle_number || 'N/A').replace(/"/g, '""')}"`,
        e.given_amount || 0,
        e.diesel_amount || 0,
        e.vehicle_other_amount || 0,
        e.other_amount || 0,
        e.spent_amount || 0,
        e.balance_amount || 0,
        e.status || 'Pending',
        e.payment_mode || 'Cash',
        `"${(e.notes || '').replace(/"/g, '""')}"`,
        `"${itemsStr.replace(/"/g, '""')}"`
      ].join(',');
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Daily_Expenses_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="page-container" style={{ padding: '20px 24px' }}>
      
      {/* 1. HEADER & TOP CONTROLS */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px', flexWrap: 'wrap', gap: '14px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '38px',
              height: '38px',
              borderRadius: '10px',
              backgroundColor: '#ecfdf5',
              border: '1px solid #a7f3d0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#059669'
            }}>
              <Wallet size={22} />
            </div>
            <div>
              <h1 style={{ fontSize: '22px', fontWeight: 800, color: '#0f172a', margin: 0, letterSpacing: '-0.3px' }}>
                Daily Expenses & Driver Log
              </h1>
              <p style={{ fontSize: '13px', color: '#64748b', margin: '2px 0 0 0' }}>
                Issue advances to drivers, classify multi-category expenses (Diesel, Vehicle, Other), and automatically feed into Net Profit calculations.
              </p>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            type="button"
            className="btn btn-outline btn-sm"
            onClick={handleExportCsv}
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <Download size={14} />
            Export CSV
          </button>
          
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleOpenAddModal}
            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '9px 18px', fontWeight: 700 }}
          >
            <Plus size={16} />
            + New Daily Expense
          </button>
        </div>
      </div>

      {/* 2. STATS & KPI METRIC CARDS */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
        gap: '12px',
        marginBottom: '20px'
      }}>
        {/* Total Advances Given */}
        <div className="stat-card" style={{ borderLeft: '3.5px solid #2563eb', padding: '12px 14px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
            <span style={{ fontSize: '11px', fontWeight: 800, color: '#1e40af', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
              Total Given
            </span>
            <Wallet size={15} color="#2563eb" />
          </div>
          <div style={{ fontSize: '18px', fontWeight: 800, color: '#1e40af', fontFamily: 'monospace' }}>
            ₹{Number(stats.totalGiven || 0).toLocaleString('en-IN')}
          </div>
          <div style={{ fontSize: '11px', color: '#64748b', marginTop: '3px' }}>
            {stats.totalCount || 0} driver entries issued
          </div>
        </div>

        {/* Diesel Expense */}
        <div className="stat-card" style={{ borderLeft: '3.5px solid #d97706', padding: '12px 14px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
            <span style={{ fontSize: '11px', fontWeight: 800, color: '#b45309', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
              Diesel Expense
            </span>
            <Fuel size={15} color="#d97706" />
          </div>
          <div style={{ fontSize: '18px', fontWeight: 800, color: '#b45309', fontFamily: 'monospace' }}>
            ₹{Number(stats.dieselSpent || 0).toLocaleString('en-IN')}
          </div>
          <div style={{ fontSize: '11px', color: '#64748b', marginTop: '3px' }}>
            Fuel used for trips
          </div>
        </div>

        {/* Other Vehicle Expense */}
        <div className="stat-card" style={{ borderLeft: '3.5px solid #ea580c', padding: '12px 14px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
            <span style={{ fontSize: '11px', fontWeight: 800, color: '#c2410c', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
              Vehicle Expense
            </span>
            <Truck size={15} color="#ea580c" />
          </div>
          <div style={{ fontSize: '18px', fontWeight: 800, color: '#c2410c', fontFamily: 'monospace' }}>
            ₹{Number(stats.vehicleOtherSpent || 0).toLocaleString('en-IN')}
          </div>
          <div style={{ fontSize: '11px', color: '#64748b', marginTop: '3px' }}>
            Tolls, repairs & service
          </div>
        </div>

        {/* Other General Expense */}
        <div className="stat-card" style={{ borderLeft: '3.5px solid #7c3aed', padding: '12px 14px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
            <span style={{ fontSize: '11px', fontWeight: 800, color: '#6d28d9', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
              Other Expense
            </span>
            <Layers size={15} color="#7c3aed" />
          </div>
          <div style={{ fontSize: '18px', fontWeight: 800, color: '#6d28d9', fontFamily: 'monospace' }}>
            ₹{Number(stats.otherSpent || 0).toLocaleString('en-IN')}
          </div>
          <div style={{ fontSize: '11px', color: '#64748b', marginTop: '3px' }}>
            Driver food, bata & misc
          </div>
        </div>

        {/* Total Spent / Deducted */}
        <div className="stat-card" style={{ borderLeft: '3.5px solid #dc2626', padding: '12px 14px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
            <span style={{ fontSize: '11px', fontWeight: 800, color: '#991b1b', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
              Total Classified
            </span>
            <TrendingDown size={15} color="#dc2626" />
          </div>
          <div style={{ fontSize: '18px', fontWeight: 800, color: '#991b1b', fontFamily: 'monospace' }}>
            ₹{Number(stats.totalSpent || 0).toLocaleString('en-IN')}
          </div>
          <div style={{ fontSize: '11px', color: '#64748b', marginTop: '3px' }}>
            Deducted in Net Profit
          </div>
        </div>

        {/* Unspent Cash with Drivers */}
        <div className="stat-card" style={{
          borderLeft: `3.5px solid ${stats.totalBalance >= 0 ? '#10b981' : '#f97316'}`,
          backgroundColor: stats.totalBalance >= 0 ? '#ffffff' : '#fff7ed',
          padding: '12px 14px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
            <span style={{ fontSize: '11px', fontWeight: 800, color: stats.totalBalance >= 0 ? '#065f46' : '#9a3412', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
              Remaining Balance
            </span>
            <DollarSign size={15} color={stats.totalBalance >= 0 ? '#10b981' : '#f97316'} />
          </div>
          <div style={{
            fontSize: '18px',
            fontWeight: 800,
            color: stats.totalBalance >= 0 ? '#065f46' : '#9a3412',
            fontFamily: 'monospace'
          }}>
            ₹{Number(stats.totalBalance || 0).toLocaleString('en-IN')}
          </div>
          <div style={{ fontSize: '11px', color: '#64748b', marginTop: '3px' }}>
            {stats.totalBalance >= 0 ? 'Cash currently with drivers' : 'Driver spent above advance'}
          </div>
        </div>
      </div>

      {/* 3. FILTER BAR */}
      <div style={{
        backgroundColor: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '10px',
        padding: '14px 16px',
        marginBottom: '20px',
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '12px'
      }}>
        {/* Left: Quick Date Presets & Custom Range */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '12px', fontWeight: 700, color: '#475569', marginRight: '4px' }}>
            Period:
          </span>
          {[
            { id: 'all', label: 'All Time' },
            { id: 'today', label: 'Today' },
            { id: 'yesterday', label: 'Yesterday' },
            { id: 'week', label: 'Last 7 Days' },
            { id: 'month', label: 'This Month' },
            { id: 'custom', label: 'Custom' }
          ].map(p => (
            <button
              key={p.id}
              type="button"
              onClick={() => setDatePreset(p.id)}
              style={{
                padding: '4px 10px',
                borderRadius: '6px',
                fontSize: '11.5px',
                fontWeight: 600,
                border: '1px solid',
                cursor: 'pointer',
                backgroundColor: datePreset === p.id ? '#059669' : '#f8fafc',
                color: datePreset === p.id ? '#ffffff' : '#475569',
                borderColor: datePreset === p.id ? '#059669' : '#cbd5e1'
              }}
            >
              {p.label}
            </button>
          ))}

          {datePreset === 'custom' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginLeft: '6px' }}>
              <input
                type="date"
                value={fromDate}
                onChange={e => setFromDate(e.target.value)}
                style={{ padding: '3px 8px', fontSize: '11.5px', borderRadius: '5px', border: '1px solid #cbd5e1' }}
              />
              <span style={{ fontSize: '11px', color: '#94a3b8' }}>to</span>
              <input
                type="date"
                value={toDate}
                onChange={e => setToDate(e.target.value)}
                style={{ padding: '3px 8px', fontSize: '11.5px', borderRadius: '5px', border: '1px solid #cbd5e1' }}
              />
            </div>
          )}
        </div>

        {/* Right: Driver, Status & Search */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          {/* Driver Filter */}
          <select
            value={selectedDriver}
            onChange={e => setSelectedDriver(e.target.value)}
            style={{
              padding: '6px 10px',
              fontSize: '12px',
              borderRadius: '6px',
              border: '1px solid #cbd5e1',
              backgroundColor: '#ffffff',
              color: '#334155',
              fontWeight: 600
            }}
          >
            <option value="All">All Drivers</option>
            {drivers.map((d, i) => (
              <option key={i} value={d.name}>{d.name}</option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={selectedStatus}
            onChange={e => setSelectedStatus(e.target.value)}
            style={{
              padding: '6px 10px',
              fontSize: '12px',
              borderRadius: '6px',
              border: '1px solid #cbd5e1',
              backgroundColor: '#ffffff',
              color: '#334155',
              fontWeight: 600
            }}
          >
            <option value="All">All Statuses</option>
            <option value="Pending">Pending (Not Classified)</option>
            <option value="Partial">Partially Classified</option>
            <option value="Classified">Fully Classified</option>
            <option value="Over-Spent">Over-Spent</option>
          </select>

          {/* Search Box */}
          <div style={{ position: 'relative' }}>
            <Search size={14} color="#94a3b8" style={{ position: 'absolute', left: '9px', top: '9px' }} />
            <input
              type="text"
              placeholder="Search driver, vehicle..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{
                padding: '6px 10px 6px 30px',
                fontSize: '12px',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                width: '180px'
              }}
            />
          </div>
        </div>
      </div>

      {/* 4. EXPENSE LIST TABLE */}
      <div style={{
        backgroundColor: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '10px',
        overflow: 'hidden',
        boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
      }}>
        {loading ? (
          <div style={{ padding: '60px 20px', textAlign: 'center', color: '#94a3b8' }}>
            <RotateCcw className="animate-spin" size={24} style={{ margin: '0 auto 8px auto', opacity: 0.6 }} />
            <div>Loading daily driver expenses...</div>
          </div>
        ) : expenses.length === 0 ? (
          <div style={{ padding: '60px 20px', textAlign: 'center' }}>
            <Wallet size={36} color="#cbd5e1" style={{ margin: '0 auto 12px auto' }} />
            <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
              No daily expenses found
            </h3>
            <p style={{ fontSize: '12.5px', color: '#64748b', maxWidth: '420px', margin: '0 auto 16px auto' }}>
              Issue a daily advance to a driver, record fuel or road expenses, and track balances easily.
            </p>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={handleOpenAddModal}
            >
              <Plus size={14} />
              + Issue Daily Expense
            </button>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '12.5px' }}>
              <thead>
                <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', fontWeight: 700 }}>
                  <th style={{ padding: '12px 16px' }}>Date</th>
                  <th style={{ padding: '12px 14px' }}>Driver & Vehicle</th>
                  <th style={{ padding: '12px 14px', textAlign: 'right' }}>Given Amount</th>
                  <th style={{ padding: '12px 14px' }}>Classified Breakdown</th>
                  <th style={{ padding: '12px 14px', textAlign: 'right' }}>Total Spent</th>
                  <th style={{ padding: '12px 14px', textAlign: 'right' }}>Balance</th>
                  <th style={{ padding: '12px 14px', textAlign: 'center' }}>Status</th>
                  <th style={{ padding: '12px 16px', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {expenses.map((exp, index) => {
                  const isClassified = exp.status === 'Classified';
                  const isPending = exp.status === 'Pending';
                  const isOver = exp.status === 'Over-Spent';
                  const isPartial = exp.status === 'Partial';

                  return (
                    <tr
                      key={exp.id || index}
                      style={{
                        borderBottom: '1px solid #f1f5f9',
                        transition: 'background-color 0.15s ease',
                        backgroundColor: index % 2 === 0 ? '#ffffff' : '#fafcfb'
                      }}
                    >
                      {/* Date */}
                      <td style={{ padding: '12px 16px', whiteSpace: 'nowrap', fontWeight: 600, color: '#334155' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Calendar size={13} color="#94a3b8" />
                          <span>{exp.expense_date}</span>
                        </div>
                      </td>

                      {/* Driver & Vehicle */}
                      <td style={{ padding: '12px 14px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div style={{
                            width: '28px',
                            height: '28px',
                            borderRadius: '50%',
                            backgroundColor: '#eff6ff',
                            color: '#2563eb',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 700,
                            fontSize: '11px',
                            flexShrink: 0
                          }}>
                            {(exp.driver_name || 'D').slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <div style={{ fontWeight: 700, color: '#0f172a' }}>
                              {exp.driver_name}
                            </div>
                            <div style={{ fontSize: '11px', color: '#64748b', display: 'flex', alignItems: 'center', gap: '6px', marginTop: '1px' }}>
                              {exp.vehicle_number ? (
                                <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                                  <Truck size={10} color="#059669" />
                                  <strong>{exp.vehicle_number}</strong>
                                </span>
                              ) : (
                                <span style={{ color: '#94a3b8' }}>No vehicle linked</span>
                              )}
                              <span>• {exp.payment_mode || 'Cash'}</span>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Given Amount */}
                      <td style={{ padding: '12px 14px', textAlign: 'right', fontWeight: 700, color: '#1e40af', fontFamily: 'monospace', fontSize: '13.5px' }}>
                        ₹{Number(exp.given_amount || 0).toLocaleString('en-IN')}
                      </td>

                      {/* Classified Breakdown Chips */}
                      <td style={{ padding: '12px 14px' }}>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                          {Number(exp.diesel_amount) > 0 && (
                            <span style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              padding: '2px 7px',
                              borderRadius: '4px',
                              fontSize: '11px',
                              fontWeight: 700,
                              backgroundColor: '#fffbeb',
                              color: '#b45309',
                              border: '1px solid #fde68a'
                            }}>
                              <Fuel size={10} />
                              Diesel: ₹{Number(exp.diesel_amount).toLocaleString('en-IN')}
                            </span>
                          )}

                          {Number(exp.vehicle_other_amount) > 0 && (
                            <span style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              padding: '2px 7px',
                              borderRadius: '4px',
                              fontSize: '11px',
                              fontWeight: 700,
                              backgroundColor: '#fff7ed',
                              color: '#c2410c',
                              border: '1px solid #fed7aa'
                            }}>
                              <Truck size={10} />
                              Vehicle: ₹{Number(exp.vehicle_other_amount).toLocaleString('en-IN')}
                            </span>
                          )}

                          {Number(exp.other_amount) > 0 && (
                            <span style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              padding: '2px 7px',
                              borderRadius: '4px',
                              fontSize: '11px',
                              fontWeight: 700,
                              backgroundColor: '#f5f3ff',
                              color: '#6d28d9',
                              border: '1px solid #ddd6fe'
                            }}>
                              <Layers size={10} />
                              Other: ₹{Number(exp.other_amount).toLocaleString('en-IN')}
                            </span>
                          )}

                          {(!exp.items || exp.items.length === 0) && (
                            <span style={{ fontSize: '11.5px', color: '#94a3b8', fontStyle: 'italic' }}>
                              Not yet classified
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Total Spent */}
                      <td style={{ padding: '12px 14px', textAlign: 'right', fontWeight: 700, color: '#991b1b', fontFamily: 'monospace' }}>
                        ₹{Number(exp.spent_amount || 0).toLocaleString('en-IN')}
                      </td>

                      {/* Balance Remaining */}
                      <td style={{ padding: '12px 14px', textAlign: 'right', fontWeight: 800, fontFamily: 'monospace' }}>
                        <span style={{
                          color: exp.balance_amount === 0 ? '#059669' : exp.balance_amount > 0 ? '#0284c7' : '#dc2626'
                        }}>
                          ₹{Number(exp.balance_amount || 0).toLocaleString('en-IN')}
                        </span>
                      </td>

                      {/* Status */}
                      <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                        <span style={{
                          display: 'inline-block',
                          padding: '3px 8px',
                          borderRadius: '12px',
                          fontSize: '10.5px',
                          fontWeight: 700,
                          backgroundColor: isClassified ? '#ecfdf5' : isPending ? '#fef3c7' : isOver ? '#fee2e2' : '#e0f2fe',
                          color: isClassified ? '#065f46' : isPending ? '#92400e' : isOver ? '#991b1b' : '#0369a1',
                          border: `1px solid ${isClassified ? '#a7f3d0' : isPending ? '#fcd34d' : isOver ? '#fca5a5' : '#bae6fd'}`
                        }}>
                          {exp.status || 'Pending'}
                        </span>
                      </td>

                      {/* Actions */}
                      <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '6px' }}>
                          {/* Classify / Add Next Option Button */}
                          <button
                            type="button"
                            onClick={() => handleOpenClassifyModal(exp)}
                            className="btn btn-outline btn-sm"
                            style={{
                              padding: '3px 8px',
                              fontSize: '11px',
                              fontWeight: 700,
                              borderColor: '#059669',
                              color: '#059669',
                              backgroundColor: '#ecfdf5',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}
                            title="Classify or add next expense items for this advance"
                          >
                            <Plus size={12} />
                            Classify
                          </button>

                          {/* View Breakdown */}
                          <button
                            type="button"
                            onClick={() => setViewingExpense(exp)}
                            style={{
                              padding: '4px',
                              borderRadius: '4px',
                              border: '1px solid #cbd5e1',
                              backgroundColor: '#f8fafc',
                              color: '#475569',
                              cursor: 'pointer'
                            }}
                            title="View all items breakdown"
                          >
                            <Eye size={13} />
                          </button>

                          {/* Edit Full Record */}
                          <button
                            type="button"
                            onClick={() => handleOpenEditModal(exp)}
                            style={{
                              padding: '4px',
                              borderRadius: '4px',
                              border: '1px solid #cbd5e1',
                              backgroundColor: '#f8fafc',
                              color: '#475569',
                              cursor: 'pointer'
                            }}
                            title="Edit Record"
                          >
                            <Edit size={13} />
                          </button>

                          {/* Delete */}
                          <button
                            type="button"
                            onClick={() => handleDeleteExpense(exp.id, exp.driver_name)}
                            style={{
                              padding: '4px',
                              borderRadius: '4px',
                              border: '1px solid #fca5a5',
                              backgroundColor: '#fef2f2',
                              color: '#dc2626',
                              cursor: 'pointer'
                            }}
                            title="Delete Record"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 5. ADD / EDIT DAILY EXPENSE MODAL */}
      {showAddModal && (
        <div className="modal-backdrop" style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.65)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 100,
          padding: '16px'
        }}>
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '14px',
            width: '100%',
            maxWidth: '740px',
            maxHeight: '90vh',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2)'
          }}>
            {/* Modal Header */}
            <div style={{
              padding: '16px 20px',
              borderBottom: '1px solid #e2e8f0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              backgroundColor: '#f8fafc'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Wallet size={18} color="#059669" />
                <h2 style={{ fontSize: '16px', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                  {editingExpense ? 'Edit Daily Driver Expense' : 'Issue Daily Expense / Driver Advance'}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                style={{ border: 'none', background: 'none', color: '#94a3b8', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body Form */}
            <form onSubmit={handleSaveExpense} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflowY: 'auto' }}>
              <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                
                {/* Section 1: Advance Details */}
                <div style={{
                  padding: '14px',
                  backgroundColor: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '10px'
                }}>
                  <div style={{ fontSize: '12px', fontWeight: 800, color: '#334155', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                    1. Driver & Given Amount Handover
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
                    {/* Date */}
                    <div>
                      <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                        Date *
                      </label>
                      <input
                        type="date"
                        required
                        value={formDate}
                        onChange={e => setFormDate(e.target.value)}
                        className="form-control"
                        style={{ width: '100%', padding: '7px 10px', fontSize: '12.5px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                      />
                    </div>

                    {/* Driver Name with suggestions */}
                    <div>
                      <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                        Driver Name *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="Select or type driver name..."
                        list="registered-drivers-list"
                        value={formDriverName}
                        onChange={e => handleDriverChange(e.target.value)}
                        style={{ width: '100%', padding: '7px 10px', fontSize: '12.5px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                      />
                      <datalist id="registered-drivers-list">
                        {drivers.map((d, i) => (
                          <option key={i} value={d.name}>
                            {d.phone ? `(${d.phone})` : ''} {d.vehicle_number ? `• Truck ${d.vehicle_number}` : ''}
                          </option>
                        ))}
                      </datalist>
                    </div>

                    {/* Vehicle Selection (Optional) */}
                    <div>
                      <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                        Vehicle (Optional)
                      </label>
                      <select
                        value={formVehicleId}
                        onChange={e => handleVehicleChange(e.target.value)}
                        style={{ width: '100%', padding: '7px 10px', fontSize: '12.5px', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: '#ffffff' }}
                      >
                        <option value="">-- No Specific Vehicle --</option>
                        {vehicles.map(v => (
                          <option key={v.id} value={v.id}>
                            {v.vehicle_number} ({v.model_type || 'Truck'})
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Given Amount (Fully Given Upfront) */}
                    <div>
                      <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 700, color: '#1e40af', marginBottom: '4px' }}>
                        Given Amount (Full Advance ₹) *
                      </label>
                      <div style={{ position: 'relative' }}>
                        <span style={{ position: 'absolute', left: '10px', top: '7px', fontWeight: 800, color: '#2563eb' }}>₹</span>
                        <input
                          type="number"
                          step="any"
                          required
                          placeholder="e.g. 5000"
                          value={formGivenAmount}
                          onChange={e => setFormGivenAmount(e.target.value)}
                          style={{
                            width: '100%',
                            padding: '7px 10px 7px 24px',
                            fontSize: '14px',
                            fontWeight: 800,
                            borderRadius: '6px',
                            border: '1.5px solid #3b82f6',
                            color: '#1e40af',
                            fontFamily: 'monospace'
                          }}
                        />
                      </div>
                      <div style={{ display: 'flex', gap: '4px', marginTop: '4px' }}>
                        {[1000, 2000, 3000, 5000, 10000].map(amt => (
                          <button
                            key={amt}
                            type="button"
                            onClick={() => setFormGivenAmount(amt)}
                            style={{
                              padding: '1px 5px',
                              fontSize: '10px',
                              borderRadius: '4px',
                              border: '1px solid #bfdbfe',
                              backgroundColor: '#eff6ff',
                              color: '#1d4ed8',
                              cursor: 'pointer'
                            }}
                          >
                            ₹{amt}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Payment Mode */}
                    <div>
                      <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                        Payment Mode
                      </label>
                      <select
                        value={formPaymentMode}
                        onChange={e => setFormPaymentMode(e.target.value)}
                        style={{ width: '100%', padding: '7px 10px', fontSize: '12.5px', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: '#ffffff' }}
                      >
                        <option value="Cash">Cash</option>
                        <option value="UPI / Online">UPI / Online / GPay</option>
                        <option value="Bank Transfer">Bank Transfer</option>
                      </select>
                    </div>

                    {/* Purpose / Overall Note */}
                    <div>
                      <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                        Purpose / Note
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Trichy plant round-trip"
                        value={formNotes}
                        onChange={e => setFormNotes(e.target.value)}
                        style={{ width: '100%', padding: '7px 10px', fontSize: '12.5px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                      />
                    </div>
                  </div>
                </div>

                {/* Section 2: Expense Classification (Select Category, Note, Amount then add option for next) */}
                <div style={{
                  padding: '14px',
                  backgroundColor: '#ffffff',
                  border: '1.5px solid #059669',
                  borderRadius: '10px',
                  boxShadow: '0 2px 4px rgba(5,150,105,0.04)'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap', gap: '8px' }}>
                    <div>
                      <span style={{ fontSize: '12.5px', fontWeight: 800, color: '#065f46', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                        2. Classify Expenses (Breakdown of Amount Spent)
                      </span>
                      <p style={{ fontSize: '11.5px', color: '#64748b', margin: '2px 0 0 0' }}>
                        Select category, enter what they used it for, enter amount, then use <strong>"+ Add Option for Next"</strong> to add multiple expenses.
                      </p>
                    </div>

                    {/* Quick Category Add Shortcuts */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>Quick Add:</span>
                      <button
                        type="button"
                        onClick={() => handleAddItemRow('Diesel Expense')}
                        style={{
                          padding: '3px 8px',
                          borderRadius: '4px',
                          fontSize: '11px',
                          fontWeight: 700,
                          backgroundColor: '#fffbeb',
                          color: '#b45309',
                          border: '1px solid #fde68a',
                          cursor: 'pointer'
                        }}
                      >
                        + Diesel
                      </button>
                      <button
                        type="button"
                        onClick={() => handleAddItemRow('Other Vehicle Expense')}
                        style={{
                          padding: '3px 8px',
                          borderRadius: '4px',
                          fontSize: '11px',
                          fontWeight: 700,
                          backgroundColor: '#fff7ed',
                          color: '#c2410c',
                          border: '1px solid #fed7aa',
                          cursor: 'pointer'
                        }}
                      >
                        + Vehicle Exp
                      </button>
                      <button
                        type="button"
                        onClick={() => handleAddItemRow('Other')}
                        style={{
                          padding: '3px 8px',
                          borderRadius: '4px',
                          fontSize: '11px',
                          fontWeight: 700,
                          backgroundColor: '#f5f3ff',
                          color: '#6d28d9',
                          border: '1px solid #ddd6fe',
                          cursor: 'pointer'
                        }}
                      >
                        + Other
                      </button>
                    </div>
                  </div>

                  {/* Items List */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '12px' }}>
                    {formItems.map((item, idx) => (
                      <div
                        key={item.id || idx}
                        style={{
                          display: 'grid',
                          gridTemplateColumns: '170px 1fr 130px 36px',
                          gap: '8px',
                          alignItems: 'center',
                          padding: '6px 8px',
                          backgroundColor: '#f8fafc',
                          borderRadius: '6px',
                          border: '1px solid #e2e8f0'
                        }}
                      >
                        {/* 1. Category */}
                        <div>
                          <select
                            value={item.category}
                            onChange={e => handleItemFieldChange(idx, 'category', e.target.value)}
                            style={{
                              width: '100%',
                              padding: '6px 8px',
                              fontSize: '12px',
                              borderRadius: '5px',
                              border: '1px solid #cbd5e1',
                              fontWeight: 700,
                              backgroundColor: item.category.includes('Diesel') ? '#fffbeb' : item.category.includes('Vehicle') ? '#fff7ed' : '#f5f3ff',
                              color: item.category.includes('Diesel') ? '#b45309' : item.category.includes('Vehicle') ? '#c2410c' : '#6d28d9'
                            }}
                          >
                            <option value="Diesel Expense">Diesel Expense</option>
                            <option value="Other Vehicle Expense">Other Vehicle Expense</option>
                            <option value="Other">Other</option>
                          </select>
                        </div>

                        {/* 2. Note / Description */}
                        <div>
                          <input
                            type="text"
                            placeholder="What was it used for? (e.g. 40L diesel, toll plaza, driver food)"
                            value={item.note}
                            onChange={e => handleItemFieldChange(idx, 'note', e.target.value)}
                            style={{
                              width: '100%',
                              padding: '6px 10px',
                              fontSize: '12px',
                              borderRadius: '5px',
                              border: '1px solid #cbd5e1'
                            }}
                          />
                        </div>

                        {/* 3. Amount */}
                        <div>
                          <div style={{ position: 'relative' }}>
                            <span style={{ position: 'absolute', left: '8px', top: '5px', fontSize: '11px', color: '#64748b', fontWeight: 700 }}>₹</span>
                            <input
                              type="number"
                              step="any"
                              placeholder="0.00"
                              value={item.amount}
                              onChange={e => handleItemFieldChange(idx, 'amount', e.target.value)}
                              style={{
                                width: '100%',
                                padding: '5px 8px 5px 20px',
                                fontSize: '13px',
                                fontWeight: 700,
                                borderRadius: '5px',
                                border: '1px solid #cbd5e1',
                                fontFamily: 'monospace',
                                textAlign: 'right'
                              }}
                            />
                          </div>
                        </div>

                        {/* 4. Remove Button */}
                        <div style={{ textAlign: 'center' }}>
                          <button
                            type="button"
                            onClick={() => handleRemoveItemRow(idx)}
                            style={{
                              border: 'none',
                              background: 'none',
                              color: '#94a3b8',
                              cursor: 'pointer',
                              padding: '4px'
                            }}
                            title="Remove this item"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* "+ Add Option for Next" Button */}
                  <div style={{ marginTop: '12px' }}>
                    <button
                      type="button"
                      onClick={() => handleAddItemRow('Diesel Expense')}
                      className="btn btn-outline"
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '6px 14px',
                        fontSize: '12px',
                        fontWeight: 700,
                        borderColor: '#059669',
                        color: '#059669',
                        backgroundColor: '#ecfdf5'
                      }}
                    >
                      <Plus size={14} />
                      + Add Option for Next
                    </button>
                  </div>

                  {/* Live Breakdown & Balance Indicator */}
                  <div style={{
                    marginTop: '14px',
                    padding: '10px 14px',
                    backgroundColor: '#f8fafc',
                    border: '1px solid #cbd5e1',
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '10px'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
                      <div style={{ fontSize: '12px', color: '#475569' }}>
                        Given: <strong style={{ color: '#1e40af', fontFamily: 'monospace' }}>₹{formCalculations.given.toLocaleString('en-IN')}</strong>
                      </div>
                      <div style={{ fontSize: '12px', color: '#475569' }}>
                        Total Spent: <strong style={{ color: '#991b1b', fontFamily: 'monospace' }}>₹{formCalculations.spent.toLocaleString('en-IN')}</strong>
                      </div>
                      <div style={{ fontSize: '12px', color: '#475569' }}>
                        Remaining Balance: <strong style={{
                          color: formCalculations.balance === 0 ? '#059669' : formCalculations.balance > 0 ? '#0284c7' : '#dc2626',
                          fontFamily: 'monospace'
                        }}>
                          ₹{formCalculations.balance.toLocaleString('en-IN')}
                        </strong>
                      </div>
                    </div>

                    <div style={{ fontSize: '11px', fontWeight: 700 }}>
                      {formCalculations.spent === 0 ? (
                        <span style={{ color: '#b45309' }}>⏳ Advance Given (Not Classified Yet)</span>
                      ) : formCalculations.balance === 0 ? (
                        <span style={{ color: '#059669' }}>✓ 100% Fully Classified</span>
                      ) : formCalculations.balance > 0 ? (
                        <span style={{ color: '#0284c7' }}>ℹ ₹{formCalculations.balance.toLocaleString('en-IN')} cash remaining with driver</span>
                      ) : (
                        <span style={{ color: '#dc2626' }}>⚠ Over-spent by ₹{Math.abs(formCalculations.balance).toLocaleString('en-IN')}</span>
                      )}
                    </div>
                  </div>
                </div>

              </div>

              {/* Modal Footer */}
              <div style={{
                padding: '12px 20px',
                borderTop: '1px solid #e2e8f0',
                backgroundColor: '#f8fafc',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-end',
                gap: '10px'
              }}>
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => setShowAddModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="btn btn-primary"
                  style={{ minWidth: '140px', fontWeight: 700 }}
                >
                  {saving ? 'Saving...' : editingExpense ? 'Update Expense' : 'Save & Record Expense'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 6. QUICK CLASSIFY / ADD ITEMS MODAL (FOR EXISTING ADVANCES) */}
      {classifyingExpense && (
        <div className="modal-backdrop" style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.65)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 100,
          padding: '16px'
        }}>
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '14px',
            width: '100%',
            maxWidth: '680px',
            maxHeight: '90vh',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2)'
          }}>
            <div style={{
              padding: '16px 20px',
              borderBottom: '1px solid #e2e8f0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              backgroundColor: '#f8fafc'
            }}>
              <div>
                <h2 style={{ fontSize: '16px', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                  Classify Expenses for {classifyingExpense.driver_name}
                </h2>
                <div style={{ fontSize: '11.5px', color: '#64748b', marginTop: '2px' }}>
                  Date: {classifyingExpense.expense_date} {classifyingExpense.vehicle_number ? `• Truck ${classifyingExpense.vehicle_number}` : ''}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setClassifyingExpense(null)}
                style={{ border: 'none', background: 'none', color: '#94a3b8', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveQuickItems} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflowY: 'auto' }}>
              <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                
                {/* Balance Summary Header */}
                <div style={{
                  padding: '12px 14px',
                  backgroundColor: '#eff6ff',
                  border: '1px solid #bfdbfe',
                  borderRadius: '8px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <div>
                    <span style={{ fontSize: '11px', color: '#1e40af', fontWeight: 700 }}>Total Advance Given:</span>
                    <div style={{ fontSize: '16px', fontWeight: 800, color: '#1e40af', fontFamily: 'monospace' }}>
                      ₹{Number(classifyingExpense.given_amount || 0).toLocaleString('en-IN')}
                    </div>
                  </div>
                  <div>
                    <span style={{ fontSize: '11px', color: '#475569', fontWeight: 700 }}>Previously Classified:</span>
                    <div style={{ fontSize: '16px', fontWeight: 800, color: '#991b1b', fontFamily: 'monospace' }}>
                      ₹{Number(classifyingExpense.spent_amount || 0).toLocaleString('en-IN')}
                    </div>
                  </div>
                  <div>
                    <span style={{ fontSize: '11px', color: '#065f46', fontWeight: 700 }}>Remaining Cash:</span>
                    <div style={{ fontSize: '16px', fontWeight: 800, color: '#065f46', fontFamily: 'monospace' }}>
                      ₹{Number(classifyingExpense.balance_amount || 0).toLocaleString('en-IN')}
                    </div>
                  </div>
                </div>

                {/* Existing Items Already Recorded */}
                {classifyingExpense.items && classifyingExpense.items.length > 0 && (
                  <div>
                    <div style={{ fontSize: '11.5px', fontWeight: 700, color: '#475569', marginBottom: '6px' }}>
                      Existing Line Items:
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      {classifyingExpense.items.map((it, idx) => (
                        <div key={idx} style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '6px 10px',
                          backgroundColor: '#f8fafc',
                          border: '1px solid #e2e8f0',
                          borderRadius: '6px',
                          fontSize: '12px'
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{
                              fontWeight: 700,
                              fontSize: '11px',
                              padding: '1px 6px',
                              borderRadius: '4px',
                              backgroundColor: it.category.includes('Diesel') ? '#fef3c7' : it.category.includes('Vehicle') ? '#ffedd5' : '#ede9fe',
                              color: it.category.includes('Diesel') ? '#b45309' : it.category.includes('Vehicle') ? '#c2410c' : '#6d28d9'
                            }}>
                              {it.category}
                            </span>
                            <span style={{ color: '#334155' }}>{it.note || 'No note'}</span>
                          </div>
                          <strong style={{ fontFamily: 'monospace', color: '#0f172a' }}>
                            ₹{Number(it.amount || 0).toLocaleString('en-IN')}
                          </strong>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* New Items to Classify */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <span style={{ fontSize: '12px', fontWeight: 800, color: '#059669' }}>
                      Add New Expense Items:
                    </span>
                    <div style={{ display: 'flex', gap: '4px' }}>
                      <button
                        type="button"
                        onClick={() => handleAddQuickItemRow('Diesel Expense')}
                        style={{ padding: '2px 6px', fontSize: '10px', fontWeight: 700, borderRadius: '4px', border: '1px solid #fde68a', backgroundColor: '#fffbeb', color: '#b45309', cursor: 'pointer' }}
                      >
                        + Diesel
                      </button>
                      <button
                        type="button"
                        onClick={() => handleAddQuickItemRow('Other Vehicle Expense')}
                        style={{ padding: '2px 6px', fontSize: '10px', fontWeight: 700, borderRadius: '4px', border: '1px solid #fed7aa', backgroundColor: '#fff7ed', color: '#c2410c', cursor: 'pointer' }}
                      >
                        + Vehicle
                      </button>
                      <button
                        type="button"
                        onClick={() => handleAddQuickItemRow('Other')}
                        style={{ padding: '2px 6px', fontSize: '10px', fontWeight: 700, borderRadius: '4px', border: '1px solid #ddd6fe', backgroundColor: '#f5f3ff', color: '#6d28d9', cursor: 'pointer' }}
                      >
                        + Other
                      </button>
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {quickItems.map((item, idx) => (
                      <div
                        key={item.id || idx}
                        style={{
                          display: 'grid',
                          gridTemplateColumns: '160px 1fr 120px 32px',
                          gap: '8px',
                          alignItems: 'center',
                          padding: '6px 8px',
                          backgroundColor: '#f0fdf4',
                          borderRadius: '6px',
                          border: '1px solid #bbf7d0'
                        }}
                      >
                        <select
                          value={item.category}
                          onChange={e => handleQuickItemFieldChange(idx, 'category', e.target.value)}
                          style={{ padding: '5px 8px', fontSize: '11.5px', borderRadius: '5px', border: '1px solid #cbd5e1', fontWeight: 700 }}
                        >
                          <option value="Diesel Expense">Diesel Expense</option>
                          <option value="Other Vehicle Expense">Other Vehicle Expense</option>
                          <option value="Other">Other</option>
                        </select>

                        <input
                          type="text"
                          placeholder="What was it used for? (e.g. 40L diesel, toll plaza)"
                          value={item.note}
                          onChange={e => handleQuickItemFieldChange(idx, 'note', e.target.value)}
                          style={{ padding: '5px 8px', fontSize: '11.5px', borderRadius: '5px', border: '1px solid #cbd5e1' }}
                        />

                        <input
                          type="number"
                          step="any"
                          placeholder="Amount ₹"
                          value={item.amount}
                          onChange={e => handleQuickItemFieldChange(idx, 'amount', e.target.value)}
                          style={{ padding: '5px 8px', fontSize: '12px', fontWeight: 700, borderRadius: '5px', border: '1px solid #cbd5e1', fontFamily: 'monospace', textAlign: 'right' }}
                        />

                        <button
                          type="button"
                          onClick={() => handleRemoveQuickItemRow(idx)}
                          style={{ border: 'none', background: 'none', color: '#94a3b8', cursor: 'pointer' }}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                  </div>

                  {/* "+ Add Option for Next" */}
                  <div style={{ marginTop: '10px' }}>
                    <button
                      type="button"
                      onClick={() => handleAddQuickItemRow('Diesel Expense')}
                      className="btn btn-outline"
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '5px 12px',
                        fontSize: '11.5px',
                        fontWeight: 700,
                        borderColor: '#059669',
                        color: '#059669',
                        backgroundColor: '#ecfdf5'
                      }}
                    >
                      <Plus size={13} />
                      + Add Option for Next
                    </button>
                  </div>
                </div>

              </div>

              {/* Modal Footer */}
              <div style={{
                padding: '12px 20px',
                borderTop: '1px solid #e2e8f0',
                backgroundColor: '#f8fafc',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-end',
                gap: '10px'
              }}>
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => setClassifyingExpense(null)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="btn btn-primary"
                  style={{ minWidth: '130px', fontWeight: 700 }}
                >
                  {saving ? 'Saving...' : 'Save Classification'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 7. VIEW DETAILS MODAL */}
      {viewingExpense && (
        <div className="modal-backdrop" style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.65)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 100,
          padding: '16px'
        }}>
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '14px',
            width: '100%',
            maxWidth: '600px',
            maxHeight: '90vh',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2)'
          }}>
            <div style={{
              padding: '16px 20px',
              borderBottom: '1px solid #e2e8f0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              backgroundColor: '#f8fafc'
            }}>
              <div>
                <h2 style={{ fontSize: '16px', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                  Expense Breakdown: {viewingExpense.driver_name}
                </h2>
                <div style={{ fontSize: '11.5px', color: '#64748b', marginTop: '2px' }}>
                  {viewingExpense.expense_date} {viewingExpense.vehicle_number ? `• Truck ${viewingExpense.vehicle_number}` : ''}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setViewingExpense(null)}
                style={{ border: 'none', background: 'none', color: '#94a3b8', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ padding: '20px', overflowY: 'auto' }}>
              {/* Financial KPI bar */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '10px',
                padding: '12px',
                backgroundColor: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                marginBottom: '16px',
                textAlign: 'center'
              }}>
                <div>
                  <span style={{ fontSize: '10.5px', color: '#64748b', fontWeight: 700 }}>Advance Given</span>
                  <div style={{ fontSize: '15px', fontWeight: 800, color: '#1e40af', fontFamily: 'monospace' }}>
                    ₹{Number(viewingExpense.given_amount || 0).toLocaleString('en-IN')}
                  </div>
                </div>
                <div>
                  <span style={{ fontSize: '10.5px', color: '#64748b', fontWeight: 700 }}>Total Spent</span>
                  <div style={{ fontSize: '15px', fontWeight: 800, color: '#991b1b', fontFamily: 'monospace' }}>
                    ₹{Number(viewingExpense.spent_amount || 0).toLocaleString('en-IN')}
                  </div>
                </div>
                <div>
                  <span style={{ fontSize: '10.5px', color: '#64748b', fontWeight: 700 }}>Balance</span>
                  <div style={{ fontSize: '15px', fontWeight: 800, color: viewingExpense.balance_amount >= 0 ? '#059669' : '#dc2626', fontFamily: 'monospace' }}>
                    ₹{Number(viewingExpense.balance_amount || 0).toLocaleString('en-IN')}
                  </div>
                </div>
              </div>

              {viewingExpense.notes && (
                <div style={{ marginBottom: '16px', padding: '10px 12px', backgroundColor: '#f1f5f9', borderRadius: '6px', fontSize: '12px', color: '#334155' }}>
                  <strong>Trip Note:</strong> {viewingExpense.notes}
                </div>
              )}

              {/* Items Breakdown Table */}
              <h3 style={{ fontSize: '13px', fontWeight: 800, color: '#334155', marginBottom: '8px' }}>
                Classified Items ({viewingExpense.items?.length || 0}):
              </h3>

              {(!viewingExpense.items || viewingExpense.items.length === 0) ? (
                <div style={{ padding: '24px', textAlign: 'center', color: '#94a3b8', fontSize: '12.5px' }}>
                  No items classified yet. Use the "Classify" button to record items.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {viewingExpense.items.map((it, idx) => (
                    <div
                      key={it.id || idx}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '10px 12px',
                        backgroundColor: '#ffffff',
                        border: '1px solid #e2e8f0',
                        borderRadius: '6px'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{
                          padding: '2px 8px',
                          borderRadius: '4px',
                          fontSize: '11px',
                          fontWeight: 700,
                          backgroundColor: it.category.includes('Diesel') ? '#fffbeb' : it.category.includes('Vehicle') ? '#fff7ed' : '#f5f3ff',
                          color: it.category.includes('Diesel') ? '#b45309' : it.category.includes('Vehicle') ? '#c2410c' : '#6d28d9',
                          border: `1px solid ${it.category.includes('Diesel') ? '#fde68a' : it.category.includes('Vehicle') ? '#fed7aa' : '#ddd6fe'}`
                        }}>
                          {it.category}
                        </span>
                        <div>
                          <div style={{ fontSize: '12.5px', fontWeight: 600, color: '#0f172a' }}>
                            {it.note || 'No description provided'}
                          </div>
                          <div style={{ fontSize: '10.5px', color: '#94a3b8' }}>
                            Affects: {it.category.includes('Diesel') ? 'Vehicle Diesel' : it.category.includes('Vehicle') ? 'Other Vehicle Exp' : 'Operating Deductions'}
                          </div>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <strong style={{ fontSize: '13.5px', fontFamily: 'monospace', color: '#0f172a' }}>
                          ₹{Number(it.amount || 0).toLocaleString('en-IN')}
                        </strong>
                        <button
                          type="button"
                          onClick={() => handleDeleteItem(viewingExpense.id, it.id)}
                          style={{
                            border: 'none',
                            background: 'none',
                            color: '#ef4444',
                            cursor: 'pointer',
                            padding: '3px'
                          }}
                          title="Delete this line item"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div style={{
              padding: '12px 20px',
              borderTop: '1px solid #e2e8f0',
              backgroundColor: '#f8fafc',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <button
                type="button"
                className="btn btn-outline btn-sm"
                onClick={() => {
                  const target = viewingExpense;
                  setViewingExpense(null);
                  handleOpenClassifyModal(target);
                }}
              >
                + Classify More Items
              </button>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={() => setViewingExpense(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

