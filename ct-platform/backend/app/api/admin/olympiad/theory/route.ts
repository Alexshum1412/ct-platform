import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { parseTags, stringifyTags } from '@/lib/utils';
import { isOlympiadLevel } from '@/lib/olympiad';

export const dynamic = 'force-dynamic';

// GET /api/admin/olympiad/theory?subjectId=&q= — список статей теории повышенного уровня.
export async function GET(req: NextRequest) {
  try {
    const sp = new URL(req.url).searchParams;
    const where: Record<string, unknown> = {};
    const subjectId = sp.get('subjectId');
    if (subjectId) where.subjectId = subjectId;
    const q = sp.get('q')?.trim();
    if (q) where.title = { contains: q, mode: 'insensitive' };

    const articles = await prisma.olympiadTheory.findMany({
      where,
      orderBy: [{ order: 'asc' }, { createdAt: 'desc' }],
      include: { subject: { select: { id: true, slug: true, name: true } } },
    });
    return NextResponse.json({ articles: articles.map(a => ({ ...a, tags: parseTags(a.tags) })) });
  } catch (error) {
    console.error('Admin olympiad theory list error:', error);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}

// POST /api/admin/olympiad/theory — создать статью.
export async function POST(req: NextRequest) {
  try {
    const b = await req.json();
    if (!b.subjectId || !b.title || !b.content) {
      return NextResponse.json({ error: 'subjectId, title и content обязательны' }, { status: 400 });
    }
    const article = await prisma.olympiadTheory.create({
      data: {
        subjectId: b.subjectId,
        title: String(b.title).slice(0, 300),
        content: b.content,
        level: isOlympiadLevel(b.level) ? b.level : 'REGION',
        topic: b.topic || null,
        order: Number(b.order) || 0,
        tags: stringifyTags(b.tags),
        status: 'ACTIVE',
      },
    });
    return NextResponse.json(article, { status: 201 });
  } catch (error) {
    console.error('Admin olympiad theory create error:', error);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}
