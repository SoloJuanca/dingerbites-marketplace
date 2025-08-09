import { NextResponse } from 'next/server';
import { getRow, query } from '../../../../lib/database';

// GET /api/brands/[id] - Get brand by ID
export async function GET(request, { params }) {
  try {
    const { id } = params;

    const brandQuery = `
      SELECT id, name, slug, description, logo_url, website_url, is_active, created_at
      FROM product_brands 
      WHERE id = $1
    `;

    const brand = await getRow(brandQuery, [id]);

    if (!brand) {
      return NextResponse.json(
        { error: 'Brand not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(brand);

  } catch (error) {
    console.error('Error fetching brand:', error);
    return NextResponse.json(
      { error: 'Failed to fetch brand' },
      { status: 500 }
    );
  }
}

// PUT /api/brands/[id] - Update brand
export async function PUT(request, { params }) {
  try {
    const { id } = params;
    const body = await request.json();
    const { name, description, logo_url, website_url } = body;

    // Check if brand exists
    const existingBrand = await getRow('SELECT id, name FROM product_brands WHERE id = $1', [id]);
    if (!existingBrand) {
      return NextResponse.json(
        { error: 'Brand not found' },
        { status: 404 }
      );
    }

    // Generate new slug if name is being updated
    let slug = existingBrand.name;
    if (name && name !== existingBrand.name) {
      slug = name
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9\s]/g, '')
        .trim()
        .replace(/\s+/g, '-');

      // Check if new slug already exists
      const slugExists = await getRow(
        'SELECT id FROM product_brands WHERE slug = $1 AND id != $2',
        [slug, id]
      );

      if (slugExists) {
        return NextResponse.json(
          { error: 'Brand with this name already exists' },
          { status: 409 }
        );
      }
    }

    // Update brand
    const updateQuery = `
      UPDATE product_brands 
      SET name = COALESCE($2, name),
          slug = COALESCE($3, slug),
          description = COALESCE($4, description),
          logo_url = COALESCE($5, logo_url),
          website_url = COALESCE($6, website_url),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING id, name, slug, description, logo_url, website_url, updated_at
    `;

    const brand = await getRow(updateQuery, [
      id,
      name,
      slug,
      description,
      logo_url,
      website_url
    ]);

    return NextResponse.json(brand);

  } catch (error) {
    console.error('Error updating brand:', error);
    return NextResponse.json(
      { error: 'Failed to update brand' },
      { status: 500 }
    );
  }
}

// DELETE /api/brands/[id] - Delete brand
export async function DELETE(request, { params }) {
  try {
    const { id } = params;

    // Check if brand exists
    const existingBrand = await getRow('SELECT id, name FROM product_brands WHERE id = $1', [id]);
    if (!existingBrand) {
      return NextResponse.json(
        { error: 'Brand not found' },
        { status: 404 }
      );
    }

    // Check if brand is being used by products
    const productsUsingBrand = await getRow(
      'SELECT COUNT(*) as count FROM products WHERE brand_id = $1',
      [id]
    );

    if (parseInt(productsUsingBrand.count) > 0) {
      return NextResponse.json(
        { error: 'Cannot delete brand that is being used by products' },
        { status: 400 }
      );
    }

    // Soft delete - set is_active to false
    const deleteQuery = `
      UPDATE product_brands 
      SET is_active = false, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING id, name
    `;

    const brand = await getRow(deleteQuery, [id]);

    return NextResponse.json({
      message: 'Brand deleted successfully',
      brand
    });

  } catch (error) {
    console.error('Error deleting brand:', error);
    return NextResponse.json(
      { error: 'Failed to delete brand' },
      { status: 500 }
    );
  }
} 