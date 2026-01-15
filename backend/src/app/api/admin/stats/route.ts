import { db } from '@/db';
import { orders, users, products, orderItems, customers, messages } from '@/db/schema';
import { NextRequest, NextResponse } from 'next/server';
import { sql, eq, desc, gte, count, and } from 'drizzle-orm';

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const period = searchParams.get('period') || 'week';

        // Calculate date range
        const now = new Date();
        let startDate: Date;
        let previousStartDate: Date;

        switch (period) {
            case 'today':
                startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                previousStartDate = new Date(startDate.getTime() - 24 * 60 * 60 * 1000);
                break;
            case 'week':
                startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                previousStartDate = new Date(startDate.getTime() - 7 * 24 * 60 * 60 * 1000);
                break;
            case 'month':
                startDate = new Date(now.getFullYear(), now.getMonth(), 1);
                previousStartDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
                break;
            case 'year':
                startDate = new Date(now.getFullYear(), 0, 1);
                previousStartDate = new Date(now.getFullYear() - 1, 0, 1);
                break;
            default:
                startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                previousStartDate = new Date(startDate.getTime() - 7 * 24 * 60 * 60 * 1000);
        }

        // 1. Calculate Total Revenue for current period
        const [currentRevenue] = await db
            .select({
                totalRevenue: sql<number>`COALESCE(SUM(CAST(${orders.totalAmount} AS DECIMAL)), 0)`
            })
            .from(orders)
            .where(gte(orders.createdAt, startDate));

        // 2. Calculate previous period revenue for comparison
        const [previousRevenue] = await db
            .select({
                totalRevenue: sql<number>`COALESCE(SUM(CAST(${orders.totalAmount} AS DECIMAL)), 0)`
            })
            .from(orders)
            .where(
                and(
                    gte(orders.createdAt, previousStartDate),
                    sql`${orders.createdAt} < ${startDate}`
                )
            );

        // 3. Count Total Orders
        const [orderCount] = await db
            .select({
                count: count()
            })
            .from(orders)
            .where(gte(orders.createdAt, startDate));

        const [previousOrderCount] = await db
            .select({
                count: count()
            })
            .from(orders)
            .where(
                and(
                    gte(orders.createdAt, previousStartDate),
                    sql`${orders.createdAt} < ${startDate}`
                )
            );

        // 4. Count Total Customers
        const [customerCount] = await db
            .select({
                count: count()
            })
            .from(customers);

        const [newCustomersThisPeriod] = await db
            .select({
                count: count()
            })
            .from(customers)
            .where(gte(customers.createdAt, startDate));

        // 5. Count Total Products
        const [productCount] = await db
            .select({
                count: count()
            })
            .from(products);

        // 6. Order stats by status
        const orderStats = await db
            .select({
                status: orders.status,
                count: count()
            })
            .from(orders)
            .groupBy(orders.status);

        // 7. Find Top Selling Products
        const topProducts = await db
            .select({
                id: products.id,
                name: products.name,
                category: products.category,
                image: sql<string>`${products.images}[1]`,
                totalSold: sql<number>`CAST(SUM(${orderItems.quantity}) AS INT)`
            })
            .from(orderItems)
            .innerJoin(products, eq(orderItems.productId, products.id))
            .innerJoin(orders, eq(orderItems.orderId, orders.id))
            .where(gte(orders.createdAt, startDate))
            .groupBy(products.id, products.name, products.category, products.images)
            .orderBy(desc(sql`SUM(${orderItems.quantity})`))
            .limit(5);

        // 8. Recent Orders
        const recentOrders = await db
            .select({
                id: orders.id,
                status: orders.status,
                totalAmount: orders.totalAmount,
                paymentMethod: orders.paymentMethod,
                createdAt: orders.createdAt,
            })
            .from(orders)
            .orderBy(desc(orders.createdAt))
            .limit(10);

        // 9. Unread messages count
        const [unreadMessages] = await db
            .select({
                count: count()
            })
            .from(messages)
            .where(
                and(
                    eq(messages.isRead, false),
                    eq(messages.isDeleted, false)
                )
            );

        // Calculate growth percentages
        const currentRev = Number(currentRevenue?.totalRevenue || 0);
        const previousRev = Number(previousRevenue?.totalRevenue || 0);
        const revenueGrowth = previousRev > 0
            ? ((currentRev - previousRev) / previousRev) * 100
            : 0;

        const currentOrders = Number(orderCount?.count || 0);
        const prevOrders = Number(previousOrderCount?.count || 0);
        const ordersGrowth = prevOrders > 0
            ? ((currentOrders - prevOrders) / prevOrders) * 100
            : 0;

        // Format order stats as object
        const orderStatsObj: Record<string, number> = {};
        orderStats.forEach(s => {
            orderStatsObj[s.status || 'unknown'] = Number(s.count);
        });

        return NextResponse.json({
            period,
            totalRevenue: currentRev,
            revenueGrowth: Math.round(revenueGrowth * 10) / 10,
            totalOrders: currentOrders,
            ordersGrowth: Math.round(ordersGrowth * 10) / 10,
            totalCustomers: Number(customerCount?.count || 0),
            newCustomers: Number(newCustomersThisPeriod?.count || 0),
            totalProducts: Number(productCount?.count || 0),
            orderStats: orderStatsObj,
            topProducts,
            recentOrders,
            unreadMessages: Number(unreadMessages?.count || 0),
            currency: "EGP"
        });
    } catch (error) {
        console.error("Admin Stats Error:", error);
        return NextResponse.json({ error: "Admin stats failed" }, { status: 500 });
    }
}