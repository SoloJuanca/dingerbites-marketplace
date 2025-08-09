# PostgreSQL Database Setup for Patito Montenegro E-commerce

This document provides a comprehensive guide for setting up and using the PostgreSQL database for the Patito Montenegro e-commerce application.

## 📋 Table of Contents

1. [Prerequisites](#prerequisites)
2. [Database Installation](#database-installation)
3. [Database Setup](#database-setup)
4. [Environment Configuration](#environment-configuration)
5. [Database Schema](#database-schema)
6. [API Integration](#api-integration)
7. [Common Queries](#common-queries)
8. [Performance Optimization](#performance-optimization)
9. [Backup and Recovery](#backup-and-recovery)

## 🎯 Prerequisites

- PostgreSQL 12 or higher
- Node.js 18 or higher
- npm or yarn package manager

## 🗄️ Database Installation

### Option 1: Local Installation

1. **Install PostgreSQL on your system:**
   - **Windows:** Download from [postgresql.org](https://www.postgresql.org/download/windows/)
   - **macOS:** `brew install postgresql`
   - **Ubuntu/Debian:** `sudo apt-get install postgresql postgresql-contrib`

2. **Start PostgreSQL service:**
   ```bash
   # Windows
   net start postgresql-x64-15
   
   # macOS
   brew services start postgresql
   
   # Ubuntu/Debian
   sudo systemctl start postgresql
   ```

### Option 2: Docker Installation

1. **Create a Docker Compose file:**
   ```yaml
   # docker-compose.yml
   version: '3.8'
   services:
     postgres:
       image: postgres:15
       container_name: patito_montenegro_db
       environment:
         POSTGRES_DB: patito_montenegro
         POSTGRES_USER: postgres
         POSTGRES_PASSWORD: password
       ports:
         - "5432:5432"
       volumes:
         - postgres_data:/var/lib/postgresql/data
   
   volumes:
     postgres_data:
   ```

2. **Start the database:**
   ```bash
   docker-compose up -d
   ```

## 🏗️ Database Setup

1. **Create the database:**
   ```bash
   # Connect to PostgreSQL
   psql -U postgres
   
   # Create database
   CREATE DATABASE patito_montenegro;
   
   # Connect to the database
   \c patito_montenegro
   ```

2. **Run the schema script:**
   ```bash
   # From the project root
   psql -U postgres -d patito_montenegro -f database_schema.sql
   ```

3. **Verify the setup:**
   ```sql
   -- Check if tables were created
   \dt
   
   -- Check if initial data was inserted
   SELECT * FROM order_statuses;
   SELECT * FROM product_categories;
   ```

## 🔧 Environment Configuration

1. **Create a `.env.local` file in your project root:**
   ```env
   # Database Configuration
   DB_HOST=localhost
   DB_PORT=5432
   DB_NAME=patito_montenegro
   DB_USER=postgres
   DB_PASSWORD=password
   
   # Application Configuration
   NODE_ENV=development
   JWT_SECRET=your-super-secret-jwt-key
   SESSION_SECRET=your-session-secret
   ```

2. **Install required dependencies:**
   ```bash
   npm install pg
   # or
   yarn add pg
   ```

## 📊 Database Schema Overview

### Core Tables

| Table | Purpose | Key Features |
|-------|---------|--------------|
| `users` | User authentication and profiles | UUID primary keys, email verification |
| `products` | Product catalog | Categories, brands, variants, stock management |
| `services` | Service offerings | Schedules, capacity, pricing |
| `orders` | Customer orders | Status tracking, payment integration |
| `cart_items` | Shopping cart | User and session support |
| `wishlist_items` | User wishlists | Product favorites |

### Key Relationships

- **Users** → **Orders** (one-to-many)
- **Products** → **Categories** (many-to-one)
- **Products** → **Brands** (many-to-one)
- **Orders** → **Order Items** (one-to-many)
- **Users** → **Cart Items** (one-to-many)
- **Users** → **Wishlist Items** (one-to-many)

## 🔌 API Integration

### Database Connection

The application uses a connection pool for efficient database management:

```javascript
// src/lib/database.js
import { Pool } from 'pg';

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});
```

### Example API Routes

1. **Products API** (`/api/products`):
   - `GET` - Fetch products with filters and pagination
   - `POST` - Create new product (admin only)

2. **Cart API** (`/api/cart`):
   - `GET` - Get cart items
   - `POST` - Add item to cart
   - `PUT` - Update cart item quantity
   - `DELETE` - Remove item from cart

3. **Orders API** (`/api/orders`):
   - `GET` - Get user orders
   - `POST` - Create new order
   - `PUT` - Update order status

## 🔍 Common Queries

### Product Queries

```sql
-- Get products with filters and pagination
SELECT p.*, pc.name as category_name, pb.name as brand_name
FROM products p
LEFT JOIN product_categories pc ON p.category_id = pc.id
LEFT JOIN product_brands pb ON p.brand_id = pb.id
WHERE p.is_active = true
  AND pc.slug = $1
  AND p.price BETWEEN $2 AND $3
ORDER BY p.created_at DESC
LIMIT $4 OFFSET $5;

-- Search products
SELECT p.*, pc.name as category_name
FROM products p
LEFT JOIN product_categories pc ON p.category_id = pc.id
WHERE p.is_active = true
  AND (p.name ILIKE $1 OR p.description ILIKE $1)
ORDER BY p.created_at DESC;
```

### Cart Queries

```sql
-- Get user cart items
SELECT ci.*, p.name, p.price, pi.image_url
FROM cart_items ci
JOIN products p ON ci.product_id = p.id
LEFT JOIN product_images pi ON p.id = pi.product_id AND pi.is_primary = true
WHERE ci.user_id = $1
ORDER BY ci.created_at DESC;

-- Add item to cart
INSERT INTO cart_items (user_id, product_id, quantity)
VALUES ($1, $2, $3)
ON CONFLICT (user_id, product_id) 
DO UPDATE SET quantity = cart_items.quantity + EXCLUDED.quantity;
```

### Order Queries

```sql
-- Create new order
INSERT INTO orders (order_number, user_id, status_id, total_amount)
VALUES ($1, $2, $3, $4)
RETURNING id, order_number;

-- Get user orders
SELECT o.*, os.name as status_name
FROM orders o
JOIN order_statuses os ON o.status_id = os.id
WHERE o.user_id = $1
ORDER BY o.created_at DESC;
```

## ⚡ Performance Optimization

### Indexes

The schema includes strategic indexes for common queries:

```sql
-- Product indexes
CREATE INDEX idx_products_slug ON products(slug);
CREATE INDEX idx_products_category_id ON products(category_id);
CREATE INDEX idx_products_price ON products(price);

-- Order indexes
CREATE INDEX idx_orders_user_id ON orders(user_id);
CREATE INDEX idx_orders_status_id ON orders(status_id);
CREATE INDEX idx_orders_created_at ON orders(created_at);
```

### Query Optimization

1. **Use prepared statements** for frequently executed queries
2. **Implement pagination** for large result sets
3. **Use appropriate data types** (UUID for IDs, DECIMAL for prices)
4. **Optimize JOIN operations** with proper indexes

### Connection Pooling

The application uses connection pooling to manage database connections efficiently:

```javascript
const pool = new Pool({
  max: 20, // Maximum connections
  idleTimeoutMillis: 30000, // Close idle connections after 30s
  connectionTimeoutMillis: 2000, // Connection timeout
});
```

## 💾 Backup and Recovery

### Automated Backups

1. **Create a backup script:**
   ```bash
   #!/bin/bash
   # backup.sh
   DATE=$(date +%Y%m%d_%H%M%S)
   pg_dump -U postgres -d patito_montenegro > backup_$DATE.sql
   ```

2. **Schedule regular backups:**
   ```bash
   # Add to crontab (daily at 2 AM)
   0 2 * * * /path/to/backup.sh
   ```

### Recovery

```bash
# Restore from backup
psql -U postgres -d patito_montenegro < backup_20241201_020000.sql
```

## 🔒 Security Considerations

1. **Use environment variables** for sensitive configuration
2. **Implement proper authentication** and authorization
3. **Use prepared statements** to prevent SQL injection
4. **Encrypt sensitive data** (passwords, payment info)
5. **Regular security updates** for PostgreSQL

## 🚀 Production Deployment

### Environment Variables

```env
# Production Database
DB_HOST=your-production-host
DB_PORT=5432
DB_NAME=patito_montenegro_prod
DB_USER=app_user
DB_PASSWORD=secure-password
NODE_ENV=production
```

### SSL Configuration

```javascript
const pool = new Pool({
  // ... other config
  ssl: {
    rejectUnauthorized: false,
    ca: fs.readFileSync('/path/to/ca-certificate.crt').toString(),
  },
});
```

## 📈 Monitoring and Maintenance

### Performance Monitoring

1. **Enable query logging:**
   ```sql
   ALTER SYSTEM SET log_statement = 'all';
   ALTER SYSTEM SET log_min_duration_statement = 1000;
   SELECT pg_reload_conf();
   ```

2. **Monitor slow queries:**
   ```sql
   SELECT query, mean_time, calls
   FROM pg_stat_statements
   ORDER BY mean_time DESC
   LIMIT 10;
   ```

### Regular Maintenance

1. **Update statistics:**
   ```sql
   ANALYZE;
   ```

2. **Vacuum tables:**
   ```sql
   VACUUM ANALYZE;
   ```

3. **Check for bloat:**
   ```sql
   SELECT schemaname, tablename, n_dead_tup, n_live_tup
   FROM pg_stat_user_tables
   WHERE n_dead_tup > n_live_tup * 0.1;
   ```

## 🆘 Troubleshooting

### Common Issues

1. **Connection refused:**
   - Check if PostgreSQL is running
   - Verify port and host configuration
   - Check firewall settings

2. **Authentication failed:**
   - Verify username and password
   - Check pg_hba.conf configuration
   - Ensure user has proper permissions

3. **Performance issues:**
   - Check query execution plans
   - Verify indexes are being used
   - Monitor connection pool usage

### Useful Commands

```sql
-- Check database size
SELECT pg_size_pretty(pg_database_size('patito_montenegro'));

-- Check table sizes
SELECT 
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- Check active connections
SELECT count(*) FROM pg_stat_activity WHERE state = 'active';
```

## 📚 Additional Resources

- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Node.js pg Documentation](https://node-postgres.com/)
- [Next.js API Routes](https://nextjs.org/docs/api-routes/introduction)
- [Database Design Best Practices](https://www.postgresql.org/docs/current/ddl.html)

---

This setup provides a robust, scalable database foundation for the Patito Montenegro e-commerce application. The schema is designed to handle growth and includes all necessary features for a modern e-commerce platform. 