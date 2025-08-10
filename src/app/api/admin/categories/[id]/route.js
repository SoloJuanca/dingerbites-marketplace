import { NextResponse } from 'next/server';
import { authenticateAdmin } from '../../../../../lib/auth';
import { query, getRow } from '../../../../../lib/database';

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
    const existingCategory = await getRow(
      'SELECT id, slug FROM product_categories WHERE id = $1',
      [id]
    );

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
      const slugExists = await getRow(
        'SELECT id FROM product_categories WHERE slug = $1 AND id != $2',
        [slug, id]
      );

      if (slugExists) {
        return NextResponse.json(
          { error: 'Category with this slug already exists' },
          { status: 400 }
        );
      }
    }

    // Update category
    const updateQuery = `
      UPDATE product_categories SET
        name = $1,
        slug = $2,
        description = $3,
        image_url = $4,
        is_active = $5,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $6
      RETURNING *
    `;

    const updateParams = [
      name,
      slug,
      description,
      image_url,
      is_active,
      id
    ];

    const updatedCategory = await getRow(updateQuery, updateParams);

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
    const existingCategory = await getRow(
      'SELECT id, name FROM product_categories WHERE id = $1',
      [id]
    );

    if (!existingCategory) {
      return NextResponse.json(
        { error: 'Category not found' },
        { status: 404 }
      );
    }

    // Check if category has products
    const productsCount = await getRow(
      'SELECT COUNT(*) as count FROM products WHERE category_id = $1',
      [id]
    );

    if (parseInt(productsCount.count) > 0) {
      return NextResponse.json(
        { error: 'Cannot delete category that has products. Move the products to another category first.' },
        { status: 400 }
      );
    }

    // Delete category
    await query('DELETE FROM product_categories WHERE id = $1', [id]);

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
