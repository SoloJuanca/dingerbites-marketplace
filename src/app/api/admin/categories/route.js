import { NextResponse } from 'next/server';
import { authenticateAdmin } from '../../../../lib/auth';
import {
  CATEGORIES_COLLECTION,
  createCategory,
  findBySlug,
  listCollection
} from '../../../../lib/firebaseCatalog';

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

    const { items: categories } = await listCollection(CATEGORIES_COLLECTION, {
      page: 1,
      limit: 500,
      onlyActive: false,
      orderBy: 'sort_order'
    });

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
    const existingCategory = await findBySlug(CATEGORIES_COLLECTION, slug);

    if (existingCategory) {
      return NextResponse.json(
        { error: 'Category with this slug already exists' },
        { status: 400 }
      );
    }

    const newCategory = await createCategory({
      name,
      slug,
      description,
      image_url,
      is_active: is_active !== undefined ? is_active : true
    });

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
