import { NextResponse } from 'next/server';
import { getProductBySlug, incrementProductViewCount } from '../../../../lib/firebaseProducts';

export async function GET(request, { params }) {
  try {
    const { slug } = await params;
    
    if (!slug) {
      return NextResponse.json(
        { error: 'Slug is required' },
        { status: 400 }
      );
    }

    const product = await getProductBySlug(slug);
    
    if (!product) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      );
    }

    const { searchParams } = new URL(request.url);
    const shouldTrackView = searchParams.get('trackView') !== 'false';
    if (shouldTrackView) {
      await incrementProductViewCount(product.id);
    }

    return NextResponse.json(product);
  } catch (error) {
    console.error('Error fetching product by slug:', error);
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
