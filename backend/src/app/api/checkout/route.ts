import { db } from '@/db';
import { orders, orderItems, cartItems, products, users } from '@/db/schema';
import { NextResponse, NextRequest } from 'next/server';
import { eq, inArray } from 'drizzle-orm';

interface CartItem {
    productId: number;
    quantity: number;
}

interface GuestInfo {
    email: string;
    name: string;
    phone?: string;
    address?: string;
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        console.log('[Checkout] Received body:', JSON.stringify(body, null, 2));

        const { userId, items, guest } = body as {
            userId?: number;
            items?: CartItem[];
            guest?: GuestInfo;
        };

        console.log('[Checkout] Guest info:', guest);
        console.log('[Checkout] Guest phone:', guest?.phone);

        // Determine checkout mode: user cart vs direct items
        const useDirectItems = items && items.length > 0;

        if (!userId && !useDirectItems) {
            return NextResponse.json(
                { error: "Either userId (for cart checkout) or items array (for guest checkout) is required" },
                { status: 400 }
            );
        }

        const result = await db.transaction(async (tx) => {
            let checkoutItems: { productId: number; quantity: number; price: string; stock: number; productName: string }[];

            if (useDirectItems) {
                // Guest checkout: validate items directly
                const productIds = items!.map(i => i.productId);
                const productData = await tx.select({
                    id: products.id,
                    name: products.name,
                    price: products.price,
                    stock: products.stock,
                }).from(products).where(inArray(products.id, productIds));

                const productMap = new Map(productData.map(p => [p.id, p]));

                checkoutItems = items!.map(item => {
                    const product = productMap.get(item.productId);
                    if (!product) {
                        throw new Error(`Product with ID ${item.productId} not found`);
                    }
                    return {
                        productId: item.productId,
                        quantity: item.quantity,
                        price: product.price,
                        stock: product.stock,
                        productName: product.name,
                    };
                });
            } else {
                // Authenticated checkout: use cart
                const userCart = await tx.select({
                    productId: cartItems.productId,
                    quantity: cartItems.quantity,
                    price: products.price,
                    stock: products.stock,
                    productName: products.name
                })
                    .from(cartItems)
                    .leftJoin(products, eq(cartItems.productId, products.id))
                    .where(eq(cartItems.userId, userId!));

                if (!userCart.length) throw new Error("Cart is empty");

                checkoutItems = userCart.map(item => ({
                    productId: item.productId,
                    quantity: item.quantity,
                    price: item.price!,
                    stock: item.stock!,
                    productName: item.productName!,
                }));
            }

            // Validate stock availability
            for (const item of checkoutItems) {
                if (item.stock === null || item.stock === undefined) {
                    throw new Error(`Product not found for cart item`);
                }
                if (item.quantity > item.stock) {
                    throw new Error(`Insufficient stock for "${item.productName}". Requested: ${item.quantity}, Available: ${item.stock}`);
                }
            }

            // Calculate Total
            const total = checkoutItems.reduce((acc, item) =>
                acc + (Number(item.price) * item.quantity), 0
            );

            // Create or find user for guest checkout
            let finalUserId: number | null = userId || null;
            if (guest && guest.email) {
                // Check if user already exists
                const existingUsers = await tx.select()
                    .from(users)
                    .where(eq(users.email, guest.email.toLowerCase()))
                    .limit(1);

                if (existingUsers.length > 0 && existingUsers[0]) {
                    // Update existing user's order count and total spent
                    const user = existingUsers[0];
                    finalUserId = user.id;
                    await tx.update(users)
                        .set({
                            totalOrders: (user.totalOrders ?? 0) + 1,
                            totalSpent: ((Number(user.totalSpent) || 0) + total).toString(),
                            phone: guest.phone || user.phone,
                            address: guest.address || user.address,
                            fullName: guest.name || user.fullName,
                        })
                        .where(eq(users.id, finalUserId));
                } else {
                    // Create new user (guest - no password)
                    const insertedUsers = await tx.insert(users)
                        .values({
                            fullName: guest.name,
                            email: guest.email.toLowerCase(),
                            phone: guest.phone || null,
                            address: guest.address || null,
                            totalOrders: 1,
                            totalSpent: total.toString(),
                            status: 'active',
                        })
                        .returning();
                    if (insertedUsers[0]) {
                        finalUserId = insertedUsers[0].id;
                    }
                }
            }

            // Create Order
            const insertedOrder = await tx.insert(orders).values({
                userId: finalUserId,
                totalAmount: total.toString(),
                status: 'pending',
                paymentMethod: 'COD',
            }).returning();

            const newOrder = insertedOrder[0];

            if (!newOrder) {
                throw new Error("Failed to create order");
            }

            // Move to Order Items
            const itemsToInsert = checkoutItems.map(item => ({
                orderId: newOrder.id,
                productId: item.productId,
                quantity: item.quantity,
                priceAtPurchase: item.price
            }));

            await tx.insert(orderItems).values(itemsToInsert);

            // Update product stock
            for (const item of checkoutItems) {
                await tx.update(products)
                    .set({ stock: item.stock - item.quantity })
                    .where(eq(products.id, item.productId));
            }

            // Clear Cart (only if user checkout)
            if (userId && !useDirectItems) {
                await tx.delete(cartItems).where(eq(cartItems.userId, userId));
            }

            return newOrder;
        });

        return NextResponse.json({
            message: "Checkout successful!",
            order: result,
            orderId: result.id
        });
    } catch (error: any) {
        console.error('Checkout error:', error);
        console.error('Error details:', error.message, error.code);
        return NextResponse.json({ error: error.message, details: error.code }, { status: 400 });
    }
}
