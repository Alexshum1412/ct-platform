import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import type { Prisma } from '@prisma/client';

export const dynamic = 'force-dynamic';

const CATS = ['PERMANENT', 'NEWS', 'UPDATE'];

// GET /api/news?category=&limit= — опубликованные статьи (публично).
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const category = searchParams.get('category');
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '50', 10) || 50));
    const where: Prisma.NewsArticleWhereInput = { published: true };
    if (category && CATS.includes(category)) where.category = category;
    const items = await prisma.newsArticle.findMany({
      where,
      orderBy: [{ pinned: 'desc' }, { createdAt: 'desc' }],
      take: limit,
      select: { id: true, title: true, excerpt: true, imageUrl: true, category: true, pinned: true, createdAt: true },
    });
    return NextResponse.json({ items });
  } catch (e) {
    console.error('Public news error:', e);
    return NextResponse.json({ items: [] });
  }
}
