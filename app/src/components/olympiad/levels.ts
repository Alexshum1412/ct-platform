/**
 * Метаданные уровней этапов республиканской олимпиады РБ
 * (отдельный файл без компонентов — требование react-refresh).
 */
import type { OlympiadLevel } from '@/lib/api/client';

export const LEVEL_ORDER: OlympiadLevel[] = ['SCHOOL', 'DISTRICT', 'REGION', 'REPUBLIC'];

export const LEVEL_META: Record<OlympiadLevel, { label: string; short: string; color: string; bg: string; points: number }> = {
  SCHOOL:   { label: 'Школьный этап',        short: 'Школьный',        color: 'text-emerald-700 dark:text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/30', points: 10 },
  DISTRICT: { label: 'Районный этап',        short: 'Районный',        color: 'text-sky-700 dark:text-sky-400',         bg: 'bg-sky-500/10 border-sky-500/30',         points: 20 },
  REGION:   { label: 'Областной этап',       short: 'Областной',       color: 'text-violet-700 dark:text-violet-400',   bg: 'bg-violet-500/10 border-violet-500/30',   points: 35 },
  REPUBLIC: { label: 'Республиканский этап', short: 'Республиканский', color: 'text-amber-700 dark:text-amber-400',     bg: 'bg-amber-500/10 border-amber-500/30',     points: 50 },
};
