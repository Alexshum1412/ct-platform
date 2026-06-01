import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const b = await req.json();
    const data: Record<string, unknown> = {};
    if (b.name !== undefined) data.name = b.name;
    if (b.description !== undefined) data.description = b.description;
    if (b.order !== undefined) data.order = Number(b.order);
    const topic = await prisma.topic.update({ where: { id: params.id }, data });
    return NextResponse.json(topic);
  } catch (error) {
    console.error('Update topic error:', error);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}

// DELETE — subtopics cascade; questions/theory keep but lose this topic link (set null)
export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  try {
    const topic = await prisma.topic.findUnique({ where: { id: params.id }, select: { subjectId: true } });
    await prisma.$transaction([
      prisma.theory.deleteMany({ where: { topicId: params.id } }),
      prisma.question.updateMany({ where: { topicId: params.id }, data: { topicId: null, subtopicId: null } }),
      prisma.topic.delete({ where: { id: params.id } }), // subtopics cascade
    ]);
    if (topic) {
      const topicsCount = await prisma.topic.count({ where: { subjectId: topic.subjectId } });
      await prisma.subject.update({ where: { id: topic.subjectId }, data: { topicsCount } });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete topic error:', error);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}
