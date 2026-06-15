import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { archiveAndClear, serverMonth, META_ID } from '@/lib/pixel-art';

export const dynamic = 'force-dynamic';

/**
 * Месячная архивация полотна пиксель-арта. Запускать 1-го числа в 00:00 по cron:
 *   curl -X POST -H "x-cron-secret: $CRON_SECRET" https://<backend>/api/cron/pixel-archive
 *
 * Делает снимок текущего полотна → PNG-архив под меткой завершившегося месяца,
 * очищает таблицу pixels и переводит полотно на новый месяц. Идемпотентно
 * (повторный вызов не создаёт дубль архива). Дополнительно тот же переход
 * выполняется лениво в ensureCurrentPeriod() — даже если cron не настроен.
 *
 * Защита: при заданном CRON_SECRET требуется заголовок x-cron-secret. Без него
 * разрешено только вне production (для локального теста).
 */
function authorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return process.env.NODE_ENV !== 'production';
  return req.headers.get('x-cron-secret') === secret;
}

function prevMonth(): string {
  const d = new Date();
  d.setDate(1);
  d.setMonth(d.getMonth() - 1);
  return serverMonth(d);
}

async function run(req: NextRequest) {
  if (!authorized(req)) {
    return NextResponse.json({ error: 'Доступ запрещён' }, { status: 403 });
  }
  const meta = await prisma.pixelMeta.findUnique({ where: { id: META_ID } });
  const now = serverMonth();
  // Архивируем месяц, к которому относится текущее полотно (или прошлый, если меты нет).
  const targetMonth = meta?.month && meta.month !== now ? meta.month : prevMonth();
  const result = await archiveAndClear(targetMonth);
  await prisma.pixelMeta.upsert({
    where: { id: META_ID },
    update: { month: now },
    create: { id: META_ID, month: now },
  });
  return NextResponse.json({ ok: true, archivedMonth: targetMonth, newMonth: now, ...result });
}

export async function POST(req: NextRequest) {
  try { return await run(req); }
  catch (e) { console.error('Cron pixel-archive error:', e); return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 }); }
}

// Разрешаем и GET (некоторые cron-провайдеры шлют GET).
export async function GET(req: NextRequest) {
  try { return await run(req); }
  catch (e) { console.error('Cron pixel-archive error:', e); return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 }); }
}
