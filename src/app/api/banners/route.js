import { NextResponse } from 'next/server';
import { listHomeBannersPublic } from '../../../lib/firebaseHomeBanners';

export const dynamic = 'force-dynamic';

// GET /api/banners - Public active banners
export async function GET() {
  try {
    const banners = await listHomeBannersPublic();
    return NextResponse.json({ banners });
  } catch (error) {
    console.error('Error fetching public home banners:', error);
    return NextResponse.json(
      { error: 'Failed to fetch banners', banners: [] },
      { status: 500 }
    );
  }
}
