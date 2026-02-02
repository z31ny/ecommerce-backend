import { db } from '@/db';
import { products } from '@/db/schema';
import { NextResponse, NextRequest } from 'next/server';
import { eq, and, ne } from 'drizzle-orm';

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);

        // 1. Handle Filtering (e.g., /api/products?category=Ice Cream)
        const category = searchParams.get('category');

        // 2. Handle Pagination (e.g., /api/products?limit=10&page=1)
        const limit = parseInt(searchParams.get('limit') || '100');
        const page = parseInt(searchParams.get('page') || '1');
        const offset = (page - 1) * limit;

        // Build conditions - always filter out deleted/inactive products
        let conditions: any[] = [
            ne(products.status, 'deleted'),
            ne(products.status, 'inactive')
        ];

        // If a category is provided, add to filter
        if (category) {
            conditions.push(eq(products.category, category));
        }

        const data = await db
            .select()
            .from(products)
            .where(and(...conditions))
            .limit(limit)
            .offset(offset);

        return NextResponse.json(data);
    } catch (error) {
        console.error('Get products error:', error);
        return NextResponse.json({ error: "Failed to fetch products" }, { status: 500 });
    }
}

// POST: Create a new product
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();

        // Validate required fields
        if (!body.name || !body.price) {
            return NextResponse.json(
                { error: "Name and price are required" },
                { status: 400 }
            );
        }

        // Generate SKU if not provided
        const sku = body.sku || `SKU-${Date.now()}`;

        const [newProduct] = await db.insert(products).values({
            sku,
            name: body.name,
            description: body.description || null,
            price: body.price.toString(),
            stock: body.stock ?? 0,
            minStock: body.minStock ?? 10,
            images: body.images || body.image ? [body.image] : null,
            category: body.category || null,
            attributes: body.attributes || null,
            status: body.status || 'active',
        }).returning();

        return NextResponse.json(newProduct, { status: 201 });
    } catch (error) {
        console.error('Create product error:', error);
        return NextResponse.json({ error: "Failed to create product" }, { status: 500 });
    }
}

