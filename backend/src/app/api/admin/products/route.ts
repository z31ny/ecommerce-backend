import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { products } from '@/db/schema';
import { desc, eq, ne, and, or, isNull } from 'drizzle-orm';

// GET /api/admin/products - List all products for admin
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const category = searchParams.get('category');
        const limit = parseInt(searchParams.get('limit') || '100');
        const showDeleted = searchParams.get('showDeleted') === 'true';

        // Build query - filter out deleted products by default
        let result;

        if (showDeleted) {
            // Show all products including deleted
            if (category && category !== 'all') {
                result = await db.select().from(products)
                    .where(eq(products.category, category))
                    .orderBy(desc(products.createdAt))
                    .limit(limit);
            } else {
                result = await db.select().from(products)
                    .orderBy(desc(products.createdAt))
                    .limit(limit);
            }
        } else {
            // Hide deleted products (status != 'deleted' OR status is null/active)
            if (category && category !== 'all') {
                result = await db.select().from(products)
                    .where(and(
                        or(ne(products.status, 'deleted'), isNull(products.status)),
                        eq(products.category, category)
                    ))
                    .orderBy(desc(products.createdAt))
                    .limit(limit);
            } else {
                result = await db.select().from(products)
                    .where(or(ne(products.status, 'deleted'), isNull(products.status)))
                    .orderBy(desc(products.createdAt))
                    .limit(limit);
            }
        }

        return NextResponse.json(result);
    } catch (error: any) {
        console.error('Get admin products error:', error);
        return NextResponse.json({ error: 'Internal server error', details: error.message }, { status: 500 });
    }
}

// POST /api/admin/products - Create new product
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        console.log('[Create Product] Raw body:', JSON.stringify(body, null, 2));

        const { sku, name, description, price, stock, minStock, images, image, category, attributes, status } = body;

        console.log('[Create Product] name:', name, '| price:', price, '| typeof price:', typeof price);

        // Validate - name must exist and not be empty, price must be a number
        if (!name || String(name).trim() === '') {
            console.log('[Create Product] Validation failed: name missing or empty');
            return NextResponse.json(
                { error: 'Product name is required' },
                { status: 400 }
            );
        }

        const priceNum = parseFloat(price);
        if (isNaN(priceNum)) {
            console.log('[Create Product] Validation failed: price is not a valid number');
            return NextResponse.json(
                { error: 'Price must be a valid number' },
                { status: 400 }
            );
        }

        // Handle images - ensure it's either a valid array or null
        let imageArray: string[] | null = null;
        if (images && Array.isArray(images) && images.length > 0 && images[0]) {
            const filtered = images.filter((img: any) => img && String(img).trim() !== '');
            imageArray = filtered.length > 0 ? filtered : null;
        } else if (image && typeof image === 'string' && image.trim() !== '') {
            imageArray = [image];
        }

        console.log('[Create Product] Image array:', imageArray);
        console.log('[Create Product] Price:', price, 'Type:', typeof price);

        const insertData = {
            sku: sku || `SKU-${Date.now()}`,
            name: name.trim(),
            description: description ? description.trim() : null,
            price: String(priceNum),
            stock: typeof stock === 'number' ? stock : parseInt(stock) || 0,
            minStock: typeof minStock === 'number' ? minStock : parseInt(minStock) || 10,
            images: imageArray,
            category: category ? category.trim() : null,
            attributes: attributes || null,
            status: status || 'active',
        };

        console.log('[Create Product] Insert data:', JSON.stringify(insertData));

        const [newProduct] = await db
            .insert(products)
            .values(insertData)
            .returning();

        if (!newProduct) {
            return NextResponse.json({ error: 'Failed to create product' }, { status: 500 });
        }

        console.log('[Create Product] Success:', newProduct.id);
        return NextResponse.json(newProduct, { status: 201 });
    } catch (error: any) {
        console.error('[Create Product] Error:', error);
        console.error('[Create Product] Error message:', error.message);
        console.error('[Create Product] Error code:', error.code);
        return NextResponse.json({
            error: 'Failed to create product',
            details: error.message
        }, { status: 500 });
    }
}
