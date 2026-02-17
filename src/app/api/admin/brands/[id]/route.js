import { NextResponse } from 'next/server';
import { authenticateAdmin } from '../../../../../lib/auth';
import {
  BRANDS_COLLECTION,
  deleteById,
  findBySlugExcludingId,
  getById,
  hasProductsWithBrandId,
  updateById
} from '../../../../../lib/firebaseCatalog';

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

    const { id } = await params;
    const body = await request.json();

    // Check if brand exists
    const existingBrand = await getById(BRANDS_COLLECTION, id);

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
      const slugExists = await findBySlugExcludingId(BRANDS_COLLECTION, slug, id);

      if (slugExists) {
        return NextResponse.json(
          { error: 'Brand with this slug already exists' },
          { status: 400 }
        );
      }
    }

    const updatedBrand = await updateById(BRANDS_COLLECTION, id, {
      name,
      slug,
      description: description ?? null,
      logo_url: logo_url ?? null,
      website_url: website_url ?? null,
      is_active: is_active !== undefined ? Boolean(is_active) : existingBrand.is_active
    });

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

    const { id } = await params;

    // Check if brand exists
    const existingBrand = await getById(BRANDS_COLLECTION, id);

    if (!existingBrand) {
      return NextResponse.json(
        { error: 'Brand not found' },
        { status: 404 }
      );
    }

    // Check if brand has products
    const hasProducts = await hasProductsWithBrandId(id);
    if (hasProducts) {
      return NextResponse.json(
        { error: 'Cannot delete brand that has products. Move the products to another brand first.' },
        { status: 400 }
      );
    }

    await deleteById(BRANDS_COLLECTION, id);

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
