import { NextResponse } from 'next/server';
import { authenticateAdmin } from '../../../../lib/auth';
import { uploadImage, deleteImage, validateImageFile } from '../../../../lib/blobStorage';

// POST /api/admin/upload - Upload images to Vercel Blob
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

    const formData = await request.formData();
    const file = formData.get('file');
    const folder = formData.get('folder') || 'products';

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // Validate file
    const validation = validateImageFile(file);
    if (!validation.isValid) {
      return NextResponse.json(
        { error: 'Invalid file', details: validation.errors },
        { status: 400 }
      );
    }

    // Upload to Vercel Blob
    const result = await uploadImage(file, folder);

    if (!result.success) {
      return NextResponse.json(
        { error: 'Upload failed', details: result.error },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      url: result.url,
      pathname: result.pathname,
      downloadUrl: result.downloadUrl,
      message: 'Image uploaded successfully'
    });

  } catch (error) {
    console.error('Error uploading image:', error);
    return NextResponse.json(
      { error: 'Upload failed' },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/upload - Delete image from Vercel Blob
export async function DELETE(request) {
  try {
    // Authenticate admin user
    const admin = await authenticateAdmin(request);
    if (!admin) {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const imageUrl = searchParams.get('url');

    if (!imageUrl) {
      return NextResponse.json(
        { error: 'Image URL is required' },
        { status: 400 }
      );
    }

    // Delete from Vercel Blob
    const result = await deleteImage(imageUrl);

    if (!result.success) {
      return NextResponse.json(
        { error: 'Delete failed', details: result.error },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Image deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting image:', error);
    return NextResponse.json(
      { error: 'Delete failed' },
      { status: 500 }
    );
  }
}
