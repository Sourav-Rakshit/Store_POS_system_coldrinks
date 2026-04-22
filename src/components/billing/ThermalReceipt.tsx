'use client';

import React from 'react';
import { Bill, StoreSettings, BillItem } from '@/types';

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

// Convert number to words
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
  
  if (num >= 10000000) {
    const crores = Math.floor(num / 10000000);
    const remaining = num % 10000000;
    return convertHundreds(crores) + ' Crore' + (remaining !== 0 ? ' ' + convertHundreds(Math.floor(remaining / 100000)) + ' Lakh' + (remaining % 100000 !== 0 ? ' ' + convertHundreds(remaining % 100000) : '') : '');
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
  // Parse bill items
  const billItems: BillItem[] = typeof bill.items === 'string' 
    ? JSON.parse(bill.items) 
    : bill.items || [];

  // Calculate totals
  const itemTotal = billItems.reduce((sum, item) => sum + Number(item.totalPrice || 0), 0);
  const roundOff = Math.round(itemTotal) - itemTotal;
  const roundedTotal = Math.round(itemTotal);
  
  // Paid/Advance amount
  const paidAmount = Number(bill.cashReceived) || 0;
  const dueAmount = roundedTotal - paidAmount - refundAmount;
  
  // Final amount after returns
  const finalAmount = dueAmount;

  // Format date and time
  const billDate = bill.createdAt 
    ? new Date(bill.createdAt)
    : new Date();
  
  const dateStr = billDate.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
  
  const timeStr = billDate.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });

  // Format quantity with B/C suffix
  const formatQty = (qty: number, packaging?: string) => {
    if (packaging === 'carton') return `${qty}C`;
    if (packaging === 'bottle') return `${qty}B`;
    return `${qty}`;
  };

  // Get customer type
  const getCustomerType = () => {
    if (bill.billType === 'order') return 'ORDER';
    if (bill.customerType === 'wholesale') return 'PICKUP';
    return 'WALK-IN';
  };

  // Get status stamp
  const getStatusStamp = () => {
    if (dueAmount <= 0) return 'PAID';
    if (paidAmount > 0) return 'DUE';
    return 'UNPAID';
  };

  // Get payment method
  const getPaymentMethod = () => {
    switch (bill.paymentMode) {
      case 'Cash': return 'CASH';
      case 'UPI': return 'UPI';
      case 'Card': return 'CARD';
      case 'Credit': return 'CREDIT';
      default: return 'CASH';
    }
  };

  const status = getStatusStamp();
  const showReturnSection = returnedItems.length > 0 || refundAmount > 0;

  return (
<div
      style={{
        width: '52mm',
        minHeight: '450px',
        margin: '0 auto',
        backgroundColor: '#ffffff',
        fontFamily: '"Courier New", Courier, monospace',
        fontSize: '10px',
        color: '#000000',
        padding: '0',
        boxSizing: 'border-box',
      }}
    >
      {/* Header */}
      <div style={{ 
        textAlign: 'center', 
        marginBottom: '8px',
        paddingBottom: '8px',
        borderBottom: '1px dashed #000'
      }}>
        <div style={{ 
          fontSize: '16px', 
          fontWeight: 'bold',
          marginBottom: '4px'
        }}>
          {(settings.shopName || 'MY SHOP').toUpperCase()}
        </div>
        <div style={{ fontSize: '10px', marginBottom: '2px' }}>
          {settings.shopAddress || 'Shop Address'}
        </div>
        <div style={{ fontSize: '10px' }}>
          Ph: {settings.shopPhone || '9876543210'}
        </div>
      </div>

      {/* Bill Info */}
      <div style={{ 
        fontSize: '10px',
        marginBottom: '4px'
      }}>
        <div>INV: {bill.invoiceNumber}</div>
        <div>DATE: {dateStr} | TIME: {timeStr}</div>
      </div>

      {/* Customer Type & Info */}
      <div style={{ 
        fontSize: '10px',
        marginBottom: '8px',
        paddingBottom: '6px',
        borderBottom: '1px dashed #000'
      }}>
        <div>
          <span style={{ fontWeight: 'bold' }}>Type:</span> {getCustomerType()}
          {bill.billType === 'order' && bill.deliveryDate && (
            <span> | Delivery: {new Date(bill.deliveryDate).toLocaleDateString('en-GB')}</span>
          )}
        </div>
        <div>
          <span style={{ fontWeight: 'bold' }}>Customer:</span> {bill.customerName || 'CASH'}
        </div>
        {bill.phoneNumber && (
          <div>
            <span style={{ fontWeight: 'bold' }}>Mobile:</span> {bill.phoneNumber}
          </div>
        )}
        {bill.customerEmail && (
          <div>
            <span style={{ fontWeight: 'bold' }}>Email:</span> {bill.customerEmail}
          </div>
        )}
      </div>

      {/* Items Header */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '90px 20px 25px 25px',
        gap: '1px',
        fontSize: '7px',
        marginBottom: '1px'
      }}>
        <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Item</span>
        <span style={{ textAlign: 'center' }}>Qty</span>
        <span style={{ textAlign: 'right' }}>Rate</span>
        <span style={{ textAlign: 'right' }}>Amount</span>
      </div>

      {/* Items - each on one line */}
      {billItems.map((item, index) => (
        <div
          key={index}
          style={{
            display: 'grid',
            gridTemplateColumns: '90px 20px 25px 25px',
            gap: '1px',
            fontSize: '7px',
            marginBottom: '1px'
          }}
        >
          <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.productName}</span>
          <span style={{ textAlign: 'center' }}>{item.quantity}</span>
          <span style={{ textAlign: 'right' }}>₹{Number(item.unitPrice).toFixed(2)}</span>
          <span style={{ textAlign: 'right' }}>₹{Number(item.totalPrice).toFixed(2)}</span>
        </div>
      ))}

      {/* Return Items */}
      {showReturnSection && (
        <>
          <div style={{
            marginTop: '8px',
            borderTop: '1px dashed #000',
            paddingTop: '6px',
            borderBottom: '1px dashed #000',
            paddingBottom: '6px'
          }}>
            <div style={{ fontSize: '9px', fontWeight: 'bold', color: '#cc0000' }}>
              RETURNED ITEMS:
            </div>
            {returnedItems.map((item, index) => (
              <div
                key={index}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 25px 40px',
                  gap: '3px',
                  fontSize: '8px',
                  marginBottom: '1px',
                  color: '#cc0000',
                  textDecoration: 'line-through'
                }}
              >
                <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.productName} {item.sizeName}</span>
                <span style={{ textAlign: 'center' }}>{formatQty(item.quantity, item.packaging)}</span>
                <span style={{ textAlign: 'right' }}>₹{Number(item.totalPrice).toFixed(2)}</span>
              </div>
            ))}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: '8px',
              fontWeight: 'bold',
              marginTop: '4px',
              color: '#cc0000'
            }}>
              <span>Refund Amount:</span>
              <span>₹{refundAmount.toFixed(2)}</span>
            </div>
          </div>
        </>
      )}

      {/* Totals Section */}
      <div style={{
        marginTop: '8px',
        borderTop: '1px dashed #000',
        paddingTop: '6px'
      }}>
        {/* Sub Total */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          fontSize: '8px',
          marginBottom: '3px'
        }}>
          <span>Item Total</span>
          <span>₹{itemTotal.toFixed(2)}</span>
        </div>

        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          fontSize: '8px',
          marginBottom: '3px'
        }}>
          <span>Sub Total</span>
          <span>₹{itemTotal.toFixed(2)}</span>
        </div>

        {/* Round Off */}
         {    roundedTotal !== Math.round(roundedTotal) && (
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: '8px',
              marginBottom: '3px'
            }}>
              <span>Adjusted Total</span>
              <span>₹{(roundedTotal - itemTotal).toFixed(2)}</span>
            </div>
          )}

         {/* Grand Total */}
         <div style={{
           borderTop: '1px solid #000',
           borderBottom: '1px solid #000',
           padding: '4px 0',
           marginTop: '4px'
         }}>
           <div style={{
             display: 'flex',
             justifyContent: 'space-between',
             fontSize: '10px',
             fontWeight: 'bold'
           }}>
             <span>GRAND TOTAL</span>
             <span>₹{roundedTotal.toFixed(2)}</span>
           </div>
         </div>

         {/* Paid Amount */}
         {paidAmount > 0 && (
           <div style={{
             display: 'flex',
             justifyContent: 'space-between',
             fontSize: '9px',
             marginTop: '4px'
           }}>
             <span>Paid Amount</span>
             <span>₹{paidAmount.toFixed(2)}</span>
           </div>
         )}

          {/* Due Amount */}
          {dueAmount > 0 && (
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: '10px',
              fontWeight: 'bold',
              color: '#cc0000',
              marginTop: '3px'
            }}>
              <span>Due Amount</span>
              <span>₹{dueAmount.toFixed(2)}</span>
            </div>
 )}

         {/* Final Amount */}
        {showReturnSection && (
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: '10px',
            fontWeight: 'bold',
            marginTop: '4px',
            padding: '4px',
            backgroundColor: '#f0f0f0',
            border: '1px solid #ccc'
          }}>
              <span>FINAL AMOUNT</span>
              <span>₹{dueAmount.toFixed(2)}</span>
            </div>
        )}
      </div>

{/* Amount in Words */}
      <div style={{
        marginTop: '4px',
        fontSize: '7px',
        paddingTop: '3px',
        borderTop: '1px dashed #000'
      }}>
        <span style={{ fontWeight: 'bold' }}>Amount in Words:</span> {numberToWords(dueAmount)} Only
      </div>

      {/* Change Given (for Cash payments with excess) */}
      {bill.paymentMode === 'Cash' && Number(bill.cashReceived) > roundedTotal && (
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          fontSize: '10px',
          marginTop: '3px',
          paddingTop: '3px',
          borderTop: '1px dotted #ccc'
        }}>
            <span>Change Given</span>
            <span style={{ fontFamily: '"Geist Mono", monospace' }}>
              ₹{(roundedTotal - Number(bill.cashReceived))}
            </span>
          </div>
      )}

       {/* Payment Method */}
       <div style={{
         marginTop: '8px',
         fontSize: '10px',
         textAlign: 'center',
         padding: '4px',
         backgroundColor: '#f0f0f0'
       }}>
         <span style={{ fontWeight: 'bold' }}>Payment:</span> {getPaymentMethod()}
       </div>

       {/* Status Stamp */}
       {status && (
         <div style={{
           textAlign: 'center',
           marginTop: '10px',
           padding: '6px 0'
         }}>
           <span style={{
             fontSize: '14px',
             fontWeight: 'bold',
             color: 
               status === 'PAID' ? '#28a745' : 
               status === 'DUE' ? '#fd7e14' : 
               '#dc3545',
             border: `2px solid ${
               status === 'PAID' ? '#28a745' : 
               status === 'DUE' ? '#fd7e14' : 
               '#dc3545'
             }`,
             padding: '3px 10px',
             borderRadius: '3px',
             transform: 'rotate(-5deg)',
             display: 'inline-block'
           }}>
             {status}
           </span>
         </div>
       )}

       {/* Footer */}
       <div style={{
         marginTop: '12px',
         paddingTop: '6px',
         borderTop: '1px dashed #000',
         textAlign: 'center',
         fontSize: '9px',
         fontWeight: 'bold'
       }}>
         Thank You... Visit Again!
       </div>
    </div>
  );
}