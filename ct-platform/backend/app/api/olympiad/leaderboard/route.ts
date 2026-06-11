import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// GET /api/olympiad/leaderboard — рейтинг олимпиадников (отдельный от общего).
// Очки = сумма pointsEarned по верно решённым задачам (начисляются один раз
// за задачу → накрутка повторными сабмитами невозможна).
export async function GET(req: NextRequest) {
  try {
    const meId = req.headers.get('x-user-id');

    const grouped = await prisma.olympiadAttempt.groupBy({
      by: ['userId'],
      where: { isCorrect: true },
      _sum: { pointsEarned: true },
      _count: { _all: true },
    });

    const ranked = grouped
      .map(g => ({ userId: g.userId, points: g._sum.pointsEarned ?? 0, solved: g._count._all }))
      .sort((a, b) => b.points - a.points || b.solved - a.solved);

    const top = ranked.slice(0, 50);
    const users = await prisma.user.findMany({
      where: { id: { in: top.map(t => t.userId) } },
      select: { id: true, name: true, image: true, level: true },
    });
    const userMap = new Map(users.map(u => [u.id, u]));

    const leaderboard = top.map((t, i) => {
      const u = userMap.get(t.userId);
      return {
        rank: i + 1,
        userId: t.userId,
        name: u?.name ?? 'Аноним',
        image: u?.image ?? null,
        level: u?.level ?? 1,
        points: t.points,
        solved: t.solved,
      };
    });

    let me: { rank: number; points: number; solved: number } | null = null;
    if (meId) {
      const idx = ranked.findIndex(r => r.userId === meId);
      if (idx >= 0) me = { rank: idx + 1, points: ranked[idx].points, solved: ranked[idx].solved };
    }

    return NextResponse.json({ leaderboard, me, totalParticipants: ranked.length });
  } catch (error) {
    console.error('Olympiad leaderboard error:', error);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}
