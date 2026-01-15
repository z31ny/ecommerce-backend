import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { adminUsers } from '@/db/schema';
import { eq } from 'drizzle-orm';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'freezy-bites-admin-secret-key';

interface AdminPayload {
    userId: number;
    email: string;
    role: string;
    isAdmin: boolean;
}

export async function GET(request: NextRequest) {
    try {
        // Get token from Authorization header
        const authHeader = request.headers.get('Authorization');
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return NextResponse.json(
                { error: 'No token provided' },
                { status: 401 }
            );
        }

        const token = authHeader.substring(7);

        // Verify token
        let payload: AdminPayload;
        try {
            payload = jwt.verify(token, JWT_SECRET) as AdminPayload;
        } catch {
            return NextResponse.json(
                { error: 'Invalid token' },
                { status: 401 }
            );
        }

        if (!payload.isAdmin) {
            return NextResponse.json(
                { error: 'Not an admin token' },
                { status: 403 }
            );
        }

        // Get fresh user data from database
        const [admin] = await db
            .select()
            .from(adminUsers)
            .where(eq(adminUsers.id, payload.userId))
            .limit(1);

        if (!admin || !admin.isActive) {
            return NextResponse.json(
                { error: 'User not found or inactive' },
                { status: 401 }
            );
        }

        return NextResponse.json({
            id: admin.id,
            name: admin.name,
            email: admin.email,
            role: admin.role,
            avatar: admin.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(admin.name)}&background=6366f1&color=fff`,
            access: admin.access || ['all'],
            isOwner: admin.role === 'Super Admin'
        });
    } catch (error) {
        console.error('Get admin user error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
