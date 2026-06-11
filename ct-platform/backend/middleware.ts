import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

const protectedRoutes = [
  '/api/users/me',
  '/api/users/stats',
  '/api/users/daily',
  '/api/users/achievements',
  '/api/users/progress',
  '/api/progress',
  '/api/reports',
  '/api/users/favorites',
  '/api/exam/start',
  '/api/exam/submit',
  '/api/exam/history',
  '/api/exam/completed',
  '/api/leaderboard/me',
  '/api/games/reset',
  '/api/games/balance',
  '/api/subscription',
  '/api/auth/verify-email',
  '/api/auth/resend-code',
];

const adminRoutes = [
  '/api/admin',
];

// Защищённые маршруты, доступные ДО подтверждения email (нужны для самого процесса
// подтверждения и для показа профиля). Остальные защищённые требуют verified=true.
const unverifiedAllowed = [
  '/api/auth/verify-email',
  '/api/auth/resend-code',
  '/api/users/me',
];

// В production отсутствие NEXTAUTH_SECRET — фатальная мисконфигурация: с
// fallback-секретом токены можно подделать. Возвращаем null → запросы с
// токеном получают 503, а не тихо принимаются (fail closed; lib/auth.ts
// при этом бросает на старте, так что сюда попадаем только в edge-случаях).
function getSecret(): Uint8Array | null {
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === 'production') return null;
    return new TextEncoder().encode('dev-insecure-secret');
  }
  return new TextEncoder().encode(secret);
}

interface TokenPayload {
  userId: string;
  email: string;
  role: string;
  verified?: boolean;
}

async function verifyJwt(token: string): Promise<TokenPayload | null> {
  const secret = getSecret();
  if (!secret) return null;
  try {
    const { payload } = await jwtVerify(token, secret);
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

    // Блокируем функции для пользователей с неподтверждённым email.
    // payload.verified === false только у новых (post-feature) неподтверждённых
    // токенов; у старых токенов поле отсутствует (undefined) — их не трогаем.
    const isUnverifiedAllowed = unverifiedAllowed.some(route => pathname.startsWith(route));
    if (!isAdmin && !isUnverifiedAllowed && payload.verified === false) {
      return NextResponse.json(
        { error: 'Подтвердите email, чтобы пользоваться этой функцией', code: 'EMAIL_NOT_VERIFIED' },
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

  // Нет валидного токена: вычищаем возможные подставные заголовки идентичности,
  // чтобы клиент не мог выдать себя за другого пользователя на публичных роутах
  // (например, /api/contact). x-user-id выставляется ТОЛЬКО из проверенного токена.
  const cleanHeaders = new Headers(request.headers);
  cleanHeaders.delete('x-user-id');
  cleanHeaders.delete('x-user-role');
  const response = NextResponse.next({ request: { headers: cleanHeaders } });
  response.headers.set('Access-Control-Allow-Origin', origin);
  return response;
}

export const config = {
  matcher: '/api/:path*',
};
