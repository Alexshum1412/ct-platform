import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  GRID, PALETTE, START_FILL, FREE_DAILY, BONUS_CAP, PIXEL_PRICE,
  isValidColor, normalizeColor, inBounds, getClientIp, serverToday, serverMonth,
  ensureCurrentPeriod, quotaStatus, bumpContribution,
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

// POST /api/pixel-art
//   одиночная клетка: { x, y, color }
//   несколько (инструменты «линия»/«прямоугольник»): { pixels: [{x,y,color}, …] }
// Закраска ограничена дневным лимитом по IP (атомарно). Кладём столько клеток,
// сколько осталось в лимите (partial), и сообщаем placed/requested.
function limitReached(quota: Awaited<ReturnType<typeof quotaStatus>>) {
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

export async function POST(req: NextRequest) {
  try {
    await ensureCurrentPeriod();
    const body = await req.json().catch(() => ({}));
    const ip = getClientIp(req);
    const userId = req.headers.get('x-user-id'); // опционально (если авторизован)
    const date = serverToday();
    const month = serverMonth();

    // Список клеток: батч (pixels[]) или одиночная. Дедуп по координате (последний цвет).
    const raw: unknown[] = Array.isArray(body?.pixels) ? body.pixels : [{ x: body?.x, y: body?.y, color: body?.color }];
    const map = new Map<string, { x: number; y: number; color: string }>();
    for (const item of raw) {
      const p = item as { x?: unknown; y?: unknown; color?: unknown };
      const x = Number(p?.x), y = Number(p?.y);
      if (!inBounds(x, y) || !isValidColor(p?.color)) continue;
      map.set(`${x},${y}`, { x, y, color: normalizeColor(p.color as string) });
    }
    const desired = Array.from(map.values());
    if (desired.length === 0) return NextResponse.json({ error: 'Нет корректных клеток' }, { status: 400 });
    if (desired.length > 500) return NextResponse.json({ error: 'Слишком много клеток за раз' }, { status: 400 });

    // Гарантируем строку квоты и резервируем под N клеток (атомарно, гонко-безопасно).
    const q = await prisma.pixelQuota.upsert({ where: { ip_date: { ip, date } }, update: {}, create: { ip, date } });
    const limit = FREE_DAILY + q.bonus;
    let n = Math.min(desired.length, Math.max(0, limit - q.used));
    if (n <= 0) return limitReached(await quotaStatus(ip));

    // used + n <= limit гарантируется условием used <= limit - n (Postgres row-lock).
    let reserved = await prisma.pixelQuota.updateMany({ where: { ip, date, used: { lte: limit - n } }, data: { used: { increment: n } } });
    if (reserved.count === 0) {
      const cur = await prisma.pixelQuota.findUnique({ where: { ip_date: { ip, date } } });
      n = Math.min(desired.length, Math.max(0, limit - (cur?.used ?? limit)));
      if (n <= 0) return limitReached(await quotaStatus(ip));
      reserved = await prisma.pixelQuota.updateMany({ where: { ip, date, used: { lte: limit - n } }, data: { used: { increment: n } } });
      if (reserved.count === 0) return limitReached(await quotaStatus(ip));
    }

    // Перезаписываем клетки (новый пиксель поверх старого).
    const toPlace = desired.slice(0, n);
    for (const px of toPlace) {
      await prisma.pixel.upsert({
        where: { x_y: { x: px.x, y: px.y } },
        update: { color: px.color, ip, userId: userId || undefined },
        create: { x: px.x, y: px.y, color: px.color, ip, userId: userId || undefined },
      });
    }
    await bumpContribution(userId, month, toPlace.length);

    return NextResponse.json({
      ok: true,
      placed: toPlace.length,
      requested: desired.length,
      pixels: toPlace.map((p) => ({ x: p.x, y: p.y, c: p.color })),
      pixel: { x: toPlace[0].x, y: toPlace[0].y, c: toPlace[0].color }, // совместимость с одиночным ответом
      quota: await quotaStatus(ip),
    });
  } catch (e) {
    console.error('Pixel-art POST error:', e);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}
