import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const role = req.headers.get('x-user-role');
    if (role !== 'ADMIN') {
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

    return NextResponse.json({ success: true, question });
  } catch (error) {
    console.error('Admin pending action error:', error);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}
