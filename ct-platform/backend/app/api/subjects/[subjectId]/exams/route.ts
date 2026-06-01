import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// GET /api/subjects/:subjectId/exams — active exams for a subject (id OR slug accepted)
export async function GET(_: Request, { params }: { params: { subjectId: string } }) {
  try {
    const subject = await prisma.subject.findFirst({
      where: { OR: [{ id: params.subjectId }, { slug: params.subjectId }] },
      select: { id: true },
    });
    if (!subject) return NextResponse.json([]);

    const exams = await prisma.exam.findMany({
      where: { subjectId: subject.id, isActive: true },
      orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
    });

    return NextResponse.json(
      exams.map((e) => {
        let count = 0;
        try { count = JSON.parse(e.questionIds).length; } catch { /* ignore */ }
        return {
          id: e.id,
          subjectId: e.subjectId,
          title: e.title,
          description: e.description,
          durationMinutes: e.durationMinutes,
          passingScore: e.passingScore,
          questionCount: count,
        };
      })
    );
  } catch (error) {
    console.error('List exams error:', error);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}
