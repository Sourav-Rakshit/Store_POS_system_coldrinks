'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useProductStore, addSampleProducts } from '@/store/useProductStore';
import { useInventoryStore } from '@/store/useInventoryStore';
import { useToast } from '@/components/Toast';
import { useRefetchOnFocus } from '@/hooks/useRefetchOnFocus';
import { formatCurrency } from '@/lib/utils';
import { Search, Plus, Edit, Trash2, Package, ImagePlus, Coffee, Droplets, Zap, Droplet, Beer, Home, LayoutDashboard } from 'lucide-react';
import { Product, ProductCategory, ProductSize } from '@/types';

const iconOptions = [
  { name: 'None', icon: null },
  { name: 'Coffee', icon: Coffee },
  { name: 'Droplets', icon: Droplets },
  { name: 'Zap', icon: Zap },
  { name: 'Droplet', icon: Droplet },
  { name: 'Beer', icon: Beer },
];

const categories: ProductCategory[] = ['All', 'Soft Drinks', 'Juices', 'Energy Drinks', 'Water', 'Others'];

export default function ProductsPage() {
  const router = useRouter();
  const { 
    products, 
    searchQuery, 
    selectedCategory,
    setSearchQuery, 
    setSelectedCategory, 
    addProduct,
    updateProduct,
    deleteProduct,
    getFilteredProducts,
    initializeFromStorage,
    forceRefresh: refreshProducts
  } = useProductStore();
  const { forceRefresh: refreshInventory } = useInventoryStore();
  const { addToast } = useToast();
  
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    brand: '',
    category: 'Sodas' as ProductCategory,
    icon: '' as string | null,
    sizes: [] as ProductSize[],
  });

  useEffect(() => {
    initializeFromStorage();
    setIsLoading(false);
  }, [initializeFromStorage]);

  // Refetch on focus
  const handleProductsRefetch = useCallback(() => {
    return refreshProducts();
  }, [refreshProducts]);
  
  useRefetchOnFocus({
    onRefetch: handleProductsRefetch,
    staleTime: 60000, // 60 seconds
  });

  // Add sample products if empty
  useEffect(() => {
    if (!isLoading && products.length === 0) {
      addSampleProducts();
      addToast('info', 'Sample products added');
    }
  }, [isLoading, products.length]);

  const filteredProducts = getFilteredProducts();

  const handleOpenAddModal = () => {
    setFormData({
      name: '',
      brand: '',
      category: 'Soft Drinks',
      icon: null,
      sizes: [{ id: crypto.randomUUID(), name: '500ml', pricePerBottle: 0, pricePerCarton: 0, bottlesPerCarton: 12 }],
    });
    setEditingProduct(null);
    setIsAddModalOpen(true);
  };

  const handleOpenEditModal = (product: Product) => {
    setFormData({
      name: product.name,
      brand: product.brand,
      category: product.category,
      icon: product.icon || null,
      sizes: [...product.sizes],
    });
    setEditingProduct(product);
    setIsAddModalOpen(true);
  };

  const handleDeleteProduct = async (id: string) => {
    if (confirm('Are you sure you want to delete this product?')) {
      await deleteProduct(id);
      // Refresh both products and inventory after delete
      await Promise.all([refreshProducts(), refreshInventory()]);
      addToast('success', 'Product deleted');
    }
  };

  const handleAddSize = () => {
    setFormData({
      ...formData,
      sizes: [
        ...formData.sizes,
        { id: crypto.randomUUID(), name: '', pricePerBottle: 0, pricePerCarton: 0, bottlesPerCarton: 12 }
      ],
    });
  };

  const handleRemoveSize = (index: number) => {
    const newSizes = formData.sizes.filter((_, i) => i !== index);
    setFormData({ ...formData, sizes: newSizes });
  };

  const handleSizeChange = (index: number, field: keyof ProductSize, value: string | number) => {
    const newSizes = [...formData.sizes];
    newSizes[index] = { ...newSizes[index], [field]: value };
    setFormData({ ...formData, sizes: newSizes });
  };

  const handleIconChange = (iconName: string | null) => {
    setFormData({ ...formData, icon: iconName });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.brand || formData.sizes.length === 0) {
      addToast('error', 'Please fill in all required fields');
      return;
    }

    if (editingProduct) {
      await updateProduct(editingProduct.id, formData);
      addToast('success', 'Product updated');
    } else {
      await addProduct(formData);
      addToast('success', 'Product added');
    }

    // Refresh both products and inventory after add/edit
    await Promise.all([refreshProducts(), refreshInventory()]);

    setIsAddModalOpen(false);
    setEditingProduct(null);
  };

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex justify-between items-center">
          <div className="skeleton h-8 w-32 rounded"></div>
          <div className="skeleton h-10 w-32 rounded-lg"></div>
        </div>
        <div className="grid gap-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="skeleton h-32 rounded-xl"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
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
            <h1 className="text-2xl md:text-3xl font-bold">Products</h1>
            <p className="text-slate-500 text-sm">Manage your cold drink products and pricing.</p>
          </div>
        </div>
        <button
          onClick={handleOpenAddModal}
          className="flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 text-white px-5 py-2.5 rounded-lg font-semibold transition-colors shadow-sm"
        >
          <Plus className="w-5 h-5" />
          Add Product
        </button>
      </header>

      {/* Search and Filter */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search products, brands, or sizes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white bg-slate-800 border border-slate-200 border-slate-700 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
          />
        </div>
      </div>

      {/* Category Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {categories.map((category) => (
          <button
            key={category}
            onClick={() => setSelectedCategory(category)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
              selectedCategory === category
                ? 'bg-primary text-white'
                : 'bg-white bg-slate-800 border border-slate-200 border-slate-700 text-slate-600 text-slate-300 hover:border-primary'
            }`}
          >
            {category}
          </button>
        ))}
      </div>

      {/* Products List */}
      <div className="grid gap-4">
        {filteredProducts.length > 0 ? (
          filteredProducts.map((product) => (
            <div
              key={product.id}
              className="bg-white bg-slate-800 border border-slate-200 border-slate-700 rounded-xl p-4 flex items-start sm:items-center gap-5 hover:shadow-md transition-shadow"
            >
              {/* Product Icon */}
              <div
                className="w-20 h-20 rounded-lg bg-slate-100 bg-slate-700 flex-shrink-0 flex items-center justify-center"
              >
                {product.icon && (() => {
                  const IconComponent = iconOptions.find(i => i.name === product.icon)?.icon;
                  return IconComponent ? <IconComponent className="w-8 h-8 text-slate-400" /> : <Package className="w-8 h-8 text-slate-400" />;
                })()}
                {!product.icon && (
                  <Package className="w-8 h-8 text-slate-400" />
                )}
              </div>

              {/* Product Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <h3 className="text-lg font-bold truncate">{product.name}</h3>
                  <div className="flex gap-1">
                    <button
                      onClick={() => handleOpenEditModal(product)}
                      className="p-2 text-slate-400 hover:text-primary transition-colors"
                    >
                      <Edit className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => handleDeleteProduct(product.id)}
                      className="p-2 text-slate-400 hover:text-red-500 transition-colors"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
                <p className="text-sm text-slate-500 text-slate-400 mb-2">
                  Brand: <span className="font-medium">{product.brand}</span>
                </p>
                <div className="flex flex-wrap items-center gap-y-2 gap-x-6">
                  <div className="flex flex-col">
                    <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Available Sizes</span>
                    <span className="text-sm text-slate-600 text-slate-300">
                      {product.sizes.map(s => s.name).join(', ')}
                    </span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Pricing</span>
                    <div className="flex gap-3 text-sm font-medium">
                      <span className="text-slate-700 text-slate-200">
                        Bottle: <span className="text-primary">₹{product.sizes[0]?.pricePerBottle}</span>
                      </span>
                      <span className="text-slate-700 text-slate-200">
                        Carton: <span className="text-primary">₹{product.sizes[0]?.pricePerCarton}</span>
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-12 bg-white bg-slate-800 rounded-xl border border-slate-200 border-slate-700">
            <Package className="w-12 h-12 mx-auto mb-2 text-slate-400" />
            <p className="text-slate-500">No products found</p>
            <button
              onClick={handleOpenAddModal}
              className="mt-4 text-primary font-medium hover:underline"
            >
              Add your first product
            </button>
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center flex-shrink-0">
              <h2 className="text-lg font-semibold text-slate-900">
                {editingProduct ? 'Edit Product' : 'Add New Product'}
              </h2>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg p-1 transition-colors"
              >
                ✕
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto flex-1">
              {/* Icon Selection */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-3">Select Icon</label>
                <div className="flex flex-wrap gap-3">
                  {iconOptions.map((option) => {
                    const IconComponent = option.icon;
                    const isSelected = formData.icon === option.name;
                    return (
                      <button
                        key={option.name}
                        type="button"
                        onClick={() => handleIconChange(option.name === 'None' ? null : option.name)}
                        className={`w-14 h-14 rounded-xl border-2 flex items-center justify-center transition-all ${
                          isSelected
                            ? 'border-primary bg-primary/10'
                            : 'border-slate-200 bg-slate-50 hover:border-primary/50'
                        }`}
                      >
                        {IconComponent ? (
                          <IconComponent className={`w-6 h-6 ${isSelected ? 'text-primary' : 'text-slate-400'}`} />
                        ) : (
                          <span className={`text-xs ${isSelected ? 'text-primary' : 'text-slate-400'}`}>None</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Name and Brand */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">Product Name</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full h-11 px-3 rounded-lg border border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                    placeholder="e.g., Coca-Cola"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">Brand</label>
                  <input
                    type="text"
                    value={formData.brand}
                    onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                    className="w-full h-11 px-3 rounded-lg border border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                    placeholder="e.g., Coca-Cola Co."
                    required
                  />
                </div>
              </div>

              {/* Category */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">Category</label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value as ProductCategory })}
                  className="w-full h-11 px-3 rounded-lg border border-slate-200 bg-white text-slate-900 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                >
                  {categories.filter(c => c !== 'All').map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              {/* Sizes */}
              <div>
                <div className="flex justify-between items-center mb-3">
                  <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">Sizes & Pricing</label>
                  <button
                    type="button"
                    onClick={handleAddSize}
                    className="text-primary text-sm font-medium hover:underline"
                  >
                    + Add Size
                  </button>
                </div>
                <div className="space-y-3">
                  {formData.sizes.map((size, index) => (
                    <div key={size.id} className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                      {/* Quick select chips */}
                      <div className="flex flex-wrap gap-1.5 mb-4">
                        {['250ml', '330ml', '500ml', '600ml', '1L', '1.25L', '1.5L', '2L', '2.25L'].map((preset) => (
                          <button
                            key={preset}
                            type="button"
                            onClick={() => handleSizeChange(index, 'name', preset)}
                            className={`px-3 py-1 text-xs font-medium rounded-full transition-all ${
                              size.name === preset
                                ? 'bg-primary text-white border-primary'
                                : 'bg-slate-100 text-slate-600 border border-slate-200 hover:border-primary hover:text-primary'
                            }`}
                          >
                            {preset}
                          </button>
                        ))}
                      </div>

                      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                        <div>
                          <label className="block text-[10px] uppercase tracking-wider text-slate-400 font-bold mb-1">Size</label>
                          <input
                            type="text"
                            value={size.name}
                            onChange={(e) => handleSizeChange(index, 'name', e.target.value)}
                            className="w-full h-11 px-3 rounded-lg border border-slate-200 bg-white text-slate-900 text-sm placeholder:text-slate-400 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                            placeholder="500ml"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] uppercase tracking-wider text-slate-400 font-bold mb-1">Price/Bottle ₹</label>
                          <input
                            type="number"
                            value={size.pricePerBottle}
                            onChange={(e) => handleSizeChange(index, 'pricePerBottle', Number(e.target.value))}
                            className="w-full h-11 px-3 rounded-lg border border-slate-200 bg-white text-slate-900 text-sm placeholder:text-slate-400 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                            placeholder="20"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] uppercase tracking-wider text-slate-400 font-bold mb-1">Price/Carton ₹</label>
                          <input
                            type="number"
                            value={size.pricePerCarton}
                            onChange={(e) => handleSizeChange(index, 'pricePerCarton', Number(e.target.value))}
                            className="w-full h-11 px-3 rounded-lg border border-slate-200 bg-white text-slate-900 text-sm placeholder:text-slate-400 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                            placeholder="220"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] uppercase tracking-wider text-slate-400 font-bold mb-1">Bottles/Carton</label>
                          <input
                            type="number"
                            value={size.bottlesPerCarton}
                            onChange={(e) => handleSizeChange(index, 'bottlesPerCarton', Number(e.target.value))}
                            className="w-full h-11 px-3 rounded-lg border border-slate-200 bg-white text-slate-900 text-sm placeholder:text-slate-400 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                            placeholder="12"
                            required
                          />
                        </div>
                      </div>

                      {formData.sizes.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveSize(index)}
                          className="text-red-500 text-xs hover:underline mt-3"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </form>

            {/* Actions - Sticky Footer */}
            <div className="p-6 bg-white border-t border-slate-100 flex justify-end gap-3 flex-shrink-0">
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="px-5 py-2.5 text-sm font-medium text-slate-600 border border-slate-200 bg-white hover:bg-slate-50 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                onClick={handleSubmit}
                className="px-6 py-2.5 bg-primary text-white text-sm font-semibold rounded-lg shadow-md hover:bg-primary/90 transition-colors"
              >
                {editingProduct ? 'Update Product' : 'Save Product'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

