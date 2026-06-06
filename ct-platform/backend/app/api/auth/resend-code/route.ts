import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { issueVerificationCode, RESEND_COOLDOWN_SEC } from '@/lib/verification';

export const dynamic = 'force-dynamic';

// POST /api/auth/resend-code — повторно отправить код подтверждения (с кулдауном).
export async function POST(req: NextRequest) {
  try {
    const userId = req.headers.get('x-user-id');
    if (!userId) return NextResponse.json({ error: 'Требуется авторизация' }, { status: 401 });

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return NextResponse.json({ error: 'Пользователь не найден' }, { status: 404 });
    if (user.emailVerified) {
      return NextResponse.json({ error: 'Email уже подтверждён', code: 'ALREADY' }, { status: 400 });
    }

    // Антиспам: не чаще одного письма в RESEND_COOLDOWN_SEC секунд.
    const latest = await prisma.verificationCode.findFirst({
      where: { userId, purpose: 'EMAIL_VERIFY' },
      orderBy: { createdAt: 'desc' },
    });
    if (latest) {
      const elapsed = (Date.now() - latest.createdAt.getTime()) / 1000;
      if (elapsed < RESEND_COOLDOWN_SEC) {
        const wait = Math.ceil(RESEND_COOLDOWN_SEC - elapsed);
        return NextResponse.json(
          { error: `Новый код можно запросить через ${wait} с.`, retryAfter: wait },
          { status: 429 },
        );
      }
    }

    const { devCode } = await issueVerificationCode(user.id, user.email, user.name);
    return NextResponse.json({ success: true, message: 'Код отправлен на email', devCode });
  } catch (error) {
    console.error('Resend code error:', error);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}
