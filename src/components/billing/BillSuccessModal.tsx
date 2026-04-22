'use client';

import { useState, useRef, useEffect } from 'react';
import { Bill, StoreSettings } from '@/types';
import { ThermalReceipt } from './ThermalReceipt';
import { 
  captureReceiptAsBase64, 
  downloadBillImage, 
  shareBillImage,
  shareViaWhatsApp,
  openTinyPrintApp
} from '@/lib/generateBillImage';
import { useToast } from '@/components/Toast';
import { Check, Download, Share2, MessageCircle, Printer, X, Loader2 } from 'lucide-react';

interface BillSuccessModalProps {
  bill: Bill;
  settings: StoreSettings;
  isOpen: boolean;
  onClose: () => void;
  onNewBill: () => void;
}

export function BillSuccessModal({ 
  bill, 
  settings, 
  isOpen, 
  onClose, 
  onNewBill 
}: BillSuccessModalProps) {
  const receiptRef = useRef<HTMLDivElement>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [isWhatsapping, setIsWhatsapping] = useState(false);
  const [isTinyPrinting, setIsTinyPrinting] = useState(false);
  const { addToast } = useToast();

  // Get shop details for sharing
  const shopName = settings.shopName || 'My Store';

  // Reset loading states when modal opens
  useEffect(() => {
    if (isOpen) {
      setIsCapturing(false);
      setIsDownloading(false);
      setIsSharing(false);
      setIsWhatsapping(false);
    }
  }, [isOpen]);

  const handleDownload = async () => {
    if (!receiptRef.current) return;
    
    setIsDownloading(true);
    try {
      await downloadBillImage(receiptRef.current, bill.invoiceNumber);
      addToast('success', 'Bill downloaded successfully');
    } catch (error) {
      console.error('Download error:', error);
      addToast('error', 'Failed to download bill');
    } finally {
      setIsDownloading(false);
    }
  };

  const handleShare = async () => {
    if (!receiptRef.current) return;
    
    setIsSharing(true);
    try {
      const success = await shareBillImage(receiptRef.current, bill.invoiceNumber, shopName);
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
    if (!receiptRef.current) return;
    
    setIsWhatsapping(true);
    try {
      // First capture as base64 to download
      const base64 = await captureReceiptAsBase64(receiptRef.current);
      
      // Download the image
      const link = document.createElement('a');
      link.download = `${bill.invoiceNumber}.jpg`;
      link.href = base64;
      link.click();
      
      // Open WhatsApp with message
      const message = encodeURIComponent(
        `Your bill from ${shopName}.\nInvoice: ${bill.invoiceNumber}\nTotal: ₹${Number(bill.totalAmount).toFixed(2)}`
      );
      const whatsappUrl = `https://api.whatsapp.com/send?text=${message}`;
      window.open(whatsappUrl, '_blank');
      
      addToast('info', 'Bill image downloaded — please attach it manually in WhatsApp');
    } catch (error) {
      console.error('WhatsApp error:', error);
      addToast('error', 'Failed to share via WhatsApp');
    } finally {
      setIsWhatsapping(false);
    }
  };

   const handleTinyPrint = async () => {
     if (!receiptRef.current) return;
     
     setIsTinyPrinting(true);
     try {
       // Download the bill first
       await downloadBillImage(receiptRef.current, bill.invoiceNumber);
       // Open TinyPrint app
       await openTinyPrintApp();
       addToast('success', 'Bill downloaded. Open TinyPrint to print.');
     } catch (error) {
       console.error('TinyPrint error:', error);
       addToast('error', 'Failed to open TinyPrint');
     } finally {
       setIsTinyPrinting(false);
     }
   };

  const handleNewBill = () => {
    onNewBill();
    onClose();
  };

  if (!isOpen) return null;

  const isAnyLoading = isDownloading || isSharing || isWhatsapping || isTinyPrinting;

  return (
    <>
      {/* Off-screen receipt for html2canvas capture */}
      <div 
        ref={receiptRef}
        style={{ 
          position: 'absolute', 
          left: '-9999px', 
          top: '-9999px',
          zIndex: -1 
        }}
      >
        <ThermalReceipt bill={bill} settings={settings} />
      </div>

      {/* Modal Overlay */}
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        {/* Modal Content */}
        <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-200">
          {/* Header */}
          <div className="p-6 text-center border-b border-slate-100">
            {/* Animated Green Checkmark */}
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4 animate-in zoom-in duration-300">
              <Check className="w-10 h-10 text-green-600" strokeWidth={3} />
            </div>
            
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Bill Generated!</h2>
            
            {/* Invoice Number */}
            <p className="font-mono text-green-600 font-medium text-lg">
              {bill.invoiceNumber}
            </p>
            
            {/* Customer Name */}
            {bill.customerName && (
              <p className="text-slate-500 text-sm mt-1">
                Customer: {bill.customerName}
              </p>
            )}
            
            {/* Total Amount */}
            <p className="text-3xl font-bold font-mono text-slate-900 mt-4">
              ₹{Number(bill.totalAmount).toFixed(2)}
            </p>
            
            {/* Payment Status */}
            {bill.status === 'partially_paid' && (
              <div className="mt-3 p-2 bg-amber-50 border border-amber-200 rounded-lg">
                <p className="text-amber-700 text-sm font-medium">
                  Partially Paid
                </p>
                <p className="text-amber-600 text-xs">
                  Outstanding: ₹{((Number(bill.totalAmount) || 0) - (Number(bill.cashReceived) || 0)).toFixed(2)}
                </p>
              </div>
            )}
            {bill.status === 'pending' && bill.paymentMode === 'Credit' && (
              <div className="mt-3 p-2 bg-amber-50 border border-amber-200 rounded-lg">
                <p className="text-amber-700 text-sm font-medium">
                  Credit / Pending Payment
                </p>
                <p className="text-amber-600 text-xs">
                  Full amount added to customer balance
                </p>
              </div>
            )}
          </div>

          {/* Receipt Preview */}
          <div className="p-4 border-b border-slate-100 bg-slate-50">
            <div className="scale-50 origin-top -mx-16 -mb-8">
              <ThermalReceipt bill={bill} settings={settings} />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="p-4 space-y-3">
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

             {/* Print Button - Shares to TinyPrint */}
             <button
               onClick={handleTinyPrint}
               disabled={isAnyLoading}
               className="w-full flex items-center justify-center gap-2 border-2 border-slate-200 hover:border-slate-300 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed py-3 px-4 rounded-xl font-bold text-slate-700 transition-colors"
             >
               {isTinyPrinting ? (
                 <Loader2 className="w-5 h-5 animate-spin" />
               ) : (
                 <Printer className="w-5 h-5" />
               )}
               Print
             </button>

            {/* New Bill - Ghost */}
            <button
              onClick={handleNewBill}
              disabled={isAnyLoading}
              className="w-full flex items-center justify-center gap-2 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed py-3 px-4 rounded-xl font-bold text-slate-500 transition-colors"
            >
              <X className="w-5 h-5" />
              New Bill
            </button>
          </div>
        </div>
      </div>

      {/* Print Styles - Only show receipt when printing */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #print-receipt, #print-receipt * {
            visibility: visible;
          }
          #print-receipt {
            position: absolute;
            left: 0;
            top: 0;
            width: 400px;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>
    </>
  );
}
