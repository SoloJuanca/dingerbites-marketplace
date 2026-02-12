import { NextResponse } from 'next/server';
import { getCategories, getBrands, getPriceRange } from '../../../lib/firebaseProducts';

export async function GET() {
  try {
    const [categories, brands, priceRange] = await Promise.all([
      getCategories(),
      getBrands(),
      getPriceRange()
    ]);

    return NextResponse.json({
      categories,
      brands,
      priceRange
    });
  } catch (error) {
    console.error('Error fetching filter data:', error);
    
    // Devolver datos mock como fallback
    return NextResponse.json({
      categories: [
        { id: 1, name: 'Belleza', slug: 'belleza' },
        { id: 2, name: 'Manicure', slug: 'manicure' },
        { id: 3, name: 'Cuidado de la Piel', slug: 'cuidado-piel' }
      ],
      brands: [
        { id: 1, name: 'Brand A', slug: 'brand-a' },
        { id: 2, name: 'Brand B', slug: 'brand-b' },
        { id: 3, name: 'Brand C', slug: 'brand-c' }
      ],
      priceRange: { min: 0, max: 2000 }
    });
  }
}
