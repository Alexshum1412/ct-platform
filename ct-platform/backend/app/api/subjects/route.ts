import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

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
