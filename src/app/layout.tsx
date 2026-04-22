import type { Metadata, Viewport } from 'next';
import { Plus_Jakarta_Sans, JetBrains_Mono } from 'next/font/google';
import './globals.css';
import { Sidebar } from '@/components/layout/Sidebar';
import { BottomNav } from '@/components/layout/BottomNav';
import { ToastProvider } from '@/components/Toast';
import { KeyboardShortcuts } from '@/components/KeyboardShortcuts';
import { StoreInitializer } from '@/components/StoreInitializer';

const plusJakartaSans = Plus_Jakarta_Sans({ 
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({ 
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
});

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: true,
};

export const metadata: Metadata = {
  title: 'Cold Drinks POS System',
  description: 'POS & Inventory Management System',
  viewport: 'width=device-width, initial-scale=1, maximum-scale=1',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Cold Drinks POS',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${plusJakartaSans.variable} ${jetbrainsMono.variable} font-sans`}>
        <StoreInitializer />
        <ToastProvider>
          <KeyboardShortcuts />
          <div className="flex min-h-screen bg-background">
            {/* Sidebar - Desktop */}
            <Sidebar />
            
            {/* Main Content */}
            <main className="flex-1 p-4 lg:p-8 pb-28 lg:pb-8">
              {children}
            </main>
            
            {/* Bottom Navigation - Mobile */}
            <BottomNav />
          </div>
        </ToastProvider>
      </body>
    </html>
  );
}

