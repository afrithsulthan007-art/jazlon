import React, { useState, useEffect } from 'react';
import { 
  Package, 
  Plus, 
  Search, 
  Edit2, 
  Trash2, 
  TrendingUp, 
  Boxes, 
  ArrowDownToLine,
  Building2,
  DollarSign
} from 'lucide-react';

export default function ProductsPage({ onProductUpdated }) {
  const [products, setProducts] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');

  // Add / Edit Product Modal
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [name, setName] = useState('');
  const [category, setCategory] = useState('Steel');
  const [hsnCode, setHsnCode] = useState('7214');
  const [unit, setUnit] = useState('Tons');
  const [sellRate, setSellRate] = useState('');
  const [boughtRate, setBoughtRate] = useState('');
  const [gstRate, setGstRate] = useState(18);
  const [stockQty, setStockQty] = useState('');
  const [saving, setSaving] = useState(false);

  // Simple Stock In Modal (Matching Quarry / Yard format)
  const [showStockInModal, setShowStockInModal] = useState(false);
  const [stockInProduct, setStockInProduct] = useState(null);
  const [stockInSupplierId, setStockInSupplierId] = useState('');
  const [stockInQty, setStockInQty] = useState('');
  const [stockInRate, setStockInRate] = useState('');
  const [stockInVehicleNo, setStockInVehicleNo] = useState('');
  const [stockInPaidAmount, setStockInPaidAmount] = useState('0');
  const [savingStockIn, setSavingStockIn] = useState(false);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const [pRes, sRes] = await Promise.all([
        fetch('/api/products').then(r => r.json()),
        fetch('/api/suppliers').then(r => r.json()).catch(() => [])
      ]);
      setProducts(pRes || []);
      setSuppliers(sRes || []);
    } catch (err) {
      console.error('Error fetching products:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const handleOpenAdd = () => {
    setEditingProduct(null);
    setName('');
    setCategory('Steel');
    setHsnCode('7214');
    setUnit('Tons');
    setSellRate('');
    setBoughtRate('');
    setGstRate(18);
    setStockQty('');
    setShowModal(true);
  };

  const handleOpenEdit = (p) => {
    setEditingProduct(p);
    setName(p.name);
    setCategory(p.category || 'Steel');
    setHsnCode(p.hsn_code || '7214');
    setUnit(p.unit || 'Tons');
    setSellRate(p.default_sell_rate || '');
    setBoughtRate(p.default_bought_rate || '');
    setGstRate(p.gst_rate || 18);
    setStockQty(p.stock_qty || 0);
    setShowModal(true);
  };

  const handleSaveProduct = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;

    try {
      setSaving(true);
      const url = editingProduct ? `/api/products/${editingProduct.id}` : '/api/products';
      const method = editingProduct ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          category,
          hsn_code: hsnCode.trim(),
          unit,
          default_sell_rate: Number(sellRate || 0),
          default_bought_rate: Number(boughtRate || 0),
          gst_rate: Number(gstRate || 18),
          stock_qty: Number(stockQty || 0)
        })
      });

      if (!res.ok) throw new Error('Failed to save product');

      setShowModal(false);
      fetchProducts();
      if (onProductUpdated) onProductUpdated();
    } catch (err) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteProduct = async (id, prodName) => {
    if (!window.confirm(`Are you sure you want to delete ${prodName}?`)) return;

    try {
      const res = await fetch(`/api/products/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setProducts(products.filter(p => p.id !== id));
        if (onProductUpdated) onProductUpdated();
      }
    } catch (err) {
      alert(err.message);
    }
  };

  // Open Stock In Modal
  const handleOpenStockIn = (p) => {
    const targetProd = p || products[0] || null;
    setStockInProduct(targetProd);
    if (suppliers.length > 0) {
      setStockInSupplierId(suppliers[0].id);
    }
    setStockInQty('');
    setStockInRate(targetProd?.default_bought_rate || 550);
    setStockInVehicleNo('');
    setStockInPaidAmount('0');
    setShowStockInModal(true);
  };

  // Submit Stock In
  const handleSaveStockIn = async (e) => {
    e.preventDefault();
    if (!stockInSupplierId) {
      alert('Please select a supplier / quarry.');
      return;
    }
    const qNum = Number(stockInQty);
    if (!qNum || qNum <= 0) {
      alert('Please enter a valid quantity.');
      return;
    }

    try {
      setSavingStockIn(true);
      const res = await fetch(`/api/suppliers/${stockInSupplierId}/purchases`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product_id: stockInProduct?.id || null,
          product_name: stockInProduct?.name || 'Raw Material',
          quantity: qNum,
          unit: 'Tons',
          bought_price_per_unit: Number(stockInRate || 0),
          total_amount: sTotalVal,
          paid_amount: Number(stockInPaidAmount || 0),
          vehicle_number: stockInVehicleNo.trim().toUpperCase(),
          notes: stockInVehicleNo ? `Vehicle: ${stockInVehicleNo.trim().toUpperCase()}` : ''
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || 'Failed to record stock inward');
      }

      const oldBought = Number(stockInProduct?.default_bought_rate || 0);
      const newBought = Number(stockInRate || 0);
      let avgInfo = '';
      if (oldBought > 0 && newBought > 0 && oldBought !== newBought) {
        const avg = Math.round(((oldBought + newBought) / 2.0) * 100) / 100;
        avgInfo = `\n• Catalog Bought Cost averaged to: ₹${avg.toLocaleString('en-IN')} (old ₹${oldBought.toLocaleString('en-IN')} + new ₹${newBought.toLocaleString('en-IN')}) / 2`;
      } else if (newBought > 0) {
        avgInfo = `\n• Catalog Bought Cost: ₹${newBought.toLocaleString('en-IN')}`;
      }

      alert(`Inward Stock of ${qNum} Tons recorded!\n• Material: ${stockInProduct?.name}\n• Total: ₹${sTotalVal.toLocaleString('en-IN')}\n• Paid: ₹${Number(stockInPaidAmount || 0).toLocaleString('en-IN')}\n• Supplier Due: ₹${sDueVal.toLocaleString('en-IN')}${avgInfo}`);
      setShowStockInModal(false);
      fetchProducts();
      if (onProductUpdated) onProductUpdated();
    } catch (err) {
      alert(err.message);
    } finally {
      setSavingStockIn(false);
    }
  };

  const categories = ['All', ...new Set(products.map(p => p.category).filter(Boolean))];

  const filtered = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase()) ||
      (p.hsn_code && p.hsn_code.includes(search)) ||
      (p.category && p.category.toLowerCase().includes(search.toLowerCase()));

    const matchesCategory = selectedCategory === 'All' || p.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  // Simple live calculations
  const sQtyNum = Number(stockInQty || 0);
  const sRateNum = Number(stockInRate || 0);
  const sTotalVal = Math.round(sQtyNum * sRateNum);
  const sPaidVal = Number(stockInPaidAmount || 0);
  const sDueVal = Math.max(0, sTotalVal - sPaidVal);

  return (
    <div className="page-content">
      {/* FILTER & ACTIONS BAR */}
      <div className="card" style={{ padding: '16px 20px', marginBottom: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px' }}>
          <div style={{ display: 'flex', gap: '12px', flex: 1, maxWidth: '640px' }}>
            <div style={{ position: 'relative', flex: 1 }}>
              <Search size={16} color="#94a3b8" style={{ position: 'absolute', left: '12px', top: '11px' }} />
              <input
                type="text"
                className="form-input"
                placeholder="Search products by name, HSN code, type..."
                style={{ paddingLeft: '36px' }}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <select 
              className="form-select" 
              style={{ width: '180px' }}
              value={selectedCategory} 
              onChange={(e) => setSelectedCategory(e.target.value)}
            >
              {categories.map(c => (
                <option key={c} value={c}>{c === 'All' ? 'All Categories' : c}</option>
              ))}
            </select>
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button 
              className="btn btn-primary" 
              style={{ 
                backgroundColor: '#059669', 
                borderColor: '#047857',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px'
              }}
              onClick={() => handleOpenStockIn()}
            >
              <ArrowDownToLine size={16} />
              Stock In
            </button>

            <button className="btn btn-secondary" onClick={handleOpenAdd}>
              <Plus size={16} />
              Add Product
            </button>
          </div>
        </div>
      </div>

      {/* PRODUCTS TABLE */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="card-header" style={{ padding: '18px 24px', margin: 0 }}>
          <div className="card-title">
            <Package size={18} color="#059669" />
            <span>Product Catalog & Selling / Bought Rates</span>
          </div>
          <span style={{ fontSize: '12px', color: '#64748b' }}>
            Showing <strong>{filtered.length}</strong> items
          </span>
        </div>

        <div className="table-container" style={{ border: 'none' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Product Description</th>
                <th>Category</th>
                <th>HSN</th>
                <th style={{ textAlign: 'right' }}>Stock on Hand</th>
                <th style={{ textAlign: 'right' }}>Selling Rate (₹)</th>
                <th style={{ textAlign: 'right' }}>Bought Cost (₹)</th>
                <th style={{ textAlign: 'right' }}>Unit Margin (₹ / %)</th>
                <th>GST %</th>
                <th style={{ textAlign: 'center' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan="9" style={{ textAlign: 'center', padding: '36px', color: '#94a3b8' }}>
                    {loading ? 'Loading product catalog...' : 'No products found.'}
                  </td>
                </tr>
              ) : (
                filtered.map((p) => {
                  const sell = p.default_sell_rate || 0;
                  const bought = p.default_bought_rate || 0;
                  const marginVal = sell - bought;
                  const marginPct = sell > 0 ? ((marginVal / sell) * 100).toFixed(1) : 0;
                  const isLowStock = p.stock_qty <= 10;

                  return (
                    <tr key={p.id}>
                      <td>
                        <div style={{ fontWeight: 800, color: '#0f172a', fontSize: '13.5px' }}>
                          {p.name}
                        </div>
                      </td>
                      <td>
                        <span style={{ 
                          padding: '3px 9px', 
                          borderRadius: '4px', 
                          fontSize: '11px', 
                          fontWeight: 700,
                          backgroundColor: p.category === 'Steel' ? '#e0f2fe' : p.category === 'Structural Steel' ? '#fef3c7' : '#f1f5f9',
                          color: p.category === 'Steel' ? '#0369a1' : p.category === 'Structural Steel' ? '#b45309' : '#334155'
                        }}>
                          {p.category}
                        </span>
                      </td>
                      <td className="font-mono" style={{ fontSize: '12px', color: '#64748b' }}>
                        {p.hsn_code || '7214'}
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 800, fontFamily: 'monospace' }}>
                        <span style={{ 
                          color: isLowStock ? '#dc2626' : '#059669',
                          backgroundColor: isLowStock ? '#fef2f2' : '#f0fdf4',
                          padding: '2px 8px',
                          borderRadius: '4px'
                        }}>
                          {p.stock_qty} {p.unit}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 800, color: '#0f172a', fontFamily: 'monospace' }}>
                        ₹{sell.toLocaleString('en-IN')}
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 600, color: '#64748b', fontFamily: 'monospace' }}>
                        ₹{bought.toLocaleString('en-IN')}
                      </td>
                      <td style={{ textAlign: 'right', fontFamily: 'monospace' }}>
                        <div style={{ fontWeight: 800, color: marginVal >= 0 ? '#15803d' : '#dc2626' }}>
                          +₹{marginVal.toLocaleString('en-IN')}
                        </div>
                        <div style={{ fontSize: '11px', color: '#64748b' }}>
                          ({marginPct}%)
                        </div>
                      </td>
                      <td>
                        <span style={{ padding: '2px 7px', backgroundColor: '#eff6ff', color: '#1d4ed8', borderRadius: '4px', fontSize: '11px', fontWeight: 700 }}>
                          {p.gst_rate}%
                        </span>
                      </td>
                      <td style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>
                        <div style={{ display: 'inline-flex', gap: '6px', alignItems: 'center' }}>
                          {/* Stock In Button */}
                          <button 
                            className="btn btn-primary btn-sm"
                            style={{ 
                              padding: '4px 9px', 
                              fontSize: '11.5px', 
                              display: 'inline-flex', 
                              alignItems: 'center', 
                              gap: '4px',
                              backgroundColor: '#059669',
                              borderColor: '#047857',
                              color: '#ffffff',
                              borderRadius: '5px',
                              fontWeight: 700
                            }}
                            onClick={() => handleOpenStockIn(p)}
                            title={`Stock In for ${p.name}`}
                          >
                            <ArrowDownToLine size={13} />
                            Stock In
                          </button>

                          <button 
                            className="btn-veh-icon"
                            onClick={() => handleOpenEdit(p)}
                            title="Edit Product"
                          >
                            <Edit2 size={13} />
                          </button>

                          <button 
                            className="btn-veh-icon delete"
                            onClick={() => handleDeleteProduct(p.id, p.name)}
                            title="Delete Product"
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

      {/* MODAL: COMPACT & VISUALLY ATTRACTIVE STOCK IN */}
      {showStockInModal && (
        <div className="modal-overlay" style={{ backdropFilter: 'blur(3px)', backgroundColor: 'rgba(15, 23, 42, 0.45)' }} onClick={() => setShowStockInModal(false)}>
          <div 
            className="modal-content" 
            style={{ 
              maxWidth: '430px', 
              borderRadius: '16px', 
              padding: '18px 20px', 
              boxShadow: '0 25px 50px -12px rgba(15, 23, 42, 0.25), 0 0 0 1px rgba(15, 23, 42, 0.08)',
              border: 'none',
              animation: 'modalSlideIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
            }} 
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '12px', borderBottom: '1px solid #f1f5f9' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '9px' }}>
                <div style={{ 
                  width: '30px', 
                  height: '30px', 
                  borderRadius: '8px', 
                  backgroundColor: '#ecfdf5', 
                  color: '#059669', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center' 
                }}>
                  <ArrowDownToLine size={16} />
                </div>
                <div>
                  <h2 style={{ fontSize: '15px', fontWeight: 800, margin: 0, color: '#0f172a', lineHeight: 1.2 }}>
                    Record Inward Stock
                  </h2>
                  <div style={{ fontSize: '11px', color: '#64748b' }}>Stock in & record supplier dues</div>
                </div>
              </div>
              <button 
                onClick={() => setShowStockInModal(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#94a3b8',
                  fontSize: '20px',
                  lineHeight: 1,
                  cursor: 'pointer',
                  padding: '4px',
                  borderRadius: '6px'
                }}
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSaveStockIn} style={{ marginTop: '12px' }}>
              {/* Material * */}
              <div style={{ marginBottom: '10px' }}>
                <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                  Material *
                </label>
                <select 
                  className="form-select"
                  style={{ 
                    fontSize: '13px', 
                    height: '36px',
                    padding: '0 10px', 
                    borderRadius: '7px', 
                    border: '1.5px solid #cbd5e1',
                    width: '100%' 
                  }}
                  value={stockInProduct?.id || ''}
                  onChange={(e) => {
                    const sel = products.find(p => String(p.id) === e.target.value);
                    if (sel) {
                      setStockInProduct(sel);
                      setStockInRate(sel.default_bought_rate || 550);
                    }
                  }}
                  required
                >
                  {products.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.stock_qty} T in yard)
                    </option>
                  ))}
                </select>
              </div>

              {/* Quantity (Tons) * & Inward Rate (₹ / Ton) * */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                    Quantity (Tons) *
                  </label>
                  <input 
                    type="number"
                    step="0.01"
                    className="form-input font-mono"
                    style={{ 
                      fontSize: '14px', 
                      fontWeight: 700, 
                      height: '36px',
                      padding: '0 10px', 
                      borderRadius: '7px', 
                      border: '1.5px solid #cbd5e1',
                      width: '100%' 
                    }}
                    placeholder="0.00"
                    value={stockInQty}
                    onChange={(e) => setStockInQty(e.target.value)}
                    required
                    autoFocus
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                    Inward Rate (₹ / Ton) *
                  </label>
                  <input 
                    type="number"
                    step="0.01"
                    className="form-input font-mono"
                    style={{ 
                      fontSize: '14px', 
                      fontWeight: 700, 
                      height: '36px',
                      padding: '0 10px', 
                      borderRadius: '7px', 
                      border: '1.5px solid #cbd5e1',
                      width: '100%' 
                    }}
                    placeholder="550"
                    value={stockInRate}
                    onChange={(e) => setStockInRate(e.target.value)}
                    required
                  />
                  {(() => {
                    const oldRate = Number(stockInProduct?.default_bought_rate || 0);
                    const newRate = Number(stockInRate || 0);
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

              {/* Supplier / Quarry * & Vehicle Number */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                    Supplier / Quarry *
                  </label>
                  <select 
                    className="form-select"
                    style={{ 
                      fontSize: '12.5px', 
                      height: '36px',
                      padding: '0 8px', 
                      borderRadius: '7px', 
                      border: '1.5px solid #cbd5e1',
                      width: '100%' 
                    }}
                    value={stockInSupplierId}
                    onChange={(e) => setStockInSupplierId(e.target.value)}
                    required
                  >
                    <option value="">Supplier...</option>
                    {suppliers.map(s => (
                      <option key={s.id} value={s.id}>
                        {s.name} {s.company_name ? `(${s.company_name})` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                    Vehicle Number
                  </label>
                  <input 
                    type="text"
                    className="form-input font-mono"
                    style={{ 
                      fontSize: '13px', 
                      textTransform: 'uppercase', 
                      height: '36px',
                      padding: '0 10px', 
                      borderRadius: '7px', 
                      border: '1.5px solid #cbd5e1',
                      width: '100%' 
                    }}
                    placeholder="TN-38-AX-9999"
                    value={stockInVehicleNo}
                    onChange={(e) => setStockInVehicleNo(e.target.value.toUpperCase())}
                  />
                </div>
              </div>

              {/* THREE-COLUMN COMPACT DASHBOARD SUMMARY */}
              <div style={{ 
                backgroundColor: '#f8fafc', 
                border: '1.5px solid #e2e8f0', 
                borderRadius: '10px', 
                padding: '9px 12px',
                display: 'grid',
                gridTemplateColumns: '1fr 1.3fr 1fr',
                gap: '8px',
                alignItems: 'center',
                boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.03)'
              }}>
                <div>
                  <div style={{ fontSize: '9.5px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                    TOTAL
                  </div>
                  <div style={{ fontSize: '16px', fontWeight: 900, color: '#0f172a', fontFamily: 'monospace', marginTop: '1px' }}>
                    ₹{sTotalVal.toLocaleString('en-IN')}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: '9.5px', fontWeight: 800, color: '#16a34a', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                    PAID AT QUARRY (₹)
                  </div>
                  <input 
                    type="number"
                    step="0.01"
                    className="font-mono"
                    style={{ 
                      width: '100%', 
                      border: '1.5px solid #22c55e', 
                      borderRadius: '5px', 
                      padding: '2px 6px', 
                      fontSize: '14.5px', 
                      fontWeight: 800, 
                      color: '#15803d', 
                      backgroundColor: '#ffffff',
                      height: '28px',
                      marginTop: '2px' 
                    }}
                    placeholder="0"
                    value={stockInPaidAmount}
                    onChange={(e) => setStockInPaidAmount(e.target.value)}
                  />
                </div>

                <div>
                  <div style={{ fontSize: '9.5px', fontWeight: 800, color: sDueVal > 0 ? '#dc2626' : '#16a34a', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                    SUPPLIER DUE
                  </div>
                  <div style={{ 
                    fontSize: '16px', 
                    fontWeight: 900, 
                    color: sDueVal > 0 ? '#dc2626' : '#15803d', 
                    fontFamily: 'monospace', 
                    marginTop: '1px' 
                  }}>
                    ₹{sDueVal.toLocaleString('en-IN')}
                  </div>
                </div>
              </div>

              {/* ACTION BUTTONS */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '16px' }}>
                <button 
                  type="button" 
                  onClick={() => setShowStockInModal(false)}
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
                  disabled={savingStockIn}
                  style={{ 
                    height: '33px',
                    padding: '0 16px',
                    fontSize: '12px',
                    fontWeight: 700,
                    borderRadius: '7px',
                    border: 'none',
                    backgroundColor: '#059669',
                    color: '#ffffff',
                    cursor: savingStockIn ? 'not-allowed' : 'pointer',
                    boxShadow: '0 2px 4px rgba(5, 150, 105, 0.25)',
                    transition: 'all 0.15s ease'
                  }}
                >
                  {savingStockIn ? 'Saving...' : 'Confirm Inward Stock & Record Credit'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ADD / EDIT PRODUCT */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">{editingProduct ? 'Edit Product' : 'Add New Product'}</h2>
              <button className="modal-close" onClick={() => setShowModal(false)}>×</button>
            </div>

            <form onSubmit={handleSaveProduct}>
              <div className="form-group">
                <label className="form-label">Product Name / Grade *</label>
                <input 
                  type="text"
                  className="form-input"
                  placeholder="e.g. Fe550D TMT Rebars 20mm"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>

              <div className="form-grid-3">
                <div className="form-group">
                  <label className="form-label">Category</label>
                  <select className="form-select" value={category} onChange={(e) => setCategory(e.target.value)}>
                    <option value="Steel">Steel (TMT Rebars)</option>
                    <option value="Structural Steel">Structural Steel (Angles/Beams)</option>
                    <option value="Pipes">Pipes & Tubes</option>
                    <option value="Hardware">Hardware & Binding Wire</option>
                    <option value="Sheets">Roofing & Plates</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">HSN Code</label>
                  <input 
                    type="text"
                    className="form-input"
                    value={hsnCode}
                    onChange={(e) => setHsnCode(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Unit of Measure</label>
                  <select className="form-select" value={unit} onChange={(e) => setUnit(e.target.value)}>
                    <option value="Tons">Tons</option>
                    <option value="Kg">Kg</option>
                    <option value="Pcs">Pcs</option>
                    <option value="Bundles">Bundles</option>
                    <option value="Meters">Meters</option>
                  </select>
                </div>
              </div>

              <div className="form-grid-2">
                <div className="form-group">
                  <label className="form-label">Default Selling Rate (₹ / {unit}) *</label>
                  <input 
                    type="number"
                    step="0.01"
                    className="form-input"
                    placeholder="e.g. 54500"
                    value={sellRate}
                    onChange={(e) => setSellRate(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Default Bought Cost (₹ / {unit}) *</label>
                  <input 
                    type="number"
                    step="0.01"
                    className="form-input"
                    placeholder="e.g. 49000"
                    value={boughtRate}
                    onChange={(e) => setBoughtRate(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="form-grid-2">
                <div className="form-group">
                  <label className="form-label">GST Rate (%)</label>
                  <select className="form-select" value={gstRate} onChange={(e) => setGstRate(e.target.value)}>
                    <option value="18">18% (Standard Steel GST)</option>
                    <option value="12">12%</option>
                    <option value="5">5%</option>
                    <option value="0">0% (Exempted)</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Current Stock on Hand ({unit})</label>
                  <input 
                    type="number"
                    step="0.001"
                    className="form-input"
                    placeholder="e.g. 25.5"
                    value={stockQty}
                    onChange={(e) => setStockQty(e.target.value)}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? 'Saving...' : editingProduct ? 'Update Product' : 'Add to Catalog'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
