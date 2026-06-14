/**
 * Геймификация: единые правила начисления опыта, уровней и метрик рейтинга.
 * Раньше опыт начислялся (+10 за верный ПЕРВЫЙ ответ), но level никогда не
 * пересчитывался, а daily-streak не велся вовсе. Здесь — источник истины.
 */

export const XP_PER_CORRECT = 10;

/**
 * Порог опыта для уровня L: 50·L·(L−1).
 * L1=0, L2=100, L3=300, L4=600, L5=1000, L6=1500 …
 */
export function xpForLevel(level: number): number {
  const l = Math.max(1, Math.floor(level));
  return 50 * l * (l - 1);
}

/** Уровень по опыту (обратная к xpForLevel). */
export function levelFromXp(xp: number): number {
  if (!Number.isFinite(xp) || xp <= 0) return 1;
  return Math.max(1, Math.floor((1 + Math.sqrt(1 + xp / 12.5)) / 2));
}

/** Прогресс внутри уровня — для полосок в UI. */
export function levelProgress(xp: number): {
  level: number; xpInLevel: number; xpForNext: number; pct: number;
} {
  const level = levelFromXp(xp);
  const base = xpForLevel(level);
  const next = xpForLevel(level + 1);
  const span = Math.max(1, next - base);
  const xpInLevel = Math.max(0, xp - base);
  return { level, xpInLevel, xpForNext: next - base, pct: Math.min(100, Math.round((xpInLevel / span) * 100)) };
}

/**
 * «Мастерство» = количество ВЕРНЫХ × точность = correct²/total.
 * Балансирует объём и точность (отвечает запросу «соотношение количества к
 * проценту правильных»): много решений с высокой точностью → высокий балл,
 * случайные угадывания на малом объёме баллов почти не дают.
 */
export function masteryScore(correct: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round((correct * correct) / total);
}

/** Точность в процентах (0 при отсутствии ответов). */
export function accuracyPct(correct: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round((correct / total) * 100);
}

/**
 * Новый daily-streak по дате последней активности.
 * Возвращает новое значение streakDays. last — дата прошлой активности (или null).
 */
export function nextStreakDays(prevStreak: number, last: Date | null, now: Date): number {
  const day = (d: Date) => Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
  const today = day(now);
  if (!last) return 1;
  const lastDay = day(last);
  const oneDay = 24 * 60 * 60 * 1000;
  if (lastDay === today) return Math.max(1, prevStreak); // уже занимались сегодня
  if (today - lastDay === oneDay) return prevStreak + 1; // вчера → продолжаем
  return 1; // пропуск → начинаем заново
}
