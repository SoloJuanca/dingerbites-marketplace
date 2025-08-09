import { NextResponse } from 'next/server';
import { getRows, getRow, query, transaction } from '../../../lib/database';
import { authenticateUser } from '../../../lib/auth';

// GET /api/orders - Get orders (user-specific, requires authentication)
export async function GET(request) {
  try {
    // Authenticate user
    const user = await authenticateUser(request);
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const page = parseInt(searchParams.get('page')) || 1;
    const limit = parseInt(searchParams.get('limit')) || 10;
    const offset = (page - 1) * limit;

    // Build the query with filters
    let ordersQuery = `
      SELECT o.*, os.name as status_name, os.color as status_color,
             u.email as customer_email, u.first_name, u.last_name
      FROM orders o
      JOIN order_statuses os ON o.status_id = os.id
      LEFT JOIN users u ON o.user_id = u.id
      WHERE 1=1
    `;

    const params = [];
    let paramIndex = 1;

    // Filter by authenticated user
    ordersQuery += ` AND o.user_id = $${paramIndex}`;
    params.push(user.id);
    paramIndex++;

    // Add status filter
    if (status) {
      ordersQuery += ` AND os.name = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    ordersQuery += ` ORDER BY o.created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limit, offset);

    const orders = await getRows(ordersQuery, params);

    // Get total count for pagination
    let countQuery = `
      SELECT COUNT(*) as total
      FROM orders o
      JOIN order_statuses os ON o.status_id = os.id
      WHERE 1=1
    `;

    const countParams = [];
    paramIndex = 1;

    // Filter by authenticated user
    countQuery += ` AND o.user_id = $${paramIndex}`;
    countParams.push(user.id);
    paramIndex++;

    if (status) {
      countQuery += ` AND os.name = $${paramIndex}`;
      countParams.push(status);
      paramIndex++;
    }

    const totalResult = await getRow(countQuery, countParams);
    const total = parseInt(totalResult.total);

    return NextResponse.json({
      orders,
      pagination: {
        total,
        totalPages: Math.ceil(total / limit),
        currentPage: page,
        hasNextPage: page < Math.ceil(total / limit),
        hasPrevPage: page > 1
      }
    });

  } catch (error) {
    console.error('Error fetching orders:', error);
    return NextResponse.json(
      { error: 'Failed to fetch orders' },
      { status: 500 }
    );
  }
}

// POST /api/orders - Create new order
export async function POST(request) {
  try {
    const body = await request.json();
    const {
      user_id,
      items, // Array of {product_id, quantity, variant_id}
      service_items, // Array of {service_id, schedule_id, quantity}
      shipping_address_id,
      billing_address_id,
      notes,
      customer_email,
      customer_phone,
      payment_method,
      shipping_method,
      subtotal,
      tax_amount = 0,
      shipping_amount = 0,
      discount_amount = 0,
      total_amount
    } = body;

    // Validate required fields
    if (!customer_email || !total_amount || (!items && !service_items)) {
      return NextResponse.json(
        { error: 'Customer email, total amount, and at least one item are required' },
        { status: 400 }
      );
    }

    // Generate order number
    const orderNumber = `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

    // Get default pending status
    const pendingStatus = await getRow(
      'SELECT id FROM order_statuses WHERE name = $1',
      ['pending']
    );

    if (!pendingStatus) {
      return NextResponse.json(
        { error: 'Order status not found' },
        { status: 500 }
      );
    }

    // Create order using transaction
    const result = await transaction(async (client) => {
      // Create the order
      const createOrderQuery = `
        INSERT INTO orders (
          order_number, user_id, status_id, subtotal, tax_amount, shipping_amount, 
          discount_amount, total_amount, shipping_address_id, billing_address_id, 
          notes, customer_email, customer_phone, payment_method, shipping_method
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
        RETURNING id, order_number
      `;

      const order = await client.query(createOrderQuery, [
        orderNumber,
        user_id || null,
        pendingStatus.id,
        subtotal || total_amount,
        tax_amount,
        shipping_amount,
        discount_amount,
        total_amount,
        shipping_address_id || null,
        billing_address_id || null,
        notes || null,
        customer_email,
        customer_phone || null,
        payment_method || null,
        shipping_method || null
      ]);

      const orderId = order.rows[0].id;

      // Add product items
      if (items && items.length > 0) {
        for (const item of items) {
          const { product_id, quantity, variant_id } = item;
          
          // Get product details
          const product = await client.query(
            'SELECT name, price, sku FROM products WHERE id = $1',
            [product_id]
          );

          if (product.rows.length === 0) {
            throw new Error(`Product not found: ${product_id}`);
          }

          const productData = product.rows[0];
          const unitPrice = variant_id ? 
            (await client.query('SELECT price FROM product_variants WHERE id = $1', [variant_id])).rows[0]?.price || productData.price :
            productData.price;

          await client.query(`
            INSERT INTO order_items (
              order_id, product_id, product_variant_id, product_name, 
              product_sku, quantity, unit_price, total_price
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
          `, [
            orderId,
            product_id,
            variant_id || null,
            productData.name,
            productData.sku || null,
            quantity,
            unitPrice,
            unitPrice * quantity
          ]);
        }
      }

      // Add service items
      if (service_items && service_items.length > 0) {
        for (const item of service_items) {
          const { service_id, schedule_id, quantity = 1 } = item;
          
          // Get service details
          const service = await client.query(
            'SELECT name FROM services WHERE id = $1',
            [service_id]
          );

          if (service.rows.length === 0) {
            throw new Error(`Service not found: ${service_id}`);
          }

          const serviceData = service.rows[0];
          const unitPrice = (await client.query('SELECT price FROM services WHERE id = $1', [service_id])).rows[0].price;

          await client.query(`
            INSERT INTO order_service_items (
              order_id, service_id, service_schedule_id, service_name,
              quantity, unit_price, total_price
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7)
          `, [
            orderId,
            service_id,
            schedule_id || null,
            serviceData.name,
            quantity,
            unitPrice,
            unitPrice * quantity
          ]);
        }
      }

      return order.rows[0];
    });

    return NextResponse.json(result, { status: 201 });

  } catch (error) {
    console.error('Error creating order:', error);
    return NextResponse.json(
      { error: 'Failed to create order' },
      { status: 500 }
    );
  }
} 