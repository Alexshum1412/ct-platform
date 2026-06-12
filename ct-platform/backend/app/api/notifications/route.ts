import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// GET /api/notifications — последние уведомления пользователя + счётчик непрочитанных.
export async function GET(req: NextRequest) {
  try {
    const userId = req.headers.get('x-user-id');
    if (!userId) return NextResponse.json({ error: 'Требуется авторизация' }, { status: 401 });

    const [notifications, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 30,
      }),
      prisma.notification.count({ where: { userId, isRead: false } }),
    ]);

    return NextResponse.json({ notifications, unreadCount });
  } catch (error) {
    console.error('List notifications error:', error);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}

// PATCH /api/notifications — пометить прочитанными: { ids: string[] } или { all: true }.
export async function PATCH(req: NextRequest) {
  try {
    const userId = req.headers.get('x-user-id');
    if (!userId) return NextResponse.json({ error: 'Требуется авторизация' }, { status: 401 });

    const b = await req.json().catch(() => ({}));
    const all = b.all === true;
    const ids: string[] = Array.isArray(b.ids) ? b.ids.filter((x: unknown) => typeof x === 'string').slice(0, 100) : [];
    if (!all && ids.length === 0) return NextResponse.json({ error: 'Укажите ids или all' }, { status: 400 });

    const { count } = await prisma.notification.updateMany({
      where: { userId, isRead: false, ...(all ? {} : { id: { in: ids } }) },
      data: { isRead: true },
    });
    return NextResponse.json({ success: true, count });
  } catch (error) {
    console.error('Mark notifications error:', error);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}
