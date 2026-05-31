import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { formatQuestion } from '@/lib/utils';

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  try {
    const question = await prisma.question.findUnique({
      where: { id: params.id },
    });

    if (!question || question.status !== 'ACTIVE') {
      return NextResponse.json({ error: 'Задание не найдено' }, { status: 404 });
    }

    return NextResponse.json(formatQuestion(question));
  } catch (error) {
    console.error('Get question error:', error);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const role = req.headers.get('x-user-role');
    if (role !== 'ADMIN') {
      return NextResponse.json({ error: 'Доступ запрещён' }, { status: 403 });
    }

    await prisma.question.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete question error:', error);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}
