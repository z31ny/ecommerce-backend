import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';

interface RouteParams {
    params: Promise<{ id: string }>;
}

// GET /api/admin/customers/[id] - Get single customer
export async function GET(request: NextRequest, { params }: RouteParams) {
    try {
        const { id } = await params;
        const customerId = parseInt(id);

        const [customer] = await db
            .select({
                id: users.id,
                name: users.fullName,
                email: users.email,
                phone: users.phone,
                address: users.address,
                totalOrders: users.totalOrders,
                totalSpent: users.totalSpent,
                status: users.status,
                createdAt: users.createdAt,
            })
            .from(users)
            .where(eq(users.id, customerId))
            .limit(1);

        if (!customer) {
            return NextResponse.json(
                { error: 'Customer not found' },
                { status: 404 }
            );
        }

        return NextResponse.json(customer);
    } catch (error) {
        console.error('Get customer error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

// PUT /api/admin/customers/[id] - Update customer
export async function PUT(request: NextRequest, { params }: RouteParams) {
    try {
        const { id } = await params;
        const customerId = parseInt(id);
        const body = await request.json();

        const [updated] = await db
            .update(users)
            .set({
                fullName: body.name,
                email: body.email?.toLowerCase(),
                phone: body.phone,
                address: body.address,
                status: body.status,
                totalOrders: body.totalOrders,
                totalSpent: body.totalSpent,
            })
            .where(eq(users.id, customerId))
            .returning({
                id: users.id,
                name: users.fullName,
                email: users.email,
                phone: users.phone,
                address: users.address,
                totalOrders: users.totalOrders,
                totalSpent: users.totalSpent,
                status: users.status,
                createdAt: users.createdAt,
            });

        if (!updated) {
            return NextResponse.json(
                { error: 'Customer not found' },
                { status: 404 }
            );
        }

        return NextResponse.json(updated);
    } catch (error) {
        console.error('Update customer error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

// DELETE /api/admin/customers/[id] - Delete customer
export async function DELETE(request: NextRequest, { params }: RouteParams) {
    try {
        const { id } = await params;
        const customerId = parseInt(id);

        const [deleted] = await db
            .delete(users)
            .where(eq(users.id, customerId))
            .returning();

        if (!deleted) {
            return NextResponse.json(
                { error: 'Customer not found' },
                { status: 404 }
            );
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Delete customer error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
