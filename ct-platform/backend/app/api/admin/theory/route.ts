import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

const toJson = (v: unknown): string | null => {
  if (v == null) return null;
  return typeof v === 'string' ? v : JSON.stringify(v);
};

// POST /api/admin/theory — create a theory article
export async function POST(req: NextRequest) {
  try {
    const b = await req.json();
    if (!b.subjectId || !b.title || !b.content) {
      return NextResponse.json({ error: 'subjectId, title и content обязательны' }, { status: 400 });
    }
    const theory = await prisma.theory.create({
      data: {
        subjectId: b.subjectId,
        topicId: b.topicId || null,
        subtopicId: b.subtopicId || null,
        title: b.title,
        content: b.content,
        summary: b.summary ?? null,
        commonMistakes: toJson(b.commonMistakes),
        examTraps: toJson(b.examTraps),
        formulas: toJson(b.formulas),
        examples: toJson(b.examples),
        tags: typeof b.tags === 'string' ? b.tags : JSON.stringify(b.tags ?? []),
        order: Number(b.order) || 0,
        status: 'ACTIVE',
      },
    });
    return NextResponse.json(theory, { status: 201 });
  } catch (error) {
    console.error('Create theory error:', error);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}
