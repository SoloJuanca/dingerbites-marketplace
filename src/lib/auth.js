import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { getRow } from './database';

// JWT secret key
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Generate JWT token
export function generateToken(user) {
  const payload = {
    userId: user.id,
    email: user.email,
    firstName: user.first_name,
    lastName: user.last_name
  };

  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

// Verify JWT token
export function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return null;
  }
}

// Hash password
export async function hashPassword(password) {
  const saltRounds = 12;
  return await bcrypt.hash(password, saltRounds);
}

// Compare password
export async function comparePassword(password, hashedPassword) {
  return await bcrypt.compare(password, hashedPassword);
}

// Get user from token
export async function getUserFromToken(token) {
  const decoded = verifyToken(token);
  if (!decoded) {
    return null;
  }

  const user = await getRow(
    'SELECT id, email, first_name, last_name, is_active FROM users WHERE id = $1',
    [decoded.userId]
  );

  return user && user.is_active ? user : null;
}

// Middleware helper for API routes
export async function authenticateUser(request) {
  const authHeader = request.headers.get('authorization');
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.substring(7);
  return await getUserFromToken(token);
} 