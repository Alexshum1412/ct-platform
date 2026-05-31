import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { formatQuestion } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export async function GET(_: Request, { params }: { params: { topicId: string } }) {
  try {
    const questions = await prisma.question.findMany({
      where: { topicId: params.topicId, status: 'ACTIVE' },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(questions.map(formatQuestion));
  } catch (error) {
    console.error('Get topic questions error:', error);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}
