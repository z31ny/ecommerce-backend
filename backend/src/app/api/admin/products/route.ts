import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { products } from '@/db/schema';
import { desc, eq } from 'drizzle-orm';

// GET /api/admin/products - List all products for admin
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const category = searchParams.get('category');
        const limit = parseInt(searchParams.get('limit') || '100');

        let query = db.select().from(products).orderBy(desc(products.createdAt)).limit(limit);

        if (category && category !== 'all') {
            // @ts-ignore
            query = query.where(eq(products.category, category));
        }

        const result = await query;
        return NextResponse.json(result);
    } catch (error) {
        console.error('Get admin products error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// POST /api/admin/products - Create new product
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { sku, name, description, price, stock, minStock, images, image, category, attributes, status } = body;

        if (!name || !price) {
            return NextResponse.json(
                { error: 'Name and price are required' },
                { status: 400 }
            );
        }

        const [newProduct] = await db
            .insert(products)
            .values({
                sku: sku || `SKU-${Date.now()}`,
                name,
                description,
                price: price.toString(),
                stock: stock ?? 0,
                minStock: minStock ?? 10,
                images: images || (image ? [image] : null),
                category,
                attributes,
                status: status || 'active',
            })
            .returning();

        return NextResponse.json(newProduct, { status: 201 });
    } catch (error) {
        console.error('Create product error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
