import React from 'react';
import { Printer, X, Eye } from 'lucide-react';

// Number to Words Converter for Indian Currency System
function numberToWords(num) {
  const a = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  const n = Math.floor(Math.abs(Number(num) || 0));
  if (n === 0) return 'Zero';

  function convertTwoDigits(val) {
    if (val < 20) return a[val];
    const tens = b[Math.floor(val / 10)];
    const units = a[val % 10];
    return tens + (units ? '-' + units : '');
  }

  function convertThreeDigits(val) {
    let str = '';
    const hundreds = Math.floor(val / 100);
    const rem = val % 100;
    if (hundreds > 0) {
      str += a[hundreds] + ' Hundred';
      if (rem > 0) str += ' ';
    }
    if (rem > 0) {
      str += convertTwoDigits(rem);
    }
    return str;
  }

  let result = '';
  const crores = Math.floor(n / 10000000);
  let rem = n % 10000000;
  const lakhs = Math.floor(rem / 100000);
  rem = rem % 100000;
  const thousands = Math.floor(rem / 1000);
  rem = rem % 1000;

  if (crores > 0) {
    result += convertTwoDigits(crores) + ' Crore ';
  }
  if (lakhs > 0) {
    result += convertTwoDigits(lakhs) + ' Lakhs ';
  }
  if (thousands > 0) {
    result += convertTwoDigits(thousands) + ' Thousand ';
  }
  if (rem > 0) {
    result += convertThreeDigits(rem) + ' ';
  }

  return result.trim();
}

export default function InvoicePrintModal({ bill, customer, onClose }) {
  if (!bill) return null;

  const handlePrint = () => {
    window.print();
  };

  // Date formatter (DD/MM/YYYY)
  const formatDate = (dateStr) => {
    if (!dateStr) return '09/10/2026';
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateStr)) return dateStr;
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  };

  // Calculations & Fallbacks based on exact provided format
  const displayInvNo = bill.bill_no?.startsWith('SMT/') 
    ? bill.bill_no 
    : (bill.bill_no ? `SMT/26-27/${bill.bill_no.replace(/^[A-Za-z]+0*/, '') || bill.bill_no}` : 'SMT/26-27/118');

  const displayDate = formatDate(bill.date);
  const displaySupplyDate = formatDate(bill.date_of_supply || bill.date);

  // Address details
  const customerName = bill.customer_name || customer?.name || 'Sathyam Traders';
  const customerAddress = customer?.address || '19/02\nT.H. Road, Tondiarpet\nChennai 600081';
  const customerGstin = customer?.gstin || bill.customer_gstin || '33GWMPS0522P1ZZ';

  // Item details
  const productName = bill.product_name || 'MS SCRAP';
  const hsnCode = bill.hsn_code || '7204';
  const quantity = Number(bill.quantity) || 13410;
  const unit = (bill.unit || 'KGS').toUpperCase();
  const rate = Number(bill.rate) || 37.20;

  // Subtotal (Before Tax)
  const subtotal = bill.subtotal ? Number(bill.subtotal) : (quantity * rate);

  // Taxes: CGST & SGST (both default to 9% or gst_rate/2), TDS (2%)
  const gstRate = Number(bill.gst_rate) || 18;
  const cgstRate = gstRate / 2;
  const sgstRate = gstRate / 2;
  const tdsRate = 2;

  const cgstAmount = bill.cgst_amount ? Number(bill.cgst_amount) : (subtotal * cgstRate) / 100;
  const sgstAmount = bill.sgst_amount ? Number(bill.sgst_amount) : (subtotal * sgstRate) / 100;
  const tdsAmount = bill.tds_amount ? Number(bill.tds_amount) : (subtotal * tdsRate) / 100;

  // Exact Total calculation
  const calculatedGrandTotal = bill.total_amount ? Number(bill.total_amount) : Math.round(subtotal + cgstAmount + sgstAmount + tdsAmount);
  const rawSum = subtotal + cgstAmount + sgstAmount + tdsAmount;
  const roundoffVal = (calculatedGrandTotal - rawSum);
  const roundoffStr = roundoffVal >= 0 ? `+ ${roundoffVal.toFixed(2)}` : `- ${Math.abs(roundoffVal).toFixed(2)}`;

  const amountInWords = numberToWords(calculatedGrandTotal);

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 9999, overflowY: 'auto', padding: '20px 10px' }}>
      <div 
        className="modal-content printable-invoice" 
        onClick={(e) => e.stopPropagation()}
        style={{ 
          maxWidth: '860px', 
          width: '100%', 
          padding: '24px', 
          backgroundColor: '#ffffff', 
          color: '#000000',
          margin: 'auto',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2), 0 10px 10px -5px rgba(0, 0, 0, 0.08)',
          borderRadius: '8px'
        }}
      >
        {/* MODAL ACTIONS (HIDDEN ON PRINT) */}
        <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Eye size={16} color="#059669" />
            <span style={{ fontSize: '13px', fontWeight: 700, color: '#475569' }}>Invoice Viewer & Print Preview:</span>
            <strong style={{ fontSize: '15px', color: '#0f172a', fontFamily: 'monospace' }}>{displayInvNo}</strong>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button 
              type="button" 
              className="btn btn-primary btn-sm" 
              onClick={handlePrint}
              style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '6px 14px', fontSize: '12px', fontWeight: 700, backgroundColor: '#059669', borderColor: '#059669' }}
            >
              <Printer size={14} />
              Print / Save PDF
            </button>
            <button 
              type="button" 
              className="btn btn-secondary btn-sm" 
              onClick={onClose}
              style={{ padding: '6px 10px' }}
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* ============================================================== */}
        {/* EXACT TAX INVOICE STRUCTURE (REPLICATED 1:1 WITH TDS COLUMN) */}
        {/* ============================================================== */}
        <div style={{ 
          border: '2px solid #000000', 
          backgroundColor: '#ffffff', 
          color: '#000000', 
          fontFamily: 'Arial, Helvetica, sans-serif',
          fontSize: '11px',
          lineHeight: '1.3'
        }}>
          
          {/* HEADER SECTION */}
          <div style={{ display: 'flex', alignItems: 'center', padding: '10px 14px', borderBottom: '2px solid #000000' }}>
            {/* LOGO */}
            <div style={{ width: '85px', flexShrink: 0 }}>
              <svg width="75" height="75" viewBox="0 0 100 100" style={{ border: '2px solid #000', padding: '3px' }}>
                <rect width="100" height="100" fill="#ffffff" />
                {/* Stylized M */}
                <path d="M 22 84 L 22 22 L 50 62 L 78 22 L 78 84" fill="none" stroke="#1e3a5f" strokeWidth="10" strokeLinecap="round" strokeLinejoin="round" />
                {/* Stylized S interlacing */}
                <path d="M 72 32 C 64 16, 32 16, 26 36 C 18 54, 82 50, 74 70 C 66 86, 32 86, 24 70" fill="none" stroke="#2563eb" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" opacity="0.95" />
              </svg>
            </div>

            {/* COMPANY DETAILS */}
            <div style={{ flex: 1, textAlign: 'center', padding: '0 10px' }}>
              <div style={{ display: 'inline-block', border: '1.5px solid #000', padding: '1px 16px', fontSize: '11px', fontWeight: 800, letterSpacing: '1px', marginBottom: '5px' }}>
                TAX INVOICE
              </div>
              <div style={{ fontSize: '20px', fontWeight: 900, letterSpacing: '0.8px', color: '#000', textTransform: 'uppercase' }}>
                SMT TRADERS
              </div>
              <div style={{ fontSize: '10.5px', fontWeight: 700, color: '#000', marginTop: '2px' }}>
                No.14, VELLALAR STREET, AYANAMBAKKAM, MADURAVOYAL CHENNAI- 600 095.
              </div>
              <div style={{ fontSize: '10px', fontWeight: 700, color: '#000', marginTop: '2px' }}>
                GSTIN: 33EWQPS4454A1ZD || EMAIL: traderssmt3@gmail.com
              </div>
            </div>

            <div style={{ width: '85px', flexShrink: 0 }}></div>
          </div>

          {/* INVOICE & DISPATCH METADATA (2 COLUMNS) */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', borderBottom: '2px solid #000000' }}>
            {/* LEFT COLUMN */}
            <div style={{ borderRight: '2px solid #000000', padding: '6px 10px', fontSize: '11px', lineHeight: '1.6' }}>
              <div style={{ display: 'flex' }}>
                <span style={{ width: '80px', fontWeight: 700 }}>Inv No</span>
                <span style={{ width: '15px', fontWeight: 700 }}>:</span>
                <span style={{ fontWeight: 800 }}>{displayInvNo}</span>
              </div>
              <div style={{ display: 'flex' }}>
                <span style={{ width: '80px', fontWeight: 700 }}>Inv Date</span>
                <span style={{ width: '15px', fontWeight: 700 }}>:</span>
                <span style={{ fontWeight: 700 }}>{displayDate}</span>
              </div>
              <div style={{ display: 'flex' }}>
                <span style={{ width: '80px', fontWeight: 700 }}>PO No</span>
                <span style={{ width: '15px', fontWeight: 700 }}>:</span>
                <span style={{ fontWeight: 700 }}>{bill.po_no || ''}</span>
              </div>
            </div>

            {/* RIGHT COLUMN */}
            <div style={{ padding: '6px 10px', fontSize: '11px', lineHeight: '1.6' }}>
              <div style={{ display: 'flex' }}>
                <span style={{ width: '120px', fontWeight: 700 }}>Date of Supply</span>
                <span style={{ width: '15px', fontWeight: 700 }}>:</span>
                <span style={{ fontWeight: 700 }}>{displaySupplyDate}</span>
              </div>
              <div style={{ display: 'flex' }}>
                <span style={{ width: '120px', fontWeight: 700 }}>Vehicle No</span>
                <span style={{ width: '15px', fontWeight: 700 }}>:</span>
                <span style={{ fontWeight: 800 }}>{bill.vehicle_number || 'TN18BJ2540'}</span>
              </div>
              <div style={{ display: 'flex' }}>
                <span style={{ width: '120px', fontWeight: 700 }}>E Way Bill No</span>
                <span style={{ width: '15px', fontWeight: 700 }}>:</span>
                <span style={{ fontWeight: 700 }}>{bill.e_way_bill_no || '5020 8612 2626'}</span>
              </div>
            </div>
          </div>

          {/* ADDRESS SECTION (BILLING & SHIPPING) */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', borderBottom: '2px solid #000000' }}>
            {/* BILLING ADDRESS */}
            <div style={{ borderRight: '2px solid #000000', padding: '6px 10px', minHeight: '90px', fontSize: '11px', lineHeight: '1.35' }}>
              <div style={{ fontWeight: 800, textDecoration: 'none', marginBottom: '3px' }}>Billing Address:</div>
              <div style={{ fontWeight: 700 }}>{customerName}</div>
              <div style={{ whiteSpace: 'pre-line', margin: '2px 0' }}>{customerAddress}</div>
              <div style={{ fontWeight: 700, marginTop: '3px' }}>GSTIN : {customerGstin}</div>
            </div>

            {/* SHIPPING ADDRESS */}
            <div style={{ padding: '6px 10px', minHeight: '90px', fontSize: '11px', lineHeight: '1.35' }}>
              <div style={{ fontWeight: 800, textDecoration: 'none', marginBottom: '3px' }}>Shipping Address:</div>
              <div style={{ fontWeight: 700 }}>{customerName}</div>
              <div style={{ whiteSpace: 'pre-line', margin: '2px 0' }}>{customerAddress}</div>
            </div>
          </div>

          {/* PRODUCT & ITEMS TABLE WITH ADDITIONAL 2% TDS COLUMN */}
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '11px' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #000000' }}>
                <th style={{ borderRight: '2px solid #000000', padding: '6px 4px', textAlign: 'center', width: '36px', fontWeight: 800 }}>NO</th>
                <th style={{ borderRight: '2px solid #000000', padding: '6px 8px', fontWeight: 800 }}>Product Description</th>
                <th style={{ borderRight: '2px solid #000000', padding: '6px 6px', textAlign: 'center', width: '75px', fontWeight: 800 }}>HSN Code</th>
                <th style={{ borderRight: '2px solid #000000', padding: '6px 8px', textAlign: 'right', width: '90px', fontWeight: 800 }}>QTY</th>
                <th style={{ borderRight: '2px solid #000000', padding: '6px 6px', textAlign: 'center', width: '55px', fontWeight: 800 }}>Unit</th>
                <th style={{ borderRight: '2px solid #000000', padding: '6px 8px', textAlign: 'right', width: '75px', fontWeight: 800 }}>Rate</th>
                <th style={{ borderRight: '2px solid #000000', padding: '6px 8px', textAlign: 'right', width: '95px', fontWeight: 800 }}>Amount</th>
                <th style={{ padding: '6px 8px', textAlign: 'right', width: '80px', fontWeight: 800 }}>2% TDS</th>
              </tr>
            </thead>
            <tbody>
              {/* MAIN ITEM ROW */}
              <tr style={{ minHeight: '38px', verticalAlign: 'top' }}>
                <td style={{ borderRight: '2px solid #000000', padding: '8px 4px', textAlign: 'center', fontWeight: 700 }}>1</td>
                <td style={{ borderRight: '2px solid #000000', padding: '8px 8px', fontWeight: 800 }}>{productName}</td>
                <td style={{ borderRight: '2px solid #000000', padding: '8px 6px', textAlign: 'center', fontWeight: 700 }}>{hsnCode}</td>
                <td style={{ borderRight: '2px solid #000000', padding: '8px 8px', textAlign: 'right', fontWeight: 700 }}>
                  {quantity.toLocaleString('en-IN', { minimumFractionDigits: 3, maximumFractionDigits: 3 })}
                </td>
                <td style={{ borderRight: '2px solid #000000', padding: '8px 6px', textAlign: 'center', fontWeight: 700 }}>{unit}</td>
                <td style={{ borderRight: '2px solid #000000', padding: '8px 8px', textAlign: 'right', fontWeight: 700 }}>
                  {rate.toFixed(2)}
                </td>
                <td style={{ borderRight: '2px solid #000000', padding: '8px 8px', textAlign: 'right', fontWeight: 800 }}>
                  {subtotal.toFixed(2)}
                </td>
                <td style={{ padding: '8px 8px', textAlign: 'right', fontWeight: 700, color: '#000000' }}>
                  {tdsAmount.toFixed(2)}
                </td>
              </tr>

              {/* TOTAL QTY & SUB TOTAL ROW */}
              <tr style={{ borderTop: '2px solid #000000' }}>
                <td style={{ borderRight: '2px solid #000000' }}></td>
                <td style={{ borderRight: '2px solid #000000' }}></td>
                <td style={{ borderRight: '2px solid #000000', padding: '5px 6px', textAlign: 'center', fontWeight: 800 }}>
                  Total Qty
                </td>
                <td style={{ borderRight: '2px solid #000000', padding: '5px 8px', textAlign: 'right', fontWeight: 800 }}>
                  {quantity.toFixed(3)}
                </td>
                <td colSpan={2} style={{ borderRight: '2px solid #000000', padding: '5px 8px', fontWeight: 700 }}>
                  Sub Total
                </td>
                <td colSpan={2} style={{ padding: '5px 8px', textAlign: 'right', fontWeight: 800 }}>
                  {subtotal.toFixed(2)}
                </td>
              </tr>

              {/* CGST ROW */}
              <tr style={{ borderTop: '1px solid #000000' }}>
                <td colSpan={4} style={{ borderRight: '2px solid #000000' }}></td>
                <td colSpan={2} style={{ borderRight: '2px solid #000000', padding: '4px 8px', fontWeight: 700 }}>
                  CGST @ {cgstRate} %
                </td>
                <td colSpan={2} style={{ padding: '4px 8px', textAlign: 'right', fontWeight: 800 }}>
                  {cgstAmount.toFixed(2)}
                </td>
              </tr>

              {/* SGST ROW */}
              <tr style={{ borderTop: '1px solid #000000' }}>
                <td colSpan={4} style={{ borderRight: '2px solid #000000' }}></td>
                <td colSpan={2} style={{ borderRight: '2px solid #000000', padding: '4px 8px', fontWeight: 700 }}>
                  SGST @ {sgstRate} %
                </td>
                <td colSpan={2} style={{ padding: '4px 8px', textAlign: 'right', fontWeight: 800 }}>
                  {sgstAmount.toFixed(2)}
                </td>
              </tr>

              {/* 2% TDS ROW */}
              <tr style={{ borderTop: '1px solid #000000' }}>
                <td colSpan={4} style={{ borderRight: '2px solid #000000' }}></td>
                <td colSpan={2} style={{ borderRight: '2px solid #000000', padding: '4px 8px', fontWeight: 700 }}>
                  TDS @ {tdsRate} %
                </td>
                <td colSpan={2} style={{ padding: '4px 8px', textAlign: 'right', fontWeight: 800 }}>
                  {tdsAmount.toFixed(2)}
                </td>
              </tr>

              {/* ROUNDOFF ROW */}
              <tr style={{ borderTop: '1px solid #000000' }}>
                <td colSpan={4} style={{ borderRight: '2px solid #000000' }}></td>
                <td colSpan={2} style={{ borderRight: '2px solid #000000', padding: '4px 8px', fontWeight: 700 }}>
                  Roundoff
                </td>
                <td colSpan={2} style={{ padding: '4px 8px', textAlign: 'right', fontWeight: 700 }}>
                  {roundoffStr}
                </td>
              </tr>

              {/* GRAND TOTAL ROW */}
              <tr style={{ borderTop: '2px solid #000000', borderBottom: '2px solid #000000' }}>
                <td colSpan={4} style={{ borderRight: '2px solid #000000' }}></td>
                <td colSpan={2} style={{ borderRight: '2px solid #000000', padding: '6px 8px', fontWeight: 900, fontSize: '11.5px' }}>
                  Grand Total
                </td>
                <td colSpan={2} style={{ padding: '6px 8px', textAlign: 'right', fontWeight: 900, fontSize: '12px' }}>
                  {calculatedGrandTotal.toFixed(2)}
                </td>
              </tr>
            </tbody>
          </table>

          {/* TOTAL INVOICE AMOUNT IN WORDS */}
          <div style={{ padding: '7px 10px', borderBottom: '2px solid #000000', fontSize: '11px' }}>
            <div style={{ fontWeight: 800, fontSize: '11.5px', marginBottom: '2px' }}>
              Total Invoice Amount in words:
            </div>
            <div style={{ fontWeight: 800, textTransform: 'capitalize' }}>
              INR Rupees {amountInWords} Only
            </div>
          </div>

          {/* BANK DETAILS SECTION */}
          <div style={{ padding: '8px 10px', fontSize: '10.5px', lineHeight: '1.5' }}>
            <div style={{ fontWeight: 700 }}>Account Name: SMT TRADERS</div>
            <div style={{ fontWeight: 700 }}>Branch Name: MOGAPPAIR WEST,CH-37.</div>
            <div style={{ fontWeight: 700 }}>Bank Name: HDFC BANK</div>
            <div style={{ fontWeight: 700 }}>Account Number: 50200066429387</div>
            <div style={{ fontWeight: 700 }}>IFSC Code : HDFC0001765</div>
          </div>

          {/* HSN TAX SUMMARY TABLE (BORDERED SUB-TABLE AT BOTTOM) */}
          <div style={{ padding: '0 10px 10px 10px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'center', fontSize: '9.5px', border: '1.5px solid #000000' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #000000' }}>
                  <th rowSpan={2} style={{ borderRight: '1px solid #000', padding: '4px', fontWeight: 800 }}>HSN Code</th>
                  <th rowSpan={2} style={{ borderRight: '1px solid #000', padding: '4px', fontWeight: 800 }}>Taxable Amt</th>
                  <th colSpan={2} style={{ borderRight: '1px solid #000', padding: '3px', fontWeight: 800 }}>CGST</th>
                  <th colSpan={2} style={{ borderRight: '1px solid #000', padding: '3px', fontWeight: 800 }}>SGST</th>
                  <th colSpan={2} style={{ borderRight: '1px solid #000', padding: '3px', fontWeight: 800 }}>TDS</th>
                  <th rowSpan={2} style={{ padding: '4px', fontWeight: 800 }}>Grand Total</th>
                </tr>
                <tr style={{ borderBottom: '1px solid #000000' }}>
                  <th style={{ borderRight: '1px solid #000', padding: '2px 4px', fontWeight: 700 }}>CGST %</th>
                  <th style={{ borderRight: '1px solid #000', padding: '2px 4px', fontWeight: 700 }}>CGST Amt</th>
                  <th style={{ borderRight: '1px solid #000', padding: '2px 4px', fontWeight: 700 }}>SGST %</th>
                  <th style={{ borderRight: '1px solid #000', padding: '2px 4px', fontWeight: 700 }}>SGST Amt</th>
                  <th style={{ borderRight: '1px solid #000', padding: '2px 4px', fontWeight: 700 }}>TDS %</th>
                  <th style={{ borderRight: '1px solid #000', padding: '2px 4px', fontWeight: 700 }}>TDS Amt</th>
                </tr>
              </thead>
              <tbody>
                <tr style={{ borderBottom: '1px solid #000000' }}>
                  <td style={{ borderRight: '1px solid #000', padding: '4px' }}>{hsnCode}</td>
                  <td style={{ borderRight: '1px solid #000', padding: '4px', textAlign: 'right' }}>{subtotal.toFixed(2)}</td>
                  <td style={{ borderRight: '1px solid #000', padding: '4px' }}>{cgstRate.toFixed(2)}</td>
                  <td style={{ borderRight: '1px solid #000', padding: '4px', textAlign: 'right' }}>{cgstAmount.toFixed(2)}</td>
                  <td style={{ borderRight: '1px solid #000', padding: '4px' }}>{sgstRate.toFixed(2)}</td>
                  <td style={{ borderRight: '1px solid #000', padding: '4px', textAlign: 'right' }}>{sgstAmount.toFixed(2)}</td>
                  <td style={{ borderRight: '1px solid #000', padding: '4px' }}>{tdsRate.toFixed(2)}</td>
                  <td style={{ borderRight: '1px solid #000', padding: '4px', textAlign: 'right' }}>{tdsAmount.toFixed(2)}</td>
                  <td style={{ padding: '4px', textAlign: 'right', fontWeight: 800 }}>{calculatedGrandTotal.toFixed(2)}</td>
                </tr>
                {/* SUMMARY ROW */}
                <tr style={{ fontWeight: 800 }}>
                  <td style={{ borderRight: '1px solid #000', padding: '4px' }}>Total</td>
                  <td style={{ borderRight: '1px solid #000', padding: '4px', textAlign: 'right' }}>{subtotal.toFixed(2)}</td>
                  <td style={{ borderRight: '1px solid #000', padding: '4px' }}></td>
                  <td style={{ borderRight: '1px solid #000', padding: '4px', textAlign: 'right' }}>{cgstAmount.toFixed(2)}</td>
                  <td style={{ borderRight: '1px solid #000', padding: '4px' }}></td>
                  <td style={{ borderRight: '1px solid #000', padding: '4px', textAlign: 'right' }}>{sgstAmount.toFixed(2)}</td>
                  <td style={{ borderRight: '1px solid #000', padding: '4px' }}></td>
                  <td style={{ borderRight: '1px solid #000', padding: '4px', textAlign: 'right' }}>{tdsAmount.toFixed(2)}</td>
                  <td style={{ padding: '4px', textAlign: 'right' }}>{calculatedGrandTotal.toFixed(2)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* DECLARATION & SIGNATURE FOOTER */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', borderTop: '2px solid #000000', padding: '8px 10px' }}>
            {/* DECLARATION */}
            <div style={{ fontSize: '9.5px', lineHeight: '1.4', paddingRight: '10px' }}>
              <div style={{ fontWeight: 800, marginBottom: '2px' }}>Declaration:</div>
              <div>1. Goods once sold will not be taken back or exchanged.</div>
              <div>2. Seller is not responsible for any loss or damaged of goods in transit.</div>
              <div>3. Buyer undertakes the submit prescribed ST declaration to sender on demand.</div>
              <div style={{ marginTop: '2px', fontWeight: 600 }}>Disputes if any will be subject to seller court jurisdiction.</div>
            </div>

            {/* AUTHORIZED SIGNATORY */}
            <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: '65px' }}>
              <div style={{ fontWeight: 800, fontSize: '11px' }}>For M/s. SMT TRADERS</div>
              <div style={{ fontWeight: 800, fontSize: '11px' }}>Authorized Signatory</div>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
