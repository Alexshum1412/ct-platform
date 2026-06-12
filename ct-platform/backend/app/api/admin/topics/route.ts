import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logAudit } from '@/lib/audit';

export const dynamic = 'force-dynamic';

// POST /api/admin/topics — create a topic
export async function POST(req: NextRequest) {
  try {
    const b = await req.json();
    if (!b.subjectId || !b.name) return NextResponse.json({ error: 'subjectId и name обязательны' }, { status: 400 });
    const topic = await prisma.topic.create({
      data: {
        subjectId: b.subjectId,
        name: b.name,
        description: b.description ?? null,
        order: Number(b.order) || 0,
      },
    });
    // keep denormalized topic count fresh
    const topicsCount = await prisma.topic.count({ where: { subjectId: b.subjectId } });
    await prisma.subject.update({ where: { id: b.subjectId }, data: { topicsCount } });
    await logAudit(req, { action: 'CREATE', entity: 'topic', entityId: topic.id, summary: `Создана тема «${topic.name}»`, newValue: topic });
    return NextResponse.json(topic, { status: 201 });
  } catch (error) {
    console.error('Create topic error:', error);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}
