import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { products } from '@/db/schema';
import { eq } from 'drizzle-orm';

interface RouteParams {
    params: Promise<{ id: string }>;
}

// GET /api/products/[id] - Get single product
export async function GET(request: NextRequest, { params }: RouteParams) {
    try {
        const { id } = await params;
        const productId = parseInt(id);

        const [product] = await db
            .select()
            .from(products)
            .where(eq(products.id, productId))
            .limit(1);

        if (!product) {
            return NextResponse.json({ error: 'Product not found' }, { status: 404 });
        }

        return NextResponse.json(product);
    } catch (error) {
        console.error('Get product error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// PUT /api/products/[id] - Update product
export async function PUT(request: NextRequest, { params }: RouteParams) {
    try {
        const { id } = await params;
        const productId = parseInt(id);
        const body = await request.json();

        const updateData: Record<string, unknown> = {};

        if (body.name !== undefined) updateData.name = body.name;
        if (body.sku !== undefined) updateData.sku = body.sku;
        if (body.description !== undefined) updateData.description = body.description;
        if (body.price !== undefined) updateData.price = body.price.toString();
        if (body.stock !== undefined) updateData.stock = body.stock;
        if (body.minStock !== undefined) updateData.minStock = body.minStock;
        if (body.category !== undefined) updateData.category = body.category;
        if (body.status !== undefined) updateData.status = body.status;
        if (body.images !== undefined) updateData.images = body.images;
        if (body.image !== undefined) updateData.images = [body.image];

        const [updated] = await db
            .update(products)
            .set(updateData)
            .where(eq(products.id, productId))
            .returning();

        if (!updated) {
            return NextResponse.json({ error: 'Product not found' }, { status: 404 });
        }

        return NextResponse.json(updated);
    } catch (error) {
        console.error('Update product error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// DELETE /api/products/[id] - Delete product
export async function DELETE(request: NextRequest, { params }: RouteParams) {
    try {
        const { id } = await params;
        const productId = parseInt(id);

        const [deleted] = await db
            .delete(products)
            .where(eq(products.id, productId))
            .returning();

        if (!deleted) {
            return NextResponse.json({ error: 'Product not found' }, { status: 404 });
        }

        return NextResponse.json({ success: true, deleted });
    } catch (error) {
        console.error('Delete product error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
