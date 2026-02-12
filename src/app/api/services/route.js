import { NextResponse } from 'next/server';
import { getServices, createService } from '../../../lib/firebaseServices';

// GET /api/services - Get services with filters
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category') || '';
    const level = searchParams.get('level') || '';
    const minPrice = searchParams.get('minPrice') || '';
    const maxPrice = searchParams.get('maxPrice') || '';
    const page = parseInt(searchParams.get('page')) || 1;
    const limit = parseInt(searchParams.get('limit')) || 8;

    const result = await getServices({
      category: category || undefined,
      level: level || undefined,
      minPrice: minPrice || undefined,
      maxPrice: maxPrice || undefined,
      page,
      limit
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error fetching services:', error);
    return NextResponse.json(
      { error: 'Failed to fetch services' },
      { status: 500 }
    );
  }
}

// POST /api/services - Create new service
export async function POST(request) {
  try {
    const body = await request.json();
    const {
      name,
      description,
      short_description,
      image_url,
      category_id,
      duration,
      price,
      level,
      max_participants = 12
    } = body;

    if (!name || !description || !price || !category_id) {
      return NextResponse.json(
        { error: 'Name, description, price, and category are required' },
        { status: 400 }
      );
    }

    const service = await createService({
      name,
      description,
      short_description,
      image_url,
      category_id,
      duration,
      price,
      level,
      max_participants
    });

    return NextResponse.json(service, { status: 201 });
  } catch (error) {
    console.error('Error creating service:', error);
    if (error.message === 'Category not found') {
      return NextResponse.json(
        { error: 'Category not found' },
        { status: 404 }
      );
    }
    return NextResponse.json(
      { error: 'Failed to create service' },
      { status: 500 }
    );
  }
}
