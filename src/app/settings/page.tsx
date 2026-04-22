'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSettingsStore } from '@/store/useSettingsStore';
import { useToast } from '@/components/Toast';
import { Settings, Store, User, Save, Download, Package, ShoppingCart, Receipt, Users, Home } from 'lucide-react';
import { downloadCSV, downloadAllData } from '@/lib/exportData';

export default function SettingsPage() {
  const router = useRouter();
  const { 
    shopName, 
    ownerName, 
    shopPhone, 
    shopAddress, 
    taxRate,
    setShopName, 
    setOwnerName, 
    setShopPhone, 
    setShopAddress, 
    setTaxRate,
    saveAllSettings,
    initialize
  } = useSettingsStore();
  const { addToast } = useToast();
  
  const [localShopName, setLocalShopName] = useState(shopName);
  const [localOwnerName, setLocalOwnerName] = useState(ownerName);
  const [localShopPhone, setLocalShopPhone] = useState(shopPhone);
  const [localShopAddress, setLocalShopAddress] = useState(shopAddress);
  const [localTaxRate, setLocalTaxRate] = useState(taxRate);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    // Initialize settings from API on mount
    initialize();
  }, [initialize]);

  useEffect(() => {
    setLocalShopName(shopName);
    setLocalOwnerName(ownerName);
    setLocalShopPhone(shopPhone);
    setLocalShopAddress(shopAddress);
    setLocalTaxRate(taxRate);
  }, [shopName, ownerName, shopPhone, shopAddress, taxRate]);

  // Update browser tab title dynamically
  useEffect(() => {
    document.title = `${shopName || 'Store'} - Settings`;
  }, [shopName]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Update store state first
      setShopName(localShopName);
      setOwnerName(localOwnerName);
      setShopPhone(localShopPhone);
      setShopAddress(localShopAddress);
      setTaxRate(localTaxRate);
      
      // Then save to API (database)
      await saveAllSettings();
      
      addToast('success', 'Settings saved successfully');
    } catch (error) {
      console.error('Error saving settings:', error);
      addToast('error', 'Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };

  const handleExport = async (type: string) => {
    try {
      await downloadCSV(type);
      addToast('success', `${type} exported successfully`);
    } catch (error) {
      console.error('Export error:', error);
      addToast('error', 'Failed to export data');
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-20 lg:pb-6 px-4">
      {/* Header */}
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
          <Settings className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h1 className="text-xl font-bold">Settings</h1>
          <p className="text-sm text-slate-500">Manage your store preferences</p>
        </div>
      </div>

      {/* Store Settings */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
        <h2 className="font-bold flex items-center gap-2">
          <Store className="w-5 h-5" />
          Store Information
        </h2>
        
        <div className="grid gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Store Name</label>
            <input
              type="text"
              value={localShopName}
              onChange={(e) => setLocalShopName(e.target.value)}
              className="w-full px-4 py-2 rounded-lg border border-slate-200 bg-slate-50 text-base"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">Owner Name</label>
            <input
              type="text"
              value={localOwnerName}
              onChange={(e) => setLocalOwnerName(e.target.value)}
              className="w-full px-4 py-2 rounded-lg border border-slate-200 bg-slate-50 text-base"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">Phone Number</label>
            <input
              type="tel"
              value={localShopPhone}
              onChange={(e) => setLocalShopPhone(e.target.value)}
              className="w-full px-4 py-2 rounded-lg border border-slate-200 bg-slate-50 text-base"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">Address</label>
            <textarea
              value={localShopAddress}
              onChange={(e) => setLocalShopAddress(e.target.value)}
              rows={2}
              className="w-full px-4 py-2 rounded-lg border border-slate-200 bg-slate-50 text-base"
            />
          </div>
        </div>
      </div>

      {/* Billing Settings */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
        <h2 className="font-bold flex items-center gap-2">
          <User className="w-5 h-5" />
          Billing Settings
        </h2>
        
        <div>
          <label className="block text-sm font-medium mb-1">Tax Rate (%)</label>
          <input
            type="number"
            value={localTaxRate}
            onChange={(e) => setLocalTaxRate(Number(e.target.value))}
            className="w-full px-4 py-2 rounded-lg border border-slate-200 bg-slate-50 text-base"
            min="0"
            max="100"
          />
          <p className="text-xs text-slate-500 mt-1">
            Tax rate to apply on bills (0-100%)
          </p>
        </div>
      </div>

      {/* Save Button */}
      <button
        onClick={handleSave}
        disabled={isSaving}
        className="w-full bg-primary hover:bg-primary/90 disabled:bg-slate-300 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-colors h-12"
      >
        <Save className="w-5 h-5" />
        {isSaving ? 'Saving...' : 'Save Settings'}
      </button>

      {/* Data Export Section */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
        <h2 className="font-bold flex items-center gap-2">
          <Download className="w-5 h-5" />
          Data Export
        </h2>
        <p className="text-sm text-slate-500">
          Download your store data as CSV files for backup or analysis
        </p>
        
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => handleExport('products')}
            className="flex items-center gap-2 px-4 py-2 border border-primary text-primary rounded-lg hover:bg-primary/5 transition-colors text-sm font-medium"
          >
            <Package className="w-4 h-4" />
            Products
          </button>
          <button
            onClick={() => handleExport('inventory')}
            className="flex items-center gap-2 px-4 py-2 border border-primary text-primary rounded-lg hover:bg-primary/5 transition-colors text-sm font-medium"
          >
            <ShoppingCart className="w-4 h-4" />
            Inventory
          </button>
          <button
            onClick={() => handleExport('bills')}
            className="flex items-center gap-2 px-4 py-2 border border-primary text-primary rounded-lg hover:bg-primary/5 transition-colors text-sm font-medium"
          >
            <Receipt className="w-4 h-4" />
            Bills
          </button>
          <button
            onClick={() => handleExport('customers')}
            className="flex items-center gap-2 px-4 py-2 border border-primary text-primary rounded-lg hover:bg-primary/5 transition-colors text-sm font-medium"
          >
            <Users className="w-4 h-4" />
            Customers
          </button>
        </div>
        
        <button
          onClick={() => {
            downloadAllData().then(() => {
              addToast('success', 'All data exported successfully');
            }).catch(() => {
              addToast('error', 'Failed to export all data');
            });
          }}
          className="w-full bg-primary hover:bg-primary/90 text-white py-2 rounded-lg font-medium flex items-center justify-center gap-2 transition-colors"
        >
          <Download className="w-4 h-4" />
          Download All Data
        </button>
      </div>
    </div>
  );
}
