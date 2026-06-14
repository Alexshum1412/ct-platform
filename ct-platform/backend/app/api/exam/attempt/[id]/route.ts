import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { parseOptions } from '@/lib/utils';

export const dynamic = 'force-dynamic';

// GET /api/exam/attempt/:id — полный разбор прошлой попытки (свои ответы +
// верные ответы + объяснения/решения). Доступен только владельцу попытки.
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const userId = req.headers.get('x-user-id');
    if (!userId) return NextResponse.json({ error: 'Требуется авторизация' }, { status: 401 });

    const attempt = await prisma.examAttempt.findUnique({
      where: { id: params.id },
      include: { questions: { orderBy: { order: 'asc' } } },
    });
    if (!attempt || attempt.userId !== userId) {
      return NextResponse.json({ error: 'Попытка не найдена' }, { status: 404 });
    }

    const qids = attempt.questions.map((q) => q.questionId);
    const questions = await prisma.question.findMany({
      where: { id: { in: qids } },
      select: {
        id: true, content: true, options: true, imageUrl: true, part: true,
        topicId: true, subtopicId: true, correctAnswer: true, explanation: true, solution: true,
      },
    });
    const byId = new Map(questions.map((q) => [q.id, q]));

    const subject = await prisma.subject.findFirst({
      where: { OR: [{ id: attempt.subjectId }, { slug: attempt.subjectId }] },
      select: { slug: true, name: true, color: true },
    });
    let examTitle: string | null = null;
    if (attempt.examId) {
      const ex = await prisma.exam.findUnique({ where: { id: attempt.examId }, select: { title: true } });
      examTitle = ex?.title ?? null;
    }

    const items = attempt.questions.map((eq) => {
      const q = byId.get(eq.questionId);
      const opts = q ? (parseOptions(q.options) as Array<{ id: string; text: string }> | null) : null;
      return {
        questionId: eq.questionId,
        content: q?.content ?? '(задание удалено)',
        imageUrl: q?.imageUrl ?? null,
        options: opts ? opts.map((o) => ({ id: o.id, text: o.text })) : null,
        part: q?.part ?? null,
        topicId: q?.topicId ?? null,
        subtopicId: q?.subtopicId ?? null,
        userAnswer: eq.userAnswer ?? '',
        correctAnswer: q?.correctAnswer ?? '',
        isCorrect: !!eq.isCorrect,
        explanation: q?.explanation ?? '',
        solution: q?.solution ?? null,
      };
    });

    return NextResponse.json({
      id: attempt.id,
      examId: attempt.examId,
      examTitle,
      subjectSlug: subject?.slug ?? '',
      subjectName: subject?.name ?? 'Экзамен',
      subjectColor: subject?.color ?? '#6366f1',
      score: attempt.score,
      maxScore: attempt.maxScore,
      percentage: attempt.percentage,
      totalTime: attempt.totalTime,
      startedAt: attempt.startedAt,
      completedAt: attempt.completedAt,
      items,
    });
  } catch (error) {
    console.error('Exam attempt detail error:', error);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}
