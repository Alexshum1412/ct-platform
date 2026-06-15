import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// GET /api/banners — активные баннеры в текущем временном окне (публично).
export async function GET() {
  try {
    const now = new Date();
    const items = await prisma.banner.findMany({
      where: {
        active: true,
        AND: [
          { OR: [{ startsAt: null }, { startsAt: { lte: now } }] },
          { OR: [{ endsAt: null }, { endsAt: { gte: now } }] },
        ],
      },
      orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
      take: 10,
    });
    return NextResponse.json({ items });
  } catch (e) {
    console.error('Public banners error:', e);
    return NextResponse.json({ items: [] });
  }
}
