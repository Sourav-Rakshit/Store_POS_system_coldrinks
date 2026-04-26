'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useCustomerStore } from '@/store/useCustomerStore';
import { useSettingsStore } from '@/store/useSettingsStore';
import { useToast } from '@/components/Toast';
import { Search, Plus, Users, BarChart3, Home, Menu } from 'lucide-react';
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
  const { ownerName } = useSettingsStore();
  const { addToast } = useToast();
  
  const getInitials = () => {
    if (ownerName) {
      return ownerName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    }
    return 'FF';
  };
  
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
    <div className="max-w-6xl mx-auto space-y-6 pb-24 lg:pb-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-3">
          {/* Hamburger menu for mobile */}
          <button
            onClick={() => {
              if (typeof window !== 'undefined') {
                window.dispatchEvent(new CustomEvent('toggle-sidebar'));
              }
            }}
            className="p-2 -ml-2 text-slate-600 hover:bg-slate-100 rounded-lg lg:hidden"
          >
            <Menu className="w-6 h-6" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 leading-none mb-1">Customers</h1>
            <p className="text-slate-500 text-xs sm:text-sm">Manage your customer database</p>
          </div>
        </div>
        
        {/* Avatar/profile icon */}
        <Link 
          href="/settings" 
          className="size-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-sm hover:bg-primary/20 transition-colors shrink-0"
        >
          {getInitials()}
        </Link>
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
          <div className="flex flex-col gap-3 mb-2">
            {/* Search */}
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search customers..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm w-full"
              />
            </div>
            
            {/* Filters Row */}
            <div className="flex items-center gap-2 w-full">
              <div className="grid grid-cols-2 gap-2 flex-1">
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value as FilterType)}
                  className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm w-full outline-none focus:ring-2 focus:ring-primary/20 transition-shadow"
                >
                  <option value="all">All Types</option>
                  <option value="regular">Regular</option>
                  <option value="wholesale">Wholesale</option>
                  <option value="vip">VIP</option>
                </select>
                
                <select
                  value={balanceFilter}
                  onChange={(e) => setBalanceFilter(e.target.value as BalanceFilter)}
                  className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm w-full outline-none focus:ring-2 focus:ring-primary/20 transition-shadow"
                >
                  <option value="all">All Balances</option>
                  <option value="clear">Clear</option>
                  <option value="has_balance">Has Balance</option>
                  <option value="over_limit">Over Limit</option>
                </select>
              </div>
              <div className="shrink-0 lg:hidden">
                <CustomerExport customers={customers} iconOnly={true} />
              </div>
              <div className="shrink-0 hidden lg:block">
                <CustomerExport customers={customers} />
              </div>
            </div>
            
            {/* Add Button */}
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center justify-center gap-2 w-full lg:w-auto h-[44px] bg-primary text-white rounded-full text-sm font-semibold hover:bg-primary/90 mt-1 shadow-sm transition-colors"
            >
              <Plus className="w-5 h-5" />
              Add Customer
            </button>
          </div>
          
          {/* Customer Grid */}
          {isLoading ? (
            <div className="text-center py-12 text-slate-500">Loading customers...</div>
          ) : filteredCustomers.length > 0 ? (
            <div className="flex flex-col md:grid md:grid-cols-2 lg:grid-cols-3 md:gap-4 bg-white md:bg-transparent rounded-xl md:rounded-none border border-slate-200 md:border-none overflow-hidden">
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
          onUpdate={async () => { await initialize(); }}
          onDelete={async () => { await initialize(); setSelectedCustomer(null); }}
          onRecordPayment={async (id, data) => {
            // Handle payment recording
          }}
        />
      )}
    </div>
  );
}
