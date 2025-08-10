import { NextResponse } from 'next/server';
import { authenticateAdmin } from '../../../../lib/auth';
import { query, getRow } from '../../../../lib/database';

// GET /api/admin/categories - Get all categories
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

    // Get all categories
    const categories = await query(
      'SELECT id, name, slug, description, image_url, is_active, sort_order FROM product_categories ORDER BY sort_order ASC, name ASC'
    );

    return NextResponse.json({
      success: true,
      categories
    });

  } catch (error) {
    console.error('Error fetching categories:', error);
    return NextResponse.json(
      { error: 'Failed to fetch categories' },
      { status: 500 }
    );
  }
}

// POST /api/admin/categories - Create new category
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
      image_url,
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
    const existingCategory = await getRow(
      'SELECT id FROM product_categories WHERE slug = $1',
      [slug]
    );

    if (existingCategory) {
      return NextResponse.json(
        { error: 'Category with this slug already exists' },
        { status: 400 }
      );
    }

    // Create category
    const insertQuery = `
      INSERT INTO product_categories (
        name, slug, description, image_url, is_active, sort_order
      ) VALUES (
        $1, $2, $3, $4, $5, 0
      ) RETURNING *
    `;

    const insertParams = [
      name,
      slug,
      description,
      image_url,
      is_active !== undefined ? is_active : true
    ];

    const newCategory = await getRow(insertQuery, insertParams);

    return NextResponse.json({
      success: true,
      category: newCategory,
      message: 'Category created successfully'
    });

  } catch (error) {
    console.error('Error creating category:', error);
    return NextResponse.json(
      { error: 'Failed to create category' },
      { status: 500 }
    );
  }
}
