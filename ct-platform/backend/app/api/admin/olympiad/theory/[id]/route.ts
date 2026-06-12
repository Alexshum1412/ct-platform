import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { stringifyTags } from '@/lib/utils';
import { isOlympiadLevel } from '@/lib/olympiad';
import { logAudit } from '@/lib/audit';

export const dynamic = 'force-dynamic';

// PATCH /api/admin/olympiad/theory/:id — обновить статью.
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const b = await req.json();
    const data: Record<string, unknown> = {};
    if (b.subjectId !== undefined) data.subjectId = b.subjectId;
    if (b.title !== undefined) data.title = String(b.title).slice(0, 300);
    if (b.content !== undefined) data.content = b.content;
    if (b.level !== undefined && isOlympiadLevel(b.level)) data.level = b.level;
    if (b.topic !== undefined) data.topic = b.topic || null;
    if (b.order !== undefined) data.order = Number(b.order) || 0;
    if (b.tags !== undefined) data.tags = stringifyTags(b.tags);
    if (b.status !== undefined && ['ACTIVE', 'HIDDEN'].includes(b.status)) data.status = b.status;

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: 'Нет полей для обновления' }, { status: 400 });
    }
    const before = await prisma.olympiadTheory.findUnique({ where: { id: params.id } });
    const article = await prisma.olympiadTheory.update({ where: { id: params.id }, data });
    await logAudit(req, {
      action: 'UPDATE', entity: 'olympiadTheory', entityId: article.id,
      summary: `Изменена статья теории PRO «${article.title}»`,
      oldValue: before ? { ...before, content: before.content.slice(0, 300) } : null,
      newValue: { ...article, content: article.content.slice(0, 300) },
    });
    return NextResponse.json(article);
  } catch (error) {
    console.error('Admin olympiad theory update error:', error);
    return NextResponse.json({ error: 'Статья не найдена или ошибка сервера' }, { status: 500 });
  }
}

// DELETE /api/admin/olympiad/theory/:id — удалить статью.
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const before = await prisma.olympiadTheory.findUnique({ where: { id: params.id } });
    await prisma.olympiadTheory.delete({ where: { id: params.id } });
    await logAudit(req, {
      action: 'DELETE', entity: 'olympiadTheory', entityId: params.id,
      summary: `Удалена статья теории PRO «${before?.title ?? params.id}»`,
      oldValue: before ? { ...before, content: before.content.slice(0, 300) } : null,
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Admin olympiad theory delete error:', error);
    return NextResponse.json({ error: 'Статья не найдена или ошибка сервера' }, { status: 500 });
  }
}
