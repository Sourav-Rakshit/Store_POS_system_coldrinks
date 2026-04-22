import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { products, inventory, bills, billItems, customers, stockHistory } from '@/lib/db/schema';
import { desc } from 'drizzle-orm';

// Helper to generate CSV with BOM for Excel UTF-8 support
function generateCSV(headers: string[], rows: string[][]): string {
  const BOM = '\uFEFF';
  const headerRow = headers.join(',');
  const dataRows = rows.map(row => 
    row.map(cell => {
      // Escape cells that contain comma, quote, or newlines
      if (cell.includes(',') || cell.includes('"') || cell.includes('\n')) {
        return `"${cell.replace(/"/g, '""')}"`;
      }
      return cell;
    }).join(',')
  );
  return BOM + headerRow + '\n' + dataRows.join('\n');
}

// Helper to format date for filename
function getDateForFilename(): string {
  const now = new Date();
  const day = String(now.getDate()).padStart(2, '0');
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const year = now.getFullYear();
  return `${day}-${month}-${year}`;
}

// Export Products
async function exportProducts(): Promise<string> {
  const allProducts = await db.select().from(products).orderBy(desc(products.createdAt));
  
  const headers = ['Product Name', 'Brand', 'Category', 'Available Sizes', 'Created Date'];
  const rows = allProducts.map(p => [
    p.name || '',
    p.brand || '',
    p.category || '',
    '', // Sizes would need a separate query
    p.createdAt ? new Date(p.createdAt).toLocaleDateString('en-GB') : ''
  ]);
  
  return generateCSV(headers, rows);
}

// Export Inventory
async function exportInventory(): Promise<string> {
  const allInventory = await db.select().from(inventory).orderBy(inventory.skuCode);
  
  const headers = ['SKU Code', 'Product Name', 'Brand', 'Size', 'Current Stock (Bottles)', 'Current Stock (Cartons)', 'Low Stock Threshold', 'Status', 'Last Restocked'];
  const rows = allInventory.map(i => [
    i.skuCode || '',
    '', // Product name would need JOIN
    '', // Brand would need JOIN
    '', // Size would need JOIN
    String(i.currentStock || 0),
    '', // Cartons would need calculation
    String(i.lowStockThreshold || 50),
    i.status || 'Healthy',
    i.lastRestocked ? new Date(i.lastRestocked).toLocaleDateString('en-GB') : ''
  ]);
  
  return generateCSV(headers, rows);
}

// Export Bills
async function exportBills(): Promise<string> {
  const allBills = await db.select().from(bills).orderBy(desc(bills.createdAt));
  
  const headers = ['Invoice Number', 'Date', 'Customer Name', 'Customer Phone', 'Payment Mode', 'Subtotal', 'Discount', 'Total Amount', 'Status'];
  const rows = allBills.map(b => [
    b.invoiceNumber || '',
    b.createdAt ? new Date(b.createdAt).toLocaleDateString('en-GB') : '',
    b.customerName || '',
    b.customerPhone || '',
    b.paymentMode || 'Cash',
    b.subtotal || '0',
    b.discountAmount || '0',
    b.totalAmount || '0',
    b.status || 'paid'
  ]);
  
  return generateCSV(headers, rows);
}

// Export Customers
async function exportCustomers(): Promise<string> {
  const allCustomers = await db.select().from(customers).orderBy(desc(customers.createdAt));
  
  const headers = ['Name', 'Phone', 'Email', 'Address', 'Customer Type', 'Credit Limit', 'Total Purchases', 'Total Paid', 'Outstanding Balance', 'Member Since'];
  const rows = allCustomers.map(c => [
    c.name || '',
    c.phone || '',
    c.email || '',
    c.address || '',
    c.customerType || 'regular',
    String(c.totalPurchases || 0),
    String(c.totalPaid || 0),
    String(c.outstandingBalance || 0),
    c.createdAt ? new Date(c.createdAt).toLocaleDateString('en-GB') : ''
  ]);
  
  return generateCSV(headers, rows);
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'products';
    const dateFrom = searchParams.get('from');
    const dateTo = searchParams.get('to');
    
    let csvContent = '';
    let filename = '';
    const dateStr = getDateForFilename();
    
    switch (type) {
      case 'products':
        csvContent = await exportProducts();
        filename = `products-${dateStr}.csv`;
        break;
        
      case 'inventory':
        csvContent = await exportInventory();
        filename = `inventory-${dateStr}.csv`;
        break;
        
      case 'bills':
        csvContent = await exportBills();
        filename = `bills-${dateStr}.csv`;
        break;
        
      case 'customers':
        csvContent = await exportCustomers();
        filename = `customers-${dateStr}.csv`;
        break;
        
      case 'all':
        // For 'all', we'd need to return multiple CSVs - for simplicity, export products
        csvContent = await exportProducts();
        filename = `all-data-${dateStr}.csv`;
        break;
        
      default:
        return NextResponse.json({ error: 'Invalid export type' }, { status: 400 });
    }
    
    return new NextResponse(csvContent, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error('Export error:', error);
    return NextResponse.json(
      { error: 'Export failed', details: String(error) },
      { status: 500 }
    );
  }
}