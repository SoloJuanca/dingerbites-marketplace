import { NextResponse } from 'next/server';
import { authenticateAdmin } from '../../../../../lib/auth';
import { reindexAllProducts } from '../../../../../lib/search/typesenseSync';

export async function POST(request) {
  try {
    const admin = await authenticateAdmin(request);
    if (!admin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 401 });
    }

    const result = await reindexAllProducts();
    return NextResponse.json({ success: true, result });
  } catch (error) {
    console.error('Error reindexing products:', error);
    return NextResponse.json({ error: 'Failed to reindex products' }, { status: 500 });
  }
}
