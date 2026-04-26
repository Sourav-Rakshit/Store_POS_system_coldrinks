import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { inventory, products, productSizes } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';

export async function GET() {
  try {
    console.log('🔄 Fetching inventory with JOIN...');
    
    // Get all products and their sizes
    const allProducts = await db.select().from(products);
    const allSizes = await db.select().from(productSizes);
    const allInventory = await db.select().from(inventory);
    
    // Build inventory items for ALL products/sizes
    // If no inventory exists for a product size, create a placeholder with 0 stock
    const inventoryWithDetails = [];
    
    for (const product of allProducts) {
      const productSizesList = allSizes.filter(size => size.productId === product.id);
      
      for (const size of productSizesList) {
        const existingInventory = allInventory.find(inv => inv.productSizeId === size.id);
        
        if (existingInventory) {
          // Use existing inventory
          inventoryWithDetails.push({
            id: existingInventory.id,
            skuCode: existingInventory.skuCode,
            currentStock: existingInventory.currentStock,
            lowStockThreshold: existingInventory.lowStockThreshold,
            status: existingInventory.status,
            isPinned: existingInventory.isPinned,
            pinnedAt: existingInventory.pinnedAt,
            lastRestocked: existingInventory.lastRestocked,
            productSizeId: existingInventory.productSizeId,
            sizeId: existingInventory.productSizeId,
            productId: product.id,
            sizeName: size.sizeName,
            pricePerBottle: size.pricePerBottle,
            pricePerCarton: size.pricePerCarton,
            bottlesPerCarton: size.bottlesPerCarton,
            productName: product.name,
            brand: product.brand,
            category: product.category,
            imageUrl: product.imageUrl,
          });
        } else {
          // Create placeholder with 0 stock for products without inventory
          const skuCode = `${product.brand.substring(0, 3).toUpperCase()}-${product.name.substring(0, 3).toUpperCase()}-${size.sizeName.replace(/[^a-zA-Z0-9]/g, '').toUpperCase()}-AUTO`;
          
          inventoryWithDetails.push({
            id: `placeholder-${size.id}`,
            skuCode: skuCode,
            currentStock: 0,
            lowStockThreshold: 50,
            status: 'Out of Stock',
            isPinned: false,
            pinnedAt: null,
            lastRestocked: null,
            productSizeId: size.id,
            sizeId: size.id,
            productId: product.id,
            sizeName: size.sizeName,
            pricePerBottle: size.pricePerBottle,
            pricePerCarton: size.pricePerCarton,
            bottlesPerCarton: size.bottlesPerCarton,
            productName: product.name,
            brand: product.brand,
            category: product.category,
            imageUrl: product.imageUrl,
          });
        }
      }
    }
    
    console.log('📦 Inventory count:', inventoryWithDetails.length);
    const thumpsUp = inventoryWithDetails.find(i => i.productName?.toLowerCase().includes('thumps up') && i.sizeName?.includes('400ml'));
    if (thumpsUp) {
      console.log('🔍 DEBUG: Thumps Up 400ml stock fetch:', thumpsUp);
    }
    console.log('✅ Inventory fetched successfully with JOIN');
    return NextResponse.json(inventoryWithDetails);
  } catch (error) {
    console.error('❌ Inventory API Error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: String(error) },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { id, productId, sizeId, skuCode, currentStock, lowStockThreshold } = body;
    
    if (!id || !productId || !sizeId || !skuCode) {
      return NextResponse.json(
        { error: 'Missing required fields: id, productId, sizeId, skuCode' },
        { status: 400 }
      );
    }
    
    // Check if inventory item already exists
    const [existing] = await db.select().from(inventory).where(
      // @ts-ignore
      inventory.id.eq(id)
    );
    
    if (existing) {
      return NextResponse.json({ error: 'Inventory item already exists' }, { status: 409 });
    }
    
    // Create new inventory item
    const [newInventory] = await db.insert(inventory).values({
      id,
      productSizeId: sizeId, // Map from frontend's sizeId to database's productSizeId
      skuCode,
      currentStock: currentStock || 0,
      lowStockThreshold: lowStockThreshold || 50,
      status: (currentStock || 0) > (lowStockThreshold || 50) ? 'Healthy' : 'Low Stock',
    }).returning();
    
    return NextResponse.json(newInventory, { status: 201 });
  } catch (error) {
    console.error('❌ Error creating inventory:', error);
    return NextResponse.json(
      { error: 'Failed to create inventory item', details: String(error) },
      { status: 500 }
    );
  }
}
