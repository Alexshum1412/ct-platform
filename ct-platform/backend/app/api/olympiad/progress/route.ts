import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { OLYMPIAD_LEVELS } from '@/lib/olympiad';

export const dynamic = 'force-dynamic';

// GET /api/olympiad/progress — мой прогресс по олимпиадному разделу
// (защищённый роут — middleware требует токен + подтверждённый email).
export async function GET(req: NextRequest) {
  try {
    const userId = req.headers.get('x-user-id');
    if (!userId) return NextResponse.json({ error: 'Требуется авторизация' }, { status: 401 });

    const [totals, attempts] = await Promise.all([
      prisma.olympiadProblem.groupBy({
        by: ['subjectId', 'level'],
        where: { status: 'ACTIVE' },
        _count: { _all: true },
      }),
      prisma.olympiadAttempt.findMany({
        where: { userId, isCorrect: true },
        select: { pointsEarned: true, problem: { select: { subjectId: true, level: true } } },
      }),
    ]);

    const subjectIds = Array.from(new Set(totals.map(t => t.subjectId)));
    const subjects = await prisma.subject.findMany({
      where: { id: { in: subjectIds } },
      select: { id: true, slug: true, name: true, icon: true, color: true },
    });
    const subjectMap = new Map(subjects.map(s => [s.id, s]));

    // Сводка по уровням
    const byLevel = Object.fromEntries(OLYMPIAD_LEVELS.map(l => [l, { total: 0, solved: 0 }]));
    for (const t of totals) {
      if (byLevel[t.level]) byLevel[t.level].total += t._count._all;
    }
    for (const a of attempts) {
      if (byLevel[a.problem.level]) byLevel[a.problem.level].solved += 1;
    }

    // Сводка по предметам
    const bySubject = new Map<string, { total: number; solved: number; points: number }>();
    for (const t of totals) {
      const row = bySubject.get(t.subjectId) ?? { total: 0, solved: 0, points: 0 };
      row.total += t._count._all;
      bySubject.set(t.subjectId, row);
    }
    for (const a of attempts) {
      const row = bySubject.get(a.problem.subjectId);
      if (row) {
        row.solved += 1;
        row.points += a.pointsEarned;
      }
    }

    const totalPoints = attempts.reduce((s, a) => s + a.pointsEarned, 0);

    return NextResponse.json({
      solved: attempts.length,
      totalProblems: totals.reduce((s, t) => s + t._count._all, 0),
      points: totalPoints,
      byLevel,
      bySubject: Array.from(bySubject.entries())
        .map(([subjectId, row]) => ({ subject: subjectMap.get(subjectId) ?? { id: subjectId, slug: '', name: '?', icon: null, color: null }, ...row }))
        .filter(r => r.total > 0)
        .sort((a, b) => b.solved - a.solved || b.total - a.total),
    });
  } catch (error) {
    console.error('Olympiad progress error:', error);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}
