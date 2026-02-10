import { NextResponse } from 'next/server';
import { db } from '@/db';
import { websiteContent } from '@/db/schema';

// GET /api/settings — public route for storefront to read settings + content
// Returns all website_content entries (settings + content sections)
export async function GET() {
    try {
        const rows = await db.select().from(websiteContent);

        const result: Record<string, any> = {};
        for (const row of rows) {
            // Clean up key names: remove 'settings_' prefix for settings
            const key = row.sectionKey.startsWith('settings_')
                ? row.sectionKey.replace('settings_', '')
                : row.sectionKey;
            result[key] = row.content;
        }

        return NextResponse.json(result);
    } catch (error) {
        console.error('Get public settings error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
