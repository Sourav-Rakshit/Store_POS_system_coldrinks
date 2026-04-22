-- ============================================================================
-- FROSTYFLOW POS - PostgreSQL Schema for Neon Database
-- ============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- SETTINGS TABLE
-- ============================================================================
CREATE TABLE settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shop_name VARCHAR(255) NOT NULL DEFAULT 'FrostyFlow',
    owner_name VARCHAR(255),
    shop_phone VARCHAR(50),
    shop_address TEXT,
    tax_rate DECIMAL(5,2) DEFAULT 0,
    currency VARCHAR(10) DEFAULT 'INR',
    low_stock_default_threshold INTEGER DEFAULT 50,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default settings row
INSERT INTO settings (id, shop_name) VALUES (gen_random_uuid(), 'FrostyFlow');

-- ============================================================================
-- PRODUCTS TABLE
-- ============================================================================
CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    brand VARCHAR(255) NOT NULL,
    category VARCHAR(50) NOT NULL CHECK (category IN ('Sodas', 'Juices', 'Energy Drinks', 'Water')),
    image_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for products
CREATE INDEX idx_products_category ON products(category);
CREATE INDEX idx_products_brand ON products(brand);
CREATE INDEX idx_products_name ON products(name);

-- ============================================================================
-- PRODUCT_SIZES TABLE
-- ============================================================================
CREATE TABLE product_sizes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    size_name VARCHAR(50) NOT NULL,
    price_per_bottle DECIMAL(10,2) NOT NULL,
    price_per_carton DECIMAL(10,2) NOT NULL,
    bottles_per_carton INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for product_sizes
CREATE INDEX idx_product_sizes_product_id ON product_sizes(product_id);

-- ============================================================================
-- INVENTORY TABLE (SKU)
-- ============================================================================
CREATE TABLE inventory (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_size_id UUID NOT NULL REFERENCES product_sizes(id) ON DELETE CASCADE,
    sku_code VARCHAR(50) UNIQUE NOT NULL,
    current_stock INTEGER NOT NULL DEFAULT 0,
    low_stock_threshold INTEGER DEFAULT 50,
    status VARCHAR(20) DEFAULT 'Healthy' CHECK (status IN ('Healthy', 'Low Stock', 'Out of Stock')),
    is_pinned BOOLEAN DEFAULT FALSE,
    last_restocked TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for inventory
CREATE INDEX idx_inventory_product_size_id ON inventory(product_size_id);
CREATE INDEX idx_inventory_sku_code ON inventory(sku_code);
CREATE INDEX idx_inventory_status ON inventory(status);

-- ============================================================================
-- STOCK_HISTORY TABLE
-- ============================================================================
CREATE TABLE stock_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    inventory_id UUID NOT NULL REFERENCES inventory(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    type VARCHAR(20) NOT NULL CHECK (type IN ('addition', 'deduction')),
    quantity INTEGER NOT NULL,
    previous_stock INTEGER NOT NULL,
    new_stock INTEGER NOT NULL,
    bill_id UUID,
    note TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for stock_history
CREATE INDEX idx_stock_history_inventory_id ON stock_history(inventory_id);
CREATE INDEX idx_stock_history_product_id ON stock_history(product_id);
CREATE INDEX idx_stock_history_created_at ON stock_history(created_at);
CREATE INDEX idx_stock_history_bill_id ON stock_history(bill_id);

-- ============================================================================
-- BILLS TABLE
-- ============================================================================
CREATE TABLE bills (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_number VARCHAR(20) UNIQUE NOT NULL,
    customer_name VARCHAR(255),
    customer_phone VARCHAR(50),
    subtotal DECIMAL(12,2) NOT NULL,
    discount_type VARCHAR(20) DEFAULT 'percentage' CHECK (discount_type IN ('percentage', 'flat')),
    discount_value DECIMAL(10,2) DEFAULT 0,
    discount_amount DECIMAL(12,2) DEFAULT 0,
    total_amount DECIMAL(12,2) NOT NULL,
    payment_mode VARCHAR(20) DEFAULT 'Cash' CHECK (payment_mode IN ('Cash', 'UPI', 'Card')),
    cash_received DECIMAL(12,2),
    change_given DECIMAL(12,2),
    status VARCHAR(20) DEFAULT 'paid' CHECK (status IN ('paid', 'pending', 'cancelled')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for bills
CREATE INDEX idx_bills_invoice_number ON bills(invoice_number);
CREATE INDEX idx_bills_created_at ON bills(created_at);
CREATE INDEX idx_bills_status ON bills(status);

-- ============================================================================
-- BILL_ITEMS TABLE
-- ============================================================================
CREATE TABLE bill_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bill_id UUID NOT NULL REFERENCES bills(id) ON DELETE CASCADE,
    product_size_id UUID NOT NULL REFERENCES product_sizes(id),
    product_name VARCHAR(255) NOT NULL,
    size_name VARCHAR(50) NOT NULL,
    packaging VARCHAR(20) NOT NULL CHECK (packaging IN ('bottle', 'carton')),
    quantity INTEGER NOT NULL,
    unit_price DECIMAL(10,2) NOT NULL,
    total_price DECIMAL(12,2) NOT NULL
);

-- Indexes for bill_items
CREATE INDEX idx_bill_items_bill_id ON bill_items(bill_id);
CREATE INDEX idx_bill_items_product_size_id ON bill_items(product_size_id);

-- ============================================================================
-- INVOICE COUNTER TABLE (for auto-increment)
-- ============================================================================
CREATE TABLE invoice_counter (
    id INTEGER PRIMARY KEY DEFAULT 1,
    last_number INTEGER NOT NULL DEFAULT 0
);

INSERT INTO invoice_counter (id, last_number) VALUES (1, 0);

-- ============================================================================
-- FUNCTION: Get next invoice number
-- ============================================================================
CREATE OR REPLACE FUNCTION get_next_invoice_number()
RETURNS TEXT AS $$
DECLARE
    new_number TEXT;
    current_number INTEGER;
BEGIN
    UPDATE invoice_counter SET last_number = last_number + 1 WHERE id = 1
    RETURNING last_number INTO current_number;
    
    new_number := 'INV-' || LPAD(current_number::TEXT, 4, '0');
    RETURN new_number;
END;
$$ LANGUAGE plpgsql;
