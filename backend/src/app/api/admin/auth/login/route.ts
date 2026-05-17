import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { adminUsers } from '@/db/schema';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'freezy-bites-admin-secret-key';

export async function POST(request: NextRequest) {
    try {
        const { email, password } = await request.json();

        if (!email || !password) {
            return NextResponse.json(
                { error: 'Email and password are required' },
                { status: 400 }
            );
        }

        // Find admin user by email — explicitly select all columns including passwordHash
        const [admin] = await db
            .select({
                id: adminUsers.id,
                email: adminUsers.email,
                passwordHash: adminUsers.passwordHash,
                name: adminUsers.name,
                role: adminUsers.role,
                avatar: adminUsers.avatar,
                access: adminUsers.access,
                isActive: adminUsers.isActive,
            })
            .from(adminUsers)
            .where(eq(adminUsers.email, email.toLowerCase()))
            .limit(1);

        if (!admin) {
            return NextResponse.json(
                { error: 'Invalid email or password' },
                { status: 401 }
            );
        }

        if (!admin.isActive) {
            return NextResponse.json(
                { error: 'Account is deactivated' },
                { status: 403 }
            );
        }

        // Verify password
        if (!admin.passwordHash) {
            return NextResponse.json(
                { error: 'Account has no password set. Contact your administrator.' },
                { status: 401 }
            );
        }

        const isValidPassword = await bcrypt.compare(password, admin.passwordHash);
        if (!isValidPassword) {
            return NextResponse.json(
                { error: 'Invalid email or password' },
                { status: 401 }
            );
        }

        // Generate JWT token
        const token = jwt.sign(
            {
                userId: admin.id,
                email: admin.email,
                role: admin.role,
                isAdmin: true
            },
            JWT_SECRET,
            { expiresIn: '7d' }
        );

        // Return user info and token
        return NextResponse.json({
            success: true,
            token,
            user: {
                id: admin.id,
                name: admin.name,
                email: admin.email,
                role: admin.role,
                avatar: admin.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(admin.name)}&background=6366f1&color=fff`,
                access: admin.access || ['all'],
                isOwner: admin.role === 'Super Admin'
            }
        });
    } catch (error) {
        console.error('Admin login error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
