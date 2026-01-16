import { NextResponse } from 'next/server';
import { authenticateAdmin } from '../../../../lib/auth';
import { query, getRow } from '../../../../lib/database';
import { createProductFeatures } from '../../../../lib/products';

// GET /api/admin/products - Get all products with filters
export async function GET(request) {
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
    const page = parseInt(searchParams.get('page')) || 1;
    const limit = parseInt(searchParams.get('limit')) || 20;
    const search = searchParams.get('search') || '';
    const category = searchParams.get('category') || '';
    const brand = searchParams.get('brand') || '';
    const status = searchParams.get('status') || 'all';
    
    const offset = (page - 1) * limit;

    // Build the query with filters
    let productsQuery = `
      SELECT 
        p.*,
        pc.name as category_name,
        pb.name as brand_name,
        COALESCE(pi.image_url, '') as image_url
      FROM products p
      LEFT JOIN product_categories pc ON p.category_id = pc.id
      LEFT JOIN product_brands pb ON p.brand_id = pb.id
      LEFT JOIN product_images pi ON p.id = pi.product_id AND pi.is_primary = true
      WHERE 1=1
    `;

    const params = [];
    let paramIndex = 1;

    // Add search filter
    if (search) {
      productsQuery += ` AND (p.name ILIKE $${paramIndex} OR p.sku ILIKE $${paramIndex} OR p.barcode ILIKE $${paramIndex} OR p.description ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    // Add category filter
    if (category) {
      productsQuery += ` AND p.category_id = $${paramIndex}`;
      params.push(category);
      paramIndex++;
    }

    // Add brand filter
    if (brand) {
      productsQuery += ` AND p.brand_id = $${paramIndex}`;
      params.push(brand);
      paramIndex++;
    }

    // Add status filter
    if (status !== 'all') {
      const isActive = status === 'active';
      productsQuery += ` AND p.is_active = $${paramIndex}`;
      params.push(isActive);
      paramIndex++;
    }

    // Add pagination
    productsQuery += ` ORDER BY p.created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limit, offset);

    // Execute query
    const products = await query(productsQuery, params);

    // Get total count for pagination
    let countQuery = `
      SELECT COUNT(*) as total
      FROM products p
      LEFT JOIN product_categories pc ON p.category_id = pc.id
      LEFT JOIN product_brands pb ON p.brand_id = pb.id
      WHERE 1=1
    `;

    const countParams = [];
    let countParamIndex = 1;

    // Add the same filters to count query
    if (search) {
      countQuery += ` AND (p.name ILIKE $${countParamIndex} OR p.sku ILIKE $${countParamIndex} OR p.barcode ILIKE $${countParamIndex} OR p.description ILIKE $${countParamIndex})`;
      countParams.push(`%${search}%`);
      countParamIndex++;
    }

    if (category) {
      countQuery += ` AND p.category_id = $${countParamIndex}`;
      countParams.push(category);
      countParamIndex++;
    }

    if (brand) {
      countQuery += ` AND p.brand_id = $${countParamIndex}`;
      countParams.push(brand);
      countParamIndex++;
    }

    if (status !== 'all') {
      const isActive = status === 'active';
      countQuery += ` AND p.is_active = $${countParamIndex}`;
      countParams.push(isActive);
      countParamIndex++;
    }

    const countResult = await getRow(countQuery, countParams);
    const total = parseInt(countResult?.total || 0);
    const totalPages = Math.ceil(total / limit);

    return NextResponse.json({
      success: true,
      products,
      pagination: {
        page,
        limit,
        total,
        totalPages
      }
    });

  } catch (error) {
    console.error('Error fetching products:', error);
    return NextResponse.json(
      { error: 'Failed to fetch products' },
      { status: 500 }
    );
  }
}

// POST /api/admin/products - Create new product
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

    const body = await request.json();
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
      images,
      features
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

    // Check if slug already exists
    const existingProduct = await getRow(
      'SELECT id FROM products WHERE slug = $1',
      [slug]
    );

    if (existingProduct) {
      return NextResponse.json(
        { error: 'Product with this slug already exists' },
        { status: 400 }
      );
    }

    // Create product
    const insertQuery = `
      INSERT INTO products (
        name, slug, description, short_description, price, compare_price, cost_price,
        sku, barcode, weight_grams, dimensions_cm, category_id, brand_id,
        stock_quantity, low_stock_threshold, allow_backorders,
        is_active, is_featured, is_bestseller,
        meta_title, meta_description, meta_keywords
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22
      ) RETURNING *
    `;

    const insertParams = [
      name, slug, description, short_description, 
      price || 0, // Default to 0 for drafts
      compare_price, cost_price,
      sku, barcode, weight_grams, dimensions_cm, category_id, brand_id,
      stock_quantity || 0, low_stock_threshold || 5, allow_backorders || false,
      is_active !== undefined ? is_active : false, // Default to false (draft)
      is_featured || false, is_bestseller || false,
      meta_title, meta_description, meta_keywords
    ];

    const newProduct = await getRow(insertQuery, insertParams);

    // Handle product images if provided
    if (images && Array.isArray(images) && images.length > 0) {
      try {
        for (let i = 0; i < images.length; i++) {
          const image = images[i];
          if (image.url) {
            const imageInsertQuery = `
              INSERT INTO product_images (product_id, image_url, alt_text, is_primary, sort_order)
              VALUES ($1, $2, $3, $4, $5)
            `;
            const imageParams = [
              newProduct.id,
              image.url,
              image.alt || image.name || '',
              i === 0, // First image is primary
              i
            ];
            await query(imageInsertQuery, imageParams);
          }
        }
      } catch (imageError) {
        console.error('Error inserting product images:', imageError);
        // Don't fail the entire request if images fail, but log the error
      }
    }

    // Handle product features if provided
    if (features && Array.isArray(features) && features.length > 0) {
      try {
        await createProductFeatures(newProduct.id, features);
      } catch (featuresError) {
        console.error('Error inserting product features:', featuresError);
        // Don't fail the entire request if features fail, but log the error
      }
    }

    return NextResponse.json({
      success: true,
      product: newProduct,
      message: 'Product created successfully'
    });

  } catch (error) {
    console.error('Error creating product:', error);
    return NextResponse.json(
      { error: 'Failed to create product' },
      { status: 500 }
    );
  }
}
