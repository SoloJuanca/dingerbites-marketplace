import { NextResponse } from 'next/server';
import { authenticateAdmin } from '../../../../lib/auth';
import { query, getRow } from '../../../../lib/database';

// GET /api/admin/brands - Get all brands
export async function GET(request) {
  try {
    // Authenticate admin user
    const admin = await authenticateAdmin(request);
    if (!admin) {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 401 }
      );
    }

    // Get all brands
    const brands = await query(
      'SELECT id, name, slug, description, logo_url, website_url, is_active FROM product_brands ORDER BY name ASC'
    );

    return NextResponse.json({
      success: true,
      brands
    });

  } catch (error) {
    console.error('Error fetching brands:', error);
    return NextResponse.json(
      { error: 'Failed to fetch brands' },
      { status: 500 }
    );
  }
}

// POST /api/admin/brands - Create new brand
export async function POST(request) {
  try {
    // Authenticate admin user
    const admin = await authenticateAdmin(request);
    if (!admin) {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const {
      name,
      slug,
      description,
      logo_url,
      website_url,
      is_active
    } = body;

    // Validate required fields
    if (!name || !slug) {
      return NextResponse.json(
        { error: 'Name and slug are required' },
        { status: 400 }
      );
    }

    // Check if slug already exists
    const existingBrand = await getRow(
      'SELECT id FROM product_brands WHERE slug = $1',
      [slug]
    );

    if (existingBrand) {
      return NextResponse.json(
        { error: 'Brand with this slug already exists' },
        { status: 400 }
      );
    }

    // Create brand
    const insertQuery = `
      INSERT INTO product_brands (
        name, slug, description, logo_url, website_url, is_active
      ) VALUES (
        $1, $2, $3, $4, $5, $6
      ) RETURNING *
    `;

    const insertParams = [
      name,
      slug,
      description,
      logo_url,
      website_url,
      is_active !== undefined ? is_active : true
    ];

    const newBrand = await getRow(insertQuery, insertParams);

    return NextResponse.json({
      success: true,
      brand: newBrand,
      message: 'Brand created successfully'
    });

  } catch (error) {
    console.error('Error creating brand:', error);
    return NextResponse.json(
      { error: 'Failed to create brand' },
      { status: 500 }
    );
  }
}
