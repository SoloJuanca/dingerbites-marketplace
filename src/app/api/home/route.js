import { NextResponse } from 'next/server';
import { getCategories } from '../../../lib/firebaseProducts';
import {
  getFeaturedCategoryProducts,
  getNewestProducts,
  getPopularProducts
} from '../../../lib/firebaseProducts';

const IMPORTANT_CATEGORY_SLUGS = ['figuras', 'gashapon', 'bind-box', 'tcg'];

// GET /api/home?section=newest|popular|important|categories|all
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const section = (searchParams.get('section') || 'all').toLowerCase();
    const limit = Math.max(1, Number(searchParams.get('limit')) || 8);

    if (section === 'newest') {
      const products = await getNewestProducts({ limit, inStockOnly: true });
      return NextResponse.json({ products });
    }

    if (section === 'popular') {
      const products = await getPopularProducts({ limit, inStockOnly: true, windowDays: 30 });
      return NextResponse.json({ products });
    }

    if (section === 'important') {
      const categories = await getFeaturedCategoryProducts(IMPORTANT_CATEGORY_SLUGS, {
        perCategory: 4,
        inStockOnly: true
      });
      return NextResponse.json({ categories });
    }

    if (section === 'categories') {
      const categories = await getCategories();
      return NextResponse.json({ categories });
    }

    const [newestProducts, popularProducts, importantCategories, categories] = await Promise.all([
      getNewestProducts({ limit, inStockOnly: true }),
      getPopularProducts({ limit, inStockOnly: true, windowDays: 30 }),
      getFeaturedCategoryProducts(IMPORTANT_CATEGORY_SLUGS, { perCategory: 4, inStockOnly: true }),
      getCategories()
    ]);

    return NextResponse.json({
      newestProducts,
      popularProducts,
      importantCategories,
      categories
    });
  } catch (error) {
    console.error('Error fetching home data:', error);
    return NextResponse.json(
      {
        newestProducts: [],
        popularProducts: [],
        importantCategories: [],
        categories: []
      },
      { status: 500 }
    );
  }
}
