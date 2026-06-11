import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { parseTags } from '@/lib/utils';

export const dynamic = 'force-dynamic';

// GET /api/olympiad/theory/:id — статья теории повышенного уровня.
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const article = await prisma.olympiadTheory.findUnique({
      where: { id: params.id },
      include: { subject: { select: { id: true, slug: true, name: true, icon: true, color: true } } },
    });
    if (!article || article.status !== 'ACTIVE') {
      return NextResponse.json({ error: 'Статья не найдена' }, { status: 404 });
    }
    return NextResponse.json({ article: { ...article, tags: parseTags(article.tags) } });
  } catch (error) {
    console.error('Olympiad theory detail error:', error);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}
