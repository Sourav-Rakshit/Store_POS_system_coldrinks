'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useCustomerStore } from '@/store/useCustomerStore';
import { useToast } from '@/components/Toast';
import { Search, Plus, Users, BarChart3, Home } from 'lucide-react';
import { CustomerWithStats } from '@/types';
import { CustomerStats } from '@/components/customers/CustomerStats';
import { CustomerCard } from '@/components/customers/CustomerCard';
import { CustomerExport } from '@/components/customers/CustomerExport';
import { CustomerReports } from '@/components/customers/CustomerReports';
import { CustomerDetailModal } from '@/components/customers/CustomerDetailModal';
import { QuickAddCustomerModal } from '@/components/customers/QuickAddCustomerModal';
import { CUSTOMER_TYPES, getBalanceStatus, BalanceStatus } from '@/lib/constants/customerConstants';

type Tab = 'list' | 'reports';

type FilterType = 'all' | 'regular' | 'wholesale' | 'vip';
type BalanceFilter = 'all' | 'clear' | 'has_balance' | 'over_limit';

export default function CustomersPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>('list');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<FilterType>('all');
  const [balanceFilter, setBalanceFilter] = useState<BalanceFilter>('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerWithStats | null>(null);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  
  const { customers, initialize, isLoading, deleteCustomer } = useCustomerStore();
  const { addToast } = useToast();
  
  useEffect(() => {
    initialize();
  }, [initialize]);
  
  // Filter customers
  const filteredCustomers = customers.filter((customer) => {
    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      if (!customer.name.toLowerCase().includes(query) && 
          !customer.phone?.includes(query)) {
        return false;
      }
    }
    
    // Type filter
    if (filterType !== 'all' && customer.customerType !== filterType) {
      return false;
    }
    
    // Balance filter
    if (balanceFilter !== 'all') {
      const status = getBalanceStatus(customer.outstandingBalance);
      if (status !== balanceFilter) {
        return false;
      }
    }
    
    return true;
  });
  
  const handleDelete = async (customer: CustomerWithStats) => {
    if (!confirm(`Are you sure you want to delete ${customer.name}?`)) {
      return;
    }
    
    try {
      await deleteCustomer(customer.id);
      addToast('success', 'Customer deleted successfully');
    } catch (error) {
      addToast('error', 'Failed to delete customer');
    }
  };
  
  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {/* Back/Home buttons for mobile */}
          <div className="flex gap-1 lg:hidden">
            <button
              onClick={() => router.back()}
              className="p-2 hover:bg-slate-100 rounded-lg"
              title="Go Back"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m12 19-7-7 7-7"/><path d="M19 12H5"/></svg>
            </button>
            <button
              onClick={() => router.push('/dashboard')}
              className="p-2 hover:bg-slate-100 rounded-lg"
              title="Go Home"
            >
              <Home className="w-5 h-5 text-slate-600" />
            </button>
          </div>
          <div>
            <h1 className="text-2xl font-bold">Customers</h1>
            <p className="text-slate-500 text-sm">Manage your customer database</p>
          </div>
        </div>
      </div>
      
      {/* Tabs */}
      <div className="flex border-b border-slate-200">
        <button
          onClick={() => setActiveTab('list')}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-medium ${
            activeTab === 'list'
              ? 'text-primary border-b-2 border-primary'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <Users className="w-4 h-4" />
          Customers List
        </button>
        <button
          onClick={() => setActiveTab('reports')}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-medium ${
            activeTab === 'reports'
              ? 'text-primary border-b-2 border-primary'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          Reports
        </button>
      </div>
      
      {/* List Tab */}
      {activeTab === 'list' && (
        <div className="space-y-4">
          {/* Stats */}
          <CustomerStats customers={customers} />
          
          {/* Toolbar */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            {/* Search and Filters */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search customers..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm w-64"
                />
              </div>
              
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value as FilterType)}
                className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm"
              >
                <option value="all">All Types</option>
                <option value="regular">Regular</option>
                <option value="wholesale">Wholesale</option>
                <option value="vip">VIP</option>
              </select>
              
              <select
                value={balanceFilter}
                onChange={(e) => setBalanceFilter(e.target.value as BalanceFilter)}
                className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm"
              >
                <option value="all">All Balances</option>
                <option value="clear">Clear</option>
                <option value="has_balance">Has Balance</option>
                <option value="over_limit">Over Limit</option>
              </select>
            </div>
            
            {/* Actions */}
            <div className="flex items-center gap-3">
              <CustomerExport customers={customers} />
              <button
                onClick={() => setShowAddModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90"
              >
                <Plus className="w-4 h-4" />
                Add Customer
              </button>
            </div>
          </div>
          
          {/* Customer Grid */}
          {isLoading ? (
            <div className="text-center py-12 text-slate-500">Loading customers...</div>
          ) : filteredCustomers.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredCustomers.map((customer) => (
                <CustomerCard
                  key={customer.id}
                  customer={customer}
                  onClick={setSelectedCustomer}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-12 bg-white rounded-xl border border-slate-200">
              <Users className="w-12 h-12 mx-auto text-slate-300 mb-4" />
              <p className="text-slate-500 mb-4">No customers found</p>
              <button
                onClick={() => setShowAddModal(true)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90"
              >
                <Plus className="w-4 h-4" />
                Add Your First Customer
              </button>
            </div>
          )}
        </div>
      )}
      
      {/* Reports Tab */}
      {activeTab === 'reports' && (
        <div className="space-y-4">
          {/* Date Range */}
          <div className="flex items-center gap-4 bg-white p-4 rounded-xl border border-slate-200">
            <span className="text-sm font-medium text-slate-600">Date Range:</span>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="px-3 py-2 border border-slate-200 rounded-lg text-sm"
            />
            <span className="text-slate-400">to</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="px-3 py-2 border border-slate-200 rounded-lg text-sm"
            />
          </div>
          
          <CustomerReports dateFrom={dateFrom || undefined} dateTo={dateTo || undefined} />
        </div>
      )}
      
      {/* Modals */}
      {showAddModal && (
        <QuickAddCustomerModal
          isOpen={showAddModal}
          onClose={() => setShowAddModal(false)}
          onSuccess={(customer) => {
            setSelectedCustomer(customer);
            setShowAddModal(false);
            addToast('success', 'Customer created successfully');
          }}
        />
      )}
      
      {selectedCustomer && (
        <CustomerDetailModal
          customer={selectedCustomer}
          isOpen={!!selectedCustomer}
          onClose={() => setSelectedCustomer(null)}
          onRecordPayment={async (id, data) => {
            // Handle payment recording
          }}
        />
      )}
    </div>
  );
}
