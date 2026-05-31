import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { formatQuestion } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest, { params }: { params: { subjectId: string } }) {
  try {
    const subject = await prisma.subject.findFirst({
      where: {
        OR: [{ id: params.subjectId }, { slug: params.subjectId }],
      },
      select: { id: true },
    });
    if (!subject) {
      return NextResponse.json([]);
    }

    const { searchParams } = new URL(req.url);
    const topicId = searchParams.get('topicId');
    const difficulty = searchParams.get('difficulty');
    const part = searchParams.get('part');
    const section = searchParams.get('section');
    const limit = parseInt(searchParams.get('limit') || '200', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    const questions = await prisma.question.findMany({
      where: {
        subjectId: subject.id,
        status: 'ACTIVE',
        ...(topicId ? { topicId } : {}),
        ...(difficulty ? { difficulty: parseInt(difficulty, 10) } : {}),
        ...(part ? { part } : {}),
        ...(section ? { section } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    });

    return NextResponse.json(questions.map(formatQuestion));
  } catch (error) {
    console.error('Get subject questions error:', error);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}
