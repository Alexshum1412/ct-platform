import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// PATCH /api/admin/exams/:id — update an exam
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await req.json();
    const data: Record<string, unknown> = {};
    if (body.title !== undefined) data.title = body.title;
    if (body.description !== undefined) data.description = body.description;
    if (body.durationMinutes !== undefined) data.durationMinutes = Number(body.durationMinutes);
    if (body.passingScore !== undefined) data.passingScore = Number(body.passingScore);
    if (body.questionIds !== undefined) data.questionIds = JSON.stringify(body.questionIds);
    if (body.isActive !== undefined) data.isActive = body.isActive;
    if (body.order !== undefined) data.order = Number(body.order);
    const exam = await prisma.exam.update({ where: { id: params.id }, data });
    return NextResponse.json(exam);
  } catch (error) {
    console.error('Admin update exam error:', error);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}

// DELETE /api/admin/exams/:id
export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  try {
    await prisma.exam.delete({ where: { id: params.id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Admin delete exam error:', error);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}
