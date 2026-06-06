import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyPassword, generateToken } from '@/lib/auth';
import { loginSchema } from '@/lib/validation';
import { authLimiter, checkRateLimit } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    
    // Validate input
    const result = loginSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: 'Validation error', details: result.error.flatten() },
        { status: 400 }
      );
    }

    const { email, password } = result.data;

    // Check rate limit
    const clientIp = req.headers.get('x-forwarded-for') || 'unknown';
    const rateLimit = await checkRateLimit(authLimiter, `login:${clientIp}`);
    
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Слишком много попыток. Попробуйте позже.' },
        { status: 429 }
      );
    }

    // Find user
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user || !user.password) {
      return NextResponse.json(
        { error: 'Неверный email или пароль' },
        { status: 401 }
      );
    }

    // Verify password
    const isValid = await verifyPassword(password, user.password);

    if (!isValid) {
      return NextResponse.json(
        { error: 'Неверный email или пароль' },
        { status: 401 }
      );
    }

    // Generate token (с признаком подтверждения email для middleware)
    const token = generateToken({
      userId: user.id,
      email: user.email,
      role: user.role as 'USER' | 'ADMIN' | 'MODERATOR',
      verified: !!user.emailVerified,
    });

    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { updatedAt: new Date() },
    });

    return NextResponse.json({
      message: 'Вход успешен',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        plan: user.plan,
        emailVerified: user.emailVerified,
        xp: user.xp,
        level: user.level,
        streakDays: user.streakDays,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Ошибка сервера' },
      { status: 500 }
    );
  }
}
