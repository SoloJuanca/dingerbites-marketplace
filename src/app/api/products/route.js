import { NextResponse } from 'next/server';
import { getRows, getRow } from '../../../lib/database';

// GET /api/products - Get products with filters and pagination
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Extract query parameters
    const category = searchParams.get('category');
    const brand = searchParams.get('brand');
    const minPrice = searchParams.get('minPrice');
    const maxPrice = searchParams.get('maxPrice');
    const sortBy = searchParams.get('sortBy') || 'newest';
    const page = parseInt(searchParams.get('page')) || 1;
    const limit = parseInt(searchParams.get('limit')) || 8;
    const offset = (page - 1) * limit;

    // Build the query with filters
    let query = `
      SELECT p.*, pc.name as category_name, pc.slug as category_slug, 
             pb.name as brand_name, pb.slug as brand_slug,
             COALESCE(pi.image_url, '') as primary_image,
             COUNT(pr.id) as review_count,
             COALESCE(AVG(pr.rating), 0) as average_rating
      FROM products p
      LEFT JOIN product_categories pc ON p.category_id = pc.id
      LEFT JOIN product_brands pb ON p.brand_id = pb.id
      LEFT JOIN product_images pi ON p.id = pi.product_id AND pi.is_primary = true
      LEFT JOIN product_reviews pr ON p.id = pr.product_id AND pr.is_approved = true
      WHERE p.is_active = true
    `;

    const params = [];
    let paramIndex = 1;

    // Add category filter
    if (category) {
      query += ` AND pc.slug = $${paramIndex}`;
      params.push(category);
      paramIndex++;
    }

    // Add brand filter
    if (brand) {
      query += ` AND pb.slug = $${paramIndex}`;
      params.push(brand);
      paramIndex++;
    }

    // Add price filters
    if (minPrice) {
      query += ` AND p.price >= $${paramIndex}`;
      params.push(parseFloat(minPrice));
      paramIndex++;
    }

    if (maxPrice) {
      query += ` AND p.price <= $${paramIndex}`;
      params.push(parseFloat(maxPrice));
      paramIndex++;
    }

    query += ` GROUP BY p.id, pc.name, pc.slug, pb.name, pb.slug, pi.image_url`;

    // Add sorting
    switch (sortBy) {
      case 'newest':
        query += ` ORDER BY p.created_at DESC`;
        break;
      case 'oldest':
        query += ` ORDER BY p.created_at ASC`;
        break;
      case 'price-low':
        query += ` ORDER BY p.price ASC`;
        break;
      case 'price-high':
        query += ` ORDER BY p.price DESC`;
        break;
      case 'name':
        query += ` ORDER BY p.name ASC`;
        break;
      default:
        query += ` ORDER BY p.created_at DESC`;
    }

    // Add pagination
    query += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limit, offset);

    // Execute the query
    const products = await getRows(query, params);

    // Get total count for pagination
    let countQuery = `
      SELECT COUNT(DISTINCT p.id) as total
      FROM products p
      LEFT JOIN product_categories pc ON p.category_id = pc.id
      LEFT JOIN product_brands pb ON p.brand_id = pb.id
      WHERE p.is_active = true
    `;

    const countParams = [];
    paramIndex = 1;

    if (category) {
      countQuery += ` AND pc.slug = $${paramIndex}`;
      countParams.push(category);
      paramIndex++;
    }

    if (brand) {
      countQuery += ` AND pb.slug = $${paramIndex}`;
      countParams.push(brand);
      paramIndex++;
    }

    if (minPrice) {
      countQuery += ` AND p.price >= $${paramIndex}`;
      countParams.push(parseFloat(minPrice));
      paramIndex++;
    }

    if (maxPrice) {
      countQuery += ` AND p.price <= $${paramIndex}`;
      countParams.push(parseFloat(maxPrice));
      paramIndex++;
    }

    const totalResult = await getRow(countQuery, countParams);
    const total = parseInt(totalResult.total);

    return NextResponse.json({
      products,
      pagination: {
        total,
        totalPages: Math.ceil(total / limit),
        currentPage: page,
        hasNextPage: page < Math.ceil(total / limit),
        hasPrevPage: page > 1
      }
    });

  } catch (error) {
    console.error('Error fetching products:', error);
    return NextResponse.json(
      { error: 'Failed to fetch products' },
      { status: 500 }
    );
  }
}

// POST /api/products - Create a new product (admin only)
export async function POST(request) {
  try {
    const body = await request.json();
    
    // Validate required fields
    const { name, description, price, category_id, brand_id } = body;
    
    if (!name || !price || !category_id) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Generate slug from name
    const slug = name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\s]/g, '')
      .trim()
      .replace(/\s+/g, '-');

    const query = `
      INSERT INTO products (name, slug, description, price, category_id, brand_id)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id, name, slug, price, created_at
    `;

    const product = await getRow(query, [name, slug, description, price, category_id, brand_id]);

    return NextResponse.json(product, { status: 201 });

  } catch (error) {
    console.error('Error creating product:', error);
    return NextResponse.json(
      { error: 'Failed to create product' },
      { status: 500 }
    );
  }
} 