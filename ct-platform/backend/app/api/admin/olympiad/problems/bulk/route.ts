import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { isOlympiadLevel, LEVEL_POINTS, type OlympiadLevel } from '@/lib/olympiad';
import { logAudit } from '@/lib/audit';

export const dynamic = 'force-dynamic';

const MAX_IDS = 500;

/**
 * POST /api/admin/olympiad/problems/bulk — массовые операции над олимпиадными задачами.
 * body: { ids: string[], op: 'delete' | 'update', data?: { level?, difficulty?, status?, year?, topic?, subjectId? } }
 * При смене level без явных points очки выставляются по уровню (LEVEL_POINTS).
 */
export async function POST(req: NextRequest) {
  try {
    const b = await req.json();
    const ids: string[] = Array.isArray(b.ids) ? b.ids.filter((x: unknown) => typeof x === 'string').slice(0, MAX_IDS) : [];
    const op = b.op as 'delete' | 'update' | undefined;

    if (ids.length === 0) return NextResponse.json({ error: 'Не выбраны задачи' }, { status: 400 });
    if (op !== 'delete' && op !== 'update') return NextResponse.json({ error: 'Неверная операция' }, { status: 400 });

    const existing = await prisma.olympiadProblem.findMany({
      where: { id: { in: ids } },
      select: { id: true, title: true },
    });
    if (existing.length === 0) return NextResponse.json({ error: 'Задачи не найдены' }, { status: 404 });

    if (op === 'delete') {
      const { count } = await prisma.olympiadProblem.deleteMany({ where: { id: { in: ids } } });
      await logAudit(req, {
        action: 'BULK_DELETE', entity: 'olympiadProblem',
        summary: `Массово удалено олимпиадных задач: ${count}`,
        oldValue: { titles: existing.map(p => p.title) },
      });
      return NextResponse.json({ success: true, count });
    }

    const d = (b.data ?? {}) as Record<string, unknown>;
    const data: Record<string, unknown> = {};
    if (d.level !== undefined) {
      const lvl = typeof d.level === 'string' ? d.level : '';
      if (!isOlympiadLevel(lvl)) return NextResponse.json({ error: 'Недопустимый level' }, { status: 400 });
      data.level = lvl;
      if (d.points === undefined) data.points = LEVEL_POINTS[lvl as OlympiadLevel];
    }
    if (d.points !== undefined) {
      const n = Number(d.points);
      if (!Number.isFinite(n) || n <= 0) return NextResponse.json({ error: 'points: положительное число' }, { status: 400 });
      data.points = Math.min(Math.floor(n), 200);
    }
    if (d.difficulty !== undefined) {
      const n = Number(d.difficulty);
      if (!Number.isInteger(n) || n < 1 || n > 5) return NextResponse.json({ error: 'difficulty: 1–5' }, { status: 400 });
      data.difficulty = n;
    }
    if (d.status !== undefined) {
      if (!['ACTIVE', 'HIDDEN'].includes(String(d.status))) return NextResponse.json({ error: 'Недопустимый status' }, { status: 400 });
      data.status = d.status;
    }
    if (d.year !== undefined) {
      data.year = d.year === null || d.year === '' ? null
        : Number.isInteger(Number(d.year)) && Number(d.year) > 1990 ? Number(d.year) : undefined;
      if (data.year === undefined) return NextResponse.json({ error: 'year: год > 1990 или пусто' }, { status: 400 });
    }
    if (d.topic !== undefined) data.topic = d.topic === null || d.topic === '' ? null : String(d.topic).slice(0, 200);
    if (d.subjectId !== undefined) {
      const subj = await prisma.subject.findUnique({ where: { id: String(d.subjectId) }, select: { id: true } });
      if (!subj) return NextResponse.json({ error: 'Предмет не найден' }, { status: 400 });
      data.subjectId = subj.id;
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: 'Нет полей для обновления' }, { status: 400 });
    }

    const { count } = await prisma.olympiadProblem.updateMany({ where: { id: { in: ids } }, data });
    await logAudit(req, {
      action: 'BULK_UPDATE', entity: 'olympiadProblem',
      summary: `Массово изменено олимпиадных задач: ${count} (${Object.keys(data).join(', ')})`,
      oldValue: { titles: existing.map(p => p.title) },
      newValue: data,
    });
    return NextResponse.json({ success: true, count });
  } catch (error) {
    console.error('Bulk olympiad problems error:', error);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}
