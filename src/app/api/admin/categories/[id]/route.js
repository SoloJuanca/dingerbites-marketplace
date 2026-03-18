import { NextResponse } from 'next/server';
import { authenticateAdmin } from '../../../../../lib/auth';
import {
  CATEGORIES_COLLECTION,
  deleteById,
  getById,
  hasProductsWithCategoryId,
  hasSubcategories,
  listCollection,
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

    const { id } = await params;
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

    const resolvedParentId = parent_id || null;
    const normalizedSlug = normalizeSlug(slug);

    // Check if slug already exists under same parent (excluding current category)
    const allCategories = await listCollection(CATEGORIES_COLLECTION, {
      page: 1,
      limit: 1000,
      onlyActive: false,
      orderBy: 'name'
    });
    const slugExistsInSameParent = allCategories.items.find(
      (item) =>
        item.id !== id &&
        item.slug === normalizedSlug &&
        (item.parent_id || null) === resolvedParentId
    );

    if (slugExistsInSameParent) {
      return NextResponse.json(
        { error: 'Category with this slug already exists under the same parent category' },
        { status: 400 }
      );
    }

    // Validate parent_id: prevent circular references and validate parent exists
    if (resolvedParentId) {
      if (resolvedParentId === id) {
        return NextResponse.json(
          { error: 'Una categoría no puede ser su propia padre' },
          { status: 400 }
        );
      }
      const parent = await getById(CATEGORIES_COLLECTION, resolvedParentId);
      if (!parent) {
        return NextResponse.json(
          { error: 'La categoría padre no existe' },
          { status: 400 }
        );
      }
      // Prevent setting a descendant as parent (cycle check)
      let current = parent;
      while (current?.parent_id) {
        if (current.parent_id === id) {
          return NextResponse.json(
            { error: 'No se puede crear una referencia circular entre categorías' },
            { status: 400 }
          );
        }
        current = await getById(CATEGORIES_COLLECTION, current.parent_id);
      }
    }

    const updatedCategory = await updateById(CATEGORIES_COLLECTION, id, {
      name,
      slug: normalizedSlug,
      description: description ?? null,
      image_url: image_url ?? null,
      is_active: is_active !== undefined ? Boolean(is_active) : existingCategory.is_active,
      parent_id: resolvedParentId,
      tcg_category_id: tcg_category_id != null ? Number(tcg_category_id) : null
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

    const { id } = await params;

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

    // Check if category has subcategories
    const hasChildCategories = await hasSubcategories(id);
    if (hasChildCategories) {
      return NextResponse.json(
        { error: 'No se puede eliminar una categoría con subcategorías. Elimina o mueve las subcategorías primero.' },
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
