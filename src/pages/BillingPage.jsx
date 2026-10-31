import React, { useState, useEffect } from 'react';
import { 
  Receipt, 
  Plus, 
  RefreshCw, 
  Truck, 
  Tractor, 
  Package, 
  User, 
  Phone, 
  MapPin, 
  CreditCard, 
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  FileText,
  Printer,
  Eye
} from 'lucide-react';
import InvoicePrintModal from '../components/InvoicePrintModal';

export default function BillingPage({ onBillCreated, nextBillNo }) {
  // Vehicle Selection Type: 'fleet' or 'others'
  const [vehicleType, setVehicleType] = useState('fleet'); // 'fleet' | 'others'
  const [vehicleId, setVehicleId] = useState('');
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [driverName, setDriverName] = useState('');

  // Tax Toggles
  const [cgstEnabled, setCgstEnabled] = useState(true); // 9%
  const [sgstEnabled, setSgstEnabled] = useState(true); // 9%
  const [tdsEnabled, setTdsEnabled] = useState(true);   // 2% (default ON)
  const [rentTransport, setRentTransport] = useState(0);

  // Product & Customer Info
  const [productId, setProductId] = useState('');
  const [productName, setProductName] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [customerGstin, setCustomerGstin] = useState('');

  // Quantity & Rate
  const [kg, setKg] = useState(3000);
  const [ratePerTon, setRatePerTon] = useState(54500);
  const [boughtPricePerUnit, setBoughtPricePerUnit] = useState(49000);

  // Settlement & Payment
  const [isManualTotal, setIsManualTotal] = useState(false);
  const [manualTotalAmount, setManualTotalAmount] = useState('');
  const [paidAmount, setPaidAmount] = useState('');
  const [billDate, setBillDate] = useState(new Date().toISOString().split('T')[0]);
  const [paymentMode, setPaymentMode] = useState('Cash');
  const [previousActiveMode, setPreviousActiveMode] = useState('Cash');
  const [billerName, setBillerName] = useState('Admin');
  const [notes, setNotes] = useState('');

  // Dropdown Data
  const [products, setProducts] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Quick Modals
  const [showAddVehicleModal, setShowAddVehicleModal] = useState(false);
  const [showAddProductModal, setShowAddProductModal] = useState(false);
  const [showAddCustomerModal, setShowAddCustomerModal] = useState(false);
  const [quickVehNum, setQuickVehNum] = useState('');
  const [quickVehModel, setQuickVehModel] = useState('10 Wheeler Tipper');
  const [quickVehCap, setQuickVehCap] = useState(16);
  const [quickVehDriver, setQuickVehDriver] = useState('');

  const [quickProdName, setQuickProdName] = useState('');
  const [quickProdRate, setQuickProdRate] = useState('');
  const [quickCustName, setQuickCustName] = useState('');
  const [quickCustPhone, setQuickCustPhone] = useState('');

  // Print Invoice Modal
  const [createdBill, setCreatedBill] = useState(null);
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [recentBills, setRecentBills] = useState([]);

  // Fetch Form Dropdowns
  const loadFormData = async () => {
    try {
      setLoading(true);
      const [prodRes, vehRes, custRes, billsRes] = await Promise.all([
        fetch('/api/products').then(r => r.json()),
        fetch('/api/vehicles').then(r => r.json()),
        fetch('/api/customers').then(r => r.json()),
        fetch('/api/bills').then(r => r.json())
      ]);

      setProducts(prodRes || []);
      setVehicles(vehRes || []);
      setCustomers(custRes || []);
      setRecentBills(billsRes?.slice(0, 5) || []);

      if (prodRes && prodRes.length > 0 && !productId) {
        const first = prodRes[0];
        setProductId(first.id);
        setProductName(first.name);
        setRatePerTon(first.default_sell_rate || 54500);
        setBoughtPricePerUnit(first.default_bought_rate || 49000);
      }
    } catch (err) {
      console.error('Error loading form data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFormData();
  }, []);

  // Handle Vehicle Selection
  const handleSelectCompanyVehicle = (id) => {
    setVehicleId(id);
    const v = vehicles.find(veh => String(veh.id) === String(id));
    if (v) {
      setVehicleNumber(v.vehicle_number);
      if (v.driver_name) setDriverName(v.driver_name);
    } else {
      setVehicleNumber('');
      setDriverName('');
    }
  };

  // Handle Product Selection
  const handleSelectProduct = (id) => {
    setProductId(id);
    const prod = products.find(p => String(p.id) === String(id));
    if (prod) {
      setProductName(prod.name);
      setRatePerTon(prod.default_sell_rate || 54500);
      setBoughtPricePerUnit(prod.default_bought_rate || 49000);
    }
  };

  // Handle Customer Selection
  const handleSelectCustomer = (name) => {
    setCustomerName(name);
    const cust = customers.find(c => c.name.toLowerCase() === name.toLowerCase());
    if (cust) {
      setCustomerPhone(cust.phone || '');
      setCustomerAddress(cust.address || '');
      setCustomerGstin(cust.gstin || '');
    }
  };

  // Live Metric Calculations
  const netKg = Number(kg || 0);
  const tons = netKg / 1000;
  const rateVal = Number(ratePerTon || 0);
  const subtotal = Math.round(tons * rateVal);
  const rentVal = Number(rentTransport || 0);
  const taxableBase = subtotal + rentVal;

  const cgstRate = cgstEnabled ? 9 : 0;
  const sgstRate = sgstEnabled ? 9 : 0;
  const totalGstRate = cgstRate + sgstRate;
  const cgstAmount = Math.round((taxableBase * cgstRate) / 100);
  const sgstAmount = Math.round((taxableBase * sgstRate) / 100);
  const totalGstAmount = cgstAmount + sgstAmount;

  const tdsRate = tdsEnabled ? 2 : 0;
  const tdsAmount = Math.round((taxableBase * tdsRate) / 100);

  const calculatedTotal = Math.round(taxableBase + totalGstAmount + tdsAmount);
  const effectiveTotal = isManualTotal && manualTotalAmount ? Number(manualTotalAmount) : calculatedTotal;

  // Auto-fill paid amount when total changes if paid amount was matching previous total or empty
  useEffect(() => {
    if (paidAmount === '' || Number(paidAmount) === calculatedTotal) {
      setPaidAmount(effectiveTotal);
    }
  }, [effectiveTotal]);

  const paidNum = paidAmount === '' ? 0 : Number(paidAmount);
  const remainingCreditDue = Math.max(0, effectiveTotal - paidNum);
  const isZeroPaid = paidAmount !== '' && Number(paidAmount) === 0;

  // Automatic Credit mode when paid amount is 0; restore payment mode when > 0
  useEffect(() => {
    if (isZeroPaid) {
      if (paymentMode !== 'Credit') {
        setPreviousActiveMode(paymentMode);
        setPaymentMode('Credit');
      }
    } else if (Number(paidAmount) > 0) {
      if (paymentMode === 'Credit') {
        setPaymentMode(previousActiveMode && previousActiveMode !== 'Credit' ? previousActiveMode : 'Cash');
      }
    }
  }, [paidAmount, isZeroPaid]);

  // Handle Form Submit
  const handleSubmitBill = async (e) => {
    e.preventDefault();
    if (!customerName.trim()) {
      alert('Please enter or select a customer name.');
      return;
    }
    if (!productName.trim() || netKg <= 0 || rateVal <= 0) {
      alert('Please enter valid product, weight in kg, and rate per ton.');
      return;
    }

    try {
      setSubmitting(true);
      const res = await fetch('/api/bills', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_name: customerName.trim(),
          customer_phone: customerPhone.trim(),
          customer_address: customerAddress.trim(),
          customer_gstin: customerGstin.trim(),
          vehicle_id: vehicleType === 'fleet' ? vehicleId || null : null,
          vehicle_number: vehicleNumber.trim().toUpperCase(),
          driver_name: driverName.trim(),
          product_id: productId || null,
          product_name: productName.trim(),
          quantity: tons,
          unit: 'Tons',
          rate: rateVal,
          bought_price_per_unit: Number(boughtPricePerUnit || 0),
          rent_transport: rentVal,
          gst_rate: totalGstRate,
          tds_rate: tdsRate,
          total_amount: effectiveTotal,
          amount_received: paidNum,
          payment_mode: paidNum === 0 ? 'Credit' : paymentMode,
          notes: notes.trim(),
          biller_name: billerName || 'Admin',
          date: billDate
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save bill');

      setCreatedBill(data.bill);
      setShowPrintModal(true);
      if (onBillCreated) onBillCreated(data.bill);

      // Reload dropdowns
      loadFormData();
    } catch (err) {
      alert('Error: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleReset = () => {
    setCustomerName('');
    setCustomerPhone('');
    setCustomerAddress('');
    setCustomerGstin('');
    setVehicleId('');
    setVehicleNumber('');
    setDriverName('');
    setKg(3000);
    setRentTransport(0);
    setCgstEnabled(true);
    setSgstEnabled(true);
    setTdsEnabled(true);
    setIsManualTotal(false);
    setManualTotalAmount('');
    setNotes('');
    setCreatedBill(null);
  };

  // Preview Current Bill Form Before Submitting
  const handlePreviewCurrentBill = () => {
    const custObj = customers.find(c => c.name.toLowerCase() === customerName.toLowerCase());
    const prodObj = products.find(p => p.name.toLowerCase() === productName.toLowerCase());

    const previewData = {
      bill_no: nextBillNo || 'JS001',
      date: billDate || new Date().toISOString().split('T')[0],
      time: new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' }),
      customer_id: custObj?.id || 1,
      customer_name: customerName.trim() || 'Sathyam Traders',
      customer_address: customerAddress || custObj?.address || '19/02\nT.H. Road, Tondiarpet\nChennai 600081',
      customer_gstin: customerGstin || custObj?.gstin || '33GWMPS0522P1ZZ',
      product_id: productId || prodObj?.id || 1,
      product_name: productName.trim() || 'MS SCRAP',
      hsn_code: prodObj?.hsn_code || '7204',
      quantity: netKg || 13410,
      unit: prodObj?.unit || 'KGS',
      rate: rateVal || 37.20,
      subtotal: subtotal || 498852,
      rent_transport: rentVal,
      gst_rate: totalGstRate || 18,
      cgst_amount: cgstAmount || 44896.68,
      sgst_amount: sgstAmount || 44896.68,
      tds_rate: tdsRate || 2,
      tds_amount: tdsAmount || 9977.04,
      total_amount: effectiveTotal || 588646,
      amount_received: paidNum,
      balance_due: remainingCreditDue,
      payment_mode: paidNum === 0 ? 'Credit' : paymentMode,
      payment_status: remainingCreditDue === 0 ? 'Paid' : paidNum > 0 ? 'Partial' : 'Credit',
      vehicle_number: vehicleNumber.trim() || 'TN18BJ2540',
      driver_name: driverName.trim() || 'Direct',
      biller_name: billerName || 'Admin',
      e_way_bill_no: '5020 8612 2626'
    };

    setCreatedBill(previewData);
    setShowPrintModal(true);
  };

  // Quick Add Vehicle
  const handleQuickAddVehicle = async (e) => {
    e.preventDefault();
    if (!quickVehNum.trim()) return;
    try {
      const res = await fetch('/api/vehicles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vehicle_number: quickVehNum.trim().toUpperCase(),
          model_type: quickVehModel,
          capacity_tons: Number(quickVehCap || 16),
          driver_name: quickVehDriver.trim()
        })
      });
      const data = await res.json();
      if (res.ok) {
        setVehicles([...vehicles, data]);
        setVehicleId(data.id);
        setVehicleNumber(data.vehicle_number);
        setDriverName(data.driver_name || '');
        setShowAddVehicleModal(false);
        setQuickVehNum('');
        setQuickVehDriver('');
      }
    } catch (err) {
      alert(err.message);
    }
  };

  // Quick Add Product
  const handleQuickAddProduct = async (e) => {
    e.preventDefault();
    if (!quickProdName.trim()) return;
    try {
      const res = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: quickProdName.trim(),
          default_sell_rate: Number(quickProdRate || 54500),
          default_bought_rate: Number(quickProdRate || 54500) * 0.9,
          unit: 'Tons'
        })
      });
      const data = await res.json();
      if (res.ok) {
        setProducts([...products, data]);
        setProductId(data.id);
        setProductName(data.name);
        setRatePerTon(data.default_sell_rate || 54500);
        setShowAddProductModal(false);
        setQuickProdName('');
        setQuickProdRate('');
      }
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div className="page-content" style={{ width: '100%', maxWidth: '100%', padding: '10px 14px', boxSizing: 'border-box' }}>
      <form onSubmit={handleSubmitBill} className="billing-layout">
        
        {/* TOP TWO SIDE-BY-SIDE COMPACT BOXES */}
        <div className="billing-grid-top">
          
          {/* BOX 1: VEHICLE & TRANSACTION INFORMATION */}
          <div className="billing-box">
            <div className="billing-box-header">
              <div className="billing-box-title">
                <Truck size={15} color="#059669" />
                <span>Vehicle & Transaction Information</span>
              </div>
              <span style={{ 
                padding: '3px 10px', 
                backgroundColor: '#ecfdf5', 
                border: '1px solid #a7f3d0', 
                borderRadius: '6px', 
                fontSize: '11.5px', 
                fontWeight: 800, 
                color: '#065f46' 
              }}>
                Transaction ID: <strong>{nextBillNo || 'JS001'}</strong>
              </span>
            </div>

            {/* VEHICLE TOGGLE & ADD BUTTON */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px', flexWrap: 'wrap', gap: '6px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '10.5px', fontWeight: 800, color: '#047857', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  VEHICLE:
                </span>
                
                <button
                  type="button"
                  onClick={() => setVehicleType('fleet')}
                  style={{
                    padding: '4px 10px',
                    borderRadius: '5px',
                    fontSize: '11.5px',
                    fontWeight: 700,
                    border: '1px solid',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px',
                    backgroundColor: vehicleType === 'fleet' ? '#ecfdf5' : '#ffffff',
                    borderColor: vehicleType === 'fleet' ? '#059669' : '#d6e2d9',
                    color: vehicleType === 'fleet' ? '#065f46' : '#52665a'
                  }}
                >
                  <Truck size={13} color={vehicleType === 'fleet' ? '#059669' : '#83998c'} />
                  Company Fleet
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setVehicleType('others');
                    setVehicleId('');
                  }}
                  style={{
                    padding: '4px 10px',
                    borderRadius: '5px',
                    fontSize: '11.5px',
                    fontWeight: 700,
                    border: '1px solid',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px',
                    backgroundColor: vehicleType === 'others' ? '#ecfdf5' : '#ffffff',
                    borderColor: vehicleType === 'others' ? '#059669' : '#d6e2d9',
                    color: vehicleType === 'others' ? '#065f46' : '#52665a'
                  }}
                >
                  <Tractor size={13} color={vehicleType === 'others' ? '#059669' : '#83998c'} />
                  Others (Outside Truck)
                </button>
              </div>

              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setShowAddVehicleModal(true)}
                style={{ fontSize: '11px', fontWeight: 700, color: '#059669', borderColor: '#a7f3d0', padding: '3px 8px' }}
              >
                + Add Vehicle
              </button>
            </div>

            {/* VEHICLE NO & DRIVER NAME IN 2 COMPACT COLUMNS */}
            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '8px', marginBottom: '6px' }}>
              {vehicleType === 'fleet' ? (
                <div className="field-box active-green" style={{ margin: 0 }}>
                  <label className="field-legend">Vehicle No *</label>
                  <select
                    className="field-input-clean"
                    value={vehicleId}
                    onChange={(e) => handleSelectCompanyVehicle(e.target.value)}
                  >
                    <option value="">-- Select Company Vehicle --</option>
                    {vehicles.map(v => (
                      <option key={v.id} value={v.id}>
                        {v.vehicle_number} ({v.model_type} • {v.capacity_tons}t)
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className="field-box active-green" style={{ margin: 0 }}>
                  <label className="field-legend">Vehicle No *</label>
                  <input
                    type="text"
                    className="field-input-clean"
                    placeholder="e.g. TN 45 AB 9999"
                    value={vehicleNumber}
                    onChange={(e) => {
                      const val = e.target.value.toUpperCase();
                      setVehicleNumber(val);
                      const match = vehicles.find(v => v.vehicle_number && v.vehicle_number.replace(/\s+/g, '').toUpperCase() === val.replace(/\s+/g, ''));
                      if (match && match.driver_name && !driverName) {
                        setDriverName(match.driver_name);
                      }
                    }}
                  />
                </div>
              )}

              {/* DRIVER NAME */}
              <div className="field-box" style={{ margin: 0 }}>
                <label className="field-legend muted">Driver Name (Optional)</label>
                <input
                  type="text"
                  className="field-input-clean"
                  placeholder="Enter or select Driver Name"
                  value={driverName}
                  onChange={(e) => setDriverName(e.target.value)}
                />
              </div>
            </div>

            {/* TAX TOGGLES & TRANSPORT (4 COMPACT COLUMNS) */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1.05fr', gap: '6px', margin: '8px 0 0 0' }}>
              
              {/* CGST 9% TOGGLE */}
              <div 
                className={`tax-toggle-item ${cgstEnabled ? 'checked' : ''}`}
                onClick={() => setCgstEnabled(!cgstEnabled)}
              >
                <div className={`switch-track ${cgstEnabled ? 'on' : ''}`}>
                  <div className="switch-thumb" />
                </div>
                <div>
                  <div style={{ fontSize: '11px', fontWeight: 800, color: '#0f172a', lineHeight: 1.2 }}>
                    CGST (9%) <span style={{ fontSize: '10px', color: cgstEnabled ? '#059669' : '#83998c' }}>{cgstEnabled ? 'YES' : 'NO'}</span>
                  </div>
                  <div style={{ fontSize: '10px', color: '#52665a', fontFamily: 'monospace' }}>
                    {cgstEnabled ? `₹${cgstAmount.toLocaleString('en-IN')}` : '₹0'}
                  </div>
                </div>
              </div>

              {/* SGST 9% TOGGLE */}
              <div 
                className={`tax-toggle-item ${sgstEnabled ? 'checked' : ''}`}
                onClick={() => setSgstEnabled(!sgstEnabled)}
              >
                <div className={`switch-track ${sgstEnabled ? 'on' : ''}`}>
                  <div className="switch-thumb" />
                </div>
                <div>
                  <div style={{ fontSize: '11px', fontWeight: 800, color: '#0f172a', lineHeight: 1.2 }}>
                    SGST (9%) <span style={{ fontSize: '10px', color: sgstEnabled ? '#059669' : '#83998c' }}>{sgstEnabled ? 'YES' : 'NO'}</span>
                  </div>
                  <div style={{ fontSize: '10px', color: '#52665a', fontFamily: 'monospace' }}>
                    {sgstEnabled ? `₹${sgstAmount.toLocaleString('en-IN')}` : '₹0'}
                  </div>
                </div>
              </div>

              {/* TDS 2% TOGGLE */}
              <div 
                className={`tax-toggle-item ${tdsEnabled ? 'checked' : ''}`}
                onClick={() => setTdsEnabled(!tdsEnabled)}
              >
                <div className={`switch-track ${tdsEnabled ? 'on' : ''}`}>
                  <div className="switch-thumb" />
                </div>
                <div>
                  <div style={{ fontSize: '11px', fontWeight: 800, color: '#0f172a', lineHeight: 1.2 }}>
                    TDS (2%) <span style={{ fontSize: '10px', color: tdsEnabled ? '#059669' : '#83998c' }}>{tdsEnabled ? 'YES' : 'NO'}</span>
                  </div>
                  <div style={{ fontSize: '10px', color: '#52665a', fontFamily: 'monospace' }}>
                    {tdsEnabled ? `+₹${tdsAmount.toLocaleString('en-IN')}` : '₹0'}
                  </div>
                </div>
              </div>

              {/* RENT INPUT */}
              <div className="field-box" style={{ margin: 0, padding: '2px 6px 2px 6px' }}>
                <label className="field-legend muted">Rent (₹)</label>
                <input
                  type="number"
                  className="field-input-clean font-mono"
                  placeholder="0"
                  value={rentTransport}
                  onChange={(e) => setRentTransport(e.target.value)}
                />
              </div>

            </div>

            {/* Note */}
            <div className="field-box" style={{ margin: '6px 0 0 0', padding: '2px 8px 2px 8px' }}>
              <label className="field-legend muted">Note</label>
              <input
                type="text"
                className="field-input-clean"
                placeholder="Enter note..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          </div>

          {/* BOX 2: CUSTOMER / SUPPLIER & PRODUCT */}
          <div className="billing-box">
            <div className="billing-box-header">
              <div className="billing-box-title">
                <Package size={15} color="#059669" />
                <span>Customer / Supplier & Product</span>
              </div>
              <button 
                type="button" 
                onClick={loadFormData} 
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#059669' }}
                title="Refresh products & customers"
              >
                <RefreshCw size={13} />
              </button>
            </div>

            {/* PRODUCT / MATERIAL ROW */}
            <div className="input-with-icon-group">
              <div className="input-icon-lead">
                <Package size={15} />
              </div>
              <select
                className="input-control-clean"
                value={productId}
                onChange={(e) => handleSelectProduct(e.target.value)}
              >
                <option value="">-- Select Product --</option>
                {products.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
              <button 
                type="button" 
                className="input-append-btn"
                onClick={() => setShowAddProductModal(true)}
                title="Add New Product"
              >
                <Plus size={14} />
              </button>
            </div>

            {/* CUSTOMER / SUPPLIER NAME ROW */}
            <div className="input-with-icon-group">
              <div className="input-icon-lead">
                <User size={15} />
              </div>
              <input
                type="text"
                list="cust-name-list"
                className="input-control-clean"
                placeholder="Customer / Supplier Name *"
                value={customerName}
                onChange={(e) => handleSelectCustomer(e.target.value)}
                required
              />
              <datalist id="cust-name-list">
                {customers.map(c => (
                  <option key={c.id} value={c.name}>
                    {c.phone ? `${c.phone} • Balance: ₹${c.pending_credit}` : ''}
                  </option>
                ))}
              </datalist>
              <button 
                type="button" 
                className="input-append-btn"
                onClick={() => setShowAddCustomerModal(true)}
                title="Add New Customer"
              >
                <Plus size={14} />
              </button>
            </div>

            {/* CUSTOMER PHONE & ADDRESS (2 COLUMNS) */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '6px' }}>
              <div className="input-with-icon-group" style={{ margin: 0 }}>
                <div className="input-icon-lead">
                  <Phone size={13} />
                </div>
                <input
                  type="text"
                  className="input-control-clean"
                  placeholder="Customer Phone"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                />
              </div>

              <div className="input-with-icon-group" style={{ margin: 0 }}>
                <div className="input-icon-lead">
                  <MapPin size={13} />
                </div>
                <input
                  type="text"
                  className="input-control-clean"
                  placeholder="Customer Address"
                  value={customerAddress}
                  onChange={(e) => setCustomerAddress(e.target.value)}
                />
              </div>
            </div>

            {/* 4-COLUMN COMPACT WEIGHT, RATE & CALCULATION STRIP */}
            <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 1.1fr 1fr 1.2fr', gap: '6px', backgroundColor: '#f8faf8', padding: '5px 8px', borderRadius: '6px', border: '1px solid #d6e2d9', margin: '6px 0 0 0' }}>
              <div>
                <label style={{ fontSize: '10px', fontWeight: 700, color: '#52665a', display: 'block', marginBottom: '2px' }}>
                  Total Net Wt (Kg) *
                </label>
                <input
                  type="number"
                  min="1"
                  step="1"
                  className="calc-stat-input"
                  style={{ height: '26px', fontSize: '12.5px' }}
                  value={kg}
                  onChange={(e) => setKg(e.target.value)}
                  required
                />
              </div>

              <div>
                <label style={{ fontSize: '10px', fontWeight: 700, color: '#047857', display: 'block', marginBottom: '2px' }}>
                  Rate / Ton (₹) *
                </label>
                <input
                  type="number"
                  className="calc-stat-input"
                  style={{ height: '26px', fontSize: '12.5px', color: '#059669', borderColor: '#a7f3d0' }}
                  value={ratePerTon}
                  onChange={(e) => setRatePerTon(e.target.value)}
                  required
                />
              </div>

              <div>
                <label style={{ fontSize: '10px', fontWeight: 700, color: '#52665a', display: 'block', marginBottom: '2px' }}>
                  Calc Tons
                </label>
                <div style={{ height: '26px', padding: '3px 6px', backgroundColor: '#ffffff', borderRadius: '4px', border: '1px solid #d6e2d9', fontWeight: 800, fontFamily: 'monospace', color: '#059669', fontSize: '12px', display: 'flex', alignItems: 'center' }}>
                  {tons.toFixed(3)} t
                </div>
              </div>

              <div>
                <label style={{ fontSize: '10px', fontWeight: 700, color: '#52665a', display: 'block', marginBottom: '2px' }}>
                  Subtotal (₹)
                </label>
                <div style={{ height: '26px', padding: '3px 6px', backgroundColor: '#ffffff', borderRadius: '4px', border: '1px solid #d6e2d9', fontWeight: 800, fontFamily: 'monospace', color: '#0f172a', fontSize: '12px', display: 'flex', alignItems: 'center' }}>
                  ₹{subtotal.toLocaleString('en-IN')}
                </div>
              </div>
            </div>

          </div>

        </div>

        {/* BOTTOM BOX: BILL PAYMENT, SETTLEMENT & TOTAL CALCULATIONS (COMPACT & SLEEK) */}
        <div className="settlement-container">
          <div className="settlement-header">
            <CreditCard size={15} color="#059669" />
            <span>Bill Payment, Settlement & Total Calculations</span>
          </div>

          <div className="settlement-grid">
            
            {/* 1. TOTAL BILL AMOUNT */}
            <div className="calc-stat-box">
              <div className="calc-stat-title">
                <span>Total Bill Amount (₹)</span>
                <button
                  type="button"
                  onClick={() => setIsManualTotal(!isManualTotal)}
                  style={{ background: 'none', border: 'none', color: '#059669', fontSize: '10px', fontWeight: 700, cursor: 'pointer', textDecoration: 'underline' }}
                >
                  {isManualTotal ? 'Reset Auto' : 'Edit'}
                </button>
              </div>

              {isManualTotal ? (
                <input
                  type="number"
                  className="calc-stat-input"
                  value={manualTotalAmount}
                  onChange={(e) => setManualTotalAmount(e.target.value)}
                  placeholder={String(calculatedTotal)}
                />
              ) : (
                <div className="calc-stat-display">
                  ₹ {calculatedTotal.toLocaleString('en-IN')}
                </div>
              )}
            </div>

            {/* 2. PAID AMOUNT (HIGHLIGHTED IN EMERALD GREEN) */}
            <div className={`calc-stat-box ${isZeroPaid ? 'highlight-alert' : 'highlight-green'}`}>
              <div className={`calc-stat-title ${isZeroPaid ? 'red' : 'green'}`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span>Paid Amount (₹) *</span>
                <div style={{ display: 'flex', gap: '4px' }}>
                  <button
                    type="button"
                    onClick={() => setPaidAmount('0')}
                    style={{
                      fontSize: '9px',
                      padding: '1px 5px',
                      backgroundColor: isZeroPaid ? '#dc2626' : '#f1f5f9',
                      color: isZeroPaid ? '#ffffff' : '#475569',
                      border: '1px solid ' + (isZeroPaid ? '#b91c1c' : '#cbd5e1'),
                      borderRadius: '3px',
                      cursor: 'pointer',
                      fontWeight: 700
                    }}
                    title="Set ₹0 paid (Automatic Credit)"
                  >
                    ₹0 Credit
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaidAmount(effectiveTotal)}
                    style={{
                      fontSize: '9px',
                      padding: '1px 5px',
                      backgroundColor: !isZeroPaid && Number(paidAmount) === effectiveTotal ? '#059669' : '#f1f5f9',
                      color: !isZeroPaid && Number(paidAmount) === effectiveTotal ? '#ffffff' : '#475569',
                      border: '1px solid ' + (!isZeroPaid && Number(paidAmount) === effectiveTotal ? '#047857' : '#cbd5e1'),
                      borderRadius: '3px',
                      cursor: 'pointer',
                      fontWeight: 700
                    }}
                    title="Set full amount paid"
                  >
                    Full
                  </button>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', backgroundColor: '#ffffff', border: `1px solid ${isZeroPaid ? '#dc2626' : '#059669'}`, borderRadius: '4px', padding: '0 6px', height: '28px' }}>
                <span style={{ fontSize: '14px', fontWeight: 800, color: isZeroPaid ? '#dc2626' : '#059669', marginRight: '3px' }}>₹</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  className="field-input-clean font-mono"
                  style={{ fontSize: '15px', fontWeight: 800, color: isZeroPaid ? '#991b1b' : '#064e3b' }}
                  value={paidAmount}
                  onChange={(e) => setPaidAmount(e.target.value)}
                  required
                />
              </div>
            </div>

            {/* 3. REMAINING CREDIT DUE */}
            <div className={`calc-stat-box ${remainingCreditDue > 0 ? 'highlight-alert' : 'highlight-green'}`}>
              <div className={`calc-stat-title ${remainingCreditDue > 0 ? 'red' : 'green'}`}>
                <span>Remaining Credit Due (₹)</span>
              </div>
              <div className="calc-stat-display" style={{ color: remainingCreditDue > 0 ? '#dc2626' : '#059669' }}>
                ₹ {remainingCreditDue.toLocaleString('en-IN')}
              </div>
            </div>

            {/* 4. DATE & MODE */}
            <div className="calc-stat-box">
              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '6px' }}>
                <div>
                  <div className="calc-stat-title">Date *</div>
                  <input
                    type="date"
                    className="form-input"
                    style={{ padding: '3px 4px', fontSize: '11px', fontWeight: 700, height: '28px' }}
                    value={billDate}
                    onChange={(e) => setBillDate(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <div className="calc-stat-title" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span>Mode</span>
                    {isZeroPaid && (
                      <span style={{ fontSize: '8.5px', fontWeight: 800, color: '#dc2626' }}>
                        Credit
                      </span>
                    )}
                  </div>
                  <select
                    className="form-select"
                    style={{ 
                      padding: '3px 4px', 
                      fontSize: '11px', 
                      fontWeight: 700, 
                      height: '28px',
                      backgroundColor: isZeroPaid ? '#fef2f2' : '#ffffff',
                      borderColor: isZeroPaid ? '#fca5a5' : '#cbd5e1',
                      color: isZeroPaid ? '#b91c1c' : '#0f172a',
                      cursor: isZeroPaid ? 'not-allowed' : 'pointer'
                    }}
                    value={isZeroPaid ? 'Credit' : paymentMode}
                    disabled={isZeroPaid}
                    onChange={(e) => {
                      setPaymentMode(e.target.value);
                      setPreviousActiveMode(e.target.value);
                    }}
                    title={isZeroPaid ? "Paid amount is ₹0, payment mode is automatically Credit" : "Select payment mode"}
                  >
                    {isZeroPaid ? (
                      <option value="Credit">Credit</option>
                    ) : (
                      <>
                        <option value="Cash">Cash</option>
                        <option value="UPI">UPI / GPay</option>
                        <option value="Bank Transfer">Bank</option>
                        <option value="Cheque">Cheque</option>
                      </>
                    )}
                  </select>
                </div>
              </div>
            </div>

            {/* 5. BILLER NAME */}
            <div className="calc-stat-box">
              <div className="calc-stat-title">Biller Name *</div>
              <input
                type="text"
                className="form-input"
                style={{ padding: '3px 6px', fontSize: '12px', fontWeight: 700, height: '28px' }}
                value={billerName}
                onChange={(e) => setBillerName(e.target.value)}
                required
              />
            </div>

          </div>

          {/* SUBMIT BUTTON ROW */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '10px', paddingTop: '8px', borderTop: '1px solid #edf2ee', flexWrap: 'wrap', gap: '8px' }}>
            <div style={{ fontSize: '11.5px', color: '#52665a' }}>
              {remainingCreditDue > 0 ? (
                <span style={{ color: '#dc2626', fontWeight: 700 }}>
                  ⚠️ Outstanding ₹{remainingCreditDue.toLocaleString('en-IN')} will be recorded under Credit Customers.
                </span>
              ) : (
                <span style={{ color: '#059669', fontWeight: 700 }}>
                  ✓ Full payment settled. Zero credit balance.
                </span>
              )}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <button
                type="button"
                className="btn btn-secondary"
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '6px', 
                  padding: '9px 16px', 
                  height: '38px', 
                  fontSize: '12.5px', 
                  fontWeight: 700, 
                  borderRadius: '6px', 
                  border: '1.5px solid #059669', 
                  color: '#065f46', 
                  backgroundColor: '#ecfdf5', 
                  cursor: 'pointer' 
                }}
                onClick={handlePreviewCurrentBill}
                title="Preview Tax Invoice before saving & issuing"
              >
                <Eye size={15} color="#059669" />
                Preview Bill
              </button>

              <button
                type="submit"
                className="btn-issue-bill"
                disabled={submitting}
              >
                {submitting ? 'Issuing Bill...' : `Save & Issue Bill (${nextBillNo || 'JS001'})`}
                <ArrowRight size={15} />
              </button>
            </div>
          </div>

        </div>

      </form>

      {/* RECENT INVOICES REGISTER (COMPACT & CONTAINED) */}
      <div className="card" style={{ width: '100%', maxWidth: '100%', padding: 0, overflow: 'hidden', marginTop: '10px', borderRadius: '8px', boxSizing: 'border-box' }}>
        <div className="card-header" style={{ padding: '8px 14px', margin: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fbfdfb', borderBottom: '1px solid #e8f0ea' }}>
          <div className="card-title" style={{ fontSize: '13px', fontWeight: 800, color: '#064e3b', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FileText size={15} color="#059669" />
            <span>Recent Invoices Register</span>
          </div>
          <span style={{ fontSize: '11.5px', color: '#52665a', fontWeight: 600 }}>
            Live billing log • Quick reprints & receipts
          </span>
        </div>

        <div className="table-container" style={{ width: '100%', maxWidth: '100%', border: 'none', margin: 0, overflowX: 'auto', maxHeight: '240px', boxSizing: 'border-box' }}>
          <table className="data-table" style={{ width: '100%', minWidth: '1100px' }}>
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
              {recentBills.length === 0 ? (
                <tr>
                  <td colSpan="20" style={{ textAlign: 'center', padding: '24px', color: '#83998c', fontSize: '12.5px' }}>
                    No bills issued yet. Generated invoices will appear here instantly.
                  </td>
                </tr>
              ) : (
                recentBills.map(b => {
                  const isKg = b.unit?.toLowerCase() === 'kg';
                  const qtyInKg = isKg 
                    ? Math.round(Number(b.quantity) || 0) 
                    : Math.round((Number(b.quantity) || 0) * 1000);
                  const qtyInTons = isKg 
                    ? Number(((Number(b.quantity) || 0) / 1000).toFixed(3)) 
                    : (Number(b.quantity) || 0);

                  const matchedProd = products.find(p => p.id === b.product_id || (p.name && b.product_name && p.name.trim().toLowerCase() === b.product_name.trim().toLowerCase()));
                  const catalogRate = matchedProd?.default_bought_rate ?? b.catalog_bought_rate ?? b.bought_price_per_unit ?? 0;
                  const totalBoughtCost = Math.round(qtyInTons * Number(catalogRate || 0));

                  const beforeTax = Math.round((Number(b.subtotal) || 0) + (Number(b.rent_transport) || 0));
                  const tdsVal = Number(b.tds_amount) > 0 
                    ? Number(b.tds_amount) 
                    : Math.round((beforeTax * (Number(b.tds_rate) || 2)) / 100);
                  const cgstVal = Number(b.cgst_amount) || Math.round((beforeTax * 0.09));
                  const sgstVal = Number(b.sgst_amount) || Math.round((beforeTax * 0.09));
                  const totalAmt = Number(b.total_amount) || (beforeTax + cgstVal + sgstVal + tdsVal);

                  // Individual invoice profit: total bill amount - (tds + cgst + sgst + bought cost)
                  const invoiceProfit = Math.round(totalAmt - (tdsVal + cgstVal + sgstVal + totalBoughtCost));

                  return (
                    <tr key={b.id}>
                      {/* 1. BILL NO */}
                      <td style={{ whiteSpace: 'nowrap', padding: '10px 12px' }}>
                        <span 
                          className="font-mono"
                          style={{ fontWeight: 800, color: '#059669', cursor: 'pointer', textDecoration: 'underline' }}
                          onClick={() => {
                            setCreatedBill(b);
                            setShowPrintModal(true);
                          }}
                          title="Click to Print Invoice"
                        >
                          {b.bill_no}
                        </span>
                      </td>

                      {/* 2. DATE & TIME */}
                      <td style={{ whiteSpace: 'nowrap', padding: '10px 12px', fontSize: '12px', color: '#0f172a' }}>
                        <div>{b.date}</div>
                        <div style={{ fontSize: '10.5px', color: '#83998c' }}>{b.time}</div>
                      </td>

                      {/* 3. CUSTOMER */}
                      <td style={{ whiteSpace: 'nowrap', padding: '10px 12px', fontWeight: 700, color: '#0f172a', fontSize: '12.5px' }}>
                        {b.customer_name}
                      </td>

                      {/* 4. MATERIAL */}
                      <td style={{ whiteSpace: 'nowrap', padding: '10px 12px' }}>
                        <div style={{ fontWeight: 700, color: '#0f172a' }}>{b.product_name}</div>
                      </td>

                      {/* 5. QUANTITY (BOTH KGS & TONS) */}
                      <td style={{ whiteSpace: 'nowrap', padding: '10px 12px' }}>
                        <div style={{ fontSize: '12.5px', color: '#059669', fontWeight: 800, fontFamily: 'monospace' }}>
                          {qtyInKg.toLocaleString('en-IN')} kg
                        </div>
                        <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>
                          {qtyInTons} {b.unit || 'Tons'}
                        </div>
                      </td>

                      {/* 6. RATE */}
                      <td style={{ whiteSpace: 'nowrap', padding: '10px 12px', textAlign: 'right', fontWeight: 700 }} className="font-mono">
                        ₹{(Number(b.rate) || 0).toLocaleString('en-IN')}
                      </td>

                      {/* 7. BOUGHT COST (FROM PRODUCT CATALOG) */}
                      <td style={{ whiteSpace: 'nowrap', padding: '10px 12px', textAlign: 'right' }} className="font-mono">
                        <div style={{ fontWeight: 700, color: '#1e293b' }}>
                          ₹{totalBoughtCost.toLocaleString('en-IN')}
                        </div>
                        <div style={{ fontSize: '10.5px', color: '#64748b' }}>
                          (@ ₹{Number(catalogRate || 0).toLocaleString('en-IN')}/T)
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
                      <td style={{ whiteSpace: 'nowrap', padding: '10px 12px', textAlign: 'right', fontWeight: 800, fontFamily: 'monospace', color: '#064e3b' }}>
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
                          {b.supplier_name || 'Direct / Internal'}
                        </span>
                      </td>

                      {/* 12. TRANSFERRED AMOUNT (RECEIVED) */}
                      <td style={{ whiteSpace: 'nowrap', padding: '10px 12px', textAlign: 'right', fontWeight: 700, fontFamily: 'monospace', color: '#059669' }}>
                        <div>₹{(Number(b.amount_received) || 0).toLocaleString('en-IN')}</div>
                        <div style={{ fontSize: '10px', color: '#64748b', fontWeight: 600 }}>{b.payment_mode || 'Cash'}</div>
                      </td>

                      {/* 13. PENDING BALANCE */}
                      <td style={{ whiteSpace: 'nowrap', padding: '10px 12px', textAlign: 'right', fontWeight: 800, fontFamily: 'monospace', color: b.balance_due > 0 ? '#dc2626' : '#059669' }}>
                        {b.balance_due > 0 ? `₹${(Number(b.balance_due) || 0).toLocaleString('en-IN')}` : 'Settled'}
                      </td>

                      {/* 14. VEHICLE NO. */}
                      <td style={{ whiteSpace: 'nowrap', padding: '10px 12px' }}>
                        <span style={{ padding: '3px 7px', backgroundColor: '#f1f5f9', borderRadius: '4px', fontSize: '11px', fontFamily: 'monospace', fontWeight: 700, color: '#1e293b' }}>
                          {b.vehicle_number || 'Direct'}
                        </span>
                      </td>

                      {/* 15. DRIVER */}
                      <td style={{ whiteSpace: 'nowrap', padding: '10px 12px' }}>
                        <span style={{ fontSize: '12px', color: '#334155', fontWeight: 600 }}>
                          {b.driver_name || vehicles.find(v => (b.vehicle_id && v.id === b.vehicle_id) || (b.vehicle_number && v.vehicle_number && v.vehicle_number.replace(/\s+/g, '').toUpperCase() === b.vehicle_number.replace(/\s+/g, '').toUpperCase()))?.driver_name || '—'}
                        </span>
                      </td>

                      {/* 16. STATUS */}
                      <td style={{ whiteSpace: 'nowrap', padding: '10px 12px' }}>
                        <span className={`badge-status ${b.payment_status === 'Paid' ? 'badge-paid' : b.payment_status === 'Partial' ? 'badge-partial' : 'badge-credit'}`}>
                          {b.payment_status}
                        </span>
                      </td>

                      {/* 17. ACTION */}
                      <td style={{ whiteSpace: 'nowrap', padding: '10px 12px', textAlign: 'center' }}>
                        <div style={{ display: 'inline-flex', gap: '5px' }}>
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            style={{ padding: '3px 8px', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px' }}
                            onClick={() => {
                              setCreatedBill(b);
                              setShowPrintModal(true);
                            }}
                            title="View Tax Invoice Details"
                          >
                            <Eye size={12} color="#0284c7" />
                            View
                          </button>
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            style={{ padding: '3px 8px', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px' }}
                            onClick={() => {
                              setCreatedBill(b);
                              setShowPrintModal(true);
                            }}
                            title="Print Tax Invoice"
                          >
                            <Printer size={12} color="#059669" />
                            Print
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

      {/* QUICK ADD VEHICLE MODAL */}
      {showAddVehicleModal && (
        <div className="modal-overlay" onClick={() => setShowAddVehicleModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Quick Add Vehicle</h2>
              <button className="modal-close" onClick={() => setShowAddVehicleModal(false)}>×</button>
            </div>
            <form onSubmit={handleQuickAddVehicle}>
              <div className="form-group">
                <label className="form-label">Vehicle Registration Number *</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. TN 45 AB 1001"
                  value={quickVehNum}
                  onChange={(e) => setQuickVehNum(e.target.value.toUpperCase())}
                  required
                />
              </div>
              <div className="form-grid-2">
                <div className="form-group">
                  <label className="form-label">Model Type</label>
                  <select className="form-select" value={quickVehModel} onChange={(e) => setQuickVehModel(e.target.value)}>
                    <option value="10 Wheeler Tipper">10 Wheeler Tipper</option>
                    <option value="6 Wheeler Lorry">6 Wheeler Lorry</option>
                    <option value="Tata 407 / Pickup">Tata 407 / Pickup</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Capacity (Tons)</label>
                  <input
                    type="number"
                    step="0.5"
                    className="form-input"
                    value={quickVehCap}
                    onChange={(e) => setQuickVehCap(e.target.value)}
                  />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Assigned Driver</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Driver name"
                  value={quickVehDriver}
                  onChange={(e) => setQuickVehDriver(e.target.value)}
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '16px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowAddVehicleModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save Vehicle</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* QUICK ADD PRODUCT MODAL */}
      {showAddProductModal && (
        <div className="modal-overlay" onClick={() => setShowAddProductModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Quick Add Product</h2>
              <button className="modal-close" onClick={() => setShowAddProductModal(false)}>×</button>
            </div>
            <form onSubmit={handleQuickAddProduct}>
              <div className="form-group">
                <label className="form-label">Product Name *</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Fe550D TMT Rebars 20mm"
                  value={quickProdName}
                  onChange={(e) => setQuickProdName(e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Selling Rate (₹ / Ton) *</label>
                <input
                  type="number"
                  className="form-input"
                  placeholder="e.g. 54500"
                  value={quickProdRate}
                  onChange={(e) => setQuickProdRate(e.target.value)}
                  required
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '16px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowAddProductModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save Product</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* QUICK ADD CUSTOMER MODAL */}
      {showAddCustomerModal && (
        <div className="modal-overlay" onClick={() => setShowAddCustomerModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Quick Add Customer</h2>
              <button className="modal-close" onClick={() => setShowAddCustomerModal(false)}>×</button>
            </div>
            <form onSubmit={async (e) => {
              e.preventDefault();
              if (!quickCustName.trim()) return;
              try {
                const res = await fetch('/api/customers', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ name: quickCustName.trim(), phone: quickCustPhone.trim() })
                });
                const data = await res.json();
                if (res.ok) {
                  setCustomers([...customers, data]);
                  setCustomerName(data.name);
                  setCustomerPhone(data.phone || '');
                  setShowAddCustomerModal(false);
                  setQuickCustName('');
                  setQuickCustPhone('');
                }
              } catch (err) { alert(err.message); }
            }}>
              <div className="form-group">
                <label className="form-label">Customer Name *</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Senthil Builders"
                  value={quickCustName}
                  onChange={(e) => setQuickCustName(e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Phone Number</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Mobile number"
                  value={quickCustPhone}
                  onChange={(e) => setQuickCustPhone(e.target.value)}
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '16px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowAddCustomerModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save Customer</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* INVOICE PRINT MODAL */}
      {showPrintModal && createdBill && (
        <InvoicePrintModal 
          bill={createdBill}
          customer={{ name: customerName, phone: customerPhone, address: customerAddress, gstin: customerGstin }}
          onClose={() => setShowPrintModal(false)}
        />
      )}

    </div>
  );
}
