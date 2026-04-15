import { NextResponse } from 'next/server';
import { hashPassword, generateToken } from '../../../../lib/auth';
import { getUserByEmail, updateUser } from '../../../../lib/firebaseUsers';

export async function POST(request) {
  try {
    const body = await request.json();
    const { email, password, firstName, lastName, phone } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email y contraseña son requeridos' },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: 'La contraseña debe tener al menos 8 caracteres' },
        { status: 400 }
      );
    }

    const existingUser = await getUserByEmail(email);

    if (!existingUser) {
      return NextResponse.json(
        { error: 'No se encontró una cuenta con ese correo' },
        { status: 404 }
      );
    }

    if (!existingUser.is_guest) {
      return NextResponse.json(
        { error: 'Esta cuenta ya está registrada. Inicia sesión.' },
        { status: 409 }
      );
    }

    const passwordHash = await hashPassword(password);

    const updatedUser = await updateUser(existingUser.id, {
      password_hash: passwordHash,
      is_guest: false,
      is_active: true,
      is_verified: true,
      email_verified_at: new Date().toISOString(),
      ...(firstName && { first_name: firstName }),
      ...(lastName && { last_name: lastName }),
      ...(phone && { phone })
    });

    if (!updatedUser) {
      return NextResponse.json(
        { error: 'No se pudo actualizar la cuenta' },
        { status: 500 }
      );
    }

    const token = generateToken(updatedUser);
    const { password_hash, ...userWithoutPassword } = updatedUser;

    return NextResponse.json({
      user: userWithoutPassword,
      token,
      message: 'Cuenta creada exitosamente'
    }, { status: 200 });

  } catch (error) {
    console.error('[Auth] Error claiming guest account:', error);
    return NextResponse.json(
      { error: 'No se pudo crear la cuenta' },
      { status: 500 }
    );
  }
}
