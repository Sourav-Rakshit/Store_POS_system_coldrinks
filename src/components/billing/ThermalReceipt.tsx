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
  
  // Format date and time
  const billDate = bill.createdAt ? new Date(bill.createdAt) : new Date();
  
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
        minHeight: '420px',
        margin: '0 auto',
        backgroundColor: '#ffffff',
        fontFamily: '"Courier New", Courier, monospace',
        fontSize: '9px',
        color: '#000000',
        padding: '0',
        boxSizing: 'border-box',
      }}
    >
      {/* Header with padding */}
      <div style={{
        padding: '6px 8px',
        borderBottom: '1px dashed #000',
      }}>
        <div style={{
          fontSize: '14px',
          fontWeight: 'bold',
          marginBottom: '2px',
        }}>
          {(settings.shopName || 'MY SHOP').toUpperCase()}
        </div>
        <div style={{
          fontSize: '8px',
          color: '#666',
        }}>
          {settings.shopAddress || 'Shop Address'}
        </div>
        <div style={{
          fontSize: '8px',
          color: '#666',
          marginTop: '1px',
        }}>
          Ph: {settings.shopPhone || '9876543210'}
        </div>
      </div>

      {/* Bill Info */}
      <div style={{
        padding: '4px 8px',
        fontSize: '8px',
      }}>
        <div>INV: {bill.invoiceNumber}</div>
        <div>DATE: {dateStr} | TIME: {timeStr}</div>
      </div>

      {/* Customer Type & Info with padding and bottom border */}
      <div style={{
        padding: '4px 8px',
        borderBottom: '1px dashed #000',
      }}>
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

      {/* Items Header with padding */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '70px 15px 20px 15px',
        gap: '1px',
        fontSize: '7px',
        fontWeight: 'bold',
        backgroundColor: '#f5f5f5',
        padding: '3px 0',
      }}>
        <span style={{ textAlign: 'center' }}>Item</span>
        <span style={{ textAlign: 'center' }}>Qty</span>
        <span style={{ textAlign: 'right' }}>Rate</span>
        <span style={{ textAlign: 'right' }}>Amount</span>
      </div>

      {/* Items with consistent padding */}
      {billItems.map((item, index) => (
        <div
          key={index}
          style={{
            display: 'grid',
            gridTemplateColumns: '70px 15px 20px 15px',
            gap: '1px',
            fontSize: '7px',
            padding: '2px 0',
            backgroundColor: index % 2 === 0 ? '#fafafa' : '#ffffff',
          }}
        >
          <span style={{
            textAlign: 'center',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            padding: '0 2px',
          }}>
            {item.productName}
          </span>
          <span style={{
            textAlign: 'center',
            padding: '0 1px',
          }}>
            {item.quantity}
          </span>
          <span style={{
            textAlign: 'right',
            padding: '0 2px',
          }}>
            ₹{Number(item.unitPrice).toFixed(2)}
          </span>
          <span style={{
            textAlign: 'right',
            padding: '0 2px',
          }}>
            ₹{Number(item.totalPrice).toFixed(2)}
          </span>
        </div>
      ))}

      {/* Return Items Section */}
      {showReturnSection && (
        <>
          <div style={{
            padding: '4px 8px',
            borderTop: '1px dashed #000',
            borderBottom: '1px dashed #000',
            backgroundColor: '#fff5f5',
          }}>
            <div style={{
              fontSize: '8px',
              fontWeight: 'bold',
              color: '#cc0000',
              marginBottom: '3px',
            }}>
              RETURNED ITEMS:
            </div>
            {returnedItems.map((item, index) => (
              <div
                key={index}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '70px 15px 20px 15px',
                  gap: '1px',
                  fontSize: '7px',
                  marginBottom: '2px',
                  padding: '1px 0',
                  color: '#cc0000',
                }}
              >
                <span style={{
                  textAlign: 'center',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  padding: '0 2px',
                }}>
                  {item.productName} {item.sizeName}
                </span>
                <span style={{ textAlign: 'center', padding: '0 1px' }}>
                  {formatQty(item.quantity, item.packaging)}
                </span>
                <span style={{ textAlign: 'right', padding: '0 2px' }}>
                  ₹{Number(item.totalPrice).toFixed(2)}
                </span>
              </div>
            ))}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: '8px',
              fontWeight: 'bold',
              marginTop: '4px',
            }}>
              <span>Refund Amount:</span>
              <span>₹{refundAmount.toFixed(2)}</span>
            </div>
          </div>
        </>
      )}

      {/* Totals Section */}
      <div style={{
        padding: '4px 8px',
      }}>
        {/* Sub Total */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          fontSize: '8px',
          padding: '2px 0',
        }}>
          <span>Item Total</span>
          <span>₹{itemTotal.toFixed(2)}</span>
        </div>

        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          fontSize: '8px',
          padding: '2px 0',
        }}>
          <span>Sub Total</span>
          <span>₹{itemTotal.toFixed(2)}</span>
        </div>

        {/* Round Off */}
         {roundOff !== 0 && (
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: '8px',
              padding: '2px 0',
            }}>
              <span>Round Off</span>
              <span>₹{roundOff.toFixed(2)}</span>
            </div>
          )}

        {/* Grand Total */}
        <div style={{
          borderTop: '1px solid #000',
          borderBottom: '1px solid #000',
          padding: '4px 0',
          marginTop: '4px',
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: '9px',
            fontWeight: 'bold',
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
            fontSize: '8px',
            padding: '2px 0',
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
            fontSize: '9px',
            fontWeight: 'bold',
            color: '#cc0000',
            padding: '2px 0',
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
            fontSize: '9px',
            fontWeight: 'bold',
            marginTop: '4px',
            padding: '3px',
            backgroundColor: '#f0f0f0',
            border: '1px solid #ccc',
          }}>
            <span>FINAL AMOUNT</span>
            <span>₹{dueAmount.toFixed(2)}</span>
          </div>
        )}
      </div>

      {/* Amount in Words */}
      <div style={{
        padding: '3px 8px',
        fontSize: '8px',
        borderTop: '1px dashed #000',
      }}>
        <span style={{ fontWeight: 'bold' }}>Amount in Words:</span> {numberToWords(dueAmount)} Only
      </div>

      {/* Change Given */}
      {bill.paymentMode === 'Cash' && Number(bill.cashReceived) > roundedTotal && (
        <div style={{
          padding: '3px 8px',
          fontSize: '8px',
          borderTop: '1px dotted #ccc',
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
          }}>
            <span>Change Given</span>
            <span style={{ fontFamily: '"Geist Mono", monospace' }}>
              ₹{(roundedTotal - Number(bill.cashReceived))}
            </span>
          </div>
        </div>
      )}

      {/* Payment Method */}
      <div style={{
        marginTop: '6px',
        padding: '4px 8px',
        fontSize: '8px',
        textAlign: 'center',
        backgroundColor: '#f0f0f0',
        borderTop: '1px solid #000',
      }}>
        <span style={{ fontWeight: 'bold' }}>Payment:</span> {getPaymentMethod()}
      </div>

      {/* Status Stamp */}
      {status && (
        <div style={{
          textAlign: 'center',
          margin: '6px 0',
          padding: '4px 0',
        }}>
          <span style={{
            fontSize: '12px',
            fontWeight: 'bold',
            color: 
              status === 'PAID' ? '#28a745' : 
              status === 'DUE' ? '#fd7e14' : 
              '#dc3545',
            border: `1px solid ${
              status === 'PAID' ? '#28a745' : 
              status === 'DUE' ? '#fd7e14' : 
              '#dc3545'
            }`,
            padding: '3px 8px',
            borderRadius: '3px',
            transform: 'rotate(-5deg)',
            display: 'inline-block',
          }}>
            {status}
          </span>
        </div>
      )}

      {/* Footer */}
      <div style={{
        marginTop: '8px',
        padding: '6px 8px',
        borderTop: '1px dashed #000',
        textAlign: 'center',
        fontSize: '8px',
        fontWeight: 'bold',
      }}>
        Thank You... Visit Again!
      </div>
    </div>
  );
}