import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { products, orders, customers, orderItems } from '@/db/schema';
import { sql, eq, gte, and, count, sum } from 'drizzle-orm';

// GET /api/admin/analytics - Get chart data for analytics page
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const period = searchParams.get('period') || 'week';

        // Get date range based on period
        const now = new Date();
        let startDate: Date;

        switch (period) {
            case 'today':
                startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                break;
            case 'week':
                startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                break;
            case 'month':
                startDate = new Date(now.getFullYear(), now.getMonth(), 1);
                break;
            case 'year':
                startDate = new Date(now.getFullYear(), 0, 1);
                break;
            default:
                startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        }

        // Revenue by date
        const revenueData = await db
            .select({
                date: sql<string>`DATE(${orders.createdAt})`,
                revenue: sql<number>`COALESCE(SUM(CAST(${orders.totalAmount} AS DECIMAL)), 0)`,
            })
            .from(orders)
            .where(
                and(
                    gte(orders.createdAt, startDate),
                    eq(orders.status, 'delivered')
                )
            )
            .groupBy(sql`DATE(${orders.createdAt})`)
            .orderBy(sql`DATE(${orders.createdAt})`);

        // Orders by status
        const ordersByStatus = await db
            .select({
                status: orders.status,
                count: count(),
            })
            .from(orders)
            .where(gte(orders.createdAt, startDate))
            .groupBy(orders.status);

        // Top selling products
        const topProducts = await db
            .select({
                productId: orderItems.productId,
                productName: products.name,
                category: products.category,
                totalSold: sql<number>`SUM(${orderItems.quantity})`,
                revenue: sql<number>`SUM(CAST(${orderItems.priceAtPurchase} AS DECIMAL) * ${orderItems.quantity})`,
            })
            .from(orderItems)
            .innerJoin(products, eq(orderItems.productId, products.id))
            .innerJoin(orders, eq(orderItems.orderId, orders.id))
            .where(gte(orders.createdAt, startDate))
            .groupBy(orderItems.productId, products.name, products.category)
            .orderBy(sql`SUM(${orderItems.quantity}) DESC`)
            .limit(10);

        // Revenue by category
        const revenueByCategory = await db
            .select({
                category: products.category,
                revenue: sql<number>`COALESCE(SUM(CAST(${orderItems.priceAtPurchase} AS DECIMAL) * ${orderItems.quantity}), 0)`,
            })
            .from(orderItems)
            .innerJoin(products, eq(orderItems.productId, products.id))
            .innerJoin(orders, eq(orderItems.orderId, orders.id))
            .where(gte(orders.createdAt, startDate))
            .groupBy(products.category);

        // Customer growth
        const customerGrowth = await db
            .select({
                date: sql<string>`DATE(${customers.createdAt})`,
                count: count(),
            })
            .from(customers)
            .where(gte(customers.createdAt, startDate))
            .groupBy(sql`DATE(${customers.createdAt})`)
            .orderBy(sql`DATE(${customers.createdAt})`);

        return NextResponse.json({
            period,
            revenueOverTime: revenueData,
            ordersByStatus,
            topProducts,
            revenueByCategory,
            customerGrowth,
        });
    } catch (error) {
        console.error('Get analytics error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
