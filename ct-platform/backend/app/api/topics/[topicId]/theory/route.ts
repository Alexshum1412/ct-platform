import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { parseTags, parseJson } from '@/lib/utils';

function formatTheory(t: { tags: string; formulas: string | null; examples: string | null; commonMistakes?: string | null; examTraps?: string | null; [key: string]: unknown }) {
  return {
    ...t,
    tags: parseTags(t.tags),
    formulas: parseJson(t.formulas),
    examples: parseJson(t.examples),
    commonMistakes: parseJson(t.commonMistakes ?? null),
    examTraps: parseJson(t.examTraps ?? null),
  };
}

export async function GET(_: Request, { params }: { params: { topicId: string } }) {
  try {
    const theory = await prisma.theory.findMany({
      where: { topicId: params.topicId, status: 'ACTIVE' },
      orderBy: { order: 'asc' },
    });

    return NextResponse.json(theory.map(formatTheory));
  } catch (error) {
    console.error('Get topic theory error:', error);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}
