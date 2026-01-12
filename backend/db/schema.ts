import { pgTable, serial, text, integer, decimal, timestamp, jsonb } from 'drizzle-orm/pg-core';

// 1. Products Table
export const products = pgTable('products', {
    id: serial('id').primaryKey(),
    sku: text('sku').unique(), // SKU for frontend compatibility
    name: text('name').notNull(),
    description: text('description'),
    price: decimal('price', { precision: 10, scale: 2 }).notNull(),
    stock: integer('stock').notNull().default(0),
    images: text('images').array(), // Array of URLs
    category: text('category'),
    attributes: jsonb('attributes'), // For things like { color: 'blue', size: 'L' }
    createdAt: timestamp('created_at').defaultNow(),
});

// 2. Users Table
export const users = pgTable('users', {
    id: serial('id').primaryKey(),
    email: text('email').notNull().unique(),
    passwordHash: text('password_hash').notNull(),
    fullName: text('full_name'),
    address: text('address'),
});

// 3. Orders Table
export const orders = pgTable('orders', {
    id: serial('id').primaryKey(),
    userId: integer('user_id').references(() => users.id),
    status: text('status').default('pending'),
    totalAmount: decimal('total_amount', { precision: 10, scale: 2 }),
    stripeSessionId: text('stripe_session_id'), // NEW: To link with Stripe
    paymentStatus: text('payment_status').default('unpaid'), // NEW: 'paid' or 'unpaid'
    createdAt: timestamp('created_at').defaultNow(),
});

// 4. Order Items Table (links orders to products)
export const orderItems = pgTable('order_items', {
    id: serial('id').primaryKey(),
    orderId: integer('order_id').references(() => orders.id).notNull(),
    productId: integer('product_id').references(() => products.id).notNull(),
    quantity: integer('quantity').notNull().default(1),
    priceAtPurchase: decimal('price_at_purchase', { precision: 10, scale: 2 }).notNull(),
});

export const cartItems = pgTable('cart_items', {
    id: serial('id').primaryKey(),
    userId: integer('user_id').references(() => users.id).notNull(),
    productId: integer('product_id').references(() => products.id).notNull(),
    quantity: integer('quantity').notNull().default(1),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
});

export const reviews = pgTable('reviews', {
    id: serial('id').primaryKey(),
    productId: integer('product_id').references(() => products.id).notNull(),
    userId: integer('user_id').references(() => users.id).notNull(),
    rating: integer('rating').notNull(), // 1 to 5 stars
    comment: text('comment'),
    createdAt: timestamp('created_at').defaultNow(),
});

