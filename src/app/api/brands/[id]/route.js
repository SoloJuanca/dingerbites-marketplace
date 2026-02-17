import { NextResponse } from 'next/server';
import {
  BRANDS_COLLECTION,
  deleteById,
  findBySlugExcludingId,
  getById,
  hasProductsWithBrandId,
  updateById
} from '../../../../lib/firebaseCatalog';

function generateSlug(value) {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, '')
    .trim()
    .replace(/\s+/g, '-');
}

// GET /api/brands/[id] - Get brand by ID
export async function GET(request, { params }) {
  try {
    const { id } = await params;

    const brand = await getById(BRANDS_COLLECTION, id);

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
    const { id } = await params;
    const body = await request.json();
    const { name, description, logo_url, website_url } = body;

    // Check if brand exists
    const existingBrand = await getById(BRANDS_COLLECTION, id);
    if (!existingBrand) {
      return NextResponse.json(
        { error: 'Brand not found' },
        { status: 404 }
      );
    }

    // Generate new slug if name is being updated
    let slug = existingBrand.slug;
    if (name && name !== existingBrand.name) {
      slug = generateSlug(name);

      const slugExists = await findBySlugExcludingId(BRANDS_COLLECTION, slug, id);

      if (slugExists) {
        return NextResponse.json(
          { error: 'Brand with this name already exists' },
          { status: 409 }
        );
      }
    }

    const brand = await updateById(BRANDS_COLLECTION, id, {
      name: name ?? existingBrand.name,
      slug: slug ?? existingBrand.slug,
      description: description ?? existingBrand.description ?? null,
      logo_url: logo_url ?? existingBrand.logo_url ?? null,
      website_url: website_url ?? existingBrand.website_url ?? null
    });

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
    const { id } = await params;

    // Check if brand exists
    const existingBrand = await getById(BRANDS_COLLECTION, id);
    if (!existingBrand) {
      return NextResponse.json(
        { error: 'Brand not found' },
        { status: 404 }
      );
    }

    // Check if brand is being used by products
    const hasProducts = await hasProductsWithBrandId(id);
    if (hasProducts) {
      return NextResponse.json(
        { error: 'Cannot delete brand that is being used by products' },
        { status: 400 }
      );
    }

    await deleteById(BRANDS_COLLECTION, id);
    return NextResponse.json({
      message: 'Brand deleted successfully',
      brand: { id: existingBrand.id, name: existingBrand.name }
    });

  } catch (error) {
    console.error('Error deleting brand:', error);
    return NextResponse.json(
      { error: 'Failed to delete brand' },
      { status: 500 }
    );
  }
} 