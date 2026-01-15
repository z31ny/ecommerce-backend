import { pgTable, serial, text, integer, decimal, timestamp, jsonb, boolean } from 'drizzle-orm/pg-core';

// ===== ADMIN DASHBOARD TABLES (defined first for references) =====

// Admin Users Table (for dashboard access with role-based permissions)
export const adminUsers = pgTable('admin_users', {
    id: serial('id').primaryKey(),
    email: text('email').notNull().unique(),
    passwordHash: text('password_hash').notNull(),
    name: text('name').notNull(),
    role: text('role').notNull().default('Staff'), // Super Admin, Admin, Manager, Staff
    avatar: text('avatar'),
    access: jsonb('access').$type<string[]>(), // Array of accessible page keys
    isActive: boolean('is_active').default(true),
    createdAt: timestamp('created_at').defaultNow(),
});

// Customers Table (for customer management in dashboard)
export const customers = pgTable('customers', {
    id: serial('id').primaryKey(),
    name: text('name').notNull(),
    email: text('email').notNull().unique(),
    phone: text('phone'),
    address: text('address'),
    totalOrders: integer('total_orders').default(0),
    totalSpent: decimal('total_spent', { precision: 10, scale: 2 }).default('0'),
    status: text('status').default('active'), // active, inactive
    createdAt: timestamp('created_at').defaultNow(),
});

// Employees Table
export const employees = pgTable('employees', {
    id: serial('id').primaryKey(),
    name: text('name').notNull(),
    email: text('email').unique(),
    phone: text('phone'),
    position: text('position'),
    department: text('department'),
    hireDate: timestamp('hire_date'),
    salary: decimal('salary', { precision: 10, scale: 2 }),
    status: text('status').default('active'), // active, inactive
    avatar: text('avatar'),
    createdAt: timestamp('created_at').defaultNow(),
});

// Messages Table (contact/support messages)
export const messages = pgTable('messages', {
    id: serial('id').primaryKey(),
    senderName: text('sender_name').notNull(),
    senderEmail: text('sender_email').notNull(),
    subject: text('subject'),
    message: text('message').notNull(),
    isRead: boolean('is_read').default(false),
    isArchived: boolean('is_archived').default(false),
    isDeleted: boolean('is_deleted').default(false),
    createdAt: timestamp('created_at').defaultNow(),
});

// Offers Table (special offers/discounts)
export const offers = pgTable('offers', {
    id: serial('id').primaryKey(),
    productSku: text('product_sku').notNull(),
    name: text('name').notNull(),
    image: text('image'),
    originalPrice: decimal('original_price', { precision: 10, scale: 2 }).notNull(),
    salePrice: decimal('sale_price', { precision: 10, scale: 2 }).notNull(),
    discount: integer('discount').notNull(), // Percentage off
    category: text('category'),
    description: text('description'),
    startDate: timestamp('start_date'),
    endDate: timestamp('end_date'),
    isActive: boolean('is_active').default(true),
    createdAt: timestamp('created_at').defaultNow(),
});


// ===== CORE E-COMMERCE TABLES =====

// 1. Products Table
export const products = pgTable('products', {
    id: serial('id').primaryKey(),
    sku: text('sku').unique(),
    name: text('name').notNull(),
    description: text('description'),
    price: decimal('price', { precision: 10, scale: 2 }).notNull(),
    stock: integer('stock').notNull().default(0),
    minStock: integer('min_stock').default(10),
    images: text('images').array(),
    category: text('category'),
    attributes: jsonb('attributes'),
    status: text('status').default('active'),
    createdAt: timestamp('created_at').defaultNow(),
});

// 2. Users Table (storefront customers)
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
    customerId: integer('customer_id').references(() => customers.id),
    status: text('status').default('pending'),
    totalAmount: decimal('total_amount', { precision: 10, scale: 2 }),
    stripeSessionId: text('stripe_session_id'),
    paymentStatus: text('payment_status').default('unpaid'),
    paymentMethod: text('payment_method').default('COD'),
    depositAmount: decimal('deposit_amount', { precision: 10, scale: 2 }),
    depositStatus: text('deposit_status').default('pending'),
    createdAt: timestamp('created_at').defaultNow(),
});

// 4. Order Items Table
export const orderItems = pgTable('order_items', {
    id: serial('id').primaryKey(),
    orderId: integer('order_id').references(() => orders.id).notNull(),
    productId: integer('product_id').references(() => products.id).notNull(),
    quantity: integer('quantity').notNull().default(1),
    priceAtPurchase: decimal('price_at_purchase', { precision: 10, scale: 2 }).notNull(),
});

// 5. Cart Items Table
export const cartItems = pgTable('cart_items', {
    id: serial('id').primaryKey(),
    userId: integer('user_id').references(() => users.id).notNull(),
    productId: integer('product_id').references(() => products.id).notNull(),
    quantity: integer('quantity').notNull().default(1),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
});

// 6. Reviews Table
export const reviews = pgTable('reviews', {
    id: serial('id').primaryKey(),
    productId: integer('product_id').references(() => products.id).notNull(),
    userId: integer('user_id').references(() => users.id).notNull(),
    rating: integer('rating').notNull(),
    comment: text('comment'),
    createdAt: timestamp('created_at').defaultNow(),
});
