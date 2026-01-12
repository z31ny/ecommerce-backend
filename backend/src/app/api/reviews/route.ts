import { db } from '@/db';
import { reviews, users } from '@/db/schema';
import { NextResponse, NextRequest } from 'next/server';
import { eq } from 'drizzle-orm';

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const productId = parseInt(searchParams.get('productId') || '0');

    const productReviews = await db.select({
        id: reviews.id,
        rating: reviews.rating,
        comment: reviews.comment,
        userName: users.fullName,
        date: reviews.createdAt
    })
        .from(reviews)
        .leftJoin(users, eq(reviews.userId, users.id))
        .where(eq(reviews.productId, productId));

    return NextResponse.json(productReviews);
}

export async function POST(request: NextRequest) {
    const { productId, userId, rating, comment } = await request.json();

    const [newReview] = await db.insert(reviews).values({
        productId, userId, rating, comment
    }).returning();

    return NextResponse.json(newReview);
}