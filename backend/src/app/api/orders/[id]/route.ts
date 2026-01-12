import { db } from '@/db';
import { orders, orderItems, products } from '@/db/schema';
import { NextResponse, NextRequest } from 'next/server';
import { eq } from 'drizzle-orm';

interface RouteParams {
    params: Promise<{ id: string }>;
}

// GET: Single order with items
export async function GET(request: NextRequest, { params }: RouteParams) {
    try {
        const { id } = await params;
        const orderId = parseInt(id);

        if (isNaN(orderId)) {
            return NextResponse.json({ error: "Invalid order ID" }, { status: 400 });
        }

        // Get the order
        const [order] = await db.select().from(orders).where(eq(orders.id, orderId));

        if (!order) {
            return NextResponse.json({ error: "Order not found" }, { status: 404 });
        }

        // Get order items with product details
        const items = await db.select({
            id: orderItems.id,
            quantity: orderItems.quantity,
            priceAtPurchase: orderItems.priceAtPurchase,
            product: {
                id: products.id,
                name: products.name,
                images: products.images,
            }
        })
            .from(orderItems)
            .leftJoin(products, eq(orderItems.productId, products.id))
            .where(eq(orderItems.orderId, orderId));

        return NextResponse.json({
            ...order,
            items
        });
    } catch (error) {
        return NextResponse.json({ error: "Failed to fetch order" }, { status: 500 });
    }
}

// PUT: Update order status
export async function PUT(request: NextRequest, { params }: RouteParams) {
    try {
        const { id } = await params;
        const orderId = parseInt(id);
        const body = await request.json();

        if (isNaN(orderId)) {
            return NextResponse.json({ error: "Invalid order ID" }, { status: 400 });
        }

        const updateData: Record<string, any> = {};

        if (body.status) {
            updateData.status = body.status;
        }
        if (body.paymentStatus) {
            updateData.paymentStatus = body.paymentStatus;
        }

        if (Object.keys(updateData).length === 0) {
            return NextResponse.json({ error: "No fields to update" }, { status: 400 });
        }

        const [updated] = await db.update(orders)
            .set(updateData)
            .where(eq(orders.id, orderId))
            .returning();

        if (!updated) {
            return NextResponse.json({ error: "Order not found" }, { status: 404 });
        }

        return NextResponse.json({ message: "Order updated", order: updated });
    } catch (error) {
        return NextResponse.json({ error: "Failed to update order" }, { status: 500 });
    }
}
