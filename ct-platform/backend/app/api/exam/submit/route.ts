import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { convertScore } from '@/lib/scoreConversion';
import { normalizeAnswer } from '@/lib/utils';

export const dynamic = 'force-dynamic';

const schema = z.object({
  attemptId: z.string().min(1),
  answers: z.record(z.string()),
});

export async function POST(req: NextRequest) {
  try {
    const userId = req.headers.get('x-user-id');
    if (!userId) return NextResponse.json({ error: 'Требуется авторизация' }, { status: 401 });

    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: 'Validation error' }, { status: 400 });

    const attempt = await prisma.examAttempt.findUnique({ where: { id: parsed.data.attemptId } });
    if (!attempt || attempt.userId !== userId) {
      return NextResponse.json({ error: 'Попытка не найдена' }, { status: 404 });
    }

    // Попытку нельзя сдать дважды — иначе результат можно «переписать»
    // после просмотра разбора (читерство в истории и достижениях).
    if (attempt.isCompleted) {
      return NextResponse.json(
        { error: 'Эта попытка уже завершена', code: 'ALREADY_SUBMITTED' },
        { status: 409 },
      );
    }

    // Get subject slug for score conversion (предмет хранится cuid'ом, но в
    // старых записях мог лежать slug — ищем по обоим).
    const subject = await prisma.subject.findFirst({
      where: { OR: [{ id: attempt.subjectId }, { slug: attempt.subjectId }] },
      select: { slug: true },
    });

    // Источник истины о составе экзамена — сам экзамен (attempt.examId), а НЕ
    // присланные клиентом ключи: иначе можно прислать ответы на произвольный
    // (более лёгкий) набор вопросов. Для старых попыток без examId
    // (легаси-поток) грейдим присланные ключи, как раньше.
    let questionIds = Object.keys(parsed.data.answers);
    let examDurationMinutes: number | null = null;
    if (attempt.examId) {
      const exam = await prisma.exam.findUnique({
        where: { id: attempt.examId },
        select: { questionIds: true, durationMinutes: true },
      });
      if (exam) {
        examDurationMinutes = exam.durationMinutes;
        try {
          const ids = JSON.parse(exam.questionIds);
          if (Array.isArray(ids) && ids.length > 0) questionIds = ids;
        } catch { /* повреждённый JSON — остаёмся на присланных ключах */ }
      }
    }

    // Серверный контроль времени: клиентский таймер можно подделать, поэтому
    // дедлайн проверяется по startedAt. Grace 5 минут покрывает сеть и
    // расхождение часов; легитимный клиент сабмитит сам по таймеру.
    const GRACE_MS = 5 * 60 * 1000;
    if (examDurationMinutes && Date.now() > attempt.startedAt.getTime() + examDurationMinutes * 60_000 + GRACE_MS) {
      // Закрываем попытку нулём, чтобы её нельзя было досдать позже.
      await prisma.examAttempt.update({
        where: { id: attempt.id },
        data: {
          isCompleted: true,
          completedAt: new Date(),
          score: 0,
          maxScore: questionIds.length,
          percentage: 0,
          totalTime: Math.max(0, Math.round((Date.now() - attempt.startedAt.getTime()) / 1000)),
        },
      });
      return NextResponse.json(
        { error: 'Время экзамена истекло — ответы не приняты', code: 'EXAM_TIME_EXPIRED' },
        { status: 410 },
      );
    }

    const questions = await prisma.question.findMany({
      where: { id: { in: questionIds } },
      select: { id: true, correctAnswer: true, explanation: true, solution: true, part: true },
    });
    const byId = new Map(questions.map(q => [q.id, q]));
    // Сохраняем порядок вопросов экзамена.
    const ordered = questionIds.map(id => byId.get(id)).filter(Boolean) as typeof questions;

    const results: Array<{
      questionId: string;
      isCorrect: boolean;
      userAnswer: string;
      correctAnswer: string;
      explanation: string;
      solution: string | null;
    }> = [];
    let correct = 0;

    for (const q of ordered) {
      const userAnswer = parsed.data.answers[q.id] ?? '';
      // Единая нормализация (как в практике): trim/lowercase/запятая→точка.
      const isCorrect = normalizeAnswer(userAnswer) === normalizeAnswer(q.correctAnswer);
      if (isCorrect) correct++;
      // Правильный ответ и объяснение возвращаются ТОЛЬКО здесь (после сдачи) —
      // в выдаче экзамена их больше нет (см. /api/exams/[id]).
      results.push({
        questionId: q.id,
        isCorrect,
        userAnswer,
        correctAnswer: q.correctAnswer,
        explanation: q.explanation,
        solution: q.solution,
      });
    }

    const maxScore = ordered.length;
    const percentage = maxScore > 0 ? Math.round((correct / maxScore) * 100) : 0;
    const testScore = convertScore(correct, subject?.slug ?? '', maxScore);
    // Фактическая длительность попытки (раньше totalTime всегда оставался 0).
    const totalTime = Math.max(0, Math.round((Date.now() - attempt.startedAt.getTime()) / 1000));

    await prisma.$transaction([
      prisma.examAttempt.update({
        where: { id: attempt.id },
        data: { score: correct, maxScore, percentage, isCompleted: true, completedAt: new Date(), totalTime },
      }),
      // Персистим поквестionный разбор (раньше ExamQuestion не создавались вовсе).
      prisma.examQuestion.createMany({
        data: results.map((r, i) => ({
          examAttemptId: attempt.id,
          questionId: r.questionId,
          order: i,
          userAnswer: r.userAnswer || null,
          isCorrect: r.isCorrect,
        })),
      }),
    ]);

    return NextResponse.json({ score: correct, maxScore, percentage, testScore, totalTime, results });
  } catch (error) {
    console.error('Submit exam error:', error);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}
