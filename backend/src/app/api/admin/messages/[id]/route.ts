import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { messages } from '@/db/schema';
import { eq } from 'drizzle-orm';

interface RouteParams {
    params: Promise<{ id: string }>;
}

// GET /api/admin/messages/[id]
export async function GET(request: NextRequest, { params }: RouteParams) {
    try {
        const { id } = await params;
        const messageId = parseInt(id);

        const [message] = await db
            .select()
            .from(messages)
            .where(eq(messages.id, messageId))
            .limit(1);

        if (!message) {
            return NextResponse.json(
                { error: 'Message not found' },
                { status: 404 }
            );
        }

        // Mark as read when viewed
        if (!message.isRead) {
            await db
                .update(messages)
                .set({ isRead: true })
                .where(eq(messages.id, messageId));
        }

        return NextResponse.json({ ...message, isRead: true });
    } catch (error) {
        console.error('Get message error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

// PUT /api/admin/messages/[id] - Update message (read, archive, etc)
export async function PUT(request: NextRequest, { params }: RouteParams) {
    try {
        const { id } = await params;
        const messageId = parseInt(id);
        const body = await request.json();

        const [updated] = await db
            .update(messages)
            .set({
                isRead: body.isRead,
                isArchived: body.isArchived,
                isDeleted: body.isDeleted,
            })
            .where(eq(messages.id, messageId))
            .returning();

        if (!updated) {
            return NextResponse.json(
                { error: 'Message not found' },
                { status: 404 }
            );
        }

        return NextResponse.json(updated);
    } catch (error) {
        console.error('Update message error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

// DELETE /api/admin/messages/[id] - Permanently delete message
export async function DELETE(request: NextRequest, { params }: RouteParams) {
    try {
        const { id } = await params;
        const messageId = parseInt(id);

        const [deleted] = await db
            .delete(messages)
            .where(eq(messages.id, messageId))
            .returning();

        if (!deleted) {
            return NextResponse.json(
                { error: 'Message not found' },
                { status: 404 }
            );
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Delete message error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
