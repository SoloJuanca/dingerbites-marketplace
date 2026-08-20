import { NextResponse } from 'next/server';
import { getNewestProducts, getPopularProducts } from '../../../../lib/firebaseProducts';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const excludeRaw = searchParams.get('exclude') || '';
    const excludeIds = new Set(
      excludeRaw
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean)
    );

    const [newest, popular] = await Promise.all([
      getNewestProducts({ limit: 8, inStockOnly: true }),
      getPopularProducts({ limit: 8, inStockOnly: true, windowDays: 30 })
    ]);

    const merged = [];
    const seen = new Set();

    [...newest, ...popular].forEach((product) => {
      if (!product?.id || seen.has(product.id) || excludeIds.has(String(product.id))) return;
      seen.add(product.id);
      merged.push(product);
    });

    return NextResponse.json({ products: merged.slice(0, 8) });
  } catch (error) {
    console.error('Checkout upsell API error:', error);
    return NextResponse.json({ products: [] });
  }
}
