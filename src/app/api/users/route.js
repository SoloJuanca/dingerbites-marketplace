import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { createUser, getUserByEmail } from '../../../lib/firebaseUsers';
import { db } from '../../../lib/firebaseAdmin';

function paginate(items, page, limit) {
  const safePage = Math.max(1, Number(page) || 1);
  const safeLimit = Math.max(1, Number(limit) || 10);
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

// GET /api/users - Get users (admin only)
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page')) || 1;
    const limit = parseInt(searchParams.get('limit')) || 10;
    const snapshot = await db.collection('users').get();
    const users = snapshot.docs
      .map((doc) => ({ id: doc.id, ...doc.data() }))
      .sort((a, b) => String(b.created_at || '').localeCompare(String(a.created_at || '')))
      .map(({ password_hash, ...rest }) => rest);
    const { data, pagination } = paginate(users, page, limit);

    return NextResponse.json({
      users: data,
      pagination
    });

  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json(
      { error: 'Failed to fetch users' },
      { status: 500 }
    );
  }
}

// POST /api/users - Create new user (register)
export async function POST(request) {
  try {
    const body = await request.json();
    const { email, password, first_name, last_name, phone, date_of_birth, gender } = body;

    // Validate required fields
    if (!email || !password || !first_name || !last_name) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Check if user already exists
    const existingUser = await getUserByEmail(email);

    if (existingUser) {
      return NextResponse.json(
        { error: 'User with this email already exists' },
        { status: 409 }
      );
    }

    // Hash password
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    const user = await createUser({
      email,
      password_hash: passwordHash,
      first_name,
      last_name,
      phone,
      date_of_birth,
      gender,
      is_active: true,
      is_verified: false,
      is_admin: false,
      role: 'user'
    });

    const { password_hash, ...safeUser } = user;

    return NextResponse.json(safeUser, { status: 201 });

  } catch (error) {
    console.error('Error creating user:', error);
    return NextResponse.json(
      { error: 'Failed to create user' },
      { status: 500 }
    );
  }
} 