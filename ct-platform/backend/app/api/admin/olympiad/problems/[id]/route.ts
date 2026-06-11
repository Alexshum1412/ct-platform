import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { stringifyTags } from '@/lib/utils';
import { formatProblemFull, isOlympiadLevel } from '@/lib/olympiad';

export const dynamic = 'force-dynamic';

// PATCH /api/admin/olympiad/problems/:id — обновить задачу (частично).
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const b = await req.json();
    const data: Record<string, unknown> = {};

    if (b.subjectId !== undefined) data.subjectId = b.subjectId;
    if (b.title !== undefined) data.title = String(b.title).slice(0, 300);
    if (b.content !== undefined) data.content = b.content;
    if (b.answer !== undefined) data.answer = String(b.answer).slice(0, 500);
    if (b.answerType !== undefined) data.answerType = b.answerType === 'CHOICE' ? 'CHOICE' : 'TEXT';
    if (b.options !== undefined) data.options = b.options ? (typeof b.options === 'string' ? b.options : JSON.stringify(b.options)) : null;
    if (b.solution !== undefined) data.solution = b.solution;
    if (b.hints !== undefined) data.hints = Array.isArray(b.hints) ? JSON.stringify(b.hints) : (typeof b.hints === 'string' ? b.hints : '[]');
    if (b.level !== undefined && isOlympiadLevel(b.level)) data.level = b.level;
    if (b.difficulty !== undefined) data.difficulty = Math.min(Math.max(Number(b.difficulty) || 3, 1), 5);
    if (b.topic !== undefined) data.topic = b.topic || null;
    if (b.grade !== undefined) data.grade = b.grade || null;
    if (b.year !== undefined) data.year = Number.isInteger(Number(b.year)) && Number(b.year) > 1990 ? Number(b.year) : null;
    if (b.points !== undefined) {
      const n = Number(b.points);
      if (Number.isFinite(n) && n > 0) data.points = Math.min(Math.floor(n), 200);
    }
    if (b.tags !== undefined) data.tags = stringifyTags(b.tags);
    if (b.source !== undefined) data.source = b.source || null;
    if (b.status !== undefined && ['ACTIVE', 'HIDDEN'].includes(b.status)) data.status = b.status;

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: 'Нет полей для обновления' }, { status: 400 });
    }

    const problem = await prisma.olympiadProblem.update({ where: { id: params.id }, data });
    return NextResponse.json(formatProblemFull(problem));
  } catch (error) {
    console.error('Admin olympiad update error:', error);
    return NextResponse.json({ error: 'Задача не найдена или ошибка сервера' }, { status: 500 });
  }
}

// DELETE /api/admin/olympiad/problems/:id — удалить задачу (вместе с попытками, cascade).
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await prisma.olympiadProblem.delete({ where: { id: params.id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Admin olympiad delete error:', error);
    return NextResponse.json({ error: 'Задача не найдена или ошибка сервера' }, { status: 500 });
  }
}
