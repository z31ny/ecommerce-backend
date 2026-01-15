import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { adminUsers } from '@/db/schema';
import { desc, eq } from 'drizzle-orm';
import bcrypt from 'bcrypt';

// GET /api/admin/users - List all admin users
export async function GET(request: NextRequest) {
    try {
        const result = await db
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
            .orderBy(desc(adminUsers.createdAt));

        return NextResponse.json(result);
    } catch (error) {
        console.error('Get admin users error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

// POST /api/admin/users - Create new admin user
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { email, password, name, role, access, avatar } = body;

        if (!email || !password || !name) {
            return NextResponse.json(
                { error: 'Email, password, and name are required' },
                { status: 400 }
            );
        }

        // Hash password
        const passwordHash = await bcrypt.hash(password, 10);

        const [newUser] = await db
            .insert(adminUsers)
            .values({
                email: email.toLowerCase(),
                passwordHash,
                name,
                role: role || 'Staff',
                access: access || ['overview'],
                avatar,
                isActive: true,
            })
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

        return NextResponse.json(newUser, { status: 201 });
    } catch (error: any) {
        if (error.code === '23505') {
            return NextResponse.json(
                { error: 'User with this email already exists' },
                { status: 409 }
            );
        }
        console.error('Create admin user error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
