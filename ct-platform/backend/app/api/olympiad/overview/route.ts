import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { OLYMPIAD_LEVELS } from '@/lib/olympiad';

export const dynamic = 'force-dynamic';

// GET /api/olympiad/overview — публичная сводка раздела:
// всего задач, разбивка по уровням и по предметам (для хаба «Олимпиады»).
export async function GET() {
  try {
    const totals = await prisma.olympiadProblem.groupBy({
      by: ['subjectId', 'level'],
      where: { status: 'ACTIVE' },
      _count: { _all: true },
    });

    const subjectIds = Array.from(new Set(totals.map(t => t.subjectId)));
    const subjects = await prisma.subject.findMany({
      where: { id: { in: subjectIds } },
      select: { id: true, slug: true, name: true, icon: true, color: true, order: true },
      orderBy: { order: 'asc' },
    });

    const byLevel = Object.fromEntries(OLYMPIAD_LEVELS.map(l => [l, 0]));
    const bySubjectMap = new Map<string, { total: number; byLevel: Record<string, number> }>();
    for (const t of totals) {
      if (byLevel[t.level] !== undefined) byLevel[t.level] += t._count._all;
      const row = bySubjectMap.get(t.subjectId) ?? { total: 0, byLevel: {} };
      row.total += t._count._all;
      row.byLevel[t.level] = (row.byLevel[t.level] ?? 0) + t._count._all;
      bySubjectMap.set(t.subjectId, row);
    }

    const theoryCount = await prisma.olympiadTheory.count({ where: { status: 'ACTIVE' } });

    return NextResponse.json({
      totalProblems: totals.reduce((s, t) => s + t._count._all, 0),
      theoryCount,
      byLevel,
      subjects: subjects.map(s => ({ subject: s, ...(bySubjectMap.get(s.id) ?? { total: 0, byLevel: {} }) })),
    });
  } catch (error) {
    console.error('Olympiad overview error:', error);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}
