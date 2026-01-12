import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function POST() {
    try {
        // 1. Access the cookies from the request
        const cookieStore = await cookies();

        // 2. Delete the session/auth cookie 
        // (Note: Use the exact name you chose for your session cookie)
        cookieStore.delete('next-auth.session-token');
        cookieStore.delete('__Secure-next-auth.session-token');

        return NextResponse.json({ message: "Signed out successfully" });
    } catch (error) {
        return NextResponse.json({ error: "Logout failed" }, { status: 500 });
    }
}