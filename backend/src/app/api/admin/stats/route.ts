import { db } from '@/db';
import { products, orders, customers } from '@/db/schema';
import { NextResponse } from 'next/server';
import { count, eq, sql, gte } from 'drizzle-orm';

export async function GET() {
    try {
        // Get current date info for time-based calculations
        const now = new Date();
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - now.getDay());
        startOfWeek.setHours(0, 0, 0, 0);
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const startOfYear = new Date(now.getFullYear(), 0, 1);

        // Total counts with null safety
        const productCountResult = await db.select({ count: count() }).from(products);
        const customerCountResult = await db.select({ count: count() }).from(customers);
        const orderCountResult = await db.select({ count: count() }).from(orders);

        const productCount = productCountResult[0]?.count ?? 0;
        const customerCount = customerCountResult[0]?.count ?? 0;
        const orderCount = orderCountResult[0]?.count ?? 0;

        // Revenue (sum of all orders)
        const revenueResultArr = await db.select({
            total: sql<string>`COALESCE(SUM(${orders.totalAmount}), 0)`
        }).from(orders);
        const totalRevenue = parseFloat(revenueResultArr[0]?.total ?? '0') || 0;

        // Orders by status
        const pendingOrders = await db.select({ count: count() }).from(orders).where(eq(orders.status, 'pending'));
        const processingOrders = await db.select({ count: count() }).from(orders).where(eq(orders.status, 'processing'));
        const shippedOrders = await db.select({ count: count() }).from(orders).where(eq(orders.status, 'shipped'));
        const deliveredOrders = await db.select({ count: count() }).from(orders).where(eq(orders.status, 'delivered'));
        const cancelledOrders = await db.select({ count: count() }).from(orders).where(eq(orders.status, 'cancelled'));

        // Today's stats
        const todayOrdersResult = await db.select({ count: count() }).from(orders).where(gte(orders.createdAt, startOfToday));
        const todayRevenueResult = await db.select({ total: sql<string>`COALESCE(SUM(${orders.totalAmount}), 0)` }).from(orders).where(gte(orders.createdAt, startOfToday));

        // This week's stats
        const weekOrdersResult = await db.select({ count: count() }).from(orders).where(gte(orders.createdAt, startOfWeek));
        const weekRevenueResult = await db.select({ total: sql<string>`COALESCE(SUM(${orders.totalAmount}), 0)` }).from(orders).where(gte(orders.createdAt, startOfWeek));

        // This month's stats
        const monthOrdersResult = await db.select({ count: count() }).from(orders).where(gte(orders.createdAt, startOfMonth));
        const monthRevenueResult = await db.select({ total: sql<string>`COALESCE(SUM(${orders.totalAmount}), 0)` }).from(orders).where(gte(orders.createdAt, startOfMonth));

        // This year's stats  
        const yearOrdersResult = await db.select({ count: count() }).from(orders).where(gte(orders.createdAt, startOfYear));
        const yearRevenueResult = await db.select({ total: sql<string>`COALESCE(SUM(${orders.totalAmount}), 0)` }).from(orders).where(gte(orders.createdAt, startOfYear));

        // Top products
        const topProductsData = await db.select({
            id: products.id,
            name: products.name,
            category: products.category,
            image: sql<string>`${products.images}[1]`,
            stock: products.stock
        }).from(products).limit(5);

        return NextResponse.json({
            // Overview stats
            totalProducts: productCount,
            totalCustomers: customerCount,
            totalOrders: orderCount,
            totalRevenue: totalRevenue,

            // Order stats by status
            orderStats: {
                pending: pendingOrders[0]?.count ?? 0,
                processing: processingOrders[0]?.count ?? 0,
                shipped: shippedOrders[0]?.count ?? 0,
                delivered: deliveredOrders[0]?.count ?? 0,
                cancelled: cancelledOrders[0]?.count ?? 0
            },

            // Time-based stats
            statsByPeriod: {
                today: {
                    totalRevenue: parseFloat(todayRevenueResult[0]?.total ?? '0') || 0,
                    totalOrders: todayOrdersResult[0]?.count ?? 0,
                    totalCustomers: customerCount,
                    totalProducts: productCount
                },
                week: {
                    totalRevenue: parseFloat(weekRevenueResult[0]?.total ?? '0') || 0,
                    totalOrders: weekOrdersResult[0]?.count ?? 0,
                    totalCustomers: customerCount,
                    totalProducts: productCount
                },
                month: {
                    totalRevenue: parseFloat(monthRevenueResult[0]?.total ?? '0') || 0,
                    totalOrders: monthOrdersResult[0]?.count ?? 0,
                    totalCustomers: customerCount,
                    totalProducts: productCount
                },
                year: {
                    totalRevenue: parseFloat(yearRevenueResult[0]?.total ?? '0') || 0,
                    totalOrders: yearOrdersResult[0]?.count ?? 0,
                    totalCustomers: customerCount,
                    totalProducts: productCount
                }
            },

            // Top products
            topProducts: topProductsData.map(p => ({
                name: p.name,
                category: p.category || 'Uncategorized',
                sales: p.stock ?? 0,
                image: p.image || ''
            })),

            // Customer stats
            customerStats: {
                active: customerCount,
                newThisMonth: 0,
                avgOrderValue: orderCount > 0 ? (totalRevenue / orderCount) : 0,
                retentionRate: 0
            }
        });
    } catch (error) {
        console.error('Stats API error:', error);
        return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 });
    }
}