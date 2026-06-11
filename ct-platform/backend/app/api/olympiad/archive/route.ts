import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// GET /api/olympiad/archive?subjectId=<id|slug>
// Архив олимпиад: группировка задач по годам и этапам (+ разрез по предметам).
export async function GET(req: NextRequest) {
  try {
    const subjectParam = new URL(req.url).searchParams.get('subjectId');

    const where: Record<string, unknown> = { status: 'ACTIVE', year: { not: null } };
    if (subjectParam) {
      const subject = await prisma.subject.findFirst({
        where: { OR: [{ id: subjectParam }, { slug: subjectParam }] },
        select: { id: true },
      });
      if (!subject) return NextResponse.json({ error: 'Предмет не найден' }, { status: 404 });
      where.subjectId = subject.id;
    }

    const grouped = await prisma.olympiadProblem.groupBy({
      by: ['year', 'level', 'subjectId'],
      where,
      _count: { _all: true },
    });

    const subjectIds = Array.from(new Set(grouped.map(g => g.subjectId)));
    const subjects = await prisma.subject.findMany({
      where: { id: { in: subjectIds } },
      select: { id: true, slug: true, name: true, icon: true, color: true },
    });
    const subjectMap = new Map(subjects.map(s => [s.id, s]));

    // Формируем: годы (по убыванию) → этапы → предметы с количеством задач
    const byYear = new Map<number, Map<string, Array<{ subject: (typeof subjects)[number]; count: number }>>>();
    for (const g of grouped) {
      if (g.year == null) continue;
      const subject = subjectMap.get(g.subjectId);
      if (!subject) continue;
      if (!byYear.has(g.year)) byYear.set(g.year, new Map());
      const levels = byYear.get(g.year)!;
      if (!levels.has(g.level)) levels.set(g.level, []);
      levels.get(g.level)!.push({ subject, count: g._count._all });
    }

    const years = Array.from(byYear.entries())
      .sort((a, b) => b[0] - a[0])
      .map(([year, levels]) => ({
        year,
        levels: Array.from(levels.entries()).map(([level, entries]) => ({
          level,
          total: entries.reduce((s, e) => s + e.count, 0),
          subjects: entries.sort((a, b) => a.subject.name.localeCompare(b.subject.name, 'ru')),
        })),
      }));

    return NextResponse.json({ years });
  } catch (error) {
    console.error('Olympiad archive error:', error);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}
