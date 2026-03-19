import { NextResponse } from 'next/server';
import { getSearchSuggestions } from '../../../../lib/search/typesenseSearch';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q') || '';
    const filters = {
      category: searchParams.get('category') || '',
      subcategory: searchParams.get('subcategory') || ''
    };

    const suggestions = await getSearchSuggestions(q, filters);
    return NextResponse.json({ suggestions });
  } catch (error) {
    console.error('Suggestion API error:', error);
    return NextResponse.json({ suggestions: [] });
  }
}
