import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { parseTags } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const tag = searchParams.get('tag') ?? '';
    const q = searchParams.get('q') ?? '';

    if (!tag && !q) {
      return NextResponse.json({ items: [] });
    }

    const where: Record<string, unknown> = { status: 'ACTIVE' };
    const OR: Array<Record<string, unknown>> = [];

    // mode:'insensitive' — в Postgres contains регистрозависим, из-за чего поиск
    // «Производная» не находил «производная» и наоборот.
    if (tag) {
      OR.push({ tags: { contains: tag, mode: 'insensitive' } });
      OR.push({ title: { contains: tag, mode: 'insensitive' } });
      OR.push({ content: { contains: tag, mode: 'insensitive' } });
    }
    if (q) {
      OR.push({ title: { contains: q, mode: 'insensitive' } });
      OR.push({ content: { contains: q, mode: 'insensitive' } });
    }

    if (OR.length > 0) where.OR = OR;

    const items = await prisma.theory.findMany({
      where,
      take: 30,
      orderBy: { updatedAt: 'desc' },
    });

    return NextResponse.json({
      items: items.map(t => ({ ...t, tags: parseTags(t.tags) })),
    });
  } catch (error) {
    console.error('Theory search error:', error);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}
