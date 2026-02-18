import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { websiteContent } from '@/db/schema';
import { eq } from 'drizzle-orm';

// Disable Next.js caching — admin must always get fresh data
export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Valid section keys
const VALID_SECTIONS = [
    'testimonials', 'faqs', 'moods', 'snacks',
    'favorites', 'heroes', 'contact', 'shipping'
];

// GET /api/admin/content — return all sections as { key: content, ... }
export async function GET() {
    try {
        const rows = await db.select().from(websiteContent);

        const result: Record<string, any> = {};
        for (const row of rows) {
            result[row.sectionKey] = row.content;
        }

        return NextResponse.json(result);
    } catch (error) {
        console.error('Get content error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

// PUT /api/admin/content — upsert a single section
// Body: { sectionKey: string, content: any }
export async function PUT(request: NextRequest) {
    try {
        const body = await request.json();
        const { sectionKey, content } = body;

        if (!sectionKey || !VALID_SECTIONS.includes(sectionKey)) {
            return NextResponse.json(
                { error: `Invalid section key. Must be one of: ${VALID_SECTIONS.join(', ')}` },
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
            .where(eq(websiteContent.sectionKey, sectionKey));

        if (existing.length > 0) {
            // Update
            await db.update(websiteContent)
                .set({ content, updatedAt: new Date() })
                .where(eq(websiteContent.sectionKey, sectionKey));
        } else {
            // Insert
            await db.insert(websiteContent).values({
                sectionKey,
                content,
                updatedAt: new Date(),
            });
        }

        return NextResponse.json({ success: true, sectionKey });
    } catch (error) {
        console.error('Update content error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
