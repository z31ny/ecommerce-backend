import { db } from '@/db';
import { orders } from '@/db/schema';
import { NextResponse, NextRequest } from 'next/server';
import { eq, desc } from 'drizzle-orm';

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const userId = parseInt(searchParams.get('userId') || '0');

        if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        // Fetch orders, newest first
        const history = await db.select()
            .from(orders)
            .where(eq(orders.userId, userId))
            .orderBy(desc(orders.createdAt));

        return NextResponse.json(history);
    } catch (error) {
        return NextResponse.json({ error: "Failed to fetch history" }, { status: 500 });
    }
}