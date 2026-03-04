import { NextResponse } from 'next/server';

const TCG_BASE = 'https://tcgcsv.com/tcgplayer';

export async function GET(request, { params }) {
  try {
    const { categoryId, groupId } = await params;
    if (!categoryId || !groupId) {
      return NextResponse.json(
        { error: 'categoryId and groupId required' },
        { status: 400 }
      );
    }
    const res = await fetch(`${TCG_BASE}/${categoryId}/${groupId}/prices`, {
      headers: { Accept: 'application/json' },
      next: { revalidate: 3600 }
    });
    if (!res.ok) {
      throw new Error(`TCG API error: ${res.status}`);
    }
    const data = await res.json();
    return NextResponse.json({
      success: data.success,
      results: data.results || []
    });
  } catch (err) {
    console.error('Error fetching TCG prices:', err);
    return NextResponse.json(
      { error: 'Failed to fetch TCG prices' },
      { status: 500 }
    );
  }
}
