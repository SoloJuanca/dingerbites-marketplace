import { NextResponse } from 'next/server';

const TCG_BASE = 'https://tcgcsv.com/tcgplayer';

export async function GET() {
  try {
    const res = await fetch(`${TCG_BASE}/categories`, {
      headers: { Accept: 'application/json' },
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
