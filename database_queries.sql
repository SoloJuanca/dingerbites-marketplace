-- =====================================================
-- DATABASE QUERIES FOR PATITO MONTENEGRO E-COMMERCE
-- =====================================================

-- =====================================================
-- USER AUTHENTICATION QUERIES
-- =====================================================

-- 1. Create a new user
INSERT INTO users (email, password_hash, first_name, last_name, phone, date_of_birth, gender)
VALUES ($1, $2, $3, $4, $5, $6, $7)
RETURNING id, email, first_name, last_name, created_at;

-- 2. Find user by email
SELECT id, email, password_hash, first_name, last_name, phone, is_active, is_verified, 
       email_verified_at, created_at, last_login_at
FROM users 
WHERE email = $1;

-- 3. Update user last login
UPDATE users 
SET last_login_at = CURRENT_TIMESTAMP 
WHERE id = $1;

-- 4. Verify user email
UPDATE users 
SET is_verified = true, email_verified_at = CURRENT_TIMESTAMP 
WHERE id = $1;

-- 5. Reset password
UPDATE users 
SET password_hash = $2, reset_password_token = NULL, reset_password_expires_at = NULL 
WHERE id = $1;

-- 6. Get user addresses
SELECT id, address_type, is_default, first_name, last_name, company, 
       address_line_1, address_line_2, city, state, postal_code, country, phone
FROM user_addresses 
WHERE user_id = $1 
ORDER BY is_default DESC, created_at DESC;

-- 7. Add user address
INSERT INTO user_addresses (user_id, address_type, is_default, first_name, last_name, 
                           company, address_line_1, address_line_2, city, state, 
                           postal_code, country, phone)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
RETURNING id;

-- =====================================================
-- PRODUCT QUERIES
-- =====================================================

-- 8. Get products with filters and pagination
SELECT p.*, pc.name as category_name, pc.slug as category_slug, 
       pb.name as brand_name, pb.slug as brand_slug,
       COALESCE(pi.image_url, '') as primary_image,
       COUNT(pr.id) as review_count,
       COALESCE(AVG(pr.rating), 0) as average_rating
FROM products p
LEFT JOIN product_categories pc ON p.category_id = pc.id
LEFT JOIN product_brands pb ON p.brand_id = pb.id
LEFT JOIN product_images pi ON p.id = pi.product_id AND pi.is_primary = true
LEFT JOIN product_reviews pr ON p.id = pr.product_id AND pr.is_approved = true
WHERE p.is_active = true
  AND ($1::UUID IS NULL OR p.category_id = $1)
  AND ($2::UUID IS NULL OR p.brand_id = $2)
  AND ($3::DECIMAL IS NULL OR p.price >= $3)
  AND ($4::DECIMAL IS NULL OR p.price <= $4)
GROUP BY p.id, pc.name, pc.slug, pb.name, pb.slug, pi.image_url
ORDER BY 
  CASE WHEN $5 = 'newest' THEN p.created_at END DESC,
  CASE WHEN $5 = 'oldest' THEN p.created_at END ASC,
  CASE WHEN $5 = 'price-low' THEN p.price END ASC,
  CASE WHEN $5 = 'price-high' THEN p.price END DESC,
  CASE WHEN $5 = 'name' THEN p.name END ASC
LIMIT $6 OFFSET $7;

-- 9. Get product by slug
SELECT p.*, pc.name as category_name, pc.slug as category_slug, 
       pb.name as brand_name, pb.slug as brand_slug,
       COUNT(pr.id) as review_count,
       COALESCE(AVG(pr.rating), 0) as average_rating
FROM products p
LEFT JOIN product_categories pc ON p.category_id = pc.id
LEFT JOIN product_brands pb ON p.brand_id = pb.id
LEFT JOIN product_reviews pr ON p.id = pr.product_id AND pr.is_approved = true
WHERE p.slug = $1 AND p.is_active = true
GROUP BY p.id, pc.name, pc.slug, pb.name, pb.slug;

-- 10. Get product images
SELECT id, image_url, alt_text, is_primary, sort_order
FROM product_images 
WHERE product_id = $1 
ORDER BY is_primary DESC, sort_order ASC, created_at ASC;

-- 11. Get product variants
SELECT id, name, sku, price, compare_price, stock_quantity, is_active
FROM product_variants 
WHERE product_id = $1 AND is_active = true
ORDER BY sort_order ASC, name ASC;

-- 12. Get product categories
SELECT id, name, slug, description, image_url, sort_order
FROM product_categories 
WHERE is_active = true 
ORDER BY sort_order ASC, name ASC;

-- 13. Get product brands
SELECT id, name, slug, description, logo_url, website_url
FROM product_brands 
WHERE is_active = true 
ORDER BY name ASC;

-- 14. Search products
SELECT p.*, pc.name as category_name, pb.name as brand_name,
       COALESCE(pi.image_url, '') as primary_image
FROM products p
LEFT JOIN product_categories pc ON p.category_id = pc.id
LEFT JOIN product_brands pb ON p.brand_id = pb.id
LEFT JOIN product_images pi ON p.id = pi.product_id AND pi.is_primary = true
WHERE p.is_active = true
  AND (
    p.name ILIKE $1 OR 
    p.description ILIKE $1 OR 
    p.sku ILIKE $1 OR
    pc.name ILIKE $1 OR
    pb.name ILIKE $1
  )
ORDER BY 
  CASE WHEN p.name ILIKE $1 THEN 1 ELSE 2 END,
  p.created_at DESC
LIMIT $2 OFFSET $3;

-- =====================================================
-- SERVICE QUERIES
-- =====================================================

-- 15. Get services with filters
SELECT s.*, sc.name as category_name, sc.slug as category_slug,
       COUNT(sr.id) as review_count,
       COALESCE(AVG(sr.rating), 0) as average_rating
FROM services s
LEFT JOIN service_categories sc ON s.category_id = sc.id
LEFT JOIN service_reviews sr ON s.id = sr.service_id AND sr.is_approved = true
WHERE s.is_active = true
  AND ($1::UUID IS NULL OR s.category_id = $1)
  AND ($2::VARCHAR IS NULL OR s.level ILIKE '%' || $2 || '%')
  AND ($3::DECIMAL IS NULL OR s.price >= $3)
  AND ($4::DECIMAL IS NULL OR s.price <= $4)
GROUP BY s.id, sc.name, sc.slug
ORDER BY s.created_at DESC;

-- 16. Get service by ID
SELECT s.*, sc.name as category_name, sc.slug as category_slug,
       COUNT(sr.id) as review_count,
       COALESCE(AVG(sr.rating), 0) as average_rating
FROM services s
LEFT JOIN service_categories sc ON s.category_id = sc.id
LEFT JOIN service_reviews sr ON s.id = sr.service_id AND sr.is_approved = true
WHERE s.id = $1 AND s.is_active = true
GROUP BY s.id, sc.name, sc.slug;

-- 17. Get service includes
SELECT id, item_name, description, sort_order
FROM service_includes 
WHERE service_id = $1 
ORDER BY sort_order ASC, item_name ASC;

-- 18. Get service schedules
SELECT id, date, start_time, end_time, available_spots, total_spots, status
FROM service_schedules 
WHERE service_id = $1 AND is_active = true AND date >= CURRENT_DATE
ORDER BY date ASC, start_time ASC;

-- 19. Get service categories
SELECT id, name, slug, description, image_url, sort_order
FROM service_categories 
WHERE is_active = true 
ORDER BY sort_order ASC, name ASC;

-- =====================================================
-- CART QUERIES
-- =====================================================

-- 20. Get user cart items
SELECT ci.id, ci.quantity, ci.created_at,
       p.id as product_id, p.name, p.slug, p.price, p.stock_quantity,
       COALESCE(pi.image_url, '') as image_url,
       pv.id as variant_id, pv.name as variant_name, pv.price as variant_price
FROM cart_items ci
JOIN products p ON ci.product_id = p.id
LEFT JOIN product_images pi ON p.id = pi.product_id AND pi.is_primary = true
LEFT JOIN product_variants pv ON ci.product_variant_id = pv.id
WHERE ci.user_id = $1 AND p.is_active = true
ORDER BY ci.created_at DESC;

-- 21. Get guest cart items
SELECT ci.id, ci.quantity, ci.created_at,
       p.id as product_id, p.name, p.slug, p.price, p.stock_quantity,
       COALESCE(pi.image_url, '') as image_url,
       pv.id as variant_id, pv.name as variant_name, pv.price as variant_price
FROM cart_items ci
JOIN products p ON ci.product_id = p.id
LEFT JOIN product_images pi ON p.id = pi.product_id AND pi.is_primary = true
LEFT JOIN product_variants pv ON ci.product_variant_id = pv.id
WHERE ci.session_id = $1 AND p.is_active = true
ORDER BY ci.created_at DESC;

-- 22. Add item to cart
INSERT INTO cart_items (user_id, session_id, product_id, product_variant_id, quantity)
VALUES ($1, $2, $3, $4, $5)
ON CONFLICT (user_id, product_id, product_variant_id) 
DO UPDATE SET quantity = cart_items.quantity + EXCLUDED.quantity
RETURNING id;

-- 23. Update cart item quantity
UPDATE cart_items 
SET quantity = $2, updated_at = CURRENT_TIMESTAMP
WHERE id = $1 AND (user_id = $3 OR session_id = $4);

-- 24. Remove item from cart
DELETE FROM cart_items 
WHERE id = $1 AND (user_id = $2 OR session_id = $3);

-- 25. Clear user cart
DELETE FROM cart_items WHERE user_id = $1;

-- 26. Clear guest cart
DELETE FROM cart_items WHERE session_id = $1;

-- =====================================================
-- WISHLIST QUERIES
-- =====================================================

-- 27. Get user wishlist
SELECT wi.id, wi.created_at,
       p.id as product_id, p.name, p.slug, p.price, p.stock_quantity,
       COALESCE(pi.image_url, '') as image_url
FROM wishlist_items wi
JOIN products p ON wi.product_id = p.id
LEFT JOIN product_images pi ON p.id = pi.product_id AND pi.is_primary = true
WHERE wi.user_id = $1 AND p.is_active = true
ORDER BY wi.created_at DESC;

-- 28. Add item to wishlist
INSERT INTO wishlist_items (user_id, product_id)
VALUES ($1, $2)
ON CONFLICT (user_id, product_id) DO NOTHING
RETURNING id;

-- 29. Remove item from wishlist
DELETE FROM wishlist_items 
WHERE user_id = $1 AND product_id = $2;

-- 30. Check if item is in wishlist
SELECT EXISTS(
    SELECT 1 FROM wishlist_items 
    WHERE user_id = $1 AND product_id = $2
) as is_in_wishlist;

-- =====================================================
-- ORDER QUERIES
-- =====================================================

-- 31. Create new order
INSERT INTO orders (order_number, user_id, status_id, subtotal, tax_amount, 
                   shipping_amount, discount_amount, total_amount, currency,
                   shipping_address_id, billing_address_id, notes, customer_email, 
                   customer_phone, payment_method)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
RETURNING id, order_number;

-- 32. Add order item (product)
INSERT INTO order_items (order_id, product_id, product_variant_id, product_name, 
                        product_sku, quantity, unit_price, total_price)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
RETURNING id;

-- 33. Add order item (service)
INSERT INTO order_service_items (order_id, service_id, service_schedule_id, 
                                service_name, quantity, unit_price, total_price,
                                scheduled_date, scheduled_time)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
RETURNING id;

-- 34. Get user orders
SELECT o.*, os.name as status_name, os.color as status_color
FROM orders o
JOIN order_statuses os ON o.status_id = os.id
WHERE o.user_id = $1
ORDER BY o.created_at DESC
LIMIT $2 OFFSET $3;

-- 35. Get order details
SELECT o.*, os.name as status_name, os.color as status_color,
       u.email as customer_email, u.first_name, u.last_name
FROM orders o
JOIN order_statuses os ON o.status_id = os.id
LEFT JOIN users u ON o.user_id = u.id
WHERE o.id = $1;

-- 36. Get order items (products)
SELECT oi.*, p.slug as product_slug,
       COALESCE(pi.image_url, '') as product_image
FROM order_items oi
LEFT JOIN products p ON oi.product_id = p.id
LEFT JOIN product_images pi ON p.id = pi.product_id AND pi.is_primary = true
WHERE oi.order_id = $1
ORDER BY oi.created_at ASC;

-- 37. Get order items (services)
SELECT osi.*, s.slug as service_slug
FROM order_service_items osi
LEFT JOIN services s ON osi.service_id = s.id
WHERE osi.order_id = $1
ORDER BY osi.created_at ASC;

-- 38. Update order status
UPDATE orders 
SET status_id = $2, updated_at = CURRENT_TIMESTAMP
WHERE id = $1;

-- 39. Add order history
INSERT INTO order_history (order_id, status_id, notes, created_by)
VALUES ($1, $2, $3, $4);

-- =====================================================
-- REVIEW QUERIES
-- =====================================================

-- 40. Get product reviews
SELECT pr.*, u.first_name, u.last_name, u.email
FROM product_reviews pr
JOIN users u ON pr.user_id = u.id
WHERE pr.product_id = $1 AND pr.is_approved = true
ORDER BY pr.created_at DESC
LIMIT $2 OFFSET $3;

-- 41. Add product review
INSERT INTO product_reviews (product_id, user_id, order_id, rating, title, comment, is_verified_purchase)
VALUES ($1, $2, $3, $4, $5, $6, $7)
RETURNING id;

-- 42. Get service reviews
SELECT sr.*, u.first_name, u.last_name, u.email
FROM service_reviews sr
JOIN users u ON sr.user_id = u.id
WHERE sr.service_id = $1 AND sr.is_approved = true
ORDER BY sr.created_at DESC
LIMIT $2 OFFSET $3;

-- 43. Add service review
INSERT INTO service_reviews (service_id, user_id, order_id, rating, title, comment, is_verified_attendance)
VALUES ($1, $2, $3, $4, $5, $6, $7)
RETURNING id;

-- =====================================================
-- ANALYTICS QUERIES
-- =====================================================

-- 44. Get total sales by date range
SELECT DATE(created_at) as date, 
       COUNT(*) as order_count,
       SUM(total_amount) as total_sales
FROM orders 
WHERE created_at BETWEEN $1 AND $2
  AND payment_status = 'paid'
GROUP BY DATE(created_at)
ORDER BY date DESC;

-- 45. Get top selling products
SELECT p.name, p.slug, COUNT(oi.id) as times_ordered, SUM(oi.quantity) as total_quantity
FROM order_items oi
JOIN products p ON oi.product_id = p.id
JOIN orders o ON oi.order_id = o.id
WHERE o.created_at BETWEEN $1 AND $2
  AND o.payment_status = 'paid'
GROUP BY p.id, p.name, p.slug
ORDER BY total_quantity DESC
LIMIT $3;

-- 46. Get user order statistics
SELECT COUNT(*) as total_orders,
       SUM(total_amount) as total_spent,
       AVG(total_amount) as average_order_value,
       MAX(created_at) as last_order_date
FROM orders 
WHERE user_id = $1 AND payment_status = 'paid';

-- 47. Get low stock products
SELECT id, name, slug, stock_quantity, low_stock_threshold
FROM products 
WHERE stock_quantity <= low_stock_threshold 
  AND is_active = true
ORDER BY stock_quantity ASC;

-- =====================================================
-- SEARCH AND FILTER QUERIES
-- =====================================================

-- 48. Search products with full-text search
SELECT p.*, pc.name as category_name, pb.name as brand_name,
       COALESCE(pi.image_url, '') as primary_image,
       ts_rank(to_tsvector('spanish', p.name || ' ' || COALESCE(p.description, '')), plainto_tsquery('spanish', $1)) as rank
FROM products p
LEFT JOIN product_categories pc ON p.category_id = pc.id
LEFT JOIN product_brands pb ON p.brand_id = pb.id
LEFT JOIN product_images pi ON p.id = pi.product_id AND pi.is_primary = true
WHERE p.is_active = true
  AND to_tsvector('spanish', p.name || ' ' || COALESCE(p.description, '')) @@ plainto_tsquery('spanish', $1)
ORDER BY rank DESC, p.created_at DESC
LIMIT $2 OFFSET $3;

-- 49. Get products by tags
SELECT p.*, pc.name as category_name, pb.name as brand_name,
       COALESCE(pi.image_url, '') as primary_image
FROM products p
JOIN product_tag_relationships ptr ON p.id = ptr.product_id
JOIN product_tags pt ON ptr.tag_id = pt.id
LEFT JOIN product_categories pc ON p.category_id = pc.id
LEFT JOIN product_brands pb ON p.brand_id = pb.id
LEFT JOIN product_images pi ON p.id = pi.product_id AND pi.is_primary = true
WHERE p.is_active = true AND pt.slug = ANY($1)
ORDER BY p.created_at DESC
LIMIT $2 OFFSET $3;

-- 50. Get price range for products
SELECT MIN(price) as min_price, MAX(price) as max_price
FROM products 
WHERE is_active = true
  AND ($1::UUID IS NULL OR category_id = $1)
  AND ($2::UUID IS NULL OR brand_id = $2); 