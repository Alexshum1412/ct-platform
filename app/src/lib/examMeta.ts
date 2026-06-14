import type { ExamSummary } from '@/data/subjects';

/** Уровень («тир») экзамена, выводимый из названия. Генераторы вариантов
 *  кодируют сложность словами в заголовке (Базовый/Стандарт/Продвинутый/…). */
export interface ExamTier {
  key: string;
  label: string;
  level: number; // 1 (легко) … 5 (эксперт)
  color: string;
}

const TIERS: (ExamTier & { match: RegExp })[] = [
  { key: 'basic', label: 'Базовый', level: 1, color: '#10b981', match: /базов/i },
  { key: 'standard', label: 'Стандарт', level: 2, color: '#3b82f6', match: /стандарт/i },
  { key: 'advanced', label: 'Продвинутый', level: 3, color: '#8b5cf6', match: /продвинут/i },
  { key: 'enhanced', label: 'Усиленный', level: 4, color: '#f59e0b', match: /усиленн/i },
  { key: 'expert', label: 'Экспертный', level: 5, color: '#ef4444', match: /эксперт/i },
];

export const GENERAL_TIER: ExamTier = { key: 'general', label: 'Вариант', level: 2, color: '#64748b' };

/** Тир экзамена по заголовку. Если ничего не нашли — нейтральный «Вариант». */
export function examTier(title: string): ExamTier {
  for (const t of TIERS) {
    if (t.match.test(title)) {
      const { match: _m, ...tier } = t;
      void _m;
      return tier;
    }
  }
  return GENERAL_TIER;
}

/** Корзина по времени прохождения. */
export interface DurationBucket {
  key: 'short' | 'medium' | 'long';
  label: string;
}

export function durationBucket(minutes: number): DurationBucket {
  if (minutes <= 60) return { key: 'short', label: 'до 1 часа' };
  if (minutes <= 150) return { key: 'medium', label: '1–2,5 часа' };
  return { key: 'long', label: 'более 2,5 ч' };
}

/** Метка размера экзамена по числу заданий. */
export function sizeLabel(count: number): string {
  if (count < 15) return 'Мини';
  if (count <= 30) return 'Полный';
  return 'Большой';
}

export type ExamSort = 'new' | 'difficulty' | 'length' | 'duration' | 'passing';

export const SORT_OPTIONS: { value: ExamSort; label: string }[] = [
  { value: 'new', label: 'Сначала новые' },
  { value: 'difficulty', label: 'По сложности' },
  { value: 'length', label: 'По длине' },
  { value: 'duration', label: 'По времени' },
  { value: 'passing', label: 'По проходному баллу' },
];

/** Экзамен, обогащённый производными полями для фильтров/сортировки. */
export interface EnrichedExam extends ExamSummary {
  tier: ExamTier;
  duration: DurationBucket;
  completed: boolean;
}

export function enrichExam(e: ExamSummary, completedIds: Set<string>): EnrichedExam {
  return {
    ...e,
    tier: examTier(e.title),
    duration: durationBucket(e.durationMinutes),
    completed: completedIds.has(e.id),
  };
}

export function sortExams(list: EnrichedExam[], sort: ExamSort): EnrichedExam[] {
  const arr = [...list];
  switch (sort) {
    case 'new':
      return arr.sort((a, b) => {
        const ta = a.createdAt ? Date.parse(a.createdAt) : 0;
        const tb = b.createdAt ? Date.parse(b.createdAt) : 0;
        if (tb !== ta) return tb - ta;
        return (a.order ?? 0) - (b.order ?? 0);
      });
    case 'difficulty':
      return arr.sort((a, b) => b.tier.level - a.tier.level || b.passingScore - a.passingScore);
    case 'length':
      return arr.sort((a, b) => b.questionCount - a.questionCount);
    case 'duration':
      return arr.sort((a, b) => b.durationMinutes - a.durationMinutes);
    case 'passing':
      return arr.sort((a, b) => b.passingScore - a.passingScore);
    default:
      return arr;
  }
}
