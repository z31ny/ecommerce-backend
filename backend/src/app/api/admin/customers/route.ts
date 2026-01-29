import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq, desc, like, or } from 'drizzle-orm';

// GET /api/admin/customers - List all customers (from users table)
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const search = searchParams.get('search');
        const status = searchParams.get('status');

        let conditions = [];
        if (search) {
            conditions.push(
                or(
                    like(users.fullName, `%${search}%`),
                    like(users.email, `%${search}%`),
                    like(users.phone, `%${search}%`)
                )
            );
        }
        if (status) {
            conditions.push(eq(users.status, status));
        }

        const result = await db
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
            .orderBy(desc(users.createdAt));

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
            .insert(users)
            .values({
                fullName: name,
                email: email.toLowerCase(),
                phone,
                address,
                status: status || 'active',
            })
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
