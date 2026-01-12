import { db } from '@/db';
import { orders, users, products, orderItems } from '@/db/schema';
import { NextResponse } from 'next/server';
import { sql, eq, desc } from 'drizzle-orm';

export async function GET() {
    try {
        // 1. Calculate Total Revenue (Destructuring [revenueResult] is key!)
        const [revenueResult] = await db
            .select({
                totalRevenue: sql<string>`sum(${orders.totalAmount})`
            })
            .from(orders);

        // 2. Count Total Users
        const [userCount] = await db
            .select({
                count: sql<number>`count(*)`
            })
            .from(users);

        // 3. Count Total Products
        const [productCount] = await db
            .select({
                count: sql<number>`count(*)`
            })
            .from(products);

        // 4. Find Top Selling Products (via orderItems junction table)
        const topProducts = await db
            .select({
                name: products.name,
                totalSold: sql<number>`cast(sum(${orderItems.quantity}) as int)`
            })
            .from(orderItems)
            .innerJoin(products, eq(orderItems.productId, products.id))
            .groupBy(products.id, products.name)
            .orderBy(desc(sql`sum(${orderItems.quantity})`))
            .limit(5);

        return NextResponse.json({
            revenue: revenueResult?.totalRevenue || "0.00",
            totalCustomers: userCount?.count || 0,
            totalInventory: productCount?.count || 0,
            topProducts: topProducts,
            currency: "EGP"
        });
    } catch (error) {
        console.error("Admin Stats Error:", error);
        return NextResponse.json({ error: "Admin stats failed" }, { status: 500 });
    }
}