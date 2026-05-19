import { NextRequest, NextResponse } from 'next/server';
import { recordVisitorPing } from '@/lib/site-visitors';

/** Public heartbeat — storefront pages ping every ~30s while open. */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json().catch(() => ({}));
        const visitorId =
            typeof body.visitorId === 'string'
                ? body.visitorId
                : typeof body.visitor_id === 'string'
                  ? body.visitor_id
                  : '';
        const page =
            typeof body.page === 'string'
                ? body.page
                : typeof body.path === 'string'
                  ? body.path
                  : 'unknown';

        recordVisitorPing(visitorId, page);

        return NextResponse.json({ ok: true });
    } catch (error) {
        console.error('Visitor ping error:', error);
        return NextResponse.json({ ok: false }, { status: 500 });
    }
}

export async function OPTIONS() {
    return new NextResponse(null, { status: 200 });
}
