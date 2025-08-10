-- =====================================================
-- ADMIN SYSTEM SETUP
-- =====================================================
-- This script adds admin functionality to the existing database schema

-- Add user roles enum and role column to users table
DO $$ 
BEGIN
    -- Create enum type for user roles if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
        CREATE TYPE user_role AS ENUM ('user', 'admin', 'superadmin');
    END IF;
END $$;

-- Add role column to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS role user_role DEFAULT 'user';

-- Add index for role-based queries
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- =====================================================
-- ADMIN SPECIFIC TABLES
-- =====================================================

-- Admin activity log
CREATE TABLE IF NOT EXISTS admin_activity_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    admin_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    action VARCHAR(100) NOT NULL, -- 'create', 'update', 'delete', 'view'
    entity_type VARCHAR(50) NOT NULL, -- 'product', 'order', 'user', etc.
    entity_id UUID,
    entity_name VARCHAR(255),
    old_values JSONB,
    new_values JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Product stock alerts
CREATE TABLE IF NOT EXISTS stock_alerts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    alert_type VARCHAR(50) NOT NULL DEFAULT 'low_stock',
    threshold_value INTEGER,
    current_stock INTEGER,
    is_resolved BOOLEAN DEFAULT false,
    resolved_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- System settings for admin configuration
CREATE TABLE IF NOT EXISTS admin_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    setting_key VARCHAR(100) NOT NULL UNIQUE,
    setting_value TEXT NOT NULL,
    setting_type VARCHAR(20) DEFAULT 'string', -- 'string', 'number', 'boolean', 'json'
    description TEXT,
    is_public BOOLEAN DEFAULT false, -- If true, can be accessed by non-admin users
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- INDEXES FOR ADMIN TABLES
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_admin_activity_log_admin_user_id ON admin_activity_log(admin_user_id);
CREATE INDEX IF NOT EXISTS idx_admin_activity_log_entity_type ON admin_activity_log(entity_type);
CREATE INDEX IF NOT EXISTS idx_admin_activity_log_created_at ON admin_activity_log(created_at);

CREATE INDEX IF NOT EXISTS idx_stock_alerts_product_id ON stock_alerts(product_id);
CREATE INDEX IF NOT EXISTS idx_stock_alerts_is_resolved ON stock_alerts(is_resolved);
CREATE INDEX IF NOT EXISTS idx_stock_alerts_created_at ON stock_alerts(created_at);

CREATE INDEX IF NOT EXISTS idx_admin_settings_key ON admin_settings(setting_key);
CREATE INDEX IF NOT EXISTS idx_admin_settings_public ON admin_settings(is_public);

-- =====================================================
-- TRIGGERS FOR ADMIN TABLES
-- =====================================================

-- Update trigger for stock_alerts
CREATE TRIGGER IF NOT EXISTS update_stock_alerts_updated_at 
BEFORE UPDATE ON stock_alerts 
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Update trigger for admin_settings
CREATE TRIGGER IF NOT EXISTS update_admin_settings_updated_at 
BEFORE UPDATE ON admin_settings 
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- ADMIN FUNCTIONS
-- =====================================================

-- Function to automatically create stock alerts
CREATE OR REPLACE FUNCTION check_and_create_stock_alerts()
RETURNS VOID AS $$
BEGIN
    INSERT INTO stock_alerts (product_id, alert_type, threshold_value, current_stock)
    SELECT 
        p.id,
        'low_stock',
        p.low_stock_threshold,
        p.stock_quantity
    FROM products p
    WHERE p.stock_quantity <= p.low_stock_threshold 
    AND p.stock_quantity > 0
    AND p.is_active = true
    AND NOT EXISTS (
        SELECT 1 FROM stock_alerts sa 
        WHERE sa.product_id = p.id 
        AND sa.alert_type = 'low_stock' 
        AND sa.is_resolved = false
    );

    INSERT INTO stock_alerts (product_id, alert_type, threshold_value, current_stock)
    SELECT 
        p.id,
        'out_of_stock',
        0,
        p.stock_quantity
    FROM products p
    WHERE p.stock_quantity = 0
    AND p.is_active = true
    AND NOT EXISTS (
        SELECT 1 FROM stock_alerts sa 
        WHERE sa.product_id = p.id 
        AND sa.alert_type = 'out_of_stock' 
        AND sa.is_resolved = false
    );
    
    UPDATE stock_alerts 
    SET is_resolved = true, resolved_at = CURRENT_TIMESTAMP
    WHERE is_resolved = false 
    AND product_id IN (
        SELECT p.id FROM products p 
        WHERE p.stock_quantity > p.low_stock_threshold
    );
END;
$$ LANGUAGE plpgsql;

-- Function to log admin activities
CREATE OR REPLACE FUNCTION log_admin_activity(
    p_admin_user_id UUID,
    p_action VARCHAR(100),
    p_entity_type VARCHAR(50),
    p_entity_id UUID DEFAULT NULL,
    p_entity_name VARCHAR(255) DEFAULT NULL,
    p_old_values JSONB DEFAULT NULL,
    p_new_values JSONB DEFAULT NULL,
    p_ip_address INET DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    activity_id UUID;
BEGIN
    INSERT INTO admin_activity_log (
        admin_user_id, action, entity_type, entity_id, entity_name,
        old_values, new_values, ip_address, user_agent
    ) VALUES (
        p_admin_user_id, p_action, p_entity_type, p_entity_id, p_entity_name,
        p_old_values, p_new_values, p_ip_address, p_user_agent
    ) RETURNING id INTO activity_id;
    
    RETURN activity_id;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- ADMIN VIEWS FOR DASHBOARDS
-- =====================================================

-- View for dashboard statistics
CREATE OR REPLACE VIEW admin_dashboard_stats AS
SELECT 
    (SELECT COUNT(*) FROM orders WHERE created_at >= CURRENT_DATE) as orders_today,
    (SELECT COUNT(*) FROM orders WHERE created_at >= CURRENT_DATE - INTERVAL '7 days') as orders_week,
    (SELECT COUNT(*) FROM orders WHERE created_at >= CURRENT_DATE - INTERVAL '30 days') as orders_month,
    (SELECT COALESCE(SUM(total_amount), 0) FROM orders WHERE created_at >= CURRENT_DATE) as revenue_today,
    (SELECT COALESCE(SUM(total_amount), 0) FROM orders WHERE created_at >= CURRENT_DATE - INTERVAL '7 days') as revenue_week,
    (SELECT COALESCE(SUM(total_amount), 0) FROM orders WHERE created_at >= CURRENT_DATE - INTERVAL '30 days') as revenue_month,
    (SELECT COUNT(*) FROM users WHERE created_at >= CURRENT_DATE) as new_users_today,
    (SELECT COUNT(*) FROM users WHERE created_at >= CURRENT_DATE - INTERVAL '7 days') as new_users_week,
    (SELECT COUNT(*) FROM users WHERE created_at >= CURRENT_DATE - INTERVAL '30 days') as new_users_month,
    (SELECT COUNT(*) FROM products WHERE stock_quantity <= low_stock_threshold AND stock_quantity > 0) as low_stock_products,
    (SELECT COUNT(*) FROM products WHERE stock_quantity = 0) as out_of_stock_products;

-- View for top selling products
CREATE OR REPLACE VIEW admin_top_products AS
SELECT 
    p.id,
    p.name,
    p.slug,
    p.price,
    p.stock_quantity,
    COALESCE(pi.image_url, '') as image_url,
    pc.name as category_name,
    pb.name as brand_name,
    COALESCE(SUM(oi.quantity), 0) as total_sold,
    COALESCE(SUM(oi.total_price), 0) as total_revenue
FROM products p
LEFT JOIN product_images pi ON p.id = pi.product_id AND pi.is_primary = true
LEFT JOIN product_categories pc ON p.category_id = pc.id
LEFT JOIN product_brands pb ON p.brand_id = pb.id
LEFT JOIN order_items oi ON p.id = oi.product_id
LEFT JOIN orders o ON oi.order_id = o.id AND o.created_at >= CURRENT_DATE - INTERVAL '30 days'
WHERE p.is_active = true
GROUP BY p.id, p.name, p.slug, p.price, p.stock_quantity, pi.image_url, pc.name, pb.name
ORDER BY total_sold DESC, total_revenue DESC;

-- View for sales by location (using billing address city)
CREATE OR REPLACE VIEW admin_sales_by_location AS
SELECT 
    COALESCE(ua.city, 'Sin especificar') as city,
    COALESCE(ua.state, 'Sin especificar') as state,
    COUNT(o.id) as order_count,
    COALESCE(SUM(o.total_amount), 0) as total_revenue
FROM orders o
LEFT JOIN user_addresses ua ON o.billing_address_id = ua.id
WHERE o.created_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY ua.city, ua.state
ORDER BY total_revenue DESC, order_count DESC;

-- View for recent orders with details
CREATE OR REPLACE VIEW admin_recent_orders AS
SELECT 
    o.id,
    o.order_number,
    o.total_amount,
    o.created_at,
    os.name as status_name,
    os.color as status_color,
    COALESCE(u.first_name || ' ' || u.last_name, 'Guest') as customer_name,
    o.customer_email,
    o.customer_phone,
    COUNT(oi.id) + COUNT(osi.id) as item_count
FROM orders o
LEFT JOIN order_statuses os ON o.status_id = os.id
LEFT JOIN users u ON o.user_id = u.id
LEFT JOIN order_items oi ON o.id = oi.order_id
LEFT JOIN order_service_items osi ON o.id = osi.order_id
GROUP BY o.id, o.order_number, o.total_amount, o.created_at, os.name, os.color, u.first_name, u.last_name, o.customer_email, o.customer_phone
ORDER BY o.created_at DESC;

-- =====================================================
-- DEFAULT ADMIN SETTINGS
-- =====================================================

-- Insert default admin settings
INSERT INTO admin_settings (setting_key, setting_value, setting_type, description, is_public) VALUES
('site_name', 'Patito Montenegro E-commerce', 'string', 'Nombre del sitio web', true),
('site_description', 'Tu tienda online de productos de belleza y cursos profesionales', 'string', 'Descripción del sitio web', true),
('currency', 'MXN', 'string', 'Moneda por defecto', true),
('tax_rate', '16', 'number', 'Porcentaje de impuestos (IVA)', false),
('shipping_cost', '150', 'number', 'Costo de envío por defecto', true),
('free_shipping_threshold', '1000', 'number', 'Monto mínimo para envío gratis', true),
('low_stock_threshold', '5', 'number', 'Umbral por defecto para stock bajo', false),
('order_prefix', 'PM', 'string', 'Prefijo para números de orden', false),
('admin_email', 'admin@patitomontenegro.com', 'string', 'Email del administrador principal', false),
('whatsapp_number', '5212345678901', 'string', 'Número de WhatsApp para contacto', true),
('business_address', 'Ciudad de México, México', 'string', 'Dirección del negocio', true),
('business_hours', '{"monday":"9:00-18:00","tuesday":"9:00-18:00","wednesday":"9:00-18:00","thursday":"9:00-18:00","friday":"9:00-18:00","saturday":"10:00-16:00","sunday":"closed"}', 'json', 'Horarios de atención', true)
ON CONFLICT (setting_key) DO NOTHING;

-- =====================================================
-- CREATE DEFAULT ADMIN USER
-- =====================================================

-- Insert admin user (password will be hashed in the application)
-- Default password: 'admin123' (should be changed immediately)
INSERT INTO users (
    email, 
    password_hash, 
    first_name, 
    last_name, 
    role, 
    is_active, 
    is_verified, 
    email_verified_at
) VALUES (
    'admin@patitomontenegro.com',
    '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/lewiFMTcYzIg4VK.i', -- bcrypt hash of 'admin123'
    'Administrador',
    'Principal',
    'admin',
    true,
    true,
    CURRENT_TIMESTAMP
) ON CONFLICT (email) DO UPDATE SET 
    role = 'admin',
    is_active = true,
    is_verified = true;

-- Create trigger to automatically check stock alerts when product stock changes
CREATE OR REPLACE FUNCTION trigger_stock_alert_check()
RETURNS TRIGGER AS $$
BEGIN
    -- Only check if stock quantity changed
    IF OLD.stock_quantity IS DISTINCT FROM NEW.stock_quantity THEN
        PERFORM check_and_create_stock_alerts();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply the trigger
DROP TRIGGER IF EXISTS product_stock_alert_trigger ON products;
CREATE TRIGGER product_stock_alert_trigger
    AFTER UPDATE ON products
    FOR EACH ROW
    EXECUTE FUNCTION trigger_stock_alert_check();

-- =====================================================
-- SAMPLE DATA FOR TESTING
-- =====================================================

-- Add some sample brands
INSERT INTO product_brands (name, slug, description, is_active) VALUES
('OPI', 'opi', 'Marca líder en esmaltes profesionales', true),
('Essie', 'essie', 'Esmaltes de alta calidad y tendencia', true),
('Sally Hansen', 'sally-hansen', 'Productos innovadores para el cuidado de uñas', true),
('Orly', 'orly', 'Esmaltes profesionales de larga duración', true),
('CND', 'cnd', 'Productos profesionales para nail art', true)
ON CONFLICT (name) DO NOTHING;

-- Add some sample products with different stock levels for testing alerts
DO $$ 
DECLARE
    cat_esmaltes UUID;
    cat_herramientas UUID;
    brand_opi UUID;
    brand_essie UUID;
BEGIN
    -- Get category and brand IDs
    SELECT id INTO cat_esmaltes FROM product_categories WHERE slug = 'esmaltes';
    SELECT id INTO cat_herramientas FROM product_categories WHERE slug = 'herramientas';
    SELECT id INTO brand_opi FROM product_brands WHERE slug = 'opi';
    SELECT id INTO brand_essie FROM product_brands WHERE slug = 'essie';
    
    -- Insert sample products
    INSERT INTO products (name, slug, description, price, cost_price, sku, category_id, brand_id, stock_quantity, low_stock_threshold, is_active, is_featured) VALUES
    ('Esmalte OPI Red Hot Rio', 'opi-red-hot-rio', 'Esmalte rojo vibrante de larga duración', 299.00, 150.00, 'OPI-RHR-001', cat_esmaltes, brand_opi, 2, 5, true, true),
    ('Esmalte Essie Ballet Slippers', 'essie-ballet-slippers', 'Esmalte rosa clásico', 249.00, 125.00, 'ESS-BS-001', cat_esmaltes, brand_essie, 0, 5, true, false),
    ('Lima Profesional 180/240', 'lima-profesional-180-240', 'Lima de doble grano para acabado perfecto', 45.00, 20.00, 'LIMA-180-240', cat_herramientas, NULL, 15, 5, true, false),
    ('Base Coat Fortalecedora', 'base-coat-fortalecedora', 'Base protectora que fortalece las uñas', 199.00, 100.00, 'BASE-FORT-001', cat_esmaltes, NULL, 8, 10, true, true)
    ON CONFLICT (slug) DO NOTHING;
END $$;

COMMIT;

-- Final message
DO $$ 
BEGIN 
    RAISE NOTICE 'Admin setup completed successfully!';
    RAISE NOTICE 'Default admin user created: admin@patitomontenegro.com';
    RAISE NOTICE 'Default password: admin123 (CHANGE IMMEDIATELY!)';
    RAISE NOTICE 'Run check_and_create_stock_alerts() to generate initial stock alerts.';
END $$;
