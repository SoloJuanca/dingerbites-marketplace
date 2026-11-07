import { NextResponse } from 'next/server';
import { authenticateAdmin } from '../../../../../lib/auth';
import { syncAllTcgStockToMarketplace } from '../../../../../lib/sync/marketplaceSyncClient';

export async function POST(request) {
  try {
    const admin = await authenticateAdmin(request);
    if (!admin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const activeOnly = body.activeOnly !== false;

    const result = await syncAllTcgStockToMarketplace({ activeOnly });

    if (result.skipped) {
      return NextResponse.json(
        {
          error: 'Marketplace sync is not configured',
          reason: result.reason,
          hint: 'Set INTERNAL_SYNC_SECRET and MARKETPLACE_SYNC_URL in environment variables'
        },
        { status: 503 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Synced ${result.synced} of ${result.total} TCG products`,
      ...result
    });
  } catch (error) {
    console.error('Marketplace bulk sync failed:', error);
    return NextResponse.json({ error: 'Failed to sync marketplace inventory' }, { status: 500 });
  }
}
