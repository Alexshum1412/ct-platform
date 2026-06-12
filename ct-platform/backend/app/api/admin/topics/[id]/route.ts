import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logAudit } from '@/lib/audit';

export const dynamic = 'force-dynamic';

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const b = await req.json();
    const data: Record<string, unknown> = {};
    if (b.name !== undefined) data.name = b.name;
    if (b.description !== undefined) data.description = b.description;
    if (b.order !== undefined) data.order = Number(b.order);
    const before = await prisma.topic.findUnique({ where: { id: params.id } });
    const topic = await prisma.topic.update({ where: { id: params.id }, data });
    await logAudit(req, { action: 'UPDATE', entity: 'topic', entityId: topic.id, summary: `Изменена тема «${topic.name}»`, oldValue: before, newValue: topic });
    return NextResponse.json(topic);
  } catch (error) {
    console.error('Update topic error:', error);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}

// DELETE — subtopics cascade; questions/theory keep but lose this topic link (set null)
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const before = await prisma.topic.findUnique({ where: { id: params.id } });
    await prisma.$transaction([
      prisma.theory.deleteMany({ where: { topicId: params.id } }),
      prisma.question.updateMany({ where: { topicId: params.id }, data: { topicId: null, subtopicId: null } }),
      prisma.topic.delete({ where: { id: params.id } }), // subtopics cascade
    ]);
    if (before) {
      const topicsCount = await prisma.topic.count({ where: { subjectId: before.subjectId } });
      await prisma.subject.update({ where: { id: before.subjectId }, data: { topicsCount } });
    }
    await logAudit(req, { action: 'DELETE', entity: 'topic', entityId: params.id, summary: `Удалена тема «${before?.name ?? params.id}»`, oldValue: before });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete topic error:', error);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}
