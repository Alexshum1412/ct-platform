import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { GAME_START_BALANCE as START } from '@/lib/limits';

export const dynamic = 'force-dynamic';

const GAMES = ['roulette', 'blackjack'] as const;

// GET /api/games/leaderboard?game=roulette|blackjack — рейтинг по РЕКОРДУ (peak).
// Показываем только тех, кто превзошёл стартовый баланс. Опц. авторизация → блок me.
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const game = searchParams.get('game');
    if (!game || !(GAMES as readonly string[]).includes(game)) {
      return NextResponse.json({ error: 'Неизвестная игра' }, { status: 400 });
    }
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '20', 10) || 20));
    const userId = req.headers.get('x-user-id');

    const rows = await prisma.gameBalance.findMany({
      where: { game, peak: { gt: START } },
      orderBy: [{ peak: 'desc' }, { balance: 'desc' }, { updatedAt: 'asc' }],
      take: limit,
      include: { user: { select: { id: true, name: true, image: true } } },
    });

    const leaderboard = rows.map((r, i) => ({
      rank: i + 1,
      userId: r.userId,
      name: r.user?.name ?? 'Игрок',
      avatar: r.user?.image ?? null,
      peak: r.peak,
      balance: r.balance,
    }));

    let me: { rank: number | null; peak: number; balance: number; total: number } | null = null;
    if (userId) {
      const mine = await prisma.gameBalance.findUnique({ where: { userId_game: { userId, game } } });
      if (mine) {
        const ahead = mine.peak > START
          ? await prisma.gameBalance.count({ where: { game, peak: { gt: mine.peak } } })
          : null;
        const total = await prisma.gameBalance.count({ where: { game, peak: { gt: START } } });
        me = { rank: ahead === null ? null : ahead + 1, peak: mine.peak, balance: mine.balance, total };
      }
    }

    return NextResponse.json({ game, startBalance: START, leaderboard, me });
  } catch (error) {
    console.error('Game leaderboard error:', error);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}
