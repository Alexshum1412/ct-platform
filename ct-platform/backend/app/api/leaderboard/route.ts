import { NextRequest, NextResponse } from 'next/server';
import {
  computeEntries, rankEntries, metricValue, eligible,
  LB_METRICS, MIN_ACCURACY_SOLVED, type LbMetric, type LbEntry,
} from '@/lib/leaderboard';

export const dynamic = 'force-dynamic';

function toOut(e: LbEntry, rank: number | null, metric: LbMetric) {
  return {
    rank,
    userId: e.userId,
    name: e.name,
    avatar: e.avatar,
    level: e.level,
    xp: e.xp,
    solved: e.correct,
    total: e.total,
    accuracy: e.accuracy,
    maxStreak: e.maxStreak,
    mastery: e.mastery,
    city: e.city,
    value: metricValue(e, metric),
  };
}

// GET /api/leaderboard?metric=mastery|xp|solved|accuracy|streak&period=all|week|season&limit=20
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const metricParam = searchParams.get('metric') || 'mastery';
    const metric: LbMetric = (LB_METRICS as string[]).includes(metricParam) ? (metricParam as LbMetric) : 'mastery';
    // Опыт — кумулятивный, период к нему не применяется.
    let period = searchParams.get('period') || 'all';
    if (metric === 'xp') period = 'all';
    if (!['all', 'week', 'season'].includes(period)) period = 'all';
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20', 10) || 20));
    // Опциональная авторизация (middleware прокидывает x-user-id при валидном токене).
    const userId = req.headers.get('x-user-id');

    const entries = await computeEntries(period);
    const ranked = rankEntries(entries, metric);

    const leaderboard = ranked.slice(0, limit).map((e, i) => toOut(e, i + 1, metric));

    let me: (ReturnType<typeof toOut> & { eligible: boolean; outOf: number }) | null = null;
    if (userId) {
      const idx = ranked.findIndex((e) => e.userId === userId);
      if (idx >= 0) {
        me = { ...toOut(ranked[idx], idx + 1, metric), eligible: true, outOf: ranked.length };
      } else {
        const e = entries.find((x) => x.userId === userId);
        if (e) me = { ...toOut(e, null, metric), eligible: eligible(e, metric), outOf: ranked.length };
      }
    }

    return NextResponse.json({
      metric,
      period,
      totalRanked: ranked.length,
      minAccuracySolved: MIN_ACCURACY_SOLVED,
      leaderboard,
      me,
    });
  } catch (error) {
    console.error('Get leaderboard error:', error);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}
