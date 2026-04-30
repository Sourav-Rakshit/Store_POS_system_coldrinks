'use client';

import React from 'react';
import { Bill, StoreSettings, BillItem } from '@/types';
import { getPaymentTag } from '@/lib/utils/paymentUtils';

interface ThermalReceiptProps {
  bill: Bill;
  settings: StoreSettings;
  returnedItems?: Array<{
    productName: string;
    sizeName: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    packaging?: string;
  }>;
  refundAmount?: number;
}

function numberToWords(num: number): string {
  if (num === 0) return 'Zero Rupees Only';
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
    'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  function convertHundreds(n: number): string {
    if (n < 20) return ones[n];
    if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 !== 0 ? ' ' + ones[n % 10] : '');
    return ones[Math.floor(n / 100)] + ' Hundred' + (n % 100 !== 0 ? ' ' + convertHundreds(n % 100) : '');
  }
  if (num >= 100000) {
    const lakhs = Math.floor(num / 100000);
    const remaining = num % 100000;
    return convertHundreds(lakhs) + ' Lakh' + (remaining !== 0 ? ' ' + convertHundreds(remaining) : '');
  }
  if (num >= 1000) {
    const thousands = Math.floor(num / 1000);
    const remaining = num % 1000;
    return convertHundreds(thousands) + ' Thousand' + (remaining !== 0 ? ' ' + convertHundreds(remaining) : '');
  }
  return convertHundreds(num);
}

export function ThermalReceipt({
  bill,
  settings,
  returnedItems = [],
  refundAmount = 0,
}: ThermalReceiptProps) {
  const billItems: BillItem[] = typeof bill.items === 'string'
    ? JSON.parse(bill.items)
    : bill.items || [];

  // ✅ Defensive field mapping (handle different db field names)
  const mappedItems = billItems.map((item: any) => ({
    productName: item.productName || item.name || item.product_name || '',
    sizeName: item.sizeName || item.size_name || item.size || '',
    quantity: Number(item.quantity) || 0,
    unitPrice: Number(item.unitPrice) || 0,
    totalPrice: Number(item.totalPrice) || 0,
    packaging: item.packaging,
    invoiceNumber: item.invoiceNumber,
  }));

  // ✅ Map returned items defensively too
  const mappedReturnedItems = returnedItems.map((item: any) => ({
    productName: item.productName || item.name || item.product_name || '',
    sizeName: item.sizeName || item.size_name || item.size || '',
    quantity: Number(item.quantity) || 0,
    unitPrice: Number(item.unitPrice) || 0,
    totalPrice: Number(item.totalPrice) || 0,
    packaging: item.packaging,
  }));

  // Calculate totals
  const itemTotal = mappedItems.reduce((sum, item) => sum + Number(item.totalPrice || 0), 0);
  const discountAmount = Number(bill.discountAmount) || 0;
  const totalAfterDiscount = itemTotal - discountAmount;
  const roundOff = Math.round(totalAfterDiscount) - totalAfterDiscount;
  const roundedTotal = Math.round(totalAfterDiscount);
  const paidAmount = Number(bill.cashReceived) || 0;
  const dueAmount = roundedTotal - paidAmount - refundAmount;
  // ✅ Fix: change = cashReceived - roundedTotal (positive means change given back)
  const changeGiven = paidAmount - roundedTotal;

  const billDate = bill.createdAt ? new Date(bill.createdAt) : new Date();
  const dateStr = billDate.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const timeStr = billDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });

  const formatQty = (qty: number, packaging?: string) => {
    if (packaging === 'carton') return `${qty}C`;
    if (packaging === 'bottle') return `${qty}B`;
    return `${qty}`;
  };

  const getCustomerType = () => {
    if (bill.billType === 'order') return 'ORDER';
    if (bill.customerType === 'wholesale') return 'PICKUP';
    return 'WALK-IN';
  };

  const getStatusStamp = () => {
    if (dueAmount <= 0) return 'PAID';
    if (paidAmount > 0) return 'DUE';
    return 'UNPAID';
  };

  const statusStamp = getStatusStamp();

  const getPaymentMethod = () => {
    switch (bill.paymentMode) {
      case 'Cash': return 'CASH';
      case 'UPI': return 'UPI';
      case 'Card': return 'CARD';
      case 'Credit': return 'CREDIT';
      default: return 'CASH';
    }
  };

  const showReturnSection = mappedReturnedItems.length > 0 || refundAmount > 0;

  // ✅ Shared column definition — single source of truth
  const COL = '1fr 22px 42px 42px';

  return (
    <div
      data-receipt-root="true"
      style={{
      width: '52mm',
      minHeight: '420px',
      margin: '0 auto',
      backgroundColor: '#ffffff',
      fontFamily: '"Courier New", Courier, monospace',
      fontSize: '9px',
      color: '#000000',
      padding: '0 0 60px 0',
      boxSizing: 'border-box',
    }}>

     {/* ── HEADER ── */}
<div style={{
  padding: '8px 8px 6px',
  borderBottom: '1px dashed #000',
  textAlign: 'center',
}}>
  {/* Shop name with decorative side lines */}
  <div style={{
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '4px',
    marginBottom: '3px',
  }}>
    <div style={{ flex: 1, borderTop: '1px solid #000' }} />
    <div style={{
      fontSize: '13px',
      fontWeight: 'bold',
      letterSpacing: '1px',
      whiteSpace: 'nowrap',
      padding: '0 4px',
    }}>
      {(settings.shopName || 'MY SHOP').toUpperCase()}
    </div>
    <div style={{ flex: 1, borderTop: '1px solid #000' }} />
  </div>

  <div style={{ fontSize: '8px', color: '#444', marginTop: '2px' }}>
    {settings.shopAddress || 'Shop Address'}
  </div>
  <div style={{ fontSize: '8px', color: '#444', marginTop: '1px' }}>
    Ph: {settings.shopPhone || '9876543210'}
  </div>
</div>

      {/* ── BILL INFO ── */}
      <div style={{ padding: '4px 8px', fontSize: '8px' }}>
        <div>INV: {bill.invoiceNumber}</div>
        <div>DATE: {dateStr} | TIME: {timeStr}</div>
      </div>

      {/* ── CUSTOMER ── */}
      <div style={{ padding: '4px 8px 5px', borderBottom: '1px dashed #000' }}>
        <div style={{ fontSize: '8px', marginBottom: '2px' }}>
          <span style={{ fontWeight: 'bold' }}>Type:</span> {getCustomerType()}
          {bill.billType === 'order' && bill.deliveryDate && (
            <span> | Delivery: {new Date(bill.deliveryDate).toLocaleDateString('en-GB')}</span>
          )}
        </div>
        <div style={{ fontSize: '8px', marginBottom: '1px' }}>
          <span style={{ fontWeight: 'bold' }}>Customer:</span> {bill.customerName || 'CASH'}
        </div>
        {bill.phoneNumber && (
          <div style={{ fontSize: '8px', marginTop: '2px' }}>
            <span style={{ fontWeight: 'bold' }}>Mobile:</span> {bill.phoneNumber}
          </div>
        )}
        {bill.customerEmail && (
          <div style={{ fontSize: '8px', marginTop: '2px' }}>
            <span style={{ fontWeight: 'bold' }}>Email:</span> {bill.customerEmail}
          </div>
        )}
      </div>

      {/* ── ITEMS HEADER ── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: COL,
        fontSize: '8px',
        fontWeight: 'bold',
        backgroundColor: '#f0f0f0',
        padding: '3px 4px',
        borderBottom: '1px solid #000',
      }}>
        <span>Item</span>
        <span style={{ textAlign: 'center' }}>Qty</span>
        <span style={{ textAlign: 'right' }}>Rate</span>
        <span style={{ textAlign: 'right' }}>Amount</span>
      </div>

      {/* ── ITEMS LIST ── */}
      {mappedItems.map((item, index) => (
        <div key={index} style={{
          display: 'grid',
          gridTemplateColumns: COL,
          fontSize: '8px',
          padding: '3px 4px 3px',
          backgroundColor: index % 2 === 0 ? '#fafafa' : '#ffffff',
          alignItems: 'start',
        }}>
          <div style={{ paddingRight: '3px', lineHeight: '1.45', wordBreak: 'break-word' }}>
            <div>
              {[item.productName, item.sizeName].filter(Boolean).join(' ')}
            </div>
          </div>
          <span style={{ textAlign: 'center', alignSelf: 'flex-start', paddingTop: '2px' }}>
            {formatQty(item.quantity, item.packaging)}
          </span>
          <span style={{ textAlign: 'right', alignSelf: 'flex-start', paddingTop: '2px' }}>
            ₹{Number(item.unitPrice).toFixed(2)}
          </span>
          <span style={{ textAlign: 'right', alignSelf: 'flex-start', paddingTop: '2px' }}>
            ₹{Number(item.totalPrice).toFixed(2)}
          </span>
        </div>
      ))}

{/* ── RETURN ITEMS ── */}
      {showReturnSection && (
        <div style={{
          padding: '4px 8px',
          borderTop: '1px dashed #000',
          borderBottom: '1px dashed #000',
          backgroundColor: '#fff5f5',
        }}>
          <div style={{ fontSize: '8px', fontWeight: 'bold', color: '#cc0000', marginBottom: '3px' }}>
            RETURNED ITEMS:
          </div>
          {mappedReturnedItems.map((item, index) => (
            <div key={index} style={{
              display: 'grid',
              gridTemplateColumns: '1fr 22px 42px',
              fontSize: '7px',
              marginBottom: '2px',
              color: '#cc0000',
              alignItems: 'start',
            }}>
              <span style={{
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', paddingRight: '3px',
              }}>
                {item.productName} {item.sizeName}
              </span>
              <span style={{ textAlign: 'center', alignSelf: 'flex-start', paddingTop: '1px' }}>
                {formatQty(item.quantity, item.packaging)}
              </span>
              <span style={{ textAlign: 'right', alignSelf: 'flex-start', paddingTop: '1px' }}>
                ₹{Number(item.totalPrice).toFixed(2)}
              </span>
            </div>
          ))}
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '8px', fontWeight: 'bold', marginTop: '4px' }}>
            <span>Refund Amount:</span>
            <span>₹{refundAmount.toFixed(2)}</span>
          </div>
        </div>
      )}

      {/* ── TOTALS ── */}
      <div style={{ padding: '4px 8px 4px', borderTop: '1px dashed #000' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '8px', padding: '1px 0' }}>
          <span>Item Total</span>
          <span>₹{itemTotal.toFixed(2)}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '8px', padding: '1px 0' }}>
          <span>Sub Total</span>
          <span>₹{itemTotal.toFixed(2)}</span>
        </div>
        {discountAmount > 0 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '8px', padding: '1px 0', color: '#cc0000' }}>
            <span>Discount</span>
            <span>-₹{discountAmount.toFixed(2)}</span>
          </div>
        )}
        {roundOff !== 0 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '8px', padding: '1px 0' }}>
            <span>Round Off</span>
            {/* ✅ Show + or - sign clearly */}
            <span>{roundOff > 0 ? '+' : ''}₹{roundOff.toFixed(2)}</span>
          </div>
        )}

        {/* Grand Total */}
        <div style={{
          borderTop: '1px solid #000',
          borderBottom: '1px solid #000',
          padding: '4px 0',
          margin: '4px 0',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', fontWeight: 'bold' }}>
            <span>GRAND TOTAL</span>
            <span>₹{roundedTotal.toFixed(2)}</span>
          </div>
        </div>

        {paidAmount > 0 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '8px', padding: '1px 0' }}>
            <span>Paid Amount</span>
            <span>₹{paidAmount.toFixed(2)}</span>
          </div>
        )}

        {dueAmount > 0 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '9px', fontWeight: 'bold', color: '#cc0000', padding: '1px 0' }}>
            <span>Due Amount</span>
            <span>₹{dueAmount.toFixed(2)}</span>
          </div>
        )}

        {showReturnSection && (
          <div style={{
            display: 'flex', justifyContent: 'space-between', fontSize: '9px', fontWeight: 'bold',
            marginTop: '4px', padding: '3px', backgroundColor: '#f0f0f0', border: '1px solid #ccc',
          }}>
            <span>FINAL AMOUNT</span>
            <span>₹{dueAmount.toFixed(2)}</span>
          </div>
        )}
      </div>

      {/* ── AMOUNT IN WORDS ── */}
      <div style={{ padding: '4px 8px 4px', fontSize: '7.5px', lineHeight: '1.45', borderTop: '1px dashed #000' }}>
        {/* ✅ Fix: use Math.abs(roundedTotal) for words, handle paid/due correctly */}
        <span style={{ fontWeight: 'bold' }}>Amt in Words: </span>
        {numberToWords(Math.abs(dueAmount <= 0 ? roundedTotal : dueAmount))} Only
      </div>

      {/* ── CHANGE GIVEN ── */}
      {bill.paymentMode === 'Cash' && changeGiven > 0 && (
        <div style={{ padding: '4px 8px 4px', fontSize: '8px', borderTop: '1px dotted #ccc' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Change Given</span>
            {/* ✅ Fix: was roundedTotal - cashReceived (negative), now cashReceived - roundedTotal */}
            <span>₹{changeGiven.toFixed(2)}</span>
          </div>
        </div>
      )}

      {/* ── STATUS STAMP ── */}
      <div style={{ textAlign: 'center', margin: '4px 8px 0', padding: '2px 0' }}>
          <span style={{
            fontSize: '12px',
            fontWeight: 'bold',
            color: statusStamp === 'PAID' ? '#28a745' : statusStamp === 'DUE' ? '#fd7e14' : '#dc3545',
            border: `2px solid ${statusStamp === 'PAID' ? '#28a745' : statusStamp === 'DUE' ? '#fd7e14' : '#dc3545'}`,
            padding: '3px 10px',
            borderRadius: '3px',
            display: 'inline-block',
            letterSpacing: '2px',
          }}>
            {statusStamp}
          </span>
      </div>

      {/* ── PAYMENT METHOD ── */}
      <div style={{
        marginTop: '6px', padding: '4px 8px', fontSize: '8px',
        textAlign: 'center', backgroundColor: '#f0f0f0', borderTop: '1px solid #000',
      }}>
        <span style={{ fontWeight: 'bold' }}>Payment:</span> {getPaymentTag(bill)}
      </div>

      {/* ── FOOTER ── */}
      <div style={{
        marginTop: '8px', padding: '6px 8px',
        borderTop: '1px dashed #000', textAlign: 'center',
        fontSize: '8px', fontWeight: 'bold',
      }}>
        Thank You... Visit Again!
      </div>
    </div>
  );
}
