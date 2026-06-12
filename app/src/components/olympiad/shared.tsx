/**
 * Общие компоненты раздела «Олимпиадная подготовка»: бейдж уровня этапа и
 * рендер текста задач/разборов (абзацы + KaTeX через MathFormula).
 * Константы уровней — в ./levels.ts (react-refresh требует разделения).
 */
import { RichText } from '@/components/ui/RichText';
import type { OlympiadLevel } from '@/lib/api/client';
import { LEVEL_META } from './levels';

export function LevelBadge({ level, short = false }: { level: OlympiadLevel; short?: boolean }) {
  const meta = LEVEL_META[level];
  if (!meta) return null;
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap ${meta.bg} ${meta.color}`}>
      {short ? meta.short : meta.label}
    </span>
  );
}

/** Текст задачи/разбора/статьи: markdown-подмножество + KaTeX через RichText. */
export function OlympiadContent({ text, className = '' }: { text: string; className?: string }) {
  return <RichText content={text} className={className} />;
}
