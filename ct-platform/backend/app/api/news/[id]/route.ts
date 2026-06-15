import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// GET /api/news/:id — одна опубликованная статья (публично).
export async function GET(_: Request, { params }: { params: { id: string } }) {
  try {
    const item = await prisma.newsArticle.findUnique({ where: { id: params.id } });
    if (!item || !item.published) return NextResponse.json({ error: 'Статья не найдена' }, { status: 404 });
    return NextResponse.json(item);
  } catch (e) {
    console.error('Public news detail error:', e);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}
