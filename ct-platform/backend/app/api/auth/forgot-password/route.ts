import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { issueVerificationCode } from '@/lib/verification';
import { authLimiter, checkRateLimit } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

const schema = z.object({ email: z.string().email() });

// POST /api/auth/forgot-password — выдаёт одноразовый код для сброса пароля и
// отправляет его на email. Существование пользователя НЕ раскрывается.
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Некорректный email' }, { status: 400 });
    }

    // Антибрутфорс по IP.
    const ip = req.headers.get('x-forwarded-for') || 'unknown';
    const rl = await checkRateLimit(authLimiter, `forgot:${ip}`);
    if (!rl.allowed) {
      return NextResponse.json({ error: 'Слишком много попыток. Попробуйте позже.' }, { status: 429 });
    }

    const user = await prisma.user.findUnique({ where: { email: parsed.data.email } });
    let devCode: string | undefined;
    // Код выдаём только реальному пользователю с паролем (не OAuth-аккаунту).
    if (user && user.password) {
      const r = await issueVerificationCode(user.id, user.email, user.name, 'PASSWORD_RESET');
      devCode = r.devCode;
    }

    return NextResponse.json({
      message: 'Если этот email зарегистрирован, мы отправили на него код для сброса пароля.',
      devCode, // только в dev-режиме (SMTP не настроен) и только для существующего аккаунта
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}
