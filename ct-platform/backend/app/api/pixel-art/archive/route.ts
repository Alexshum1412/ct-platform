import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// GET /api/pixel-art/archive — список месячных снимков полотна (для страницы /archive).
export async function GET() {
  try {
    const archives = await prisma.pixelArchive.findMany({
      orderBy: { month: 'desc' },
      select: { month: true, png: true, pixels: true, createdAt: true },
    });
    return NextResponse.json({ archives });
  } catch (e) {
    console.error('Pixel-art archive list error:', e);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}
