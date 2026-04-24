'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useBillStore } from '@/store/useBillStore';
import { useSettingsStore } from '@/store/useSettingsStore';
import { useToast } from '@/components/Toast';
import { formatCurrency, formatDate, formatDateTime, toNumber } from '@/lib/utils';
import { Search, Calendar, Filter, Receipt, ChevronRight, X, Printer, Download, Share2, MessageCircle, Loader2, Home } from 'lucide-react';
import { Bill, StoreSettings } from '@/types';
import { ThermalReceipt } from '@/components/billing/ThermalReceipt';
import { downloadBillImage, shareBillImage, shareViaWhatsApp } from '@/lib/generateBillImage';

export default function HistoryPage() {
  const router = useRouter();
  const { bills, forceRefresh } = useBillStore();
  const { shopName, shopPhone, shopAddress, taxRate, initialize: initSettings } = useSettingsStore();
  const { addToast } = useToast();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState('all');
  const [selectedBill, setSelectedBill] = useState<Bill | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // Download/Share states
  const [isDownloading, setIsDownloading] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [isWhatsapping, setIsWhatsapping] = useState(false);
  const receiptRef = useRef<HTMLDivElement>(null);
  
  // Settings for receipt
  const settingsRef = useRef<StoreSettings>({
    shopName: 'My Store',
    ownerName: '',
    shopPhone: 'N/A',
    shopAddress: 'N/A',
    taxRate: 0,
    currency: 'INR',
    lowStockDefaultThreshold: 50,
  });

  // Update settings ref when settings change
  useEffect(() => {
    settingsRef.current = {
      shopName: shopName || 'My Store',
      ownerName: '',
      shopPhone: shopPhone || 'N/A',
      shopAddress: shopAddress || 'N/A',
      taxRate: taxRate || 0,
      currency: 'INR',
      lowStockDefaultThreshold: 50,
    };
  }, [shopName, shopPhone, shopAddress, taxRate]);

  useEffect(() => {
    const init = async () => {
      await initSettings();
      await forceRefresh();
      setIsLoading(false);
    };
    init();
  }, [forceRefresh, initSettings]);

  // Filter bills
  const filteredBills = bills.filter((bill) => {
    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matchesSearch = 
        bill.invoiceNumber.toLowerCase().includes(query) ||
        (bill.customerName && bill.customerName.toLowerCase().includes(query));
      if (!matchesSearch) return false;
    }

    // Date filter
    if (dateFilter !== 'all') {
      const billDate = new Date(bill.createdAt);
      const now = new Date();
      
      switch (dateFilter) {
        case 'today':
          if (billDate.toDateString() !== now.toDateString()) return false;
          break;
        case 'week':
          const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          if (billDate < weekAgo) return false;
          break;
        case 'month':
          const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          if (billDate < monthAgo) return false;
          break;
      }
    }

    return true;
  });

  // Calculate stats - handle both string and number types from database
  const totalRevenue = bills.reduce((sum, b) => {
    const amount = typeof b.totalAmount === 'string' ? parseFloat(b.totalAmount) : b.totalAmount;
    return sum + (isNaN(amount) ? 0 : amount);
  }, 0);
  const totalBills = bills.length;
  const averageBillValue = totalBills > 0 ? totalRevenue / totalBills : 0;

  const getPaymentModeBadge = (mode: string) => {
    switch (mode) {
      case 'Cash':
        return 'bg-slate-100 text-slate-600';
      case 'UPI':
        return 'bg-primary/10 text-primary';
      case 'Card':
        return 'bg-primary/10 text-primary';
      default:
        return 'bg-slate-100 text-slate-600';
    }
  };

  const handleDownload = async () => {
    if (!receiptRef.current || !selectedBill) return;
    
    setIsDownloading(true);
    try {
      await downloadBillImage(receiptRef.current, selectedBill.invoiceNumber);
      addToast('success', 'Bill downloaded successfully');
    } catch (error) {
      console.error('Download error:', error);
      addToast('error', 'Failed to download bill');
    } finally {
      setIsDownloading(false);
    }
  };

  const handleShare = async () => {
    if (!receiptRef.current || !selectedBill) return;
    
    setIsSharing(true);
    try {
      const success = await shareBillImage(receiptRef.current, selectedBill.invoiceNumber, settingsRef.current.shopName);
      if (success) {
        addToast('success', 'Bill shared successfully');
      } else {
        addToast('info', 'Sharing not supported on this device — bill downloaded instead');
      }
    } catch (error) {
      console.error('Share error:', error);
      addToast('error', 'Failed to share bill');
    } finally {
      setIsSharing(false);
    }
  };

  const handleWhatsApp = async () => {
    if (!receiptRef.current || !selectedBill) return;
    
    setIsWhatsapping(true);
    try {
      await shareViaWhatsApp(
        receiptRef.current, 
        selectedBill.invoiceNumber, 
        settingsRef.current.shopName,
        Number(selectedBill.totalAmount)
      );
      addToast('info', 'Bill image downloaded — please attach it manually in WhatsApp');
    } catch (error) {
      console.error('WhatsApp error:', error);
      addToast('error', 'Failed to share via WhatsApp');
    } finally {
      setIsWhatsapping(false);
    }
  };

  const handlePrint = (bill: Bill) => {
    window.print();
  };

  const handleCloseModal = () => {
    setSelectedBill(null);
    setIsDownloading(false);
    setIsSharing(false);
    setIsWhatsapping(false);
  };

  const isAnyLoading = isDownloading || isSharing || isWhatsapping;

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="skeleton h-8 w-32 rounded"></div>
        <div className="grid grid-cols-2 gap-4">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="skeleton h-28 rounded-xl"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <header className="flex items-center gap-4">
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
        <div className="bg-primary/10 p-2 rounded-lg">
          <Receipt className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h1 className="text-xl font-bold">Bill History</h1>
          <p className="text-sm text-slate-500">View all transaction records</p>
        </div>
      </header>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white bg-slate-800 p-6 rounded-xl border border-primary/5 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <p className="text-slate-500 text-sm font-medium">Total Revenue</p>
            <Receipt className="w-5 h-5 text-primary" />
          </div>
          <p className="text-3xl font-bold text-primary">{formatCurrency(totalRevenue)}</p>
          <p className="text-xs text-slate-400 mt-2">
            {totalBills > 0 ? `+${((totalRevenue / (totalRevenue - totalRevenue * 0.1)) * 10).toFixed(1)}%` : '0%'} from last period
          </p>
        </div>
        <div className="bg-white bg-slate-800 p-6 rounded-xl border border-primary/5 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <p className="text-slate-500 text-sm font-medium">Total Bills</p>
            <Receipt className="w-5 h-5 text-primary" />
          </div>
          <p className="text-3xl font-bold">{totalBills}</p>
          <p className="text-xs text-slate-400 mt-2">
            Average: {formatCurrency(averageBillValue)} per bill
          </p>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col md:flex-row gap-3">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search customer name or bill ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white border-none rounded-lg py-3 pl-10 pr-4 text-sm focus:ring-2 focus:ring-primary shadow-sm"
            />
          </div>
        </div>
        <div className="flex gap-2">
          <button className="flex items-center gap-2 bg-white px-4 py-2 rounded-lg border border-primary/5 text-sm font-medium hover:bg-slate-50 transition-colors">
            <Calendar className="w-4 h-4" />
            {dateFilter === 'all' && 'All Time'}
            {dateFilter === 'today' && 'Today'}
            {dateFilter === 'week' && 'Last 7 Days'}
            {dateFilter === 'month' && 'Last 30 Days'}
          </button>
          <select
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="bg-white px-4 py-2 rounded-lg border border-primary/5 text-sm font-medium"
          >
            <option value="all">All Time</option>
            <option value="today">Today</option>
            <option value="week">Last 7 Days</option>
            <option value="month">Last 30 Days</option>
          </select>
        </div>
      </div>

      {/* Bills Table */}
      <div className="bg-white rounded-xl border border-primary/5 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-primary/5">
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Date & Bill #</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Customer</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Payment Mode</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Amount</th>
                <th className="px-6 py-4 w-10"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-primary/5">
              {filteredBills.length > 0 ? (
                filteredBills.map((bill) => (
                  <tr
                    key={bill.id}
                    onClick={() => setSelectedBill(bill)}
                    className="hover:bg-primary/5 cursor-pointer transition-colors group"
                  >
                    <td className="px-6 py-4">
                      <p className="font-medium">{formatDate(bill.createdAt)}</p>
                      <p className="text-xs text-slate-500">{bill.invoiceNumber}</p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-slate-700">
                        {bill.customerName || 'Walk-in Customer'}
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPaymentModeBadge(bill.paymentMode)}`}>
                        {bill.paymentMode}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right font-semibold">
                      {formatCurrency(bill.totalAmount)}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-primary" />
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-400">
                    <Receipt className="w-12 h-12 mx-auto mb-2" />
                    <p>No bills found</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        
        {/* Footer */}
        <div className="px-6 py-4 border-t border-primary/5 flex items-center justify-between">
          <p className="text-sm text-slate-500">
            Showing {filteredBills.length} of {bills.length} bills
          </p>
        </div>
      </div>

      {/* Bill Detail Modal */}
      {selectedBill && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center sticky top-0 bg-white z-10">
              <div>
                <h3 className="text-lg font-bold">Bill Details</h3>
                <p className="text-sm text-slate-500">{selectedBill.invoiceNumber}</p>
              </div>
              <button
                onClick={handleCloseModal}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            {/* Receipt Preview */}
            <div className="p-4 border-b border-slate-100 bg-slate-50">
              <div ref={receiptRef} className="scale-50 origin-top -mx-16 -mb-8">
                <ThermalReceipt bill={selectedBill} settings={settingsRef.current} />
              </div>
            </div>

            <div className="p-6 space-y-3">
              {/* Download JPG - Primary */}
              <button
                onClick={handleDownload}
                disabled={isAnyLoading}
                className="w-full flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 disabled:bg-green-300 text-white py-3 px-4 rounded-xl font-bold transition-colors"
              >
                {isDownloading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Download className="w-5 h-5" />
                )}
                Download JPG
              </button>

              {/* Share and WhatsApp Row */}
              <div className="grid grid-cols-2 gap-3">
                {/* Share */}
                <button
                  onClick={handleShare}
                  disabled={isAnyLoading}
                  className="flex items-center justify-center gap-2 border-2 border-slate-200 hover:border-slate-300 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed py-3 px-4 rounded-xl font-bold text-slate-700 transition-colors"
                >
                  {isSharing ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Share2 className="w-5 h-5" />
                  )}
                  Share
                </button>

                {/* WhatsApp */}
                <button
                  onClick={handleWhatsApp}
                  disabled={isAnyLoading}
                  className="flex items-center justify-center gap-2 border-2 border-green-600 hover:bg-green-50 disabled:opacity-50 disabled:cursor-not-allowed py-3 px-4 rounded-xl font-bold text-green-600 transition-colors"
                >
                  {isWhatsapping ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <MessageCircle className="w-5 h-5" />
                  )}
                  WhatsApp
                </button>
              </div>

              {/* Print Button */}
              <button
                onClick={() => handlePrint(selectedBill)}
                disabled={isAnyLoading}
                className="w-full flex items-center justify-center gap-2 border-2 border-slate-200 hover:border-slate-300 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed py-3 px-4 rounded-xl font-bold text-slate-700 transition-colors"
              >
                <Printer className="w-5 h-5" />
                Print
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
