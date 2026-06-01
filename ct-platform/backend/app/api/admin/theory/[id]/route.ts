import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

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
    const theory = await prisma.theory.update({ where: { id: params.id }, data });
    return NextResponse.json(theory);
  } catch (error) {
    console.error('Update theory error:', error);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  try {
    await prisma.theory.delete({ where: { id: params.id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete theory error:', error);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}
