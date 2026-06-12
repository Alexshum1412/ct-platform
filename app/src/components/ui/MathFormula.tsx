/**
 * Компонент для отображения математических формул
 * Использует KaTeX для рендеринга LaTeX формул
 *
 * KaTeX загружается ЛЕНИВО (см. lib/katexLoader): пока модуль не подгружен,
 * показывается экранированный исходный текст, затем формулы дорисовываются.
 *
 * Поддерживает:
 * - Чистые LaTeX формулы: "x = {-b \\pm \\sqrt{b^2-4ac} \\over 2a}"
 * - Смешанный текст с формулами: "Решите уравнение $x^2 + 2x + 1 = 0$"
 * - Блочные формулы: "$$E = mc^2$$"
 */

import { useEffect, useMemo, useState } from 'react';
import type katexType from 'katex';
import { getKatex, loadKatex } from '@/lib/katexLoader';

type KatexModule = typeof katexType;

// =====================================================
// ТИПЫ И ИНТЕРФЕЙСЫ
// =====================================================

interface MathFormulaProps {
  /**
   * LaTeX формула или текст с формулами для отображения
   * Поддерживает $...$ для inline и $$...$$ для блочных формул
   */
  formula: string;
  /**
   * Режим отображения:
   * - inline: встроенная формула (в тексте)
   * - block: блочная формула (по центру, отдельно)
   */
  inline?: boolean;
  /** Дополнительные CSS классы */
  className?: string;
}

// =====================================================
// УТИЛИТЫ
// =====================================================

/**
 * Проверяет, содержит ли строка LaTeX разделители
 * $...$ - inline формулы, $$...$$ - блочные
 */
function containsLatexDelimiters(text: string): boolean {
  return /\$\$?[\s\S]*?\$\$?|\\\[[\s\S]*?\\\]|\\\([\s\S]*?\\\)/.test(text);
}

/**
 * Экранирует HTML и сохраняет переносы строк. Пробелы НЕ трогаем —
 * они отображаются как есть (в отличие от math-режима KaTeX, который их съедает).
 * После экранирования поддерживается лёгкий inline-markdown, реально живущий
 * в контенте: **жирный**, `код`, _курсив_ (блочную структуру — заголовки,
 * списки, цитаты — разбирает RichText поверх этого компонента).
 */
function escapeText(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/`([^`\n]+)`/g, '<code class="rounded bg-muted px-1.5 py-0.5 text-[0.9em] font-mono">$1</code>')
    .replace(/\*\*([^*\n][^*]*?)\*\*/g, '<strong>$1</strong>')
    .replace(/(?<![\w_])_([^_\n]+?)_(?![\w_])/g, '<em>$1</em>')
    .replace(/\n/g, '<br />');
}

/** Нужен ли KaTeX для этой строки (есть формулы или это «чистая» формула без кириллицы). */
function needsKatex(formula: string): boolean {
  if (!formula) return false;
  if (containsLatexDelimiters(formula)) return true;
  return !/[а-яё]/i.test(formula);
}

/**
 * Рендерит смешанный текст с формулами
 * Разбивает текст на части и рендерит формулы через KaTeX
 */
function renderMixedContent(text: string, katex: KatexModule): string {
  if (!text) return '';

  // $$...$$ — блочные формулы, $...$ — inline
  const latexRegex = /(\$\$[\s\S]*?\$\$|\$[\s\S]*?\$)/g;

  const parts = text.split(latexRegex);

  return parts.map((part) => {
    // Блочная формула $$...$$
    if (part.startsWith('$$') && part.endsWith('$$')) {
      const formula = part.slice(2, -2).trim();
      try {
        return katex.renderToString(formula, { throwOnError: false, displayMode: true, strict: false });
      } catch (error) {
        console.error('KaTeX block render error:', error);
        return `<div class="text-red-500">${escapeText(formula)}</div>`;
      }
    }

    // Inline формула $...$
    if (part.startsWith('$') && part.endsWith('$') && part.length > 1) {
      const formula = part.slice(1, -1).trim();
      try {
        return katex.renderToString(formula, { throwOnError: false, displayMode: false, strict: false });
      } catch (error) {
        console.error('KaTeX inline render error:', error);
        return `<span class="text-red-500">${escapeText(formula)}</span>`;
      }
    }

    // Обычный текст — экранируем HTML, пробелы и переносы сохраняются
    return escapeText(part);
  }).join('');
}

// =====================================================
// КОМПОНЕНТ MathFormula
// =====================================================

/**
 * Компонент для отображения математических формул
 * Автоматически определяет тип контента и рендерит соответственно
 */
export function MathFormula({ formula, inline = false, className = '' }: MathFormulaProps) {
  const wantsKatex = useMemo(() => needsKatex(formula), [formula]);
  // Если модуль уже в памяти — рендерим формулы сразу, без мигания.
  const [katexReady, setKatexReady] = useState(() => !!getKatex());

  useEffect(() => {
    if (!wantsKatex || katexReady) return;
    let alive = true;
    void loadKatex().then(() => { if (alive) setKatexReady(true); });
    return () => { alive = false; };
  }, [wantsKatex, katexReady]);

  const renderedContent = useMemo(() => {
    if (!formula) return '';

    const katex = getKatex();

    // Есть разделители LaTeX ($...$ / $$...$$) — смешанный текст с формулами
    if (containsLatexDelimiters(formula)) {
      // Пока KaTeX грузится — показываем исходный текст (формулы дорисуются).
      return katex ? renderMixedContent(formula, katex) : escapeText(formula);
    }

    // Нет разделителей, но есть кириллица — это обычный текст (условие/ответ/теория),
    // а НЕ формула. KaTeX в math-режиме игнорирует пробелы и склеивает слова, поэтому
    // такой контент рендерим как простой текст, сохраняя пробелы и переносы.
    if (/[а-яё]/i.test(formula)) {
      return escapeText(formula);
    }

    // Иначе считаем строку «чистой» формулой (латиница/символы: "E=mc^2", "x^2", "16")
    if (!katex) return escapeText(formula);
    try {
      return katex.renderToString(formula, { throwOnError: false, displayMode: !inline, strict: false });
    } catch (error) {
      console.error('KaTeX render error:', error);
      return escapeText(formula);
    }
    // katexReady в зависимостях — после загрузки модуля контент пересчитывается.
  }, [formula, inline, katexReady]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <span
      className={`
        ${inline ? 'inline' : 'block my-2 max-w-full overflow-x-auto'}
        ${className}
      `}
      style={{ whiteSpace: inline ? 'normal' : 'pre-wrap', wordBreak: 'break-word', overflowWrap: 'anywhere' }}
      dangerouslySetInnerHTML={{ __html: renderedContent }}
    />
  );
}

// =====================================================
// КОМПОНЕНТ FormulaBlock
// =====================================================

/**
 * Компонент для отображения формулы в блоке с фоном
 * Подходит для важных формул в теории
 */
export function FormulaBlock({
  formula,
  name,
  description
}: {
  formula: string;
  name?: string;
  description?: string;
}) {
  return (
    <div className="my-4 p-4 bg-muted/50 rounded-xl border border-border">
      {name && (
        <p className="text-sm text-muted-foreground mb-2 font-medium">
          {name}
        </p>
      )}
      <div className="overflow-x-auto">
        <MathFormula formula={formula} />
      </div>
      {description && (
        <p className="text-sm text-muted-foreground mt-2">
          {description}
        </p>
      )}
    </div>
  );
}

// =====================================================
// КОМПОНЕНТ InlineFormula
// =====================================================

/**
 * Компонент для inline формул в тексте
 * Короткий синтаксис для удобства использования
 */
export function InlineFormula({ formula, className = '' }: { formula: string; className?: string }) {
  return <MathFormula formula={formula} inline className={className} />;
}
