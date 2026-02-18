import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { websiteContent } from '@/db/schema';
import { eq } from 'drizzle-orm';

// Disable Next.js caching — admin must always get fresh data
export const dynamic = 'force-dynamic';
export const revalidate = 0;
// Settings section keys (stored in the same website_content table)
const SETTINGS_SECTIONS = [
    'settings_branding',
    'settings_store',
    'settings_notifications',
    'settings_payment'
];

// GET /api/admin/settings — return all settings sections
export async function GET() {
    try {
        const rows = await db.select().from(websiteContent);

        const result: Record<string, any> = {};
        for (const row of rows) {
            if (row.sectionKey.startsWith('settings_')) {
                // Remove 'settings_' prefix for cleaner key names
                const key = row.sectionKey.replace('settings_', '');
                result[key] = row.content;
            }
        }

        return NextResponse.json(result);
    } catch (error) {
        console.error('Get settings error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

// PUT /api/admin/settings — upsert a settings section
// Body: { sectionKey: string, content: any }
export async function PUT(request: NextRequest) {
    try {
        const body = await request.json();
        const { sectionKey, content } = body;

        const fullKey = `settings_${sectionKey}`;

        if (!SETTINGS_SECTIONS.includes(fullKey)) {
            return NextResponse.json(
                { error: `Invalid settings section. Must be one of: branding, store, notifications, payment` },
                { status: 400 }
            );
        }

        if (content === undefined) {
            return NextResponse.json(
                { error: 'Content is required' },
                { status: 400 }
            );
        }

        // Check if section exists
        const existing = await db.select()
            .from(websiteContent)
            .where(eq(websiteContent.sectionKey, fullKey));

        if (existing.length > 0) {
            await db.update(websiteContent)
                .set({ content, updatedAt: new Date() })
                .where(eq(websiteContent.sectionKey, fullKey));
        } else {
            await db.insert(websiteContent).values({
                sectionKey: fullKey,
                content,
                updatedAt: new Date(),
            });
        }

        return NextResponse.json({ success: true, sectionKey });
    } catch (error) {
        console.error('Update settings error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
