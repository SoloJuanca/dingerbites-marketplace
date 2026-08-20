import { NextResponse } from 'next/server';
import { getCategories, getBrands, getPriceRange } from '../../../lib/firebaseProducts';
import { filterCategoriesForDisplay } from '../../../lib/catalogFilters';
import { getCategoryFacetCounts } from '../../../lib/search/typesenseSearch';
import { PRODUCT_CONDITIONS, PRODUCT_CONDITION_LABELS } from '../../../lib/productCondition';

export async function GET() {
  try {
    const [categories, manufacturerBrands, franchiseBrands, priceRange, facetCounts] = await Promise.all([
      getCategories(),
      getBrands({ type: 'manufacturer' }),
      getBrands({ type: 'franchise' }),
      getPriceRange(),
      getCategoryFacetCounts({ inStockOnly: true })
    ]);
    const brands = [...manufacturerBrands, ...franchiseBrands];
    const visibleCategories = filterCategoriesForDisplay(categories, facetCounts, { excludeTcg: true });

    return NextResponse.json(
      {
        categories: visibleCategories,
        manufacturerBrands,
        franchiseBrands,
        brands,
        priceRange,
        conditions: PRODUCT_CONDITIONS.map((value) => ({
          value,
          label: PRODUCT_CONDITION_LABELS[value]
        }))
      },
      {
        headers: {
          'cache-control': 'public, s-maxage=3600, stale-while-revalidate=86400'
        }
      }
    );
  } catch (error) {
    console.error('Error fetching filter data:', error);
    
    return NextResponse.json(
      {
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
      },
      {
        headers: {
          'cache-control': 'public, s-maxage=3600, stale-while-revalidate=86400'
        }
      }
    );
  }
}
