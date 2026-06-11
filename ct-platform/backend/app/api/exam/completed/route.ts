import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// GET /api/exam/completed[?subjectId=] — ID пробных экзаменов, которые пользователь
// уже завершил (для пометки «решён ранее» в списке экзаменов).
// subjectId принимает cuid ИЛИ slug; в старых попытках subjectId — slug,
// в новых — cuid, поэтому фильтруем по обоим значениям.
export async function GET(req: NextRequest) {
  try {
    const userId = req.headers.get('x-user-id');
    if (!userId) return NextResponse.json({ error: 'Требуется авторизация' }, { status: 401 });

    const subjectRef = new URL(req.url).searchParams.get('subjectId') || undefined;

    let subjectFilter: { subjectId: { in: string[] } } | Record<string, never> = {};
    if (subjectRef) {
      const subject = await prisma.subject.findFirst({
        where: { OR: [{ id: subjectRef }, { slug: subjectRef }] },
        select: { id: true, slug: true },
      });
      const keys = subject ? [subject.id, subject.slug] : [subjectRef];
      subjectFilter = { subjectId: { in: keys } };
    }

    const attempts = await prisma.examAttempt.findMany({
      where: {
        userId,
        isCompleted: true,
        examId: { not: null },
        ...subjectFilter,
      },
      select: { examId: true },
    });

    const examIds = Array.from(new Set(attempts.map(a => a.examId).filter(Boolean))) as string[];
    return NextResponse.json({ examIds });
  } catch (error) {
    console.error('Completed exams error:', error);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}
