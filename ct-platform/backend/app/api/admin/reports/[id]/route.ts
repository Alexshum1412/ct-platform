import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

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

    await prisma.questionReport.delete({ where: { id: params.id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Admin report delete error:', error);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}
