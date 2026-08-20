import { NextResponse } from 'next/server';
import { authenticateAdmin } from '../../../../../lib/auth';
import { refreshTcgImagesBatch } from '../../../../../lib/tcgImageRefresh';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  try {
    const admin = await authenticateAdmin(request);
    if (!admin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 401 });
    }

    let limit = 500;
    try {
      const body = await request.json();
      if (body?.limit != null) limit = Number(body.limit) || 500;
    } catch {
      // empty body is fine
    }

    const result = await refreshTcgImagesBatch({ limit });
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error batch-refreshing TCG images:', error);
    return NextResponse.json(
      { error: 'Failed to refresh TCG images' },
      { status: 500 }
    );
  }
}
