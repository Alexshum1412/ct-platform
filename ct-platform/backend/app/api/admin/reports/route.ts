import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const role = req.headers.get('x-user-role');
    if (role !== 'ADMIN' && role !== 'MODERATOR') return NextResponse.json({ error: 'Доступ запрещён' }, { status: 403 });

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');

    const reports = await prisma.questionReport.findMany({
      where: status && status !== 'all' ? { status } : undefined,
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: {
        user: { select: { id: true, email: true, name: true } },
        question: {
          select: {
            id: true, externalId: true, content: true, subjectId: true, topicId: true,
            subject: { select: { name: true, slug: true } },
            topic: { select: { name: true } },
          },
        },
      },
    });

    return NextResponse.json({
      reports: reports.map(r => ({
        id: r.id,
        reason: r.reason,
        description: r.description,
        status: r.status,
        createdAt: r.createdAt,
        resolvedAt: r.resolvedAt,
        user: r.user,
        question: r.question ? {
          id: r.question.id,
          externalId: r.question.externalId,
          content: r.question.content.substring(0, 200),
          subjectName: r.question.subject.name,
          subjectSlug: r.question.subject.slug,
          topicName: r.question.topic?.name,
        } : null,
      })),
    });
  } catch (error) {
    console.error('Admin reports list error:', error);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}
