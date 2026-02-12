import { NextResponse } from 'next/server';
import { authenticateAdmin } from '../../../../lib/auth';
import {
  BRANDS_COLLECTION,
  createBrand,
  findBySlug,
  listCollection
} from '../../../../lib/firebaseCatalog';

// GET /api/admin/brands - Get all brands
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

    const { items: brands } = await listCollection(BRANDS_COLLECTION, {
      page: 1,
      limit: 500,
      onlyActive: false,
      orderBy: 'name'
    });

    return NextResponse.json({
      success: true,
      brands
    });

  } catch (error) {
    console.error('Error fetching brands:', error);
    return NextResponse.json(
      { error: 'Failed to fetch brands' },
      { status: 500 }
    );
  }
}

// POST /api/admin/brands - Create new brand
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

    // Check if slug already exists
    const existingBrand = await findBySlug(BRANDS_COLLECTION, slug);

    if (existingBrand) {
      return NextResponse.json(
        { error: 'Brand with this slug already exists' },
        { status: 400 }
      );
    }

    const newBrand = await createBrand({
      name,
      slug,
      description,
      logo_url,
      website_url,
      is_active: is_active !== undefined ? is_active : true
    });

    return NextResponse.json({
      success: true,
      brand: newBrand,
      message: 'Brand created successfully'
    });

  } catch (error) {
    console.error('Error creating brand:', error);
    return NextResponse.json(
      { error: 'Failed to create brand' },
      { status: 500 }
    );
  }
}
