import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { offers } from '@/db/schema';
import { desc, eq } from 'drizzle-orm';

// GET /api/admin/offers - List all offers (including inactive)
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const showAll = searchParams.get('all') === 'true';

        let result;
        if (showAll) {
            result = await db.select().from(offers).orderBy(desc(offers.createdAt));
        } else {
            result = await db.select().from(offers).where(eq(offers.isActive, true)).orderBy(desc(offers.createdAt));
        }

        return NextResponse.json(result);
    } catch (error) {
        console.error('Get admin offers error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// POST /api/admin/offers - Create new offer
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { productSku, name, image, originalPrice, salePrice, discount, category, description, startDate, endDate, isActive } = body;

        if (!productSku || !name || !originalPrice || !salePrice || discount === undefined) {
            return NextResponse.json(
                { error: 'Product SKU, name, original price, sale price, and discount are required' },
                { status: 400 }
            );
        }

        const [newOffer] = await db
            .insert(offers)
            .values({
                productSku,
                name,
                image,
                originalPrice: originalPrice.toString(),
                salePrice: salePrice.toString(),
                discount: parseInt(discount),
                category,
                description,
                startDate: startDate ? new Date(startDate) : undefined,
                endDate: endDate ? new Date(endDate) : undefined,
                isActive: isActive !== false,
            })
            .returning();

        return NextResponse.json(newOffer, { status: 201 });
    } catch (error) {
        console.error('Create offer error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
