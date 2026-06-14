import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { hashPassword } from '@/lib/auth';
import { registerSchema } from '@/lib/validation';
import { issueVerificationCode } from '@/lib/verification';
import { attributeSignup } from '@/lib/referral';
import { authLimiter, checkRateLimit } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    
    // Validate input
    const result = registerSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: 'Validation error', details: result.error.flatten() },
        { status: 400 }
      );
    }

    const { name, email, password, referralCode } = result.data;

    // Антиспам: регистрация создаёт пользователя и шлёт письмо — без лимита это
    // вектор для забивания БД и рассылки писем (login/forgot уже ограничены).
    const clientIp = req.headers.get('x-forwarded-for') || 'unknown';
    const rateLimit = await checkRateLimit(authLimiter, `register:${clientIp}`);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Слишком много попыток. Попробуйте позже.' },
        { status: 429 }
      );
    }

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'Пользователь с таким email уже существует' },
        { status: 409 }
      );
    }

    // Hash password
    const hashedPassword = await hashPassword(password);

    // Create user — email НЕ подтверждён (emailVerified = null)
    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role: 'USER',
        plan: 'FREE',
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        plan: true,
        emailVerified: true,
        createdAt: true,
      },
    });

    // Привязка к реферальному коду (не критична — ошибки не валят регистрацию).
    let referralDiscount = 0;
    if (referralCode) {
      try {
        const ref = await attributeSignup(referralCode, user.id);
        if (ref) referralDiscount = ref.discountPct;
      } catch (e) {
        console.error('Referral attribution failed:', e);
      }
    }

    // Выдаём 6-значный код подтверждения и отправляем письмо.
    // devCode возвращается ТОЛЬКО если SMTP не настроен (для разработки).
    const { devCode } = await issueVerificationCode(user.id, user.email, user.name);

    return NextResponse.json(
      { message: 'Регистрация успешна. Подтвердите email кодом из письма.', user, needsVerification: true, devCode, referralDiscount },
      { status: 201 }
    );
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { error: 'Ошибка сервера' },
      { status: 500 }
    );
  }
}
