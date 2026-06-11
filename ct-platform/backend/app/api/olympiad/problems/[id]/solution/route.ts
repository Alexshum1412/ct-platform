import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { formatProblemFull } from '@/lib/olympiad';

export const dynamic = 'force-dynamic';

// POST /api/olympiad/problems/:id/solution — «сдаться»: раскрыть разбор.
// Помечает попытку revealed=true → последующее решение очков не принесёт.
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const userId = req.headers.get('x-user-id');
    if (!userId) return NextResponse.json({ error: 'Требуется авторизация' }, { status: 401 });
    if (req.headers.get('x-user-verified') === 'false') {
      return NextResponse.json(
        { error: 'Подтвердите email, чтобы открывать разборы', code: 'EMAIL_NOT_VERIFIED' },
        { status: 403 },
      );
    }

    const problem = await prisma.olympiadProblem.findUnique({ where: { id: params.id } });
    if (!problem || problem.status !== 'ACTIVE') {
      return NextResponse.json({ error: 'Задача не найдена' }, { status: 404 });
    }

    const attempt = await prisma.olympiadAttempt.upsert({
      where: { userId_problemId: { userId, problemId: problem.id } },
      // tries не инкрементим — раскрытие разбора не попытка ответа
      update: { revealed: true },
      create: { userId, problemId: problem.id, revealed: true, tries: 0 },
    });

    return NextResponse.json({
      problem: formatProblemFull(problem),
      my: { solved: attempt.isCorrect, revealed: true, tries: attempt.tries, pointsEarned: attempt.pointsEarned },
    });
  } catch (error) {
    console.error('Olympiad solution reveal error:', error);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}
