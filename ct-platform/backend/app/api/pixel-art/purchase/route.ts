import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  BONUS_CAP, PIXEL_PRICE, PALETTE, GRID,
  getClientIp, serverToday, quotaStatus,
} from '@/lib/pixel-art';

export const dynamic = 'force-dynamic';

const GAMES = ['roulette', 'blackjack'];

/**
 * POST /api/pixel-art/purchase  body { game, pixels }
 * Докупка пикселей за виртуальную валюту мини-игр (1000 = 1 пиксель).
 * Доступно ТОЛЬКО авторизованным (списываем игровой баланс). Защищено на бэке:
 * атомарное списание + ограничение BONUS_CAP/день. На странице пиксель-арта
 * фронт это не показывает и не вызывает — обмен живёт только в рулетке/блэкджеке.
 */
export async function POST(req: NextRequest) {
  try {
    const userId = req.headers.get('x-user-id');
    if (!userId) return NextResponse.json({ error: 'Требуется авторизация' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const game = String(body?.game ?? '');
    const pixels = Math.floor(Number(body?.pixels));

    if (!GAMES.includes(game)) {
      return NextResponse.json({ error: 'Неизвестная игра' }, { status: 400 });
    }
    if (!Number.isInteger(pixels) || pixels < 1 || pixels > BONUS_CAP) {
      return NextResponse.json({ error: `Можно докупить от 1 до ${BONUS_CAP} пикселей` }, { status: 400 });
    }

    const ip = getClientIp(req);
    const date = serverToday();
    const cost = pixels * PIXEL_PRICE;

    // Строка квоты на сегодня + проверка дневного потолка докупки.
    const q = await prisma.pixelQuota.upsert({
      where: { ip_date: { ip, date } },
      update: {},
      create: { ip, date },
    });
    if (q.bonus + pixels > BONUS_CAP) {
      return NextResponse.json(
        { error: `Сегодня можно докупить не более ${BONUS_CAP} пикселей (уже докуплено ${q.bonus}).`, code: 'BONUS_CAP_REACHED' },
        { status: 400 },
      );
    }

    // Атомарное списание баланса (гонко-безопасно: списываем только если хватает).
    const charged = await prisma.gameBalance.updateMany({
      where: { userId, game, balance: { gte: cost } },
      data: { balance: { decrement: cost } },
    });
    if (charged.count === 0) {
      const bal = await prisma.gameBalance.findUnique({ where: { userId_game: { userId, game } } });
      return NextResponse.json(
        {
          error: 'Недостаточно валюты',
          code: 'INSUFFICIENT_FUNDS',
          balance: bal?.balance ?? 0,
          needed: cost,
        },
        { status: 402 },
      );
    }

    // Начисляем бонус-пиксели (с защитой от гонки по потолку). При сбое — возврат.
    const granted = await prisma.pixelQuota.updateMany({
      where: { ip, date, bonus: { lte: BONUS_CAP - pixels } },
      data: { bonus: { increment: pixels } },
    });
    if (granted.count === 0) {
      await prisma.gameBalance.updateMany({ where: { userId, game }, data: { balance: { increment: cost } } });
      return NextResponse.json({ error: 'Лимит докупки достигнут, средства возвращены', code: 'BONUS_CAP_REACHED' }, { status: 409 });
    }

    const bal = await prisma.gameBalance.findUnique({ where: { userId_game: { userId, game } } });
    return NextResponse.json({
      ok: true,
      bought: pixels,
      spent: cost,
      balance: bal?.balance ?? 0,
      quota: await quotaStatus(ip),
    });
  } catch (e) {
    console.error('Pixel-art purchase error:', e);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}

// GET /api/pixel-art/purchase — параметры обмена + текущая квота покупателя (по IP).
// Лёгкий запрос для панели докупки на игровых страницах (без выборки всех пикселей).
export async function GET(req: NextRequest) {
  const ip = getClientIp(req);
  return NextResponse.json({
    pixelPrice: PIXEL_PRICE,
    bonusCap: BONUS_CAP,
    grid: GRID,
    paletteSize: PALETTE.length,
    quota: await quotaStatus(ip),
  });
}
