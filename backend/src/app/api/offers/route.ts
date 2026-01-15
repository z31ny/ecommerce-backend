import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { offers } from '@/db/schema';
import { eq } from 'drizzle-orm';

// GET /api/offers - Public API to get active offers for website
export async function GET() {
    try {
        // Get only active offers
        const activeOffers = await db
            .select()
            .from(offers)
            .where(eq(offers.isActive, true))
            .orderBy(offers.createdAt);

        return NextResponse.json(activeOffers);
    } catch (error) {
        console.error('Get offers error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch offers' },
            { status: 500 }
        );
    }
}
