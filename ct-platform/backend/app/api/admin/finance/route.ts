import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// Цены тарифов (BYN) — для оценки выручки по старым подпискам без поля amount.
const PRICE: Record<string, number> = { PREMIUM_MONTHLY: 15, PREMIUM_YEARLY: 99 };
function subAmount(s: { plan: string; amount: number | null }): number {
  return s.amount != null ? s.amount : (PRICE[s.plan] ?? 0);
}
function dayKey(d: Date): string {
  return d.toISOString().split('T')[0];
}

// GET /api/admin/finance — финансы + онлайн + конверсия + влияние рефералов.
export async function GET(req: NextRequest) {
  try {
    if (req.headers.get('x-user-role') !== 'ADMIN') {
      return NextResponse.json({ error: 'Доступ запрещён' }, { status: 403 });
    }

    const now = new Date();
    const dayStart = new Date(now); dayStart.setHours(0, 0, 0, 0);
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const activeSince = new Date(now.getTime() - 15 * 60 * 1000);
    const seriesStart = new Date(now); seriesStart.setDate(seriesStart.getDate() - 29); seriesStart.setHours(0, 0, 0, 0);

    const [
      onlineNow, activeTodayRows, activeWeekRows,
      totalUsers, premiumUsers, freeUsers,
      newUsersToday, newUsersWeek, newUsersMonth,
      activeSubs, allSubs, recentUsers,
      refTotals, refCodesTotal, refCodesBlogger, refSignups, refConverted,
    ] = await Promise.all([
      prisma.user.count({ where: { updatedAt: { gte: activeSince } } }),
      prisma.userProgress.findMany({ where: { createdAt: { gte: dayStart } }, select: { userId: true }, distinct: ['userId'] }),
      prisma.userProgress.findMany({ where: { createdAt: { gte: weekAgo } }, select: { userId: true }, distinct: ['userId'] }),
      prisma.user.count(),
      prisma.user.count({ where: { plan: { not: 'FREE' } } }),
      prisma.user.count({ where: { plan: 'FREE' } }),
      prisma.user.count({ where: { createdAt: { gte: dayStart } } }),
      prisma.user.count({ where: { createdAt: { gte: weekAgo } } }),
      prisma.user.count({ where: { createdAt: { gte: monthAgo } } }),
      prisma.subscription.count({ where: { isActive: true } }),
      prisma.subscription.findMany({ select: { plan: true, amount: true, startDate: true, isActive: true } }),
      prisma.user.findMany({ where: { createdAt: { gte: seriesStart } }, select: { createdAt: true } }),
      prisma.referralCode.aggregate({ _sum: { clicks: true, signups: true, conversions: true, revenue: true } }),
      prisma.referralCode.count(),
      prisma.referralCode.count({ where: { type: 'BLOGGER' } }),
      prisma.referral.count(),
      prisma.referral.count({ where: { status: 'CONVERTED' } }),
    ]);

    // Выручка и число платежей по окнам времени.
    const revAll = allSubs.reduce((s, x) => s + subAmount(x), 0);
    const inWindow = (since: Date) => allSubs.filter((x) => x.startDate >= since);
    const revToday = inWindow(dayStart).reduce((s, x) => s + subAmount(x), 0);
    const revWeek = inWindow(weekAgo).reduce((s, x) => s + subAmount(x), 0);
    const revMonth = inWindow(monthAgo).reduce((s, x) => s + subAmount(x), 0);

    // Активные подписки по тарифам.
    const byPlan: Record<string, number> = {};
    for (const s of allSubs) if (s.isActive) byPlan[s.plan] = (byPlan[s.plan] ?? 0) + 1;

    // 30-дневные ряды: выручка, платежи, регистрации.
    const days: { date: string; revenue: number; payments: number; registrations: number }[] = [];
    const idx = new Map<string, number>();
    for (let i = 0; i < 30; i++) {
      const d = new Date(seriesStart); d.setDate(d.getDate() + i);
      const key = dayKey(d);
      idx.set(key, days.length);
      days.push({ date: key, revenue: 0, payments: 0, registrations: 0 });
    }
    for (const s of allSubs) {
      if (s.startDate < seriesStart) continue;
      const j = idx.get(dayKey(s.startDate));
      if (j !== undefined) { days[j].revenue += subAmount(s); days[j].payments += 1; }
    }
    for (const u of recentUsers) {
      const j = idx.get(dayKey(u.createdAt));
      if (j !== undefined) days[j].registrations += 1;
    }
    for (const d of days) d.revenue = Math.round(d.revenue * 100) / 100;

    const round2 = (n: number) => Math.round(n * 100) / 100;
    const conversionRate = totalUsers > 0 ? Math.round((premiumUsers / totalUsers) * 100) : 0;
    const arpu = totalUsers > 0 ? round2(revAll / totalUsers) : 0;

    return NextResponse.json({
      online: {
        now: onlineNow,
        activeToday: activeTodayRows.length,
        activeWeek: activeWeekRows.length,
      },
      users: {
        total: totalUsers, premium: premiumUsers, free: freeUsers,
        newToday: newUsersToday, newWeek: newUsersWeek, newMonth: newUsersMonth,
        conversionRate,
      },
      revenue: {
        total: round2(revAll), today: round2(revToday), week: round2(revWeek), month: round2(revMonth),
        payments: allSubs.length, activeSubscriptions: activeSubs, byPlan, arpu,
      },
      referrals: {
        codes: refCodesTotal,
        bloggerCodes: refCodesBlogger,
        clicks: refTotals._sum.clicks ?? 0,
        signups: refSignups,
        conversions: refConverted,
        revenue: round2(refTotals._sum.revenue ?? 0),
        signupShare: totalUsers > 0 ? Math.round((refSignups / totalUsers) * 100) : 0,
      },
      series: days,
    });
  } catch (e) {
    console.error('Admin finance error:', e);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}
