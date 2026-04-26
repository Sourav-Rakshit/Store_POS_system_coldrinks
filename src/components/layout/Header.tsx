'use client';

import { useEffect, useRef, useState } from 'react';
import { Bell, Droplets, Menu, Settings, LogOut } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useSettingsStore } from '@/store/useSettingsStore';
import { usePathname, useRouter } from 'next/navigation';
import { signOut } from 'next-auth/react';
export function Header() {
  const { shopName, ownerName } = useSettingsStore();
  const [mounted, setMounted] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getInitials = () => {
    if (ownerName) {
      return ownerName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    }
    return 'FF';
  };

  const isHomePage = pathname === '/';

  const handleLogout = async () => {
    await signOut({ 
      callbackUrl: '/login',
      redirect: true 
    });
  };

  return (
    <header 
      className="
        sticky top-0 z-50 
        bg-white/80 backdrop-blur-sm 
        border-b border-slate-200 
        animate-slide-down
      "
      style={{ minHeight: '56px' }}
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
          
           <Link href="/" className="flex items-center justify-center hover:opacity-80 transition-opacity">
             <img
               src="/logo.svg"
               alt="Saikat Enterprise"
               width={150}
               height={50}
               style={{ objectFit: 'contain' }}
             />
           </Link>
        </div>

        {/* Right Side */}
        <div className="flex items-center gap-2">
          {/* Notification Bell */}
          <button className="relative p-2 text-slate-500 hover:bg-slate-100 rounded-lg transition-colors">
            <Bell className="w-5 h-5" />
            <span className="absolute top-1.5 right-1.5 size-2 bg-red-500 rounded-full border-2 border-white"></span>
          </button>

          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setIsMenuOpen((current) => !current)}
              className="size-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-sm hover:bg-primary/20 transition-colors"
            >
              {mounted ? getInitials() : 'FF'}
            </button>

            {isMenuOpen && (
              <div className="absolute right-0 mt-2 w-48 rounded-xl border border-slate-200 bg-white shadow-lg py-2 z-[120]">
                <div className="px-3 py-2 border-b border-slate-100">
                  <p className="text-sm font-semibold text-slate-900">{mounted ? ownerName || 'Owner' : 'Owner'}</p>
                  <p className="text-xs text-slate-500">Admin access</p>
                </div>
                <Link
                  href="/settings"
                  onClick={() => setIsMenuOpen(false)}
                  className="flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                >
                  <Settings className="w-4 h-4" />
                  Settings
                </Link>
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                >
                  <LogOut className="w-4 h-4" />
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
