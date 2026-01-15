import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { customers } from '@/db/schema';
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
            .select()
            .from(customers)
            .where(eq(customers.id, customerId))
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
            .update(customers)
            .set({
                name: body.name,
                email: body.email?.toLowerCase(),
                phone: body.phone,
                address: body.address,
                status: body.status,
                totalOrders: body.totalOrders,
                totalSpent: body.totalSpent,
            })
            .where(eq(customers.id, customerId))
            .returning();

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
            .delete(customers)
            .where(eq(customers.id, customerId))
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
