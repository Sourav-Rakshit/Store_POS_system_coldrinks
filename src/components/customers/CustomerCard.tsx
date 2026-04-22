'use client';

import { useState } from 'react';
import { User, Phone, Edit, Trash2, DollarSign } from 'lucide-react';
import { CustomerWithStats } from '@/types';
import { formatCurrency } from '@/lib/utils';
import { CUSTOMER_TYPES, getBalanceStatus } from '@/lib/constants/customerConstants';
import { ManageDueModal } from './ManageDueModal';

interface CustomerCardProps {
  customer: CustomerWithStats;
  onEdit?: (customer: CustomerWithStats) => void;
  onDelete?: (customer: CustomerWithStats) => void;
  onClick?: (customer: CustomerWithStats) => void;
}

export function CustomerCard({ customer, onEdit, onDelete, onClick }: CustomerCardProps) {
  const [showManageDue, setShowManageDue] = useState(false);
  const typeConfig = CUSTOMER_TYPES[customer.customerType] || CUSTOMER_TYPES.regular;
  const balanceStatus = getBalanceStatus(customer.outstandingBalance);
  
  const balanceColor = {
    clear: 'text-green-600',
    has_balance: 'text-amber-600',
  }[balanceStatus];
  
  return (
    <div 
      className={`bg-white rounded-xl border border-slate-200 p-4 hover:shadow-md transition-shadow ${
        onClick ? 'cursor-pointer' : ''
      }`}
      onClick={() => onClick?.(customer)}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
            <User className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="font-bold text-sm">{customer.name}</h3>
            <p className="text-xs text-slate-500 flex items-center gap-1">
              <Phone className="w-3 h-3" />
              {customer.phone || 'No phone'}
            </p>
          </div>
        </div>
        
        <span className={`text-xs px-2 py-1 rounded-full font-bold border ${typeConfig.badgeColor}`}>
          {typeConfig.label}
        </span>
      </div>
      
      <div className="space-y-2">
        <div>
                      <p className="text-xs text-slate-500">Total puchase</p>
                      <p className="text-lg font-bold text-green-600">{formatCurrency(customer.totalPaid)}</p>
                    </div>
        
        <div className="flex justify-between items-center">
          <span className="text-xs text-slate-500">Outstanding</span>
          <span className={`text-sm font-bold ${balanceColor}`}>
            {formatCurrency(customer.outstandingBalance)}
          </span>
        </div>
        
        {customer.totalBills > 0 && (
          <div className="flex justify-between items-center">
            <span className="text-xs text-slate-500">Bills</span>
            <span className="text-sm font-bold">{customer.totalBills}</span>
          </div>
        )}
      </div>
      
      {(onEdit || onDelete || true) && (
        <div className="flex gap-2 mt-4 pt-3 border-t border-slate-100">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowManageDue(true);
            }}
            className="flex-1 flex items-center justify-center gap-1 px-3 py-2 text-xs font-medium text-green-600 bg-green-50 hover:bg-green-100 rounded-lg border border-green-200"
          >
            <DollarSign className="w-3 h-3" />
            Manage Due
          </button>
          {onEdit && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onEdit(customer);
              }}
              className="flex-1 flex items-center justify-center gap-1 px-3 py-2 text-xs font-medium text-slate-600 bg-slate-50 hover:bg-slate-100 rounded-lg"
            >
              <Edit className="w-3 h-3" />
              Edit
            </button>
          )}
          {onDelete && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete(customer);
              }}
              className="flex-1 flex items-center justify-center gap-1 px-3 py-2 text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-lg"
            >
              <Trash2 className="w-3 h-3" />
              Delete
            </button>
          )}
        </div>
      )}

      {/* Manage Due Modal */}
      {showManageDue && (
        <ManageDueModal
          customerId={customer.id}
          currentBalance={customer.outstandingBalance}
          customerName={customer.name}
          onClose={() => setShowManageDue(false)}
          onSuccess={() => {
            // Customer store will automatically update via cache invalidation
          }}
        />
      )}
    </div>
  );
}
