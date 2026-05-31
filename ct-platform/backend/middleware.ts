import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

const protectedRoutes = [
  '/api/users/me',
  '/api/users/stats',
  '/api/users/daily',
  '/api/users/achievements',
  '/api/progress',
  '/api/reports',
  '/api/users/favorites',
  '/api/exam/start',
  '/api/exam/submit',
  '/api/exam/history',
  '/api/leaderboard/me',
];

const adminRoutes = [
  '/api/admin',
];

function getSecret() {
  const secret = process.env.NEXTAUTH_SECRET || 'dev-insecure-secret';
  return new TextEncoder().encode(secret);
}

interface TokenPayload {
  userId: string;
  email: string;
  role: string;
}

async function verifyJwt(token: string): Promise<TokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    return payload as unknown as TokenPayload;
  } catch {
    return null;
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const origin = process.env.FRONTEND_URL || 'http://localhost:5173';

  if (request.method === 'OPTIONS') {
    return new NextResponse(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': origin,
        'Access-Control-Allow-Methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });
  }

  const isProtected = protectedRoutes.some(route => pathname.startsWith(route));
  const isAdmin = adminRoutes.some(route => pathname.startsWith(route));

  if (isProtected || isAdmin) {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');

    if (!token) {
      return NextResponse.json(
        { error: 'Требуется авторизация' },
        { status: 401, headers: { 'Access-Control-Allow-Origin': origin } }
      );
    }

    const payload = await verifyJwt(token);

    if (!payload) {
      return NextResponse.json(
        { error: 'Недействительный токен' },
        { status: 401, headers: { 'Access-Control-Allow-Origin': origin } }
      );
    }

    if (isAdmin && payload.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Доступ запрещён' },
        { status: 403, headers: { 'Access-Control-Allow-Origin': origin } }
      );
    }

    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('x-user-id', payload.userId);
    requestHeaders.set('x-user-role', payload.role);

    const response = NextResponse.next({
      request: { headers: requestHeaders },
    });
    response.headers.set('Access-Control-Allow-Origin', origin);
    return response;
  }

  // Opportunistically parse token on non-protected routes
  const authHeader = request.headers.get('authorization');
  const token = authHeader?.replace('Bearer ', '');
  if (token) {
    const payload = await verifyJwt(token);
    if (payload) {
      const requestHeaders = new Headers(request.headers);
      requestHeaders.set('x-user-id', payload.userId);
      requestHeaders.set('x-user-role', payload.role);
      const response = NextResponse.next({ request: { headers: requestHeaders } });
      response.headers.set('Access-Control-Allow-Origin', origin);
      return response;
    }
  }

  const response = NextResponse.next();
  response.headers.set('Access-Control-Allow-Origin', origin);
  return response;
}

export const config = {
  matcher: '/api/:path*',
};
