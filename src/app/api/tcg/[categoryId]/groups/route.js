import { NextResponse } from 'next/server';
import { TCG_CSV_BASE, tcgcsvHeaders } from '../../../../../lib/tcgcsvClient';

export async function GET(request, { params }) {
  try {
    const { categoryId } = await params;
    if (!categoryId) {
      return NextResponse.json({ error: 'categoryId required' }, { status: 400 });
    }
    const res = await fetch(`${TCG_CSV_BASE}/${categoryId}/groups`, {
      headers: tcgcsvHeaders(),
      next: { revalidate: 3600 }
    });
    if (!res.ok) {
      throw new Error(`TCG API error: ${res.status}`);
    }
    const data = await res.json();
    return NextResponse.json({
      success: data.success,
      results: data.results || [],
      totalItems: data.totalItems
    });
  } catch (err) {
    console.error('Error fetching TCG groups:', err);
    return NextResponse.json(
      { error: 'Failed to fetch TCG groups' },
      { status: 500 }
    );
  }
}
