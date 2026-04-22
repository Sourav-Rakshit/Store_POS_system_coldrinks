'use client';

import { useEffect, useState } from 'react';
import { Bell, IceCream, Menu, Settings } from 'lucide-react';
import Link from 'next/link';
import { useSettingsStore } from '@/store/useSettingsStore';
import { usePathname } from 'next/navigation';

export function Header() {
  const { shopName, ownerName } = useSettingsStore();
  const [mounted, setMounted] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setMounted(true);
  }, []);

  const getInitials = () => {
    if (ownerName) {
      return ownerName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    }
    return 'FF';
  };

  const isHomePage = pathname === '/';

  return (
    <header 
      className="
        sticky top-0 z-50 
        bg-white/80 backdrop-blur-sm 
        border-b border-slate-200 
        animate-slide-down
      "
    >
      <div className="flex items-center justify-between px-4 lg:px-8 h-16">
        {/* Left Side - Menu & Logo */}
        <div className="flex items-center gap-3">
          {/* Hamburger Menu Button */}
          <button 
            className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            onClick={() => {
              // Toggle sidebar or menu - dispatch custom event
              if (typeof window !== 'undefined') {
                window.dispatchEvent(new CustomEvent('toggle-sidebar'));
              }
            }}
          >
            <Menu className="w-5 h-5" />
          </button>
          
          {/* Tappable Logo */}
          <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
            <div className="bg-primary p-2 rounded-lg text-white">
              <IceCream className="w-5 h-5" />
            </div>
            <h1 className="text-lg font-bold text-slate-900">
              {mounted ? shopName : 'Store'}
            </h1>
          </Link>
        </div>

        {/* Right Side */}
        <div className="flex items-center gap-2">
          {/* Settings Button */}
          <Link 
            href="/settings" 
            className={`p-2 text-slate-500 hover:bg-slate-100 rounded-lg transition-colors ${
              isHomePage ? '' : 'lg:hidden'
            }`}
          >
            <Settings className="w-5 h-5" />
          </Link>
          
          {/* Notification Bell */}
          <button className="relative p-2 text-slate-500 hover:bg-slate-100 rounded-lg transition-colors">
            <Bell className="w-5 h-5" />
            <span className="absolute top-1.5 right-1.5 size-2 bg-red-500 rounded-full border-2 border-white"></span>
          </button>
          
          {/* User Avatar / Profile Button */}
          <Link 
            href="/settings" 
            className="size-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-sm hover:bg-primary/20 transition-colors"
          >
            {mounted ? getInitials() : 'FF'}
          </Link>
        </div>
      </div>
    </header>
  );
}
