import { NextResponse } from 'next/server';
import {
  CATEGORIES_COLLECTION,
  createCategory,
  findBySlug,
  listCollection
} from '../../../lib/firebaseCatalog';

// GET /api/categories - Get all categories
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page')) || 1;
    const limit = parseInt(searchParams.get('limit')) || 20;
    const { items: categories, pagination } = await listCollection(CATEGORIES_COLLECTION, {
      page,
      limit,
      onlyActive: true,
      orderBy: 'sort_order'
    });

    return NextResponse.json({
      categories,
      pagination
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
    const existingCategory = await findBySlug(CATEGORIES_COLLECTION, slug);

    if (existingCategory) {
      return NextResponse.json(
        { error: 'Category with this name already exists' },
        { status: 409 }
      );
    }

    const category = await createCategory({
      name,
      slug,
      description,
      image_url,
      sort_order
    });

    return NextResponse.json(category, { status: 201 });

  } catch (error) {
    console.error('Error creating category:', error);
    return NextResponse.json(
      { error: 'Failed to create category' },
      { status: 500 }
    );
  }
} 