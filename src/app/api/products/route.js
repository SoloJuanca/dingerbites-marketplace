import { NextResponse } from 'next/server';
import { getProducts } from '../../../lib/products';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    
    const filters = {
      page: parseInt(searchParams.get('page')) || 1,
      category: searchParams.get('category') || '',
      brand: searchParams.get('brand') || '',
      minPrice: searchParams.get('minPrice') || '',
      maxPrice: searchParams.get('maxPrice') || '',
      sortBy: searchParams.get('sortBy') || 'newest',
      limit: parseInt(searchParams.get('limit')) || 8
    };

    const result = await getProducts(filters);
    
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error fetching products:', error);
    
    // Devolver estructura vacía como fallback
    return NextResponse.json({
      products: [],
      total: 0,
      totalPages: 0,
      currentPage: 1,
      hasNextPage: false,
      hasPrevPage: false
    });
  }
}