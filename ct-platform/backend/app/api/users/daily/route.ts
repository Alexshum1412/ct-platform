import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { FREE_DAILY_QUESTIONS as FREE_DAILY_LIMIT } from '@/lib/limits';
import { getEffectivePlan } from '@/lib/plan';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const userId = req.headers.get('x-user-id');
    if (!userId) return NextResponse.json({ error: 'Требуется авторизация' }, { status: 401 });

    // Эффективный план — с учётом истечения подписки.
    const planInfo = await getEffectivePlan(userId);
    if (!planInfo) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const today = new Date().toISOString().split('T')[0];
    const daily = await prisma.dailyProgress.findUnique({ where: { userId_date: { userId, date: today } } });

    const count = daily?.count ?? 0;
    const isPremium = planInfo.isPremium;

    return NextResponse.json({
      date: today,
      count,
      limit: FREE_DAILY_LIMIT,
      remaining: isPremium ? null : Math.max(0, FREE_DAILY_LIMIT - count),
      isPremium,
      resetAt: new Date(new Date().setHours(24, 0, 0, 0)).toISOString(),
    });
  } catch (error) {
    console.error('Daily limit error:', error);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}
