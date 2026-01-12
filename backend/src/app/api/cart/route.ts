import { db } from '@/db';
import { cartItems, products } from '@/db/schema';
import { NextResponse, NextRequest } from 'next/server';
import { and, eq } from 'drizzle-orm';

// --- GET: Fetch all items in a user's cart ---
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const userId = parseInt(searchParams.get('userId') || '0');

        if (!userId) {
            return NextResponse.json({ error: "User ID required" }, { status: 400 });
        }

        const data = await db.select({
            cartItemId: cartItems.id,
            quantity: cartItems.quantity,
            product: {
                id: products.id,
                name: products.name,
                price: products.price,
                image: products.images,
            }
        })
            .from(cartItems)
            .leftJoin(products, eq(cartItems.productId, products.id))
            .where(eq(cartItems.userId, userId));

        return NextResponse.json(data);
    } catch (error) {
        return NextResponse.json({ error: "Failed to fetch cart" }, { status: 500 });
    }
}

// --- POST: Add to cart or Update quantity if already exists ---
export async function POST(request: NextRequest) {
    try {
        const { userId, productId, quantity } = await request.json();

        // Check if item already in cart
        const [existing] = await db.select().from(cartItems).where(
            and(eq(cartItems.userId, userId), eq(cartItems.productId, productId))
        );

        if (existing) {
            // Update quantity
            const updated = await db.update(cartItems)
                .set({ quantity: existing.quantity + quantity, updatedAt: new Date() })
                .where(eq(cartItems.id, existing.id))
                .returning();
            return NextResponse.json({ message: "Quantity updated", data: updated[0] });
        }

        // Insert new item
        const inserted = await db.insert(cartItems).values({
            userId,
            productId,
            quantity
        }).returning();

        return NextResponse.json({ message: "Added to cart", data: inserted[0] });
    } catch (error) {
        return NextResponse.json({ error: "Failed to add to cart" }, { status: 500 });
    }
}

// --- DELETE: Remove an item from the cart ---
export async function DELETE(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const cartItemId = parseInt(searchParams.get('id') || '0');

        if (!cartItemId) {
            return NextResponse.json({ error: "Cart Item ID required" }, { status: 400 });
        }

        await db.delete(cartItems).where(eq(cartItems.id, cartItemId));

        return NextResponse.json({ message: "Item removed from cart" });
    } catch (error) {
        return NextResponse.json({ error: "Failed to delete item" }, { status: 500 });
    }
}