import { NextResponse } from 'next/server';
import { getRows, getRow, query } from '../../../lib/database';

// GET /api/brands - Get all brands
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page')) || 1;
    const limit = parseInt(searchParams.get('limit')) || 20;
    const offset = (page - 1) * limit;

    const brandsQuery = `
      SELECT id, name, slug, description, logo_url, website_url, is_active, created_at
      FROM product_brands 
      WHERE is_active = true
      ORDER BY name ASC
      LIMIT $1 OFFSET $2
    `;

    const brands = await getRows(brandsQuery, [limit, offset]);

    // Get total count
    const countQuery = `SELECT COUNT(*) as total FROM product_brands WHERE is_active = true`;
    const totalResult = await getRow(countQuery);
    const total = parseInt(totalResult.total);

    return NextResponse.json({
      brands,
      pagination: {
        total,
        totalPages: Math.ceil(total / limit),
        currentPage: page,
        hasNextPage: page < Math.ceil(total / limit),
        hasPrevPage: page > 1
      }
    });

  } catch (error) {
    console.error('Error fetching brands:', error);
    return NextResponse.json(
      { error: 'Failed to fetch brands' },
      { status: 500 }
    );
  }
}

// POST /api/brands - Create new brand
export async function POST(request) {
  try {
    const body = await request.json();
    const { name, description, logo_url, website_url } = body;

    // Validate required fields
    if (!name) {
      return NextResponse.json(
        { error: 'Brand name is required' },
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

    // Check if brand already exists
    const existingBrand = await getRow(
      'SELECT id FROM product_brands WHERE slug = $1',
      [slug]
    );

    if (existingBrand) {
      return NextResponse.json(
        { error: 'Brand with this name already exists' },
        { status: 409 }
      );
    }

    // Create brand
    const createBrandQuery = `
      INSERT INTO product_brands (name, slug, description, logo_url, website_url)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id, name, slug, description, logo_url, website_url, created_at
    `;

    const brand = await getRow(createBrandQuery, [
      name,
      slug,
      description || null,
      logo_url || null,
      website_url || null
    ]);

    return NextResponse.json(brand, { status: 201 });

  } catch (error) {
    console.error('Error creating brand:', error);
    return NextResponse.json(
      { error: 'Failed to create brand' },
      { status: 500 }
    );
  }
} 