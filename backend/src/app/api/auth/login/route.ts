import { db } from '@/db';
import { users } from '@/db/schema';
import { NextResponse, NextRequest } from 'next/server';
import bcrypt from 'bcrypt';
import { eq } from 'drizzle-orm';
import { signToken } from '@/lib/auth';

export async function POST(request: NextRequest) {
    try {
        const { email, password } = await request.json();

        // 1. Find the user by email
        const [user] = await db.select().from(users).where(eq(users.email, email));

        // 2. If user doesn't exist, return error
        if (!user) {
            return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
        }

        // 3. Compare the "raw" password with the hashed password from Neon
        const isPasswordValid = await bcrypt.compare(password, user.passwordHash);

        if (!isPasswordValid) {
            return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
        }

        // 4. Generate JWT token
        const token = signToken({ userId: user.id, email: user.email });

        // 5. Success! Return user info and token
        return NextResponse.json({
            message: "Login successful!",
            token,
            user: { id: user.id, email: user.email, name: user.fullName }
        });

    } catch (error) {
        return NextResponse.json({ error: "Login failed" }, { status: 500 });
    }
}
