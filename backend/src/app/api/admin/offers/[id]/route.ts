import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { offers } from '@/db/schema';
import { eq } from 'drizzle-orm';

interface RouteParams {
    params: Promise<{ id: string }>;
}

// GET /api/admin/offers/[id]
export async function GET(request: NextRequest, { params }: RouteParams) {
    try {
        const { id } = await params;
        const offerId = parseInt(id);

        const [offer] = await db
            .select()
            .from(offers)
            .where(eq(offers.id, offerId))
            .limit(1);

        if (!offer) {
            return NextResponse.json({ error: 'Offer not found' }, { status: 404 });
        }

        return NextResponse.json(offer);
    } catch (error) {
        console.error('Get offer error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// PUT /api/admin/offers/[id] - Update offer
export async function PUT(request: NextRequest, { params }: RouteParams) {
    try {
        const { id } = await params;
        const offerId = parseInt(id);
        const body = await request.json();

        const [updated] = await db
            .update(offers)
            .set({
                productSku: body.productSku,
                name: body.name,
                image: body.image,
                originalPrice: body.originalPrice?.toString(),
                salePrice: body.salePrice?.toString(),
                discount: body.discount !== undefined ? parseInt(body.discount) : undefined,
                category: body.category,
                description: body.description,
                startDate: body.startDate ? new Date(body.startDate) : undefined,
                endDate: body.endDate ? new Date(body.endDate) : undefined,
                isActive: body.isActive,
            })
            .where(eq(offers.id, offerId))
            .returning();

        if (!updated) {
            return NextResponse.json({ error: 'Offer not found' }, { status: 404 });
        }

        return NextResponse.json(updated);
    } catch (error) {
        console.error('Update offer error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// DELETE /api/admin/offers/[id]
export async function DELETE(request: NextRequest, { params }: RouteParams) {
    try {
        const { id } = await params;
        const offerId = parseInt(id);

        const [deleted] = await db
            .delete(offers)
            .where(eq(offers.id, offerId))
            .returning();

        if (!deleted) {
            return NextResponse.json({ error: 'Offer not found' }, { status: 404 });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Delete offer error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
