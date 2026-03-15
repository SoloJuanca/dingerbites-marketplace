import { NextResponse } from 'next/server';
import { authenticateAdmin } from '../../../../lib/auth';
import {
  createHomeBanner,
  listHomeBannersAdmin
} from '../../../../lib/firebaseHomeBanners';

// GET /api/admin/banners - Get all home banners
export async function GET(request) {
  try {
    const admin = await authenticateAdmin(request);
    if (!admin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 401 });
    }

    const banners = await listHomeBannersAdmin();
    return NextResponse.json({ success: true, banners });
  } catch (error) {
    console.error('Error fetching admin home banners:', error);
    return NextResponse.json(
      { error: 'Failed to fetch banners' },
      { status: 500 }
    );
  }
}

// POST /api/admin/banners - Create home banner
export async function POST(request) {
  try {
    const admin = await authenticateAdmin(request);
    if (!admin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 401 });
    }

    const body = await request.json();
    if (!body.image_url) {
      return NextResponse.json(
        { error: 'image_url is required' },
        { status: 400 }
      );
    }

    const banner = await createHomeBanner(body);
    return NextResponse.json({
      success: true,
      banner,
      message: 'Banner created successfully'
    });
  } catch (error) {
    console.error('Error creating home banner:', error);
    return NextResponse.json(
      { error: 'Failed to create banner' },
      { status: 500 }
    );
  }
}
