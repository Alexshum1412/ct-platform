import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { formatProblemFull, formatProblemPublic } from '@/lib/olympiad';

export const dynamic = 'force-dynamic';

// GET /api/olympiad/problems/:id — полное условие задачи.
// Ответ и разбор отдаются ТОЛЬКО если пользователь уже решил задачу или раскрыл разбор.
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const userId = req.headers.get('x-user-id');

    const problem = await prisma.olympiadProblem.findUnique({
      where: { id: params.id },
      include: { subject: { select: { id: true, slug: true, name: true, icon: true, color: true } } },
    });
    if (!problem || problem.status !== 'ACTIVE') {
      return NextResponse.json({ error: 'Задача не найдена' }, { status: 404 });
    }

    let my: { solved: boolean; revealed: boolean; tries: number; pointsEarned: number } | null = null;
    if (userId) {
      const attempt = await prisma.olympiadAttempt.findUnique({
        where: { userId_problemId: { userId, problemId: problem.id } },
      });
      if (attempt) my = { solved: attempt.isCorrect, revealed: attempt.revealed, tries: attempt.tries, pointsEarned: attempt.pointsEarned };
    }

    const unlocked = !!my && (my.solved || my.revealed);
    const data = unlocked ? formatProblemFull(problem) : formatProblemPublic(problem);

    return NextResponse.json({ problem: data, my });
  } catch (error) {
    console.error('Olympiad problem detail error:', error);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}
