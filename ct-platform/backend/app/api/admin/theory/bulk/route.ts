import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logAudit } from '@/lib/audit';

export const dynamic = 'force-dynamic';

const MAX_IDS = 500;

/**
 * POST /api/admin/theory/bulk — массовые операции над статьями теории.
 * body: { ids: string[], op: 'delete' | 'update', data?: { status? } }
 * update-whitelist: status (ACTIVE | HIDDEN).
 */
export async function POST(req: NextRequest) {
  try {
    const b = await req.json();
    const ids: string[] = Array.isArray(b.ids) ? b.ids.filter((x: unknown) => typeof x === 'string').slice(0, MAX_IDS) : [];
    const op = b.op as 'delete' | 'update' | undefined;

    if (ids.length === 0) return NextResponse.json({ error: 'Не выбраны статьи' }, { status: 400 });
    if (op !== 'delete' && op !== 'update') return NextResponse.json({ error: 'Неверная операция' }, { status: 400 });

    const existing = await prisma.theory.findMany({ where: { id: { in: ids } }, select: { id: true, title: true } });
    if (existing.length === 0) return NextResponse.json({ error: 'Статьи не найдены' }, { status: 404 });

    if (op === 'delete') {
      const { count } = await prisma.theory.deleteMany({ where: { id: { in: ids } } });
      await logAudit(req, {
        action: 'BULK_DELETE', entity: 'theory',
        summary: `Массово удалено статей теории: ${count}`,
        oldValue: { titles: existing.map(t => t.title) },
      });
      return NextResponse.json({ success: true, count });
    }

    const d = (b.data ?? {}) as Record<string, unknown>;
    const data: Record<string, unknown> = {};
    if (d.status !== undefined) {
      if (!['ACTIVE', 'HIDDEN'].includes(String(d.status))) {
        return NextResponse.json({ error: 'Недопустимый status' }, { status: 400 });
      }
      data.status = d.status;
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: 'Нет полей для обновления' }, { status: 400 });
    }

    const { count } = await prisma.theory.updateMany({ where: { id: { in: ids } }, data });
    await logAudit(req, {
      action: 'BULK_UPDATE', entity: 'theory',
      summary: `Массово изменено статей теории: ${count} (${Object.keys(data).join(', ')})`,
      oldValue: { titles: existing.map(t => t.title) },
      newValue: data,
    });
    return NextResponse.json({ success: true, count });
  } catch (error) {
    console.error('Bulk theory error:', error);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}
