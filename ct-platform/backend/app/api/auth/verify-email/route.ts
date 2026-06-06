import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyPassword, generateToken } from '@/lib/auth';
import { MAX_ATTEMPTS } from '@/lib/verification';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const schema = z.object({ code: z.string().regex(/^\d{6}$/, 'Код состоит из 6 цифр') });

const userSelect = {
  id: true, name: true, email: true, role: true, plan: true,
  emailVerified: true, xp: true, level: true, streakDays: true,
} as const;

// POST /api/auth/verify-email  body { code } — подтверждение email одноразовым кодом.
export async function POST(req: NextRequest) {
  try {
    const userId = req.headers.get('x-user-id');
    if (!userId) return NextResponse.json({ error: 'Требуется авторизация' }, { status: 401 });

    const parsed = schema.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) {
      return NextResponse.json({ error: 'Введите 6-значный код', code: 'INVALID_FORMAT' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return NextResponse.json({ error: 'Пользователь не найден' }, { status: 404 });

    // Уже подтверждён — идемпотентно выдаём «verified»-токен.
    if (user.emailVerified) {
      const token = generateToken({ userId: user.id, email: user.email, role: user.role as 'USER' | 'ADMIN' | 'MODERATOR', verified: true });
      const fresh = await prisma.user.findUnique({ where: { id: userId }, select: userSelect });
      return NextResponse.json({ success: true, alreadyVerified: true, token, user: fresh });
    }

    const vc = await prisma.verificationCode.findFirst({
      where: { userId, purpose: 'EMAIL_VERIFY', consumedAt: null },
      orderBy: { createdAt: 'desc' },
    });
    if (!vc) {
      return NextResponse.json({ error: 'Код не найден. Запросите новый.', code: 'NO_CODE' }, { status: 400 });
    }
    if (vc.expiresAt < new Date()) {
      return NextResponse.json({ error: 'Срок действия кода истёк. Запросите новый.', code: 'EXPIRED' }, { status: 400 });
    }
    if (vc.attempts >= MAX_ATTEMPTS) {
      return NextResponse.json({ error: 'Слишком много попыток. Запросите новый код.', code: 'TOO_MANY' }, { status: 429 });
    }

    const ok = await verifyPassword(parsed.data.code, vc.codeHash);
    if (!ok) {
      await prisma.verificationCode.update({ where: { id: vc.id }, data: { attempts: { increment: 1 } } });
      const left = Math.max(0, MAX_ATTEMPTS - (vc.attempts + 1));
      return NextResponse.json(
        { error: `Неверный код. Осталось попыток: ${left}.`, code: 'INVALID', attemptsLeft: left },
        { status: 400 },
      );
    }

    // Успех: помечаем email подтверждённым и «гасим» код (одноразовость).
    const now = new Date();
    const [updatedUser] = await prisma.$transaction([
      prisma.user.update({ where: { id: userId }, data: { emailVerified: now }, select: userSelect }),
      prisma.verificationCode.update({ where: { id: vc.id }, data: { consumedAt: now } }),
    ]);

    // Новый токен уже с verified:true — фронт заменит им старый, middleware пропустит.
    const token = generateToken({ userId: user.id, email: user.email, role: user.role as 'USER' | 'ADMIN' | 'MODERATOR', verified: true });
    return NextResponse.json({ success: true, token, user: updatedUser });
  } catch (error) {
    console.error('Verify email error:', error);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}
