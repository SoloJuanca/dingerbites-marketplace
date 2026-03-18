import { NextResponse } from 'next/server';
import { authenticateAdmin } from '../../../../lib/auth';
import {
  CATEGORIES_COLLECTION,
  createCategory,
  getById,
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
      is_active,
      parent_id,
      tcg_category_id
    } = body;

    // Validate required fields
    if (!name || !slug) {
      return NextResponse.json(
        { error: 'Name and slug are required' },
        { status: 400 }
      );
    }

    const normalizeSlug = (value = '') =>
      String(value)
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9\s-]/g, '')
        .trim()
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');

    const normalizedSlug = normalizeSlug(slug);
    const resolvedParentId = parent_id || null;

    // Check if slug already exists only under same parent
    const sameSlugSnapshot = await listCollection(CATEGORIES_COLLECTION, {
      page: 1,
      limit: 1000,
      onlyActive: false,
      orderBy: 'name'
    });
    const existingCategoryInSameParent = sameSlugSnapshot.items.find(
      (item) => item.slug === normalizedSlug && (item.parent_id || null) === resolvedParentId
    );

    if (existingCategoryInSameParent) {
      return NextResponse.json(
        { error: 'Category with this slug already exists under the same parent category' },
        { status: 400 }
      );
    }

    // Validate parent exists if provided
    if (resolvedParentId) {
      const parent = await getById(CATEGORIES_COLLECTION, resolvedParentId);
      if (!parent) {
        return NextResponse.json(
          { error: 'La categoría padre no existe' },
          { status: 400 }
        );
      }
    }

    const newCategory = await createCategory({
      name,
      slug: normalizedSlug,
      description,
      image_url,
      is_active: is_active !== undefined ? is_active : true,
      parent_id: resolvedParentId,
      tcg_category_id: tcg_category_id != null ? Number(tcg_category_id) : null
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
