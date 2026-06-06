import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { FREE_DAILY_GAME_RESETS as FREE_DAILY_RESETS, GAME_START_BALANCE as START_BALANCE } from '@/lib/limits';

export const dynamic = 'force-dynamic';

const GAMES = ['roulette', 'blackjack'] as const;
const MAX_BALANCE = 1_000_000; // защита от мусорных значений

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

// Текущий статус дневного сброса (+ время до следующего, когда лимит исчерпан).
async function resetStatus(userId: string, game: string) {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { plan: true } });
  const isPremium = !!user && user.plan !== 'FREE';
  const row = await prisma.gameReset.findUnique({ where: { userId_game_date: { userId, game, date: today() } } });
  const used = row?.count ?? 0;
  const remaining = isPremium ? null : Math.max(0, FREE_DAILY_RESETS - used);
  const nextResetAt = !isPremium && remaining === 0 ? nextUtcMidnightISO() : null;
  return { isPremium, used, remaining, nextResetAt, allowed: isPremium || (remaining ?? 0) > 0 };
}

// GET /api/games/balance?game=roulette — постоянный баланс + статус сброса.
export async function GET(req: NextRequest) {
  try {
    const userId = req.headers.get('x-user-id');
    if (!userId) return NextResponse.json({ error: 'Требуется авторизация' }, { status: 401 });

    const game = parseGame(new URL(req.url).searchParams.get('game'));
    if (!game) return NextResponse.json({ error: 'Неизвестная игра' }, { status: 400 });

    let row = await prisma.gameBalance.findUnique({ where: { userId_game: { userId, game } } });
    if (!row) row = await prisma.gameBalance.create({ data: { userId, game, balance: START_BALANCE } });

    return NextResponse.json({ balance: row.balance, reset: await resetStatus(userId, game) });
  } catch (error) {
    console.error('Get game balance error:', error);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}

// PUT /api/games/balance  body { game, balance } — сохранить текущий баланс.
export async function PUT(req: NextRequest) {
  try {
    const userId = req.headers.get('x-user-id');
    if (!userId) return NextResponse.json({ error: 'Требуется авторизация' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const game = parseGame(body?.game ?? null);
    if (!game) return NextResponse.json({ error: 'Неизвестная игра' }, { status: 400 });

    const n = Number(body?.balance);
    if (!Number.isFinite(n)) return NextResponse.json({ error: 'Некорректный баланс' }, { status: 400 });
    const balance = Math.max(0, Math.min(MAX_BALANCE, Math.floor(n)));

    const row = await prisma.gameBalance.upsert({
      where: { userId_game: { userId, game } },
      update: { balance },
      create: { userId, game, balance },
    });
    return NextResponse.json({ balance: row.balance });
  } catch (error) {
    console.error('Save game balance error:', error);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}
