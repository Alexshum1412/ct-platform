import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { formatProblemCard, isOlympiadLevel } from '@/lib/olympiad';

export const dynamic = 'force-dynamic';

// GET /api/olympiad/problems?subjectId=<id|slug>&level=&topic=&year=&q=&limit=&offset=
// Публичный список олимпиадных задач (карточки без условий/ответов).
// Если запрос авторизован (middleware проставил x-user-id) — добавляем статус решения.
export async function GET(req: NextRequest) {
  try {
    const sp = new URL(req.url).searchParams;
    const userId = req.headers.get('x-user-id');

    const where: Record<string, unknown> = { status: 'ACTIVE' };

    const subjectParam = sp.get('subjectId');
    if (subjectParam) {
      const subject = await prisma.subject.findFirst({
        where: { OR: [{ id: subjectParam }, { slug: subjectParam }] },
        select: { id: true },
      });
      if (!subject) return NextResponse.json({ error: 'Предмет не найден' }, { status: 404 });
      where.subjectId = subject.id;
    }

    const level = sp.get('level');
    if (level && isOlympiadLevel(level)) where.level = level;

    const topic = sp.get('topic');
    if (topic) where.topic = topic;

    const year = Number(sp.get('year'));
    if (Number.isInteger(year) && year > 1990) where.year = year;

    const q = sp.get('q')?.trim();
    if (q) {
      where.OR = [
        { title: { contains: q, mode: 'insensitive' } },
        { content: { contains: q, mode: 'insensitive' } },
      ];
    }

    const limit = Math.min(Math.max(Number(sp.get('limit')) || 60, 1), 100);
    const offset = Math.max(Number(sp.get('offset')) || 0, 0);

    const [total, problems] = await Promise.all([
      prisma.olympiadProblem.count({ where }),
      prisma.olympiadProblem.findMany({
        where,
        // points коррелируют с уровнем этапа → стабильный порядок «от школьного к республиканскому»
        orderBy: [{ points: 'asc' }, { difficulty: 'asc' }, { createdAt: 'asc' }],
        take: limit,
        skip: offset,
      }),
    ]);

    // Доступные значения фильтров (по выбранному предмету, без level/topic/year-среза)
    const facetWhere = { status: 'ACTIVE', ...(where.subjectId ? { subjectId: where.subjectId } : {}) };
    const [topicRows, yearRows] = await Promise.all([
      prisma.olympiadProblem.findMany({ where: { ...facetWhere, topic: { not: null } }, select: { topic: true }, distinct: ['topic'], orderBy: { topic: 'asc' } }),
      prisma.olympiadProblem.findMany({ where: { ...facetWhere, year: { not: null } }, select: { year: true }, distinct: ['year'], orderBy: { year: 'desc' } }),
    ]);

    // Статус решения текущего пользователя для задач на странице
    let attemptMap: Record<string, { solved: boolean; revealed: boolean; tries: number }> = {};
    if (userId && problems.length > 0) {
      const attempts = await prisma.olympiadAttempt.findMany({
        where: { userId, problemId: { in: problems.map(p => p.id) } },
        select: { problemId: true, isCorrect: true, revealed: true, tries: true },
      });
      attemptMap = Object.fromEntries(attempts.map(a => [a.problemId, { solved: a.isCorrect, revealed: a.revealed, tries: a.tries }]));
    }

    return NextResponse.json({
      problems: problems.map(p => ({ ...formatProblemCard(p), my: attemptMap[p.id] ?? null })),
      total,
      limit,
      offset,
      facets: {
        topics: topicRows.map(r => r.topic).filter(Boolean),
        years: yearRows.map(r => r.year).filter((y): y is number => y != null),
      },
    });
  } catch (error) {
    console.error('Olympiad problems list error:', error);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}
