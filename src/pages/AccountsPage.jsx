import React, { useState, useEffect, useMemo } from 'react';
import { 
  PieChart, 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Receipt, 
  Truck, 
  Fuel, 
  Wrench, 
  UserCheck, 
  FileText, 
  Calendar, 
  Plus, 
  ArrowUpRight, 
  ArrowDownRight,
  ShieldAlert,
  Percent,
  Filter,
  RotateCcw,
  BarChart3,
  CreditCard,
  Smartphone,
  Banknote,
  Package,
  Layers,
  Download
} from 'lucide-react';

// REUSABLE CRISP SVG PIE / DONUT CHART
function DonutChart({ items, size = 180, innerRadius = 46, centerLabel = '', centerValue = '' }) {
  const total = items.reduce((sum, item) => sum + (Number(item.value) || 0), 0);
  const cx = size / 2;
  const cy = size / 2;
  const rOuter = (size / 2) - 8;
  const rInner = innerRadius;

  if (total <= 0 || items.length === 0) {
    return (
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={cx} cy={cy} r={rOuter} fill="none" stroke="#e2e8f0" strokeWidth={rOuter - rInner} />
        <text x={cx} y={cy} textAnchor="middle" dominantBaseline="middle" fontSize="11" fill="#94a3b8" fontWeight="600">
          No Data
        </text>
      </svg>
    );
  }

  const activeItems = items.filter(it => (Number(it.value) || 0) > 0);
  if (activeItems.length === 1) {
    const single = activeItems[0];
    return (
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle 
          cx={cx} 
          cy={cy} 
          r={(rOuter + rInner) / 2} 
          fill="none" 
          stroke={single.color || '#10b981'} 
          strokeWidth={rOuter - rInner} 
        />
        {centerLabel && (
          <text x={cx} y={cy - 6} textAnchor="middle" fontSize="10" fill="#64748b" fontWeight="700">
            {centerLabel}
          </text>
        )}
        {centerValue && (
          <text x={cx} y={cy + 11} textAnchor="middle" fontSize="12" fill="#0f172a" fontWeight="800" fontFamily="monospace">
            {centerValue}
          </text>
        )}
      </svg>
    );
  }

  let currentAngle = -Math.PI / 2;
  const slices = items.map((item, idx) => {
    const val = Number(item.value) || 0;
    const angle = (val / total) * 2 * Math.PI;
    const startAngle = currentAngle;
    const endAngle = currentAngle + angle;
    currentAngle = endAngle;

    const x1 = cx + rOuter * Math.cos(startAngle);
    const y1 = cy + rOuter * Math.sin(startAngle);
    const x2 = cx + rOuter * Math.cos(endAngle);
    const y2 = cy + rOuter * Math.sin(endAngle);

    const x3 = cx + rInner * Math.cos(endAngle);
    const y3 = cy + rInner * Math.sin(endAngle);
    const x4 = cx + rInner * Math.cos(startAngle);
    const y4 = cy + rInner * Math.sin(startAngle);

    const largeArc = angle > Math.PI ? 1 : 0;
    const path = `M ${x1} ${y1} A ${rOuter} ${rOuter} 0 ${largeArc} 1 ${x2} ${y2} L ${x3} ${y3} A ${rInner} ${rInner} 0 ${largeArc} 0 ${x4} ${y4} Z`;
    const pct = Math.round((val / total) * 100);

    return {
      ...item,
      path,
      pct,
      color: item.color || ['#10b981', '#3b82f6', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4'][idx % 6]
    };
  });

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ overflow: 'visible' }}>
      {slices.map((slice, i) => (
        <path
          key={i}
          d={slice.path}
          fill={slice.color}
          stroke="#ffffff"
          strokeWidth="2"
          style={{ transition: 'opacity 0.2s ease', cursor: 'pointer' }}
        >
          <title>{`${slice.label}: ₹${Number(slice.value).toLocaleString('en-IN')} (${slice.pct}%)`}</title>
        </path>
      ))}
      {centerLabel && (
        <text x={cx} y={cy - 6} textAnchor="middle" fontSize="10" fill="#64748b" fontWeight="700">
          {centerLabel}
        </text>
      )}
      {centerValue && (
        <text x={cx} y={cy + 11} textAnchor="middle" fontSize="12" fill="#0f172a" fontWeight="800" fontFamily="monospace">
          {centerValue}
        </text>
      )}
    </svg>
  );
}

// COMBINATION BAR & LINE CHART FOR REVENUE & PROFIT
function RevenueProfitComboChart({ points = [] }) {
  if (!points || points.length === 0) {
    return (
      <div style={{ padding: '36px', textAlign: 'center', color: '#94a3b8', fontSize: '13px' }}>
        No timeline data available for this range.
      </div>
    );
  }

  const svgWidth = 720;
  const svgHeight = 220;
  const padLeft = 64;
  const padRight = 36;
  const padTop = 32;
  const padBottom = 40;

  const chartW = svgWidth - padLeft - padRight;
  const chartH = svgHeight - padTop - padBottom;

  const maxVal = Math.max(
    ...points.map(p => Math.max(Number(p.revenue) || 0, Number(p.profit) || 0)),
    100000
  ) * 1.15;

  const stepX = chartW / points.length;
  const barWidth = Math.max(Math.min(stepX * 0.44, 40), 8);

  const coords = points.map((p, i) => {
    const cx = padLeft + (i + 0.5) * stepX;
    const rev = Math.max(0, Number(p.revenue) || 0);
    const bh = (rev / maxVal) * chartH;
    const by = padTop + chartH - bh;

    const prf = Number(p.profit) || 0;
    const py = padTop + chartH - (Math.max(0, prf) / maxVal) * chartH;

    return {
      ...p,
      cx,
      bx: cx - barWidth / 2,
      by,
      bw: barWidth,
      bh,
      py
    };
  });

  const linePath = coords.map((c, i) => `${i === 0 ? 'M' : 'L'} ${c.cx} ${c.py}`).join(' ');

  return (
    <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} style={{ width: '100%', height: '100%', overflow: 'visible' }}>
      <defs>
        <linearGradient id="barRevGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#10b981" />
          <stop offset="100%" stopColor="#34d399" stopOpacity="0.85" />
        </linearGradient>
      </defs>

      {/* Grid Lines */}
      {[0, 0.25, 0.5, 0.75, 1].map((ratio, idx) => {
        const y = padTop + chartH * (1 - ratio);
        const val = Math.round(maxVal * ratio);
        return (
          <g key={idx}>
            <line x1={padLeft} y1={y} x2={svgWidth - padRight} y2={y} stroke="#f1f5f9" strokeDasharray="3 3" />
            <text x={padLeft - 8} y={y + 3} textAnchor="end" fontSize="9" fill="#94a3b8" fontFamily="monospace" fontWeight="600">
              ₹{(val / 1000).toFixed(0)}k
            </text>
          </g>
        );
      })}

      {/* Baseline */}
      <line x1={padLeft} y1={padTop + chartH} x2={svgWidth - padRight} y2={padTop + chartH} stroke="#cbd5e1" strokeWidth="1" />

      {/* Revenue Bars */}
      {coords.map((c, i) => (
        <g key={`bar-${i}`}>
          <title>{`${c.label} - Revenue: ₹${(c.revenue || 0).toLocaleString('en-IN')}`}</title>
          <rect
            x={c.bx}
            y={c.by}
            width={c.bw}
            height={c.bh}
            rx="4"
            fill="url(#barRevGrad)"
            style={{ cursor: 'pointer', transition: 'all 0.3s ease' }}
          />
          {c.revenue > 0 && (
            <text
              x={c.cx}
              y={c.by - 6}
              textAnchor="middle"
              fontSize="9"
              fontWeight="800"
              fontFamily="monospace"
              fill="#059669"
            >
              ₹{((c.revenue || 0) / 1000).toFixed(0)}k
            </text>
          )}
        </g>
      ))}

      {/* Net Profit Line */}
      <path
        d={linePath}
        fill="none"
        stroke="#2563eb"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ filter: 'drop-shadow(0 2px 4px rgba(37,99,235,0.25))' }}
      />

      {/* Net Profit Dots */}
      {coords.map((c, i) => (
        <g key={`dot-${i}`}>
          <title>{`${c.label} - Net Profit: ₹${(c.profit || 0).toLocaleString('en-IN')}`}</title>
          <circle
            cx={c.cx}
            cy={c.py}
            r="4.5"
            fill="#2563eb"
            stroke="#ffffff"
            strokeWidth="2"
            style={{ cursor: 'pointer' }}
          />
          <text
            x={c.cx}
            y={c.py - 9}
            textAnchor="middle"
            fontSize="9"
            fontWeight="800"
            fontFamily="monospace"
            fill="#1d4ed8"
          >
            ₹{((c.profit || 0) / 1000).toFixed(0)}k
          </text>
        </g>
      ))}

      {/* X Axis Labels */}
      {coords.map((c, i) => (
        <text
          key={`lbl-${i}`}
          x={c.cx}
          y={padTop + chartH + 18}
          textAnchor="middle"
          fontSize="10"
          fontWeight="600"
          fill="#64748b"
        >
          {c.label}
        </text>
      ))}
    </svg>
  );
}

export default function AccountsPage({ onAccountUpdated }) {
  const [data, setData] = useState(null);
  const [products, setProducts] = useState([]);
  const [productFilter, setProductFilter] = useState('All');
  const [loading, setLoading] = useState(true);

  // Date & Period Filter State: 'all' | '1w' | '30d' | '3m' | '6m' | '1y' | '5y' | 'single' | 'custom'
  const [filterMode, setFilterMode] = useState('6m');
  const [singleDate, setSingleDate] = useState(new Date().toISOString().split('T')[0]);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  // Direct Expense Modal
  const [showDirectExpense, setShowDirectExpense] = useState(false);
  const [expType, setExpType] = useState('Expense');
  const [expCategory, setExpCategory] = useState('Office Rent & Utilities');
  const [expAmount, setExpAmount] = useState('');
  const [expDate, setExpDate] = useState(new Date().toISOString().split('T')[0]);
  const [expMode, setExpMode] = useState('Cash');
  const [expDesc, setExpDesc] = useState('');
  const [savingExp, setSavingExp] = useState(false);

  const fetchAccounts = async (mode = filterMode, sDate = singleDate, fDate = fromDate, tDate = toDate, prod = productFilter) => {
    try {
      setLoading(true);
      let url = '/api/accounts';
      const params = new URLSearchParams();

      if (['1w', '30d', '3m', '6m', '1y', '5y', 'all'].includes(mode)) {
        params.append('range', mode);
      } else if (mode === 'single' && sDate) {
        params.append('date', sDate);
      } else if (mode === 'custom' && fDate && tDate) {
        params.append('from_date', fDate);
        params.append('to_date', tDate);
      }

      if (prod && prod !== 'All') {
        params.append('product', prod);
      }

      if (params.toString()) {
        url += `?${params.toString()}`;
      }

      const res = await fetch(url);
      const json = await res.json();
      setData(json);
    } catch (err) {
      console.error('Error fetching accounts data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetch('/api/products')
      .then(r => r.json())
      .then(d => setProducts(d || []))
      .catch(err => console.error('Error loading products for filter:', err));

    fetchAccounts('6m');
  }, []);

  const handleFilterPresetChange = (preset) => {
    setFilterMode(preset);
    if (['1w', '30d', '3m', '6m', '1y', '5y', 'all'].includes(preset)) {
      fetchAccounts(preset, singleDate, fromDate, toDate, productFilter);
    } else if (preset === 'single') {
      fetchAccounts('single', singleDate, fromDate, toDate, productFilter);
    } else if (preset === 'custom' && fromDate && toDate) {
      fetchAccounts('custom', singleDate, fromDate, toDate, productFilter);
    }
  };

  const handleSingleDateChange = (dateVal) => {
    setSingleDate(dateVal);
    fetchAccounts('single', dateVal, fromDate, toDate, productFilter);
  };

  const handleProductFilterChange = (prod) => {
    setProductFilter(prod);
    fetchAccounts(filterMode, singleDate, fromDate, toDate, prod);
  };

  const getActiveFilterLabel = () => {
    if (filterMode === 'all') return 'All Time';
    if (filterMode === '1w') return 'Past 1 Week';
    if (filterMode === '30d') return 'Past 30 Days';
    if (filterMode === '3m') return 'Past 3 Months';
    if (filterMode === '6m') return 'Past 6 Months';
    if (filterMode === '1y') return 'Past 1 Year';
    if (filterMode === '5y') return 'Past 5 Years';
    if (filterMode === 'single') return `Single Date: ${singleDate}`;
    if (filterMode === 'custom') return fromDate && toDate ? `${fromDate} → ${toDate}` : 'Custom Range';
    return 'Active Filter';
  };

  const handleSaveDirectExpense = async (e) => {
    e.preventDefault();
    if (!expAmount || Number(expAmount) <= 0) return;

    try {
      setSavingExp(true);
      const res = await fetch('/api/accounts/ledger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: expDate,
          type: expType,
          category: expCategory,
          amount: Number(expAmount),
          payment_mode: expMode,
          description: expDesc
        })
      });

      if (!res.ok) throw new Error('Failed to record entry');

      setShowDirectExpense(false);
      setExpAmount('');
      setExpDesc('');
      fetchAccounts();
      if (onAccountUpdated) onAccountUpdated();
    } catch (err) {
      alert(err.message);
    } finally {
      setSavingExp(false);
    }
  };

  const summary = data?.summary || {};
  const taxes = data?.taxes || {};
  const workingCapital = data?.workingCapital || {};
  const operatingExpenses = summary.operatingExpenses || {};

  const totalRevenue = summary.totalRevenue || 0;
  const costOfGoods = summary.costOfGoods || summary.boughtPrice || 0;
  const cgst = summary.cgst !== undefined ? summary.cgst : (taxes.netCgstPayable || taxes.cgstOutput || 0);
  const sgst = summary.sgst !== undefined ? summary.sgst : (taxes.netSgstPayable || taxes.sgstOutput || 0);
  const tds = summary.tds !== undefined ? summary.tds : (taxes.totalTds || 0);
  const vehicleCharges = summary.vehicleCharges !== undefined ? summary.vehicleCharges : ((operatingExpenses.diesel || 0) + (operatingExpenses.service || 0) + (operatingExpenses.vehicleOther || 0));
  const employeeSalaries = summary.employeeSalaries !== undefined ? summary.employeeSalaries : (operatingExpenses.employeeSalaries || 0);
  const totalOpExpenses = operatingExpenses.total !== undefined ? operatingExpenses.total : (vehicleCharges + employeeSalaries);
  
  const diesel = operatingExpenses.diesel || summary.diesel || 0;
  // User Formula: Σ(total bill amount) - Σ(tds + cgst + sgst + bought in price + salary of employees + diesel)
  const totalDeductions = summary.totalDeductions !== undefined ? summary.totalDeductions : Math.round(tds + cgst + sgst + costOfGoods + employeeSalaries + diesel);
  const netProfit = summary.netProfit !== undefined ? summary.netProfit : Math.round(totalRevenue - totalDeductions);
  const netMargin = totalRevenue > 0 ? ((netProfit / totalRevenue) * 100).toFixed(1) : 0;

  // Analytics & Graph Data
  const topProducts = data?.topProducts || [];
  const monthlyAnalytics = data?.monthlyAnalytics || [];
  const collections = data?.collections || { cash: 0, upi: 0, bank: 0, totalCollected: 0, credit: 0 };

  const totalVol = (collections.totalCollected || 0) + (collections.credit || 0);
  const cashPct = totalVol > 0 ? Math.round((collections.cash / totalVol) * 100) : 0;
  const upiPct = totalVol > 0 ? Math.round(((collections.upi + collections.bank) / totalVol) * 100) : 0;
  const creditPct = totalVol > 0 ? Math.max(0, 100 - cashPct - upiPct) : 0;

  // Pie chart items for Highest Selling Products
  const productColors = ['#10b981', '#3b82f6', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4'];
  const topProductsPieItems = topProducts.map((p, idx) => ({
    label: p.name,
    value: p.revenue,
    qty: p.quantity,
    unit: p.unit || 'Tons',
    color: productColors[idx % productColors.length]
  }));

  // Pie chart items for Amount Collected Breakdown
  const collectionsPieItems = [
    { label: 'Cash Inflow', value: collections.cash || 0, color: '#10b981' },
    { label: 'UPI & Bank', value: (collections.upi || 0) + (collections.bank || 0), color: '#0284c7' },
    { label: 'Credit Dues', value: collections.credit || 0, color: '#ef4444' }
  ].filter(it => it.value > 0);

  // Format continuous timeline for charts
  const formatMonthLabel = (mKey) => {
    if (!mKey) return '';
    const [y, m] = mKey.split('-');
    const mNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    return `${mNames[parseInt(m, 10) - 1]} '${y.slice(2)}`;
  };

  const getTimelineMonths = () => {
    const map = Object.fromEntries(monthlyAnalytics.map(item => [item.month, item]));
    const now = new Date();
    const list = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const found = map[key] || { month: key, revenue: 0, profit: 0 };
      list.push({
        ...found,
        label: formatMonthLabel(key)
      });
    }
    return list;
  };

  const timelineMonths = getTimelineMonths();
  const chartPoints = (data?.timelineAnalytics?.points && data.timelineAnalytics.points.length > 0)
    ? data.timelineAnalytics.points
    : timelineMonths;

  // Export Accounts to CSV / Excel
  const handleExportAccountsCSV = () => {
    if (!data) return;
    const dateStr = new Date().toISOString().split('T')[0];

    const escapeCsv = (val) => {
      if (val === null || val === undefined) return '""';
      const str = String(val).replace(/"/g, '""');
      return `"${str}"`;
    };

    const lines = [
      'JAZLAN TRADERS - ACCOUNTS & PROFITS REPORT',
      `Generated On,${dateStr}`,
      `Filter Period,${getActiveFilterLabel()}`,
      `Product Filter,${productFilter}`,
      '',
      'EXECUTIVE FINANCIAL SUMMARY',
      'Metric,Amount (Rs)',
      `Revenue Generated (Total Sales Bills Sum),${totalRevenue}`,
      `Bought (Stock / Material Cost),${costOfGoods}`,
      `Net Profit (= Revenue - Bought),${netProfit}`,
      `Net Profit Margin (%),${netMargin}%`,
      `CGST Output,${cgst}`,
      `SGST Output,${sgst}`,
      `TDS Output,${tds}`,
      `Total Cash Collected,${collections.cash || 0}`,
      `Total UPI & Bank Collected,${(collections.upi || 0) + (collections.bank || 0)}`,
      `Total Collections Received,${collections.totalCollected || 0}`,
      `Customer Pending Credit Dues,${collections.credit || 0}`,
      '',
      'HIGHEST SELLING PRODUCTS',
      'Product Name,Quantity Sold,Unit,Total Revenue (Rs),Bills Count',
      ...topProducts.map(p => [
        escapeCsv(p.name),
        p.quantity,
        escapeCsv(p.unit || 'Tons'),
        p.revenue,
        p.billsCount
      ].join(',')),
      '',
      'REVENUE & PROFIT TIMELINE TRENDS',
      'Period,Revenue (Rs),Profit (Rs)',
      ...chartPoints.map(p => [
        escapeCsv(p.label),
        p.revenue,
        p.profit
      ].join(','))
    ];

    const csvContent = '\uFEFF' + lines.join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    const safeProd = productFilter !== 'All' ? `_${productFilter.replace(/\s+/g, '_')}` : '';
    link.setAttribute('download', `Jazlan_Accounts_Profits_${filterMode}${safeProd}_${dateStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  if (loading && !data) {
    return (
      <div className="page-content" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '300px' }}>
        <div style={{ color: '#64748b', fontSize: '14px', fontWeight: 600 }}>Loading Accounts & Financial Data...</div>
      </div>
    );
  }

  return (
    <div className="page-content">
      
      {/* FILTER BAR: SINGLE DATE, TIME PERIOD, PRODUCT FILTER & EXPORT CSV */}
      <div className="card" style={{ padding: '10px 14px', marginBottom: '14px', border: '1px solid #e2e8f0' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
          
          {/* PRESET FILTER BUTTONS */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginRight: '4px', color: '#334155', fontSize: '12px', fontWeight: 700 }}>
              <Filter size={13} color="#059669" />
              <span>Period:</span>
            </div>

            {[
              { id: '1w', label: '1 Week' },
              { id: '30d', label: '30 Days' },
              { id: '3m', label: '3 Months' },
              { id: '6m', label: '6 Months' },
              { id: '1y', label: '1 Year' },
              { id: '5y', label: '5 Years' },
              { id: 'all', label: 'All Time' },
              { id: 'single', label: 'Single Date' },
              { id: 'custom', label: 'Custom Range' }
            ].map(p => (
              <button
                key={p.id}
                type="button"
                className={`btn btn-sm ${filterMode === p.id ? 'btn-primary' : 'btn-secondary'}`}
                style={{ 
                  padding: '3px 9px', 
                  fontSize: '11px', 
                  height: '27px',
                  fontWeight: filterMode === p.id ? 800 : 500,
                  borderRadius: '5px'
                }}
                onClick={() => handleFilterPresetChange(p.id)}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* RIGHT SIDE CONTROLS: PRODUCT FILTER, DATES, RESET & EXPORT CSV */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            {filterMode === 'single' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px', backgroundColor: '#f8fafc', padding: '2px 6px', borderRadius: '5px', border: '1px solid #e2e8f0' }}>
                <Calendar size={13} color="#059669" />
                <input
                  type="date"
                  className="form-input"
                  style={{ padding: '2px 6px', fontSize: '11.5px', height: '24px', width: '130px', border: 'none', background: 'transparent' }}
                  value={singleDate}
                  onChange={(e) => handleSingleDateChange(e.target.value)}
                />
              </div>
            )}

            {filterMode === 'custom' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px', backgroundColor: '#f8fafc', padding: '2px 6px', borderRadius: '5px', border: '1px solid #e2e8f0' }}>
                <input
                  type="date"
                  className="form-input"
                  style={{ padding: '2px 6px', fontSize: '11.5px', height: '24px', width: '120px', border: 'none', background: 'transparent' }}
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                />
                <span style={{ fontSize: '11px', color: '#94a3b8' }}>→</span>
                <input
                  type="date"
                  className="form-input"
                  style={{ padding: '2px 6px', fontSize: '11.5px', height: '24px', width: '120px', border: 'none', background: 'transparent' }}
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                />
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  style={{ padding: '2px 8px', fontSize: '11px', height: '23px', borderRadius: '4px' }}
                  onClick={() => fetchAccounts('custom', singleDate, fromDate, toDate, productFilter)}
                >
                  Apply
                </button>
              </div>
            )}

            {filterMode !== 'all' && (
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                style={{ padding: '2px 7px', fontSize: '11px', height: '27px', display: 'flex', alignItems: 'center', gap: '3px', borderRadius: '5px' }}
                onClick={() => handleFilterPresetChange('all')}
                title="Reset to All Time"
              >
                <RotateCcw size={11} />
                Reset
              </button>
            )}

            {/* PRODUCT FILTER DROPDOWN */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px', backgroundColor: '#f8fafc', padding: '2px 8px', borderRadius: '5px', border: '1px solid #e2e8f0' }}>
              <Package size={13} color="#059669" />
              <span style={{ fontSize: '11px', fontWeight: 700, color: '#334155' }}>Product:</span>
              <select
                className="form-select"
                style={{ padding: '2px 6px', fontSize: '11px', fontWeight: 600, height: '25px', width: 'auto', border: 'none', background: 'transparent', outline: 'none', cursor: 'pointer' }}
                value={productFilter}
                onChange={(e) => handleProductFilterChange(e.target.value)}
              >
                <option value="All">All Products</option>
                {products.map(p => (
                  <option key={p.id} value={p.name}>{p.name}</option>
                ))}
              </select>
            </div>

            {/* EXPORT CSV BUTTON */}
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '3px 10px', height: '27px', fontSize: '11px', fontWeight: 700, borderRadius: '5px' }}
              onClick={handleExportAccountsCSV}
              title="Export complete financial report to Excel CSV"
            >
              <Download size={12} color="#059669" />
              Export CSV
            </button>

            <span className="badge-tag" style={{ backgroundColor: '#ecfdf5', color: '#065f46', border: '1px solid #a7f3d0', fontSize: '11px', padding: '3px 8px', fontWeight: 700 }}>
              {getActiveFilterLabel()}
            </span>
          </div>

        </div>
      </div>

      {/* CORRECTED 7 KPI CARDS IN ACCORDANCE WITH USER FORMULAS */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(7, minmax(130px, 1fr))', 
        gap: '8px', 
        marginBottom: '18px',
        width: '100%'
      }}>
        
        {/* 1. REVENUE GENERATED (+) */}
        <div className="stat-card" style={{ borderLeft: '3.5px solid #059669', padding: '9px 10px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3px' }}>
            <span style={{ fontSize: '9.5px', fontWeight: 800, color: '#059669', letterSpacing: '0.4px', whiteSpace: 'nowrap' }}>+ REVENUE</span>
            <span style={{ fontSize: '9px', backgroundColor: '#ecfdf5', color: '#059669', padding: '1px 4px', borderRadius: '3px', fontWeight: 700 }}>Sales</span>
          </div>
          <div style={{ fontSize: '15px', fontWeight: 800, color: '#059669', fontFamily: 'monospace', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            ₹{totalRevenue.toLocaleString('en-IN')}
          </div>
          <div style={{ fontSize: '10px', color: '#64748b', marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            Total Sales Bills
          </div>
        </div>

        {/* 2. BOUGHT PRICE (−) */}
        <div className="stat-card" style={{ borderLeft: '3.5px solid #475569', padding: '9px 10px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3px' }}>
            <span style={{ fontSize: '9.5px', fontWeight: 800, color: '#475569', letterSpacing: '0.4px', whiteSpace: 'nowrap' }}>− BOUGHT</span>
            <span style={{ fontSize: '9px', backgroundColor: '#f1f5f9', color: '#475569', padding: '1px 4px', borderRadius: '3px', fontWeight: 700 }}>Stock</span>
          </div>
          <div style={{ fontSize: '15px', fontWeight: 800, color: '#334155', fontFamily: 'monospace', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            ₹{costOfGoods.toLocaleString('en-IN')}
          </div>
          <div style={{ fontSize: '10px', color: '#64748b', marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            Material & Stock Cost
          </div>
        </div>

        {/* 3. CGST (−) */}
        <div className="stat-card" style={{ borderLeft: '3.5px solid #0284c7', padding: '9px 10px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3px' }}>
            <span style={{ fontSize: '9.5px', fontWeight: 800, color: '#0284c7', letterSpacing: '0.4px', whiteSpace: 'nowrap' }}>− CGST</span>
            <span style={{ fontSize: '9px', backgroundColor: '#e0f2fe', color: '#0369a1', padding: '1px 4px', borderRadius: '3px', fontWeight: 700 }}>Central</span>
          </div>
          <div style={{ fontSize: '15px', fontWeight: 800, color: '#0284c7', fontFamily: 'monospace', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            ₹{cgst.toLocaleString('en-IN')}
          </div>
          <div style={{ fontSize: '10px', color: '#64748b', marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            Central Tax (8%)
          </div>
        </div>

        {/* 4. SGST (−) */}
        <div className="stat-card" style={{ borderLeft: '3.5px solid #4f46e5', padding: '9px 10px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3px' }}>
            <span style={{ fontSize: '9.5px', fontWeight: 800, color: '#4f46e5', letterSpacing: '0.4px', whiteSpace: 'nowrap' }}>− SGST</span>
            <span style={{ fontSize: '9px', backgroundColor: '#eef2ff', color: '#4338ca', padding: '1px 4px', borderRadius: '3px', fontWeight: 700 }}>State</span>
          </div>
          <div style={{ fontSize: '15px', fontWeight: 800, color: '#4f46e5', fontFamily: 'monospace', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            ₹{sgst.toLocaleString('en-IN')}
          </div>
          <div style={{ fontSize: '10px', color: '#64748b', marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            State Tax (8%)
          </div>
        </div>

        {/* 5. NET PROFIT (=) [Revenue − Bought] */}
        <div className="stat-card" style={{ 
          borderLeft: `3.5px solid ${netProfit >= 0 ? '#10b981' : '#dc2626'}`, 
          backgroundColor: netProfit >= 0 ? '#f0fdf4' : '#fef2f2',
          padding: '9px 10px' 
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3px' }}>
            <span style={{ fontSize: '9.5px', fontWeight: 800, color: netProfit >= 0 ? '#166534' : '#991b1b', letterSpacing: '0.4px', whiteSpace: 'nowrap' }}>= NET PROFIT</span>
            <span style={{ 
              fontSize: '9px', 
              backgroundColor: netProfit >= 0 ? '#dcfce7' : '#fee2e2', 
              color: netProfit >= 0 ? '#15803d' : '#b91c1c', 
              padding: '1px 4px', 
              borderRadius: '3px', 
              fontWeight: 800 
            }}>
              {netMargin}%
            </span>
          </div>
          <div style={{ fontSize: '15px', fontWeight: 900, color: netProfit >= 0 ? '#15803d' : '#dc2626', fontFamily: 'monospace', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            ₹{netProfit.toLocaleString('en-IN')}
          </div>
          <div style={{ fontSize: '10px', color: netProfit >= 0 ? '#166534' : '#991b1b', marginTop: '2px', fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            Σ(Bills) − Σ(Deductions)
          </div>
        </div>

        {/* 6. TOTAL COLLECTED */}
        <div className="stat-card" style={{ borderLeft: '3.5px solid #0ea5e9', padding: '9px 10px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3px' }}>
            <span style={{ fontSize: '9.5px', fontWeight: 800, color: '#0284c7', letterSpacing: '0.4px', whiteSpace: 'nowrap' }}>COLLECTED</span>
            <span style={{ fontSize: '9px', backgroundColor: '#e0f2fe', color: '#0369a1', padding: '1px 4px', borderRadius: '3px', fontWeight: 700 }}>Inflow</span>
          </div>
          <div style={{ fontSize: '15px', fontWeight: 800, color: '#0284c7', fontFamily: 'monospace', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            ₹{(collections.totalCollected || 0).toLocaleString('en-IN')}
          </div>
          <div style={{ fontSize: '10px', color: '#64748b', marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            Cash + UPI / Bank
          </div>
        </div>

        {/* 7. PENDING CREDIT DUE */}
        <div className="stat-card" style={{ borderLeft: '3.5px solid #ef4444', padding: '9px 10px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3px' }}>
            <span style={{ fontSize: '9.5px', fontWeight: 800, color: '#dc2626', letterSpacing: '0.4px', whiteSpace: 'nowrap' }}>CREDIT DUE</span>
            <span style={{ fontSize: '9px', backgroundColor: '#fef2f2', color: '#b91c1c', padding: '1px 4px', borderRadius: '3px', fontWeight: 700 }}>Pending</span>
          </div>
          <div style={{ fontSize: '15px', fontWeight: 800, color: '#dc2626', fontFamily: 'monospace', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            ₹{(collections.credit || 0).toLocaleString('en-IN')}
          </div>
          <div style={{ fontSize: '10px', color: '#64748b', marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            Customer Dues
          </div>
        </div>

      </div>

      {/* ANALYTICS SECTION ROW 1: TOP PRODUCTS (PIE CHART) & AMOUNT COLLECTED (PIE CHART) */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 1fr', gap: '16px', marginBottom: '18px' }}>
        
        {/* GRAPH 1: HIGHEST SELLING PRODUCTS AS PIE / DONUT CHART */}
        <div className="card" style={{ padding: '16px 18px', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Package size={17} color="#059669" />
              <span style={{ fontSize: '14px', fontWeight: 800, color: '#0f172a' }}>Highest Selling Products</span>
            </div>
            <span className="badge-tag" style={{ backgroundColor: '#ecfdf5', color: '#065f46', border: '1px solid #a7f3d0', fontSize: '10.5px' }}>
              Sales Breakdown
            </span>
          </div>

          {topProductsPieItems.length === 0 ? (
            <div style={{ padding: '30px', textAlign: 'center', color: '#94a3b8', fontSize: '13px' }}>
              No product sales recorded for this period.
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '18px', flex: 1, flexWrap: 'wrap' }}>
              {/* PIE / DONUT VISUAL */}
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flexShrink: 0 }}>
                <DonutChart 
                  items={topProductsPieItems} 
                  size={180} 
                  innerRadius={46} 
                  centerLabel="Sales Sum" 
                  centerValue={`₹${(totalRevenue / 1000).toFixed(0)}k`} 
                />
              </div>

              {/* PRODUCT LEGEND LIST */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '7px', flex: 1, minWidth: '180px', maxHeight: '185px', overflowY: 'auto' }}>
                {topProductsPieItems.map((prod, idx) => {
                  const pct = totalRevenue > 0 ? Math.round((prod.value / totalRevenue) * 100) : 0;
                  return (
                    <div 
                      key={idx} 
                      style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'space-between', 
                        padding: '4px 8px', 
                        backgroundColor: '#f8fafc', 
                        borderRadius: '6px', 
                        border: '1px solid #e2e8f0' 
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '7px', minWidth: 0 }}>
                        <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: prod.color, flexShrink: 0 }} />
                        <span style={{ fontSize: '12px', fontWeight: 700, color: '#1e293b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {prod.label}
                        </span>
                        <span style={{ fontSize: '10px', color: '#64748b' }}>
                          ({prod.qty} {prod.unit})
                        </span>
                      </div>
                      <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: '8px' }}>
                        <span style={{ fontSize: '12px', fontWeight: 800, fontFamily: 'monospace', color: '#0f172a' }}>
                          ₹{prod.value.toLocaleString('en-IN')}
                        </span>
                        <span style={{ fontSize: '10px', color: '#059669', fontWeight: 700, marginLeft: '6px' }}>
                          {pct}%
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* GRAPH 2: AMOUNT COLLECTED (CASH, UPI, CREDIT) AS PIE / DONUT CHART */}
        <div className="card" style={{ padding: '16px 18px', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <PieChart size={17} color="#0284c7" />
              <span style={{ fontSize: '14px', fontWeight: 800, color: '#0f172a' }}>Amount Collected Breakdown</span>
            </div>
            <span className="badge-tag" style={{ backgroundColor: '#f0f9ff', color: '#0369a1', border: '1px solid #bae6fd', fontSize: '10.5px' }}>
              Liquidity & Dues
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '18px', flex: 1, flexWrap: 'wrap' }}>
            {/* PIE / DONUT VISUAL */}
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flexShrink: 0 }}>
              <DonutChart 
                items={collectionsPieItems} 
                size={180} 
                innerRadius={46} 
                centerLabel="Total Turnover" 
                centerValue={`₹${(totalVol / 1000).toFixed(0)}k`} 
              />
            </div>

            {/* STATS BREAKDOWN LIST */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '7px', flex: 1, minWidth: '180px' }}>
              {/* CASH INFLOW */}
              <div style={{ padding: '6px 10px', backgroundColor: '#f0fdf4', borderRadius: '6px', border: '1px solid #bbf7d0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Banknote size={13} color="#059669" />
                  <span style={{ fontSize: '11px', fontWeight: 800, color: '#166534' }}>Cash Inflow ({cashPct}%)</span>
                </div>
                <span className="font-mono" style={{ fontSize: '12.5px', fontWeight: 800, color: '#15803d' }}>
                  ₹{(collections.cash || 0).toLocaleString('en-IN')}
                </span>
              </div>

              {/* UPI & BANK */}
              <div style={{ padding: '6px 10px', backgroundColor: '#f0f9ff', borderRadius: '6px', border: '1px solid #bae6fd', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Smartphone size={13} color="#0284c7" />
                  <span style={{ fontSize: '11px', fontWeight: 800, color: '#0369a1' }}>UPI & Bank ({upiPct}%)</span>
                </div>
                <span className="font-mono" style={{ fontSize: '12.5px', fontWeight: 800, color: '#0284c7' }}>
                  ₹{((collections.upi || 0) + (collections.bank || 0)).toLocaleString('en-IN')}
                </span>
              </div>

              {/* PENDING CREDIT */}
              <div style={{ padding: '6px 10px', backgroundColor: '#fef2f2', borderRadius: '6px', border: '1px solid #fecaca', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <CreditCard size={13} color="#dc2626" />
                  <span style={{ fontSize: '11px', fontWeight: 800, color: '#991b1b' }}>Credit Dues ({creditPct}%)</span>
                </div>
                <span className="font-mono" style={{ fontSize: '12.5px', fontWeight: 800, color: '#dc2626' }}>
                  ₹{(collections.credit || 0).toLocaleString('en-IN')}
                </span>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* ANALYTICS SECTION ROW 2: COMBINATION BAR & LINE CHART (REVENUE & PROFIT) */}
      <div className="card" style={{ padding: '16px 20px', marginBottom: '22px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
          
          {/* TITLE & BADGE */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <BarChart3 size={18} color="#059669" />
            <div>
              <span style={{ fontSize: '14px', fontWeight: 800, color: '#0f172a' }}>
                Revenue & Net Profit Trends
              </span>
              <span style={{ fontSize: '11.5px', color: '#64748b', marginLeft: '8px' }}>
                (Combined Bar & Line Analytics)
              </span>
            </div>
          </div>

          {/* DUAL LEGEND & PERIOD SELECTOR */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            {/* DUAL LEGEND */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '11px', fontWeight: 700 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <span style={{ width: '12px', height: '10px', borderRadius: '2px', backgroundColor: '#10b981' }} />
                <span style={{ color: '#065f46' }}>Revenue [Bar]</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <span style={{ width: '14px', height: '3px', backgroundColor: '#2563eb', borderRadius: '2px' }} />
                <span style={{ color: '#1e40af' }}>Net Profit [Line]</span>
              </div>
            </div>

            {/* TIMELINE RANGE BUTTONS */}
            <div style={{ display: 'inline-flex', backgroundColor: '#f1f5f9', borderRadius: '6px', padding: '2px', gap: '2px' }}>
              {[
                { id: '1w', label: '1W' },
                { id: '30d', label: '30D' },
                { id: '3m', label: '3M' },
                { id: '6m', label: '6M' },
                { id: '1y', label: '1Y' },
                { id: '5y', label: '5Y' },
                { id: 'all', label: 'All' }
              ].map(item => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleFilterPresetChange(item.id)}
                  style={{
                    border: 'none',
                    background: filterMode === item.id ? '#059669' : 'transparent',
                    color: filterMode === item.id ? '#ffffff' : '#64748b',
                    fontSize: '10px',
                    fontWeight: filterMode === item.id ? 700 : 500,
                    padding: '2px 7px',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* COMBINATION BAR + LINE SVG CHART */}
        <div style={{ width: '100%', height: '220px' }}>
          <RevenueProfitComboChart points={chartPoints} />
        </div>
      </div>

      {/* RECENT ACCOUNTS LEDGER ENTRIES */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="card-header" style={{ padding: '18px 24px', margin: 0 }}>
          <div className="card-title">
            <FileText size={18} color="#059669" />
            <span>Recent Financial Ledger Transactions</span>
          </div>
          <span style={{ fontSize: '12px', color: '#64748b' }}>
            Synchronized with all billing & operational activity
          </span>
        </div>

        <div className="table-container" style={{ border: 'none' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Type</th>
                <th>Category</th>
                <th>Description</th>
                <th>Payment Mode</th>
                <th style={{ textAlign: 'right' }}>Amount (₹)</th>
              </tr>
            </thead>
            <tbody>
              {data?.recentLedger?.length === 0 ? (
                <tr><td colSpan="6" style={{ textAlign: 'center', padding: '36px', color: '#94a3b8' }}>No ledger transactions recorded yet.</td></tr>
              ) : (
                data?.recentLedger?.map((entry) => (
                  <tr key={entry.id}>
                    <td>{entry.date}</td>
                    <td>
                      <span style={{ 
                        padding: '2px 8px', 
                        borderRadius: '4px', 
                        fontSize: '11px', 
                        fontWeight: 800,
                        backgroundColor: entry.type === 'Income' ? '#ecfdf5' : '#fef2f2',
                        color: entry.type === 'Income' ? '#065f46' : '#991b1b'
                      }}>
                        {entry.type}
                      </span>
                    </td>
                    <td>
                      <span style={{ fontWeight: 600, color: '#0f172a' }}>{entry.category}</span>
                    </td>
                    <td style={{ color: '#475569', fontSize: '12.5px' }}>{entry.description || '—'}</td>
                    <td>{entry.payment_mode}</td>
                    <td style={{ 
                      textAlign: 'right', 
                      fontWeight: 800, 
                      fontFamily: 'monospace',
                      color: entry.type === 'Income' ? '#15803d' : '#dc2626'
                    }}>
                      {entry.type === 'Income' ? '+' : '-'}₹{entry.amount.toLocaleString('en-IN')}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL: DIRECT EXPENSE / INCOME */}
      {showDirectExpense && (
        <div className="modal-overlay" onClick={() => setShowDirectExpense(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Record Direct Expense / Income</h2>
              <button className="modal-close" onClick={() => setShowDirectExpense(false)}>×</button>
            </div>

            <form onSubmit={handleSaveDirectExpense}>
              <div className="form-grid-2">
                <div className="form-group">
                  <label className="form-label">Entry Type</label>
                  <select className="form-select" value={expType} onChange={(e) => setExpType(e.target.value)}>
                    <option value="Expense">Expense</option>
                    <option value="Income">Income / Other Receipt</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Category</label>
                  <select className="form-select" value={expCategory} onChange={(e) => setExpCategory(e.target.value)}>
                    <option value="Office Rent & Utilities">Office Rent & Utilities</option>
                    <option value="Electricity / EB Bill">Electricity / EB Bill</option>
                    <option value="Tea, Snacks & Guest Hospitality">Tea, Snacks & Guest Hospitality</option>
                    <option value="Printing & Stationery">Printing & Stationery</option>
                    <option value="Yard Crane / Forklift Hire">Yard Crane / Forklift Hire</option>
                    <option value="Audit & Legal Fee">Audit & Legal Fee</option>
                    <option value="Scrap Sale Income">Scrap Sale Income</option>
                    <option value="Miscellaneous">Miscellaneous</option>
                  </select>
                </div>
              </div>

              <div className="form-grid-2">
                <div className="form-group">
                  <label className="form-label">Amount (₹) *</label>
                  <input 
                    type="number"
                    step="0.01"
                    className="form-input"
                    value={expAmount}
                    onChange={(e) => setExpAmount(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Date</label>
                  <input 
                    type="date"
                    className="form-input"
                    value={expDate}
                    onChange={(e) => setExpDate(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Payment Mode</label>
                <select className="form-select" value={expMode} onChange={(e) => setExpMode(e.target.value)}>
                  <option value="Cash">Cash</option>
                  <option value="UPI">UPI / GPay</option>
                  <option value="Bank Transfer">Bank Transfer / NEFT</option>
                  <option value="Cheque">Cheque</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Description / Remarks</label>
                <input 
                  type="text"
                  className="form-input"
                  placeholder="e.g. Month EB charges for yard machinery"
                  value={expDesc}
                  onChange={(e) => setExpDesc(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowDirectExpense(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={savingExp}>
                  {savingExp ? 'Saving...' : 'Add to Ledger'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
