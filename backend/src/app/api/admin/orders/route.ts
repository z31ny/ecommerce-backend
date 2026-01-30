import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { orders, orderItems, products, users } from '@/db/schema';
import { desc, eq } from 'drizzle-orm';

// GET /api/admin/orders - List all orders with details
export async function GET(request: NextRequest) {
    try {
        const allOrders = await db
            .select({
                id: orders.id,
                userId: orders.userId,
                status: orders.status,
                totalAmount: orders.totalAmount,
                paymentStatus: orders.paymentStatus,
                paymentMethod: orders.paymentMethod,
                depositAmount: orders.depositAmount,
                depositStatus: orders.depositStatus,
                createdAt: orders.createdAt,
            })
            .from(orders)
            .orderBy(desc(orders.createdAt));

        // Enrich with user info and order items
        const enrichedOrders = await Promise.all(
            allOrders.map(async (order) => {
                // Get customer name from users table
                let customerName = 'Guest';
                let customerEmail = '';
                let customerPhone = '';

                if (order.userId) {
                    const [user] = await db.select().from(users).where(eq(users.id, order.userId)).limit(1);
                    if (user) {
                        customerName = user.fullName || user.email;
                        customerEmail = user.email;
                        customerPhone = user.phone || '';
                    }
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
                    .where(eq(orderItems.orderId, order.id));

                return {
                    ...order,
                    customer: {
                        name: customerName,
                        email: customerEmail,
                        phone: customerPhone,
                    },
                    items,
                    date: order.createdAt?.toISOString().split('T')[0] || '',
                };
            })
        );

        return NextResponse.json(enrichedOrders);
    } catch (error: any) {
        console.error('Get orders error:', error);
        console.error('Error details:', error.message, error.code);
        return NextResponse.json({ error: 'Internal server error', details: error.message }, { status: 500 });
    }
}

// POST /api/admin/orders - Create order (from admin)
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();

        const [newOrder] = await db.insert(orders).values({
            userId: body.userId || null,
            status: body.status || 'pending',
            totalAmount: body.totalAmount?.toString() || '0',
            paymentStatus: body.paymentStatus || 'unpaid',
            paymentMethod: body.paymentMethod || 'COD',
            depositAmount: body.depositAmount?.toString() || null,
            depositStatus: body.depositStatus || 'pending',
        }).returning();

        return NextResponse.json(newOrder, { status: 201 });
    } catch (error: any) {
        console.error('Create order error:', error);
        console.error('Error details:', error.message, error.code);
        return NextResponse.json({ error: 'Internal server error', details: error.message }, { status: 500 });
    }
}
