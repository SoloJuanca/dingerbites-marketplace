import { NextResponse } from 'next/server';
import { authenticateAdmin } from '../../../../../../lib/auth';
import { db } from '../../../../../../lib/firebaseAdmin';

// PATCH /api/admin/products/[id]/toggle-status - Toggle product active status
export async function PATCH(request, { params }) {
  try {
    const admin = await authenticateAdmin(request);
    if (!admin) {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 401 }
      );
    }

    const { id } = await params;
    const productRef = db.collection('products').doc(String(id));
    const productSnap = await productRef.get();
    if (!productSnap.exists) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      );
    }

    const current = productSnap.data();
    const newStatus = !current.is_active;
    await productRef.update({
      is_active: newStatus,
      updated_at: new Date().toISOString()
    });
    const updatedSnap = await productRef.get();
    const updatedProduct = { id: updatedSnap.id, ...updatedSnap.data() };

    return NextResponse.json({
      success: true,
      product: updatedProduct,
      message: `Product ${newStatus ? 'activated' : 'deactivated'} successfully`
    });
  } catch (error) {
    console.error('Error toggling product status:', error);
    return NextResponse.json(
      { error: 'Failed to toggle product status' },
      { status: 500 }
    );
  }
}
