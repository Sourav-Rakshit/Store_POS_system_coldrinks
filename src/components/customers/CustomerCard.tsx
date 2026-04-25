'use client';

import { Phone, ChevronRight } from 'lucide-react';
import { CustomerWithStats } from '@/types';
import { formatCurrency } from '@/lib/utils';
import { CUSTOMER_TYPES, getBalanceStatus } from '@/lib/constants/customerConstants';

interface CustomerCardProps {
  customer: CustomerWithStats;
  onEdit?: (customer: CustomerWithStats) => void;
  onDelete?: (customer: CustomerWithStats) => void;
  onClick?: (customer: CustomerWithStats) => void;
}

export function CustomerCard({ customer, onClick }: CustomerCardProps) {
  const typeConfig = CUSTOMER_TYPES[customer.customerType] || CUSTOMER_TYPES.regular;
  const balanceStatus = getBalanceStatus(customer.outstandingBalance);
  
  const balanceColor = {
    clear: 'text-green-600',
    has_balance: 'text-amber-600',
  }[balanceStatus];

  const getInitials = (name: string) => {
    return name ? name.charAt(0).toUpperCase() : 'C';
  };
  
  return (
    <div 
      className={`bg-white p-4 border-b border-slate-100 flex items-center justify-between hover:bg-slate-50 transition-colors ${
        onClick ? 'cursor-pointer' : ''
      }`}
      onClick={() => onClick?.(customer)}
    >
      <div className="flex items-center gap-3">
        <div className="size-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold shrink-0">
          {getInitials(customer.name)}
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-sm text-slate-900">{customer.name}</h3>
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold border ${typeConfig.badgeColor}`}>
              {typeConfig.label}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">{customer.phone || 'No phone'}</p>
        </div>
      </div>
      
      <div className="flex items-center gap-3 text-right">
        <div>
           <p className={`text-sm font-bold ${balanceColor}`}>
             {formatCurrency(customer.outstandingBalance)}
           </p>
           <p className="text-[10px] text-slate-400">Balance</p>
        </div>
        <ChevronRight className="w-5 h-5 text-slate-300" />
      </div>
    </div>
  );
}
