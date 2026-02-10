import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { adminUsers } from '@/db/schema';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcrypt';

// PUT /api/admin/auth/password — change admin password
export async function PUT(request: NextRequest) {
    try {
        const body = await request.json();
        const { currentPassword, newPassword } = body;

        if (!currentPassword || !newPassword) {
            return NextResponse.json(
                { error: 'Current password and new password are required' },
                { status: 400 }
            );
        }

        if (newPassword.length < 6) {
            return NextResponse.json(
                { error: 'New password must be at least 6 characters' },
                { status: 400 }
            );
        }

        // Get the admin user (use first active admin for now)
        const admins = await db.select().from(adminUsers).where(eq(adminUsers.isActive, true));
        const admin = admins[0];
        if (!admin) {
            return NextResponse.json(
                { error: 'No admin user found' },
                { status: 404 }
            );
        }

        // Verify current password
        const isValid = await bcrypt.compare(currentPassword, admin.passwordHash);
        if (!isValid) {
            return NextResponse.json(
                { error: 'Current password is incorrect' },
                { status: 401 }
            );
        }

        // Hash and update new password
        const newHash = await bcrypt.hash(newPassword, 10);
        await db.update(adminUsers)
            .set({ passwordHash: newHash })
            .where(eq(adminUsers.id, admin.id));

        return NextResponse.json({ success: true, message: 'Password updated successfully' });
    } catch (error) {
        console.error('Password update error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
