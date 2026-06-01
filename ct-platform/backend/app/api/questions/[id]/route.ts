import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { formatQuestion } from '@/lib/utils';

export const dynamic = 'force-dynamic';

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

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const role = req.headers.get('x-user-role');
    if (role !== 'ADMIN') {
      return NextResponse.json({ error: 'Доступ запрещён' }, { status: 403 });
    }
    const body = await req.json();
    const data: Record<string, unknown> = {};
    for (const k of ['content', 'correctAnswer', 'explanation', 'solution', 'part', 'section', 'type', 'source', 'status', 'topicId', 'subtopicId', 'imageUrl', 'isPremium']) {
      if (body[k] !== undefined) data[k] = body[k];
    }
    if (body.difficulty !== undefined) data.difficulty = Number(body.difficulty);
    if (body.year !== undefined) data.year = body.year === null ? null : Number(body.year);
    if (body.options !== undefined) data.options = body.options == null ? null : (typeof body.options === 'string' ? body.options : JSON.stringify(body.options));
    if (body.tags !== undefined) data.tags = typeof body.tags === 'string' ? body.tags : JSON.stringify(body.tags);
    if (body.hints !== undefined) data.hints = body.hints == null ? null : (typeof body.hints === 'string' ? body.hints : JSON.stringify(body.hints));

    const question = await prisma.question.update({ where: { id: params.id }, data });
    return NextResponse.json(formatQuestion(question));
  } catch (error) {
    console.error('Update question error:', error);
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
