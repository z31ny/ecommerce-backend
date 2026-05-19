/** In-memory live visitor sessions (resets on server restart). */
export const VISITOR_ACTIVE_MS = 120_000; // 2 min without ping = offline

export type VisitorSession = {
    id: string;
    page: string;
    lastSeen: number;
    firstSeen: number;
};

const sessions = new Map<string, VisitorSession>();
let pageViewsToday = 0;
let pageViewsDate = '';

function todayKey() {
    return new Date().toISOString().slice(0, 10);
}

function bumpPageViews() {
    const d = todayKey();
    if (d !== pageViewsDate) {
        pageViewsDate = d;
        pageViewsToday = 0;
    }
    pageViewsToday += 1;
}

function pruneInactive() {
    const cutoff = Date.now() - VISITOR_ACTIVE_MS;
    for (const [id, session] of sessions) {
        if (session.lastSeen < cutoff) sessions.delete(id);
    }
}

export function recordVisitorPing(visitorId: string, page: string) {
    const id = String(visitorId || '').trim();
    if (!id || id.length > 128) return;

    const safePage = String(page || 'unknown')
        .trim()
        .slice(0, 120) || 'unknown';
    const now = Date.now();
    const existing = sessions.get(id);

    if (!existing) bumpPageViews();
    else if (existing.page !== safePage) bumpPageViews();

    sessions.set(id, {
        id,
        page: safePage,
        lastSeen: now,
        firstSeen: existing?.firstSeen ?? now,
    });

    pruneInactive();
}

export function getTrafficSnapshot() {
    pruneInactive();
    const now = Date.now();
    const visitors = Array.from(sessions.values())
        .sort((a, b) => b.lastSeen - a.lastSeen)
        .map((v) => ({
            id: v.id.length > 10 ? `${v.id.slice(0, 8)}…` : v.id,
            page: v.page,
            pageLabel: formatPageLabel(v.page),
            secondsAgo: Math.max(0, Math.floor((now - v.lastSeen) / 1000)),
            onSiteMinutes: Math.max(1, Math.floor((now - v.firstSeen) / 60000)),
        }));

    return {
        activeNow: visitors.length,
        pageViewsToday,
        hasVisitors: visitors.length > 0,
        visitors,
        updatedAt: new Date(now).toISOString(),
    };
}

function formatPageLabel(page: string): string {
    const p = page.toLowerCase().replace(/^\//, '');
    const map: Record<string, string> = {
        '': 'Home',
        'home.html': 'Home',
        'index.html': 'Home',
        'candy.html': 'Candy',
        'fruits.html': 'Fruits',
        'offers.html': 'Offers',
        'checkout.html': 'Checkout',
        'contact.html': 'Contact',
        'about.html': 'About',
        'order-success.html': 'Order success',
        'privacy.html': 'Privacy',
        'terms.html': 'Terms',
        'returns.html': 'Returns',
        'splash.html': 'Splash',
    };
    return map[p] || p.replace(/\.html$/i, '').replace(/-/g, ' ') || 'Website';
}
