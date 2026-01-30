import { db } from '@/db';
import { users } from '@/db/schema';
import { NextResponse, NextRequest } from 'next/server';
import bcrypt from 'bcrypt';
import { eq } from 'drizzle-orm';
import { signToken } from '@/lib/auth';

export async function POST(request: NextRequest) {
    try {
        const { email, password, fullName } = await request.json();

        // 1. Check if user already exists
        const [existingUser] = await db.select().from(users).where(eq(users.email, email));
        if (existingUser) {
            return NextResponse.json({ error: "User already exists" }, { status: 400 });
        }

        // 2. Hash the password (safety first!)
        const saltRounds = 10;
        const passwordHash = await bcrypt.hash(password, saltRounds);

        // 3. Insert into Neon
        const [newUser] = await db.insert(users).values({
            email,
            passwordHash,
            fullName,
        }).returning();

        if (!newUser) {
            return NextResponse.json({ error: "Failed to create user" }, { status: 500 });
        }

        // 4. Generate JWT token for auto-login
        const token = signToken({ userId: newUser.id, email: newUser.email });

        return NextResponse.json({
            message: "User created!",
            token,
            user: { id: newUser.id, email: newUser.email, name: newUser.fullName }
        });
    } catch (error: any) {
        console.error('Signup error:', error);
        console.error('Error details:', error.message, error.code);
        return NextResponse.json({ error: "Signup failed", details: error.message }, { status: 500 });
    }
}
