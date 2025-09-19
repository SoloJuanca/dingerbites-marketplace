import { NextResponse } from 'next/server';
import { authenticateAdmin } from '../../../../lib/auth';
import { query, getRow } from '../../../../lib/database';

// GET /api/admin/inventory - Get inventory data with stats and filtering
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
    const stockStatus = searchParams.get('stockStatus') || 'all';
    
    const offset = (page - 1) * limit;

    // Build the main products query with filters
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
      WHERE p.is_active = true
    `;

    const params = [];
    let paramIndex = 1;

    // Add search filter
    if (search) {
      productsQuery += ` AND (p.name ILIKE $${paramIndex} OR p.sku ILIKE $${paramIndex} OR p.description ILIKE $${paramIndex})`;
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

    // Add stock status filter
    if (stockStatus !== 'all') {
      switch (stockStatus) {
        case 'out_of_stock':
          productsQuery += ` AND p.stock_quantity = 0`;
          break;
        case 'low_stock':
          productsQuery += ` AND p.stock_quantity > 0 AND p.stock_quantity <= p.low_stock_threshold`;
          break;
        case 'in_stock':
          productsQuery += ` AND p.stock_quantity > p.low_stock_threshold`;
          break;
      }
    }

    // Add pagination
    productsQuery += ` ORDER BY p.stock_quantity ASC, p.name ASC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limit, offset);

    // Execute main products query
    const products = await query(productsQuery, params);

    // Get total count for pagination (using same filters)
    let countQuery = `
      SELECT COUNT(*) as total
      FROM products p
      LEFT JOIN product_categories pc ON p.category_id = pc.id
      LEFT JOIN product_brands pb ON p.brand_id = pb.id
      WHERE p.is_active = true
    `;

    const countParams = [];
    let countParamIndex = 1;

    // Add the same filters to count query
    if (search) {
      countQuery += ` AND (p.name ILIKE $${countParamIndex} OR p.sku ILIKE $${countParamIndex} OR p.description ILIKE $${countParamIndex})`;
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

    if (stockStatus !== 'all') {
      switch (stockStatus) {
        case 'out_of_stock':
          countQuery += ` AND p.stock_quantity = 0`;
          break;
        case 'low_stock':
          countQuery += ` AND p.stock_quantity > 0 AND p.stock_quantity <= p.low_stock_threshold`;
          break;
        case 'in_stock':
          countQuery += ` AND p.stock_quantity > p.low_stock_threshold`;
          break;
      }
    }

    const countResult = await getRow(countQuery, countParams);
    const total = parseInt(countResult?.total || 0);
    const totalPages = Math.ceil(total / limit);

    // Calculate inventory statistics
    const statsQuery = `
      SELECT 
        COUNT(*) as total_products,
        SUM(
          CASE 
            WHEN p.cost_price IS NOT NULL AND p.cost_price > 0 
            THEN p.cost_price * p.stock_quantity
            ELSE p.price * 0.6 * p.stock_quantity
          END
        ) as total_investment,
        COUNT(CASE WHEN p.stock_quantity = 0 THEN 1 END) as out_of_stock_items,
        COUNT(CASE WHEN p.stock_quantity > 0 AND p.stock_quantity <= p.low_stock_threshold THEN 1 END) as low_stock_items
      FROM products p
      WHERE p.is_active = true
    `;

    const statsResult = await getRow(statsQuery);
    
    const stats = {
      totalInvestment: parseFloat(statsResult?.total_investment || 0),
      totalProducts: parseInt(statsResult?.total_products || 0),
      lowStockItems: parseInt(statsResult?.low_stock_items || 0),
      outOfStockItems: parseInt(statsResult?.out_of_stock_items || 0)
    };

    return NextResponse.json({
      success: true,
      products: products.rows || [],
      stats,
      pagination: {
        page,
        limit,
        total,
        totalPages
      }
    });

  } catch (error) {
    console.error('Error fetching inventory data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch inventory data' },
      { status: 500 }
    );
  }
}
