'use client';

import { useState, useEffect } from 'react';
import { X, User, Phone, Mail, MapPin, CreditCard, Receipt, DollarSign, Loader2, Package, Calendar } from 'lucide-react';
import { CustomerWithStats, CustomerPayment, Bill } from '@/types';
import { formatCurrency } from '@/lib/utils';
import { CUSTOMER_TYPES, getBalanceStatus } from '@/lib/constants/customerConstants';
import { ManageDueModal } from './ManageDueModal';

interface CustomerDetailModalProps {
  customer: CustomerWithStats;
  isOpen: boolean;
  onClose: () => void;
  onUpdate?: (id: string, data: any) => Promise<void>;
  onRecordPayment?: (customerId: string, payment: any) => Promise<void>;
}

type Tab = 'overview' | 'payments' | 'bills';

export function CustomerDetailModal({
  customer,
  isOpen,
  onClose,
  onUpdate,
  onRecordPayment,
}: CustomerDetailModalProps) {
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [isLoading, setIsLoading] = useState(false);
  const [showManageDue, setShowManageDue] = useState(false);
  const [customerData, setCustomerData] = useState<CustomerWithStats>(customer);
  const [payments, setPayments] = useState<CustomerPayment[]>([]);
  const [bills, setBills] = useState<Bill[]>([]);
  
  // Fetch full customer data when opened
  useEffect(() => {
    if (isOpen && customer?.id) {
      fetchCustomerData();
    }
  }, [isOpen, customer?.id]);
  
  const fetchCustomerData = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/customers/${customer.id}`);
      if (response.ok) {
        const data = await response.json();
        setCustomerData(data);
        setPayments(data.payments || []);
        setBills(data.bills || []);
      }
    } catch (error) {
      console.error('Error fetching customer data:', error);
    } finally {
      setIsLoading(false);
    }
  };
  
  const typeConfig = CUSTOMER_TYPES[customerData.customerType] || CUSTOMER_TYPES.regular;
  const balanceStatus = getBalanceStatus(customerData.outstandingBalance);
  
  const balanceColor = {
    clear: 'text-green-600',
    has_balance: 'text-amber-600',
  }[balanceStatus];
  
  const handlePaymentRecorded = () => {
    fetchCustomerData();
    setShowManageDue(false);
  };
  
  // Separate bills into sales and orders
  const salesBills = bills.filter(b => b.billType === 'sale' || !b.billType);
  const orderBills = bills.filter(b => b.billType === 'order');
  
  // Get status color for bill
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return 'bg-green-100 text-green-700';
      case 'partially_paid': return 'bg-amber-100 text-amber-700';
      case 'pending': return 'bg-red-100 text-red-700';
      case 'cancelled': return 'bg-slate-100 text-slate-700';
      default: return 'bg-slate-100 text-slate-700';
    }
  };
  
  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'paid': return 'Paid';
      case 'partially_paid': return 'Partial';
      case 'pending': return 'Due';
      case 'cancelled': return 'Cancelled';
      default: return status;
    }
  };
  
  if (!isOpen) return null;
  
  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        <div className="absolute inset-0 bg-black/50" onClick={onClose} />
        <div className="relative bg-white rounded-xl shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-hidden flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-slate-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                <User className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h2 className="text-lg font-bold">{customerData.name}</h2>
                <span className={`text-xs px-2 py-0.5 rounded-full font-bold border ${typeConfig.badgeColor}`}>
                  {typeConfig.label}
                </span>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1 hover:bg-slate-100 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          
          {/* Tabs */}
          <div className="flex border-b border-slate-200">
            <button
              onClick={() => setActiveTab('overview')}
              className={`flex-1 py-3 text-sm font-medium ${
                activeTab === 'overview'
                  ? 'text-primary border-b-2 border-primary'
                  : 'text-slate-500'
              }`}
            >
              Overview
            </button>
            <button
              onClick={() => setActiveTab('payments')}
              className={`flex-1 py-3 text-sm font-medium ${
                activeTab === 'payments'
                  ? 'text-primary border-b-2 border-primary'
                  : 'text-slate-500'
              }`}
            >
              Payments
            </button>
            <button
              onClick={() => setActiveTab('bills')}
              className={`flex-1 py-3 text-sm font-medium ${
                activeTab === 'bills'
                  ? 'text-primary border-b-2 border-primary'
                  : 'text-slate-500'
              }`}
            >
              Sales & Orders
            </button>
          </div>
          
          {/* Content */}
          <div className="flex-1 overflow-auto p-4">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : activeTab === 'overview' ? (
              <div className="space-y-4">
                {/* Financial Summary */}
                <div className="bg-slate-50 rounded-xl p-4">
                  <h3 className="text-sm font-bold text-slate-600 mb-3">Financial Summary</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-slate-500">Total Purchases</p>
                      <p className="text-lg font-bold">{formatCurrency(customerData.totalPurchases)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Total Paid</p>
                      <p className="text-lg font-bold text-green-600">{formatCurrency(customerData.totalPaid)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Outstanding Balance</p>
                      <p className={`text-lg font-bold ${balanceColor}`}>
                        {formatCurrency(customerData.outstandingBalance)}
                      </p>
                    </div>

                  </div>
                </div>
                
                {/* Contact Info */}
                <div>
                  <h3 className="text-sm font-bold text-slate-600 mb-3">Contact Information</h3>
                  <div className="space-y-2">
                    {customerData.phone && (
                      <div className="flex items-center gap-2 text-sm">
                        <Phone className="w-4 h-4 text-slate-400" />
                        <span>{customerData.phone}</span>
                      </div>
                    )}
                    {customerData.email && (
                      <div className="flex items-center gap-2 text-sm">
                        <Mail className="w-4 h-4 text-slate-400" />
                        <span>{customerData.email}</span>
                      </div>
                    )}
                    {customerData.address && (
                      <div className="flex items-center gap-2 text-sm">
                        <MapPin className="w-4 h-4 text-slate-400" />
                        <span>{customerData.address}</span>
                      </div>
                    )}
                    {!customerData.phone && !customerData.email && !customerData.address && (
                      <p className="text-sm text-slate-400">No contact information</p>
                    )}
                  </div>
                </div>
                
                {/* Manage Due Button */}
                {customerData.outstandingBalance > 0 && (
                  <button
                    onClick={() => setShowManageDue(true)}
                    className="w-full py-3 bg-primary text-white rounded-lg font-medium flex items-center justify-center gap-2"
                  >
                    <DollarSign className="w-4 h-4" />
                    Record Payment
                  </button>
                )}
              </div>
            ) : activeTab === 'payments' ? (
              <div className="space-y-2">
                {payments.length > 0 ? (
                  payments.map((payment) => (
                    <div
                      key={payment.id}
                      className="flex items-center justify-between p-3 bg-slate-50 rounded-lg"
                    >
                      <div>
                        <p className="text-sm font-medium">
                          {payment.type === 'payment' && 'Payment Received'}
                          {payment.type === 'refund' && 'Refund Issued'}
                          {payment.type === 'credit' && 'Credit Added'}
                        </p>
                        <p className="text-xs text-slate-500">
                          {payment.paymentMode} • {new Date(payment.createdAt).toLocaleDateString('en-IN')}
                        </p>
                        {payment.note && (
                          <p className="text-xs text-slate-400 mt-1">{payment.note}</p>
                        )}
                      </div>
                      <span className={`text-sm font-bold ${
                        payment.type === 'payment' ? 'text-green-600' :
                        payment.type === 'refund' ? 'text-orange-600' :
                        'text-red-600'
                      }`}>
                        {payment.type === 'payment' ? '+' : payment.type === 'refund' ? '+' : '-'}
                        {formatCurrency(payment.amount)}
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="text-center text-slate-400 py-8">No payment history</p>
                )}
              </div>
            ) : (
              <div className="space-y-6">
                {/* Sales Section */}
                <div>
                  <h3 className="text-sm font-bold text-slate-600 mb-3 flex items-center gap-2">
                    <Receipt className="w-4 h-4" />
                    Sales History ({salesBills.length})
                  </h3>
                  <div className="space-y-2">
                    {salesBills.length > 0 ? (
                      salesBills.map((bill) => (
                        <div
                          key={bill.id}
                          className="flex items-center justify-between p-3 bg-slate-50 rounded-lg"
                        >
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-medium">{bill.invoiceNumber}</p>
                              <span className={`text-[10px] px-2 py-0.5 rounded-full ${getStatusColor(bill.status)}`}>
                                {getStatusLabel(bill.status)}
                              </span>
                            </div>
                            <p className="text-xs text-slate-500">
                              {new Date(bill.createdAt).toLocaleDateString('en-IN')} • {bill.paymentMode}
                            </p>
                            {bill.items && bill.items.length > 0 && (
                              <p className="text-xs text-slate-400 mt-1">
                                {bill.items.length} item{bill.items.length > 1 ? 's' : ''}
                              </p>
                            )}
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-bold">{formatCurrency(bill.totalAmount)}</p>
                            {(bill.status === 'partially_paid' || bill.status === 'pending') && (
                              <p className="text-xs text-red-500">
                                Due: {formatCurrency(bill.outstandingAmount || 0)}
                              </p>
                            )}
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-center text-slate-400 py-4">No sales history</p>
                    )}
                  </div>
                </div>
                
                {/* Orders Section */}
                <div>
                  <h3 className="text-sm font-bold text-slate-600 mb-3 flex items-center gap-2">
                    <Package className="w-4 h-4" />
                    Orders ({orderBills.length})
                  </h3>
                  <div className="space-y-2">
                    {orderBills.length > 0 ? (
                      orderBills.map((bill) => (
                        <div
                          key={bill.id}
                          className="flex items-center justify-between p-3 bg-amber-50 rounded-lg"
                        >
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-medium">{bill.invoiceNumber}</p>
                              <span className={`text-[10px] px-2 py-0.5 rounded-full ${getStatusColor(bill.status)}`}>
                                {getStatusLabel(bill.status)}
                              </span>
                            </div>
                            <p className="text-xs text-slate-500">
                              {new Date(bill.createdAt).toLocaleDateString('en-IN')} • {bill.paymentMode}
                            </p>
                            {bill.deliveryDate && (
                              <p className="text-xs text-amber-600 mt-1 flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                Delivery: {new Date(bill.deliveryDate).toLocaleDateString('en-IN')}
                              </p>
                            )}
                            {bill.items && bill.items.length > 0 && (
                              <p className="text-xs text-slate-400 mt-1">
                                {bill.items.length} item{bill.items.length > 1 ? 's' : ''}
                              </p>
                            )}
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-bold">{formatCurrency(bill.totalAmount)}</p>
                            {(bill.cashReceived ?? 0) > 0 && (
                              <p className="text-xs text-green-600">
                                Paid: {formatCurrency(bill.cashReceived || 0)}
                              </p>
                            )}
                            {(bill.status === 'partially_paid' || bill.status === 'pending') && (
                              <p className="text-xs text-red-500">
                                Due: {formatCurrency(bill.outstandingAmount || 0)}
                              </p>
                            )}
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-center text-slate-400 py-4">No orders</p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Manage Due Modal */}
      {showManageDue && (
        <ManageDueModal
          customerId={customerData.id}
          currentBalance={customerData.outstandingBalance}
          customerName={customerData.name}
          onClose={() => setShowManageDue(false)}
          onSuccess={handlePaymentRecorded}
        />
      )}
    </>
  );
}
