-- Insertar categorías de ejemplo
INSERT INTO product_categories (name, slug, description, is_active, sort_order) VALUES
('Electrónicos', 'electronics', 'Dispositivos electrónicos y gadgets', true, 1),
('Ropa', 'clothing', 'Prendas de vestir y accesorios', true, 2),
('Hogar', 'home', 'Artículos para el hogar y decoración', true, 3),
('Deportes', 'sports', 'Equipos y artículos deportivos', true, 4),
('Libros', 'books', 'Libros físicos y digitales', true, 5)
ON CONFLICT (slug) DO NOTHING;

-- Insertar marcas de ejemplo
INSERT INTO product_brands (name, slug, description, is_active) VALUES
('Apple', 'apple', 'Productos Apple Inc.', true),
('Samsung', 'samsung', 'Productos Samsung Electronics', true),
('Nike', 'nike', 'Productos deportivos Nike', true),
('Adidas', 'adidas', 'Productos deportivos Adidas', true),
('Sony', 'sony', 'Productos Sony Corporation', true)
ON CONFLICT (slug) DO NOTHING;

-- Insertar un producto de ejemplo
INSERT INTO products (
  name, slug, description, short_description, price, sku, 
  category_id, stock_quantity, is_active, is_featured
) VALUES (
  'iPhone 15 Pro', 'iphone-15-pro', 
  'El iPhone 15 Pro con tecnología avanzada y cámara profesional.', 
  'iPhone 15 Pro con cámara profesional', 
  999.99, 'APL-IPH-PRO-001',
  (SELECT id FROM product_categories WHERE slug = 'electronics'),
  10, true, true
) ON CONFLICT (slug) DO NOTHING;
