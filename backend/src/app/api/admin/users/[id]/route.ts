import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { adminUsers } from '@/db/schema';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcrypt';

interface RouteParams {
    params: Promise<{ id: string }>;
}

// GET /api/admin/users/[id]
export async function GET(request: NextRequest, { params }: RouteParams) {
    try {
        const { id } = await params;
        const userId = parseInt(id);

        const [user] = await db
            .select({
                id: adminUsers.id,
                email: adminUsers.email,
                name: adminUsers.name,
                role: adminUsers.role,
                avatar: adminUsers.avatar,
                access: adminUsers.access,
                isActive: adminUsers.isActive,
                createdAt: adminUsers.createdAt,
            })
            .from(adminUsers)
            .where(eq(adminUsers.id, userId))
            .limit(1);

        if (!user) {
            return NextResponse.json(
                { error: 'User not found' },
                { status: 404 }
            );
        }

        return NextResponse.json(user);
    } catch (error) {
        console.error('Get admin user error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

// PUT /api/admin/users/[id]
export async function PUT(request: NextRequest, { params }: RouteParams) {
    try {
        const { id } = await params;
        const userId = parseInt(id);
        const body = await request.json();

        const updateData: any = {
            name: body.name,
            email: body.email?.toLowerCase(),
            role: body.role,
            access: body.access,
            avatar: body.avatar,
            isActive: body.isActive,
        };

        // Only hash password if provided
        if (body.password) {
            updateData.passwordHash = await bcrypt.hash(body.password, 10);
        }

        const [updated] = await db
            .update(adminUsers)
            .set(updateData)
            .where(eq(adminUsers.id, userId))
            .returning({
                id: adminUsers.id,
                email: adminUsers.email,
                name: adminUsers.name,
                role: adminUsers.role,
                avatar: adminUsers.avatar,
                access: adminUsers.access,
                isActive: adminUsers.isActive,
                createdAt: adminUsers.createdAt,
            });

        if (!updated) {
            return NextResponse.json(
                { error: 'User not found' },
                { status: 404 }
            );
        }

        return NextResponse.json(updated);
    } catch (error) {
        console.error('Update admin user error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

// DELETE /api/admin/users/[id]
export async function DELETE(request: NextRequest, { params }: RouteParams) {
    try {
        const { id } = await params;
        const userId = parseInt(id);

        const [deleted] = await db
            .delete(adminUsers)
            .where(eq(adminUsers.id, userId))
            .returning();

        if (!deleted) {
            return NextResponse.json(
                { error: 'User not found' },
                { status: 404 }
            );
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Delete admin user error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
