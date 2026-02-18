import { NextResponse } from 'next/server';
import { getGeneralReviews, createGeneralReview } from '../../../../lib/firebaseReviews';
import { getOrderByReviewToken, setReviewTokenUsed } from '../../../../lib/firebaseOrders';

// GET /api/reviews/general - List general (in-person) reviews
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page')) || 1;
    const limit = parseInt(searchParams.get('limit')) || 20;

    const result = await getGeneralReviews({ page, limit });
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error fetching general reviews:', error);
    return NextResponse.json(
      { error: 'Failed to fetch reviews' },
      { status: 500 }
    );
  }
}

// POST /api/reviews/general - Create general review with token (in-person order link, one-time use)
export async function POST(request) {
  try {
    const body = await request.json();
    const { token, author_name, rating, comment, image_url, location } = body;

    if (!token || !token.trim()) {
      return NextResponse.json(
        { error: 'Enlace no válido. Usa el enlace que te compartió la tienda.' },
        { status: 400 }
      );
    }

    const order = await getOrderByReviewToken(token.trim());
    if (!order) {
      return NextResponse.json(
        { error: 'Este enlace no es válido o ya fue utilizado.' },
        { status: 400 }
      );
    }

    if (!author_name || !rating || !comment) {
      return NextResponse.json(
        { error: 'Nombre, calificación y comentario son requeridos' },
        { status: 400 }
      );
    }

    if (rating < 1 || rating > 5) {
      return NextResponse.json(
        { error: 'La calificación debe ser entre 1 y 5' },
        { status: 400 }
      );
    }

    const review = await createGeneralReview({
      author_name,
      rating,
      comment,
      image_url: image_url || null,
      location: location || null,
      order_id: order.id
    });

    await setReviewTokenUsed(order.id);

    return NextResponse.json(
      {
        success: true,
        review,
        message: '¡Gracias! Tu reseña se ha publicado.'
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating general review:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create review' },
      { status: 500 }
    );
  }
}
