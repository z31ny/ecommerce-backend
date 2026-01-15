import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { customers } from '@/db/schema';
import { eq, desc, like, or } from 'drizzle-orm';

// GET /api/admin/customers - List all customers
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const search = searchParams.get('search');
        const status = searchParams.get('status');

        let query = db.select().from(customers);

        // Apply filters
        const conditions = [];
        if (search) {
            conditions.push(
                or(
                    like(customers.name, `%${search}%`),
                    like(customers.email, `%${search}%`),
                    like(customers.phone, `%${search}%`)
                )
            );
        }
        if (status) {
            conditions.push(eq(customers.status, status));
        }

        const result = await db
            .select()
            .from(customers)
            .orderBy(desc(customers.createdAt));

        return NextResponse.json(result);
    } catch (error) {
        console.error('Get customers error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

// POST /api/admin/customers - Create new customer
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { name, email, phone, address, status } = body;

        if (!name || !email) {
            return NextResponse.json(
                { error: 'Name and email are required' },
                { status: 400 }
            );
        }

        const [newCustomer] = await db
            .insert(customers)
            .values({
                name,
                email: email.toLowerCase(),
                phone,
                address,
                status: status || 'active',
            })
            .returning();

        return NextResponse.json(newCustomer, { status: 201 });
    } catch (error: any) {
        if (error.code === '23505') { // Unique violation
            return NextResponse.json(
                { error: 'Customer with this email already exists' },
                { status: 409 }
            );
        }
        console.error('Create customer error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
