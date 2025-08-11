import { NextResponse } from 'next/server';
import { getRows, getRow, query } from '../../../../lib/database';
import { authenticateAdmin } from '../../../../lib/auth';

// GET /api/admin/users - Get users with admin features (admin only)
export async function GET(request) {
  try {
    // Authenticate admin
    const authResult = await authenticateAdmin(request);
    if (!authResult.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page')) || 1;
    const limit = parseInt(searchParams.get('limit')) || 20;
    const offset = (page - 1) * limit;
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || '';
    const sortBy = searchParams.get('sortBy') || 'created_at';
    const sortOrder = searchParams.get('sortOrder') || 'DESC';

    // Build WHERE clause for filters
    let whereClause = '';
    let params = [];
    let paramIndex = 1;

    if (search) {
      whereClause += `WHERE (email ILIKE $${paramIndex} OR first_name ILIKE $${paramIndex} OR last_name ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    if (status) {
      const operator = whereClause ? 'AND' : 'WHERE';
      if (status === 'active') {
        whereClause += `${operator} is_active = true`;
      } else if (status === 'inactive') {
        whereClause += `${operator} is_active = false`;
      } else if (status === 'verified') {
        whereClause += `${operator} is_verified = true`;
      } else if (status === 'unverified') {
        whereClause += `${operator} is_verified = false`;
      }
    }

    // Validate sortBy to prevent SQL injection
    const allowedSortFields = ['created_at', 'last_login_at', 'email', 'first_name', 'last_name'];
    const validSortBy = allowedSortFields.includes(sortBy) ? sortBy : 'created_at';
    const validSortOrder = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    const usersQuery = `
      SELECT 
        id, 
        email, 
        first_name, 
        last_name, 
        phone, 
        date_of_birth,
        gender,
        is_active, 
        is_verified, 
        email_verified_at,
        phone_verified_at,
        created_at, 
        updated_at,
        last_login_at
      FROM users 
      ${whereClause}
      ORDER BY ${validSortBy} ${validSortOrder}
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    params.push(limit, offset);
    const users = await getRows(usersQuery, params);

    // Get total count with same filters
    const countQuery = `
      SELECT COUNT(*) as total 
      FROM users 
      ${whereClause}
    `;
    const countParams = params.slice(0, -2); // Remove limit and offset
    const totalResult = await getRow(countQuery, countParams);
    const total = parseInt(totalResult.total);

    // Get summary statistics
    const statsQuery = `
      SELECT 
        COUNT(*) as total_users,
        COUNT(CASE WHEN is_active = true THEN 1 END) as active_users,
        COUNT(CASE WHEN is_verified = true THEN 1 END) as verified_users,
        COUNT(CASE WHEN last_login_at >= NOW() - INTERVAL '30 days' THEN 1 END) as recent_users
      FROM users
    `;
    const stats = await getRow(statsQuery);

    return NextResponse.json({
      users,
      pagination: {
        total,
        totalPages: Math.ceil(total / limit),
        currentPage: page,
        hasNextPage: page < Math.ceil(total / limit),
        hasPrevPage: page > 1
      },
      stats
    });

  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json(
      { error: 'Failed to fetch users' },
      { status: 500 }
    );
  }
}

// PUT /api/admin/users - Update user status (admin only)
export async function PUT(request) {
  try {
    // Authenticate admin
    const authResult = await authenticateAdmin(request);
    if (!authResult) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { userId, is_active, is_verified } = body;

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    // Update user status
    const updateQuery = `
      UPDATE users 
      SET 
        is_active = COALESCE($2, is_active),
        is_verified = COALESCE($3, is_verified),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING id, email, first_name, last_name, is_active, is_verified
    `;

    const updatedUser = await getRow(updateQuery, [userId, is_active, is_verified]);

    if (!updatedUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      user: updatedUser,
      message: 'User updated successfully'
    });

  } catch (error) {
    console.error('Error updating user:', error);
    return NextResponse.json(
      { error: 'Failed to update user' },
      { status: 500 }
    );
  }
}
