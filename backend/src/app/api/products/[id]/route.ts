import { db } from '@/db';
import { products } from '@/db/schema';
import { NextResponse, NextRequest } from 'next/server';
import { eq } from 'drizzle-orm';

interface RouteParams {
    params: Promise<{ id: string }>;
}

// GET: Single product by ID
export async function GET(request: NextRequest, { params }: RouteParams) {
    try {
        const { id } = await params;
        const productId = parseInt(id);

        if (isNaN(productId)) {
            return NextResponse.json({ error: "Invalid product ID" }, { status: 400 });
        }

        const [product] = await db.select().from(products).where(eq(products.id, productId));

        if (!product) {
            return NextResponse.json({ error: "Product not found" }, { status: 404 });
        }

        return NextResponse.json(product);
    } catch (error) {
        return NextResponse.json({ error: "Failed to fetch product" }, { status: 500 });
    }
}

// PUT: Update product
export async function PUT(request: NextRequest, { params }: RouteParams) {
    try {
        const { id } = await params;
        const productId = parseInt(id);
        const body = await request.json();

        if (isNaN(productId)) {
            return NextResponse.json({ error: "Invalid product ID" }, { status: 400 });
        }

        const [updated] = await db.update(products)
            .set({
                name: body.name,
                description: body.description,
                price: body.price,
                stock: body.stock,
                images: body.images,
                category: body.category,
                attributes: body.attributes,
            })
            .where(eq(products.id, productId))
            .returning();

        if (!updated) {
            return NextResponse.json({ error: "Product not found" }, { status: 404 });
        }

        return NextResponse.json({ message: "Product updated", product: updated });
    } catch (error) {
        return NextResponse.json({ error: "Failed to update product" }, { status: 500 });
    }
}

// DELETE: Remove product
export async function DELETE(request: NextRequest, { params }: RouteParams) {
    try {
        const { id } = await params;
        const productId = parseInt(id);

        if (isNaN(productId)) {
            return NextResponse.json({ error: "Invalid product ID" }, { status: 400 });
        }

        const [deleted] = await db.delete(products)
            .where(eq(products.id, productId))
            .returning();

        if (!deleted) {
            return NextResponse.json({ error: "Product not found" }, { status: 404 });
        }

        return NextResponse.json({ message: "Product deleted" });
    } catch (error) {
        return NextResponse.json({ error: "Failed to delete product" }, { status: 500 });
    }
}
