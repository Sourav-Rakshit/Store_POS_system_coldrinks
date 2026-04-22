import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { customers, bills, customerPayments } from '@/lib/db/schema';
import { sql, eq, desc, and, count } from 'drizzle-orm';
import { CustomerType } from '@/types';

// Helper to parse decimal fields
function parseCustomer(customer: any) {
  return {
    ...customer,
    totalPurchases: parseFloat(customer.totalPurchases) || 0,
    totalPaid: parseFloat(customer.totalPaid) || 0,
    outstandingBalance: parseFloat(customer.outstandingBalance) || 0,
  };
}

// GET - All customers with stats
export async function GET() {
  try {
    console.log('🔄 Fetching customers...');

    // Get all active customers
    const allCustomers = await db
      .select()
      .from(customers)
      .where(eq(customers.isActive, true))
      .orderBy(desc(customers.createdAt));

    // Get bill counts and last purchase date for each customer
    const customersWithStats = await Promise.all(
      allCustomers.map(async (customer) => {
        // Get bill count
        const [billCountResult] = await db
          .select({ count: count() })
          .from(bills)
          .where(eq(bills.customerId, customer.id));

        // Get total bills amount
        const customerBills = await db
          .select({ totalAmount: bills.totalAmount, createdAt: bills.createdAt })
          .from(bills)
          .where(eq(bills.customerId, customer.id))
          .orderBy(desc(bills.createdAt));

        const totalBills = billCountResult?.count || 0;
        const totalAmount = customerBills.reduce((sum, b) => sum + parseFloat(b.totalAmount), 0);
        const averageBillValue = totalBills > 0 ? totalAmount / totalBills : 0;
        const lastPurchaseDate = customerBills[0]?.createdAt || null;

        return {
          ...parseCustomer(customer),
          totalBills,
          averageBillValue,
          lastPurchaseDate,
        };
      })
    );

    console.log('✅ Customers fetched:', customersWithStats.length);
    return NextResponse.json(customersWithStats);
  } catch (error) {
    console.error('❌ Customers API Error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: String(error) },
      { status: 500 }
    );
  }
}

// POST - Create customer
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, phone, email, address, notes, customerType } = body;

    // Validate required fields
    if (!name || name.trim() === '') {
      return NextResponse.json(
        { error: 'Customer name is required' },
        { status: 400 }
      );
    }

    // Check phone uniqueness if provided
    if (phone) {
      const existingCustomer = await db
        .select()
        .from(customers)
        .where(eq(customers.phone, phone));

      if (existingCustomer.length > 0) {
        return NextResponse.json(
          { error: 'A customer with this phone number already exists' },
          { status: 400 }
        );
      }
    }

    console.log('🔄 Creating customer:', name);

    const [newCustomer] = await db
      .insert(customers)
      .values({
        name: name.trim(),
        phone: phone || null,
        email: email || null,
        address: address || null,
        notes: notes || null,
        customerType: customerType || 'regular',
      })
      .returning();

    console.log('✅ Customer created:', newCustomer.id);
    return NextResponse.json(parseCustomer(newCustomer), { status: 201 });
  } catch (error) {
    console.error('❌ Customer creation error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: String(error) },
      { status: 500 }
    );
  }
}
