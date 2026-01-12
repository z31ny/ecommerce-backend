import { db } from '@/db';
import { cartItems, products } from '@/db/schema';
import { NextResponse, NextRequest } from 'next/server';
import { eq } from 'drizzle-orm';

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const userId = parseInt(searchParams.get('userId') || '0');

        const items = await db.select({
            quantity: cartItems.quantity,
            price: products.price
        })
            .from(cartItems)
            .leftJoin(products, eq(cartItems.productId, products.id))
            .where(eq(cartItems.userId, userId));

        // 1. Calculate Subtotal
        const subtotal = items.reduce((acc, item) => {
            return acc + (Number(item.price || 0) * item.quantity);
        }, 0);

        // 2. Add Tax (e.g., 14% for Egypt VAT)
        const tax = subtotal * 0.14;
        const total = subtotal + tax;

        return NextResponse.json({
            subtotal: subtotal.toFixed(2),
            tax: tax.toFixed(2),
            total: total.toFixed(2),
            currency: "EGP"
        });
    } catch (error) {
        return NextResponse.json({ error: "Summary failed" }, { status: 500 });
    }
}