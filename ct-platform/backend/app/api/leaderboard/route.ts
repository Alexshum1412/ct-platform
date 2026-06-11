import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// GET /api/leaderboard - Get leaderboard
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type') || 'global';
    const subjectId = searchParams.get('subjectId');
    // NaN-безопасно + потолок: ?limit=100000 раньше выгружал всех пользователей.
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '10', 10) || 10));

    let leaderboard: any[] = [];

    switch (type) {
      case 'global':
        leaderboard = await prisma.user.findMany({
          orderBy: [
            { xp: 'desc' },
            { level: 'desc' },
          ],
          take: limit,
          select: {
            id: true,
            name: true,
            image: true,
            xp: true,
            level: true,
            streakDays: true,
            city: true,
            school: true,
            _count: {
              select: {
                progress: true,
              },
            },
          },
        }).then((users) =>
          users.map((user, index) => ({
            rank: index + 1,
            userId: user.id,
            name: user.name ?? 'Пользователь',
            avatar: user.image,
            xp: user.xp,
            solved: user._count.progress,
            accuracy: 0,
            city: user.city,
            streak: user.streakDays,
          }))
        );
        break;

      case 'subject':
        // Get leaderboard by subject (based on solved questions)
        const subjectStats = await prisma.userProgress.groupBy({
          by: ['userId'],
          _count: {
            id: true,
          },
          where: {
            isCorrect: true,
            ...(subjectId ? { question: { subjectId } } : {}),
          },
          orderBy: {
            _count: {
              id: 'desc',
            },
          },
          take: limit,
        });

        const users = await prisma.user.findMany({
          where: {
            id: {
              in: subjectStats.map(s => s.userId),
            },
          },
          select: {
            id: true,
            name: true,
            image: true,
            xp: true,
            level: true,
          },
        });

        leaderboard = subjectStats.map((stat, index) => {
          const user = users.find((u) => u.id === stat.userId);
          return {
            rank: index + 1,
            userId: stat.userId,
            name: user?.name ?? 'Пользователь',
            avatar: user?.image,
            xp: user?.xp ?? 0,
            solved: stat._count.id,
            accuracy: 0,
            city: undefined,
            streak: 0,
          };
        });
        break;

      case 'city':
        const cityUsers = await prisma.user.findMany({
          where: { city: { not: null } },
          select: { city: true, xp: true, name: true },
        });

        const cityAggregate = cityUsers.reduce<Record<string, { totalXP: number; users: number; topXP: number; topUser: string }>>(
          (acc, user) => {
            if (!user.city) return acc;
            if (!acc[user.city]) {
              acc[user.city] = { totalXP: 0, users: 0, topXP: -1, topUser: '' };
            }
            acc[user.city].totalXP += user.xp;
            acc[user.city].users += 1;
            if (user.xp > acc[user.city].topXP) {
              acc[user.city].topXP = user.xp;
              acc[user.city].topUser = user.name ?? 'Пользователь';
            }
            return acc;
          },
          {}
        );

        leaderboard = Object.entries(cityAggregate)
          .map(([name, stats]) => ({ name, totalXP: stats.totalXP, users: stats.users, topUser: stats.topUser }))
          .sort((a, b) => b.totalXP - a.totalXP)
          .slice(0, limit)
          .map((row, index) => ({
            rank: index + 1,
            ...row,
          }));
        break;

      default:
        leaderboard = [];
    }

    return NextResponse.json({ leaderboard });
  } catch (error) {
    console.error('Get leaderboard error:', error);
    return NextResponse.json(
      { error: 'Ошибка сервера' },
      { status: 500 }
    );
  }
}
