/**
 * Компонент для отображения математических формул
 * Использует KaTeX для рендеринга LaTeX формул
 * 
 * Поддерживает:
 * - Чистые LaTeX формулы: "x = {-b \\pm \\sqrt{b^2-4ac} \\over 2a}"
 * - Смешанный текст с формулами: "Решите уравнение $x^2 + 2x + 1 = 0$"
 * - Блочные формулы: "$$E = mc^2$$"
 * 
 * Пример использования:
 * <MathFormula formula="x = {-b \\pm \\sqrt{b^2-4ac} \\over 2a}" />
 * <MathFormula formula="E = mc^2" inline />
 * <MathFormula formula="Решите $x^2 + 2x + 1 = 0$" /> (смешанный текст)
 */

import 'katex/dist/katex.min.css';
import katex from 'katex';
import { useMemo } from 'react';

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
 * $...$ - inline формулы
 * $$...$$ - блочные формулы
 * \[...\] - блочные формулы (альтернативный синтаксис)
 * \(...\) - inline формулы (альтернативный синтаксис)
 */
function containsLatexDelimiters(text: string): boolean {
  return /\$\$?[\s\S]*?\$\$?|\\\[[\s\S]*?\\\]|\\\([\s\S]*?\\\)/.test(text);
}

/**
 * Экранирует HTML и сохраняет переносы строк. Пробелы НЕ трогаем —
 * они отображаются как есть (в отличие от math-режима KaTeX, который их съедает).
 */
function escapeText(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\n/g, '<br />');
}

/**
 * Рендерит смешанный текст с формулами
 * Разбивает текст на части и рендерит формулы через KaTeX
 */
function renderMixedContent(text: string): string {
  if (!text) return '';
  
  // Регулярное выражение для поиска формул
  // $$...$$ - блочные формулы
  // $...$ - inline формулы
  const latexRegex = /(\$\$[\s\S]*?\$\$|\$[\s\S]*?\$)/g;
  
  const parts = text.split(latexRegex);
  
  return parts.map((part) => {
    // Блочная формула $$...$$
    if (part.startsWith('$$') && part.endsWith('$$')) {
      const formula = part.slice(2, -2).trim();
      try {
        return katex.renderToString(formula, {
          throwOnError: false,
          displayMode: true,
          strict: false,
        });
      } catch (error) {
        console.error('KaTeX block render error:', error);
        return `<div class="text-red-500">${formula}</div>`;
      }
    }
    
    // Inline формула $...$
    if (part.startsWith('$') && part.endsWith('$') && part.length > 1) {
      const formula = part.slice(1, -1).trim();
      try {
        return katex.renderToString(formula, {
          throwOnError: false,
          displayMode: false,
          strict: false,
        });
      } catch (error) {
        console.error('KaTeX inline render error:', error);
        return `<span class="text-red-500">${formula}</span>`;
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
  const renderedContent = useMemo(() => {
    if (!formula) return '';
    
    // Есть разделители LaTeX ($...$ / $$...$$) — смешанный текст с формулами
    if (containsLatexDelimiters(formula)) {
      return renderMixedContent(formula);
    }

    // Нет разделителей, но есть кириллица — это обычный текст (условие/ответ/теория),
    // а НЕ формула. KaTeX в math-режиме игнорирует пробелы и склеивает слова, поэтому
    // такой контент рендерим как простой текст, сохраняя пробелы и переносы.
    if (/[а-яё]/i.test(formula)) {
      return escapeText(formula);
    }

    // Иначе считаем строку «чистой» формулой (латиница/символы: "E=mc^2", "x^2", "16")
    try {
      return katex.renderToString(formula, {
        throwOnError: false,
        displayMode: !inline,
        strict: false,
      });
    } catch (error) {
      console.error('KaTeX render error:', error);
      return escapeText(formula);
    }
  }, [formula, inline]);

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
