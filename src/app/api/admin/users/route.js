import { NextResponse } from 'next/server';
import { authenticateAdmin } from '../../../../lib/auth';
import { db } from '../../../../lib/firebaseAdmin';
import { updateUser } from '../../../../lib/firebaseUsers';

function paginate(items, page, limit) {
  const safePage = Math.max(1, Number(page) || 1);
  const safeLimit = Math.max(1, Number(limit) || 20);
  const total = items.length;
  const totalPages = Math.ceil(total / safeLimit);
  const start = (safePage - 1) * safeLimit;
  const data = items.slice(start, start + safeLimit);

  return {
    data,
    pagination: {
      total,
      totalPages,
      currentPage: safePage,
      hasNextPage: totalPages > 0 && safePage < totalPages,
      hasPrevPage: safePage > 1
    }
  };
}

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

    const allowedSortFields = ['created_at', 'last_login_at', 'email', 'first_name', 'last_name'];
    const validSortBy = allowedSortFields.includes(sortBy) ? sortBy : 'created_at';
    const validSortOrder = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    const snapshot = await db.collection('users').get();
    let users = snapshot.docs.map((doc) => {
      const { password_hash, ...safeUser } = doc.data();
      return {
        id: doc.id,
        ...safeUser
      };
    });

    if (search) {
      const normalized = search.toLowerCase();
      users = users.filter((u) => {
        const haystack = `${u.email || ''} ${u.first_name || ''} ${u.last_name || ''}`.toLowerCase();
        return haystack.includes(normalized);
      });
    }

    if (status === 'active') users = users.filter((u) => u.is_active === true);
    if (status === 'inactive') users = users.filter((u) => u.is_active === false);
    if (status === 'verified') users = users.filter((u) => u.is_verified === true);
    if (status === 'unverified') users = users.filter((u) => u.is_verified !== true);

    users.sort((a, b) => {
      const left = String(a[validSortBy] || '');
      const right = String(b[validSortBy] || '');
      const cmp = left.localeCompare(right);
      return validSortOrder === 'ASC' ? cmp : -cmp;
    });

    const { data, pagination } = paginate(users, page, limit);
    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
    const stats = {
      total_users: users.length,
      active_users: users.filter((u) => u.is_active === true).length,
      verified_users: users.filter((u) => u.is_verified === true).length,
      recent_users: users.filter((u) => {
        const lastLogin = u.last_login_at ? new Date(u.last_login_at).getTime() : 0;
        return lastLogin >= thirtyDaysAgo;
      }).length
    };

    return NextResponse.json({
      users: data,
      pagination,
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

    const existingDoc = await db.collection('users').doc(String(userId)).get();
    if (!existingDoc.exists) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const existing = existingDoc.data();
    const updatedUser = await updateUser(String(userId), {
      is_active: is_active !== undefined ? Boolean(is_active) : existing.is_active,
      is_verified: is_verified !== undefined ? Boolean(is_verified) : existing.is_verified
    });

    if (!updatedUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        first_name: updatedUser.first_name,
        last_name: updatedUser.last_name,
        is_active: updatedUser.is_active,
        is_verified: updatedUser.is_verified
      },
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
