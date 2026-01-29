-- Migration: Consolidate customers into users table
-- Run this in your Neon SQL editor

-- 1. Add new columns to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS total_orders INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS total_spent DECIMAL(10,2) DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';
ALTER TABLE users ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW();

-- 2. Make password_hash nullable (for guest customers)
ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL;

-- 3. Migrate customers to users (skip duplicates by email)
INSERT INTO users (email, full_name, phone, address, total_orders, total_spent, status, created_at)
SELECT email, name, phone, address, total_orders, total_spent, status, created_at
FROM customers
WHERE email NOT IN (SELECT email FROM users)
ON CONFLICT (email) DO NOTHING;

-- 4. Update existing users with customer data if they exist in customers table
UPDATE users u SET 
    total_orders = COALESCE(c.total_orders, 0),
    total_spent = COALESCE(c.total_spent, 0),
    phone = COALESCE(u.phone, c.phone),
    address = COALESCE(u.address, c.address),
    status = COALESCE(c.status, 'active')
FROM customers c 
WHERE u.email = c.email;

-- 5. Update orders to use user_id instead of customer_id
UPDATE orders o SET user_id = u.id 
FROM users u, customers c 
WHERE o.customer_id = c.id AND u.email = c.email AND o.user_id IS NULL;

-- 6. Drop customer_id column from orders
ALTER TABLE orders DROP COLUMN IF EXISTS customer_id;

-- 7. Drop customers table
DROP TABLE IF EXISTS customers;

-- Verify migration
SELECT 'Users count:', COUNT(*) FROM users;
SELECT 'Orders with user_id:', COUNT(*) FROM orders WHERE user_id IS NOT NULL;
