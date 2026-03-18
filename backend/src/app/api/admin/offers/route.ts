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
        const { productSku, name, image, images, link, originalPrice, salePrice, discount, category, description, startDate, endDate, isActive } = body;

        if (!name || !originalPrice || !salePrice || discount === undefined) {
            return NextResponse.json(
                { error: 'Name, original price, sale price, and discount are required' },
                { status: 400 }
            );
        }

        const imagesArr = Array.isArray(images) ? images.filter(Boolean).map((x: any) => String(x)) : undefined;

        const [newOffer] = await db
            .insert(offers)
            .values({
                productSku: productSku ? String(productSku) : undefined,
                name,
                image,
                images: imagesArr && imagesArr.length ? imagesArr : undefined,
                link: link ? String(link) : undefined,
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

        if (!newOffer) {
            return NextResponse.json(
                { error: 'Failed to create offer' },
                { status: 500 }
            );
        }

        return NextResponse.json(newOffer, { status: 201 });
    } catch (error) {
        console.error('Create offer error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
