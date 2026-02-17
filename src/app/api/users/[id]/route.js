import { NextResponse } from 'next/server';
import { getUserById, updateUser } from '../../../../lib/firebaseUsers';

// GET /api/users/[id] - Get user by ID
export async function GET(request, { params }) {
  try {
    const { id } = await params;

    const user = await getUserById(id);

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const { password_hash, ...safeUser } = user;
    return NextResponse.json(safeUser);

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
    const { id } = await params;
    const body = await request.json();
    const { first_name, last_name, phone, date_of_birth, gender } = body;

    // Check if user exists
    const existingUser = await getUserById(id);
    if (!existingUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const user = await updateUser(id, {
      first_name: first_name ?? existingUser.first_name,
      last_name: last_name ?? existingUser.last_name,
      phone: phone ?? existingUser.phone ?? null,
      date_of_birth: date_of_birth ?? existingUser.date_of_birth ?? null,
      gender: gender ?? existingUser.gender ?? null
    });

    const { password_hash, ...safeUser } = user;
    return NextResponse.json(safeUser);

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
    const { id } = await params;

    // Check if user exists
    const existingUser = await getUserById(id);
    if (!existingUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const user = await updateUser(id, { is_active: false });

    return NextResponse.json({
      message: 'User deleted successfully',
      user: {
        id: user.id,
        email: user.email
      }
    });

  } catch (error) {
    console.error('Error deleting user:', error);
    return NextResponse.json(
      { error: 'Failed to delete user' },
      { status: 500 }
    );
  }
} 