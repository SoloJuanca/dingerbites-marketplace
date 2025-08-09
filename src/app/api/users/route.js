import { NextResponse } from 'next/server';
import { getRows, getRow, query, transaction } from '../../../lib/database';
import bcrypt from 'bcryptjs';

// GET /api/users - Get users (admin only)
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page')) || 1;
    const limit = parseInt(searchParams.get('limit')) || 10;
    const offset = (page - 1) * limit;

    const usersQuery = `
      SELECT id, email, first_name, last_name, phone, is_active, is_verified, 
             created_at, last_login_at
      FROM users 
      ORDER BY created_at DESC
      LIMIT $1 OFFSET $2
    `;

    const users = await getRows(usersQuery, [limit, offset]);

    // Get total count
    const countQuery = `SELECT COUNT(*) as total FROM users`;
    const totalResult = await getRow(countQuery);
    const total = parseInt(totalResult.total);

    return NextResponse.json({
      users,
      pagination: {
        total,
        totalPages: Math.ceil(total / limit),
        currentPage: page,
        hasNextPage: page < Math.ceil(total / limit),
        hasPrevPage: page > 1
      }
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
    const existingUser = await getRow(
      'SELECT id FROM users WHERE email = $1',
      [email]
    );

    if (existingUser) {
      return NextResponse.json(
        { error: 'User with this email already exists' },
        { status: 409 }
      );
    }

    // Hash password
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Create user
    const createUserQuery = `
      INSERT INTO users (email, password_hash, first_name, last_name, phone, date_of_birth, gender)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id, email, first_name, last_name, created_at
    `;

    const user = await getRow(createUserQuery, [
      email,
      passwordHash,
      first_name,
      last_name,
      phone || null,
      date_of_birth || null,
      gender || null
    ]);

    return NextResponse.json(user, { status: 201 });

  } catch (error) {
    console.error('Error creating user:', error);
    return NextResponse.json(
      { error: 'Failed to create user' },
      { status: 500 }
    );
  }
} 