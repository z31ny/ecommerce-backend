import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { messages } from '@/db/schema';
import { desc, eq, and } from 'drizzle-orm';

// GET /api/admin/messages - List all messages
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const filter = searchParams.get('filter'); // inbox, archived, trash

        let conditions = [];

        if (filter === 'archived') {
            conditions.push(eq(messages.isArchived, true));
            conditions.push(eq(messages.isDeleted, false));
        } else if (filter === 'trash') {
            conditions.push(eq(messages.isDeleted, true));
        } else {
            // Default: inbox (not archived, not deleted)
            conditions.push(eq(messages.isArchived, false));
            conditions.push(eq(messages.isDeleted, false));
        }

        const result = await db
            .select()
            .from(messages)
            .where(conditions.length > 0 ? and(...conditions) : undefined)
            .orderBy(desc(messages.createdAt));

        return NextResponse.json(result);
    } catch (error) {
        console.error('Get messages error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

// POST /api/admin/messages - Create new message (from contact form)
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { senderName, senderEmail, subject, message } = body;

        if (!senderName || !senderEmail || !message) {
            return NextResponse.json(
                { error: 'Sender name, email, and message are required' },
                { status: 400 }
            );
        }

        const [newMessage] = await db
            .insert(messages)
            .values({
                senderName,
                senderEmail: senderEmail.toLowerCase(),
                subject,
                message,
            })
            .returning();

        return NextResponse.json(newMessage, { status: 201 });
    } catch (error) {
        console.error('Create message error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
