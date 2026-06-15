import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  GRID, PALETTE, START_FILL, FREE_DAILY, BONUS_CAP, PIXEL_PRICE,
  isValidColor, inBounds, getClientIp, serverToday, serverMonth,
  ensureCurrentPeriod, quotaStatus,
} from '@/lib/pixel-art';

export const dynamic = 'force-dynamic';

const CONFIG = {
  grid: GRID,
  palette: PALETTE,
  startFill: START_FILL,
  freeDaily: FREE_DAILY,
  bonusCap: BONUS_CAP,
  pixelPrice: PIXEL_PRICE,
};

// GET /api/pixel-art[?since=ISO] — состояние полотна + дневная квота по IP.
// since → отдаём только клетки, изменённые позже (инкрементальный поллинг).
export async function GET(req: NextRequest) {
  try {
    await ensureCurrentPeriod();
    const sinceParam = new URL(req.url).searchParams.get('since');
    const since = sinceParam ? new Date(sinceParam) : null;
    const where = since && !isNaN(since.getTime()) ? { updatedAt: { gt: since } } : {};

    const pixels = await prisma.pixel.findMany({
      where,
      select: { x: true, y: true, color: true, updatedAt: true },
      orderBy: { updatedAt: 'asc' },
    });

    const ip = getClientIp(req);
    return NextResponse.json({
      config: CONFIG,
      month: serverMonth(),
      serverTime: new Date().toISOString(),
      incremental: !!where.updatedAt,
      pixels: pixels.map((p) => ({ x: p.x, y: p.y, c: p.color })),
      quota: await quotaStatus(ip),
    });
  } catch (e) {
    console.error('Pixel-art GET error:', e);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}

// POST /api/pixel-art  body { x, y, color } — закрасить клетку (лимит по IP).
export async function POST(req: NextRequest) {
  try {
    await ensureCurrentPeriod();
    const body = await req.json().catch(() => ({}));
    const x = Number(body?.x), y = Number(body?.y), color = body?.color;

    if (!inBounds(x, y)) {
      return NextResponse.json({ error: 'Клетка вне полотна' }, { status: 400 });
    }
    if (!isValidColor(color)) {
      return NextResponse.json({ error: 'Недопустимый цвет' }, { status: 400 });
    }

    const ip = getClientIp(req);
    const userId = req.headers.get('x-user-id'); // опционально (если авторизован)
    const date = serverToday();

    // Гарантируем строку квоты и считаем лимит на сегодня (база + докупленный bonus).
    const q = await prisma.pixelQuota.upsert({
      where: { ip_date: { ip, date } },
      update: {},
      create: { ip, date },
    });
    const limit = FREE_DAILY + q.bonus;

    // Атомарный резерв: инкремент только если used < limit (Postgres-блокировка
    // строки делает это гонко-безопасным — параллельные закраски не превысят лимит).
    const reserved = await prisma.pixelQuota.updateMany({
      where: { ip, date, used: { lt: limit } },
      data: { used: { increment: 1 } },
    });
    if (reserved.count === 0) {
      const quota = await quotaStatus(ip);
      return NextResponse.json(
        {
          error: 'Дневной лимит исчерпан',
          code: 'PIXEL_LIMIT_REACHED',
          quota,
          message: `Вы закрасили ${quota.used} из ${quota.limit} клеток на сегодня. Лимит обнулится в 00:00.`,
        },
        { status: 429 },
      );
    }

    // Перезаписываем клетку (новый пиксель поверх старого).
    await prisma.pixel.upsert({
      where: { x_y: { x, y } },
      update: { color, ip, userId: userId || undefined },
      create: { x, y, color, ip, userId: userId || undefined },
    });

    return NextResponse.json({
      ok: true,
      pixel: { x, y, c: color },
      quota: await quotaStatus(ip),
    });
  } catch (e) {
    console.error('Pixel-art POST error:', e);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}
