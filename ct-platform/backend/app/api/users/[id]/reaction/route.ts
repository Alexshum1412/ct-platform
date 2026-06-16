import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// POST /api/users/:id/reaction  body { value: 1 | -1 | 0 }
// Лайк/дизлайк профиля. Требует авторизации (middleware прокидывает x-user-id из
// токена и на публичных роутах). Повторный тот же value снимает оценку; 0 — снять.
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const toUserId = params.id;
    const fromUserId = req.headers.get('x-user-id');
    if (!fromUserId) return NextResponse.json({ error: 'Требуется авторизация' }, { status: 401 });
    if (fromUserId === toUserId) return NextResponse.json({ error: 'Нельзя оценивать свой профиль' }, { status: 400 });

    const body = await req.json().catch(() => ({}));
    const value = Number(body?.value);
    if (![1, -1, 0].includes(value)) return NextResponse.json({ error: 'Некорректная реакция' }, { status: 400 });

    const target = await prisma.user.findUnique({ where: { id: toUserId }, select: { id: true } });
    if (!target) return NextResponse.json({ error: 'Пользователь не найден' }, { status: 404 });

    const key = { fromUserId_toUserId: { fromUserId, toUserId } };
    if (value === 0) {
      await prisma.profileReaction.deleteMany({ where: { fromUserId, toUserId } });
    } else {
      const existing = await prisma.profileReaction.findUnique({ where: key });
      if (existing && existing.value === value) {
        await prisma.profileReaction.delete({ where: key }); // повторное нажатие — снять
      } else {
        await prisma.profileReaction.upsert({ where: key, update: { value }, create: { fromUserId, toUserId, value } });
      }
    }

    const [likes, dislikes, mineRow] = await Promise.all([
      prisma.profileReaction.count({ where: { toUserId, value: 1 } }),
      prisma.profileReaction.count({ where: { toUserId, value: -1 } }),
      prisma.profileReaction.findUnique({ where: key }),
    ]);
    return NextResponse.json({ likes, dislikes, mine: mineRow?.value ?? 0 });
  } catch (e) {
    console.error('Profile reaction error:', e);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}
