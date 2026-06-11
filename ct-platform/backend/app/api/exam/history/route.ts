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
