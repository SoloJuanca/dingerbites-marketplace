import { NextResponse } from 'next/server';
import { authenticateAdmin } from '../../../../../lib/auth';
import { query, getRow } from '../../../../../lib/database';

// GET /api/admin/products/[id] - Get single product
export async function GET(request, { params }) {
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

    const productQuery = `
      SELECT 
        p.*,
        pc.name as category_name,
        pb.name as brand_name,
        array_agg(
          CASE WHEN pi.id IS NOT NULL THEN
            json_build_object(
              'id', pi.id,
              'image_url', pi.image_url,
              'alt_text', pi.alt_text,
              'is_primary', pi.is_primary,
              'sort_order', pi.sort_order
            )
          END
        ) FILTER (WHERE pi.id IS NOT NULL) as images
      FROM products p
      LEFT JOIN product_categories pc ON p.category_id = pc.id
      LEFT JOIN product_brands pb ON p.brand_id = pb.id
      LEFT JOIN product_images pi ON p.id = pi.product_id
      WHERE p.id = $1
      GROUP BY p.id, pc.name, pb.name
    `;

    const product = await getRow(productQuery, [id]);

    if (!product) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      product
    });

  } catch (error) {
    console.error('Error fetching product:', error);
    return NextResponse.json(
      { error: 'Failed to fetch product' },
      { status: 500 }
    );
  }
}

// PUT /api/admin/products/[id] - Update product
export async function PUT(request, { params }) {
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

    // Check if product exists
    const existingProduct = await getRow(
      'SELECT id, slug FROM products WHERE id = $1',
      [id]
    );

    if (!existingProduct) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      );
    }

    const {
      name,
      slug,
      description,
      short_description,
      price,
      compare_price,
      cost_price,
      sku,
      barcode,
      weight_grams,
      dimensions_cm,
      category_id,
      brand_id,
      stock_quantity,
      low_stock_threshold,
      allow_backorders,
      is_active,
      is_featured,
      is_bestseller,
      meta_title,
      meta_description,
      meta_keywords,
      images
    } = body;

    // Validate required fields
    if (!name || !slug) {
      return NextResponse.json(
        { error: 'Name and slug are required' },
        { status: 400 }
      );
    }

    // Price is only required for active products (published)
    if (is_active && (!price || parseFloat(price) <= 0)) {
      return NextResponse.json(
        { error: 'Price is required for published products' },
        { status: 400 }
      );
    }

    // Check if slug already exists (excluding current product)
    if (slug !== existingProduct.slug) {
      const slugExists = await getRow(
        'SELECT id FROM products WHERE slug = $1 AND id != $2',
        [slug, id]
      );

      if (slugExists) {
        return NextResponse.json(
          { error: 'Product with this slug already exists' },
          { status: 400 }
        );
      }
    }

    // Update product
    const updateQuery = `
      UPDATE products SET
        name = $1,
        slug = $2,
        description = $3,
        short_description = $4,
        price = $5,
        compare_price = $6,
        cost_price = $7,
        sku = $8,
        barcode = $9,
        weight_grams = $10,
        dimensions_cm = $11,
        category_id = $12,
        brand_id = $13,
        stock_quantity = $14,
        low_stock_threshold = $15,
        allow_backorders = $16,
        is_active = $17,
        is_featured = $18,
        is_bestseller = $19,
        meta_title = $20,
        meta_description = $21,
        meta_keywords = $22,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $23
      RETURNING *
    `;

    const updateParams = [
      name, slug, description, short_description, 
      price || 0, // Default to 0 for drafts
      compare_price, cost_price,
      sku, barcode, weight_grams, dimensions_cm, category_id, brand_id,
      stock_quantity, low_stock_threshold, allow_backorders,
      is_active, is_featured, is_bestseller,
      meta_title, meta_description, meta_keywords,
      id
    ];

    const updatedProduct = await getRow(updateQuery, updateParams);

    // Handle product images if provided
    if (images && Array.isArray(images)) {
      try {
        // First, delete existing images for this product
        await query('DELETE FROM product_images WHERE product_id = $1', [id]);
        
        // Then insert new images
        if (images.length > 0) {
          for (let i = 0; i < images.length; i++) {
            const image = images[i];
            if (image.url) {
              const imageInsertQuery = `
                INSERT INTO product_images (product_id, image_url, alt_text, is_primary, sort_order)
                VALUES ($1, $2, $3, $4, $5)
              `;
              const imageParams = [
                id,
                image.url,
                image.alt || image.name || '',
                i === 0, // First image is primary
                i
              ];
              await query(imageInsertQuery, imageParams);
            }
          }
        }
      } catch (imageError) {
        console.error('Error updating product images:', imageError);
        // Don't fail the entire request if images fail, but log the error
      }
    }

    return NextResponse.json({
      success: true,
      product: updatedProduct,
      message: 'Product updated successfully'
    });

  } catch (error) {
    console.error('Error updating product:', error);
    return NextResponse.json(
      { error: 'Failed to update product' },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/products/[id] - Delete product
export async function DELETE(request, { params }) {
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
      'SELECT id, name FROM products WHERE id = $1',
      [id]
    );

    if (!existingProduct) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      );
    }

    // Check if product is referenced in orders
    const orderItemsCount = await getRow(
      'SELECT COUNT(*) as count FROM order_items WHERE product_id = $1',
      [id]
    );

    if (parseInt(orderItemsCount.count) > 0) {
      return NextResponse.json(
        { error: 'Cannot delete product that has been ordered. Consider deactivating it instead.' },
        { status: 400 }
      );
    }

    // Delete product (this will cascade delete images due to foreign key constraints)
    await query('DELETE FROM products WHERE id = $1', [id]);

    return NextResponse.json({
      success: true,
      message: 'Product deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting product:', error);
    return NextResponse.json(
      { error: 'Failed to delete product' },
      { status: 500 }
    );
  }
}
