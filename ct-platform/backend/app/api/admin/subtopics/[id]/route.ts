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
    const subtopic = await prisma.subtopic.update({ where: { id: params.id }, data });
    return NextResponse.json(subtopic);
  } catch (error) {
    console.error('Update subtopic error:', error);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  try {
    await prisma.$transaction([
      prisma.theory.deleteMany({ where: { subtopicId: params.id } }),
      prisma.question.updateMany({ where: { subtopicId: params.id }, data: { subtopicId: null } }),
      prisma.subtopic.delete({ where: { id: params.id } }),
    ]);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete subtopic error:', error);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}
