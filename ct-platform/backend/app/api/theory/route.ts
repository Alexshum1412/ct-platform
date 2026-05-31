import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { parseTags } from '@/lib/utils';

/**
 * GET /api/theory
 * Unified theory catalog across ALL subjects (powers the /theory hub page).
 * Optional filters: subjectId, topicId, subtopicId, q (search), limit.
 * Each item is enriched with subject/topic/subtopic names and the number of
 * related questions at both topic and subtopic level (for "related practice").
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const subjectId = searchParams.get('subjectId') || undefined;
    const topicId = searchParams.get('topicId') || undefined;
    const subtopicId = searchParams.get('subtopicId') || undefined;
    const q = (searchParams.get('q') || '').trim();
    const limit = Math.min(parseInt(searchParams.get('limit') || '2000', 10) || 2000, 5000);

    const where: Record<string, unknown> = { status: 'ACTIVE' };
    if (subjectId) where.subjectId = subjectId;
    if (topicId) where.topicId = topicId;
    if (subtopicId) where.subtopicId = subtopicId;
    if (q) {
      where.OR = [
        { title: { contains: q } },
        { content: { contains: q } },
        { tags: { contains: q } },
      ];
    }

    const items = await prisma.theory.findMany({
      where,
      take: limit,
      orderBy: [{ subjectId: 'asc' }, { order: 'asc' }],
      include: {
        subject: { select: { name: true, slug: true, color: true } },
        topic: { select: { name: true } },
        subtopic: { select: { name: true } },
      },
    });

    // Bulk related-question counts (active questions only).
    const bySub = await prisma.question.groupBy({
      by: ['subtopicId'],
      _count: true,
      where: { status: 'ACTIVE' },
    });
    const byTopic = await prisma.question.groupBy({
      by: ['topicId'],
      _count: true,
      where: { status: 'ACTIVE' },
    });
    const subCount = new Map<string, number>();
    for (const r of bySub) if (r.subtopicId) subCount.set(r.subtopicId, r._count);
    const topicCount = new Map<string, number>();
    for (const r of byTopic) if (r.topicId) topicCount.set(r.topicId, r._count);

    return NextResponse.json({
      items: items.map(t => ({
        id: t.id,
        title: t.title,
        content: t.content,
        tags: parseTags(t.tags),
        subjectId: t.subjectId,
        topicId: t.topicId,
        subtopicId: t.subtopicId,
        order: t.order,
        subjectName: t.subject?.name ?? null,
        subjectSlug: t.subject?.slug ?? null,
        subjectColor: t.subject?.color ?? null,
        topicName: t.topic?.name ?? null,
        subtopicName: t.subtopic?.name ?? null,
        topicQuestionCount: (t.topicId && topicCount.get(t.topicId)) || 0,
        subtopicQuestionCount: (t.subtopicId && subCount.get(t.subtopicId)) || 0,
      })),
      total: items.length,
    });
  } catch (error) {
    console.error('Theory list error:', error);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}
