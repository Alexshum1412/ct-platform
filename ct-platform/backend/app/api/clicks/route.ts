import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { clickLimiter, checkRateLimit } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

const COUNTER_ID = 'global-clicks';
const MAX_PER_REQUEST = 50; // защита от накрутки одним запросом

function clientIp(req: NextRequest): string {
  const xff = req.headers.get('x-forwarded-for') || '';
  return xff.split(',')[0].trim() || req.headers.get('x-real-ip') || 'unknown';
}

// GET /api/clicks — текущий общий счётчик нажатий всех пользователей
export async function GET() {
  try {
    const row = await prisma.globalCounter.findUnique({ where: { id: COUNTER_ID } });
    return NextResponse.json({ total: row?.count ?? 0 });
  } catch (error) {
    console.error('Get clicks error:', error);
    return NextResponse.json({ total: 0 });
  }
}

// POST /api/clicks  body { count?: number } — увеличить общий счётчик (атомарно)
export async function POST(req: NextRequest) {
  try {
    let inc = 1;
    try {
      const body = await req.json();
      // Принимаем только конечное положительное число; всё прочее → 1.
      if (typeof body?.count === 'number' && Number.isFinite(body.count) && body.count > 0) {
        inc = Math.max(1, Math.min(MAX_PER_REQUEST, Math.floor(body.count)));
      }
    } catch {
      /* пустое тело — увеличиваем на 1 */
    }

    // Анти-накрутка: лимит по IP считается в КЛИКАХ (consume inc points).
    const rl = await checkRateLimit(clickLimiter, `click:${clientIp(req)}`, inc);
    if (!rl.allowed) {
      // Не наказываем пользователя ошибкой — просто не засчитываем, возвращаем текущий total.
      const cur = await prisma.globalCounter.findUnique({ where: { id: COUNTER_ID } });
      return NextResponse.json(
        { total: cur?.count ?? 0, throttled: true },
        { status: 429 },
      );
    }

    const row = await prisma.globalCounter.upsert({
      where: { id: COUNTER_ID },
      create: { id: COUNTER_ID, count: inc },
      update: { count: { increment: inc } },
    });

    // Персональный учёт кликов (для рейтинга кликеров) — только у авторизованных.
    // x-user-id выставляет middleware из валидного токена; гостевые клики анонимны.
    const userId = req.headers.get('x-user-id');
    if (userId) {
      const date = new Date().toISOString().slice(0, 10);
      try {
        await prisma.userClickDay.upsert({
          where: { userId_date: { userId, date } },
          create: { userId, date, count: inc },
          update: { count: { increment: inc } },
        });
      } catch { /* персональный учёт не критичен — общий счётчик уже обновлён */ }
    }

    return NextResponse.json({ total: row.count });
  } catch (error) {
    console.error('Increment clicks error:', error);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}
