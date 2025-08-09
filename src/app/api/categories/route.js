import { NextResponse } from 'next/server';
import { getRows, getRow, query } from '../../../lib/database';

// GET /api/categories - Get all categories
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page')) || 1;
    const limit = parseInt(searchParams.get('limit')) || 20;
    const offset = (page - 1) * limit;

    const categoriesQuery = `
      SELECT id, name, slug, description, image_url, is_active, sort_order, created_at
      FROM product_categories 
      WHERE is_active = true
      ORDER BY sort_order ASC, name ASC
      LIMIT $1 OFFSET $2
    `;

    const categories = await getRows(categoriesQuery, [limit, offset]);

    // Get total count
    const countQuery = `SELECT COUNT(*) as total FROM product_categories WHERE is_active = true`;
    const totalResult = await getRow(countQuery);
    const total = parseInt(totalResult.total);

    return NextResponse.json({
      categories,
      pagination: {
        total,
        totalPages: Math.ceil(total / limit),
        currentPage: page,
        hasNextPage: page < Math.ceil(total / limit),
        hasPrevPage: page > 1
      }
    });

  } catch (error) {
    console.error('Error fetching categories:', error);
    return NextResponse.json(
      { error: 'Failed to fetch categories' },
      { status: 500 }
    );
  }
}

// POST /api/categories - Create new category
export async function POST(request) {
  try {
    const body = await request.json();
    const { name, description, image_url, sort_order = 0 } = body;

    // Validate required fields
    if (!name) {
      return NextResponse.json(
        { error: 'Category name is required' },
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

    // Check if category already exists
    const existingCategory = await getRow(
      'SELECT id FROM product_categories WHERE slug = $1',
      [slug]
    );

    if (existingCategory) {
      return NextResponse.json(
        { error: 'Category with this name already exists' },
        { status: 409 }
      );
    }

    // Create category
    const createCategoryQuery = `
      INSERT INTO product_categories (name, slug, description, image_url, sort_order)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id, name, slug, description, image_url, sort_order, created_at
    `;

    const category = await getRow(createCategoryQuery, [
      name,
      slug,
      description || null,
      image_url || null,
      sort_order
    ]);

    return NextResponse.json(category, { status: 201 });

  } catch (error) {
    console.error('Error creating category:', error);
    return NextResponse.json(
      { error: 'Failed to create category' },
      { status: 500 }
    );
  }
} 