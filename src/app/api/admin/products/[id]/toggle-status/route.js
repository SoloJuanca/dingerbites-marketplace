import { NextResponse } from 'next/server';
import { authenticateAdmin } from '../../../../../../lib/auth';
import { getRow } from '../../../../../../lib/database';

// PATCH /api/admin/products/[id]/toggle-status - Toggle product active status
export async function PATCH(request, { params }) {
  try {
    // Authenticate admin user
    const admin = await authenticateAdmin(request);
    if (!admin) {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 401 }
      );
    }

    const { id } = params;

    // Check if product exists
    const existingProduct = await getRow(
      'SELECT id, name, is_active FROM products WHERE id = $1',
      [id]
    );

    if (!existingProduct) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      );
    }

    // Toggle the status
    const newStatus = !existingProduct.is_active;

    const updatedProduct = await getRow(
      'UPDATE products SET is_active = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *',
      [newStatus, id]
    );

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
