import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { products } from '@/db/schema';
import { eq } from 'drizzle-orm';

// GET /api/admin/products/[id] - Get single product
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
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

// PUT /api/admin/products/[id] - Update product
export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const productId = parseInt(id);
        const body = await request.json();

        const { sku, name, description, price, stock, minStock, images, image, category, attributes, status } = body;

        const updateData: any = {};
        if (sku !== undefined) updateData.sku = sku;
        if (name !== undefined) updateData.name = name;
        if (description !== undefined) updateData.description = description;
        if (price !== undefined) updateData.price = price.toString();
        if (stock !== undefined) updateData.stock = stock;
        if (minStock !== undefined) updateData.minStock = minStock;
        if (images !== undefined) updateData.images = images;
        if (image !== undefined && !images) updateData.images = [image];
        if (category !== undefined) updateData.category = category;
        if (attributes !== undefined) updateData.attributes = attributes;
        if (status !== undefined) updateData.status = status;

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

// DELETE /api/admin/products/[id] - Soft delete product (set status to 'deleted')
export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const productId = parseInt(id);

        console.log('[Delete Product] Soft deleting product ID:', productId);

        // Always soft delete - set status to 'deleted'
        const [deleted] = await db
            .update(products)
            .set({ status: 'deleted' })
            .where(eq(products.id, productId))
            .returning();

        if (!deleted) {
            return NextResponse.json({ error: 'Product not found' }, { status: 404 });
        }

        console.log('[Delete Product] Successfully soft deleted:', deleted.id);
        return NextResponse.json({
            success: true,
            deleted,
            message: 'Product deleted successfully'
        });
    } catch (error: any) {
        console.error('Delete product error:', error);
        return NextResponse.json({ error: error.message || 'Delete failed' }, { status: 500 });
    }
}
