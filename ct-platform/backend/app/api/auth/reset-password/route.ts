import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { hashPassword, verifyPassword } from '@/lib/auth';
import { MAX_ATTEMPTS } from '@/lib/verification';

export const dynamic = 'force-dynamic';

const schema = z.object({
  email: z.string().email(),
  code: z.string().regex(/^\d{6}$/, 'Код состоит из 6 цифр'),
  password: z.string()
    .min(8, 'Пароль должен быть не менее 8 символов')
    .regex(/[a-z]/, 'нужна строчная буква')
    .regex(/[A-Z]/, 'нужна заглавная буква')
    .regex(/\d/, 'нужна цифра'),
});

// POST /api/auth/reset-password — проверяет одноразовый код и РЕАЛЬНО меняет пароль.
export async function POST(req: NextRequest) {
  try {
    const parsed = schema.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Проверьте данные: код — 6 цифр, пароль — минимум 8 символов с заглавной, строчной буквой и цифрой.' },
        { status: 400 },
      );
    }

    const user = await prisma.user.findUnique({ where: { email: parsed.data.email } });
    // Единый ответ при любой проблеме с кодом — не раскрываем детали/существование.
    const genericFail = () => NextResponse.json(
      { error: 'Неверный код или его срок действия истёк. Запросите новый.', code: 'INVALID_CODE' },
      { status: 400 },
    );
    if (!user || !user.password) return genericFail();

    const vc = await prisma.verificationCode.findFirst({
      where: { userId: user.id, purpose: 'PASSWORD_RESET', consumedAt: null },
      orderBy: { createdAt: 'desc' },
    });
    if (!vc || vc.expiresAt < new Date() || vc.attempts >= MAX_ATTEMPTS) return genericFail();

    const ok = await verifyPassword(parsed.data.code, vc.codeHash);
    if (!ok) {
      await prisma.verificationCode.update({ where: { id: vc.id }, data: { attempts: { increment: 1 } } });
      return genericFail();
    }

    // Успех: меняем пароль и гасим код (одноразовость).
    const hashed = await hashPassword(parsed.data.password);
    await prisma.$transaction([
      prisma.user.update({ where: { id: user.id }, data: { password: hashed } }),
      prisma.verificationCode.update({ where: { id: vc.id }, data: { consumedAt: new Date() } }),
    ]);

    return NextResponse.json({ success: true, message: 'Пароль обновлён. Войдите с новым паролем.' });
  } catch (error) {
    console.error('Reset password error:', error);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}
