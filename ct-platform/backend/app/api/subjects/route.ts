import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// GET /api/subjects - Get all subjects
export async function GET(req: NextRequest) {
  try {
    const subjects = await prisma.subject.findMany({
      where: { isActive: true },
      orderBy: { order: 'asc' },
      include: {
        _count: {
          select: {
            questions: true,
            topics: true,
          },
        },
      },
    });

    // Подтемы привязаны к темам (subjectId у них нет) — считаем через темы.
    const topicsAll = await prisma.topic.findMany({ select: { id: true, subjectId: true } });
    const subjectByTopic = new Map(topicsAll.map(t => [t.id, t.subjectId]));
    const grouped = await prisma.subtopic.groupBy({ by: ['topicId'], _count: { id: true } });
    const subtopicsBySubject = new Map<string, number>();
    for (const g of grouped) {
      const sid = subjectByTopic.get(g.topicId);
      if (sid) subtopicsBySubject.set(sid, (subtopicsBySubject.get(sid) ?? 0) + g._count.id);
    }

    // Format response
    const formattedSubjects = subjects.map(subject => ({
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
        subtopicsCount: subtopicsBySubject.get(subject.id) ?? 0,
        rating: 0, // deprecated, kept for backwards compat
      },
    }));

    return NextResponse.json({ subjects: formattedSubjects });
  } catch (error) {
    console.error('Get subjects error:', error);
    return NextResponse.json(
      { error: 'Ошибка сервера' },
      { status: 500 }
    );
  }
}
