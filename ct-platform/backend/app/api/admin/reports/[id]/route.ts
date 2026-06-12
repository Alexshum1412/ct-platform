import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logAudit } from '@/lib/audit';

export const dynamic = 'force-dynamic';

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const role = req.headers.get('x-user-role');
    if (role !== 'ADMIN') return NextResponse.json({ error: 'Доступ запрещён' }, { status: 403 });

    const body = await req.json();
    const action = body.action as 'resolve' | 'reject' | undefined;

    if (action !== 'resolve' && action !== 'reject') {
      return NextResponse.json({ error: 'Неверное действие' }, { status: 400 });
    }

    const updated = await prisma.questionReport.update({
      where: { id: params.id },
      data: {
        status: action === 'resolve' ? 'RESOLVED' : 'REJECTED',
        resolvedAt: new Date(),
      },
    });

    await logAudit(req, {
      action: action === 'resolve' ? 'APPROVE' : 'REJECT',
      entity: 'report', entityId: updated.id,
      summary: `Жалоба на задание ${action === 'resolve' ? 'решена' : 'отклонена'}`,
      newValue: { status: updated.status },
    });
    return NextResponse.json({ success: true, report: updated });
  } catch (error) {
    console.error('Admin report update error:', error);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const role = req.headers.get('x-user-role');
    if (role !== 'ADMIN') return NextResponse.json({ error: 'Доступ запрещён' }, { status: 403 });

    const before = await prisma.questionReport.findUnique({ where: { id: params.id } });
    await prisma.questionReport.delete({ where: { id: params.id } });
    await logAudit(req, {
      action: 'DELETE', entity: 'report', entityId: params.id,
      summary: 'Удалена жалоба на задание',
      oldValue: before,
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Admin report delete error:', error);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}
