import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(_: Request, { params }: { params: { subjectId: string } }) {
  try {
    const subject = await prisma.subject.findFirst({
      where: {
        OR: [{ id: params.subjectId }, { slug: params.subjectId }],
        isActive: true,
      },
      include: {
        _count: { select: { questions: true, topics: true } },
      },
    });

    if (!subject) {
      return NextResponse.json({ error: 'Предмет не найден' }, { status: 404 });
    }

    return NextResponse.json({
      id: subject.id,
      slug: subject.slug,
      name: subject.name,
      nameShort: subject.nameShort,
      description: subject.description,
      icon: subject.icon,
      color: subject.color,
      gradient: subject.gradient,
      order: subject.order,
      stats: {
        questionsCount: subject._count.questions,
        topicsCount: subject._count.topics,
        rating: subject.rating,
      },
    });
  } catch (error) {
    console.error('Get subject error:', error);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}
