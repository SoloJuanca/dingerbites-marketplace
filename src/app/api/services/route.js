import { NextResponse } from 'next/server';
import { getRows, getRow, query } from '../../../lib/database';

// GET /api/services - Get services with filters
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const level = searchParams.get('level');
    const minPrice = searchParams.get('minPrice');
    const maxPrice = searchParams.get('maxPrice');
    const page = parseInt(searchParams.get('page')) || 1;
    const limit = parseInt(searchParams.get('limit')) || 8;
    const offset = (page - 1) * limit;

    // Build the query with filters
    let servicesQuery = `
      SELECT s.*, sc.name as category_name, sc.slug as category_slug,
             COUNT(sr.id) as review_count,
             COALESCE(AVG(sr.rating), 0) as average_rating
      FROM services s
      LEFT JOIN service_categories sc ON s.category_id = sc.id
      LEFT JOIN service_reviews sr ON s.id = sr.service_id AND sr.is_approved = true
      WHERE s.is_active = true
    `;

    const params = [];
    let paramIndex = 1;

    // Add category filter
    if (category) {
      servicesQuery += ` AND sc.slug = $${paramIndex}`;
      params.push(category);
      paramIndex++;
    }

    // Add level filter
    if (level) {
      servicesQuery += ` AND s.level ILIKE $${paramIndex}`;
      params.push(`%${level}%`);
      paramIndex++;
    }

    // Add price filters
    if (minPrice) {
      servicesQuery += ` AND s.price >= $${paramIndex}`;
      params.push(parseFloat(minPrice));
      paramIndex++;
    }

    if (maxPrice) {
      servicesQuery += ` AND s.price <= $${paramIndex}`;
      params.push(parseFloat(maxPrice));
      paramIndex++;
    }

    servicesQuery += ` GROUP BY s.id, sc.name, sc.slug ORDER BY s.created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limit, offset);

    const services = await getRows(servicesQuery, params);

    // Get total count for pagination
    let countQuery = `
      SELECT COUNT(DISTINCT s.id) as total
      FROM services s
      LEFT JOIN service_categories sc ON s.category_id = sc.id
      WHERE s.is_active = true
    `;

    const countParams = [];
    paramIndex = 1;

    if (category) {
      countQuery += ` AND sc.slug = $${paramIndex}`;
      countParams.push(category);
      paramIndex++;
    }

    if (level) {
      countQuery += ` AND s.level ILIKE $${paramIndex}`;
      countParams.push(`%${level}%`);
      paramIndex++;
    }

    if (minPrice) {
      countQuery += ` AND s.price >= $${paramIndex}`;
      countParams.push(parseFloat(minPrice));
      paramIndex++;
    }

    if (maxPrice) {
      countQuery += ` AND s.price <= $${paramIndex}`;
      countParams.push(parseFloat(maxPrice));
      paramIndex++;
    }

    const totalResult = await getRow(countQuery, countParams);
    const total = parseInt(totalResult.total);

    return NextResponse.json({
      services,
      pagination: {
        total,
        totalPages: Math.ceil(total / limit),
        currentPage: page,
        hasNextPage: page < Math.ceil(total / limit),
        hasPrevPage: page > 1
      }
    });

  } catch (error) {
    console.error('Error fetching services:', error);
    return NextResponse.json(
      { error: 'Failed to fetch services' },
      { status: 500 }
    );
  }
}

// POST /api/services - Create new service
export async function POST(request) {
  try {
    const body = await request.json();
    const { 
      name, 
      description, 
      short_description, 
      image_url, 
      category_id, 
      duration, 
      price, 
      level, 
      max_participants = 12 
    } = body;

    // Validate required fields
    if (!name || !description || !price || !category_id) {
      return NextResponse.json(
        { error: 'Name, description, price, and category are required' },
        { status: 400 }
      );
    }

    // Check if category exists
    const categoryExists = await getRow(
      'SELECT id FROM service_categories WHERE id = $1 AND is_active = true',
      [category_id]
    );

    if (!categoryExists) {
      return NextResponse.json(
        { error: 'Category not found' },
        { status: 404 }
      );
    }

    // Create service
    const createServiceQuery = `
      INSERT INTO services (name, description, short_description, image_url, category_id, duration, price, level, max_participants)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING id, name, description, short_description, image_url, category_id, duration, price, level, max_participants, created_at
    `;

    const service = await getRow(createServiceQuery, [
      name,
      description,
      short_description || null,
      image_url || null,
      category_id,
      duration || null,
      price,
      level || null,
      max_participants
    ]);

    return NextResponse.json(service, { status: 201 });

  } catch (error) {
    console.error('Error creating service:', error);
    return NextResponse.json(
      { error: 'Failed to create service' },
      { status: 500 }
    );
  }
} 