'use client';

import { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useProductStore } from '@/store/useProductStore';
import { useBillStore } from '@/store/useBillStore';
import { useInventoryStore } from '@/store/useInventoryStore';
import { useSettingsStore } from '@/store/useSettingsStore';
import { useCustomerStore } from '@/store/useCustomerStore';
import { useToast } from '@/components/Toast';
import { useRefetchOnFocus } from '@/hooks/useRefetchOnFocus';
import { validateStock } from '@/lib/validateStock';
import { formatCurrency, formatStock } from '@/lib/utils';
import { Search, Plus, Minus, X, Printer, Receipt, CreditCard, Smartphone, AlertTriangle, User, Calendar, Package, ArrowRight, Home, Menu, Pin } from 'lucide-react';
import { Product, ProductSize, BillItem, StoreSettings, CustomerWithStats, PaymentMode } from '@/types';
import { BillSuccessModal } from '@/components/billing/BillSuccessModal';
import { CustomerSearchDropdown } from '@/components/customers/CustomerSearchDropdown';
import { QuickAddCustomerModal } from '@/components/customers/QuickAddCustomerModal';
import { getBalanceStatus, CUSTOMER_TYPES } from '@/lib/constants/customerConstants';

type BillingMode = 'sale' | 'order';
type SalePaymentMode = 'cash' | 'upi' | 'due';
type OrderPaymentMode = 'full_paid' | 'full_due' | 'advance';

export default function BillingPage() {
  const router = useRouter();
  const { products, initializeFromStorage: initProducts, forceRefresh: refreshProducts } = useProductStore();
  const { 
    currentBill, 
    addItem, 
    removeItem, 
    updateItemQuantity,
    setCustomerInfo,
    setDiscount,
    setPaymentMode,
    submitBill,
    getSubtotal,
    getDiscountAmount,
    getTotal,
    clearCurrentBill,
    initializeFromStorage: initBills
  } = useBillStore();
  const { inventory, initializeFromStorage: initInventory, forceRefresh: refreshInventory, isLoading: inventoryLoading } = useInventoryStore();
  const { addToast } = useToast();
  const { initialize: initCustomers } = useCustomerStore();
  const { shopName, shopPhone, shopAddress, taxRate, initialize: initSettings } = useSettingsStore();
  
  // Billing mode: SALE or ORDER
  const [billingMode, setBillingMode] = useState<BillingMode>('sale');
  
  // Search and product selection
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBillingCategory, setSelectedBillingCategory] = useState<string>('Soft Drinks');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedSize, setSelectedSize] = useState<ProductSize | null>(null);
  const [packaging, setPackaging] = useState<'bottle' | 'carton'>('carton');
  const [quantity, setQuantity] = useState(1);

  // Mobile packaging modal state
  const [packagingModal, setPackagingModal] = useState<{
    product: Product;
    size: ProductSize;
  } | null>(null);
  const [packagingQty, setPackagingQty] = useState(1);
  const [packagingType, setPackagingType] = useState<'bottle' | 'carton'>('carton');
  
  // Customer state
  const [customerName, setCustomerName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerWithStats | null>(null);
  const [showAddCustomerModal, setShowAddCustomerModal] = useState(false);
  
  // Discount
  const [discountType, setDiscountType] = useState<'percentage' | 'flat'>('percentage');
  const [discountValue, setDiscountValue] = useState(0);
  
  // Payment states - SALE mode
  const [salePaymentMode, setSalePaymentMode] = useState<SalePaymentMode>('cash');
  const [cashReceived, setCashReceived] = useState(0);
  const [duePartialPayment, setDuePartialPayment] = useState(0); // Partial payment when Due is selected
  
  // Payment states - ORDER mode
  const [orderPaymentMode, setOrderPaymentMode] = useState<OrderPaymentMode>('advance');
  const [advanceAmount, setAdvanceAmount] = useState(0);
  
  // Order mode extras
  const [deliveryDate, setDeliveryDate] = useState<string>('');
  
  // Submit state
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Bill success modal state
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [savedBill, setSavedBill] = useState<BillItem[]>([]);
  const [billDetails, setBillDetails] = useState<{
    invoiceNumber: string;
    customerName: string;
    phoneNumber: string;
    subtotal: number;
    discountType: 'percentage' | 'flat';
    discountValue: number;
    discountAmount: number;
    totalAmount: number;
    paymentMode: PaymentMode;
    cashReceived: number;
    changeGiven: number;
    createdAt: string;
  } | null>(null);
  
  // Settings for modal
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

  // Initialize with force refresh for inventory (billing needs fresh stock data)
  useEffect(() => {
    const initialize = async () => {
      await Promise.all([initProducts(), initBills(), initSettings(), initCustomers()]);
      // Force fresh inventory for billing
      await refreshInventory();
    };
    initialize();
  }, [initProducts, initBills, initSettings, initCustomers, refreshInventory]);

  // Refetch on focus - 30 second stale time for billing
  const handleInventoryRefetch = useCallback(() => {
    return refreshInventory();
  }, [refreshInventory]);

  // Reset duePartialPayment when switching payment modes
  useEffect(() => {
    if (salePaymentMode !== 'due') {
      setDuePartialPayment(0);
    }
  }, [salePaymentMode]);

  useRefetchOnFocus({
    onRefetch: handleInventoryRefetch,
    staleTime: 30000, // 30 seconds
  });

  // Sync discount to bill store when values change
  useEffect(() => {
    setDiscount(discountType, discountValue);
  }, [discountType, discountValue, setDiscount]);

  // Get stock for selected size
  const getStockForSize = useCallback((productId: string, sizeId: string, sizeName?: string) => {
    const sku = inventory.find(s => 
      s.productId === productId && 
      (s.sizeId === sizeId || s.productSizeId === sizeId || (sizeName && s.sizeName === sizeName))
    );
    return sku?.currentStock || 0;
  }, [inventory]);

  const getAvailableSizes = useCallback((product: Product) => {
    return product.sizes.filter(size => {
      const stock = getStockForSize(product.id, size.id, size.name);
      return stock > 0;
    });
  }, [getStockForSize]);

  // Filter products based on search and category
  const filteredProducts = useMemo(() => {
    if (inventoryLoading) return []; // Show skeleton if loading

    let result = products;
    
    // Filter out unavailable sizes and products with no available sizes
    result = result.map(p => ({
      ...p,
      sizes: getAvailableSizes(p)
    })).filter(p => p.sizes.length > 0);
    
    if (selectedBillingCategory !== 'All') {
      const selected = selectedBillingCategory.toLowerCase().trim();
      result = result.filter(p => {
        const cat = p.category?.toLowerCase().trim() || '';
        if (cat === selected) return true;
        if (selected === 'soft drinks' && ['sodas', 'soda', 'soft-drinks', 'softdrinks'].includes(cat)) return true;
        return false;
      });
    }
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(p => 
        p.name.toLowerCase().includes(query) || 
        p.brand.toLowerCase().includes(query)
      );
    }
    return result;
  }, [products, searchQuery, selectedBillingCategory, getAvailableSizes, inventoryLoading]);

  // Calculate price based on packaging
  const calculatePrice = () => {
    if (!selectedSize) return 0;
    if (packaging === 'bottle') {
      return selectedSize.pricePerBottle;
    }
    return selectedSize.pricePerCarton;
  };

  // Add item from mobile packaging modal
  const handleSizeClickMobile = (product: Product, size: ProductSize) => {
    setPackagingModal({ product, size });
    setPackagingQty(1);
    setPackagingType('carton');
  };

  // Add item from configurator (desktop)
  const handleAddItem = () => {
    if (!selectedProduct || !selectedSize) return;

    const unitPrice = calculatePrice();
    const item: BillItem = {
      id: crypto.randomUUID(),
      productId: selectedProduct.id,
      sizeId: selectedSize.id,
      productName: selectedProduct.name,
      sizeName: selectedSize.name,
      packaging,
      quantity,
      unitPrice,
      totalPrice: unitPrice * quantity,
    };

    addItem(item);
    addToast('success', 'Item added to bill');
    
    // Reset selection
    setSelectedProduct(null);
    setSelectedSize(null);
    setQuantity(1);
    setPackaging('carton');
  };

  const togglePin = async (productId: string, isPinned: boolean) => {
    try {
      const response = await fetch(`/api/products/${productId}/pin`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isPinned })
      });
      if (!response.ok) throw new Error('Failed to update pin');
      await refreshProducts();
      addToast('success', isPinned ? 'Pinned to top' : 'Unpinned');
    } catch (error) {
      console.error(error);
      addToast('error', 'Failed to update pin state');
    }
  };

  // Calculate totals
  const subtotal = getSubtotal();
  const discountAmount = getDiscountAmount();
  const total = getTotal();
  const change = salePaymentMode === 'cash' ? cashReceived - total : 0;
  
  // For ORDER mode - advance calculation
  const remainingAmount = total - advanceAmount;

  // Helper to format quantity display
  const formatQty = (qty: number, packaging?: string) => {
    if (packaging === 'carton') return `${qty}C`;
    if (packaging === 'bottle') return `${qty}B`;
    return `${qty}`;
  };

  // Determine bill status based on payment mode
  const getBillStatus = () => {
    const roundedTotal = Math.round(total);
    if (billingMode === 'order') {
      if (orderPaymentMode === 'full_paid') return 'paid';
      if (orderPaymentMode === 'full_due') return 'pending';
      return 'partially_paid'; // advance - partially paid
    } else {
      // SALE mode
      if (salePaymentMode === 'cash') {
        if (cashReceived >= roundedTotal) return 'paid';
        if (cashReceived > 0) return 'partially_paid';
        return 'pending';
      }
      if (salePaymentMode === 'upi') return 'paid';
      // Due mode - full due (no partial payment)
      if (salePaymentMode === 'due') {
        return 'pending';
      }
      return 'pending';
    }
  };

  // Get payment mode for API
  const getPaymentModeForAPI = (): PaymentMode => {
    if (billingMode === 'order') {
      if (orderPaymentMode === 'full_paid') return 'Cash';
      return 'Credit';
    } else {
      if (salePaymentMode === 'cash') return 'Cash';
      if (salePaymentMode === 'upi') return 'UPI';
      return 'Credit';
    }
  };

  // Get cash received for API
  const getCashReceivedForAPI = () => {
    if (billingMode === 'order') {
      return orderPaymentMode === 'full_paid' ? total : advanceAmount;
    } else {
      if (salePaymentMode === 'cash') return cashReceived;
      if (salePaymentMode === 'upi') return total;
      return 0; // due - no payment now
    }
  };

  // Handle bill submission with stock validation
  const handleSubmitBill = async () => {
    if (currentBill.items.length === 0) {
      addToast('error', 'No items in bill');
      return;
    }

    const roundedTotal = Math.round(total);
    const apiCashReceived = getCashReceivedForAPI();
    const dueAmount = Math.max(0, roundedTotal - apiCashReceived);
    const hasCustomer = !!selectedCustomer;
    const isFullyPaid = dueAmount <= 0;
    const canGenerateBill = hasCustomer || isFullyPaid;

    if (!canGenerateBill) {
      addToast('error', 'Please add customer details for due or partial payments');
      return;
    }

    // Validate delivery date for orders
    if (billingMode === 'order' && !deliveryDate) {
      addToast('error', 'Please select a delivery date for the order');
      return;
    }

    setIsSubmitting(true);
    
    // Validate stock before generating bill
    const validationResult = await validateStock(currentBill.items);
    
    if (!validationResult.pass) {
      // Show error with failed items
      const failedMessages = validationResult.failedItems.map(item => 
        `${item.item.productName} (${item.item.sizeName}): need ${item.requiredQuantity}, available ${item.availableStock}`
      ).join('\n');
      
      addToast('error', `Stock validation failed:\n${failedMessages}`);
      setIsSubmitting(false);
      return;
    }
    
    // Calculate bill details
    const billSubtotal = getSubtotal();
    const billDiscountAmount = getDiscountAmount();
    const billTotal = getTotal();
    const billStatus = getBillStatus();
    const cashReceivedForAPI = getCashReceivedForAPI();
    const billChange = billStatus === 'paid' ? Math.max(0, cashReceivedForAPI - billTotal) : 0;
    
    // Call API directly with all required fields
    try {
      const response = await fetch('/api/bills', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          billType: billingMode,
          customerId: selectedCustomer?.id || null,
          customerName: customerName || null,
          customerPhone: phoneNumber || null,
          items: currentBill.items.map(item => ({
            productId: item.productId,
            sizeId: item.sizeId,
            productName: item.productName,
            sizeName: item.sizeName,
            packaging: item.packaging,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            totalPrice: item.totalPrice,
          })),
          subtotal: billSubtotal,
          discountType,
          discountValue,
          discountAmount: billDiscountAmount,
          totalAmount: billTotal,
          paymentMode: getPaymentModeForAPI(),
          cashReceived: cashReceivedForAPI,
          changeGiven: billChange,
          deliveryDate: billingMode === 'order' ? deliveryDate : null,
          status: billStatus,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create bill');
      }

      const result = await response.json();
      
      // Store bill details for modal
      setSavedBill(currentBill.items);
      setBillDetails({
        invoiceNumber: result.invoiceNumber,
        customerName,
        phoneNumber,
        subtotal: billSubtotal,
        discountType,
        discountValue,
        discountAmount: billDiscountAmount,
        totalAmount: billTotal,
        paymentMode: getPaymentModeForAPI(),
        cashReceived: cashReceivedForAPI,
        changeGiven: billChange,
        createdAt: new Date().toISOString(),
      });
      
      // Show success modal
      setShowSuccessModal(true);
      
      // Refresh inventory and products
      await refreshInventory();
      await refreshProducts();
      
      // Clear the current bill
      clearCurrentBill();
      
    } catch (error: any) {
      console.error('Bill creation error:', error);
      addToast('error', error.message || 'Failed to generate bill');
    }
    
    setIsSubmitting(false);
  };

  // Handle new bill - reset everything
  const handleNewBill = () => {
    // Clear the bill store
    clearCurrentBill();
    
    // Reset form state
    setCustomerName('');
    setPhoneNumber('');
    setDiscountValue(0);
    setCashReceived(0);
    setAdvanceAmount(0);
    setDeliveryDate('');
    setSelectedProduct(null);
    setSelectedSize(null);
    setQuantity(1);
    setSearchQuery('');
    setSelectedCustomer(null);
    setSalePaymentMode('cash');
    setOrderPaymentMode('advance');
    setCashReceived(0);
    setDuePartialPayment(0);
    
    // Reset modal state
    setShowSuccessModal(false);
    setSavedBill([]);
    setBillDetails(null);
    
    addToast('success', 'Ready for new bill');
  };

  // Handle customer selection
  const handleCustomerSelect = (customer: CustomerWithStats | null) => {
    setSelectedCustomer(customer);
    if (customer) {
      setCustomerName(customer.name);
      setPhoneNumber(customer.phone || '');
    } else {
      setCustomerName('');
      setPhoneNumber('');
    }
  };

  // Get customer balance status
  const customerBalanceStatus = selectedCustomer
    ? getBalanceStatus(selectedCustomer.outstandingBalance)
    : null;

  // Get status display text
  const getStatusText = () => {
    const roundedTotal = Math.round(total);
    if (billingMode === 'order') {
      if (orderPaymentMode === 'full_paid') return 'Full Paid';
      if (orderPaymentMode === 'full_due') return 'Full Due';
      return `Advance: ${formatCurrency(advanceAmount)}`;
    } else {
      if (salePaymentMode === 'cash') {
        if (cashReceived >= roundedTotal) return 'Full Paid';
        if (cashReceived > 0) return `Partial: ${formatCurrency(cashReceived)}, Due: ${formatCurrency(roundedTotal - cashReceived)}`;
        return 'Full Due';
      }
      if (salePaymentMode === 'upi') return 'Full Paid (UPI)';
      // Due mode with partial payment
      if (salePaymentMode === 'due') {
        if (duePartialPayment >= roundedTotal) return 'Full Paid';
        if (duePartialPayment > 0) return `Partial: ${formatCurrency(duePartialPayment)}, Due: ${formatCurrency(roundedTotal - duePartialPayment)}`;
        return 'Full Due';
      }
      return 'Full Due';
    }
  };

  // Get status color
  const getStatusColor = () => {
    const roundedTotal = Math.round(total);
    if (billingMode === 'order') {
      if (orderPaymentMode === 'full_paid') return 'text-green-600 bg-green-50';
      if (orderPaymentMode === 'full_due') return 'text-red-600 bg-red-50';
      return 'text-amber-600 bg-amber-50';
    } else {
      if (salePaymentMode === 'cash') {
        if (cashReceived >= roundedTotal) return 'text-green-600 bg-green-50';
        if (cashReceived > 0) return 'text-amber-600 bg-amber-50';
        return 'text-red-600 bg-red-50';
      }
      if (salePaymentMode === 'upi') return 'text-green-600 bg-green-50';
      // Due mode with partial payment
      if (salePaymentMode === 'due') {
        if (duePartialPayment >= roundedTotal) return 'text-green-600 bg-green-50';
        if (duePartialPayment > 0) return 'text-amber-600 bg-amber-50';
        return 'text-red-600 bg-red-50';
      }
      return 'text-red-600 bg-red-50';
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-0 lg:space-y-6 no-print pb-[90px] lg:pb-6 px-4 lg:px-0">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 mb-2 lg:mb-0">
        <div className="flex items-center gap-2 lg:gap-3 flex-1 lg:flex-none">
          <button
            onClick={() => {
              if (typeof window !== 'undefined') {
                window.dispatchEvent(new CustomEvent('toggle-sidebar'));
              }
            }}
            className="p-2 -ml-2 lg:ml-0 hover:bg-slate-100 rounded-lg lg:hidden"
          >
            <Menu className="w-6 h-6 text-slate-600" />
          </button>
          
          <div className="hidden lg:flex gap-1">
            <button onClick={() => router.back()} className="p-2 hover:bg-slate-100 rounded-lg" title="Go Back">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m12 19-7-7 7-7"/><path d="M19 12H5"/></svg>
            </button>
            <button onClick={() => router.push('/dashboard')} className="p-2 hover:bg-slate-100 rounded-lg" title="Go Home">
              <Home className="w-5 h-5 text-slate-600" />
            </button>
          </div>
          
          <div className="text-center lg:text-left flex-1 lg:flex-none">
            <h1 className="text-lg lg:text-2xl font-bold whitespace-nowrap">New Billing</h1>
            <p className="text-slate-500 text-[11px] lg:text-sm">Create a new bill</p>
          </div>
        </div>
        
        <button
          onClick={() => router.push('/history')}
          className="flex items-center gap-2 p-2 lg:px-4 lg:py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium hover:bg-slate-50 shrink-0"
        >
          <Receipt className="w-5 h-5 lg:w-4 lg:h-4" />
          <span className="hidden lg:inline">History</span>
        </button>
      </div>

      {/* Mode Tabs: SALE / ORDER */}
      <div className="bg-white rounded-xl border border-slate-200 p-1 flex mb-[10px] lg:mb-0 lg:p-1">
        <button
          onClick={() => setBillingMode('sale')}
          className={`flex-1 py-3 px-6 rounded-lg font-bold text-sm transition-all flex items-center justify-center gap-2 ${
            billingMode === 'sale'
              ? 'bg-primary text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-50'
          }`}
        >
          <Receipt className="w-5 h-5" />
          SALE
        </button>
        <button
          onClick={() => setBillingMode('order')}
          className={`flex-1 py-3 px-6 rounded-lg font-bold text-sm transition-all flex items-center justify-center gap-2 ${
            billingMode === 'order'
              ? 'bg-amber-500 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-50'
          }`}
        >
          <Package className="w-5 h-5" />
          ORDER
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-0 lg:gap-6">
        {/* Left Column - Product Selection */}
        <div className="space-y-0 lg:space-y-4 flex flex-col">
          {/* Customer Details */}
          <div className="bg-white p-3 lg:p-4 rounded-xl border border-slate-200 mb-[10px] lg:mb-0">
            <h3 className="text-sm font-bold uppercase tracking-wider mb-3">Customer Details</h3>
            
            {selectedCustomer ? (
              <div className="space-y-3">
                {/* Selected Customer Info */}
                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                      <User className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-bold text-sm">{selectedCustomer.name}</p>
                      <p className="text-xs text-slate-500">{selectedCustomer.phone || 'No phone'}</p>
                    </div>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full font-bold border ${
                    CUSTOMER_TYPES[selectedCustomer.customerType]?.badgeColor || CUSTOMER_TYPES.regular.badgeColor
                  }`}>
                    {CUSTOMER_TYPES[selectedCustomer.customerType]?.label || 'Regular'}
                  </span>
                </div>
                
                {/* Balance Warning */}
                {customerBalanceStatus && customerBalanceStatus !== 'clear' && (
                  <div className="flex items-center gap-2 p-3 rounded-lg text-sm bg-amber-50 text-amber-700">
                    <AlertTriangle className="w-4 h-4" />
                    <span>
                      {`Has outstanding balance: ${formatCurrency(selectedCustomer.outstandingBalance)}`
                      }
                    </span>
                  </div>
                )}
                
                <button
                  onClick={() => handleCustomerSelect(null)}
                  className="text-xs text-slate-500 hover:text-primary"
                >
                  Change Customer
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <div className="flex-1">
                  <CustomerSearchDropdown
                    onSelect={handleCustomerSelect}
                    selectedCustomer={null}
                    onAddNew={() => setShowAddCustomerModal(true)}
                  />
                </div>
                <button
                  onClick={() => setShowAddCustomerModal(true)}
                  className="flex items-center gap-1 px-3 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90"
                >
                  <Plus className="w-4 h-4" />
                  New
                </button>
              </div>
            )}
          </div>

          {/* Product Search */}
          <div className="bg-white p-3 lg:p-4 rounded-xl border border-slate-200 mb-[10px] lg:mb-0">
            <h3 className="text-sm font-bold uppercase tracking-wider mb-3">Add Items</h3>
            <div className="relative mb-3 lg:mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search drinks, juices, soda..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-3 py-3 bg-slate-50 border border-slate-200 rounded-lg text-sm"
              />
            </div>

            {/* Category Pills */}
            <div className="flex gap-2 overflow-x-auto pb-2 mb-2 lg:mb-4 hide-scrollbar -mx-3 px-3 lg:mx-0 lg:px-0" style={{ scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch' }}>
              {['Soft Drinks', 'Juices', 'Water', 'Energy Drinks', 'Others', 'All'].map(cat => (
                <button
                  key={cat}
                  onClick={() => setSelectedBillingCategory(cat)}
                  className={`flex-shrink-0 px-[14px] py-[5px] text-[12px] font-medium rounded-full transition-colors ${
                    selectedBillingCategory === cat
                      ? 'bg-[#16a34a] text-white'
                      : 'bg-white border border-[#e5e7eb] text-[#374151]'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Search Results / All Products */}
            {inventoryLoading ? (
              <div className="space-y-2 mb-4">
                {[1, 2, 3].map(i => (
                  <div key={i} className="w-full h-[90px] p-3 bg-slate-50 border border-slate-100 rounded-xl lg:rounded-lg animate-pulse"></div>
                ))}
              </div>
            ) : filteredProducts.length > 0 && !selectedProduct ? (
              <div className="space-y-2 mb-4">
                {filteredProducts.map(product => (
                  <div
                    key={product.id}
                    onClick={() => {
                      if (window.innerWidth >= 1024) {
                        setSelectedProduct(product);
                        setSelectedSize(product.sizes[0] || null);
                      }
                    }}
                    className="w-full p-3 text-left bg-white lg:bg-slate-50 rounded-xl lg:rounded-lg border border-slate-100 lg:border-none hover:bg-primary/5 transition-colors lg:cursor-pointer"
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="font-semibold text-[14px]">{product.name}</h4>
                            <p className="hidden lg:block text-xs text-slate-500 mb-2">{product.brand}</p>
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              togglePin(product.id, !product.isPinned);
                            }}
                            className="p-1 hover:bg-slate-100 rounded"
                            title={product.isPinned ? "Unpin" : "Pin to top"}
                          >
                            <Pin className={`w-[14px] h-[14px] ${product.isPinned ? 'text-[#16a34a] fill-[#16a34a]' : 'text-[#9ca3af]'}`} />
                          </button>
                        </div>
                        {/* Size badges - click to add directly */}
                        <div className="flex flex-wrap gap-[6px] mt-2 lg:mt-0">
                          {product.sizes.map(size => (
                            <button
                              key={size.id}
                              onClick={(e) => {
                                e.stopPropagation();
                                if (window.innerWidth < 1024) {
                                  // Mobile: Show packaging modal
                                  handleSizeClickMobile(product, size);
                                } else {
                                  // Desktop: Open Configurator
                                  setSelectedProduct(product);
                                  setSelectedSize(size);
                                  setPackaging('bottle');
                                  setQuantity(1);
                                }
                              }}
                              className="bg-[#f0fdf4] text-[#16a34a] border border-[#bbf7d0] lg:bg-primary/10 lg:text-primary lg:border-primary/20 lg:hover:bg-primary lg:hover:text-white rounded-full px-[10px] py-[5px] lg:px-2 lg:py-0.5 text-[11px] lg:text-xs font-bold transition-colors"
                            >
                              {size.name} • ₹{size.pricePerBottle}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : !inventoryLoading && !selectedProduct ? (
              <div className="py-6 text-center text-slate-400 text-[13px]">
                No available stock in this category
              </div>
            ) : null}

            {/* Item Configurator */}
            {selectedProduct && selectedSize && (
              <div className="p-4 rounded-xl bg-primary/5 border border-primary/20">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h4 className="font-bold">{selectedProduct.name}</h4>
                    <p className="text-xs text-slate-500">
                      Stock: {formatStock(getStockForSize(selectedProduct.id, selectedSize.id), selectedSize.bottlesPerCarton)}
                    </p>
                  </div>
                  <span className="text-primary font-bold">
                    ₹{calculatePrice()}/{packaging === 'bottle' ? 'unit' : 'carton'}
                  </span>
                </div>
                
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div>
                    <p className="text-[10px] uppercase font-bold text-slate-400 mb-1">Size</p>
                    <select
                      value={selectedSize.id}
                      onChange={(e) => {
                        const size = selectedProduct.sizes.find(s => s.id === e.target.value);
                        setSelectedSize(size || null);
                      }}
                      className="w-full bg-white border border-slate-200 rounded-lg text-sm p-2"
                    >
                      {selectedProduct.sizes.map(size => (
                        <option key={size.id} value={size.id}>{size.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase font-bold text-slate-400 mb-1">Packaging</p>
                    <select
                      value={packaging}
                      onChange={(e) => setPackaging(e.target.value as 'bottle' | 'carton')}
                      className="w-full bg-white border border-slate-200 rounded-lg text-sm p-2"
                    >
                      <option value="carton">Carton ({selectedSize.bottlesPerCarton} pcs)</option>
                      <option value="bottle">Bottle</option>
                    </select>
                  </div>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center border border-slate-200 rounded-lg overflow-hidden bg-white">
                    <button
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                      className="px-3 py-2 hover:bg-slate-100"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <span className="px-4 font-bold text-sm">{quantity}</span>
                    <button
                      onClick={() => setQuantity(quantity + 1)}
                      className="px-3 py-2 hover:bg-slate-100"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                  <button
                    onClick={handleAddItem}
                    className="bg-primary text-white px-6 py-2 rounded-lg font-bold text-sm flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Add to Bill
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column - Bill Preview */}
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200 flex-1">
            <h3 className="text-sm font-bold uppercase tracking-wider mb-3">Bill Preview</h3>
            
            {/* Items */}
            <div className="space-y-3 mb-4 max-h-64 overflow-auto">
              {currentBill.items.length > 0 ? (
                currentBill.items.map(item => (
                  <div key={item.id} className="flex justify-between items-center bg-slate-50 lg:bg-transparent p-2 lg:p-0 rounded-lg lg:rounded-none">
                    <div className="flex-1">
                      <h5 className="font-medium text-[13px] lg:text-sm">{item.productName} ({item.sizeName})</h5>
                    </div>
                    
                    <div className="flex items-center gap-3 lg:gap-2">
                      {/* Compact Qty Controls (Mobile mainly, but fine for desktop too) */}
                      <div className="flex items-center border border-slate-200 rounded overflow-hidden bg-white h-[24px]">
                        <button
                          onClick={() => {
                            if (item.quantity > 1) {
                              updateItemQuantity(item.id, item.quantity - 1);
                            }
                          }}
                          className="px-[6px] hover:bg-slate-100 flex items-center justify-center"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="px-2 font-bold text-[12px] min-w-[20px] text-center">{formatQty(item.quantity, item.packaging)}</span>
                        <button
                          onClick={() => updateItemQuantity(item.id, item.quantity + 1)}
                          className="px-[6px] hover:bg-slate-100 flex items-center justify-center"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>

                      <p className="font-semibold text-[13px] lg:text-sm w-[40px] text-right">{formatCurrency(item.totalPrice)}</p>
                      
                      <button
                        onClick={() => removeItem(item.id)}
                        className="text-red-500 hover:text-red-700 ml-1"
                      >
                        <X className="w-[16px] h-[16px]" />
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="flex items-center justify-center gap-2 h-[60px] text-slate-400">
                  <Receipt className="w-[32px] h-[32px] opacity-50" />
                  <p className="text-[13px]">No items added</p>
                </div>
              )}
            </div>

            {/* Totals */}
            <div className="pt-3 border-t border-dashed border-slate-200 space-y-2">
              <div className="flex justify-between text-[13px] text-slate-600">
                <span>Subtotal</span>
                <span>{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex items-center justify-between text-[13px]">
                <span className="text-slate-600">Discount</span>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    value={discountValue}
                    onChange={(e) => setDiscountValue(Number(e.target.value))}
                    className="w-[50px] h-7 text-xs rounded border border-slate-200 bg-slate-50 text-right px-1"
                    placeholder="0"
                  />
                  <select
                    value={discountType}
                    onChange={(e) => setDiscountType(e.target.value as 'percentage' | 'flat')}
                    className="h-7 text-[10px] rounded border border-slate-200 bg-slate-50 px-1"
                  >
                    <option value="percentage">%</option>
                    <option value="flat">₹</option>
                  </select>
                </div>
              </div>
              <div className="flex justify-between text-[15px] font-bold pt-2">
                <span>Total Amount</span>
                <span className="text-[#16a34a]">{formatCurrency(total)}</span>
              </div>
            </div>
          </div>

          {/* Payment Options */}
          <div className="bg-white p-4 rounded-xl border border-slate-200">
            {/* ORDER MODE: Delivery Date */}
            {billingMode === 'order' && (
              <div className="mb-4">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                  <Calendar className="w-4 h-4 inline mr-1" />
                  Delivery Date
                </label>
                <input
                  type="date"
                  value={deliveryDate}
                  onChange={(e) => setDeliveryDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-slate-50 text-sm"
                  min={new Date().toISOString().split('T')[0]}
                />
              </div>
            )}

            <h3 className="text-xs font-bold uppercase tracking-wider mb-3">
              {billingMode === 'sale' ? 'Payment Method' : 'Order Payment'}
            </h3>
            
            {billingMode === 'sale' ? (
              /* SALE MODE PAYMENT OPTIONS */
              <div className="space-y-3">
                {/* Payment Type Buttons */}
                <div className="flex gap-2 mb-4">
                  <button
                    onClick={() => setSalePaymentMode('cash')}
                    className={`flex-1 h-[40px] rounded-[10px] font-bold text-[12px] transition-colors ${
                      salePaymentMode === 'cash'
                        ? 'bg-[#16a34a] text-white border-transparent'
                        : 'bg-white border border-[#e5e7eb] text-slate-600'
                    }`}
                  >
                    CASH
                  </button>
                  <button
                    onClick={() => setSalePaymentMode('upi')}
                    className={`flex-1 h-[40px] rounded-[10px] font-bold text-[12px] transition-colors ${
                      salePaymentMode === 'upi'
                        ? 'bg-[#16a34a] text-white border-transparent'
                        : 'bg-white border border-[#e5e7eb] text-slate-600'
                    }`}
                  >
                    UPI
                  </button>
                  <button
                    onClick={() => setSalePaymentMode('due')}
                    className={`flex-1 h-[40px] rounded-[10px] font-bold text-[12px] transition-colors ${
                      salePaymentMode === 'due'
                        ? 'bg-[#16a34a] text-white border-transparent'
                        : 'bg-white border border-[#e5e7eb] text-slate-600'
                    }`}
                  >
                    DUE
                  </button>
                </div>

                {/* Cash Received Input */}
                {salePaymentMode === 'cash' && (
                  <div className="mb-4">
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Amount Received</label>
                    <input
                      type="number"
                      value={cashReceived || ''}
                      onChange={(e) => setCashReceived(Number(e.target.value))}
                      className="w-full h-[44px] rounded-[10px] border border-slate-200 bg-slate-50 text-[16px] text-center font-semibold placeholder-slate-300 focus:outline-none focus:border-[#16a34a] focus:ring-1 focus:ring-[#16a34a]"
                      placeholder="Enter amount"
                    />
                    
                    {cashReceived > 0 && (
                      <>
                        {cashReceived >= Math.round(total) ? (
                          <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded-lg flex items-center justify-between">
                            <span className="text-green-700 text-sm font-medium">Change Amount:</span>
                            <span className="text-green-700 text-sm font-bold">{formatCurrency(cashReceived - Math.round(total))}</span>
                          </div>
                        ) : (
                          <div className="mt-2 p-2 bg-amber-50 border border-amber-200 rounded-lg">
                            <p className="text-amber-700 text-sm font-medium flex items-center gap-1">
                              <AlertTriangle className="w-4 h-4" />
                              Partial Payment
                            </p>
                            <p className="text-amber-600 text-xs mt-1">
                              Received: {formatCurrency(cashReceived)} | Outstanding: {formatCurrency(Math.round(total) - cashReceived)}
                            </p>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}

                {/* Due Mode - Full Due (No partial payment) */}
                {salePaymentMode === 'due' && (
                  <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-red-700 text-sm font-medium flex items-center gap-1">
                      <CreditCard className="w-4 h-4" />
                      Full Due - Credit Payment
                    </p>
                    <p className="text-red-600 text-xs mt-1">
                      Entire amount will be added to customer outstanding balance
                    </p>
                  </div>
                )}
              </div>
            ) : (
              /* ORDER MODE PAYMENT OPTIONS */
              <div className="space-y-3">
                <div className="flex gap-2 mb-4">
                  <button
                    onClick={() => setOrderPaymentMode('full_paid')}
                    className={`flex-1 h-[40px] rounded-[10px] font-bold text-[12px] transition-colors ${
                      orderPaymentMode === 'full_paid'
                        ? 'bg-[#16a34a] text-white border-transparent'
                        : 'bg-white border border-[#e5e7eb] text-slate-600'
                    }`}
                  >
                    FULL PAID
                  </button>
                  <button
                    onClick={() => setOrderPaymentMode('full_due')}
                    className={`flex-1 h-[40px] rounded-[10px] font-bold text-[12px] transition-colors ${
                      orderPaymentMode === 'full_due'
                        ? 'bg-[#16a34a] text-white border-transparent'
                        : 'bg-white border border-[#e5e7eb] text-slate-600'
                    }`}
                  >
                    FULL DUE
                  </button>
                  <button
                    onClick={() => setOrderPaymentMode('advance')}
                    className={`flex-1 h-[40px] rounded-[10px] font-bold text-[12px] transition-colors ${
                      orderPaymentMode === 'advance'
                        ? 'bg-[#16a34a] text-white border-transparent'
                        : 'bg-white border border-[#e5e7eb] text-slate-600'
                    }`}
                  >
                    ADVANCE
                  </button>
                </div>

                {/* Advance Amount Input */}
                {orderPaymentMode === 'advance' && (
                  <div className="mb-4">
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Advance Amount</label>
                    <input
                      type="number"
                      value={advanceAmount || ''}
                      onChange={(e) => setAdvanceAmount(Number(e.target.value))}
                      className="w-full h-[44px] rounded-[10px] border border-slate-200 bg-slate-50 text-[16px] text-center font-semibold placeholder-slate-300 focus:outline-none focus:border-[#16a34a] focus:ring-1 focus:ring-[#16a34a]"
                      placeholder="Enter amount"
                      max={total}
                    />
                    
                    {advanceAmount > 0 && advanceAmount < total && (
                      <div className="mt-2 p-2 bg-amber-50 border border-amber-200 rounded-lg">
                        <p className="text-amber-700 text-sm font-medium">
                          Remaining Amount: {formatCurrency(remainingAmount)}
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* Order Payment Info */}
                {orderPaymentMode === 'full_due' && (
                  <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-red-700 text-sm font-medium">
                      Full Due - Order on Credit
                    </p>
                    <p className="text-red-600 text-xs mt-1">
                      Full amount will be added to customer balance
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Status Summary */}
            <div className={`mt-4 p-3 rounded-lg ${getStatusColor()}`}>
              <div className="flex items-center justify-between">
                <span className="text-[13px] font-bold">Status:</span>
                <span className="text-[13px] font-bold">{getStatusText()}</span>
              </div>
            </div>

            {/* Submit Button */}
            {(() => {
              const roundedTotal = Math.round(total);
              const apiCashReceived = getCashReceivedForAPI();
              const dueAmount = Math.max(0, roundedTotal - apiCashReceived);
              const hasCustomer = !!selectedCustomer;
              const isFullyPaid = dueAmount <= 0;
              const canGenerateBill = hasCustomer || isFullyPaid;

              return (
                <div className="sticky bottom-[72px] lg:static lg:bottom-auto z-40 mt-4 bg-white/80 lg:bg-transparent backdrop-blur-sm lg:backdrop-blur-none p-1 lg:p-0">
                  <button
                    onClick={handleSubmitBill}
                    disabled={isSubmitting || currentBill.items.length === 0 || (!canGenerateBill)}
                    className={`w-full h-[48px] rounded-[12px] font-semibold text-[15px] flex items-center justify-center gap-2 transition-all ${
                      billingMode === 'order' 
                        ? 'bg-amber-500 hover:bg-amber-600 disabled:bg-[#d1d5db] text-white disabled:text-slate-500 shadow-lg lg:shadow-none'
                        : 'bg-[#16a34a] hover:bg-[#15803d] disabled:bg-[#d1d5db] text-white disabled:text-slate-500 shadow-lg lg:shadow-none'
                    }`}
                    style={(!canGenerateBill) ? { opacity: 0.5, cursor: 'not-allowed' } : {}}
                  >
                    🖨 Generate Bill
                  </button>
                  {!canGenerateBill && (
                    <p className="text-[#f59e0b] text-[12px] text-center mt-2 font-medium">
                      ⚠ Add customer details for due/partial payments
                    </p>
                  )}
                </div>
              );
            })()}
          </div>
        </div>
      </div>

      {/* Bill Success Modal */}
      {showSuccessModal && billDetails && (
        <BillSuccessModal
          bill={{
            id: crypto.randomUUID(),
            invoiceNumber: billDetails.invoiceNumber,
            customerName: billDetails.customerName || undefined,
            phoneNumber: billDetails.phoneNumber || undefined,
            customerId: selectedCustomer?.id,
            items: savedBill,
            subtotal: billDetails.subtotal,
            discountType: billDetails.discountType,
            discountValue: billDetails.discountValue,
            discountAmount: billDetails.discountAmount,
            totalAmount: billDetails.totalAmount,
            paymentMode: billDetails.paymentMode,
            cashReceived: billDetails.cashReceived || undefined,
            changeGiven: billDetails.changeGiven || undefined,
            createdAt: billDetails.createdAt,
            status: getBillStatus(),
          }}
          settings={settingsRef.current}
          isOpen={showSuccessModal}
          onClose={() => setShowSuccessModal(false)}
          onNewBill={handleNewBill}
        />
      )}
      
      {/* Quick Add Customer Modal */}
      {showAddCustomerModal && (
        <QuickAddCustomerModal
          isOpen={showAddCustomerModal}
          onClose={() => setShowAddCustomerModal(false)}
          onSuccess={(customer) => {
            handleCustomerSelect(customer);
            setShowAddCustomerModal(false);
          }}
        />
      )}

      {/* Packaging Modal (Mobile) */}
      {packagingModal && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/50 backdrop-blur-sm lg:hidden pb-[72px]">
          <div className="bg-white w-full rounded-t-[20px] p-5 pb-8 animate-slide-up">
            <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mb-4" />
            
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[16px] font-semibold">Add to Bill</h3>
              <button onClick={() => setPackagingModal(null)} className="p-2 hover:bg-slate-100 rounded-full">
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>

            <div className="mb-6">
              <p className="text-[14px] font-semibold text-slate-800">
                {packagingModal.product.name} – {packagingModal.size.name}
              </p>
            </div>

            <div className="flex items-center justify-center mb-6">
              <div className="flex items-center border-2 border-slate-200 rounded-xl overflow-hidden bg-white">
                <button
                  onClick={() => setPackagingQty(Math.max(1, packagingQty - 1))}
                  className="px-4 py-3 hover:bg-slate-100 text-slate-500"
                >
                  <Minus className="w-6 h-6" />
                </button>
                <span className="w-16 text-center font-bold text-[24px]">{packagingQty}</span>
                <button
                  onClick={() => setPackagingQty(packagingQty + 1)}
                  className="px-4 py-3 hover:bg-slate-100 text-slate-500"
                >
                  <Plus className="w-6 h-6" />
                </button>
              </div>
            </div>

            <div className="flex gap-3 mb-6">
              <button
                onClick={() => setPackagingType('carton')}
                className={`flex-1 h-[80px] rounded-[12px] flex flex-col items-center justify-center gap-1 transition-all ${
                  packagingType === 'carton'
                    ? 'border-2 border-[#16a34a] bg-[#f0fdf4]'
                    : 'border-2 border-[#e5e7eb] bg-white'
                }`}
              >
                <span className="text-[20px]">📦</span>
                <span className="text-[14px] font-semibold text-slate-800">Cartons</span>
                <span className="text-[12px] text-slate-500">
                  ₹{packagingModal.size.pricePerCarton}
                  {packagingModal.size.bottlesPerCarton ? ` (${packagingModal.size.bottlesPerCarton} pcs)` : ''}
                </span>
              </button>
              
              <button
                onClick={() => setPackagingType('bottle')}
                className={`flex-1 h-[80px] rounded-[12px] flex flex-col items-center justify-center gap-1 transition-all ${
                  packagingType === 'bottle'
                    ? 'border-2 border-[#16a34a] bg-[#f0fdf4]'
                    : 'border-2 border-[#e5e7eb] bg-white'
                }`}
              >
                <span className="text-[20px]">🍾</span>
                <span className="text-[14px] font-semibold text-slate-800">Bottles</span>
                <span className="text-[12px] text-slate-500">₹{packagingModal.size.pricePerBottle} each</span>
              </button>
            </div>

            <button
              onClick={() => {
                const isCarton = packagingType === 'carton';
                const unitPrice = isCarton ? packagingModal.size.pricePerCarton : packagingModal.size.pricePerBottle;
                addItem({
                  id: crypto.randomUUID(),
                  productId: packagingModal.product.id,
                  sizeId: packagingModal.size.id,
                  productName: packagingModal.product.name,
                  sizeName: packagingModal.size.name,
                  packaging: packagingType,
                  quantity: packagingQty,
                  unitPrice,
                  totalPrice: unitPrice * packagingQty,
                });
                addToast('success', `Added ${packagingQty} ${packagingType === 'carton' ? 'cartons' : 'bottles'} to bill`);
                setPackagingModal(null);
              }}
              className="w-full h-[46px] bg-[#16a34a] text-white rounded-[10px] font-semibold text-[15px]"
            >
              Add to Bill
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
