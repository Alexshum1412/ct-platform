import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    const userId = req.headers.get('x-user-id');
    if (!userId) return NextResponse.json({ error: 'Требуется авторизация' }, { status: 401 });

    const attempts = await prisma.examAttempt.findMany({
      where: { userId, isCompleted: true },
      orderBy: { startedAt: 'desc' },
      take: 20,
      include: {
        questions: { select: { isCorrect: true } },
      },
    });

    const subject = await prisma.subject.findMany({
      where: { id: { in: attempts.map(a => a.subjectId) } },
      select: { id: true, name: true, color: true, slug: true },
    });
    const subjectMap = Object.fromEntries(subject.map(s => [s.id, s]));

    return NextResponse.json(attempts.map(a => ({
      id: a.id,
      subjectId: a.subjectId,
      subjectName: subjectMap[a.subjectId]?.name ?? 'Неизвестный предмет',
      subjectColor: subjectMap[a.subjectId]?.color ?? '#6366f1',
      subjectSlug: subjectMap[a.subjectId]?.slug ?? '',
      score: a.score,
      maxScore: a.maxScore,
      percentage: a.percentage,
      startedAt: a.startedAt,
      completedAt: a.completedAt,
      totalTime: a.totalTime,
    })));
  } catch (error) {
    console.error('Exam history error:', error);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}
