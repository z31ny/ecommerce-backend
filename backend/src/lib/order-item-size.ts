type OrderItemSizeInput = {
    selectedSize?: string | null;
    priceAtPurchase?: string | number | null;
    productAttributes?: unknown;
    productDescription?: string | null;
};

function normSizeKey(size: string): string {
    return String(size || '').trim().toLowerCase().replace(/\s+/g, '');
}

function parsePrice(value: unknown): number {
    const n = Number(value);
    return Number.isFinite(n) ? n : -1;
}

function parseAttributes(raw: unknown): Record<string, unknown> | null {
    if (!raw) return null;
    if (typeof raw === 'string') {
        try {
            const parsed = JSON.parse(raw);
            return parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : null;
        } catch {
            return null;
        }
    }
    if (typeof raw === 'object') return raw as Record<string, unknown>;
    return null;
}

function matchSizeByPrice(sizePrices: Record<string, unknown>, paid: number): string | null {
    const entries = Object.entries(sizePrices);
    if (!entries.length) return null;
    if (entries.length === 1) return String(entries[0]?.[0] ?? '');

    let match = entries.find(([, price]) => Math.abs(parsePrice(price) - paid) < 0.51);
    if (match) return String(match[0]);

    match = entries.find(([, price]) => {
        const p = parsePrice(price);
        return p >= 0 && Math.round(p) === Math.round(paid);
    });
    if (match) return String(match[0]);

    // Loose match on normalized size keys when prices are whole numbers
    const paidRounded = Math.round(paid);
    for (const [size, price] of entries) {
        if (Math.round(parsePrice(price)) === paidRounded && normSizeKey(size)) {
            return String(size);
        }
    }
    return null;
}

function extractGramsFromText(text: string): string | null {
    if (!text) return null;
    const m = text.match(/(\d+)\s*(?:g|gm|grams?)\b/i);
    return m ? `${m[1]}g` : null;
}

/** Resolve the gram/size label shown for an order line item. */
export function resolveOrderItemSize(input: OrderItemSizeInput): string | null {
    const stored = String(input.selectedSize || '').trim();
    if (stored) return stored;

    const attrs = parseAttributes(input.productAttributes);
    const sizePrices = attrs?.sizePrices;
    if (sizePrices && typeof sizePrices === 'object' && !Array.isArray(sizePrices)) {
        const paid = parsePrice(input.priceAtPurchase);
        if (paid >= 0) {
            const fromPrice = matchSizeByPrice(sizePrices as Record<string, unknown>, paid);
            if (fromPrice) return fromPrice;
        }
    }

    const sizes = attrs?.sizes;
    if (Array.isArray(sizes) && sizes.length === 1) {
        const only = String(sizes[0] || '').trim();
        if (only) return only;
    }

    const fromDesc = extractGramsFromText(input.productDescription || '');
    if (fromDesc) return fromDesc;

    return null;
}
