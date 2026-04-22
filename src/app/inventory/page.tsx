'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useProductStore, addSampleProducts } from '@/store/useProductStore';
import { useInventoryStore } from '@/store/useInventoryStore';
import { useToast } from '@/components/Toast';
import { useRefetchOnFocus } from '@/hooks/useRefetchOnFocus';
import { DataFreshness } from '@/components/ui/DataFreshness';
import { Search, Plus, Package, AlertCircle, CheckCircle, XCircle, Filter, Pin, Trash2, Home } from 'lucide-react';
import { Product, SKU, StockStatus } from '@/types';

const PINNED_SKUS_KEY = 'frostyflow-pinned-skus';

function getPinnedSkus(): string[] {
  if (typeof window === 'undefined') return [];
  const stored = localStorage.getItem(PINNED_SKUS_KEY);
  return stored ? JSON.parse(stored) : [];
}

function setPinnedSkus(ids: string[]) {
  localStorage.setItem(PINNED_SKUS_KEY, JSON.stringify(ids));
}

export default function InventoryPage() {
  const router = useRouter();
  const { products, initializeFromStorage: initProducts } = useProductStore();
  const { 
    inventory, 
    searchQuery, 
    filterStatus,
    setSearchQuery, 
    setFilterStatus,
    addStock,
    removeSku,
    getFilteredInventory,
    getInventoryStats,
    initializeFromStorage: initInventory,
    forceRefresh,
    isLoading: inventoryLoading,
    lastSyncedAt
  } = useInventoryStore();
  const { addToast } = useToast();
  
  const [isAddStockModalOpen, setIsAddStockModalOpen] = useState(false);
  const [selectedSku, setSelectedSku] = useState<SKU | null>(null);
  const [stockQuantity, setStockQuantity] = useState(0);
  const [stockType, setStockType] = useState<'bottles' | 'cartons'>('bottles');
  const [batchId, setBatchId] = useState('');
  const [notes, setNotes] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [pinnedSkus, setPinnedSkusState] = useState<string[]>([]);
  const [deleteConfirmSku, setDeleteConfirmSku] = useState<SKU | null>(null);

  useEffect(() => {
    const initialize = async () => {
      await Promise.all([initProducts(), initInventory()]);
      setPinnedSkusState(getPinnedSkus());
      setIsLoading(false);
    };
    initialize();
  }, [initProducts, initInventory]);

  // Refetch on focus - 60 second stale time
  const handleInventoryRefetch = useCallback(() => {
    return forceRefresh();
  }, [forceRefresh]);
  
  useRefetchOnFocus({
    onRefetch: handleInventoryRefetch,
    staleTime: 60000, // 60 seconds
  });

  // Add sample products if inventory is empty
  useEffect(() => {
    if (!isLoading && products.length > 0 && inventory.length === 0) {
      addSampleProducts();
    }
  }, [isLoading, products.length, inventory.length]);

  // Get filtered and sorted inventory (pinned items first)
  const getInventoryWithPinned = () => {
    const filtered = getFilteredInventory();
    const pinned = filtered.filter(sku => pinnedSkus.includes(sku.id));
    const unpinned = filtered.filter(sku => !pinnedSkus.includes(sku.id));
    return [...pinned, ...unpinned];
  };

  const filteredInventory = getInventoryWithPinned();
  const stats = getInventoryStats();

  const getProductForSku = (productId: string) => {
    return products.find(p => p.id === productId);
  };

  const getSizeForSku = (productId: string, sizeId: string) => {
    const product = getProductForSku(productId);
    return product?.sizes.find(s => s.id === sizeId);
  };

  const handleOpenAddStock = (sku: SKU) => {
    setSelectedSku(sku);
    setStockQuantity(0);
    setStockType('bottles');
    setBatchId('');
    setNotes('');
    setIsAddStockModalOpen(true);
  };

  const handleAddStock = () => {
    if (!selectedSku || stockQuantity <= 0) {
      addToast('error', 'Please enter a valid quantity');
      return;
    }

    addStock(selectedSku.id, stockQuantity, stockType, batchId || undefined, notes || undefined);
    addToast('success', 'Stock added successfully');
    setIsAddStockModalOpen(false);
  };

  const handlePinToggle = (skuId: string) => {
    const newPinned = pinnedSkus.includes(skuId)
      ? pinnedSkus.filter(id => id !== skuId)
      : [...pinnedSkus, skuId];
    setPinnedSkusState(newPinned);
    setPinnedSkus(newPinned);
  };

  const handleDeleteSku = (sku: SKU) => {
    removeSku(sku.id);
    addToast('success', 'SKU removed from inventory');
    setDeleteConfirmSku(null);
  };

  const getStatusColor = (status: StockStatus) => {
    switch (status) {
      case 'Healthy':
        return 'bg-green-100 text-green-700';
      case 'Low Stock':
        return 'bg-amber-100 text-amber-700';
      case 'Out of Stock':
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-slate-100 text-slate-600';
    }
  };

  const getStatusIcon = (status: StockStatus) => {
    switch (status) {
      case 'Healthy':
        return CheckCircle;
      case 'Low Stock':
        return AlertCircle;
      case 'Out of Stock':
        return XCircle;
      default:
        return Package;
    }
  };

  const StatusIcon = (status: StockStatus) => {
    const Icon = getStatusIcon(status);
    return <Icon className="w-4 h-4" />;
  };

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto space-y-6 pb-20 lg:pb-6">
        <div className="skeleton h-8 w-48 rounded"></div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="skeleton h-24 rounded-xl"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-20 lg:pb-6 px-4 lg:px-0">
      {/* Header */}
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-4">
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
            <Package className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-xl lg:text-2xl font-bold">Cold Drinks Inventory</h1>
            <p className="text-sm text-slate-500">Manage your beverage stock and SKUs</p>
          </div>
        </div>
        <DataFreshness 
          lastSyncedAt={lastSyncedAt} 
          onRefresh={forceRefresh}
          isLoading={inventoryLoading}
        />
      </header>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 flex items-center gap-4">
          <div className="size-12 rounded-full bg-green-100 flex items-center justify-center text-green-600">
            <CheckCircle className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm text-slate-500">Healthy Stock</p>
            <p className="text-2xl font-bold font-mono">{stats.healthy} products</p>
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 flex items-center gap-4">
          <div className="size-12 rounded-full bg-amber-100 flex items-center justify-center text-amber-600">
            <AlertCircle className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm text-slate-500">Low Stock</p>
            <p className="text-2xl font-bold font-mono">{stats.lowStock} products</p>
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 flex items-center gap-4">
          <div className="size-12 rounded-full bg-red-100 flex items-center justify-center text-red-600">
            <XCircle className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm text-slate-500">Out of Stock</p>
            <p className="text-2xl font-bold font-mono">{stats.outOfStock} products</p>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <div className="flex flex-col gap-3">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Search SKU, brand or flavor..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-11 pr-4 py-3 h-11 rounded-lg border border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none text-base"
            />
          </div>
          <div className="flex items-center gap-2 w-full">
            <Filter className="w-5 h-5 text-slate-500" />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as typeof filterStatus)}
              className="flex-1 h-11 px-3 rounded-lg bg-white border border-slate-200 text-slate-700 text-base font-medium hover:border-primary focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none cursor-pointer"
            >
              <option value="all">All Inventory</option>
              <option value="Healthy">Healthy</option>
              <option value="Low Stock">Low Stock</option>
              <option value="Out of Stock">Out of Stock</option>
            </select>
          </div>
        </div>
      </div>

      {/* Desktop Table - Hidden on mobile */}
      <div className="hidden lg:block bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-xs font-semibold uppercase tracking-wider">
                <th className="px-6 py-4">Product</th>
                <th className="px-6 py-4">Size</th>
                <th className="px-6 py-4">Current Stock</th>
                <th className="px-6 py-4">Threshold</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredInventory.length > 0 ? (
                filteredInventory.map((sku) => {
                  const isPinned = pinnedSkus.includes(sku.id);
                  
                  return (
                    <tr key={sku.id} className={`hover:bg-slate-50 transition-colors ${isPinned ? 'bg-primary/5' : ''}`}>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="size-10 rounded bg-slate-100 flex items-center justify-center overflow-hidden">
                            {sku.imageUrl ? (
                              <img src={sku.imageUrl} alt={sku.productName} className="object-cover size-full" />
                            ) : (
                              <Package className="w-5 h-5 text-slate-400" />
                            )}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-semibold text-sm">{sku.productName || 'Unknown'}</p>
                              {isPinned && (
                                <span className="size-5 rounded-full bg-primary/10 flex items-center justify-center">
                                  <Pin className="w-3 h-3 text-primary fill-current" />
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-slate-500">{sku.brand || 'Unknown'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm">{sku.sizeName || 'Unknown'}</td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="text-sm font-bold font-mono">{sku.currentStock} Bottles</span>
                          {sku.bottlesPerCarton && (
                            <span className="text-xs text-slate-400 font-mono">
                              {Math.floor(sku.currentStock / sku.bottlesPerCarton)} Cartons
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-500 font-mono">{sku.lowStockThreshold} Bottles</td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(sku.status)}`}>
                          {StatusIcon(sku.status)}
                          {sku.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handlePinToggle(sku.id)}
                            className={`p-2 rounded-lg transition-colors ${isPinned ? 'bg-primary text-white' : 'text-slate-400 hover:text-primary hover:bg-primary/5'}`}
                            title={isPinned ? 'Unpin' : 'Pin to top'}
                          >
                            <Pin className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() => setDeleteConfirmSku(sku)}
                            className="p-2 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                            title="Delete SKU"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() => handleOpenAddStock(sku)}
                            className="px-4 py-2 rounded-lg border border-primary text-primary hover:bg-primary hover:text-white transition-colors text-sm font-medium"
                          >
                            + Add Stock
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                    <Package className="w-12 h-12 mx-auto mb-2" />
                    <p>No inventory items found</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
          <p className="text-sm text-slate-500">
            Showing {filteredInventory.length} of {inventory.length} SKUs
          </p>
        </div>
      </div>

      {/* Mobile Card Layout - Visible only on mobile */}
      <div className="lg:hidden space-y-3">
        {filteredInventory.length > 0 ? (
          filteredInventory.map((sku) => {
            const isPinned = pinnedSkus.includes(sku.id);
            
            return (
              <div key={sku.id} className={`bg-white rounded-xl border border-slate-200 p-4 ${isPinned ? 'bg-primary/5 border-primary/20' : ''}`}>
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="size-12 rounded bg-slate-100 flex items-center justify-center overflow-hidden">
                      {sku.imageUrl ? (
                        <img src={sku.imageUrl} alt={sku.productName} className="object-cover size-full" />
                      ) : (
                        <Package className="w-6 h-6 text-slate-400" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-base font-semibold">{sku.productName || 'Unknown'}</p>
                        {isPinned && (
                          <span className="size-5 rounded-full bg-primary/10 flex items-center justify-center">
                            <Pin className="w-3 h-3 text-primary fill-current" />
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-slate-500">{sku.brand || 'Unknown'}</p>
                    </div>
                  </div>
                  <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(sku.status)}`}>
                    {StatusIcon(sku.status)}
                    {sku.status}
                  </span>
                </div>
                
                <div className="flex items-center gap-4 mb-4">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-slate-500">Size:</span>
                    <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-medium">{sku.sizeName || 'Unknown'}</span>
                  </div>
                  <div className="flex-1">
                    <span className="text-lg font-bold font-mono">{sku.currentStock}</span>
                    <span className="text-sm text-slate-500"> bottles</span>
                    {sku.bottlesPerCarton && (
                      <span className="text-xs text-slate-400 font-mono"> ({Math.floor(sku.currentStock / sku.bottlesPerCarton)} cartons)</span>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleOpenAddStock(sku)}
                    className="flex-1 h-11 rounded-lg border border-primary text-primary hover:bg-primary hover:text-white transition-colors text-sm font-medium flex items-center justify-center gap-1"
                  >
                    <Plus className="w-4 h-4" />
                    Add Stock
                  </button>
                  <button
                    onClick={() => handlePinToggle(sku.id)}
                    className={`h-11 px-4 rounded-lg transition-colors flex items-center justify-center ${isPinned ? 'bg-primary text-white' : 'border border-slate-200 text-slate-400 hover:text-primary hover:border-primary'}`}
                    title={isPinned ? 'Unpin' : 'Pin to top'}
                  >
                    <Pin className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => setDeleteConfirmSku(sku)}
                    className="h-11 px-4 rounded-lg border border-slate-200 text-slate-400 hover:text-red-500 hover:border-red-300 transition-colors flex items-center justify-center"
                    title="Delete SKU"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
            );
          })
        ) : (
          <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-400">
            <Package className="w-16 h-16 mx-auto mb-3" />
            <p className="text-base">No inventory items found</p>
          </div>
        )}
        
        {/* Mobile Pagination */}
        <div className="p-4 bg-white rounded-xl border border-slate-200">
          <p className="text-sm text-slate-500 text-center">
            Showing {filteredInventory.length} of {inventory.length} SKUs
          </p>
        </div>
      </div>

      {/* Add Stock Modal */}
      {isAddStockModalOpen && selectedSku && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
              <h3 className="text-lg font-bold">Add Stock</h3>
              <button
                onClick={() => setIsAddStockModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                ✕
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase mb-1">Product</p>
                <p className="font-medium text-base">
                  {selectedSku.productName || 'Unknown'} - {selectedSku.sizeName || 'Unknown'}
                </p>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase mb-1">Quantity</label>
                <input
                  type="number"
                  value={stockQuantity}
                  onChange={(e) => setStockQuantity(Number(e.target.value))}
                  className="w-full p-3 rounded-lg border border-slate-200 bg-white outline-none focus:ring-2 focus:ring-primary/20 text-base"
                  placeholder="Enter quantity"
                  min="1"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase mb-1">Type</label>
                <select
                  value={stockType}
                  onChange={(e) => setStockType(e.target.value as 'bottles' | 'cartons')}
                  className="w-full p-3 rounded-lg border border-slate-200 bg-white outline-none focus:ring-2 focus:ring-primary/20 text-base"
                >
                  <option value="bottles">Bottles</option>
                  <option value="cartons">Cartons</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase mb-1">Batch ID (Optional)</label>
                <input
                  type="text"
                  value={batchId}
                  onChange={(e) => setBatchId(e.target.value)}
                  className="w-full p-3 rounded-lg border border-slate-200 bg-white outline-none focus:ring-2 focus:ring-primary/20 text-base"
                  placeholder="#BT-1234"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase mb-1">Notes (Optional)</label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full p-3 rounded-lg border border-slate-200 bg-white outline-none focus:ring-2 focus:ring-primary/20 text-base"
                  placeholder="Any additional notes..."
                />
              </div>
            </div>
            <div className="p-6 bg-slate-50 flex gap-3">
              <button
                onClick={() => setIsAddStockModalOpen(false)}
                className="flex-1 h-12 rounded-lg font-bold border border-slate-200 hover:bg-white transition-colors text-base"
              >
                Cancel
              </button>
              <button
                onClick={handleAddStock}
                className="flex-1 h-12 rounded-lg font-bold bg-primary text-white hover:bg-primary/90 transition-colors text-base"
              >
                Confirm Restock
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmSku && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden p-6">
            <div className="text-center">
              <div className="size-14 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
                <Trash2 className="w-7 h-7 text-red-600" />
              </div>
              <h3 className="text-lg font-bold mb-2">Delete SKU?</h3>
              <p className="text-sm text-slate-500 mb-6">
                Are you sure you want to remove this SKU from inventory? This action cannot be undone.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setDeleteConfirmSku(null)}
                  className="flex-1 h-12 rounded-lg font-bold border border-slate-200 hover:bg-slate-50 transition-colors text-base"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleDeleteSku(deleteConfirmSku)}
                  className="flex-1 h-12 rounded-lg font-bold bg-red-500 text-white hover:bg-red-600 transition-colors text-base"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
