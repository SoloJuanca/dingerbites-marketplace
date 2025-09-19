import { NextResponse } from 'next/server';
import { getRows, getRow, query, transaction } from '../../../lib/database';
import { authenticateUser } from '../../../lib/auth';
import { sendOrderNotifications } from '../../../lib/emailService';

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
      customer_name,
      payment_method,
      shipping_method,
      subtotal,
      tax_amount = 0,
      shipping_amount = 0,
      discount_amount = 0,
      total_amount,
      address // For guest users, we'll save this
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
      let finalUserId = user_id;
      let finalShippingAddressId = shipping_address_id;

      // For guest users, create a basic user record if they don't exist
      if (!user_id && customer_email) {
        // Check if user already exists by email
        const existingUser = await client.query(
          'SELECT id FROM users WHERE email = $1',
          [customer_email]
        );

        if (existingUser.rows.length === 0) {
          // Create a guest user (no password)
          const nameParts = customer_name ? customer_name.split(' ') : ['', ''];
          const firstName = nameParts[0] || '';
          const lastName = nameParts.slice(1).join(' ') || '';

          const createUserQuery = `
            INSERT INTO users (
              email, first_name, last_name, phone, role, is_guest,
              email_verified, created_at, updated_at
            )
            VALUES ($1, $2, $3, $4, 'customer', true, false, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
            RETURNING id
          `;

          const newUser = await client.query(createUserQuery, [
            customer_email,
            firstName,
            lastName,
            customer_phone || null
          ]);

          finalUserId = newUser.rows[0].id;

          // If there's an address for delivery, create an address record for the guest user
          if (address && shipping_method === 'Envío a domicilio') {
            const createAddressQuery = `
              INSERT INTO user_addresses (
                user_id, address_type, is_default, first_name, last_name,
                address_line_1, city, state, postal_code, country, phone
              )
              VALUES ($1, 'shipping', true, $2, $3, $4, 'Ciudad', 'Estado', '00000', 'Mexico', $5)
              RETURNING id
            `;

            const newAddress = await client.query(createAddressQuery, [
              finalUserId,
              firstName,
              lastName,
              address,
              customer_phone || null
            ]);

            finalShippingAddressId = newAddress.rows[0].id;
          }
        } else {
          finalUserId = existingUser.rows[0].id;
        }
      }

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
        finalUserId,
        pendingStatus.id,
        subtotal || total_amount,
        tax_amount,
        shipping_amount,
        discount_amount,
        total_amount,
        finalShippingAddressId || null,
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

    // Obtener detalles completos del pedido para los correos
    const orderData = {
      order_number: result.order_number,
      customer_name: customer_name,
      customer_email: customer_email,
      customer_phone: customer_phone,
      total_amount: total_amount,
      payment_method: payment_method,
      shipping_method: shipping_method,
      items: items || [],
      service_items: service_items || [],
      address: address,
      notes: notes,
      created_at: new Date()
    };

    // Enriquecer los datos de items con información de productos si están disponibles
    if (items && items.length > 0) {
      try {
        const enrichedItems = [];
        for (const item of items) {
          const productQuery = `
            SELECT p.name, p.price, p.sku, p.slug,
                   COALESCE(pi.image_url, '') as image_url
            FROM products p
            LEFT JOIN product_images pi ON p.id = pi.product_id AND pi.is_primary = true
            WHERE p.id = $1
          `;
          const productData = await getRow(productQuery, [item.product_id]);
          
          enrichedItems.push({
            ...item,
            product_name: productData?.name || 'Producto',
            product_slug: productData?.slug || '',
            product_image: productData?.image_url || '',
            unit_price: productData?.price || item.price || 0,
            total_price: (productData?.price || item.price || 0) * item.quantity
          });
        }
        orderData.items = enrichedItems;
      } catch (error) {
        console.error('Error enriching product data for email:', error);
        // Use original items if enrichment fails
      }
    }

    // Enriquecer los datos de servicios si están disponibles
    if (service_items && service_items.length > 0) {
      try {
        const enrichedServiceItems = [];
        for (const item of service_items) {
          const serviceQuery = 'SELECT name, price FROM services WHERE id = $1';
          const serviceData = await getRow(serviceQuery, [item.service_id]);
          
          enrichedServiceItems.push({
            ...item,
            service_name: serviceData?.name || 'Servicio',
            unit_price: serviceData?.price || 0,
            total_price: (serviceData?.price || 0) * (item.quantity || 1)
          });
        }
        orderData.service_items = enrichedServiceItems;
      } catch (error) {
        console.error('Error enriching service data for email:', error);
        // Use original service_items if enrichment fails
      }
    }

    // Enviar notificaciones por correo de manera asíncrona
    // No bloquear la respuesta si falla el envío de correos
    sendOrderNotifications(orderData)
      .then((emailResults) => {
        console.log('Email notifications sent:', emailResults);
      })
      .catch((error) => {
        console.error('Error sending email notifications:', error);
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