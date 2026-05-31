import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    const role = req.headers.get('x-user-role');
    if (role !== 'ADMIN') return NextResponse.json({ error: 'Доступ запрещён' }, { status: 403 });

    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search') ?? '';
    const planFilter = searchParams.get('plan');
    const limit = parseInt(searchParams.get('limit') ?? '50', 10);
    const offset = parseInt(searchParams.get('offset') ?? '0', 10);

    const where: Record<string, unknown> = {};
    if (search) {
      where.OR = [
        { email: { contains: search } },
        { name: { contains: search } },
      ];
    }
    if (planFilter && planFilter !== 'all') where.plan = planFilter;

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true, email: true, name: true, role: true, plan: true,
          city: true, school: true, xp: true, level: true, streakDays: true,
          createdAt: true, lastStudyDate: true,
          _count: { select: { progress: true, examAttempts: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.user.count({ where }),
    ]);

    return NextResponse.json({
      users: users.map(u => ({
        ...u,
        solvedCount: u._count.progress,
        examCount: u._count.examAttempts,
        _count: undefined,
      })),
      pagination: { total, limit, offset, hasMore: offset + limit < total },
    });
  } catch (error) {
    console.error('Admin users error:', error);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}
