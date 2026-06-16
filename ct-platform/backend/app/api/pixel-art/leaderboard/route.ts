import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { serverMonth } from '@/lib/pixel-art';

export const dynamic = 'force-dynamic';

// GET /api/pixel-art/leaderboard[?month=YYYY-MM]
// Рейтинг по числу закрашенных клеток за месяц. Хранится исторически (по месяцам),
// поэтому прошлые месяцы доступны и после архивации полотна.
export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const month = url.searchParams.get('month') || serverMonth();

    const top = await prisma.pixelContribution.findMany({
      where: { month, count: { gt: 0 } },
      orderBy: { count: 'desc' },
      take: 50,
    });
    const users = await prisma.user.findMany({
      where: { id: { in: top.map((t) => t.userId) } },
      select: { id: true, name: true, image: true },
    });
    const byId = new Map(users.map((u) => [u.id, u]));
    const leaderboard = top.map((t, i) => ({
      rank: i + 1,
      userId: t.userId,
      name: byId.get(t.userId)?.name || 'Аноним',
      avatar: byId.get(t.userId)?.image || null,
      count: t.count,
    }));

    // Доступные месяцы (история рейтингов).
    const monthRows = await prisma.pixelContribution.findMany({
      distinct: ['month'], select: { month: true }, orderBy: { month: 'desc' },
    });
    const months = monthRows.map((m) => m.month);

    // Позиция запрашивающего (если авторизован — middleware прокидывает x-user-id).
    const userId = req.headers.get('x-user-id');
    let me: { rank: number | null; count: number } | null = null;
    if (userId) {
      const mine = await prisma.pixelContribution.findUnique({ where: { userId_month: { userId, month } } });
      const count = mine?.count ?? 0;
      if (count > 0) {
        const ahead = await prisma.pixelContribution.count({ where: { month, count: { gt: count } } });
        me = { rank: ahead + 1, count };
      } else {
        me = { rank: null, count: 0 };
      }
    }

    return NextResponse.json({ month, months, leaderboard, me });
  } catch (e) {
    console.error('Pixel-art leaderboard error:', e);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}
