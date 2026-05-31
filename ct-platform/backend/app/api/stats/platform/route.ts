import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const [totalQuestions, totalUsers, totalSolved, totalSubjects, todaySolved] = await Promise.all([
      prisma.question.count({ where: { status: 'ACTIVE' } }),
      prisma.user.count(),
      prisma.userProgress.count(),
      prisma.subject.count({ where: { isActive: true } }),
      prisma.userProgress.count({
        where: {
          createdAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
        },
      }),
    ]);

    const totalTopics = await prisma.topic.count();

    return NextResponse.json({
      totalQuestions,
      totalUsers,
      totalSolved,
      totalSubjects,
      totalTopics,
      todaySolved,
    });
  } catch (error) {
    console.error('Platform stats error:', error);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}
