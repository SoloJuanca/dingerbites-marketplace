import { NextResponse } from 'next/server';
import { getRow, query } from '../../../../lib/database';

// GET /api/users/[id] - Get user by ID
export async function GET(request, { params }) {
  try {
    const { id } = params;

    const userQuery = `
      SELECT id, email, first_name, last_name, phone, date_of_birth, gender,
             is_active, is_verified, email_verified_at, created_at, last_login_at
      FROM users 
      WHERE id = $1
    `;

    const user = await getRow(userQuery, [id]);

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(user);

  } catch (error) {
    console.error('Error fetching user:', error);
    return NextResponse.json(
      { error: 'Failed to fetch user' },
      { status: 500 }
    );
  }
}

// PUT /api/users/[id] - Update user
export async function PUT(request, { params }) {
  try {
    const { id } = params;
    const body = await request.json();
    const { first_name, last_name, phone, date_of_birth, gender } = body;

    // Check if user exists
    const existingUser = await getRow('SELECT id FROM users WHERE id = $1', [id]);
    if (!existingUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Update user
    const updateQuery = `
      UPDATE users 
      SET first_name = COALESCE($2, first_name),
          last_name = COALESCE($3, last_name),
          phone = COALESCE($4, phone),
          date_of_birth = COALESCE($5, date_of_birth),
          gender = COALESCE($6, gender),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING id, email, first_name, last_name, phone, date_of_birth, gender, updated_at
    `;

    const user = await getRow(updateQuery, [
      id,
      first_name,
      last_name,
      phone,
      date_of_birth,
      gender
    ]);

    return NextResponse.json(user);

  } catch (error) {
    console.error('Error updating user:', error);
    return NextResponse.json(
      { error: 'Failed to update user' },
      { status: 500 }
    );
  }
}

// DELETE /api/users/[id] - Delete user
export async function DELETE(request, { params }) {
  try {
    const { id } = params;

    // Check if user exists
    const existingUser = await getRow('SELECT id FROM users WHERE id = $1', [id]);
    if (!existingUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Soft delete - set is_active to false
    const deleteQuery = `
      UPDATE users 
      SET is_active = false, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING id, email
    `;

    const user = await getRow(deleteQuery, [id]);

    return NextResponse.json({
      message: 'User deleted successfully',
      user
    });

  } catch (error) {
    console.error('Error deleting user:', error);
    return NextResponse.json(
      { error: 'Failed to delete user' },
      { status: 500 }
    );
  }
} 