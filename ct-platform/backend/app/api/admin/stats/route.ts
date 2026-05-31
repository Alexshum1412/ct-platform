import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    const role = req.headers.get('x-user-role');
    if (role !== 'ADMIN') {
      return NextResponse.json({ error: 'Доступ запрещён' }, { status: 403 });
    }

    const [totalUsers, totalQuestions, totalSolved, pendingReview] = await Promise.all([
      prisma.user.count(),
      prisma.question.count(),
      prisma.userProgress.count(),
      prisma.question.count({ where: { status: 'PENDING' } }),
    ]);

    return NextResponse.json({
      totalUsers,
      totalQuestions,
      totalSolved,
      pendingReview,
      newUsersToday: 0,
      activeUsers: 0,
    });
  } catch (error) {
    console.error('Get admin stats error:', error);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}
