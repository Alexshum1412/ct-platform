import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logAudit } from '@/lib/audit';

export const dynamic = 'force-dynamic';

// PATCH /api/admin/contact/:id — update status (NEW | READ | RESOLVED).
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const b = await req.json();
    const data: Record<string, unknown> = {};
    if (b.status !== undefined) data.status = String(b.status);
    const before = await prisma.contactMessage.findUnique({ where: { id: params.id }, select: { status: true, subject: true } });
    const m = await prisma.contactMessage.update({ where: { id: params.id }, data });
    await logAudit(req, {
      action: 'UPDATE', entity: 'contactMessage', entityId: m.id,
      summary: `Статус сообщения «${m.subject}»: ${before?.status ?? '?'} → ${m.status}`,
      oldValue: before, newValue: { status: m.status },
    });
    return NextResponse.json(m);
  } catch (error) {
    console.error('Update contact message error:', error);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}

// DELETE /api/admin/contact/:id
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const before = await prisma.contactMessage.findUnique({ where: { id: params.id } });
    await prisma.contactMessage.delete({ where: { id: params.id } });
    await logAudit(req, {
      action: 'DELETE', entity: 'contactMessage', entityId: params.id,
      summary: `Удалено сообщение «${before?.subject ?? params.id}»`,
      oldValue: before,
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete contact message error:', error);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}
