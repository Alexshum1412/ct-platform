import { compare, hash } from 'bcryptjs';
import { sign, verify } from 'jsonwebtoken';

const JWT_SECRET = process.env.NEXTAUTH_SECRET;

if (!JWT_SECRET && process.env.NODE_ENV === 'production') {
  throw new Error('NEXTAUTH_SECRET is required in production');
}

const resolvedJwtSecret = JWT_SECRET || 'dev-insecure-secret';

export interface TokenPayload {
  userId: string;
  email: string;
  role: 'USER' | 'ADMIN' | 'MODERATOR';
  /** Подтверждён ли email. Используется middleware для блокировки функций. */
  verified?: boolean;
}

export async function hashPassword(password: string): Promise<string> {
  return hash(password, 12);
}

export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  return compare(password, hashedPassword);
}

export function generateToken(payload: TokenPayload): string {
  return sign(payload, resolvedJwtSecret, { expiresIn: '7d' });
}

export function verifyToken(token: string): TokenPayload | null {
  try {
    return verify(token, resolvedJwtSecret) as TokenPayload;
  } catch {
    return null;
  }
}

export function generateRefreshToken(payload: TokenPayload): string {
  return sign(payload, resolvedJwtSecret, { expiresIn: '30d' });
}
