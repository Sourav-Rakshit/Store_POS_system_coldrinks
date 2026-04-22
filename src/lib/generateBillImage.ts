import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

/**
 * Capture a DOM element as a base64 JPG image
 */
export async function captureReceiptAsBase64(element: HTMLElement): Promise<string> {
  try {
    const options = {
      scale: 2,
      backgroundColor: '#ffffff',
      useCORS: true,
      logging: false,
      windowWidth: 400,
    } as any;
    const canvas = await html2canvas(element, options);

    const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
    return dataUrl;
  } catch (error) {
    console.error('Error capturing receipt:', error);
    throw error;
  }
}

/**
 * Get formatted date for filename
 */
function getFormattedDate(): string {
  const date = new Date();
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}-${month}-${year}`;
}

/**
 * Download a receipt as a JPG file
 */
export async function downloadBillImage(
  element: HTMLElement,
  invoiceNumber: string
): Promise<void> {
  try {
    const dataUrl = await captureReceiptAsBase64(element);

    // Create a link element with date in filename
    const link = document.createElement('a');
    link.download = `INV-${invoiceNumber.replace('INV-', '')}-${getFormattedDate()}.jpg`;
    link.href = dataUrl;

    // Trigger download
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } catch (error) {
    console.error('Error downloading bill image:', error);
    throw error;
  }
}

/**
 * Get filename from invoice number
 */
function getFilename(invoiceNumber: string): string {
  return `INV-${invoiceNumber.replace('INV-', '')}.jpg`;
}

/**
 * Check if Web Share API is available and can be used
 */
export function canUseWebShare(): boolean {
  if (typeof navigator === 'undefined') return false;
  return typeof navigator.share === 'function' && typeof navigator.canShare === 'function';
}

/**
 * Share a receipt using Web Share API
 */
export async function shareBillImage(
  element: HTMLElement,
  invoiceNumber: string,
  shopName: string
): Promise<boolean> {
  try {
    const dataUrl = await captureReceiptAsBase64(element);

    // Convert base64 to blob
    const response = await fetch(dataUrl);
    const blob = await response.blob();

    // Create file from blob
    const file = new File([blob], getFilename(invoiceNumber), {
      type: 'image/jpeg',
    });

    // Check if sharing is supported with the file
    const shareData = {
      title: `Bill ${invoiceNumber} - ${shopName}`,
      text: `Your bill from ${shopName}. Invoice: ${invoiceNumber}`,
      files: [file],
    };

    if (navigator.canShare && navigator.canShare(shareData)) {
      await navigator.share(shareData);
      return true;
    } else {
      // Fallback to download
      await downloadBillImage(element, invoiceNumber);
      return false;
    }
  } catch (error: any) {
    // User cancelled or error - fallback to download
    if (error.name !== 'AbortError') {
      console.error('Error sharing bill:', error);
      await downloadBillImage(element, invoiceNumber);
    }
    return false;
  }
}

/**
 * Check if device is mobile
 */
export function isMobileDevice(): boolean {
  if (typeof window === 'undefined') return false;
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  );
}

/**
 * Share via WhatsApp
 * Note: WhatsApp API cannot directly attach images, so we open WhatsApp with message and download the image
 */
export async function shareViaWhatsApp(
  element: HTMLElement,
  invoiceNumber: string,
  shopName: string,
  totalAmount: number
): Promise<void> {
  try {
    // First download the image
    await downloadBillImage(element, invoiceNumber);

    // Create WhatsApp message
    const message = encodeURIComponent(
      `Your bill from ${shopName}.\nInvoice: ${invoiceNumber}\nTotal: ₹${totalAmount.toFixed(2)}`
    );

    // Open WhatsApp
    const whatsappUrl = `https://api.whatsapp.com/send?text=${message}`;
    window.open(whatsappUrl, '_blank');
  } catch (error) {
    console.error('Error sharing via WhatsApp:', error);
    throw error;
  }
}

/**
 * Download a receipt as a PDF file
 */
export async function downloadBillPDF(
  element: HTMLElement,
  invoiceNumber: string
): Promise<void> {
  try {
    const dataUrl = await captureReceiptAsBase64(element);

    // Create PDF with receipt dimensions (80mm thermal paper)
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: [80, 200], // 80mm width, variable height
    });

    // Add image to PDF
    const imgProps = pdf.getImageProperties(dataUrl);
    const pdfWidth = 80;
    const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;

    pdf.addImage(dataUrl, 'JPEG', 0, 0, pdfWidth, pdfHeight);

    // Save PDF
    pdf.save(`INV-${invoiceNumber.replace('INV-', '')}-${getFormattedDate()}.pdf`);
  } catch (error) {
    console.error('Error downloading PDF:', error);
    throw error;
  }
}
