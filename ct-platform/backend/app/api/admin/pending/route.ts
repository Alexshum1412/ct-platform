import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    const role = req.headers.get('x-user-role');
    if (role !== 'ADMIN') {
      return NextResponse.json({ error: 'Доступ запрещён' }, { status: 403 });
    }

    const pending = await prisma.question.findMany({
      where: { status: 'PENDING' },
      select: {
        id: true,
        content: true,
        createdAt: true,
        subject: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    return NextResponse.json(
      pending.map((q) => ({
        id: q.id,
        content: q.content,
        subject: q.subject.name,
        author: 'system',
        date: q.createdAt.toISOString(),
        status: 'pending',
      }))
    );
  } catch (error) {
    console.error('Get admin pending error:', error);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}
