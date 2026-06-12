import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logAudit } from '@/lib/audit';

export const dynamic = 'force-dynamic';

const toJson = (v: unknown): string | null => {
  if (v == null) return null;
  return typeof v === 'string' ? v : JSON.stringify(v);
};

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const b = await req.json();
    const data: Record<string, unknown> = {};
    for (const k of ['title', 'content', 'summary', 'status']) if (b[k] !== undefined) data[k] = b[k];
    if (b.topicId !== undefined) data.topicId = b.topicId || null;
    if (b.subtopicId !== undefined) data.subtopicId = b.subtopicId || null;
    if (b.order !== undefined) data.order = Number(b.order);
    if (b.commonMistakes !== undefined) data.commonMistakes = toJson(b.commonMistakes);
    if (b.examTraps !== undefined) data.examTraps = toJson(b.examTraps);
    if (b.formulas !== undefined) data.formulas = toJson(b.formulas);
    if (b.examples !== undefined) data.examples = toJson(b.examples);
    if (b.tags !== undefined) data.tags = typeof b.tags === 'string' ? b.tags : JSON.stringify(b.tags);
    const before = await prisma.theory.findUnique({ where: { id: params.id } });
    const theory = await prisma.theory.update({ where: { id: params.id }, data });
    await logAudit(req, {
      action: 'UPDATE', entity: 'theory', entityId: theory.id,
      summary: `Изменена статья теории «${theory.title}»`,
      oldValue: before ? { ...before, content: before.content.slice(0, 300) } : null,
      newValue: { ...theory, content: theory.content.slice(0, 300) },
    });
    return NextResponse.json(theory);
  } catch (error) {
    console.error('Update theory error:', error);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const before = await prisma.theory.findUnique({ where: { id: params.id } });
    await prisma.theory.delete({ where: { id: params.id } });
    await logAudit(req, {
      action: 'DELETE', entity: 'theory', entityId: params.id,
      summary: `Удалена статья теории «${before?.title ?? params.id}»`,
      oldValue: before ? { ...before, content: before.content.slice(0, 300) } : null,
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete theory error:', error);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}
