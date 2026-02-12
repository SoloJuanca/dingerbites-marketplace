import { NextResponse } from 'next/server';
import { authenticateAdmin } from '../../../../../../lib/auth';
import { db } from '../../../../../../lib/firebaseAdmin';

// PATCH /api/admin/products/[id]/stock - Update product stock
export async function PATCH(request, { params }) {
  try {
    const admin = await authenticateAdmin(request);
    if (!admin) {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 401 }
      );
    }

    const { id } = params;
    const body = await request.json();
    const { stock } = body;

    if (stock === undefined || stock === null) {
      return NextResponse.json(
        { error: 'Stock quantity is required' },
        { status: 400 }
      );
    }

    const stockQuantity = parseInt(stock, 10);
    if (stockQuantity < 0) {
      return NextResponse.json(
        { error: 'Stock quantity cannot be negative' },
        { status: 400 }
      );
    }

    const productRef = db.collection('products').doc(String(id));
    const productSnap = await productRef.get();
    if (!productSnap.exists) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      );
    }

    const existingProduct = productSnap.data();
    const previousStock = Number(existingProduct.stock_quantity) || 0;

    await productRef.update({
      stock_quantity: stockQuantity,
      updated_at: new Date().toISOString()
    });
    const updatedSnap = await productRef.get();
    const updatedProduct = { id: updatedSnap.id, ...updatedSnap.data() };

    return NextResponse.json({
      success: true,
      product: updatedProduct,
      message: `Stock updated successfully for ${existingProduct.name || 'Product'}`,
      previousStock,
      newStock: stockQuantity
    });
  } catch (error) {
    console.error('Error updating product stock:', error);
    return NextResponse.json(
      { error: 'Failed to update product stock' },
      { status: 500 }
    );
  }
}
