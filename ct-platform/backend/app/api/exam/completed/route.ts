import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// GET /api/exam/completed[?subjectId=] — ID пробных экзаменов, которые пользователь
// уже завершил (для пометки «решён ранее» в списке экзаменов).
export async function GET(req: NextRequest) {
  try {
    const userId = req.headers.get('x-user-id');
    if (!userId) return NextResponse.json({ error: 'Требуется авторизация' }, { status: 401 });

    const subjectId = new URL(req.url).searchParams.get('subjectId') || undefined;

    const attempts = await prisma.examAttempt.findMany({
      where: {
        userId,
        isCompleted: true,
        examId: { not: null },
        ...(subjectId ? { subjectId } : {}),
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
