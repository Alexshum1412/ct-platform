import { prisma } from '@/lib/prisma';
import { masteryScore, accuracyPct } from '@/lib/gamification';

export type LbMetric = 'mastery' | 'xp' | 'solved' | 'accuracy' | 'streak';
export const LB_METRICS: LbMetric[] = ['mastery', 'xp', 'solved', 'accuracy', 'streak'];
// Точность считаем только при достаточном объёме — иначе 1/1=100% возглавит топ.
export const MIN_ACCURACY_SOLVED = 10;

export interface LbEntry {
  userId: string;
  name: string;
  avatar: string | null;
  level: number;
  xp: number;
  city: string | null;
  total: number;      // всего ответов (в периоде)
  correct: number;    // верных ответов
  accuracy: number;   // %
  maxStreak: number;  // макс. серия верных подряд
  mastery: number;    // correct²/total
}

/**
 * Начало периода рейтинга.
 * week — с понедельника 00:00 UTC; season — учебные 3-мес. сезоны (сен/дек/мар/июн).
 */
export function periodStart(period: string): Date | null {
  const now = new Date();
  if (period === 'week') {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    const day = d.getUTCDay(); // 0=вс
    d.setUTCDate(d.getUTCDate() - ((day + 6) % 7));
    return d;
  }
  if (period === 'season') {
    const m = now.getUTCMonth();
    const seasonStartMonth = m >= 8 ? 8 : m >= 5 ? 5 : m >= 2 ? 2 : 11;
    const year = seasonStartMonth === 11 && m < 2 ? now.getUTCFullYear() - 1 : now.getUTCFullYear();
    return new Date(Date.UTC(year, seasonStartMonth, 1));
  }
  return null;
}

/**
 * Считает метрики всех пользователей за период из UserProgress одним проходом
 * (total, correct, accuracy, maxStreak, mastery) + объединяет с User (xp/level/city).
 * Накрутка повторами невозможна: повторное решение не пишет прогресс.
 */
export async function computeEntries(period: string): Promise<LbEntry[]> {
  const since = periodStart(period);
  const progress = await prisma.userProgress.findMany({
    where: since ? { createdAt: { gte: since } } : {},
    select: { userId: true, isCorrect: true },
    orderBy: { createdAt: 'asc' }, // порядок нужен для серии подряд
  });

  const agg = new Map<string, { total: number; correct: number; cur: number; max: number }>();
  for (const p of progress) {
    let a = agg.get(p.userId);
    if (!a) { a = { total: 0, correct: 0, cur: 0, max: 0 }; agg.set(p.userId, a); }
    a.total++;
    if (p.isCorrect) { a.correct++; a.cur++; if (a.cur > a.max) a.max = a.cur; }
    else a.cur = 0;
  }

  const users = await prisma.user.findMany({
    select: { id: true, name: true, image: true, xp: true, level: true, city: true },
  });

  return users.map((u) => {
    const a = agg.get(u.id) ?? { total: 0, correct: 0, cur: 0, max: 0 };
    return {
      userId: u.id,
      name: u.name ?? 'Пользователь',
      avatar: u.image ?? null,
      level: u.level,
      xp: u.xp,
      city: u.city ?? null,
      total: a.total,
      correct: a.correct,
      accuracy: accuracyPct(a.correct, a.total),
      maxStreak: a.max,
      mastery: masteryScore(a.correct, a.total),
    };
  });
}

export function metricValue(e: LbEntry, m: LbMetric): number {
  switch (m) {
    case 'xp': return e.xp;
    case 'solved': return e.correct;
    case 'accuracy': return e.accuracy;
    case 'streak': return e.maxStreak;
    case 'mastery': default: return e.mastery;
  }
}

/** Кто попадает в рейтинг по метрике (фильтр шума). */
export function eligible(e: LbEntry, m: LbMetric): boolean {
  if (m === 'xp') return e.xp > 0;
  if (m === 'accuracy') return e.total >= MIN_ACCURACY_SOLVED;
  return e.total > 0; // solved / streak / mastery — была активность
}

/** Отфильтрованный и отсортированный по метрике список (с тай-брейками). */
export function rankEntries(entries: LbEntry[], m: LbMetric): LbEntry[] {
  return entries
    .filter((e) => eligible(e, m))
    .sort((a, b) => metricValue(b, m) - metricValue(a, m) || b.mastery - a.mastery || b.xp - a.xp);
}
