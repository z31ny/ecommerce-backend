import { db } from '@/db';
import { orders, orderItems, cartItems, products } from '@/db/schema';
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
        const { userId, items, guest } = body as {
            userId?: number;
            items?: CartItem[];
            guest?: GuestInfo;
        };

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

            // Create Order (with optional guest info stored in stripeSessionId field temporarily)
            const guestData = guest ? JSON.stringify(guest) : null;
            const insertedOrder = await tx.insert(orders).values({
                userId: userId || null,
                totalAmount: total.toString(),
                status: 'pending',
                stripeSessionId: guestData, // Store guest info here for now
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
        return NextResponse.json({ error: error.message }, { status: 400 });
    }
}
