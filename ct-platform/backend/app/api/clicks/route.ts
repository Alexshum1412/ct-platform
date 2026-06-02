import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

const COUNTER_ID = 'global-clicks';
const MAX_PER_REQUEST = 50; // защита от накрутки одним запросом

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
      if (typeof body?.count === 'number' && Number.isFinite(body.count)) {
        inc = Math.max(1, Math.min(MAX_PER_REQUEST, Math.floor(body.count)));
      }
    } catch {
      /* пустое тело — увеличиваем на 1 */
    }

    const row = await prisma.globalCounter.upsert({
      where: { id: COUNTER_ID },
      create: { id: COUNTER_ID, count: inc },
      update: { count: { increment: inc } },
    });

    return NextResponse.json({ total: row.count });
  } catch (error) {
    console.error('Increment clicks error:', error);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}
