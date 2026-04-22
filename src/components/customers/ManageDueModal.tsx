'use client';

import { useState, useEffect } from 'react';
import { X, Loader2, DollarSign, CreditCard } from 'lucide-react';
import { useCustomerStore } from '@/store/useCustomerStore';
import { useToast } from '@/components/Toast';
import { PaymentMode } from '@/types';
import { formatCurrency } from '@/lib/utils';

interface ManageDueModalProps {
  customerId: string;
  currentBalance: number;
  customerName: string;
  onClose: () => void;
  onSuccess: () => void;
}

type Tab = 'payment' | 'due';

export function ManageDueModal({
  customerId,
  currentBalance,
  customerName,
  onClose,
  onSuccess,
}: ManageDueModalProps) {
  const [activeTab, setActiveTab] = useState<Tab>('payment');
  const [amount, setAmount] = useState('');
  const [paymentMode, setPaymentMode] = useState<PaymentMode>('Cash');
  const [note, setNote] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  
  const { recordPayment } = useCustomerStore();
  const { addToast } = useToast();
  
  const amountNum = parseFloat(amount) || 0;
  
  // Calculate new balance based on tab
  const newBalance = activeTab === 'payment' 
    ? Math.max(0, currentBalance - amountNum)
    : currentBalance + amountNum;
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (amountNum <= 0) {
      setError('Please enter a valid amount');
      return;
    }
    
    if (activeTab === 'payment' && amountNum > currentBalance) {
      setError('Payment amount cannot exceed outstanding balance');
      return;
    }
    
    setIsLoading(true);
    try {
      await recordPayment(customerId, {
        amount: amountNum,
        paymentMode,
        type: activeTab === 'payment' ? 'payment' : 'credit',
        note: note.trim() || undefined,
      });
      
      addToast('success', activeTab === 'payment' ? 'Payment recorded successfully' : 'Due added successfully');
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to process');
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-200">
          <div>
            <h2 className="text-lg font-bold">Manage Due</h2>
            <p className="text-sm text-slate-500">{customerName}</p>
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
            onClick={() => setActiveTab('payment')}
            className={`flex-1 py-3 text-sm font-medium flex items-center justify-center gap-2 ${
              activeTab === 'payment'
                ? 'text-primary border-b-2 border-primary'
                : 'text-slate-500'
            }`}
          >
            <DollarSign className="w-4 h-4" />
            Record Payment
          </button>
          <button
            onClick={() => setActiveTab('due')}
            className={`flex-1 py-3 text-sm font-medium flex items-center justify-center gap-2 ${
              activeTab === 'due'
                ? 'text-primary border-b-2 border-primary'
                : 'text-slate-500'
            }`}
          >
            <CreditCard className="w-4 h-4" />
            Add Due
          </button>
        </div>
        
        {/* Content */}
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 text-red-700 text-sm rounded-lg">
              {error}
            </div>
          )}
          
          {/* Current Balance */}
          <div className="bg-slate-50 rounded-lg p-4 text-center">
            <p className="text-xs text-slate-500 mb-1">Current Outstanding Balance</p>
            <p className="text-2xl font-bold text-amber-600">
              {formatCurrency(currentBalance)}
            </p>
          </div>
          
          {/* Amount */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Amount <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Enter amount"
              className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-slate-50 text-sm"
              step="0.01"
              min="0"
              autoFocus
            />
            {amountNum > 0 && (
              <div className="mt-2 p-2 bg-slate-50 rounded text-sm">
                <p className="text-slate-500">New Balance After:</p>
                <p className={`font-bold ${newBalance > currentBalance ? 'text-red-600' : 'text-green-600'}`}>
                  {formatCurrency(newBalance)}
                </p>
              </div>
            )}
          </div>
          
          {/* Payment Mode */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Payment Mode
            </label>
            <select
              value={paymentMode}
              onChange={(e) => setPaymentMode(e.target.value as PaymentMode)}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-slate-50 text-sm"
            >
              <option value="Cash">Cash</option>
              <option value="UPI">UPI</option>
              <option value="Card">Card</option>
            </select>
          </div>
          
          {/* Note */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              {activeTab === 'payment' ? 'Note (optional)' : 'Reason (optional)'}
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={activeTab === 'payment' ? 'Add a note...' : 'e.g., Previous balance, Adjustment'}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-slate-50 text-sm"
              rows={2}
            />
          </div>
          
          {/* Buttons */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-slate-200 rounded-lg text-sm font-medium hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading || amountNum <= 0}
              className="flex-1 px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
              {activeTab === 'payment' ? 'Record Payment' : 'Add Due'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
