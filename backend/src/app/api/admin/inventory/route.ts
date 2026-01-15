import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { products } from '@/db/schema';
import { sql, lte, eq, or, desc } from 'drizzle-orm';

// GET /api/admin/inventory - Get inventory/stock information
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const filter = searchParams.get('filter'); // all, low-stock, out-of-stock

        let conditions = [];

        if (filter === 'low-stock') {
            // Products where stock is above 0 but at or below minStock
            conditions.push(
                sql`${products.stock} > 0 AND ${products.stock} <= ${products.minStock}`
            );
        } else if (filter === 'out-of-stock') {
            conditions.push(eq(products.stock, 0));
        }

        // Get all products with inventory info
        const inventoryData = await db
            .select({
                id: products.id,
                sku: products.sku,
                name: products.name,
                category: products.category,
                stock: products.stock,
                minStock: products.minStock,
                price: products.price,
                status: products.status,
                image: sql<string>`${products.images}[1]`, // First image
            })
            .from(products)
            .where(conditions.length > 0 ? conditions[0] : undefined)
            .orderBy(products.stock);

        // Get summary stats
        const [stats] = await db
            .select({
                totalProducts: sql<number>`COUNT(*)`,
                outOfStock: sql<number>`COUNT(*) FILTER (WHERE ${products.stock} = 0)`,
                lowStock: sql<number>`COUNT(*) FILTER (WHERE ${products.stock} > 0 AND ${products.stock} <= ${products.minStock})`,
                inStock: sql<number>`COUNT(*) FILTER (WHERE ${products.stock} > ${products.minStock})`,
                totalValue: sql<number>`COALESCE(SUM(CAST(${products.price} AS DECIMAL) * ${products.stock}), 0)`,
            })
            .from(products);

        // Get low stock alerts (products that need restocking)
        const lowStockAlerts = await db
            .select({
                id: products.id,
                sku: products.sku,
                name: products.name,
                stock: products.stock,
                minStock: products.minStock,
            })
            .from(products)
            .where(
                sql`${products.stock} <= ${products.minStock}`
            )
            .orderBy(products.stock)
            .limit(10);

        return NextResponse.json({
            inventory: inventoryData,
            stats: {
                totalProducts: Number(stats?.totalProducts || 0),
                outOfStock: Number(stats?.outOfStock || 0),
                lowStock: Number(stats?.lowStock || 0),
                inStock: Number(stats?.inStock || 0),
                totalValue: Number(stats?.totalValue || 0),
            },
            alerts: lowStockAlerts,
        });
    } catch (error) {
        console.error('Get inventory error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

// PUT /api/admin/inventory - Bulk update stock
export async function PUT(request: NextRequest) {
    try {
        const body = await request.json();
        const { updates } = body; // Array of { productId, stock }

        if (!updates || !Array.isArray(updates)) {
            return NextResponse.json(
                { error: 'Updates array is required' },
                { status: 400 }
            );
        }

        const results = [];
        for (const update of updates) {
            const [updated] = await db
                .update(products)
                .set({
                    stock: update.stock,
                    status: update.stock === 0 ? 'out-of-stock' : 'active',
                })
                .where(eq(products.id, update.productId))
                .returning();

            if (updated) {
                results.push(updated);
            }
        }

        return NextResponse.json({
            success: true,
            updated: results.length
        });
    } catch (error) {
        console.error('Update inventory error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
