import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const activeSince = new Date(Date.now() - 15 * 60 * 1000);
    const count = await prisma.user.count({
      where: { updatedAt: { gte: activeSince } },
    });

    return NextResponse.json({ count });
  } catch (error) {
    console.error('Get online stats error:', error);
    return NextResponse.json({ count: 0 });
  }
}
