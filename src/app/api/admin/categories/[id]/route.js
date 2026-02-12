import { NextResponse } from 'next/server';
import { authenticateAdmin } from '../../../../../lib/auth';
import {
  CATEGORIES_COLLECTION,
  deleteById,
  findBySlugExcludingId,
  getById,
  hasProductsWithCategoryId,
  updateById
} from '../../../../../lib/firebaseCatalog';

// PUT /api/admin/categories/[id] - Update category
export async function PUT(request, { params }) {
  try {
    // Authenticate admin user
    const admin = await authenticateAdmin(request);
    if (!admin) {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 401 }
      );
    }

    const { id } = params;
    const body = await request.json();

    // Check if category exists
    const existingCategory = await getById(CATEGORIES_COLLECTION, id);

    if (!existingCategory) {
      return NextResponse.json(
        { error: 'Category not found' },
        { status: 404 }
      );
    }

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

    // Check if slug already exists (excluding current category)
    if (slug !== existingCategory.slug) {
      const slugExists = await findBySlugExcludingId(CATEGORIES_COLLECTION, slug, id);

      if (slugExists) {
        return NextResponse.json(
          { error: 'Category with this slug already exists' },
          { status: 400 }
        );
      }
    }

    const updatedCategory = await updateById(CATEGORIES_COLLECTION, id, {
      name,
      slug,
      description: description ?? null,
      image_url: image_url ?? null,
      is_active: is_active !== undefined ? Boolean(is_active) : existingCategory.is_active
    });

    return NextResponse.json({
      success: true,
      category: updatedCategory,
      message: 'Category updated successfully'
    });

  } catch (error) {
    console.error('Error updating category:', error);
    return NextResponse.json(
      { error: 'Failed to update category' },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/categories/[id] - Delete category
export async function DELETE(request, { params }) {
  try {
    // Authenticate admin user
    const admin = await authenticateAdmin(request);
    if (!admin) {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 401 }
      );
    }

    const { id } = params;

    // Check if category exists
    const existingCategory = await getById(CATEGORIES_COLLECTION, id);

    if (!existingCategory) {
      return NextResponse.json(
        { error: 'Category not found' },
        { status: 404 }
      );
    }

    // Check if category has products
    const hasProducts = await hasProductsWithCategoryId(id);
    if (hasProducts) {
      return NextResponse.json(
        { error: 'Cannot delete category that has products. Move the products to another category first.' },
        { status: 400 }
      );
    }

    await deleteById(CATEGORIES_COLLECTION, id);

    return NextResponse.json({
      success: true,
      message: 'Category deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting category:', error);
    return NextResponse.json(
      { error: 'Failed to delete category' },
      { status: 500 }
    );
  }
}
