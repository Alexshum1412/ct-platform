import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { parseJson } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export async function GET(_: Request, { params }: { params: { subjectId: string } }) {
  try {
    const subject = await prisma.subject.findFirst({
      where: {
        OR: [{ id: params.subjectId }, { slug: params.subjectId }],
      },
      select: { id: true },
    });

    const config = await prisma.examConfig.findFirst({
      where: { subjectId: subject?.id ?? params.subjectId },
    });

    if (!config) {
      return NextResponse.json({
        id: 'default',
        subjectId: params.subjectId,
        durationMinutes: 120,
        totalQuestions: 30,
        passingScore: 18,
        structure: [],
      });
    }

    return NextResponse.json({
      ...config,
      structure: parseJson(config.structure) ?? [],
    });
  } catch (error) {
    console.error('Get exam config error:', error);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}
