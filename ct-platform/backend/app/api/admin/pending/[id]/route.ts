import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logAudit } from '@/lib/audit';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const role = req.headers.get('x-user-role');
    if (role !== 'ADMIN' && role !== 'MODERATOR') {
      return NextResponse.json({ error: 'Доступ запрещён' }, { status: 403 });
    }

    const url = new URL(req.url);
    const action = url.searchParams.get('action');

    if (action !== 'approve' && action !== 'reject') {
      return NextResponse.json({ error: 'Неверное действие' }, { status: 400 });
    }

    const question = await prisma.question.update({
      where: { id: params.id },
      data: { status: action === 'approve' ? 'ACTIVE' : 'REJECTED' },
      select: { id: true, status: true },
    });

    await logAudit(req, {
      action: action === 'approve' ? 'APPROVE' : 'REJECT',
      entity: 'question', entityId: question.id,
      summary: `${action === 'approve' ? 'Одобрено' : 'Отклонено'} задание на модерации`,
      newValue: { status: question.status },
    });
    return NextResponse.json({ success: true, question });
  } catch (error) {
    console.error('Admin pending action error:', error);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}
