import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(_: Request, { params }: { params: { topicId: string } }) {
  try {
    const subtopics = await prisma.subtopic.findMany({
      where: { topicId: params.topicId },
      orderBy: { order: 'asc' },
      include: { _count: { select: { questions: true } } },
    });

    return NextResponse.json(subtopics.map(s => ({
      id: s.id,
      topicId: s.topicId,
      name: s.name,
      description: s.description,
      order: s.order,
      questionsCount: s._count.questions,
    })));
  } catch (error) {
    console.error('Get subtopics error:', error);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}
