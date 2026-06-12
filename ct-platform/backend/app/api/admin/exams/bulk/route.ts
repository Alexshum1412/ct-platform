import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logAudit } from '@/lib/audit';

export const dynamic = 'force-dynamic';

const MAX_IDS = 200;

/**
 * POST /api/admin/exams/bulk — массовые операции над экзаменами.
 * body: { ids: string[], op: 'delete' | 'update', data?: { isActive? } }
 */
export async function POST(req: NextRequest) {
  try {
    const b = await req.json();
    const ids: string[] = Array.isArray(b.ids) ? b.ids.filter((x: unknown) => typeof x === 'string').slice(0, MAX_IDS) : [];
    const op = b.op as 'delete' | 'update' | undefined;

    if (ids.length === 0) return NextResponse.json({ error: 'Не выбраны экзамены' }, { status: 400 });
    if (op !== 'delete' && op !== 'update') return NextResponse.json({ error: 'Неверная операция' }, { status: 400 });

    const existing = await prisma.exam.findMany({ where: { id: { in: ids } }, select: { id: true, title: true } });
    if (existing.length === 0) return NextResponse.json({ error: 'Экзамены не найдены' }, { status: 404 });

    if (op === 'delete') {
      const { count } = await prisma.exam.deleteMany({ where: { id: { in: ids } } });
      await logAudit(req, {
        action: 'BULK_DELETE', entity: 'exam',
        summary: `Массово удалено экзаменов: ${count}`,
        oldValue: { titles: existing.map(e => e.title) },
      });
      return NextResponse.json({ success: true, count });
    }

    const d = (b.data ?? {}) as Record<string, unknown>;
    const data: Record<string, unknown> = {};
    if (d.isActive !== undefined) data.isActive = Boolean(d.isActive);

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: 'Нет полей для обновления' }, { status: 400 });
    }

    const { count } = await prisma.exam.updateMany({ where: { id: { in: ids } }, data });
    await logAudit(req, {
      action: 'BULK_UPDATE', entity: 'exam',
      summary: `Массово изменено экзаменов: ${count} (${Object.keys(data).join(', ')})`,
      oldValue: { titles: existing.map(e => e.title) },
      newValue: data,
    });
    return NextResponse.json({ success: true, count });
  } catch (error) {
    console.error('Bulk exams error:', error);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}
