import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

const GAMES = ['roulette', 'blackjack'] as const;
const FREE_DAILY_RESETS = 1; // не-Premium: 1 сброс в день на каждую игру
const START_BALANCE = 100;

function today() {
  return new Date().toISOString().slice(0, 10);
}

function parseGame(value: string | null): string | null {
  return value && (GAMES as readonly string[]).includes(value) ? value : null;
}

// GET /api/games/reset?game=roulette — сколько сбросов доступно сегодня
export async function GET(req: NextRequest) {
  try {
    const userId = req.headers.get('x-user-id');
    if (!userId) return NextResponse.json({ error: 'Требуется авторизация' }, { status: 401 });

    const game = parseGame(new URL(req.url).searchParams.get('game'));
    if (!game) return NextResponse.json({ error: 'Неизвестная игра' }, { status: 400 });

    const user = await prisma.user.findUnique({ where: { id: userId }, select: { plan: true } });
    const isPremium = !!user && user.plan !== 'FREE';

    const row = await prisma.gameReset.findUnique({
      where: { userId_game_date: { userId, game, date: today() } },
    });
    const used = row?.count ?? 0;
    const remaining = isPremium ? null : Math.max(0, FREE_DAILY_RESETS - used);

    return NextResponse.json({ isPremium, used, remaining, allowed: isPremium || remaining! > 0 });
  } catch (error) {
    console.error('Get game reset status error:', error);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}

// POST /api/games/reset  body { game } — выполнить сброс баланса (с дневным лимитом)
export async function POST(req: NextRequest) {
  try {
    const userId = req.headers.get('x-user-id');
    if (!userId) return NextResponse.json({ error: 'Требуется авторизация' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const game = parseGame(body?.game ?? null);
    if (!game) return NextResponse.json({ error: 'Неизвестная игра' }, { status: 400 });

    const user = await prisma.user.findUnique({ where: { id: userId }, select: { plan: true } });
    const isPremium = !!user && user.plan !== 'FREE';

    // Premium — без ограничений; считаем для статистики, но не блокируем.
    if (isPremium) {
      await prisma.gameReset.upsert({
        where: { userId_game_date: { userId, game, date: today() } },
        create: { userId, game, date: today(), count: 1 },
        update: { count: { increment: 1 } },
      });
      return NextResponse.json({ allowed: true, balance: START_BALANCE, isPremium: true, remaining: null });
    }

    // Не-Premium: атомарно проверяем дневной лимит.
    const date = today();
    const existing = await prisma.gameReset.findUnique({
      where: { userId_game_date: { userId, game, date } },
    });
    const used = existing?.count ?? 0;
    if (used >= FREE_DAILY_RESETS) {
      return NextResponse.json(
        { allowed: false, error: 'Сброс доступен 1 раз в день. Оформите Premium для безлимита.', remaining: 0, isPremium: false },
        { status: 429 },
      );
    }

    await prisma.gameReset.upsert({
      where: { userId_game_date: { userId, game, date } },
      create: { userId, game, date, count: 1 },
      update: { count: { increment: 1 } },
    });

    return NextResponse.json({
      allowed: true,
      balance: START_BALANCE,
      isPremium: false,
      remaining: Math.max(0, FREE_DAILY_RESETS - (used + 1)),
    });
  } catch (error) {
    console.error('Game reset error:', error);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}
