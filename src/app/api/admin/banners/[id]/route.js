import { NextResponse } from 'next/server';
import { authenticateAdmin } from '../../../../../lib/auth';
import {
  deleteHomeBanner,
  getHomeBannerById,
  updateHomeBanner
} from '../../../../../lib/firebaseHomeBanners';

// PUT /api/admin/banners/[id] - Update home banner
export async function PUT(request, { params }) {
  try {
    const admin = await authenticateAdmin(request);
    if (!admin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 401 });
    }

    const { id } = await params;
    const existing = await getHomeBannerById(id);
    if (!existing) {
      return NextResponse.json({ error: 'Banner not found' }, { status: 404 });
    }

    const body = await request.json();
    const banner = await updateHomeBanner(id, body);

    return NextResponse.json({
      success: true,
      banner,
      message: 'Banner updated successfully'
    });
  } catch (error) {
    console.error('Error updating home banner:', error);
    return NextResponse.json(
      { error: 'Failed to update banner' },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/banners/[id] - Delete home banner
export async function DELETE(request, { params }) {
  try {
    const admin = await authenticateAdmin(request);
    if (!admin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 401 });
    }

    const { id } = await params;
    const existing = await getHomeBannerById(id);
    if (!existing) {
      return NextResponse.json({ error: 'Banner not found' }, { status: 404 });
    }

    await deleteHomeBanner(id);
    return NextResponse.json({
      success: true,
      message: 'Banner deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting home banner:', error);
    return NextResponse.json(
      { error: 'Failed to delete banner' },
      { status: 500 }
    );
  }
}
