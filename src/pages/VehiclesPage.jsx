import React, { useState, useEffect, useMemo } from 'react';
import { 
  Truck, 
  Fuel, 
  Wrench, 
  ShieldCheck, 
  Edit2, 
  Trash2, 
  Plus, 
  Calendar, 
  Eye,
  FileText,
  Search,
  LayoutGrid,
  List,
  Phone,
  CheckCircle2,
  X,
  Download,
  Filter,
  RotateCcw
} from 'lucide-react';

export default function VehiclesPage({ onVehicleUpdated }) {
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState('table'); // 'table' | 'cards'

  // Add / Edit Vehicle Modal
  const [showVehicleModal, setShowVehicleModal] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState(null);
  const [vehNumber, setVehNumber] = useState('');
  const [vehModel, setVehModel] = useState('10 Wheeler Tipper');
  const [vehCapacity, setVehCapacity] = useState(16.0);
  const [vehDriver, setVehDriver] = useState('');
  const [vehPhone, setVehPhone] = useState('');
  const [savingVeh, setSavingVeh] = useState(false);

  // Vehicle Expense Modals (+ Diesel, + Service, + Other)
  const [activeExpenseType, setActiveExpenseType] = useState(null); // 'Diesel' | 'Service' | 'Other'
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [expDate, setExpDate] = useState(new Date().toISOString().split('T')[0]);
  const [expAmount, setExpAmount] = useState('');
  const [expLiters, setExpLiters] = useState('');
  const [expRatePerLtr, setExpRatePerLtr] = useState('');
  const [serviceType, setServiceType] = useState('Engine Oil Change');
  const [garageName, setGarageName] = useState('');
  const [otherCategory, setOtherCategory] = useState('Toll / Fastag');
  const [odometer, setOdometer] = useState('');
  const [paymentMode, setPaymentMode] = useState('Cash');
  const [expNotes, setExpNotes] = useState('');
  const [savingExp, setSavingExp] = useState(false);

  // View Vehicle Expenses History Modal & Ledger Filters
  const [viewVehicleHistory, setViewVehicleHistory] = useState(null);
  const [vehicleHistoryData, setVehicleHistoryData] = useState(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyTypeFilter, setHistoryTypeFilter] = useState('All'); // 'All' | 'Diesel' | 'Service' | 'Other'
  const [historyDatePreset, setHistoryDatePreset] = useState('all'); // 'all' | '1day' | '1week' | '1month' | '1year' | 'custom'
  const [historyFromDate, setHistoryFromDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split('T')[0];
  });
  const [historyToDate, setHistoryToDate] = useState(() => new Date().toISOString().split('T')[0]);

  const fetchVehicles = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/vehicles');
      const data = await res.json();
      setVehicles(data || []);
    } catch (err) {
      console.error('Error fetching vehicles:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVehicles();
  }, []);

  // Open Expense Modal
  const handleOpenExpense = (vehicle, type) => {
    setSelectedVehicle(vehicle);
    setActiveExpenseType(type);
    setExpDate(new Date().toISOString().split('T')[0]);
    setExpAmount('');
    setExpLiters('');
    setExpRatePerLtr('');
    setGarageName('');
    setOdometer('');
    setExpNotes('');
    setPaymentMode(type === 'Other' ? 'Fastag' : 'Cash');
  };

  // Submit Expense
  const handleSaveExpense = async (e) => {
    e.preventDefault();
    if (!expAmount || Number(expAmount) <= 0) {
      alert('Please enter valid amount');
      return;
    }

    try {
      setSavingExp(true);
      const res = await fetch(`/api/vehicles/${selectedVehicle.id}/expenses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          expense_type: activeExpenseType,
          date: expDate,
          amount: Number(expAmount),
          liters: Number(expLiters || 0),
          rate_per_liter: Number(expRatePerLtr || 0),
          service_type: activeExpenseType === 'Service' ? serviceType : null,
          garage_name: activeExpenseType === 'Service' ? garageName : null,
          category: activeExpenseType === 'Other' ? otherCategory : null,
          odometer_reading: Number(odometer || 0),
          payment_mode: paymentMode,
          notes: expNotes
        })
      });

      if (!res.ok) throw new Error('Failed to record expense');

      setActiveExpenseType(null);
      setSelectedVehicle(null);
      fetchVehicles();
      if (onVehicleUpdated) onVehicleUpdated();
    } catch (err) {
      alert(err.message);
    } finally {
      setSavingExp(false);
    }
  };

  // Auto calculate total diesel amount if liters and rate are entered
  const handleLitersChange = (l) => {
    setExpLiters(l);
    if (l && expRatePerLtr) {
      setExpAmount((Number(l) * Number(expRatePerLtr)).toFixed(2));
    }
  };

  const handleRatePerLtrChange = (r) => {
    setExpRatePerLtr(r);
    if (r && expLiters) {
      setExpAmount((Number(expLiters) * Number(r)).toFixed(2));
    }
  };

  // Save / Update Vehicle
  const handleSaveVehicle = async (e) => {
    e.preventDefault();
    if (!vehNumber.trim()) return;

    try {
      setSavingVeh(true);
      const url = editingVehicle ? `/api/vehicles/${editingVehicle.id}` : '/api/vehicles';
      const method = editingVehicle ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vehicle_number: vehNumber.trim().toUpperCase(),
          model_type: vehModel,
          capacity_tons: Number(vehCapacity),
          driver_name: vehDriver.trim(),
          driver_phone: vehPhone.trim()
        })
      });

      if (!res.ok) throw new Error('Failed to save vehicle');

      setShowVehicleModal(false);
      setEditingVehicle(null);
      fetchVehicles();
      if (onVehicleUpdated) onVehicleUpdated();
    } catch (err) {
      alert(err.message);
    } finally {
      setSavingVeh(false);
    }
  };

  const handleEditVehicle = (veh) => {
    setEditingVehicle(veh);
    setVehNumber(veh.vehicle_number);
    setVehModel(veh.model_type);
    setVehCapacity(veh.capacity_tons);
    setVehDriver(veh.driver_name || '');
    setVehPhone(veh.driver_phone || '');
    setShowVehicleModal(true);
  };

  const handleDeleteVehicle = async (id, number) => {
    if (!window.confirm(`Are you sure you want to delete vehicle ${number}? All related trip expenses will be deleted.`)) {
      return;
    }

    try {
      const res = await fetch(`/api/vehicles/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setVehicles(vehicles.filter(v => v.id !== id));
        if (onVehicleUpdated) onVehicleUpdated();
      }
    } catch (err) {
      alert('Delete failed: ' + err.message);
    }
  };

  const handleViewHistory = async (veh) => {
    setViewVehicleHistory(veh);
    setHistoryTypeFilter('All');
    setHistoryDatePreset('all');
    try {
      setHistoryLoading(true);
      const res = await fetch(`/api/vehicles/${veh.id}`);
      const data = await res.json();
      setVehicleHistoryData(data);
    } catch (err) {
      console.error(err);
    } finally {
      setHistoryLoading(false);
    }
  };

  // Filtered Expenses for the View Vehicle Modal
  const filteredExpenses = useMemo(() => {
    if (!vehicleHistoryData?.expenses) return [];
    let list = [...vehicleHistoryData.expenses];

    // 1. Type Filter (Diesel, Service, Other)
    if (historyTypeFilter !== 'All') {
      list = list.filter(e => e.expense_type?.toLowerCase() === historyTypeFilter.toLowerCase());
    }

    // 2. Date Filter
    const todayStr = new Date().toISOString().split('T')[0];
    if (historyDatePreset === '1day') {
      list = list.filter(e => e.date === todayStr);
    } else if (historyDatePreset === '1week') {
      const d = new Date();
      d.setDate(d.getDate() - 7);
      const startStr = d.toISOString().split('T')[0];
      list = list.filter(e => e.date >= startStr && e.date <= todayStr);
    } else if (historyDatePreset === '1month') {
      const d = new Date();
      d.setDate(d.getDate() - 30);
      const startStr = d.toISOString().split('T')[0];
      list = list.filter(e => e.date >= startStr && e.date <= todayStr);
    } else if (historyDatePreset === '1year') {
      const d = new Date();
      d.setFullYear(d.getFullYear() - 1);
      const startStr = d.toISOString().split('T')[0];
      list = list.filter(e => e.date >= startStr && e.date <= todayStr);
    } else if (historyDatePreset === 'custom') {
      if (historyFromDate) {
        list = list.filter(e => e.date >= historyFromDate);
      }
      if (historyToDate) {
        list = list.filter(e => e.date <= historyToDate);
      }
    }

    return list;
  }, [vehicleHistoryData, historyTypeFilter, historyDatePreset, historyFromDate, historyToDate]);

  const totalFilteredExpenseAmount = filteredExpenses.reduce((s, e) => s + (Number(e.amount) || 0), 0);

  // Export Vehicle Expense Ledger to CSV (Excel format)
  const handleExportLedgerCSV = () => {
    if (!filteredExpenses || filteredExpenses.length === 0) {
      alert('No expenses found for the selected filter to export.');
      return;
    }

    const headers = [
      'Date',
      'Expense Type',
      'Category / Service',
      'Details / Remarks',
      'Odometer (km)',
      'Payment Mode',
      'Amount (Rs)'
    ];

    const escapeCsv = (val) => {
      if (val === null || val === undefined) return '""';
      const str = String(val).replace(/"/g, '""');
      return `"${str}"`;
    };

    const rows = filteredExpenses.map((exp) => {
      let details = '';
      if (exp.expense_type === 'Diesel') {
        details = `${exp.liters || 0} L @ Rs.${exp.rate_per_liter || 0}${exp.notes ? ` - ${exp.notes}` : ''}`;
      } else if (exp.expense_type === 'Service') {
        details = `${exp.service_type || 'Service'}${exp.garage_name ? ` (${exp.garage_name})` : ''}${exp.notes ? ` - ${exp.notes}` : ''}`;
      } else {
        details = `${exp.category || 'Other'}${exp.notes ? ` - ${exp.notes}` : ''}`;
      }

      return [
        escapeCsv(exp.date),
        escapeCsv(exp.expense_type),
        escapeCsv(exp.service_type || exp.category || exp.expense_type),
        escapeCsv(details),
        exp.odometer_reading || 0,
        escapeCsv(exp.payment_mode || 'Cash'),
        Number(exp.amount) || 0
      ].join(',');
    });

    // Total Row
    rows.push([
      '""',
      '""',
      '""',
      '"TOTAL FILTERED EXPENSES"',
      '""',
      '""',
      totalFilteredExpenseAmount
    ].join(','));

    const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    const dateStr = new Date().toISOString().split('T')[0];
    const vehNum = viewVehicleHistory?.vehicle_number?.replace(/\s+/g, '_') || 'Vehicle';
    link.setAttribute('download', `${vehNum}_Expense_Ledger_${historyTypeFilter}_${historyDatePreset}_${dateStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Export Vehicle Expense Ledger to Word Document (.doc format)
  const handleExportLedgerWord = () => {
    if (!filteredExpenses || filteredExpenses.length === 0) {
      alert('No expenses found for the selected filter to export.');
      return;
    }

    const vehNum = viewVehicleHistory?.vehicle_number || 'Vehicle';
    const model = viewVehicleHistory?.model_type || 'Truck';
    const capacity = viewVehicleHistory?.capacity_tons || 10;
    const dateStr = new Date().toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' });

    let rangeLabel = 'All Time Complete History';
    if (historyDatePreset === '1day') rangeLabel = 'Today (1 Day)';
    else if (historyDatePreset === '1week') rangeLabel = 'Last 7 Days (1 Week)';
    else if (historyDatePreset === '1month') rangeLabel = 'Last 30 Days (1 Month)';
    else if (historyDatePreset === '1year') rangeLabel = 'Last 1 Year (1 Year)';
    else if (historyDatePreset === 'custom') rangeLabel = `${historyFromDate} to ${historyToDate}`;

    const tableRows = filteredExpenses.map(exp => {
      let details = '';
      if (exp.expense_type === 'Diesel') {
        details = `${exp.liters || 0} L @ ₹${exp.rate_per_liter || 0}${exp.notes ? ` • ${exp.notes}` : ''}`;
      } else if (exp.expense_type === 'Service') {
        details = `${exp.service_type || 'Service'}${exp.garage_name ? ` • ${exp.garage_name}` : ''}${exp.notes ? ` • ${exp.notes}` : ''}`;
      } else {
        details = `${exp.category || 'Other'}${exp.notes ? ` • ${exp.notes}` : ''}`;
      }

      return `
        <tr>
          <td style="padding: 8px 10px; border: 1px solid #cbd5e1; white-space: nowrap;">${exp.date}</td>
          <td style="padding: 8px 10px; border: 1px solid #cbd5e1; font-weight: bold;">${exp.expense_type}</td>
          <td style="padding: 8px 10px; border: 1px solid #cbd5e1;">${details}</td>
          <td style="padding: 8px 10px; border: 1px solid #cbd5e1; text-align: center;">${exp.payment_mode || 'Cash'}</td>
          <td style="padding: 8px 10px; border: 1px solid #cbd5e1; text-align: right; font-weight: bold;">₹${(Number(exp.amount) || 0).toLocaleString('en-IN')}</td>
        </tr>
      `;
    }).join('');

    const wordHtml = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
      <head>
        <meta charset='utf-8'>
        <title>${vehNum} Expense Ledger</title>
        <style>
          body { font-family: Calibri, 'Segoe UI', Arial, sans-serif; margin: 24px; color: #0f172a; }
          .header { border-bottom: 2px solid #059669; padding-bottom: 12px; margin-bottom: 16px; }
          .title { font-size: 20pt; font-weight: bold; color: #064e3b; margin: 0; }
          .subtitle { font-size: 11pt; color: #64748b; margin-top: 4px; }
          .meta-box { background: #f8fafc; border: 1px solid #e2e8f0; padding: 12px; border-radius: 6px; margin-bottom: 16px; }
          table { width: 100%; border-collapse: collapse; margin-top: 12px; font-size: 10.5pt; }
          th { background: #059669; color: #ffffff; padding: 10px; text-align: left; font-weight: bold; border: 1px solid #047857; }
          .total-row td { background: #ecfdf5; font-weight: bold; font-size: 11pt; color: #064e3b; border: 1px solid #a7f3d0; padding: 10px; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="title">JAZLAN TRADERS - VEHICLE EXPENSE LEDGER</div>
          <div class="subtitle">Generated on ${dateStr}</div>
        </div>

        <div class="meta-box">
          <table style="border: none; margin: 0;">
            <tr style="background: none;">
              <td style="border: none; padding: 4px;"><strong>Vehicle Number:</strong> ${vehNum}</td>
              <td style="border: none; padding: 4px;"><strong>Model Type:</strong> ${model} (${capacity} Tons)</td>
            </tr>
            <tr style="background: none;">
              <td style="border: none; padding: 4px;"><strong>Expense Category:</strong> ${historyTypeFilter}</td>
              <td style="border: none; padding: 4px;"><strong>Date Range:</strong> ${rangeLabel}</td>
            </tr>
          </table>
        </div>

        <table>
          <thead>
            <tr>
              <th style="width: 15%;">Date</th>
              <th style="width: 15%;">Type</th>
              <th style="width: 45%;">Details & Notes</th>
              <th style="width: 10%; text-align: center;">Mode</th>
              <th style="width: 15%; text-align: right;">Amount (₹)</th>
            </tr>
          </thead>
          <tbody>
            ${tableRows}
            <tr class="total-row">
              <td colspan="4" style="text-align: right;">TOTAL FILTERED EXPENSES (${filteredExpenses.length} ENTRIES):</td>
              <td style="text-align: right;">₹${totalFilteredExpenseAmount.toLocaleString('en-IN')}</td>
            </tr>
          </tbody>
        </table>
      </body>
      </html>
    `;

    const blob = new Blob(['\uFEFF' + wordHtml], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    const saveDate = new Date().toISOString().split('T')[0];
    const safeVeh = vehNum.replace(/\s+/g, '_');
    link.setAttribute('download', `${safeVeh}_Expense_Ledger_${historyTypeFilter}_${saveDate}.doc`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Filtered Vehicles
  const filteredVehicles = vehicles.filter(v => 
    v.vehicle_number.toLowerCase().includes(search.toLowerCase()) ||
    (v.model_type && v.model_type.toLowerCase().includes(search.toLowerCase()))
  );

  const totalDiesel = vehicles.reduce((s, v) => s + (v.total_diesel_cost || 0), 0);
  const totalService = vehicles.reduce((s, v) => s + (v.total_service_cost || 0), 0);
  const totalOther = vehicles.reduce((s, v) => s + (v.total_other_cost || 0), 0);
  const totalFleetCost = totalDiesel + totalService + totalOther;

  return (
    <div className="page-content" style={{ maxWidth: '1440px', margin: '0 auto', padding: '16px' }}>
      
      {/* COMPACT TOOLBAR (SEARCH, SUMMARY, VIEW TOGGLE & ADD BUTTON) */}
      <div className="card" style={{ padding: '12px 18px', marginBottom: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          
          {/* SEARCH & INLINE STATS */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, maxWidth: '640px' }}>
            <div style={{ position: 'relative', width: '280px' }}>
              <Search size={15} color="#94a3b8" style={{ position: 'absolute', left: '11px', top: '10px' }} />
              <input
                type="text"
                className="form-input"
                placeholder="Search vehicle number, driver..."
                style={{ 
                  height: '35px', 
                  fontSize: '12.5px', 
                  paddingLeft: '34px', 
                  borderRadius: '7px', 
                  border: '1.5px solid #cbd5e1' 
                }}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <div style={{ fontSize: '12px', color: '#64748b', display: 'flex', gap: '10px', alignItems: 'center' }}>
              <span><strong>{vehicles.length}</strong> Trucks</span>
              <span>•</span>
              <span>Fleet Cost: <strong style={{ color: '#0f172a' }} className="font-mono">₹{totalFleetCost.toLocaleString('en-IN')}</strong></span>
            </div>
          </div>

          {/* VIEW SWITCHER & ADD BUTTON */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ display: 'inline-flex', border: '1px solid #cbd5e1', borderRadius: '7px', overflow: 'hidden' }}>
              <button
                type="button"
                onClick={() => setViewMode('table')}
                style={{
                  height: '34px',
                  padding: '0 10px',
                  backgroundColor: viewMode === 'table' ? '#f1f5f9' : '#ffffff',
                  border: 'none',
                  color: viewMode === 'table' ? '#0f172a' : '#64748b',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontSize: '12px',
                  fontWeight: viewMode === 'table' ? 700 : 500
                }}
                title="Standard Table View"
              >
                <List size={15} />
                <span>Table</span>
              </button>

              <button
                type="button"
                onClick={() => setViewMode('cards')}
                style={{
                  height: '34px',
                  padding: '0 10px',
                  backgroundColor: viewMode === 'cards' ? '#f1f5f9' : '#ffffff',
                  border: 'none',
                  borderLeft: '1px solid #cbd5e1',
                  color: viewMode === 'cards' ? '#0f172a' : '#64748b',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontSize: '12px',
                  fontWeight: viewMode === 'cards' ? 700 : 500
                }}
                title="Compact Cards View"
              >
                <LayoutGrid size={15} />
                <span>Cards</span>
              </button>
            </div>

            <button 
              className="btn btn-primary"
              style={{ 
                height: '34px', 
                padding: '0 14px', 
                fontSize: '12.5px', 
                fontWeight: 700, 
                borderRadius: '7px',
                backgroundColor: '#059669',
                borderColor: '#047857',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px'
              }}
              onClick={() => {
                setEditingVehicle(null);
                setVehNumber('');
                setVehDriver('');
                setVehPhone('');
                setShowVehicleModal(true);
              }}
            >
              <Plus size={15} />
              Add Vehicle
            </button>
          </div>

        </div>
      </div>

      {/* VIEW MODE 1: STANDARD, CLEAN, PROFESSIONAL DATA TABLE */}
      {viewMode === 'table' && (
        <div className="card" style={{ padding: 0, overflow: 'hidden', border: '1px solid #e2e8f0', borderRadius: '10px' }}>
          <div className="table-container" style={{ border: 'none', margin: 0 }}>
            <table className="data-table">
              <thead>
                <tr style={{ backgroundColor: '#f8fafc' }}>
                  <th>Vehicle Number</th>
                  <th style={{ textAlign: 'center' }}>Trips</th>
                  <th style={{ textAlign: 'right' }}>Diesel (₹)</th>
                  <th style={{ textAlign: 'right' }}>Service (₹)</th>
                  <th style={{ textAlign: 'right' }}>Other Exp (₹)</th>
                  <th style={{ textAlign: 'right' }}>Total Cost (₹)</th>
                  <th style={{ textAlign: 'center' }}>Quick Log Expense</th>
                  <th style={{ textAlign: 'center' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredVehicles.length === 0 ? (
                  <tr>
                    <td colSpan="8" style={{ textAlign: 'center', padding: '36px', color: '#94a3b8' }}>
                      {loading ? 'Loading vehicles...' : 'No vehicles found.'}
                    </td>
                  </tr>
                ) : (
                  filteredVehicles.map((v) => {
                    const totalCost = (v.total_diesel_cost || 0) + (v.total_service_cost || 0) + (v.total_other_cost || 0);

                    return (
                      <tr key={v.id}>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div style={{ 
                              width: '28px', 
                              height: '28px', 
                              borderRadius: '6px', 
                              backgroundColor: '#ecfdf5', 
                              color: '#059669', 
                              display: 'flex', 
                              alignItems: 'center', 
                              justifyContent: 'center',
                              border: '1px solid #a7f3d0'
                            }}>
                              <Truck size={14} />
                            </div>
                            <div>
                              <div style={{ fontWeight: 800, fontSize: '13.5px', color: '#0f172a', fontFamily: 'monospace' }}>
                                {v.vehicle_number}
                              </div>
                              <div style={{ fontSize: '11px', color: '#64748b' }}>
                                {v.model_type} • <span style={{ color: '#059669', fontWeight: 600 }}>{v.capacity_tons} T</span>
                              </div>
                            </div>
                          </div>
                        </td>

                        <td style={{ textAlign: 'center' }}>
                          <span style={{ 
                            fontSize: '11.5px', 
                            fontWeight: 700, 
                            padding: '2px 8px', 
                            borderRadius: '4px', 
                            backgroundColor: '#f1f5f9', 
                            color: '#334155' 
                          }}>
                            {v.total_trips || 0}
                          </span>
                        </td>

                        <td style={{ textAlign: 'right', fontWeight: 700, color: '#c2410c', fontFamily: 'monospace' }}>
                          ₹{(v.total_diesel_cost || 0).toLocaleString('en-IN')}
                        </td>

                        <td style={{ textAlign: 'right', fontWeight: 700, color: '#4338ca', fontFamily: 'monospace' }}>
                          ₹{(v.total_service_cost || 0).toLocaleString('en-IN')}
                        </td>

                        <td style={{ textAlign: 'right', fontWeight: 700, color: '#15803d', fontFamily: 'monospace' }}>
                          ₹{(v.total_other_cost || 0).toLocaleString('en-IN')}
                        </td>

                        <td style={{ textAlign: 'right', fontWeight: 900, color: '#0f172a', fontFamily: 'monospace' }}>
                          ₹{totalCost.toLocaleString('en-IN')}
                        </td>

                        <td style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>
                          <div style={{ display: 'inline-flex', gap: '5px' }}>
                            <button
                              type="button"
                              onClick={() => handleOpenExpense(v, 'Diesel')}
                              style={{
                                height: '26px',
                                padding: '0 8px',
                                fontSize: '11px',
                                fontWeight: 700,
                                borderRadius: '5px',
                                border: '1px solid #fed7aa',
                                backgroundColor: '#fff7ed',
                                color: '#c2410c',
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '3px'
                              }}
                              title="Add Diesel Expense"
                            >
                              <Fuel size={12} />
                              + Diesel
                            </button>

                            <button
                              type="button"
                              onClick={() => handleOpenExpense(v, 'Service')}
                              style={{
                                height: '26px',
                                padding: '0 8px',
                                fontSize: '11px',
                                fontWeight: 700,
                                borderRadius: '5px',
                                border: '1px solid #c7d2fe',
                                backgroundColor: '#eef2ff',
                                color: '#4338ca',
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '3px'
                              }}
                              title="Add Service / Maintenance"
                            >
                              <Wrench size={12} />
                              + Service
                            </button>

                            <button
                              type="button"
                              onClick={() => handleOpenExpense(v, 'Other')}
                              style={{
                                height: '26px',
                                padding: '0 8px',
                                fontSize: '11px',
                                fontWeight: 700,
                                borderRadius: '5px',
                                border: '1px solid #bbf7d0',
                                backgroundColor: '#f0fdf4',
                                color: '#15803d',
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '3px'
                              }}
                              title="Add Toll / Fastag / Other"
                            >
                              <ShieldCheck size={12} />
                              + Other
                            </button>
                          </div>
                        </td>

                        <td style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>
                          <div style={{ display: 'inline-flex', gap: '4px' }}>
                            <button
                              type="button"
                              onClick={() => handleViewHistory(v)}
                              style={{
                                width: '28px',
                                height: '28px',
                                borderRadius: '6px',
                                border: '1px solid #cbd5e1',
                                backgroundColor: '#ffffff',
                                color: '#475569',
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                              }}
                              title="View Expense Ledger"
                            >
                              <Eye size={13} />
                            </button>

                            <button
                              type="button"
                              onClick={() => handleEditVehicle(v)}
                              style={{
                                width: '28px',
                                height: '28px',
                                borderRadius: '6px',
                                border: '1px solid #cbd5e1',
                                backgroundColor: '#ffffff',
                                color: '#475569',
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                              }}
                              title="Edit Vehicle"
                            >
                              <Edit2 size={13} />
                            </button>

                            <button
                              type="button"
                              onClick={() => handleDeleteVehicle(v.id, v.vehicle_number)}
                              style={{
                                width: '28px',
                                height: '28px',
                                borderRadius: '6px',
                                border: '1px solid #fecaca',
                                backgroundColor: '#ffffff',
                                color: '#dc2626',
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                              }}
                              title="Delete Vehicle"
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
      )}

      {/* VIEW MODE 2: SMALL, COMPACT, SLEEK CARDS */}
      {viewMode === 'cards' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '14px' }}>
          {filteredVehicles.map(v => {
            const totalCost = (v.total_diesel_cost || 0) + (v.total_service_cost || 0) + (v.total_other_cost || 0);

            return (
              <div 
                key={v.id}
                style={{
                  backgroundColor: '#ffffff',
                  borderRadius: '10px',
                  border: '1px solid #e2e8f0',
                  padding: '14px 16px',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
                }}
              >
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ 
                      width: '28px', 
                      height: '28px', 
                      borderRadius: '6px', 
                      backgroundColor: '#ecfdf5', 
                      color: '#059669', 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center',
                      border: '1px solid #a7f3d0'
                    }}>
                      <Truck size={14} />
                    </div>
                    <div>
                      <div style={{ fontWeight: 800, fontSize: '14px', fontFamily: 'monospace', color: '#0f172a' }}>
                        {v.vehicle_number}
                      </div>
                      <div style={{ fontSize: '11px', color: '#64748b' }}>
                        {v.model_type} • {v.capacity_tons} T
                      </div>
                    </div>
                  </div>

                  <span style={{ fontSize: '11px', fontWeight: 700, padding: '2px 7px', borderRadius: '4px', backgroundColor: '#f0fdf4', color: '#15803d' }}>
                    Active
                  </span>
                </div>

                {/* Trips & Status */}
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11.5px', color: '#475569', marginTop: '10px', paddingTop: '8px', borderTop: '1px solid #f1f5f9' }}>
                  <span>Vehicle Status: <strong style={{ color: '#059669' }}>Active</strong></span>
                  <span>Total Trips: <strong style={{ color: '#059669' }}>{v.total_trips || 0}</strong></span>
                </div>

                {/* Inline Compact Cost Breakdown */}
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center', 
                  backgroundColor: '#f8fafc', 
                  padding: '6px 10px', 
                  borderRadius: '6px', 
                  marginTop: '10px',
                  fontSize: '11px',
                  fontFamily: 'monospace'
                }}>
                  <span style={{ color: '#c2410c' }}>Fuel: ₹{(v.total_diesel_cost || 0).toLocaleString('en-IN')}</span>
                  <span style={{ color: '#4338ca' }}>Serv: ₹{(v.total_service_cost || 0).toLocaleString('en-IN')}</span>
                  <span style={{ color: '#15803d' }}>Other: ₹{(v.total_other_cost || 0).toLocaleString('en-IN')}</span>
                </div>

                {/* Total and Actions */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px', paddingTop: '8px', borderTop: '1px solid #f1f5f9' }}>
                  <div>
                    <span style={{ fontSize: '10.5px', color: '#64748b', textTransform: 'uppercase', fontWeight: 700 }}>Total: </span>
                    <strong style={{ fontSize: '14px', fontFamily: 'monospace', color: '#0f172a' }}>₹{totalCost.toLocaleString('en-IN')}</strong>
                  </div>

                  <div style={{ display: 'flex', gap: '4px' }}>
                    <button
                      type="button"
                      onClick={() => handleOpenExpense(v, 'Diesel')}
                      style={{ height: '25px', padding: '0 6px', fontSize: '10.5px', fontWeight: 700, borderRadius: '4px', border: '1px solid #fed7aa', backgroundColor: '#fff7ed', color: '#c2410c', cursor: 'pointer' }}
                    >
                      + Diesel
                    </button>
                    <button
                      type="button"
                      onClick={() => handleOpenExpense(v, 'Service')}
                      style={{ height: '25px', padding: '0 6px', fontSize: '10.5px', fontWeight: 700, borderRadius: '4px', border: '1px solid #c7d2fe', backgroundColor: '#eef2ff', color: '#4338ca', cursor: 'pointer' }}
                    >
                      + Service
                    </button>
                    <button
                      type="button"
                      onClick={() => handleViewHistory(v)}
                      style={{ height: '25px', padding: '0 6px', fontSize: '10.5px', borderRadius: '4px', border: '1px solid #cbd5e1', backgroundColor: '#ffffff', color: '#475569', cursor: 'pointer' }}
                    >
                      <Eye size={12} />
                    </button>
                  </div>
                </div>

              </div>
            );
          })}
        </div>
      )}

      {/* MODAL 1: ADD / EDIT VEHICLE (COMPACT 420px) */}
      {showVehicleModal && (
        <div className="modal-overlay" style={{ backdropFilter: 'blur(3px)', backgroundColor: 'rgba(15, 23, 42, 0.45)' }} onClick={() => setShowVehicleModal(false)}>
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
                <div style={{ width: '30px', height: '30px', borderRadius: '8px', backgroundColor: '#ecfdf5', color: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Truck size={16} />
                </div>
                <div>
                  <h2 style={{ fontSize: '15px', fontWeight: 800, margin: 0, color: '#0f172a' }}>
                    {editingVehicle ? 'Edit Vehicle' : 'Add Vehicle'}
                  </h2>
                  <div style={{ fontSize: '11px', color: '#64748b' }}>Truck, Tipper or Pickup Profile</div>
                </div>
              </div>
              <button onClick={() => setShowVehicleModal(false)} style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '20px', cursor: 'pointer' }}>×</button>
            </div>

            <form onSubmit={handleSaveVehicle} style={{ marginTop: '14px' }}>
              <div style={{ marginBottom: '10px' }}>
                <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                  Vehicle Registration Number *
                </label>
                <input 
                  type="text"
                  className="form-input font-mono"
                  style={{ height: '36px', fontSize: '13px', textTransform: 'uppercase', borderRadius: '7px', border: '1.5px solid #cbd5e1', width: '100%', padding: '0 10px' }}
                  placeholder="e.g. TN 45 AB 1001"
                  value={vehNumber}
                  onChange={(e) => setVehNumber(e.target.value.toUpperCase())}
                  required
                  autoFocus
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                    Model / Type
                  </label>
                  <select 
                    className="form-select"
                    style={{ height: '36px', fontSize: '12.5px', borderRadius: '7px', border: '1.5px solid #cbd5e1', width: '100%', padding: '0 8px' }}
                    value={vehModel} 
                    onChange={(e) => setVehModel(e.target.value)}
                  >
                    <option value="10 Wheeler Tipper">10 Wheeler Tipper</option>
                    <option value="6 Wheeler Lorry">6 Wheeler Lorry</option>
                    <option value="Tata 407 / Pickup">Tata 407 / Pickup</option>
                    <option value="Multi-Axle Trailer">Multi-Axle Trailer</option>
                    <option value="Tractor / Yard Vehicle">Tractor / Yard Vehicle</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                    Capacity (Tons) *
                  </label>
                  <input 
                    type="number"
                    step="0.1"
                    min="0.5"
                    className="form-input font-mono"
                    style={{ height: '36px', fontSize: '13px', borderRadius: '7px', border: '1.5px solid #cbd5e1', width: '100%', padding: '0 10px' }}
                    value={vehCapacity}
                    onChange={(e) => setVehCapacity(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                    Default Driver
                  </label>
                  <input 
                    type="text"
                    className="form-input"
                    style={{ height: '36px', fontSize: '12.5px', borderRadius: '7px', border: '1.5px solid #cbd5e1', width: '100%', padding: '0 10px' }}
                    placeholder="Driver name"
                    value={vehDriver}
                    onChange={(e) => setVehDriver(e.target.value)}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                    Driver Phone
                  </label>
                  <input 
                    type="text"
                    className="form-input"
                    style={{ height: '36px', fontSize: '12.5px', borderRadius: '7px', border: '1.5px solid #cbd5e1', width: '100%', padding: '0 10px' }}
                    placeholder="Mobile number"
                    value={vehPhone}
                    onChange={(e) => setVehPhone(e.target.value)}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                <button 
                  type="button" 
                  onClick={() => setShowVehicleModal(false)}
                  style={{ height: '33px', padding: '0 14px', fontSize: '12px', fontWeight: 600, borderRadius: '7px', border: '1px solid #cbd5e1', backgroundColor: '#ffffff', color: '#475569', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={savingVeh}
                  style={{ height: '33px', padding: '0 16px', fontSize: '12px', fontWeight: 700, borderRadius: '7px', border: 'none', backgroundColor: '#059669', color: '#ffffff', cursor: savingVeh ? 'not-allowed' : 'pointer' }}
                >
                  {savingVeh ? 'Saving...' : editingVehicle ? 'Update Vehicle' : 'Add Vehicle'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: ADD EXPENSE (+ DIESEL, + SERVICE, + OTHER) (COMPACT 430px) */}
      {activeExpenseType && selectedVehicle && (
        <div className="modal-overlay" style={{ backdropFilter: 'blur(3px)', backgroundColor: 'rgba(15, 23, 42, 0.45)' }} onClick={() => setActiveExpenseType(null)}>
          <div 
            className="modal-content" 
            style={{ 
              maxWidth: '430px', 
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
                <div style={{ 
                  width: '30px', 
                  height: '30px', 
                  borderRadius: '8px', 
                  backgroundColor: activeExpenseType === 'Diesel' ? '#fff7ed' : activeExpenseType === 'Service' ? '#eef2ff' : '#f0fdf4',
                  color: activeExpenseType === 'Diesel' ? '#c2410c' : activeExpenseType === 'Service' ? '#4338ca' : '#15803d',
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center' 
                }}>
                  {activeExpenseType === 'Diesel' && <Fuel size={16} />}
                  {activeExpenseType === 'Service' && <Wrench size={16} />}
                  {activeExpenseType === 'Other' && <ShieldCheck size={16} />}
                </div>
                <div>
                  <h2 style={{ fontSize: '15px', fontWeight: 800, margin: 0, color: '#0f172a' }}>
                    Log {activeExpenseType}
                  </h2>
                  <div style={{ fontSize: '11px', color: '#64748b' }}>{selectedVehicle.vehicle_number}</div>
                </div>
              </div>
              <button onClick={() => setActiveExpenseType(null)} style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '20px', cursor: 'pointer' }}>×</button>
            </div>

            <form onSubmit={handleSaveExpense} style={{ marginTop: '14px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                    Date *
                  </label>
                  <input 
                    type="date"
                    className="form-input"
                    style={{ height: '36px', fontSize: '12.5px', borderRadius: '7px', border: '1.5px solid #cbd5e1', width: '100%', padding: '0 8px' }}
                    value={expDate}
                    onChange={(e) => setExpDate(e.target.value)}
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
                    value={paymentMode} 
                    onChange={(e) => setPaymentMode(e.target.value)}
                  >
                    <option value="Cash">Cash</option>
                    <option value="UPI">UPI / GPay</option>
                    <option value="Fastag">Fastag</option>
                    <option value="Fuel Card">Fuel Card</option>
                    <option value="Bank Transfer">Bank Transfer</option>
                  </select>
                </div>
              </div>

              {/* DIESEL SPECIFIC FIELDS */}
              {activeExpenseType === 'Diesel' && (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1.2fr', gap: '8px', marginBottom: '10px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                        Liters
                      </label>
                      <input 
                        type="number"
                        step="0.01"
                        className="form-input font-mono"
                        style={{ height: '36px', fontSize: '13px', borderRadius: '7px', border: '1.5px solid #cbd5e1', width: '100%', padding: '0 8px' }}
                        placeholder="50"
                        value={expLiters}
                        onChange={(e) => handleLitersChange(e.target.value)}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                        Rate / Ltr
                      </label>
                      <input 
                        type="number"
                        step="0.01"
                        className="form-input font-mono"
                        style={{ height: '36px', fontSize: '13px', borderRadius: '7px', border: '1.5px solid #cbd5e1', width: '100%', padding: '0 8px' }}
                        placeholder="92.50"
                        value={expRatePerLtr}
                        onChange={(e) => handleRatePerLtrChange(e.target.value)}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 700, color: '#c2410c', marginBottom: '4px' }}>
                        Total Diesel (₹) *
                      </label>
                      <input 
                        type="number"
                        step="0.01"
                        className="form-input font-mono"
                        style={{ height: '36px', fontSize: '14px', fontWeight: 800, color: '#c2410c', borderRadius: '7px', border: '1.5px solid #cbd5e1', width: '100%', padding: '0 8px' }}
                        placeholder="Total cost"
                        value={expAmount}
                        onChange={(e) => setExpAmount(e.target.value)}
                        required
                        autoFocus
                      />
                    </div>
                  </div>
                </>
              )}

              {/* SERVICE SPECIFIC FIELDS */}
              {activeExpenseType === 'Service' && (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '10px', marginBottom: '10px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                        Service Type *
                      </label>
                      <select 
                        className="form-select" 
                        style={{ height: '36px', fontSize: '12px', borderRadius: '7px', border: '1.5px solid #cbd5e1', width: '100%', padding: '0 8px' }}
                        value={serviceType} 
                        onChange={(e) => setServiceType(e.target.value)}
                      >
                        <option value="Engine Oil & Filter Change">Engine Oil & Filter Change</option>
                        <option value="Brake Liners & Wheel Greasing">Brake Liners & Wheel Greasing</option>
                        <option value="Tyre Replacement / Alignment">Tyre Replacement / Alignment</option>
                        <option value="Suspension & Springs Repair">Suspension & Springs Repair</option>
                        <option value="Clutch & Gearbox Work">Clutch & Gearbox Work</option>
                        <option value="General Periodic Service">General Periodic Service</option>
                        <option value="Electrical / Battery Work">Electrical / Battery Work</option>
                      </select>
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 700, color: '#4338ca', marginBottom: '4px' }}>
                        Cost (₹) *
                      </label>
                      <input 
                        type="number"
                        step="0.01"
                        className="form-input font-mono"
                        style={{ height: '36px', fontSize: '14px', fontWeight: 800, color: '#4338ca', borderRadius: '7px', border: '1.5px solid #cbd5e1', width: '100%', padding: '0 8px' }}
                        placeholder="Amount in ₹"
                        value={expAmount}
                        onChange={(e) => setExpAmount(e.target.value)}
                        required
                        autoFocus
                      />
                    </div>
                  </div>

                  <div style={{ marginBottom: '10px' }}>
                    <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                      Garage / Workshop Name
                    </label>
                    <input 
                      type="text"
                      className="form-input"
                      style={{ height: '36px', fontSize: '12.5px', borderRadius: '7px', border: '1.5px solid #cbd5e1', width: '100%', padding: '0 10px' }}
                      placeholder="e.g. Sri Vari Auto Works"
                      value={garageName}
                      onChange={(e) => setGarageName(e.target.value)}
                    />
                  </div>
                </>
              )}

              {/* OTHER SPECIFIC FIELDS */}
              {activeExpenseType === 'Other' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '10px', marginBottom: '10px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                      Category *
                    </label>
                    <select 
                      className="form-select" 
                      style={{ height: '36px', fontSize: '12px', borderRadius: '7px', border: '1.5px solid #cbd5e1', width: '100%', padding: '0 8px' }}
                      value={otherCategory} 
                      onChange={(e) => setOtherCategory(e.target.value)}
                    >
                      <option value="Toll / Fastag Recharge">Toll / Fastag Recharge</option>
                      <option value="Insurance Renewal">Insurance Renewal</option>
                      <option value="Fitness Certificate (FC)">Fitness Certificate (FC)</option>
                      <option value="Road Tax & Permit">Road Tax & Permit</option>
                      <option value="Driver Daily Batta / Food">Driver Daily Batta / Food</option>
                      <option value="Police / Checkpost / RTO">Police / Checkpost / RTO</option>
                      <option value="Parking / Weighment Fee">Parking / Weighment Fee</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 700, color: '#15803d', marginBottom: '4px' }}>
                      Amount (₹) *
                    </label>
                    <input 
                      type="number"
                      step="0.01"
                      className="form-input font-mono"
                      style={{ height: '36px', fontSize: '14px', fontWeight: 800, color: '#15803d', borderRadius: '7px', border: '1.5px solid #cbd5e1', width: '100%', padding: '0 8px' }}
                      placeholder="Amount in ₹"
                      value={expAmount}
                      onChange={(e) => setExpAmount(e.target.value)}
                      required
                      autoFocus
                    />
                  </div>
                </div>
              )}

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                  Notes / Receipt Remark
                </label>
                <input 
                  type="text"
                  className="form-input"
                  style={{ height: '36px', fontSize: '12.5px', borderRadius: '7px', border: '1.5px solid #cbd5e1', width: '100%', padding: '0 10px' }}
                  placeholder="Receipt number, invoice notes..."
                  value={expNotes}
                  onChange={(e) => setExpNotes(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                <button 
                  type="button" 
                  onClick={() => setActiveExpenseType(null)}
                  style={{ height: '33px', padding: '0 14px', fontSize: '12px', fontWeight: 600, borderRadius: '7px', border: '1px solid #cbd5e1', backgroundColor: '#ffffff', color: '#475569', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={savingExp}
                  style={{ 
                    height: '33px', 
                    padding: '0 16px', 
                    fontSize: '12px', 
                    fontWeight: 700, 
                    borderRadius: '7px', 
                    border: 'none', 
                    backgroundColor: activeExpenseType === 'Diesel' ? '#c2410c' : activeExpenseType === 'Service' ? '#4338ca' : '#15803d', 
                    color: '#ffffff', 
                    cursor: savingExp ? 'not-allowed' : 'pointer' 
                  }}
                >
                  {savingExp ? 'Saving...' : `Log ${activeExpenseType}`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: VIEW VEHICLE EXPENSE LEDGER */}
      {viewVehicleHistory && (
        <div className="modal-overlay" style={{ backdropFilter: 'blur(3px)', backgroundColor: 'rgba(15, 23, 42, 0.45)' }} onClick={() => setViewVehicleHistory(null)}>
          <div 
            className="modal-content" 
            style={{ 
              maxWidth: '820px', 
              width: '95%',
              borderRadius: '16px', 
              padding: '20px 24px', 
              boxShadow: '0 25px 50px -12px rgba(15, 23, 42, 0.25)',
              border: 'none',
              animation: 'modalSlideIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
            }} 
            onClick={(e) => e.stopPropagation()}
          >
            {/* MODAL HEADER */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '12px', borderBottom: '1px solid #f1f5f9' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '8px', backgroundColor: '#ecfdf5', color: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Truck size={18} />
                </div>
                <div>
                  <h2 style={{ fontSize: '16px', fontWeight: 800, margin: 0, color: '#0f172a' }}>
                    {viewVehicleHistory.vehicle_number} — Expense Ledger
                  </h2>
                  <div style={{ fontSize: '11.5px', color: '#64748b' }}>
                    {viewVehicleHistory.model_type} • Capacity: {viewVehicleHistory.capacity_tons} Tons
                  </div>
                </div>
              </div>
              <button onClick={() => setViewVehicleHistory(null)} style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '22px', cursor: 'pointer', lineHeight: 1 }}>×</button>
            </div>

            {/* CONTROLS TOOLBAR: 1. EXPORTS, 2. TYPE FILTER, 3. DATE FILTER */}
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center', 
              flexWrap: 'wrap', 
              gap: '10px', 
              marginTop: '14px', 
              padding: '10px 14px', 
              backgroundColor: '#f8fafc', 
              borderRadius: '8px', 
              border: '1px solid #e2e8f0' 
            }}>
              
              {/* CONTROL 1: EXPORT BUTTONS */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11.5px', padding: '4px 10px', fontWeight: 700 }}
                  onClick={handleExportLedgerCSV}
                  title="Export filtered expense ledger as CSV / Excel"
                >
                  <Download size={13} color="#059669" />
                  Export CSV
                </button>

                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11.5px', padding: '4px 10px', fontWeight: 700 }}
                  onClick={handleExportLedgerWord}
                  title="Export filtered expense ledger as Word Document (.doc)"
                >
                  <FileText size={13} color="#2563eb" />
                  Export Word Doc
                </button>
              </div>

              {/* FILTERS SECTION */}
              <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                
                {/* CONTROL 2: TYPE FILTER */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <Filter size={14} color="#64748b" />
                  <span style={{ fontSize: '11.5px', fontWeight: 700, color: '#334155' }}>Type:</span>
                  <select
                    className="form-select"
                    style={{ padding: '3px 8px', fontSize: '11.5px', fontWeight: 600, height: '30px', width: 'auto' }}
                    value={historyTypeFilter}
                    onChange={(e) => setHistoryTypeFilter(e.target.value)}
                  >
                    <option value="All">All Types</option>
                    <option value="Diesel">Diesel</option>
                    <option value="Service">Service</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                {/* CONTROL 3: DATE FILTER */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <Calendar size={14} color="#059669" />
                  <span style={{ fontSize: '11.5px', fontWeight: 700, color: '#334155' }}>Period:</span>
                  <select
                    className="form-select"
                    style={{ padding: '3px 8px', fontSize: '11.5px', fontWeight: 600, height: '30px', width: 'auto' }}
                    value={historyDatePreset}
                    onChange={(e) => setHistoryDatePreset(e.target.value)}
                  >
                    <option value="all">Complete History</option>
                    <option value="1day">Today (1 Day)</option>
                    <option value="1week">Last 7 Days (1 Week)</option>
                    <option value="1month">Last 30 Days (1 Month)</option>
                    <option value="1year">Last 1 Year (1 Year)</option>
                    <option value="custom">Custom Date Range</option>
                  </select>
                </div>

              </div>

            </div>

            {/* CUSTOM DATE RANGE PICKERS (IF SELECTED) */}
            {historyDatePreset === 'custom' && (
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '8px', 
                marginTop: '8px', 
                padding: '6px 12px', 
                backgroundColor: '#f0fdf4', 
                borderRadius: '6px', 
                border: '1px solid #bbf7d0',
                flexWrap: 'wrap'
              }}>
                <span style={{ fontSize: '11.5px', fontWeight: 700, color: '#166534' }}>From:</span>
                <input
                  type="date"
                  className="form-input"
                  style={{ padding: '2px 6px', fontSize: '11.5px', height: '28px', width: 'auto' }}
                  value={historyFromDate}
                  onChange={(e) => setHistoryFromDate(e.target.value)}
                />
                <span style={{ fontSize: '11.5px', fontWeight: 700, color: '#166534' }}>To:</span>
                <input
                  type="date"
                  className="form-input"
                  style={{ padding: '2px 6px', fontSize: '11.5px', height: '28px', width: 'auto' }}
                  value={historyToDate}
                  onChange={(e) => setHistoryToDate(e.target.value)}
                />
              </div>
            )}

            {/* LIVE SUMMARY STRIP */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '10px 0 6px 0', fontSize: '12px' }}>
              <div style={{ color: '#334155' }}>
                Showing <strong>{filteredExpenses.length}</strong> expense records • Total: <strong style={{ color: '#059669', fontSize: '13px', fontFamily: 'monospace' }}>₹{totalFilteredExpenseAmount.toLocaleString('en-IN')}</strong>
              </div>

              {(historyTypeFilter !== 'All' || historyDatePreset !== 'all') && (
                <button
                  type="button"
                  style={{ 
                    border: 'none', 
                    background: 'none', 
                    color: '#dc2626', 
                    fontSize: '11px', 
                    fontWeight: 700, 
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                  onClick={() => {
                    setHistoryTypeFilter('All');
                    setHistoryDatePreset('all');
                  }}
                >
                  <RotateCcw size={11} />
                  Reset Ledger Filters
                </button>
              )}
            </div>

            {/* LEDGER TABLE */}
            <div style={{ marginTop: '4px' }}>
              {historyLoading ? (
                <div style={{ textAlign: 'center', padding: '36px', color: '#94a3b8' }}>Loading expense history...</div>
              ) : (
                <div className="table-container" style={{ maxHeight: '360px', overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
                  <table className="data-table" style={{ fontSize: '12px', width: '100%' }}>
                    <thead>
                      <tr style={{ backgroundColor: '#f8fafc' }}>
                        <th>Date</th>
                        <th>Type</th>
                        <th>Details & Remarks</th>
                        <th style={{ textAlign: 'center' }}>Payment Mode</th>
                        <th style={{ textAlign: 'right' }}>Amount (₹)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredExpenses.length === 0 ? (
                        <tr>
                          <td colSpan="5" style={{ textAlign: 'center', color: '#94a3b8', padding: '24px' }}>
                            No expenses recorded matching the selected filter.
                          </td>
                        </tr>
                      ) : (
                        filteredExpenses.map(exp => (
                          <tr key={exp.id}>
                            <td style={{ whiteSpace: 'nowrap', fontWeight: 600, color: '#334155' }}>{exp.date}</td>
                            <td>
                              <span style={{ 
                                padding: '2px 7px', 
                                borderRadius: '4px', 
                                fontSize: '10.5px', 
                                fontWeight: 800,
                                backgroundColor: exp.expense_type === 'Diesel' ? '#fff7ed' : exp.expense_type === 'Service' ? '#eef2ff' : '#f0fdf4',
                                color: exp.expense_type === 'Diesel' ? '#c2410c' : exp.expense_type === 'Service' ? '#4338ca' : '#15803d'
                              }}>
                                {exp.expense_type}
                              </span>
                            </td>
                            <td>
                              {exp.expense_type === 'Diesel' && `${exp.liters || 0} L @ ₹${exp.rate_per_liter || 0}${exp.notes ? ` • ${exp.notes}` : ''}`}
                              {exp.expense_type === 'Service' && `${exp.service_type || 'Service'}${exp.garage_name ? ` • ${exp.garage_name}` : ''}${exp.notes ? ` • ${exp.notes}` : ''}`}
                              {exp.expense_type === 'Other' && `${exp.category || 'Other'}${exp.notes ? ` • ${exp.notes}` : ''}`}
                            </td>
                            <td style={{ textAlign: 'center' }}>
                              <span style={{ padding: '2px 6px', backgroundColor: '#f1f5f9', borderRadius: '4px', fontSize: '11px', color: '#475569', fontWeight: 600 }}>
                                {exp.payment_mode || 'Cash'}
                              </span>
                            </td>
                            <td style={{ textAlign: 'right', fontWeight: 800, fontFamily: 'monospace', color: '#0f172a' }}>
                              ₹{(Number(exp.amount) || 0).toLocaleString('en-IN')}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                    {filteredExpenses.length > 0 && (
                      <tfoot>
                        <tr style={{ backgroundColor: '#f8fafc', fontWeight: 800, borderTop: '2px solid #cbd5e1' }}>
                          <td colSpan="4" style={{ textAlign: 'right', padding: '10px 12px', fontSize: '12px', color: '#0f172a' }}>
                            TOTAL FILTERED EXPENSES:
                          </td>
                          <td style={{ textAlign: 'right', padding: '10px 12px', fontSize: '13px', color: '#059669', fontFamily: 'monospace' }}>
                            ₹{totalFilteredExpenseAmount.toLocaleString('en-IN')}
                          </td>
                        </tr>
                      </tfoot>
                    )}
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
