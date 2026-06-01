import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// PATCH /api/admin/subjects/:id
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const b = await req.json();
    const data: Record<string, unknown> = {};
    for (const k of ['name', 'nameShort', 'description', 'icon', 'color', 'gradient', 'isActive']) {
      if (b[k] !== undefined) data[k] = b[k];
    }
    if (b.order !== undefined) data.order = Number(b.order);
    const subject = await prisma.subject.update({ where: { id: params.id }, data });
    return NextResponse.json(subject);
  } catch (error) {
    console.error('Update subject error:', error);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}

// DELETE /api/admin/subjects/:id — removes the subject and all its content
export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  const id = params.id;
  try {
    await prisma.$transaction([
      prisma.question.deleteMany({ where: { subjectId: id } }),
      prisma.theory.deleteMany({ where: { subjectId: id } }),
      prisma.examConfig.deleteMany({ where: { subjectId: id } }),
      prisma.exam.deleteMany({ where: { subjectId: id } }),
      prisma.subject.delete({ where: { id } }), // topics + subtopics cascade
    ]);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete subject error:', error);
    return NextResponse.json(
      { error: 'Не удалось удалить предмет: возможно, по нему есть пройденные экзамены. Сначала очистите связанные данные.' },
      { status: 409 }
    );
  }
}
