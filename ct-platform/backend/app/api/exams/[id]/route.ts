import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { formatQuestion } from '@/lib/utils';

export const dynamic = 'force-dynamic';

// GET /api/exams/:id — exam details + its curated questions (in order)
export async function GET(_: Request, { params }: { params: { id: string } }) {
  try {
    const exam = await prisma.exam.findUnique({ where: { id: params.id } });
    if (!exam || !exam.isActive) {
      return NextResponse.json({ error: 'Экзамен не найден' }, { status: 404 });
    }

    let ids: string[] = [];
    try { ids = JSON.parse(exam.questionIds); } catch { /* ignore */ }

    const questions = await prisma.question.findMany({ where: { id: { in: ids } } });
    const byId = new Map(questions.map((q) => [q.id, q]));
    const ordered = ids.map((id) => byId.get(id)).filter(Boolean) as typeof questions;

    return NextResponse.json({
      id: exam.id,
      subjectId: exam.subjectId,
      title: exam.title,
      description: exam.description,
      durationMinutes: exam.durationMinutes,
      passingScore: exam.passingScore,
      questions: ordered.map((q) => formatQuestion(q as never)),
    });
  } catch (error) {
    console.error('Get exam error:', error);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}
