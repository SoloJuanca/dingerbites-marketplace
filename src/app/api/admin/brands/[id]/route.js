import { NextResponse } from 'next/server';
import { authenticateAdmin } from '../../../../../lib/auth';
import { query, getRow } from '../../../../../lib/database';

// PUT /api/admin/brands/[id] - Update brand
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

    // Check if brand exists
    const existingBrand = await getRow(
      'SELECT id, slug FROM product_brands WHERE id = $1',
      [id]
    );

    if (!existingBrand) {
      return NextResponse.json(
        { error: 'Brand not found' },
        { status: 404 }
      );
    }

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

    // Check if slug already exists (excluding current brand)
    if (slug !== existingBrand.slug) {
      const slugExists = await getRow(
        'SELECT id FROM product_brands WHERE slug = $1 AND id != $2',
        [slug, id]
      );

      if (slugExists) {
        return NextResponse.json(
          { error: 'Brand with this slug already exists' },
          { status: 400 }
        );
      }
    }

    // Update brand
    const updateQuery = `
      UPDATE product_brands SET
        name = $1,
        slug = $2,
        description = $3,
        logo_url = $4,
        website_url = $5,
        is_active = $6,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $7
      RETURNING *
    `;

    const updateParams = [
      name,
      slug,
      description,
      logo_url,
      website_url,
      is_active,
      id
    ];

    const updatedBrand = await getRow(updateQuery, updateParams);

    return NextResponse.json({
      success: true,
      brand: updatedBrand,
      message: 'Brand updated successfully'
    });

  } catch (error) {
    console.error('Error updating brand:', error);
    return NextResponse.json(
      { error: 'Failed to update brand' },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/brands/[id] - Delete brand
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

    // Check if brand exists
    const existingBrand = await getRow(
      'SELECT id, name FROM product_brands WHERE id = $1',
      [id]
    );

    if (!existingBrand) {
      return NextResponse.json(
        { error: 'Brand not found' },
        { status: 404 }
      );
    }

    // Check if brand has products
    const productsCount = await getRow(
      'SELECT COUNT(*) as count FROM products WHERE brand_id = $1',
      [id]
    );

    if (parseInt(productsCount.count) > 0) {
      return NextResponse.json(
        { error: 'Cannot delete brand that has products. Move the products to another brand first.' },
        { status: 400 }
      );
    }

    // Delete brand
    await query('DELETE FROM product_brands WHERE id = $1', [id]);

    return NextResponse.json({
      success: true,
      message: 'Brand deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting brand:', error);
    return NextResponse.json(
      { error: 'Failed to delete brand' },
      { status: 500 }
    );
  }
}
