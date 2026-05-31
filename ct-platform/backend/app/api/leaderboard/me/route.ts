import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    const userId = req.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json({ error: 'Требуется авторизация' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { xp: true, _count: { select: { progress: true } } },
    });

    if (!user) {
      return NextResponse.json({ error: 'Пользователь не найден' }, { status: 404 });
    }

    const rank = await prisma.user.count({
      where: { xp: { gt: user.xp } },
    }) + 1;

    const totalUsers = await prisma.user.count();
    const percentile = totalUsers > 0 ? Math.round(((totalUsers - rank + 1) / totalUsers) * 100) : 0;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const xpToday = await prisma.userProgress.count({
      where: { userId, isCorrect: true, createdAt: { gte: today } },
    });

    return NextResponse.json({ rank, xp: user.xp, xpToday, percentile });
  } catch (error) {
    console.error('Get user rank error:', error);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}
