import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// GET /api/pixel-art/archive/2026-05 — отдаёт сам PNG снимка (image/png).
// Семантически соответствует «/archive/YYYY-MM.png»: ссылка скачивает картинку.
export async function GET(_req: NextRequest, { params }: { params: { month: string } }) {
  try {
    const month = params.month.replace(/\.png$/i, '');
    const row = await prisma.pixelArchive.findUnique({ where: { month } });
    if (!row) return NextResponse.json({ error: 'Архив не найден' }, { status: 404 });

    const base64 = row.png.replace(/^data:image\/png;base64,/, '');
    const buf = Buffer.from(base64, 'base64');
    return new NextResponse(buf, {
      status: 200,
      headers: {
        'Content-Type': 'image/png',
        'Content-Disposition': `inline; filename="${month}.png"`,
        'Cache-Control': 'public, max-age=86400',
      },
    });
  } catch (e) {
    console.error('Pixel-art archive PNG error:', e);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}
