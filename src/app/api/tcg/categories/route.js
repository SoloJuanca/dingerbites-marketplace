import { NextResponse } from 'next/server';
import { TCG_CSV_BASE, tcgcsvHeaders } from '../../../../lib/tcgcsvClient';

export async function GET() {
  try {
    const res = await fetch(`${TCG_CSV_BASE}/categories`, {
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
    console.error('Error fetching TCG categories:', err);
    return NextResponse.json(
      { error: 'Failed to fetch TCG categories' },
      { status: 500 }
    );
  }
}
