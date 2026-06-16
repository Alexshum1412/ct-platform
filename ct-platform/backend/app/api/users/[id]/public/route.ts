import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// GET /api/users/:id/public — публичная карточка профиля (без приватных данных:
// email/пароль/настройки не отдаются). Доступно всем; если зритель авторизован,
// возвращаем его реакцию (лайк/дизлайк).
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const id = params.id;
    const user = await prisma.user.findUnique({
      where: { id },
      select: { id: true, name: true, image: true, createdAt: true, xp: true, level: true, streakDays: true, city: true, grade: true, role: true, plan: true },
    });
    if (!user) return NextResponse.json({ error: 'Пользователь не найден' }, { status: 404 });

    const [solvedTotal, correctTotal, achievements, pixelAgg, likes, dislikes] = await Promise.all([
      prisma.userProgress.count({ where: { userId: id } }),
      prisma.userProgress.count({ where: { userId: id, isCorrect: true } }),
      prisma.userAchievement.count({ where: { userId: id } }),
      prisma.pixelContribution.aggregate({ _sum: { count: true }, where: { userId: id } }),
      prisma.profileReaction.count({ where: { toUserId: id, value: 1 } }),
      prisma.profileReaction.count({ where: { toUserId: id, value: -1 } }),
    ]);

    const viewerId = req.headers.get('x-user-id');
    let mine = 0;
    if (viewerId && viewerId !== id) {
      const r = await prisma.profileReaction.findUnique({ where: { fromUserId_toUserId: { fromUserId: viewerId, toUserId: id } } });
      mine = r?.value ?? 0;
    }

    return NextResponse.json({
      user: {
        id: user.id, name: user.name, image: user.image, createdAt: user.createdAt,
        xp: user.xp, level: user.level, streakDays: user.streakDays,
        city: user.city, grade: user.grade,
        isPremium: user.plan !== 'FREE', isStaff: user.role === 'ADMIN' || user.role === 'MODERATOR',
      },
      stats: {
        solvedTotal, correctTotal,
        accuracy: solvedTotal > 0 ? Math.round((correctTotal / solvedTotal) * 100) : 0,
        achievements,
        pixels: pixelAgg._sum.count ?? 0,
      },
      reactions: { likes, dislikes, mine, isSelf: viewerId === id },
    });
  } catch (e) {
    console.error('Public profile error:', e);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}
