import React, { useState, useEffect, useMemo } from 'react';
import { 
  UserCheck, 
  CreditCard, 
  Plus, 
  Search, 
  Calendar, 
  DollarSign, 
  Eye, 
  User, 
  Briefcase,
  AlertCircle,
  Download,
  FileText,
  RotateCcw
} from 'lucide-react';

export default function EmployeesPage({ onEmployeeUpdated }) {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Add / Edit Employee Modal
  const [showEmpModal, setShowEmpModal] = useState(false);
  const [empName, setEmpName] = useState('');
  const [empType, setEmpType] = useState('Driver');
  const [empPhone, setEmpPhone] = useState('');
  const [savingEmp, setSavingEmp] = useState(false);

  // Pay Salary Modal
  const [payEmp, setPayEmp] = useState(null);
  const [payAmount, setPayAmount] = useState('');
  const [payDate, setPayDate] = useState(new Date().toISOString().split('T')[0]);
  const [payMonth, setPayMonth] = useState('October 2026');
  const [payMode, setPayMode] = useState('Cash');
  const [payNotes, setPayNotes] = useState('');
  const [savingPay, setSavingPay] = useState(false);
  const [savingCredit, setSavingCredit] = useState(false);

  // View Payments Ledger Modal & Date Filters
  const [viewEmp, setViewEmp] = useState(null);
  const [empPayments, setEmpPayments] = useState([]);
  const [ledgerLoading, setLedgerLoading] = useState(false);
  const [slipDatePreset, setSlipDatePreset] = useState('all'); // 'all' | '1day' | '1week' | '1month' | '1year' | 'custom'
  const [slipFromDate, setSlipFromDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split('T')[0];
  });
  const [slipToDate, setSlipToDate] = useState(() => new Date().toISOString().split('T')[0]);

  const fetchEmployees = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/employees');
      const data = await res.json();
      setEmployees(data || []);
    } catch (err) {
      console.error('Error fetching employees:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, []);

  const handleAddEmployee = async (e) => {
    e.preventDefault();
    if (!empName.trim() || !empType.trim()) return;

    try {
      setSavingEmp(true);
      const res = await fetch('/api/employees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: empName.trim(),
          employee_type: empType.trim(),
          phone: empPhone.trim(),
          salary_type: 'Monthly',
          base_salary: 0,
          current_credit_balance: 0
        })
      });

      if (!res.ok) throw new Error('Failed to create employee');

      setShowEmpModal(false);
      setEmpName('');
      setEmpPhone('');
      setEmpType('Driver');
      fetchEmployees();
      if (onEmployeeUpdated) onEmployeeUpdated();
    } catch (err) {
      alert(err.message);
    } finally {
      setSavingEmp(false);
    }
  };

  const handleOpenPaySalary = (emp) => {
    setPayEmp(emp);
    setPayAmount(emp.current_credit_balance > 0 ? emp.current_credit_balance : (emp.base_salary || ''));
    setPayDate(new Date().toISOString().split('T')[0]);
    setPayNotes('');
  };

  const handlePaySalarySubmit = async (e) => {
    e.preventDefault();
    if (!payAmount || Number(payAmount) <= 0) {
      alert('Please enter a valid disbursement amount');
      return;
    }

    try {
      setSavingPay(true);
      const res = await fetch(`/api/employees/${payEmp.id}/pay`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: Number(payAmount),
          date: payDate,
          payment_type: 'Salary',
          month_year: payMonth,
          payment_mode: payMode,
          notes: payNotes
        })
      });

      if (!res.ok) throw new Error('Salary payment failed');

      alert(`Salary payment of ₹${Number(payAmount).toLocaleString('en-IN')} recorded for ${payEmp.name}!`);
      setPayEmp(null);
      setPayAmount('');
      fetchEmployees();
      if (onEmployeeUpdated) onEmployeeUpdated();
    } catch (err) {
      alert(err.message);
    } finally {
      setSavingPay(false);
    }
  };

  const handleAddCreditSubmit = async () => {
    if (!payAmount || Number(payAmount) <= 0) {
      alert('Please enter a valid credit amount to add');
      return;
    }

    try {
      setSavingCredit(true);
      const res = await fetch(`/api/employees/${payEmp.id}/credit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: Number(payAmount),
          date: payDate,
          month_year: payMonth,
          notes: payNotes || 'Salary credit added to dues (to pay later)'
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to add credit');

      alert(`₹${Number(payAmount).toLocaleString('en-IN')} added to credit due balance for ${payEmp.name}!`);
      setPayEmp(null);
      setPayAmount('');
      fetchEmployees();
      if (onEmployeeUpdated) onEmployeeUpdated();
    } catch (err) {
      alert(err.message);
    } finally {
      setSavingCredit(false);
    }
  };

  const handleOpenLedger = async (emp) => {
    setViewEmp(emp);
    setSlipDatePreset('all');
    try {
      setLedgerLoading(true);
      const res = await fetch(`/api/employees/${emp.id}/payments`);
      const data = await res.json();
      setEmpPayments(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLedgerLoading(false);
    }
  };

  // Filtered Payments for the Employee Slip / Payment History Modal
  const filteredPayments = useMemo(() => {
    if (!empPayments) return [];
    let list = [...empPayments];

    const todayStr = new Date().toISOString().split('T')[0];
    if (slipDatePreset === '1day') {
      list = list.filter(p => p.date === todayStr);
    } else if (slipDatePreset === '1week') {
      const d = new Date();
      d.setDate(d.getDate() - 7);
      const startStr = d.toISOString().split('T')[0];
      list = list.filter(p => p.date >= startStr && p.date <= todayStr);
    } else if (slipDatePreset === '1month') {
      const d = new Date();
      d.setDate(d.getDate() - 30);
      const startStr = d.toISOString().split('T')[0];
      list = list.filter(p => p.date >= startStr && p.date <= todayStr);
    } else if (slipDatePreset === '1year') {
      const d = new Date();
      d.setFullYear(d.getFullYear() - 1);
      const startStr = d.toISOString().split('T')[0];
      list = list.filter(p => p.date >= startStr && p.date <= todayStr);
    } else if (slipDatePreset === 'custom') {
      if (slipFromDate) {
        list = list.filter(p => p.date >= slipFromDate);
      }
      if (slipToDate) {
        list = list.filter(p => p.date <= slipToDate);
      }
    }

    return list;
  }, [empPayments, slipDatePreset, slipFromDate, slipToDate]);

  const totalFilteredPayments = filteredPayments.reduce((s, p) => s + (Number(p.amount) || 0), 0);

  // Export Employee Payment Slip / History to CSV (Excel format)
  const handleExportSlipCSV = () => {
    if (!filteredPayments || filteredPayments.length === 0) {
      alert('No payment records found for the selected filter to export.');
      return;
    }

    const headers = [
      'Date',
      'Month / Period',
      'Payment Mode',
      'Notes / Remarks',
      'Amount Paid (Rs)'
    ];

    const escapeCsv = (val) => {
      if (val === null || val === undefined) return '""';
      const str = String(val).replace(/"/g, '""');
      return `"${str}"`;
    };

    const rows = filteredPayments.map((p) => [
      escapeCsv(p.date),
      escapeCsv(p.month_year || ''),
      escapeCsv(p.payment_mode || 'Cash'),
      escapeCsv(p.notes || ''),
      Number(p.amount) || 0
    ].join(','));

    // Total Row
    rows.push([
      '""',
      '""',
      '""',
      '"TOTAL SALARIES PAID"',
      totalFilteredPayments
    ].join(','));

    const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    const dateStr = new Date().toISOString().split('T')[0];
    const safeName = viewEmp?.name?.replace(/\s+/g, '_') || 'Employee';
    link.setAttribute('download', `${safeName}_Payment_History_${slipDatePreset}_${dateStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Export Employee Payment Slip / History to Word Document (.doc format)
  const handleExportSlipWord = () => {
    if (!filteredPayments || filteredPayments.length === 0) {
      alert('No payment records found for the selected filter to export.');
      return;
    }

    const empName = viewEmp?.name || 'Employee';
    const empRole = viewEmp?.employee_type || 'Staff';
    const empPhone = viewEmp?.phone || 'N/A';
    const dateStr = new Date().toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' });

    let rangeLabel = 'All Time Complete Payment History';
    if (slipDatePreset === '1day') rangeLabel = 'Today (1 Day)';
    else if (slipDatePreset === '1week') rangeLabel = 'Last 7 Days (1 Week)';
    else if (slipDatePreset === '1month') rangeLabel = 'Last 30 Days (1 Month)';
    else if (slipDatePreset === '1year') rangeLabel = 'Last 1 Year (1 Year)';
    else if (slipDatePreset === 'custom') rangeLabel = `${slipFromDate} to ${slipToDate}`;

    const tableRows = filteredPayments.map(p => `
      <tr>
        <td style="padding: 8px 10px; border: 1px solid #cbd5e1; white-space: nowrap;">${p.date}</td>
        <td style="padding: 8px 10px; border: 1px solid #cbd5e1;">${p.month_year || '—'}</td>
        <td style="padding: 8px 10px; border: 1px solid #cbd5e1; text-align: center;">${p.payment_mode || 'Cash'}</td>
        <td style="padding: 8px 10px; border: 1px solid #cbd5e1;">${p.notes || '—'}</td>
        <td style="padding: 8px 10px; border: 1px solid #cbd5e1; text-align: right; font-weight: bold;">₹${(Number(p.amount) || 0).toLocaleString('en-IN')}</td>
      </tr>
    `).join('');

    const wordHtml = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
      <head>
        <meta charset='utf-8'>
        <title>${empName} - Payment History Slip</title>
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
          <div class="title">JAZLAN TRADERS - SALARY & PAYMENT SLIP</div>
          <div class="subtitle">Generated on ${dateStr}</div>
        </div>

        <div class="meta-box">
          <table style="border: none; margin: 0;">
            <tr style="background: none;">
              <td style="border: none; padding: 4px;"><strong>Employee Name:</strong> ${empName}</td>
              <td style="border: none; padding: 4px;"><strong>Designated Role:</strong> ${empRole}</td>
            </tr>
            <tr style="background: none;">
              <td style="border: none; padding: 4px;"><strong>Mobile:</strong> ${empPhone}</td>
              <td style="border: none; padding: 4px;"><strong>Date Range:</strong> ${rangeLabel}</td>
            </tr>
          </table>
        </div>

        <table>
          <thead>
            <tr>
              <th style="width: 15%;">Date</th>
              <th style="width: 25%;">Month / Period</th>
              <th style="width: 15%; text-align: center;">Mode</th>
              <th style="width: 25%;">Notes / Remarks</th>
              <th style="width: 20%; text-align: right;">Amount Paid (₹)</th>
            </tr>
          </thead>
          <tbody>
            ${tableRows}
            <tr class="total-row">
              <td colspan="4" style="text-align: right;">TOTAL DISBURSED SALARIES (${filteredPayments.length} PAYMENTS):</td>
              <td style="text-align: right;">₹${totalFilteredPayments.toLocaleString('en-IN')}</td>
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
    const safeName = empName.replace(/\s+/g, '_');
    link.setAttribute('download', `${safeName}_Payment_Slip_${saveDate}.doc`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const filtered = employees.filter(e => 
    e.name.toLowerCase().includes(search.toLowerCase()) ||
    e.employee_type.toLowerCase().includes(search.toLowerCase()) ||
    (e.phone && e.phone.includes(search))
  );

  const totalPayrollPaid = employees.reduce((s, e) => s + (e.total_paid_salary || 0), 0);
  const totalEmployeeCredit = employees.reduce((s, e) => s + (e.current_credit_balance || 0), 0);

  return (
    <div className="page-content">
      {/* STATS */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-label">Total Staff & Drivers</div>
          <div className="stat-value">{employees.length}</div>
          <div className="stat-subtitle">Active workforce</div>
        </div>

        <div className="stat-card">
          <div className="stat-label">Total Salaries Disbursed</div>
          <div className="stat-value" style={{ color: '#10b981' }}>
            ₹{totalPayrollPaid.toLocaleString('en-IN')}
          </div>
          <div className="stat-subtitle">All-time payroll expenses</div>
        </div>

        <div className="stat-card">
          <div className="stat-label">Employee Credit / Advance Balance</div>
          <div className="stat-value" style={{ color: totalEmployeeCredit > 0 ? '#f59e0b' : '#334155' }}>
            ₹{totalEmployeeCredit.toLocaleString('en-IN')}
          </div>
          <div className="stat-subtitle">Pending salary dues or advance balance</div>
        </div>
      </div>

      {/* SEARCH & ADD EMPLOYEE BAR */}
      <div className="card" style={{ padding: '16px 20px', marginBottom: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px' }}>
          <div style={{ position: 'relative', width: '360px' }}>
            <Search size={16} color="#94a3b8" style={{ position: 'absolute', left: '12px', top: '11px' }} />
            <input
              type="text"
              className="form-input"
              placeholder="Search employee by name, type, phone..."
              style={{ paddingLeft: '36px' }}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <button className="btn btn-primary" onClick={() => setShowEmpModal(true)}>
            <Plus size={16} />
            Add Employee
          </button>
        </div>
      </div>

      {/* EMPLOYEES TABLE */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="card-header" style={{ padding: '18px 24px', margin: 0 }}>
          <div className="card-title">
            <UserCheck size={18} color="#059669" />
            <span>Staff Directory & Salary Ledger</span>
          </div>
          <span style={{ fontSize: '12px', color: '#64748b' }}>
            Total Employees: <strong>{filtered.length}</strong>
          </span>
        </div>

        <div className="table-container" style={{ border: 'none' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Employee Name</th>
                <th>Employee Type</th>
                <th>Contact</th>
                <th>Wage Scheme</th>
                <th style={{ textAlign: 'right' }}>Base Salary (₹)</th>
                <th style={{ textAlign: 'right' }}>Total Paid (₹)</th>
                <th style={{ textAlign: 'right' }}>Employee Credit / Balance</th>
                <th style={{ textAlign: 'center' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan="8" style={{ textAlign: 'center', padding: '36px', color: '#94a3b8' }}>
                    {loading ? 'Loading employee roster...' : 'No employees found.'}
                  </td>
                </tr>
              ) : (
                filtered.map((emp) => (
                  <tr key={emp.id}>
                    <td>
                      <div style={{ fontWeight: 800, color: '#0f172a', fontSize: '14px' }}>
                        {emp.name}
                      </div>
                    </td>
                    <td>
                      <span style={{ 
                        padding: '3px 9px', 
                        borderRadius: '4px', 
                        fontSize: '11px', 
                        fontWeight: 700,
                        backgroundColor: emp.employee_type === 'Driver' ? '#e0f2fe' : emp.employee_type.includes('Loader') ? '#fef3c7' : '#f1f5f9',
                        color: emp.employee_type === 'Driver' ? '#0369a1' : emp.employee_type.includes('Loader') ? '#b45309' : '#334155'
                      }}>
                        {emp.employee_type}
                      </span>
                    </td>
                    <td>{emp.phone || '—'}</td>
                    <td>
                      <span style={{ fontSize: '12px', fontWeight: 600, color: '#475569' }}>
                        {emp.salary_type}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 700, fontFamily: 'monospace' }}>
                      {emp.base_salary > 0 ? `₹${emp.base_salary.toLocaleString('en-IN')}` : '—'}
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 800, color: '#15803d', fontFamily: 'monospace' }}>
                      ₹{emp.total_paid_salary.toLocaleString('en-IN')}
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 800, fontFamily: 'monospace' }}>
                      {emp.current_credit_balance > 0 ? (
                        <span style={{ color: '#b45309', backgroundColor: '#fef3c7', border: '1px solid #fde68a', padding: '2px 8px', borderRadius: '4px', fontSize: '12px' }}>
                          ₹{emp.current_credit_balance.toLocaleString('en-IN')} Due
                        </span>
                      ) : (
                        <span style={{ color: '#64748b' }}>₹0</span>
                      )}
                    </td>
                    <td style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>
                      <div style={{ display: 'inline-flex', gap: '8px' }}>
                        {/* Pay Salary Option */}
                        <button 
                          className="btn btn-primary btn-sm"
                          onClick={() => handleOpenPaySalary(emp)}
                          title="Pay Salary or Add Credit"
                          style={{ backgroundColor: '#059669' }}
                        >
                          <CreditCard size={13} />
                          Pay Salary
                        </button>

                        <button 
                          className="btn btn-secondary btn-sm"
                          onClick={() => handleOpenLedger(emp)}
                          title="View Payment Slips"
                        >
                          <Eye size={13} />
                          Slip
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL: ADD EMPLOYEE (COMPACT & SIMPLIFIED) */}
      {showEmpModal && (
        <div className="modal-overlay" onClick={() => setShowEmpModal(false)}>
          <div className="modal-content" style={{ maxWidth: '440px', width: '100%' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Add New Employee</h2>
              <button className="modal-close" onClick={() => setShowEmpModal(false)}>×</button>
            </div>

            <form onSubmit={handleAddEmployee}>
              <div className="form-group" style={{ marginBottom: '14px' }}>
                <label className="form-label">Employee Full Name *</label>
                <input 
                  type="text"
                  className="form-input"
                  placeholder="e.g. Senthil Nathan"
                  value={empName}
                  onChange={(e) => setEmpName(e.target.value)}
                  required
                />
              </div>

              <div className="form-group" style={{ marginBottom: '14px' }}>
                <label className="form-label">Employee Designated Role / Type *</label>
                <input 
                  type="text"
                  list="employee-role-suggestions"
                  className="form-input"
                  placeholder="Type any role or select from list..."
                  value={empType}
                  onChange={(e) => setEmpType(e.target.value)}
                  required
                />
                <datalist id="employee-role-suggestions">
                  <option value="Driver" />
                  <option value="Yard Staff / Loader" />
                  <option value="Billing Operator" />
                  <option value="Sales Executive" />
                  <option value="Yard Supervisor" />
                  <option value="Manager" />
                  <option value="Accountant" />
                  <option value="Helper / Cleaner" />
                  <option value="Security Guard" />
                  <option value="Crane Operator" />
                  <option value="Mechanic" />
                  <option value="Site Supervisor" />
                </datalist>

                {/* Quick Selection Pills */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', marginTop: '6px' }}>
                  {['Driver', 'Loader', 'Billing Operator', 'Sales', 'Supervisor', 'Accountant', 'Helper'].map(r => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setEmpType(r)}
                      style={{
                        fontSize: '10.5px',
                        fontWeight: 600,
                        padding: '2px 8px',
                        borderRadius: '12px',
                        border: '1px solid #cbd5e1',
                        backgroundColor: empType === r ? '#e0f2fe' : '#f8fafc',
                        color: empType === r ? '#0369a1' : '#475569',
                        cursor: 'pointer'
                      }}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: '16px' }}>
                <label className="form-label">Phone Number (Optional)</label>
                <input 
                  type="text"
                  className="form-input"
                  placeholder="e.g. 9842100011"
                  value={empPhone}
                  onChange={(e) => setEmpPhone(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px', paddingTop: '12px', borderTop: '1px solid #e2e8f0' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowEmpModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={savingEmp}>
                  {savingEmp ? 'Saving...' : 'Add Employee'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: PAY SALARY / ADD CREDIT OPTION */}
      {payEmp && (
        <div className="modal-overlay" onClick={() => setPayEmp(null)}>
          <div className="modal-content" style={{ maxWidth: '520px', width: '100%' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h2 className="modal-title">Pay / Settle: {payEmp.name}</h2>
                <div style={{ fontSize: '12px', color: '#64748b' }}>
                  Role: <strong>{payEmp.employee_type}</strong> {payEmp.phone ? `• ${payEmp.phone}` : ''}
                </div>
              </div>
              <button className="modal-close" onClick={() => setPayEmp(null)}>×</button>
            </div>

            <form onSubmit={handlePaySalarySubmit}>
              {/* STATUS SUMMARY */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', padding: '12px', backgroundColor: '#f8fafc', borderRadius: '8px', marginBottom: '16px', border: '1px solid #e2e8f0' }}>
                <div>
                  <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>Total Paid So Far:</div>
                  <div style={{ fontSize: '16px', fontWeight: 800, color: '#15803d', fontFamily: 'monospace' }}>
                    ₹{(payEmp.total_paid_salary || 0).toLocaleString('en-IN')}
                  </div>
                </div>
                <div style={{ backgroundColor: payEmp.current_credit_balance > 0 ? '#fef3c7' : 'transparent', padding: payEmp.current_credit_balance > 0 ? '4px 8px' : 0, borderRadius: '4px' }}>
                  <div style={{ fontSize: '11px', color: payEmp.current_credit_balance > 0 ? '#b45309' : '#64748b', fontWeight: 700 }}>
                    Current Credit Due Balance:
                  </div>
                  <div style={{ fontSize: '16px', fontWeight: 900, color: payEmp.current_credit_balance > 0 ? '#b45309' : '#334155', fontFamily: 'monospace' }}>
                    ₹{(payEmp.current_credit_balance || 0).toLocaleString('en-IN')}
                  </div>
                  {payEmp.current_credit_balance > 0 && (
                    <div style={{ fontSize: '10px', color: '#92400e', fontWeight: 700 }}>
                      ⚠️ Remind owner to pay later
                    </div>
                  )}
                </div>
              </div>

              {/* AMOUNT & DATE (PAYMENT TYPE REMOVED) */}
              <div className="form-grid-2">
                <div className="form-group">
                  <label className="form-label">Amount (₹) *</label>
                  <input 
                    type="number"
                    step="0.01"
                    min="1"
                    className="form-input"
                    placeholder="Enter amount"
                    value={payAmount}
                    onChange={(e) => setPayAmount(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Date *</label>
                  <input 
                    type="date"
                    className="form-input"
                    value={payDate}
                    onChange={(e) => setPayDate(e.target.value)}
                    required
                  />
                </div>
              </div>

              {/* MONTH & MODE */}
              <div className="form-grid-2">
                <div className="form-group">
                  <label className="form-label">Pay Period / Month</label>
                  <input 
                    type="text"
                    className="form-input"
                    placeholder="e.g. Oct 2026"
                    value={payMonth}
                    onChange={(e) => setPayMonth(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Disbursement Mode (for payout)</label>
                  <select className="form-select" value={payMode} onChange={(e) => setPayMode(e.target.value)}>
                    <option value="Cash">Cash</option>
                    <option value="UPI">UPI / GPay</option>
                    <option value="Bank Transfer">Bank Transfer / NEFT</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Payment Notes / Voucher Ref</label>
                <input 
                  type="text"
                  className="form-input"
                  placeholder="e.g. Oct salary or advance voucher"
                  value={payNotes}
                  onChange={(e) => setPayNotes(e.target.value)}
                />
              </div>

              {/* 3 BUTTONS FOOTER: CANCEL, ADD CREDIT, DISBURSE */}
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center', 
                marginTop: '20px', 
                paddingTop: '14px', 
                borderTop: '1px solid #e2e8f0',
                flexWrap: 'wrap',
                gap: '10px'
              }}>
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={() => setPayEmp(null)}
                >
                  Cancel
                </button>

                <div style={{ display: 'flex', gap: '8px' }}>
                  <button 
                    type="button" 
                    className="btn"
                    style={{ 
                      backgroundColor: '#d97706', 
                      borderColor: '#b45309', 
                      color: '#ffffff',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px',
                      fontWeight: 700,
                      fontSize: '12.5px'
                    }}
                    disabled={savingCredit || savingPay}
                    onClick={handleAddCreditSubmit}
                    title="Add this amount to employee credit due balance to remind owner to pay later"
                  >
                    <CreditCard size={14} />
                    {savingCredit ? 'Adding Credit...' : '+ Add Credit'}
                  </button>

                  <button 
                    type="submit" 
                    className="btn btn-success" 
                    disabled={savingPay || savingCredit}
                    style={{ 
                      display: 'inline-flex', 
                      alignItems: 'center', 
                      gap: '5px', 
                      fontWeight: 700,
                      fontSize: '12.5px'
                    }}
                  >
                    <UserCheck size={14} />
                    {savingPay ? 'Processing...' : 'Disburse & Log Salary'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: VIEW EMPLOYEE PAYMENTS LEDGER & SLIP */}
      {viewEmp && (
        <div className="modal-overlay" style={{ backdropFilter: 'blur(3px)', backgroundColor: 'rgba(15, 23, 42, 0.45)' }} onClick={() => setViewEmp(null)}>
          <div 
            className="modal-content" 
            style={{ 
              maxWidth: '780px', 
              width: '95%',
              borderRadius: '16px', 
              padding: '20px 24px', 
              boxShadow: '0 25px 50px -12px rgba(15, 23, 42, 0.25)',
              border: 'none',
              animation: 'modalSlideIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
            }} 
            onClick={(e) => e.stopPropagation()}
          >
            {/* HEADER */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '12px', borderBottom: '1px solid #f1f5f9' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '8px', backgroundColor: '#ecfdf5', color: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <UserCheck size={18} />
                </div>
                <div>
                  <h2 style={{ fontSize: '16px', fontWeight: 800, margin: 0, color: '#0f172a' }}>
                    {viewEmp.name} — Payment History
                  </h2>
                  <div style={{ fontSize: '11.5px', color: '#64748b' }}>
                    {viewEmp.employee_type} • Mobile: {viewEmp.phone || 'N/A'}
                  </div>
                </div>
              </div>
              <button onClick={() => setViewEmp(null)} style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '22px', cursor: 'pointer', lineHeight: 1 }}>×</button>
            </div>

            {/* CONTROLS TOOLBAR: 1. EXPORT CSV / WORD, 2. DATE FILTER */}
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
              
              {/* EXPORT BUTTONS */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11.5px', padding: '4px 10px', fontWeight: 700 }}
                  onClick={handleExportSlipCSV}
                  title="Export filtered payment history as CSV / Excel"
                >
                  <Download size={13} color="#059669" />
                  Export CSV
                </button>

                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11.5px', padding: '4px 10px', fontWeight: 700 }}
                  onClick={handleExportSlipWord}
                  title="Export salary slip as Word Document (.doc)"
                >
                  <FileText size={13} color="#2563eb" />
                  Export Word Doc
                </button>
              </div>

              {/* DATE FILTER */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Calendar size={14} color="#059669" />
                <span style={{ fontSize: '11.5px', fontWeight: 700, color: '#334155' }}>Period:</span>
                <select
                  className="form-select"
                  style={{ padding: '3px 8px', fontSize: '11.5px', fontWeight: 600, height: '30px', width: 'auto' }}
                  value={slipDatePreset}
                  onChange={(e) => setSlipDatePreset(e.target.value)}
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

            {/* CUSTOM DATE RANGE PICKERS (IF SELECTED) */}
            {slipDatePreset === 'custom' && (
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
                  value={slipFromDate}
                  onChange={(e) => setSlipFromDate(e.target.value)}
                />
                <span style={{ fontSize: '11.5px', fontWeight: 700, color: '#166534' }}>To:</span>
                <input
                  type="date"
                  className="form-input"
                  style={{ padding: '2px 6px', fontSize: '11.5px', height: '28px', width: 'auto' }}
                  value={slipToDate}
                  onChange={(e) => setSlipToDate(e.target.value)}
                />
              </div>
            )}

            {/* LIVE SUMMARY STRIP */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '10px 0 6px 0', fontSize: '12px' }}>
              <div style={{ color: '#334155' }}>
                Showing <strong>{filteredPayments.length}</strong> payment records • Total Disbursed: <strong style={{ color: '#059669', fontSize: '13px', fontFamily: 'monospace' }}>₹{totalFilteredPayments.toLocaleString('en-IN')}</strong>
              </div>

              {slipDatePreset !== 'all' && (
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
                  onClick={() => setSlipDatePreset('all')}
                >
                  <RotateCcw size={11} />
                  Reset Date Filter
                </button>
              )}
            </div>

            {/* LEDGER TABLE */}
            <div style={{ marginTop: '4px' }}>
              {ledgerLoading ? (
                <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>Loading payroll records...</div>
              ) : (
                <div className="table-container" style={{ maxHeight: '340px', overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
                  <table className="data-table" style={{ fontSize: '12px', width: '100%' }}>
                    <thead>
                      <tr style={{ backgroundColor: '#f8fafc' }}>
                        <th>Date</th>
                        <th>Month / Period</th>
                        <th style={{ textAlign: 'center' }}>Mode</th>
                        <th>Notes / Remarks</th>
                        <th style={{ textAlign: 'right' }}>Amount Paid (₹)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredPayments.length === 0 ? (
                        <tr>
                          <td colSpan="5" style={{ textAlign: 'center', color: '#94a3b8', padding: '24px' }}>
                            No payment records found matching the selected filter.
                          </td>
                        </tr>
                      ) : (
                        filteredPayments.map(p => (
                          <tr key={p.id}>
                            <td style={{ whiteSpace: 'nowrap', fontWeight: 600, color: '#334155' }}>{p.date}</td>
                            <td>{p.month_year || '—'}</td>
                            <td style={{ textAlign: 'center' }}>
                              <span style={{ padding: '2px 7px', backgroundColor: '#f1f5f9', borderRadius: '4px', fontSize: '11px', color: '#475569', fontWeight: 600 }}>
                                {p.payment_mode || 'Cash'}
                              </span>
                            </td>
                            <td>{p.notes || '—'}</td>
                            <td style={{ textAlign: 'right', fontWeight: 800, fontFamily: 'monospace', color: '#0f172a' }}>
                              ₹{p.amount.toLocaleString('en-IN')}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                    {filteredPayments.length > 0 && (
                      <tfoot>
                        <tr style={{ backgroundColor: '#f8fafc', fontWeight: 800, borderTop: '2px solid #cbd5e1' }}>
                          <td colSpan="4" style={{ textAlign: 'right', padding: '10px 12px', fontSize: '12px', color: '#0f172a' }}>
                            TOTAL FILTERED SALARIES PAID:
                          </td>
                          <td style={{ textAlign: 'right', padding: '10px 12px', fontSize: '13px', color: '#059669', fontFamily: 'monospace' }}>
                            ₹{totalFilteredPayments.toLocaleString('en-IN')}
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
