import type { Metadata, Viewport } from 'next';
import { Plus_Jakarta_Sans, JetBrains_Mono } from 'next/font/google';
import './globals.css';
import { ToastProvider } from '@/components/Toast';
import { AppShell } from '@/components/layout/AppShell';
import { SessionProvider } from '@/components/SessionProvider';

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
  userScalable: false,
};

export const metadata: Metadata = {
  title: 'Cold Drinks POS System',
  description: 'POS & Inventory Management System',
  
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
      <body className={`${plusJakartaSans.variable} ${jetbrainsMono.variable} font-sans overflow-x-hidden`}>
        <SessionProvider>
          <ToastProvider>
            <AppShell>{children}</AppShell>
          </ToastProvider>
        </SessionProvider>
      </body>
    </html>
  );
}

