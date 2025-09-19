import { NextResponse } from 'next/server';
import { authenticateAdmin } from '../../../../../../lib/auth';
import { query, getRow } from '../../../../../../lib/database';

// PATCH /api/admin/products/[id]/stock - Update product stock
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
    const body = await request.json();
    const { stock } = body;

    // Validate input
    if (stock === undefined || stock === null) {
      return NextResponse.json(
        { error: 'Stock quantity is required' },
        { status: 400 }
      );
    }

    const stockQuantity = parseInt(stock);
    if (stockQuantity < 0) {
      return NextResponse.json(
        { error: 'Stock quantity cannot be negative' },
        { status: 400 }
      );
    }

    // Check if product exists
    const existingProduct = await getRow(
      'SELECT id, name, stock_quantity FROM products WHERE id = $1',
      [id]
    );

    if (!existingProduct) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      );
    }

    // Update stock quantity
    const updateQuery = `
      UPDATE products 
      SET 
        stock_quantity = $1,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING *
    `;

    const updatedProduct = await getRow(updateQuery, [stockQuantity, id]);

    // Log stock change for audit trail (optional - you can implement this later)
    try {
      const logQuery = `
        INSERT INTO stock_movements (
          product_id, 
          movement_type, 
          quantity_change, 
          quantity_before, 
          quantity_after, 
          reason, 
          created_by,
          created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP)
      `;
      
      const quantityChange = stockQuantity - existingProduct.stock_quantity;
      const movementType = quantityChange > 0 ? 'adjustment_in' : 'adjustment_out';
      
      await query(logQuery, [
        id,
        movementType,
        Math.abs(quantityChange),
        existingProduct.stock_quantity,
        stockQuantity,
        'Manual stock adjustment via inventory management',
        admin.id
      ]);
    } catch (logError) {
      // Don't fail the main operation if logging fails
      console.error('Failed to log stock movement:', logError);
    }

    return NextResponse.json({
      success: true,
      product: updatedProduct,
      message: `Stock updated successfully for ${existingProduct.name}`,
      previousStock: existingProduct.stock_quantity,
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
