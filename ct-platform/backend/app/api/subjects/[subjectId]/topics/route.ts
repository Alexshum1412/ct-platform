import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(_: Request, { params }: { params: { subjectId: string } }) {
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

    const topics = await prisma.topic.findMany({
      where: { subjectId: subject.id },
      orderBy: { order: 'asc' },
      include: {
        _count: { select: { questions: true, subtopics: true, theory: true } },
      },
    });

    return NextResponse.json(topics.map(t => ({
      id: t.id,
      subjectId: t.subjectId,
      name: t.name,
      description: t.description,
      order: t.order,
      questionsCount: t._count.questions,
      subtopicsCount: t._count.subtopics,
      theoryCount: t._count.theory,
    })));
  } catch (error) {
    console.error('Get subject topics error:', error);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}
