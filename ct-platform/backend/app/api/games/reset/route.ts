import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { FREE_DAILY_GAME_RESETS as FREE_DAILY_RESETS, GAME_START_BALANCE as START_BALANCE } from '@/lib/limits';

export const dynamic = 'force-dynamic';

const GAMES = ['roulette', 'blackjack'] as const;

function today() {
  return new Date().toISOString().slice(0, 10);
}
function nextUtcMidnightISO() {
  const d = new Date();
  d.setUTCHours(24, 0, 0, 0);
  return d.toISOString();
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
    const nextResetAt = !isPremium && remaining === 0 ? nextUtcMidnightISO() : null;

    return NextResponse.json({ isPremium, used, remaining, nextResetAt, allowed: isPremium || remaining! > 0 });
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

    // Сбрасываем постоянный баланс к стартовому.
    const resetBalanceRow = () => prisma.gameBalance.upsert({
      where: { userId_game: { userId, game } },
      update: { balance: START_BALANCE },
      create: { userId, game, balance: START_BALANCE },
    });

    // Premium — без ограничений; считаем для статистики, но не блокируем.
    if (isPremium) {
      await prisma.gameReset.upsert({
        where: { userId_game_date: { userId, game, date: today() } },
        create: { userId, game, date: today(), count: 1 },
        update: { count: { increment: 1 } },
      });
      await resetBalanceRow();
      return NextResponse.json({ allowed: true, balance: START_BALANCE, isPremium: true, remaining: null, nextResetAt: null });
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
    await resetBalanceRow();

    const remaining = Math.max(0, FREE_DAILY_RESETS - (used + 1));
    return NextResponse.json({
      allowed: true,
      balance: START_BALANCE,
      isPremium: false,
      remaining,
      nextResetAt: remaining === 0 ? nextUtcMidnightISO() : null,
    });
  } catch (error) {
    console.error('Game reset error:', error);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}
