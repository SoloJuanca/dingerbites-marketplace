import { NextResponse } from 'next/server';
import { getReviews, createReview } from '../../../lib/firebaseReviews';

// GET /api/reviews - Get reviews with filters
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const productId = searchParams.get('productId');
    const serviceId = searchParams.get('serviceId');
    const userId = searchParams.get('userId');
    const rating = searchParams.get('rating');
    const page = parseInt(searchParams.get('page')) || 1;
    const limit = parseInt(searchParams.get('limit')) || 10;

    const result = await getReviews({
      productId: productId || undefined,
      serviceId: serviceId || undefined,
      userId: userId || undefined,
      rating: rating || undefined,
      page,
      limit
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error fetching reviews:', error);
    return NextResponse.json(
      { error: 'Failed to fetch reviews' },
      { status: 500 }
    );
  }
}

// POST /api/reviews - Create new review
export async function POST(request) {
  try {
    const body = await request.json();
    const { userId, productId, serviceId, rating, title, comment } = body;

    if (!userId || !rating || (!productId && !serviceId)) {
      return NextResponse.json(
        { error: 'User ID, rating, and product ID or service ID are required' },
        { status: 400 }
      );
    }

    if (rating < 1 || rating > 5) {
      return NextResponse.json(
        { error: 'Rating must be between 1 and 5' },
        { status: 400 }
      );
    }

    const review = await createReview({
      userId,
      productId,
      serviceId,
      rating,
      title,
      comment
    });

    return NextResponse.json(
      {
        success: true,
        review,
        message: 'Review submitted successfully'
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating review:', error);
    if (error.message === 'User not found') {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    if (error.message === 'Product not found' || error.message === 'Service not found') {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    if (error.message?.includes('already reviewed')) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    return NextResponse.json(
      { error: 'Failed to create review' },
      { status: 500 }
    );
  }
}
