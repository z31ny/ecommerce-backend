import { db } from '@/db';
import { products } from '@/db/schema';
import { NextResponse, NextRequest } from 'next/server';
import { eq, and, ne, or, isNull } from 'drizzle-orm';

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);

        // Handle Filtering
        const category = searchParams.get('category');

        // Handle Pagination
        const limit = parseInt(searchParams.get('limit') || '100');
        const page = parseInt(searchParams.get('page') || '1');
        const offset = (page - 1) * limit;

        // Only show active products (filter out deleted and inactive)
        let data;

        if (category) {
            data = await db
                .select()
                .from(products)
                .where(and(
                    eq(products.category, category),
                    or(
                        eq(products.status, 'active'),
                        isNull(products.status)
                    )
                ))
                .limit(limit)
                .offset(offset);
        } else {
            data = await db
                .select()
                .from(products)
                .where(or(
                    eq(products.status, 'active'),
                    isNull(products.status)
                ))
                .limit(limit)
                .offset(offset);
        }

        return NextResponse.json(data);
    } catch (error: any) {
        console.error('Get products error:', error);
        return NextResponse.json({ error: "Failed to fetch products", details: error.message }, { status: 500 });
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

        // Handle images
        let imageArray: string[] | null = null;
        if (body.images && Array.isArray(body.images) && body.images.length > 0) {
            const filtered = body.images.filter((img: any) => img && String(img).trim() !== '');
            imageArray = filtered.length > 0 ? filtered : null;
        } else if (body.image && body.image.trim() !== '') {
            imageArray = [body.image];
        }

        const [newProduct] = await db.insert(products).values({
            sku,
            name: body.name,
            description: body.description || null,
            price: String(body.price),
            stock: body.stock ?? 0,
            minStock: body.minStock ?? 10,
            images: imageArray,
            category: body.category || null,
            attributes: body.attributes || null,
            status: body.status || 'active',
        }).returning();

        return NextResponse.json(newProduct, { status: 201 });
    } catch (error: any) {
        console.error('Create product error:', error);
        return NextResponse.json({ error: "Failed to create product", details: error.message }, { status: 500 });
    }
}
