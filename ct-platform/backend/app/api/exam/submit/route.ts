import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { convertScore } from '@/lib/scoreConversion';

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

    // Get subject slug for score conversion
    const subject = await prisma.subject.findUnique({ where: { id: attempt.subjectId }, select: { slug: true } });

    const questionIds = Object.keys(parsed.data.answers);
    const questions = await prisma.question.findMany({
      where: { id: { in: questionIds } },
      select: { id: true, correctAnswer: true, part: true },
    });

    const results: Array<{ questionId: string; isCorrect: boolean; userAnswer: string }> = [];
    let correct = 0;

    for (const q of questions) {
      const userAnswer = parsed.data.answers[q.id] ?? '';
      const isCorrect = userAnswer.trim().toLowerCase() === q.correctAnswer.trim().toLowerCase();
      if (isCorrect) correct++;
      results.push({ questionId: q.id, isCorrect, userAnswer });
    }

    const maxScore = questions.length;
    const percentage = maxScore > 0 ? Math.round((correct / maxScore) * 100) : 0;
    const testScore = convertScore(correct, subject?.slug ?? '', maxScore);

    await prisma.examAttempt.update({
      where: { id: attempt.id },
      data: { score: correct, maxScore, percentage, isCompleted: true, completedAt: new Date() },
    });

    return NextResponse.json({ score: correct, maxScore, percentage, testScore, results });
  } catch (error) {
    console.error('Submit exam error:', error);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}
