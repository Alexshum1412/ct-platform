import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { parseTags, parseJson } from '@/lib/utils';

export async function GET(_: Request, { params }: { params: { id: string } }) {
  try {
    const item = await prisma.theory.findUnique({
      where: { id: params.id },
    });

    if (!item || item.status !== 'ACTIVE') {
      return NextResponse.json({ error: 'Материал не найден' }, { status: 404 });
    }

    return NextResponse.json({
      ...item,
      tags: parseTags(item.tags),
      formulas: parseJson(item.formulas),
      examples: parseJson(item.examples),
    });
  } catch (error) {
    console.error('Get theory error:', error);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}
