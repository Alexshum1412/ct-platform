import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logAudit } from '@/lib/audit';

export const dynamic = 'force-dynamic';

const MAX_IDS = 500;

/**
 * POST /api/admin/questions/bulk — массовые операции над заданиями.
 * body: { ids: string[], op: 'delete' | 'update', data?: {...} }
 * update-поля (whitelist): difficulty, status, part, section, isPremium,
 * subjectId, topicId, subtopicId, tags.
 * Денормализованный subject.questionsCount пересчитывается для всех затронутых предметов.
 */
export async function POST(req: NextRequest) {
  try {
    const b = await req.json();
    const ids: string[] = Array.isArray(b.ids) ? b.ids.filter((x: unknown) => typeof x === 'string').slice(0, MAX_IDS) : [];
    const op = b.op as 'delete' | 'update' | undefined;

    if (ids.length === 0) return NextResponse.json({ error: 'Не выбраны задания' }, { status: 400 });
    if (op !== 'delete' && op !== 'update') return NextResponse.json({ error: 'Неверная операция' }, { status: 400 });

    // предметы, чьи счётчики затронет операция (до изменения)
    const existing = await prisma.question.findMany({
      where: { id: { in: ids } },
      select: { id: true, subjectId: true, externalId: true },
    });
    if (existing.length === 0) return NextResponse.json({ error: 'Задания не найдены' }, { status: 404 });
    const affectedSubjects = new Set(existing.map(q => q.subjectId));

    if (op === 'delete') {
      const { count } = await prisma.question.deleteMany({ where: { id: { in: ids } } });
      await recountSubjects(affectedSubjects);
      await logAudit(req, {
        action: 'BULK_DELETE', entity: 'question',
        summary: `Массово удалено заданий: ${count}`,
        oldValue: { ids: existing.map(q => q.externalId ?? q.id) },
      });
      return NextResponse.json({ success: true, count });
    }

    // update
    const d = (b.data ?? {}) as Record<string, unknown>;
    const data: Record<string, unknown> = {};
    if (d.difficulty !== undefined) {
      const n = Number(d.difficulty);
      if (!Number.isInteger(n) || n < 1 || n > 5) return NextResponse.json({ error: 'difficulty: 1–5' }, { status: 400 });
      data.difficulty = n;
    }
    if (d.status !== undefined) {
      if (!['ACTIVE', 'HIDDEN', 'REJECTED', 'PENDING'].includes(String(d.status))) {
        return NextResponse.json({ error: 'Недопустимый status' }, { status: 400 });
      }
      data.status = d.status;
    }
    if (d.part !== undefined) {
      if (!['A', 'B'].includes(String(d.part))) return NextResponse.json({ error: 'part: A или B' }, { status: 400 });
      data.part = d.part;
    }
    if (d.section !== undefined) data.section = d.section === null || d.section === '' ? null : String(d.section).slice(0, 200);
    if (d.isPremium !== undefined) data.isPremium = Boolean(d.isPremium);
    if (d.subjectId !== undefined) {
      const subj = await prisma.subject.findUnique({ where: { id: String(d.subjectId) }, select: { id: true } });
      if (!subj) return NextResponse.json({ error: 'Предмет не найден' }, { status: 400 });
      data.subjectId = subj.id;
      // при смене предмета сбрасываем связи темы/подтемы, если они не заданы явно
      if (d.topicId === undefined) data.topicId = null;
      if (d.subtopicId === undefined) data.subtopicId = null;
      affectedSubjects.add(subj.id);
    }
    if (d.topicId !== undefined) data.topicId = d.topicId === null || d.topicId === '' ? null : String(d.topicId);
    if (d.subtopicId !== undefined) data.subtopicId = d.subtopicId === null || d.subtopicId === '' ? null : String(d.subtopicId);
    if (d.tags !== undefined) data.tags = typeof d.tags === 'string' ? d.tags : JSON.stringify(Array.isArray(d.tags) ? d.tags : []);

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: 'Нет полей для обновления' }, { status: 400 });
    }

    const { count } = await prisma.question.updateMany({ where: { id: { in: ids } }, data });
    if (data.subjectId !== undefined || data.status !== undefined) await recountSubjects(affectedSubjects);

    await logAudit(req, {
      action: 'BULK_UPDATE', entity: 'question',
      summary: `Массово изменено заданий: ${count} (${Object.keys(data).join(', ')})`,
      oldValue: { ids: existing.map(q => q.externalId ?? q.id) },
      newValue: data,
    });
    return NextResponse.json({ success: true, count });
  } catch (error) {
    console.error('Bulk questions error:', error);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}

// questionsCount считается по АКТИВНЫМ заданиям предмета (как при выдаче каталога)
async function recountSubjects(subjectIds: Set<string>) {
  for (const id of Array.from(subjectIds)) {
    const questionsCount = await prisma.question.count({ where: { subjectId: id, status: 'ACTIVE' } });
    await prisma.subject.update({ where: { id }, data: { questionsCount } }).catch(() => {});
  }
}
