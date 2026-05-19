import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { getTrafficSnapshot } from '@/lib/site-visitors';

/** Live website traffic for admin overview. */
export async function GET(request: NextRequest) {
    try {
        const user = getAuthUser(request);
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        return NextResponse.json(getTrafficSnapshot());
    } catch (error) {
        console.error('Traffic API error:', error);
        return NextResponse.json({ error: 'Failed to fetch traffic' }, { status: 500 });
    }
}
