-- Clear all data except products and product_sizes
-- Run this SQL in your Neon database (delete in correct order to avoid FK errors)

-- 1. Delete stock_history first (references inventory)
DELETE FROM stock_history;

-- 2. Delete bill_items (references bills)
DELETE FROM bill_items;

-- 3. Delete bills
DELETE FROM bills;

-- 4. Delete customer_payments (references customers)
DELETE FROM customer_payments;

-- 5. Delete customers
DELETE FROM customers;

-- 6. Delete inventory (references product_sizes)
DELETE FROM inventory;

-- 7. Reset invoice counter
DELETE FROM invoice_counter;
INSERT INTO invoice_counter (id, last_number) VALUES (1, 0);

-- Verify products still exist
SELECT 'Products count:' as info, COUNT(*) as count FROM products;
SELECT 'Product sizes count:' as info, COUNT(*) as count FROM product_sizes;
