import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { stringifyTags } from '@/lib/utils';
import { formatProblemFull, isOlympiadLevel, LEVEL_POINTS, type OlympiadLevel } from '@/lib/olympiad';

export const dynamic = 'force-dynamic';

// GET /api/admin/olympiad/problems?subjectId=&level=&q=&limit=&offset= — полный список (с ответами).
export async function GET(req: NextRequest) {
  try {
    const sp = new URL(req.url).searchParams;
    const where: Record<string, unknown> = {};

    const subjectId = sp.get('subjectId');
    if (subjectId) where.subjectId = subjectId;

    const level = sp.get('level');
    if (level && isOlympiadLevel(level)) where.level = level;

    const q = sp.get('q')?.trim();
    if (q) {
      where.OR = [
        { title: { contains: q, mode: 'insensitive' } },
        { content: { contains: q, mode: 'insensitive' } },
      ];
    }

    const limit = Math.min(Math.max(Number(sp.get('limit')) || 50, 1), 200);
    const offset = Math.max(Number(sp.get('offset')) || 0, 0);

    const [total, problems] = await Promise.all([
      prisma.olympiadProblem.count({ where }),
      prisma.olympiadProblem.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
        include: { subject: { select: { id: true, slug: true, name: true } } },
      }),
    ]);

    return NextResponse.json({ problems: problems.map(formatProblemFull), total, limit, offset });
  } catch (error) {
    console.error('Admin olympiad list error:', error);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}

// POST /api/admin/olympiad/problems — создать задачу.
export async function POST(req: NextRequest) {
  try {
    const b = await req.json();
    if (!b.subjectId || !b.title || !b.content || !b.answer || !b.solution) {
      return NextResponse.json({ error: 'subjectId, title, content, answer и solution обязательны' }, { status: 400 });
    }
    const level: OlympiadLevel = isOlympiadLevel(b.level) ? b.level : 'SCHOOL';
    const difficulty = Math.min(Math.max(Number(b.difficulty) || 3, 1), 5);
    const points = Number.isFinite(Number(b.points)) && Number(b.points) > 0
      ? Math.min(Math.floor(Number(b.points)), 200)
      : LEVEL_POINTS[level];

    const problem = await prisma.olympiadProblem.create({
      data: {
        subjectId: b.subjectId,
        title: String(b.title).slice(0, 300),
        content: b.content,
        answer: String(b.answer).slice(0, 500),
        answerType: b.answerType === 'CHOICE' ? 'CHOICE' : 'TEXT',
        options: b.options ? (typeof b.options === 'string' ? b.options : JSON.stringify(b.options)) : null,
        solution: b.solution,
        hints: Array.isArray(b.hints) ? JSON.stringify(b.hints) : (typeof b.hints === 'string' ? b.hints : '[]'),
        level,
        difficulty,
        topic: b.topic || null,
        grade: b.grade || null,
        year: Number.isInteger(Number(b.year)) && Number(b.year) > 1990 ? Number(b.year) : null,
        points,
        tags: stringifyTags(b.tags),
        source: b.source || null,
        status: 'ACTIVE',
      },
    });
    return NextResponse.json(formatProblemFull(problem), { status: 201 });
  } catch (error) {
    console.error('Admin olympiad create error:', error);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}
