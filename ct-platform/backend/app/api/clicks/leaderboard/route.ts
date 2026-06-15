import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

const PERIODS = ['day', 'week', 'month', 'year', 'all'] as const;

// Начало окна (ISO-дата) — даты в БД строковые "YYYY-MM-DD" сортируются лексикографически.
function windowStart(period: string): string | null {
  const now = Date.now();
  const day = 86400000;
  const iso = (ms: number) => new Date(ms).toISOString().slice(0, 10);
  switch (period) {
    case 'day': return iso(now);
    case 'week': return iso(now - 6 * day);
    case 'month': return iso(now - 29 * day);
    case 'year': return iso(now - 364 * day);
    default: return null; // all
  }
}

// GET /api/clicks/leaderboard?period=day|week|month|year|all — рейтинг кликеров.
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    let period = searchParams.get('period') || 'all';
    if (!(PERIODS as readonly string[]).includes(period)) period = 'all';
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '20', 10) || 20));
    const userId = req.headers.get('x-user-id');

    const since = windowStart(period);
    const where = since ? { date: { gte: since } } : {};

    const grouped = await prisma.userClickDay.groupBy({
      by: ['userId'],
      where,
      _sum: { count: true },
      orderBy: { _sum: { count: 'desc' } },
    });

    const top = grouped.slice(0, limit);
    const users = await prisma.user.findMany({
      where: { id: { in: top.map((g) => g.userId) } },
      select: { id: true, name: true, image: true },
    });
    const byId = new Map(users.map((u) => [u.id, u]));

    const leaderboard = top.map((g, i) => ({
      rank: i + 1,
      userId: g.userId,
      name: byId.get(g.userId)?.name ?? 'Игрок',
      avatar: byId.get(g.userId)?.image ?? null,
      clicks: g._sum.count ?? 0,
    }));

    let me: { rank: number | null; clicks: number; total: number } | null = null;
    if (userId) {
      const idx = grouped.findIndex((g) => g.userId === userId);
      me = idx >= 0
        ? { rank: idx + 1, clicks: grouped[idx]._sum.count ?? 0, total: grouped.length }
        : { rank: null, clicks: 0, total: grouped.length };
    }

    return NextResponse.json({ period, leaderboard, me });
  } catch (error) {
    console.error('Clicks leaderboard error:', error);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}
