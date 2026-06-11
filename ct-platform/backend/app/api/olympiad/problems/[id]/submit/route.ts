import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { normalizeAnswer } from '@/lib/utils';
import { formatProblemFull } from '@/lib/olympiad';
import { checkOlympiadAchievements } from '@/lib/olympiad-achievements';

export const dynamic = 'force-dynamic';

// POST /api/olympiad/problems/:id/submit  body { answer }
// Проверка ответа — серверная. Очки начисляются РОВНО один раз за задачу
// (строка attempt уникальна по userId+problemId, pointsEarned выставляется, не
// инкрементится; XP выдаётся под атомарным флагом xpGranted). После раскрытия
// разбора (revealed) решение очков не приносит.
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const userId = req.headers.get('x-user-id');
    if (!userId) return NextResponse.json({ error: 'Требуется авторизация' }, { status: 401 });
    if (req.headers.get('x-user-verified') === 'false') {
      return NextResponse.json(
        { error: 'Подтвердите email, чтобы решать олимпиадные задачи', code: 'EMAIL_NOT_VERIFIED' },
        { status: 403 },
      );
    }

    const body = await req.json().catch(() => ({}));
    const rawAnswer = typeof body?.answer === 'string' ? body.answer : '';
    if (!rawAnswer.trim() || rawAnswer.length > 500) {
      return NextResponse.json({ error: 'Введите ответ' }, { status: 400 });
    }

    const problem = await prisma.olympiadProblem.findUnique({ where: { id: params.id } });
    if (!problem || problem.status !== 'ACTIVE') {
      return NextResponse.json({ error: 'Задача не найдена' }, { status: 404 });
    }

    const existing = await prisma.olympiadAttempt.findUnique({
      where: { userId_problemId: { userId, problemId: problem.id } },
    });

    // Уже решена — ответ не пересчитываем, очки не трогаем.
    if (existing?.isCorrect) {
      return NextResponse.json({
        correct: true,
        alreadySolved: true,
        pointsEarned: existing.pointsEarned,
        problem: formatProblemFull(problem),
      });
    }

    const correct = normalizeAnswer(rawAnswer) === normalizeAnswer(problem.answer);

    if (!correct) {
      const attempt = await prisma.olympiadAttempt.upsert({
        where: { userId_problemId: { userId, problemId: problem.id } },
        update: { tries: { increment: 1 }, lastAnswer: rawAnswer.slice(0, 200) },
        create: { userId, problemId: problem.id, lastAnswer: rawAnswer.slice(0, 200) },
      });
      return NextResponse.json({ correct: false, tries: attempt.tries });
    }

    // Верный ответ: revealed-задача очков не даёт (разбор уже был виден).
    const points = existing?.revealed ? 0 : problem.points;
    await prisma.olympiadAttempt.upsert({
      where: { userId_problemId: { userId, problemId: problem.id } },
      update: { isCorrect: true, pointsEarned: points, tries: { increment: 1 }, lastAnswer: rawAnswer.slice(0, 200) },
      create: { userId, problemId: problem.id, isCorrect: true, pointsEarned: points, lastAnswer: rawAnswer.slice(0, 200) },
    });

    // XP в общий профиль — атомарно, ровно один раз (защита от двойного сабмита).
    if (points > 0) {
      const granted = await prisma.olympiadAttempt.updateMany({
        where: { userId, problemId: problem.id, isCorrect: true, xpGranted: false },
        data: { xpGranted: true },
      });
      if (granted.count === 1) {
        await prisma.user.update({ where: { id: userId }, data: { xp: { increment: points } } });
      }
    }

    const unlockedAchievements = await checkOlympiadAchievements(userId);

    return NextResponse.json({
      correct: true,
      pointsEarned: points,
      problem: formatProblemFull(problem),
      unlockedAchievements,
    });
  } catch (error) {
    console.error('Olympiad submit error:', error);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}
