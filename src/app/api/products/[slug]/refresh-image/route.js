import { NextResponse } from 'next/server';
import { refreshProductTcgImage } from '../../../../../lib/tcgImageRefresh';

export const dynamic = 'force-dynamic';

export async function POST(_request, { params }) {
  try {
    const { slug: productId } = await params;
    if (!productId) {
      return NextResponse.json({ error: 'productId required' }, { status: 400 });
    }

    const result = await refreshProductTcgImage(productId);

    if (result.status === 404) {
      return NextResponse.json({ refreshed: false, reason: result.reason }, { status: 404 });
    }
    if (result.status === 400) {
      return NextResponse.json({ refreshed: false, reason: result.reason }, { status: 400 });
    }

    return NextResponse.json({
      refreshed: Boolean(result.refreshed),
      reason: result.reason || null,
      image: result.image || ''
    });
  } catch (error) {
    console.error('Error refreshing TCG product image:', error);
    return NextResponse.json(
      { refreshed: false, error: 'Failed to refresh product image' },
      { status: 500 }
    );
  }
}
