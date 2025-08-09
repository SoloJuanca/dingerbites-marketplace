# API Documentation - Patito Montenegro E-commerce

This document provides comprehensive documentation for all API endpoints in the Patito Montenegro e-commerce application.

## 🔐 Authentication

Most API endpoints require authentication using JWT tokens. Include the token in the Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

## 📋 Table of Contents

1. [Authentication](#authentication)
2. [Users](#users)
3. [Products](#products)
4. [Categories](#categories)
5. [Brands](#brands)
6. [Services](#services)
7. [Orders](#orders)
8. [Cart](#cart)
9. [Wishlist](#wishlist)
10. [Reviews](#reviews)

## 👥 Users

### Register User
```http
POST /api/users
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123",
  "first_name": "John",
  "last_name": "Doe",
  "phone": "+1234567890",
  "date_of_birth": "1990-01-01",
  "gender": "male"
}
```

**Response:**
```json
{
  "id": "uuid",
  "email": "user@example.com",
  "first_name": "John",
  "last_name": "Doe",
  "created_at": "2024-01-01T00:00:00Z"
}
```

### Get Users (Admin)
```http
GET /api/users?page=1&limit=10
```

### Get User by ID
```http
GET /api/users/{id}
```

### Update User
```http
PUT /api/users/{id}
Content-Type: application/json

{
  "first_name": "Jane",
  "last_name": "Smith",
  "phone": "+1234567890"
}
```

### Delete User
```http
DELETE /api/users/{id}
```

## 🔐 Authentication

### Login
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "first_name": "John",
    "last_name": "Doe",
    "is_active": true,
    "is_verified": false
  },
  "token": "jwt-token",
  "message": "Login successful"
}
```

## 🛍️ Products

### Get Products
```http
GET /api/products?category=electronics&brand=apple&minPrice=100&maxPrice=1000&sortBy=newest&page=1&limit=8
```

**Query Parameters:**
- `category`: Filter by category slug
- `brand`: Filter by brand slug
- `minPrice`: Minimum price filter
- `maxPrice`: Maximum price filter
- `sortBy`: Sort order (newest, oldest, price-low, price-high, name)
- `page`: Page number for pagination
- `limit`: Items per page

**Response:**
```json
{
  "products": [
    {
      "id": "uuid",
      "name": "iPhone 15",
      "slug": "iphone-15",
      "description": "Latest iPhone model",
      "price": 999.99,
      "category_name": "Electronics",
      "brand_name": "Apple",
      "primary_image": "https://example.com/image.jpg",
      "review_count": 25,
      "average_rating": 4.5
    }
  ],
  "pagination": {
    "total": 100,
    "totalPages": 13,
    "currentPage": 1,
    "hasNextPage": true,
    "hasPrevPage": false
  }
}
```

### Create Product (Admin)
```http
POST /api/products
Content-Type: application/json

{
  "name": "iPhone 15",
  "description": "Latest iPhone model with advanced features",
  "price": 999.99,
  "category_id": "uuid",
  "brand_id": "uuid"
}
```

## 🏷️ Categories

### Get Categories
```http
GET /api/categories?page=1&limit=20
```

### Create Category (Admin)
```http
POST /api/categories
Content-Type: application/json

{
  "name": "Electronics",
  "description": "Electronic devices and gadgets",
  "image_url": "https://example.com/category.jpg",
  "sort_order": 1
}
```

## 🏢 Brands

### Get Brands
```http
GET /api/brands?page=1&limit=20
```

### Create Brand (Admin)
```http
POST /api/brands
Content-Type: application/json

{
  "name": "Apple",
  "description": "Technology company",
  "logo_url": "https://example.com/logo.png",
  "website_url": "https://apple.com"
}
```

## 🎓 Services

### Get Services
```http
GET /api/services?category=cooking&level=beginner&minPrice=50&maxPrice=200&page=1&limit=8
```

**Query Parameters:**
- `category`: Filter by category slug
- `level`: Filter by level (beginner, intermediate, advanced)
- `minPrice`: Minimum price filter
- `maxPrice`: Maximum price filter
- `page`: Page number for pagination
- `limit`: Items per page

### Create Service (Admin)
```http
POST /api/services
Content-Type: application/json

{
  "name": "Cooking Basics",
  "description": "Learn the fundamentals of cooking",
  "short_description": "Basic cooking techniques",
  "image_url": "https://example.com/service.jpg",
  "category_id": "uuid",
  "duration": "2 hours",
  "price": 99.99,
  "level": "beginner",
  "max_participants": 12
}
```

## 📦 Orders

### Get Orders
```http
GET /api/orders?userId=uuid&status=pending&page=1&limit=10
```

**Query Parameters:**
- `userId`: Filter by user ID
- `status`: Filter by order status
- `page`: Page number for pagination
- `limit`: Items per page

### Create Order
```http
POST /api/orders
Content-Type: application/json

{
  "user_id": "uuid",
  "items": [
    {
      "product_id": "uuid",
      "quantity": 2,
      "variant_id": "uuid"
    }
  ],
  "service_items": [
    {
      "service_id": "uuid",
      "schedule_id": "uuid",
      "quantity": 1
    }
  ],
  "customer_email": "customer@example.com",
  "customer_phone": "+1234567890",
  "shipping_address_id": "uuid",
  "billing_address_id": "uuid",
  "payment_method": "credit_card",
  "shipping_method": "standard",
  "subtotal": 199.98,
  "tax_amount": 19.99,
  "shipping_amount": 10.00,
  "discount_amount": 0,
  "total_amount": 229.97,
  "notes": "Please deliver after 6 PM"
}
```

### Get Order Details
```http
GET /api/orders/{id}
```

### Update Order Status
```http
PUT /api/orders/{id}
Content-Type: application/json

{
  "status_id": "uuid",
  "notes": "Order shipped"
}
```

### Cancel Order
```http
DELETE /api/orders/{id}
```

## 🛒 Cart

### Get Cart Items
```http
GET /api/cart?userId=uuid
```

**Query Parameters:**
- `userId`: User ID (required if no sessionId)
- `sessionId`: Session ID (required if no userId)

### Add Item to Cart
```http
POST /api/cart
Content-Type: application/json

{
  "userId": "uuid",
  "productId": "uuid",
  "variantId": "uuid",
  "quantity": 1
}
```

### Update Cart Item
```http
PUT /api/cart
Content-Type: application/json

{
  "cartItemId": "uuid",
  "quantity": 2,
  "userId": "uuid"
}
```

### Remove Item from Cart
```http
DELETE /api/cart?cartItemId=uuid&userId=uuid
```

## ❤️ Wishlist

### Get Wishlist
```http
GET /api/wishlist?userId=uuid
```

### Add Item to Wishlist
```http
POST /api/wishlist
Content-Type: application/json

{
  "userId": "uuid",
  "productId": "uuid"
}
```

### Remove Item from Wishlist
```http
DELETE /api/wishlist?userId=uuid&productId=uuid
```

## ⭐ Reviews

### Get Reviews
```http
GET /api/reviews?productId=uuid&rating=5&page=1&limit=10
```

**Query Parameters:**
- `productId`: Filter by product ID
- `serviceId`: Filter by service ID
- `userId`: Filter by user ID
- `rating`: Filter by rating (1-5)
- `page`: Page number for pagination
- `limit`: Items per page

### Create Review
```http
POST /api/reviews
Content-Type: application/json

{
  "userId": "uuid",
  "productId": "uuid",
  "rating": 5,
  "title": "Great product!",
  "comment": "This product exceeded my expectations."
}
```

## 🔧 Error Responses

All API endpoints return consistent error responses:

```json
{
  "error": "Error message description"
}
```

**Common HTTP Status Codes:**
- `200`: Success
- `201`: Created
- `400`: Bad Request
- `401`: Unauthorized
- `404`: Not Found
- `409`: Conflict
- `500`: Internal Server Error

## 📝 Pagination

Most endpoints that return lists support pagination with the following response format:

```json
{
  "data": [...],
  "pagination": {
    "total": 100,
    "totalPages": 10,
    "currentPage": 1,
    "hasNextPage": true,
    "hasPrevPage": false
  }
}
```

## 🔒 Security

- All sensitive endpoints require JWT authentication
- Passwords are hashed using bcrypt
- JWT tokens expire after 7 days
- Input validation is performed on all endpoints
- SQL injection is prevented using parameterized queries

## 🚀 Rate Limiting

To be implemented:
- Rate limiting for authentication endpoints
- Request throttling for API endpoints
- IP-based rate limiting

## 📞 Support

For API support and questions, please contact:
- Email: support@patitomontenegro.com
- Documentation: https://docs.patitomontenegro.com/api 