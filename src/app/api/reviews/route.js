import { NextResponse } from 'next/server';
import { getRows, getRow, query } from '../../../lib/database';

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
    const offset = (page - 1) * limit;

    let reviewsQuery;
    let countQuery;
    let params = [];
    let countParams = [];
    let paramIndex = 1;

    if (productId) {
      // Product reviews
      reviewsQuery = `
        SELECT pr.*, u.first_name, u.last_name, u.email,
               p.name as product_name, p.slug as product_slug
        FROM product_reviews pr
        JOIN users u ON pr.user_id = u.id
        JOIN products p ON pr.product_id = p.id
        WHERE pr.product_id = $1 AND pr.is_approved = true
      `;
      countQuery = `
        SELECT COUNT(*) as total
        FROM product_reviews pr
        WHERE pr.product_id = $1 AND pr.is_approved = true
      `;
      params.push(productId);
      countParams.push(productId);
      paramIndex++;
    } else if (serviceId) {
      // Service reviews
      reviewsQuery = `
        SELECT sr.*, u.first_name, u.last_name, u.email,
               s.name as service_name, s.slug as service_slug
        FROM service_reviews sr
        JOIN users u ON sr.user_id = u.id
        JOIN services s ON sr.service_id = s.id
        WHERE sr.service_id = $1 AND sr.is_approved = true
      `;
      countQuery = `
        SELECT COUNT(*) as total
        FROM service_reviews sr
        WHERE sr.service_id = $1 AND sr.is_approved = true
      `;
      params.push(serviceId);
      countParams.push(serviceId);
      paramIndex++;
    } else {
      // All reviews
      reviewsQuery = `
        SELECT pr.*, u.first_name, u.last_name, u.email,
               p.name as product_name, p.slug as product_slug,
               'product' as review_type
        FROM product_reviews pr
        JOIN users u ON pr.user_id = u.id
        JOIN products p ON pr.product_id = p.id
        WHERE pr.is_approved = true
        UNION ALL
        SELECT sr.*, u.first_name, u.last_name, u.email,
               s.name as service_name, s.slug as service_slug,
               'service' as review_type
        FROM service_reviews sr
        JOIN users u ON sr.user_id = u.id
        JOIN services s ON sr.service_id = s.id
        WHERE sr.is_approved = true
      `;
      countQuery = `
        SELECT (SELECT COUNT(*) FROM product_reviews WHERE is_approved = true) +
               (SELECT COUNT(*) FROM service_reviews WHERE is_approved = true) as total
      `;
    }

    // Add user filter
    if (userId) {
      if (productId || serviceId) {
        reviewsQuery += ` AND pr.user_id = $${paramIndex}`;
        countQuery += ` AND user_id = $${paramIndex}`;
        params.push(userId);
        countParams.push(userId);
        paramIndex++;
      }
    }

    // Add rating filter
    if (rating) {
      if (productId || serviceId) {
        reviewsQuery += ` AND pr.rating = $${paramIndex}`;
        countQuery += ` AND rating = $${paramIndex}`;
        params.push(parseInt(rating));
        countParams.push(parseInt(rating));
        paramIndex++;
      }
    }

    reviewsQuery += ` ORDER BY created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limit, offset);

    const reviews = await getRows(reviewsQuery, params);
    const totalResult = await getRow(countQuery, countParams);
    const total = parseInt(totalResult.total);

    return NextResponse.json({
      reviews,
      pagination: {
        total,
        totalPages: Math.ceil(total / limit),
        currentPage: page,
        hasNextPage: page < Math.ceil(total / limit),
        hasPrevPage: page > 1
      }
    });

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
    const { 
      userId, 
      productId, 
      serviceId, 
      rating, 
      title, 
      comment 
    } = body;

    // Validate required fields
    if (!userId || !rating || (!productId && !serviceId)) {
      return NextResponse.json(
        { error: 'User ID, rating, and product ID or service ID are required' },
        { status: 400 }
      );
    }

    // Validate rating
    if (rating < 1 || rating > 5) {
      return NextResponse.json(
        { error: 'Rating must be between 1 and 5' },
        { status: 400 }
      );
    }

    // Check if user exists
    const user = await getRow('SELECT id FROM users WHERE id = $1', [userId]);
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    let review;

    if (productId) {
      // Check if product exists
      const product = await getRow('SELECT id FROM products WHERE id = $1 AND is_active = true', [productId]);
      if (!product) {
        return NextResponse.json(
          { error: 'Product not found' },
          { status: 404 }
        );
      }

      // Check if user already reviewed this product
      const existingReview = await getRow(
        'SELECT id FROM product_reviews WHERE user_id = $1 AND product_id = $2',
        [userId, productId]
      );

      if (existingReview) {
        return NextResponse.json(
          { error: 'You have already reviewed this product' },
          { status: 409 }
        );
      }

      // Create product review
      const createReviewQuery = `
        INSERT INTO product_reviews (user_id, product_id, rating, title, comment)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id, rating, title, comment, created_at
      `;

      review = await getRow(createReviewQuery, [userId, productId, rating, title || null, comment || null]);

    } else if (serviceId) {
      // Check if service exists
      const service = await getRow('SELECT id FROM services WHERE id = $1 AND is_active = true', [serviceId]);
      if (!service) {
        return NextResponse.json(
          { error: 'Service not found' },
          { status: 404 }
        );
      }

      // Check if user already reviewed this service
      const existingReview = await getRow(
        'SELECT id FROM service_reviews WHERE user_id = $1 AND service_id = $2',
        [userId, serviceId]
      );

      if (existingReview) {
        return NextResponse.json(
          { error: 'You have already reviewed this service' },
          { status: 409 }
        );
      }

      // Create service review
      const createReviewQuery = `
        INSERT INTO service_reviews (user_id, service_id, rating, title, comment)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id, rating, title, comment, created_at
      `;

      review = await getRow(createReviewQuery, [userId, serviceId, rating, title || null, comment || null]);
    }

    return NextResponse.json({
      success: true,
      review,
      message: 'Review submitted successfully'
    }, { status: 201 });

  } catch (error) {
    console.error('Error creating review:', error);
    return NextResponse.json(
      { error: 'Failed to create review' },
      { status: 500 }
    );
  }
} 