import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logAudit } from '@/lib/audit';

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
    const before = await prisma.exam.findUnique({ where: { id: params.id } });
    const exam = await prisma.exam.update({ where: { id: params.id }, data });
    await logAudit(req, { action: 'UPDATE', entity: 'exam', entityId: exam.id, summary: `Изменён экзамен «${exam.title}»`, oldValue: before, newValue: exam });
    return NextResponse.json(exam);
  } catch (error) {
    console.error('Admin update exam error:', error);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}

// DELETE /api/admin/exams/:id
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const before = await prisma.exam.findUnique({ where: { id: params.id } });
    await prisma.exam.delete({ where: { id: params.id } });
    await logAudit(req, { action: 'DELETE', entity: 'exam', entityId: params.id, summary: `Удалён экзамен «${before?.title ?? params.id}»`, oldValue: before });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Admin delete exam error:', error);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}
