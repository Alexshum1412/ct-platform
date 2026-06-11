import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { parseTags } from '@/lib/utils';
import { isOlympiadLevel } from '@/lib/olympiad';

export const dynamic = 'force-dynamic';

// GET /api/olympiad/theory?subjectId=<id|slug>&level=&q= — теория повышенного уровня (список).
export async function GET(req: NextRequest) {
  try {
    const sp = new URL(req.url).searchParams;
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

    const q = sp.get('q')?.trim();
    if (q) {
      where.OR = [
        { title: { contains: q, mode: 'insensitive' } },
        { content: { contains: q, mode: 'insensitive' } },
      ];
    }

    const articles = await prisma.olympiadTheory.findMany({
      where,
      orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
      select: {
        id: true, subjectId: true, title: true, level: true, topic: true, tags: true, order: true,
        content: true,
        subject: { select: { id: true, slug: true, name: true, icon: true, color: true } },
      },
    });

    return NextResponse.json({
      articles: articles.map(a => ({
        ...a,
        tags: parseTags(a.tags),
        // в списке отдаём только превью (полный текст — в /theory/:id)
        content: undefined,
        preview: a.content.replace(/\$[^$]*\$/g, ' … ').slice(0, 180),
      })),
    });
  } catch (error) {
    console.error('Olympiad theory list error:', error);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}
