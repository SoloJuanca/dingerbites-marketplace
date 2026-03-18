import { NextResponse } from 'next/server';
import { getCategories, getBrands, getPriceRange } from '../../../lib/firebaseProducts';
import { PRODUCT_CONDITIONS, PRODUCT_CONDITION_LABELS } from '../../../lib/productCondition';

export async function GET() {
  try {
    const [categories, manufacturerBrands, franchiseBrands, priceRange] = await Promise.all([
      getCategories(),
      getBrands({ type: 'manufacturer' }),
      getBrands({ type: 'franchise' }),
      getPriceRange()
    ]);
    const brands = [...manufacturerBrands, ...franchiseBrands];

    return NextResponse.json({
      categories,
      manufacturerBrands,
      franchiseBrands,
      brands,
      priceRange,
      conditions: PRODUCT_CONDITIONS.map((value) => ({
        value,
        label: PRODUCT_CONDITION_LABELS[value]
      }))
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
      manufacturerBrands: [
        { id: 1, name: 'Brand A', slug: 'brand-a' }
      ],
      franchiseBrands: [
        { id: 2, name: 'Brand B', slug: 'brand-b' }
      ],
      priceRange: { min: 0, max: 2000 },
      conditions: PRODUCT_CONDITIONS.map((value) => ({
        value,
        label: PRODUCT_CONDITION_LABELS[value]
      }))
    });
  }
}
