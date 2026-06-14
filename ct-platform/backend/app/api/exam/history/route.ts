import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const userId = req.headers.get('x-user-id');
    if (!userId) return NextResponse.json({ error: 'Требуется авторизация' }, { status: 401 });

    const attempts = await prisma.examAttempt.findMany({
      where: { userId, isCompleted: true },
      orderBy: { startedAt: 'desc' },
      take: 20,
    });

    // В старых записях subjectId — это slug ('math'), в новых — cuid.
    // Ищем предметы по обоим ключам и строим карту id+slug → предмет,
    // чтобы история не показывала «Неизвестный предмет».
    const refs = Array.from(new Set(attempts.map(a => a.subjectId)));
    const subjects = await prisma.subject.findMany({
      where: { OR: [{ id: { in: refs } }, { slug: { in: refs } }] },
      select: { id: true, slug: true, name: true, color: true },
    });
    const subjectMap: Record<string, (typeof subjects)[number]> = {};
    for (const s of subjects) {
      subjectMap[s.id] = s;
      subjectMap[s.slug] = s;
    }

    // Названия конкретных экзаменов (для пометки, какой вариант сдавали).
    const examIds = Array.from(new Set(attempts.map(a => a.examId).filter(Boolean))) as string[];
    const exams = examIds.length
      ? await prisma.exam.findMany({ where: { id: { in: examIds } }, select: { id: true, title: true } })
      : [];
    const examTitleById = new Map(exams.map(e => [e.id, e.title]));

    return NextResponse.json(attempts.map(a => ({
      id: a.id,
      subjectId: a.subjectId,
      examId: a.examId,
      examTitle: a.examId ? (examTitleById.get(a.examId) ?? null) : null,
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
