import { db } from '@/db';
import { products } from '@/db/schema';
import { NextResponse, NextRequest } from 'next/server';
import { eq } from 'drizzle-orm';

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);

        // 1. Handle Filtering (e.g., /api/products?category=Ice Cream)
        const category = searchParams.get('category');

        // 2. Handle Pagination (e.g., /api/products?limit=10&page=1)
        const limit = parseInt(searchParams.get('limit') || '10');
        const page = parseInt(searchParams.get('page') || '1');
        const offset = (page - 1) * limit;

        let query = db.select().from(products).limit(limit).offset(offset);

        // If a category is provided, filter the results
        if (category) {
            // @ts-ignore - Simple filter for now
            query = query.where(eq(products.category, category));
        }

        const data = await query;
        return NextResponse.json(data);
    } catch (error) {
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

        const [newProduct] = await db.insert(products).values({
            name: body.name,
            description: body.description || null,
            price: body.price,
            stock: body.stock ?? 0,
            images: body.images || null,
            category: body.category || null,
            attributes: body.attributes || null,
        }).returning();

        return NextResponse.json(
            { message: "Product created", product: newProduct },
            { status: 201 }
        );
    } catch (error) {
        return NextResponse.json({ error: "Failed to create product" }, { status: 500 });
    }
}
