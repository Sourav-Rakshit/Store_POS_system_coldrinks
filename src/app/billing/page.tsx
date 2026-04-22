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
import { formatCurrency } from '@/lib/utils';
import { Search, Plus, Minus, X, Printer, Receipt, CreditCard, Smartphone, AlertTriangle, User, Calendar, Package, ArrowRight, Home } from 'lucide-react';
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
  const { products, initializeFromStorage: initProducts } = useProductStore();
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
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedSize, setSelectedSize] = useState<ProductSize | null>(null);
  const [packaging, setPackaging] = useState<'bottle' | 'carton'>('bottle');
  const [quantity, setQuantity] = useState(1);
  
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

  // Filter products based on search
  const filteredProducts = useMemo(() => {
    if (!searchQuery) return products.slice(0, 50); // Show more products when no search
    const query = searchQuery.toLowerCase();
    return products.filter(p => 
      p.name.toLowerCase().includes(query) || 
      p.brand.toLowerCase().includes(query)
    ).slice(0, 50);
  }, [products, searchQuery]);

  // Get stock for selected size
  const getStockForSize = (productId: string, sizeId: string) => {
    const sku = inventory.find(s => s.productId === productId && s.sizeId === sizeId);
    return sku?.currentStock || 0;
  };

  // Calculate price based on packaging
  const calculatePrice = () => {
    if (!selectedSize) return 0;
    if (packaging === 'bottle') {
      return selectedSize.pricePerBottle;
    }
    return selectedSize.pricePerCarton;
  };

  // Add item to bill
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
    setPackaging('bottle');
  };

  // Calculate totals
  const subtotal = getSubtotal();
  const discountAmount = getDiscountAmount();
  const total = getTotal();
  const change = salePaymentMode === 'cash' ? cashReceived - total : 0;
  
  // For ORDER mode - advance calculation
  const remainingAmount = total - advanceAmount;

  // Determine bill status based on payment mode
  const getBillStatus = () => {
    if (billingMode === 'order') {
      if (orderPaymentMode === 'full_paid') return 'paid';
      if (orderPaymentMode === 'full_due') return 'pending';
      return 'partially_paid'; // advance - partially paid
    } else {
      // SALE mode
      if (salePaymentMode === 'cash') {
        if (cashReceived >= total) return 'paid';
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
      
      // Refresh inventory and bills
      refreshInventory();
      
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
    if (billingMode === 'order') {
      if (orderPaymentMode === 'full_paid') return 'Full Paid';
      if (orderPaymentMode === 'full_due') return 'Full Due';
      return `Advance: ${formatCurrency(advanceAmount)}`;
    } else {
      if (salePaymentMode === 'cash') {
        if (cashReceived >= total) return 'Full Paid';
        if (cashReceived > 0) return `Partial: ${formatCurrency(cashReceived)}, Due: ${formatCurrency(total - cashReceived)}`;
        return 'Full Due';
      }
      if (salePaymentMode === 'upi') return 'Full Paid (UPI)';
      // Due mode with partial payment
      if (salePaymentMode === 'due') {
        if (duePartialPayment >= total) return 'Full Paid';
        if (duePartialPayment > 0) return `Partial: ${formatCurrency(duePartialPayment)}, Due: ${formatCurrency(total - duePartialPayment)}`;
        return 'Full Due';
      }
      return 'Full Due';
    }
  };

  // Get status color
  const getStatusColor = () => {
    if (billingMode === 'order') {
      if (orderPaymentMode === 'full_paid') return 'text-green-600 bg-green-50';
      if (orderPaymentMode === 'full_due') return 'text-red-600 bg-red-50';
      return 'text-amber-600 bg-amber-50';
    } else {
      if (salePaymentMode === 'cash') {
        if (cashReceived >= total) return 'text-green-600 bg-green-50';
        if (cashReceived > 0) return 'text-amber-600 bg-amber-50';
        return 'text-red-600 bg-red-50';
      }
      if (salePaymentMode === 'upi') return 'text-green-600 bg-green-50';
      // Due mode with partial payment
      if (salePaymentMode === 'due') {
        if (duePartialPayment >= total) return 'text-green-600 bg-green-50';
        if (duePartialPayment > 0) return 'text-amber-600 bg-amber-50';
        return 'text-red-600 bg-red-50';
      }
      return 'text-red-600 bg-red-50';
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 no-print">
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
            <h1 className="text-2xl font-bold">New Billing</h1>
            <p className="text-slate-500 text-sm">Create a new bill</p>
          </div>
        </div>
        <button
          onClick={() => router.push('/history')}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium hover:bg-slate-50"
        >
          <Receipt className="w-4 h-4" />
          History
        </button>
      </div>

      {/* Mode Tabs: SALE / ORDER */}
      <div className="bg-white rounded-xl border border-slate-200 p-1 flex">
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column - Product Selection */}
        <div className="space-y-4">
          {/* Customer Details */}
          <div className="bg-white p-4 rounded-xl border border-slate-200">
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
          <div className="bg-white p-4 rounded-xl border border-slate-200">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold uppercase tracking-wider">Add Items</h3>
              <button
                onClick={() => setSearchQuery('')}
                className="text-xs text-primary hover:underline font-medium"
              >
                View All Products
              </button>
            </div>
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search drinks, juices, soda..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-3 py-3 bg-slate-50 border border-slate-200 rounded-lg text-sm"
              />
            </div>

            {/* Search Results / All Products */}
            {filteredProducts.length > 0 && !selectedProduct && (
              <div className="space-y-2 mb-4">
                {filteredProducts.map(product => (
                  <div
                    key={product.id}
                    onClick={() => {
                      setSelectedProduct(product);
                      setSelectedSize(product.sizes[0] || null);
                    }}
                    className="w-full p-3 text-left bg-slate-50 rounded-lg hover:bg-primary/5 transition-colors cursor-pointer"
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h4 className="font-bold text-sm">{product.name}</h4>
                        <p className="text-xs text-slate-500 mb-2">{product.brand}</p>
                        {/* Size badges - click to add directly */}
                        <div className="flex flex-wrap gap-1">
                          {product.sizes.map(size => (
                            <button
                              key={size.id}
                              onClick={(e) => {
                                e.stopPropagation();
                                // Show quick add popover with size and packaging options
                                setSelectedProduct(product);
                                setSelectedSize(size);
                                setPackaging('bottle');
                                setQuantity(1);
                              }}
                              className="bg-primary/10 text-primary border border-primary/20 hover:bg-primary hover:text-white rounded-full px-2 py-0.5 text-xs font-bold transition-colors"
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
            )}

            {/* Item Configurator */}
            {selectedProduct && selectedSize && (
              <div className="p-4 rounded-xl bg-primary/5 border border-primary/20">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h4 className="font-bold">{selectedProduct.name}</h4>
                    <p className="text-xs text-slate-500">
                      Stock: {getStockForSize(selectedProduct.id, selectedSize.id)} units
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
                      <option value="bottle">Bottle</option>
                      <option value="carton">Carton ({selectedSize.bottlesPerCarton} pcs)</option>
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
            <div className="space-y-4 mb-4 max-h-64 overflow-auto">
              {currentBill.items.length > 0 ? (
                currentBill.items.map(item => (
                  <div key={item.id} className="flex justify-between items-center">
                    <div className="flex-1">
                      <h5 className="font-medium text-sm">{item.productName} ({item.sizeName})</h5>
                      <p className="text-xs text-slate-500 italic">
                        {item.quantity} x {item.packaging}
                      </p>
                    </div>
                    <div className="text-right flex items-center gap-2">
                      <p className="font-bold text-sm">{formatCurrency(item.totalPrice)}</p>
                      <button
                        onClick={() => removeItem(item.id)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-slate-400">
                  <Receipt className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No items added</p>
                </div>
              )}
            </div>

            {/* Totals */}
            <div className="pt-4 border-t border-dashed border-slate-200 space-y-2">
              <div className="flex justify-between text-sm text-slate-600">
                <span>Subtotal</span>
                <span>{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-600 text-sm">Discount</span>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={discountValue}
                    onChange={(e) => setDiscountValue(Number(e.target.value))}
                    className="w-16 h-8 text-xs rounded border border-slate-200 bg-slate-50 text-right px-2"
                    placeholder="0"
                  />
                  <select
                    value={discountType}
                    onChange={(e) => setDiscountType(e.target.value as 'percentage' | 'flat')}
                    className="h-8 text-[10px] rounded border border-slate-200 bg-slate-50 px-2"
                  >
                    <option value="percentage">%</option>
                    <option value="flat">₹</option>
                  </select>
                </div>
              </div>
              <div className="flex justify-between text-lg font-bold pt-2">
                <span>Total Amount</span>
                <span className="text-primary">{formatCurrency(total)}</span>
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
                    className={`flex-1 py-3 border-2 rounded-xl flex flex-col items-center gap-1 transition-colors ${
                      salePaymentMode === 'cash'
                        ? 'border-primary bg-primary/10'
                        : 'border-slate-200 bg-slate-50'
                    }`}
                  >
                    <Receipt className={`w-5 h-5 ${salePaymentMode === 'cash' ? 'text-primary' : 'text-slate-400'}`} />
                    <span className={`text-[10px] font-bold uppercase ${salePaymentMode === 'cash' ? 'text-primary' : 'text-slate-400'}`}>
                      Cash
                    </span>
                  </button>
                  <button
                    onClick={() => setSalePaymentMode('upi')}
                    className={`flex-1 py-3 border-2 rounded-xl flex flex-col items-center gap-1 transition-colors ${
                      salePaymentMode === 'upi'
                        ? 'border-green-500 bg-green-50'
                        : 'border-slate-200 bg-slate-50'
                    }`}
                  >
                    <Smartphone className={`w-5 h-5 ${salePaymentMode === 'upi' ? 'text-green-500' : 'text-slate-400'}`} />
                    <span className={`text-[10px] font-bold uppercase ${salePaymentMode === 'upi' ? 'text-green-500' : 'text-slate-400'}`}>
                      UPI
                    </span>
                  </button>
                  <button
                    onClick={() => setSalePaymentMode('due')}
                    className={`flex-1 py-3 border-2 rounded-xl flex flex-col items-center gap-1 transition-colors ${
                      salePaymentMode === 'due'
                        ? 'border-red-500 bg-red-50'
                        : 'border-slate-200 bg-slate-50'
                    }`}
                  >
                    <CreditCard className={`w-5 h-5 ${salePaymentMode === 'due' ? 'text-red-500' : 'text-slate-400'}`} />
                    <span className={`text-[10px] font-bold uppercase ${salePaymentMode === 'due' ? 'text-red-500' : 'text-slate-400'}`}>
                      Due
                    </span>
                  </button>
                </div>

                {/* Cash Received Input */}
                {salePaymentMode === 'cash' && (
                  <div className="mb-4">
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Amount Received</label>
                    <input
                      type="number"
                      value={cashReceived}
                      onChange={(e) => setCashReceived(Number(e.target.value))}
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-slate-50 text-sm"
                      placeholder="Enter amount received"
                    />
                    
                    {cashReceived > 0 && (
                      <>
                        {cashReceived >= total ? (
                          <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded-lg flex items-center justify-between">
                            <span className="text-green-700 text-sm font-medium">Change Amount:</span>
                            <span className="text-green-700 text-sm font-bold">{formatCurrency(cashReceived - total)}</span>
                          </div>
                        ) : (
                          <div className="mt-2 p-2 bg-amber-50 border border-amber-200 rounded-lg">
                            <p className="text-amber-700 text-sm font-medium flex items-center gap-1">
                              <AlertTriangle className="w-4 h-4" />
                              Partial Payment
                            </p>
                            <p className="text-amber-600 text-xs mt-1">
                              Received: {formatCurrency(cashReceived)} | Outstanding: {formatCurrency(total - cashReceived)}
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
                    className={`flex-1 py-3 border-2 rounded-xl flex flex-col items-center gap-1 transition-colors ${
                      orderPaymentMode === 'full_paid'
                        ? 'border-green-500 bg-green-50'
                        : 'border-slate-200 bg-slate-50'
                    }`}
                  >
                    <Receipt className={`w-5 h-5 ${orderPaymentMode === 'full_paid' ? 'text-green-500' : 'text-slate-400'}`} />
                    <span className={`text-[10px] font-bold uppercase ${orderPaymentMode === 'full_paid' ? 'text-green-500' : 'text-slate-400'}`}>
                      Full Paid
                    </span>
                  </button>
                  <button
                    onClick={() => setOrderPaymentMode('full_due')}
                    className={`flex-1 py-3 border-2 rounded-xl flex flex-col items-center gap-1 transition-colors ${
                      orderPaymentMode === 'full_due'
                        ? 'border-red-500 bg-red-50'
                        : 'border-slate-200 bg-slate-50'
                    }`}
                  >
                    <CreditCard className={`w-5 h-5 ${orderPaymentMode === 'full_due' ? 'text-red-500' : 'text-slate-400'}`} />
                    <span className={`text-[10px] font-bold uppercase ${orderPaymentMode === 'full_due' ? 'text-red-500' : 'text-slate-400'}`}>
                      Full Due
                    </span>
                  </button>
                  <button
                    onClick={() => setOrderPaymentMode('advance')}
                    className={`flex-1 py-3 border-2 rounded-xl flex flex-col items-center gap-1 transition-colors ${
                      orderPaymentMode === 'advance'
                        ? 'border-amber-500 bg-amber-50'
                        : 'border-slate-200 bg-slate-50'
                    }`}
                  >
                    <ArrowRight className={`w-5 h-5 ${orderPaymentMode === 'advance' ? 'text-amber-500' : 'text-slate-400'}`} />
                    <span className={`text-[10px] font-bold uppercase ${orderPaymentMode === 'advance' ? 'text-amber-500' : 'text-slate-400'}`}>
                      Advance
                    </span>
                  </button>
                </div>

                {/* Advance Amount Input */}
                {orderPaymentMode === 'advance' && (
                  <div className="mb-4">
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Advance Amount</label>
                    <input
                      type="number"
                      value={advanceAmount}
                      onChange={(e) => setAdvanceAmount(Number(e.target.value))}
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-slate-50 text-sm"
                      placeholder="Enter advance amount"
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
                <span className="text-sm font-bold">Status:</span>
                <span className="text-sm font-bold">{getStatusText()}</span>
              </div>
            </div>

            {/* Submit Button */}
            <button
              onClick={handleSubmitBill}
              disabled={isSubmitting || currentBill.items.length === 0}
              className={`w-full mt-4 py-4 rounded-xl font-bold text-base flex items-center justify-center gap-3 transition-all ${
                billingMode === 'order' 
                  ? 'bg-amber-500 hover:bg-amber-600 disabled:bg-amber-300'
                  : 'bg-primary hover:bg-primary/90 disabled:bg-slate-300'
              } disabled:cursor-not-allowed text-white`}
            >
              <Printer className="w-5 h-5" />
              {isSubmitting ? 'Processing...' : billingMode === 'order' ? 'Generate Order' : 'Generate Bill'}
            </button>
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
      <QuickAddCustomerModal
        isOpen={showAddCustomerModal}
        onClose={() => setShowAddCustomerModal(false)}
        onSuccess={(customer) => {
          handleCustomerSelect(customer as CustomerWithStats);
          setShowAddCustomerModal(false);
          addToast('success', 'Customer added successfully');
        }}
      />
    </div>
  );
}
