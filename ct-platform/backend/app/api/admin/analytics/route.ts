import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    const role = req.headers.get('x-user-role');
    if (role !== 'ADMIN') return NextResponse.json({ error: 'Доступ запрещён' }, { status: 403 });

    const now = new Date();
    const dayStart = new Date(now); dayStart.setHours(0, 0, 0, 0);
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [
      totalUsers, premiumUsers, freeUsers,
      newUsersToday, newUsersWeek, newUsersMonth,
      totalQuestions, totalSolved, solvedToday, solvedWeek,
      examsTotal, examsToday, totalReports, pendingReports,
      activeUsersWeek,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { plan: { not: 'FREE' } } }),
      prisma.user.count({ where: { plan: 'FREE' } }),
      prisma.user.count({ where: { createdAt: { gte: dayStart } } }),
      prisma.user.count({ where: { createdAt: { gte: weekAgo } } }),
      prisma.user.count({ where: { createdAt: { gte: monthAgo } } }),
      prisma.question.count({ where: { status: 'ACTIVE' } }),
      prisma.userProgress.count(),
      prisma.userProgress.count({ where: { createdAt: { gte: dayStart } } }),
      prisma.userProgress.count({ where: { createdAt: { gte: weekAgo } } }),
      prisma.examAttempt.count({ where: { isCompleted: true } }),
      prisma.examAttempt.count({ where: { isCompleted: true, completedAt: { gte: dayStart } } }),
      prisma.questionReport.count(),
      prisma.questionReport.count({ where: { status: 'PENDING' } }),
      prisma.userProgress.findMany({
        where: { createdAt: { gte: weekAgo } },
        select: { userId: true },
        distinct: ['userId'],
      }).then(r => r.length),
    ]);

    // Top reported questions
    const topReports = await prisma.questionReport.groupBy({
      by: ['questionId'],
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 5,
    });

    const reportedQuestions = await prisma.question.findMany({
      where: { id: { in: topReports.map(r => r.questionId) } },
      select: { id: true, content: true, externalId: true },
    });

    // Daily activity for last 7 days
    const last7Days: Array<{ date: string; solved: number; users: number }> = [];
    for (let i = 6; i >= 0; i--) {
      const day = new Date(now);
      day.setDate(day.getDate() - i); day.setHours(0, 0, 0, 0);
      const nextDay = new Date(day); nextDay.setDate(nextDay.getDate() + 1);

      const [solved, uniqueUsers] = await Promise.all([
        prisma.userProgress.count({ where: { createdAt: { gte: day, lt: nextDay } } }),
        prisma.userProgress.findMany({
          where: { createdAt: { gte: day, lt: nextDay } },
          select: { userId: true }, distinct: ['userId'],
        }).then(r => r.length),
      ]);

      last7Days.push({
        date: day.toISOString().split('T')[0],
        solved, users: uniqueUsers,
      });
    }

    return NextResponse.json({
      users: { total: totalUsers, premium: premiumUsers, free: freeUsers, newToday: newUsersToday, newWeek: newUsersWeek, newMonth: newUsersMonth, activeWeek: activeUsersWeek },
      questions: { total: totalQuestions, totalSolved, solvedToday, solvedWeek },
      exams: { total: examsTotal, today: examsToday },
      reports: { total: totalReports, pending: pendingReports, top: topReports.map(t => ({ questionId: t.questionId, count: t._count.id, content: reportedQuestions.find(q => q.id === t.questionId)?.content?.substring(0, 100) ?? '', externalId: reportedQuestions.find(q => q.id === t.questionId)?.externalId ?? '' })) },
      activity: last7Days,
    });
  } catch (error) {
    console.error('Admin analytics error:', error);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}
