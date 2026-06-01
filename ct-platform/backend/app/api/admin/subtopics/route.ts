import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// POST /api/admin/subtopics — create a subtopic
export async function POST(req: NextRequest) {
  try {
    const b = await req.json();
    if (!b.topicId || !b.name) return NextResponse.json({ error: 'topicId и name обязательны' }, { status: 400 });
    const subtopic = await prisma.subtopic.create({
      data: {
        topicId: b.topicId,
        name: b.name,
        description: b.description ?? null,
        order: Number(b.order) || 0,
      },
    });
    return NextResponse.json(subtopic, { status: 201 });
  } catch (error) {
    console.error('Create subtopic error:', error);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}
