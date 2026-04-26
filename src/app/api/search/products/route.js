import { NextResponse } from 'next/server';
import { searchProducts } from '../../../../lib/search/typesenseSearch';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const filters = {
      page: searchParams.get('page') || '1',
      limit: searchParams.get('limit') || '12',
      category: searchParams.get('category') || '',
      subcategory: searchParams.get('subcategory') || '',
      tcgCategoryId: searchParams.get('tcgCategoryId') || '',
      tcgGroupId: searchParams.get('tcgGroupId') || '',
      manufacturerBrand: searchParams.get('manufacturerBrand') || '',
      franchiseBrand: searchParams.get('franchiseBrand') || '',
      brand: searchParams.get('brand') || '',
      condition: searchParams.get('condition') || '',
      minPrice: searchParams.get('minPrice') || '',
      maxPrice: searchParams.get('maxPrice') || '',
      sortBy: searchParams.get('sortBy') || 'newest',
      q: searchParams.get('q') || searchParams.get('search') || '',
      inStockOnly: searchParams.get('inStockOnly') || 'true'
    };

    const result = await searchProducts(filters, { allowFallback: true });
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    console.error('Search API error:', error);
    return NextResponse.json(
      {
        products: [],
        total: 0,
        totalPages: 0,
        currentPage: 1,
        hasNextPage: false,
        hasPrevPage: false
      },
      { status: 200 }
    );
  }
}
