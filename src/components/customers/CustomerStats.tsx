'use client';

import { Users, DollarSign, CreditCard, Star } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

interface CustomerStatsProps {
  customers: any[];
}

export function CustomerStats({ customers }: CustomerStatsProps) {
  const totalCustomers = customers.length;
  const totalOutstanding = customers.reduce((sum, c) => sum + (c.outstandingBalance || 0), 0);
  const totalRevenue = customers.reduce((sum, c) => sum + (c.totalPurchases || 0), 0);
  const vipCount = customers.filter(c => c.customerType === 'vip').length;
  
  const stats = [
    {
      label: 'Total Customers',
      value: totalCustomers,
      icon: Users,
      color: 'bg-blue-100 text-blue-600',
    },
    {
      label: 'Total Outstanding',
      value: formatCurrency(totalOutstanding),
      icon: DollarSign,
      color: 'bg-amber-100 text-amber-600',
    },
    {
      label: 'Total Revenue',
      value: formatCurrency(totalRevenue),
      icon: CreditCard,
      color: 'bg-green-100 text-green-600',
    },
    {
      label: 'VIP Customers',
      value: vipCount,
      icon: Star,
      color: 'bg-purple-100 text-purple-600',
    },
  ];
  
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat) => (
        <div
          key={stat.label}
          className="bg-white rounded-xl border border-slate-200 p-4"
        >
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${stat.color}`}>
              <stat.icon className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-slate-500">{stat.label}</p>
              <p className="text-lg font-bold">{stat.value}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
