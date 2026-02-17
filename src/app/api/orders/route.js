import { NextResponse } from 'next/server';
import { authenticateUser } from '../../../lib/auth';
import { getOrdersByUserId, getOrderStatusIdByName, createOrder } from '../../../lib/firebaseOrders';
import { getUserByEmail, createUser } from '../../../lib/firebaseUsers';
import { hashPassword } from '../../../lib/auth';
import { sendOrderNotifications } from '../../../lib/emailService';
import { db } from '../../../lib/firebaseAdmin';

// GET /api/orders - Get orders (user-specific, requires authentication)
export async function GET(request) {
  try {
    const user = await authenticateUser(request);
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || '';
    const page = parseInt(searchParams.get('page')) || 1;
    const limit = parseInt(searchParams.get('limit')) || 10;

    const result = await getOrdersByUserId(user.id, { status, page, limit });
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error fetching orders:', error);
    const message = process.env.NODE_ENV === 'development' ? error.message : 'Failed to fetch orders';
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}

// POST /api/orders - Create new order
export async function POST(request) {
  try {
    let body;
    try {
      body = await request.json();
    } catch (parseError) {
      return NextResponse.json(
        { error: 'Invalid JSON body' },
        { status: 400 }
      );
    }
    if (!body || typeof body !== 'object') {
      return NextResponse.json(
        { error: 'Request body is required' },
        { status: 400 }
      );
    }
    const {
      user_id,
      items,
      service_items,
      shipping_address_id,
      billing_address_id,
      notes,
      customer_email,
      customer_phone,
      customer_name,
      payment_method,
      shipping_method,
      skip_email,
      subtotal,
      tax_amount = 0,
      shipping_amount = 0,
      discount_amount = 0,
      total_amount,
      address
    } = body;
    const normalizedCustomerEmail = customer_email?.toLowerCase().trim();

    if (!normalizedCustomerEmail || !total_amount || (!items?.length && !service_items?.length)) {
      return NextResponse.json(
        { error: 'Customer email, total amount, and at least one item are required' },
        { status: 400 }
      );
    }

    const orderNumber = `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
    let pendingStatusId = await getOrderStatusIdByName('pending');
    if (!pendingStatusId) {
      // Auto-create default "pending" status if collection is empty (first run)
      const statusRef = db.collection('order_statuses').doc();
      await statusRef.set({
        name: 'pending',
        description: 'Pending',
        color: '#f59e0b',
        sort_order: 0
      });
      pendingStatusId = statusRef.id;
    }

    let finalUserId = user_id;
    let finalShippingAddressId = shipping_address_id;

    if (!user_id && normalizedCustomerEmail) {
      let existingUser = await getUserByEmail(normalizedCustomerEmail);
      if (!existingUser) {
        const nameParts = customer_name ? customer_name.split(' ') : ['', ''];
        const firstName = nameParts[0] || '';
        const lastName = nameParts.slice(1).join(' ') || '';
        const guestPassword = await hashPassword(
          `guest-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
        );
        const newUser = await createUser({
          email: normalizedCustomerEmail,
          password_hash: guestPassword,
          first_name: firstName,
          last_name: lastName,
          phone: customer_phone || null,
          is_guest: true
        });
        finalUserId = newUser.id;

        if (address && shipping_method === 'Envío a domicilio') {
          const now = new Date().toISOString();
          const addressRef = db.collection('user_addresses').doc();
          await addressRef.set({
            user_id: finalUserId,
            address_type: 'shipping',
            is_default: true,
            first_name: firstName,
            last_name: lastName,
            address_line_1: address,
            city: 'Ciudad',
            state: 'Estado',
            postal_code: '00000',
            country: 'Mexico',
            phone: customer_phone || null,
            created_at: now,
            updated_at: now
          });
          finalShippingAddressId = addressRef.id;
        }
      } else {
        finalUserId = existingUser.id;
      }
    }

    const orderItems = [];
    if (items && items.length > 0) {
      for (const item of items) {
        const { product_id, quantity, variant_id, name, sku, price, is_manual } = item;
        const qty = quantity || 1;
        if (!product_id || is_manual) {
          const unitPrice = price || 0;
          orderItems.push({
            product_id: null,
            product_variant_id: null,
            product_name: name || 'Artículo manual',
            product_sku: sku || null,
            quantity: qty,
            unit_price: unitPrice,
            total_price: unitPrice * qty
          });
          continue;
        }
        const productDoc = await db.collection('products').doc(String(product_id)).get();
        if (!productDoc.exists) {
          throw new Error(`Product not found: ${product_id}`);
        }
        const productData = productDoc.data();
        const unitPrice = Number(productData.price) || 0;
        orderItems.push({
          product_id: product_id,
          product_variant_id: variant_id || null,
          product_name: productData.name || 'Producto',
          product_sku: productData.sku || null,
          quantity: qty,
          unit_price: unitPrice,
          total_price: unitPrice * qty
        });
      }
    }

    const orderServiceItems = [];
    if (service_items && service_items.length > 0) {
      for (const item of service_items) {
        const { service_id, schedule_id, quantity = 1 } = item;
        const serviceDoc = await db.collection('services').doc(String(service_id)).get();
        if (!serviceDoc.exists) {
          throw new Error(`Service not found: ${service_id}`);
        }
        const serviceData = serviceDoc.data();
        const unitPrice = Number(serviceData.price) || 0;
        orderServiceItems.push({
          service_id,
          service_schedule_id: schedule_id || null,
          service_name: serviceData.name || 'Servicio',
          quantity,
          unit_price: unitPrice,
          total_price: unitPrice * quantity
        });
      }
    }

    const result = await createOrder({
      order_number: orderNumber,
      user_id: finalUserId || null,
      status_id: pendingStatusId,
      subtotal: subtotal ?? total_amount,
      tax_amount,
      shipping_amount,
      discount_amount,
      total_amount,
      shipping_address_id: finalShippingAddressId || null,
      billing_address_id: billing_address_id || null,
      notes: notes || null,
      customer_email: normalizedCustomerEmail,
      customer_phone: customer_phone || null,
      payment_method: payment_method || null,
      shipping_method: shipping_method || null,
      items: orderItems,
      service_items: orderServiceItems
    });

    const orderData = {
      order_number: result.order_number,
      customer_name,
      customer_email: normalizedCustomerEmail,
      customer_phone,
      total_amount: total_amount,
      payment_method,
      shipping_method,
      items: items || [],
      service_items: service_items || [],
      address,
      notes,
      created_at: new Date()
    };
    if (items?.length) {
      try {
        const enrichedItems = [];
        for (const item of items) {
          if (!item.product_id || item.is_manual) {
            enrichedItems.push({
              ...item,
              product_name: item.name || 'Artículo manual',
              product_slug: '',
              product_image: '',
              unit_price: item.price || 0,
              total_price: (item.price || 0) * (item.quantity || 1)
            });
            continue;
          }
          const productDoc = await db.collection('products').doc(String(item.product_id)).get();
          const p = productDoc.exists ? productDoc.data() : {};
          const img = Array.isArray(p.images) && p.images[0] ? (p.images[0].url || p.images[0]) : p.image || '';
          enrichedItems.push({
            ...item,
            product_name: p.name || 'Producto',
            product_slug: p.slug || '',
            product_image: img,
            unit_price: p.price || item.price || 0,
            total_price: (p.price || item.price || 0) * (item.quantity || 1)
          });
        }
        orderData.items = enrichedItems;
      } catch (e) {
        console.error('Error enriching product data for email:', e);
      }
    }
    if (service_items?.length) {
      try {
        const enriched = [];
        for (const s of service_items) {
          const serviceDoc = await db.collection('services').doc(String(s.service_id)).get();
          const sd = serviceDoc.exists ? serviceDoc.data() : {};
          enriched.push({
            ...s,
            service_name: sd.name || 'Servicio',
            unit_price: sd.price || 0,
            total_price: (sd.price || 0) * (s.quantity || 1)
          });
        }
        orderData.service_items = enriched;
      } catch (e) {
        console.error('Error enriching service data for email:', e);
      }
    }

    let customerEmailSent = false;
    if (!skip_email) {
      try {
        const emailResults = await sendOrderNotifications(orderData);
        customerEmailSent = emailResults.customerEmail?.success === true;
        if (!emailResults.adminEmail?.success) {
          console.warn('Order created but admin notification email failed:', emailResults.adminEmail?.error);
        }
        if (orderData.customer_email && !customerEmailSent) {
          console.warn('Order created but customer confirmation email failed:', emailResults.customerEmail?.error);
        }
      } catch (err) {
        console.error('Email notifications error:', err);
      }
    }

    return NextResponse.json(
      { ...result, email_sent: customerEmailSent },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating order:', error);
    const message = process.env.NODE_ENV === 'development' ? error.message : 'Failed to create order';
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
