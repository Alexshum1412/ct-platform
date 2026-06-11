/**
 * Общие компоненты раздела «Олимпиадная подготовка»: бейдж уровня этапа и
 * рендер текста задач/разборов (абзацы + KaTeX через MathFormula).
 * Константы уровней — в ./levels.ts (react-refresh требует разделения).
 */
import { MathFormula } from '@/components/ui/MathFormula';
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

/** Текст задачи/разбора: абзацы разделены пустой строкой, формулы — в $...$. */
export function OlympiadContent({ text, className = '' }: { text: string; className?: string }) {
  const paragraphs = text.split(/\n\s*\n/).map(p => p.trim()).filter(Boolean);
  return (
    <div className={`space-y-3 ${className}`}>
      {paragraphs.map((p, i) => (
        <MathFormula key={i} formula={p} className="leading-relaxed" />
      ))}
    </div>
  );
}
