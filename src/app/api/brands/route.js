import { NextResponse } from 'next/server';
import {
  BRANDS_COLLECTION,
  createBrand,
  findBySlug,
  listCollection
} from '../../../lib/firebaseCatalog';

// GET /api/brands - Get all brands
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page')) || 1;
    const limit = parseInt(searchParams.get('limit')) || 20;
    const { items: brands, pagination } = await listCollection(BRANDS_COLLECTION, {
      page,
      limit,
      onlyActive: true,
      orderBy: 'name'
    });

    return NextResponse.json({
      brands,
      pagination
    });

  } catch (error) {
    console.error('Error fetching brands:', error);
    return NextResponse.json(
      { error: 'Failed to fetch brands' },
      { status: 500 }
    );
  }
}

// POST /api/brands - Create new brand
export async function POST(request) {
  try {
    const body = await request.json();
    const { name, description, logo_url, website_url } = body;

    // Validate required fields
    if (!name) {
      return NextResponse.json(
        { error: 'Brand name is required' },
        { status: 400 }
      );
    }

    // Generate slug from name
    const slug = name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\s]/g, '')
      .trim()
      .replace(/\s+/g, '-');

    // Check if brand already exists
    const existingBrand = await findBySlug(BRANDS_COLLECTION, slug);

    if (existingBrand) {
      return NextResponse.json(
        { error: 'Brand with this name already exists' },
        { status: 409 }
      );
    }

    const brand = await createBrand({
      name,
      slug,
      description,
      logo_url,
      website_url
    });

    return NextResponse.json(brand, { status: 201 });

  } catch (error) {
    console.error('Error creating brand:', error);
    return NextResponse.json(
      { error: 'Failed to create brand' },
      { status: 500 }
    );
  }
} 