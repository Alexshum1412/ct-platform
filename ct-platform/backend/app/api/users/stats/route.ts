import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const userId = req.headers.get('x-user-id');
    if (!userId) return NextResponse.json({ error: 'Требуется авторизация' }, { status: 401 });

    const progress = await prisma.userProgress.findMany({
      where: { userId },
      include: {
        question: {
          select: {
            subjectId: true,
            topicId: true,
            section: true,
            difficulty: true,
            subject: { select: { name: true, slug: true, color: true } },
            topic: { select: { id: true, name: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { streakDays: true, xp: true, level: true, lastStudyDate: true },
    });

    const totalSolved = progress.length;
    const correctCount = progress.filter(p => p.isCorrect).length;
    const totalTime = progress.reduce((sum, p) => sum + p.timeSpent, 0);
    const accuracy = totalSolved > 0 ? Math.round((correctCount / totalSolved) * 100) : 0;

    // Group by subject
    const bySubjectMap: Record<string, { subjectId: string; subjectName: string; color: string; slug: string; total: number; correct: number; byTopic: Record<string, { topicId: string; topicName: string; total: number; correct: number }> }> = {};

    for (const p of progress) {
      const q = p.question;
      if (!q) continue;
      const sid = q.subjectId;
      if (!bySubjectMap[sid]) {
        bySubjectMap[sid] = {
          subjectId: sid,
          subjectName: q.subject.name,
          color: q.subject.color ?? '#6366f1',
          slug: q.subject.slug,
          total: 0, correct: 0,
          byTopic: {},
        };
      }
      bySubjectMap[sid].total++;
      if (p.isCorrect) bySubjectMap[sid].correct++;

      if (q.topicId && q.topic) {
        const tid = q.topicId;
        if (!bySubjectMap[sid].byTopic[tid]) {
          bySubjectMap[sid].byTopic[tid] = {
            topicId: tid,
            topicName: q.topic.name,
            total: 0, correct: 0,
          };
        }
        bySubjectMap[sid].byTopic[tid].total++;
        if (p.isCorrect) bySubjectMap[sid].byTopic[tid].correct++;
      }
    }

    const bySubject = Object.values(bySubjectMap).map(s => ({
      subjectId: s.subjectId,
      subjectName: s.subjectName,
      color: s.color,
      slug: s.slug,
      totalSolved: s.total,
      correctCount: s.correct,
      accuracy: s.total > 0 ? Math.round((s.correct / s.total) * 100) : 0,
      byTopic: Object.values(s.byTopic).map(t => ({
        topicId: t.topicId,
        topicName: t.topicName,
        totalSolved: t.total,
        correctCount: t.correct,
        accuracy: t.total > 0 ? Math.round((t.correct / t.total) * 100) : 0,
      })),
    }));

    // Recent activity (last 7 days)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const recentActivity = progress.filter(p => new Date(p.createdAt) >= sevenDaysAgo);
    const recentByDay: Record<string, { total: number; correct: number }> = {};
    for (const p of recentActivity) {
      const day = new Date(p.createdAt).toISOString().split('T')[0];
      if (!recentByDay[day]) recentByDay[day] = { total: 0, correct: 0 };
      recentByDay[day].total++;
      if (p.isCorrect) recentByDay[day].correct++;
    }

    // Exam history count
    const examCount = await prisma.examAttempt.count({ where: { userId, isCompleted: true } });
    const bestExam = await prisma.examAttempt.findFirst({
      where: { userId, isCompleted: true },
      orderBy: { percentage: 'desc' },
      select: { percentage: true, score: true, maxScore: true },
    });

    return NextResponse.json({
      totalSolved,
      correctCount,
      accuracy,
      totalTime,
      streakDays: user?.streakDays ?? 0,
      xp: user?.xp ?? 0,
      level: user?.level ?? 1,
      bySubject,
      recentActivity: recentByDay,
      examCount,
      bestExamScore: bestExam?.percentage ?? 0,
    });
  } catch (error) {
    console.error('Get user stats error:', error);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}
