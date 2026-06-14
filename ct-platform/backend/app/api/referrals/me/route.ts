import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getOrCreateUserCode } from '@/lib/referral';

export const dynamic = 'force-dynamic';

/** Имя в полу-анонимном виде: «Иван П.» — реферер видит, кого привёл, но без фамилии. */
function anonymizeName(name?: string | null): string {
  if (!name) return 'Пользователь';
  const parts = name.trim().split(/\s+/);
  const first = parts[0];
  if (parts.length > 1 && parts[1]) return `${first} ${parts[1][0].toUpperCase()}.`;
  return first;
}

// GET /api/referrals/me — личный реферальный код, статистика и список приглашённых.
export async function GET(req: NextRequest) {
  const userId = req.headers.get('x-user-id');
  if (!userId) return NextResponse.json({ error: 'Требуется авторизация' }, { status: 401 });
  try {
    const code = await getOrCreateUserCode(userId);
    const [me, referrals] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: { referralDiscount: true, referredByCode: true },
      }),
      prisma.referral.findMany({
        where: { codeId: code.id },
        orderBy: { createdAt: 'desc' },
        take: 100,
        select: {
          id: true, status: true, amount: true, createdAt: true, convertedAt: true,
          user: { select: { name: true } },
        },
      }),
    ]);

    return NextResponse.json({
      code: code.code,
      discountPct: code.discountPct,
      stats: {
        clicks: code.clicks,
        signups: code.signups,
        conversions: code.conversions,
        revenue: code.revenue,
      },
      myDiscount: me?.referralDiscount ?? 0,
      referredByCode: me?.referredByCode ?? null,
      referrals: referrals.map((r) => ({
        id: r.id,
        status: r.status,
        amount: r.amount,
        createdAt: r.createdAt,
        convertedAt: r.convertedAt,
        name: anonymizeName(r.user?.name),
      })),
    });
  } catch (e) {
    console.error('Referrals me error:', e);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}
