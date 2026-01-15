import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { orders, orderItems, products } from '@/db/schema';
import { eq } from 'drizzle-orm';

interface RouteParams {
    params: Promise<{ id: string }>;
}

// GET /api/admin/orders/[id]
export async function GET(request: NextRequest, { params }: RouteParams) {
    try {
        const { id } = await params;
        const orderId = parseInt(id);

        const [order] = await db
            .select()
            .from(orders)
            .where(eq(orders.id, orderId))
            .limit(1);

        if (!order) {
            return NextResponse.json({ error: 'Order not found' }, { status: 404 });
        }

        // Get order items
        const items = await db
            .select({
                productId: orderItems.productId,
                quantity: orderItems.quantity,
                priceAtPurchase: orderItems.priceAtPurchase,
                productName: products.name,
            })
            .from(orderItems)
            .leftJoin(products, eq(orderItems.productId, products.id))
            .where(eq(orderItems.orderId, orderId));

        return NextResponse.json({ ...order, items });
    } catch (error) {
        console.error('Get order error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// PUT /api/admin/orders/[id] - Update order status
export async function PUT(request: NextRequest, { params }: RouteParams) {
    try {
        const { id } = await params;
        const orderId = parseInt(id);
        const body = await request.json();

        const updateData: Record<string, unknown> = {};

        if (body.status !== undefined) updateData.status = body.status;
        if (body.paymentStatus !== undefined) updateData.paymentStatus = body.paymentStatus;
        if (body.depositStatus !== undefined) updateData.depositStatus = body.depositStatus;
        if (body.depositAmount !== undefined) updateData.depositAmount = body.depositAmount?.toString();

        const [updated] = await db
            .update(orders)
            .set(updateData)
            .where(eq(orders.id, orderId))
            .returning();

        if (!updated) {
            return NextResponse.json({ error: 'Order not found' }, { status: 404 });
        }

        return NextResponse.json(updated);
    } catch (error) {
        console.error('Update order error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// DELETE /api/admin/orders/[id]
export async function DELETE(request: NextRequest, { params }: RouteParams) {
    try {
        const { id } = await params;
        const orderId = parseInt(id);

        // Delete order items first
        await db.delete(orderItems).where(eq(orderItems.orderId, orderId));

        const [deleted] = await db
            .delete(orders)
            .where(eq(orders.id, orderId))
            .returning();

        if (!deleted) {
            return NextResponse.json({ error: 'Order not found' }, { status: 404 });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Delete order error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
