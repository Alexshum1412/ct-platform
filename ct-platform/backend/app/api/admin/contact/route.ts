import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// GET /api/admin/contact?status=NEW — list contact-form messages (admin only).
export async function GET(req: NextRequest) {
  try {
    const status = req.nextUrl.searchParams.get('status') || undefined;
    const [messages, grouped] = await Promise.all([
      prisma.contactMessage.findMany({
        where: status ? { status } : undefined,
        orderBy: { createdAt: 'desc' },
        take: 300,
      }),
      prisma.contactMessage.groupBy({ by: ['status'], _count: { _all: true } }),
    ]);
    const counts: Record<string, number> = {};
    for (const g of grouped) counts[g.status] = g._count._all;
    return NextResponse.json({ messages, counts });
  } catch (error) {
    console.error('List contact messages error:', error);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}
