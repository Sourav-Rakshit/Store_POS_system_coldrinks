-- Migration: Add bill_type and delivery_date to bills table
-- Run this SQL in your Neon database

ALTER TABLE bills ADD COLUMN IF NOT EXISTS bill_type VARCHAR(20) DEFAULT 'sale' CHECK (bill_type IN ('sale', 'order'));
ALTER TABLE bills ADD COLUMN IF NOT EXISTS delivery_date TIMESTAMP WITH TIME ZONE;
ALTER TABLE bills ADD COLUMN IF NOT EXISTS outstanding_amount DECIMAL(12,2) DEFAULT 0;
ALTER TABLE bills ADD COLUMN IF NOT EXISTS customer_id UUID REFERENCES customers(id) ON DELETE SET NULL;

-- Update status to include 'partially_paid', 'completed', 'returned'
ALTER TABLE bills DROP CONSTRAINT IF EXISTS bills_status_check;
ALTER TABLE bills ADD CONSTRAINT bills_status_check CHECK (status IN ('paid', 'pending', 'cancelled', 'partially_paid', 'completed', 'returned'));

-- Create index for orders
CREATE INDEX IF NOT EXISTS idx_bills_bill_type ON bills(bill_type);
CREATE INDEX IF NOT EXISTS idx_bills_delivery_date ON bills(delivery_date);
CREATE INDEX IF NOT EXISTS idx_bills_customer_id ON bills(customer_id);
