/**
 * RichText — единый рендерер учебного контента: markdown-подмножество + KaTeX.
 *
 * Контент теории хранится в markdown (## заголовки, - списки, 1. нумерация,
 * > цитаты, **жирный**, таблицы |...|, формулы $...$). Раньше всё это
 * показывалось «сырьём» через плоский MathFormula. RichText разбирает текст
 * на блоки и рендерит их типографикой; инлайны (формулы/жирный/код) идут
 * через MathFormula, который уже умеет KaTeX и экранирование.
 *
 * Поддержано ровно то, что реально встречается в данных:
 *   #/##/###/#### заголовки · - и * списки · 1./1) нумерация · > цитаты ·
 *   | таблицы | · --- разделитель · абзацы · $...$ математика · **bold** ·
 *   `code` · _italic_
 */
import { Fragment } from 'react';
import { MathFormula } from '@/components/ui/MathFormula';

type Block =
  | { kind: 'heading'; level: 2 | 3 | 4; text: string }
  | { kind: 'paragraph'; text: string }
  | { kind: 'quote'; lines: string[] }
  | { kind: 'ul'; items: string[] }
  | { kind: 'ol'; items: string[] }
  | { kind: 'table'; header: string[]; rows: string[][] }
  | { kind: 'hr' };

function splitTableRow(line: string): string[] {
  return line.replace(/^\|/, '').replace(/\|$/, '').split('|').map(c => c.trim());
}

const isTableSeparator = (line: string) => /^\|?[\s:-]+\|[\s|:-]*$/.test(line) && line.includes('-');

export function parseBlocks(raw: string): Block[] {
  const lines = raw.replace(/\r\n/g, '\n').split('\n');
  const blocks: Block[] = [];
  let i = 0;

  const flushParagraph = (buf: string[]) => {
    const text = buf.join('\n').trim();
    if (text) blocks.push({ kind: 'paragraph', text });
    buf.length = 0;
  };

  const para: string[] = [];

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    if (!trimmed) { flushParagraph(para); i++; continue; }

    const heading = /^(#{1,4})\s+(.*)$/.exec(trimmed);
    if (heading) {
      flushParagraph(para);
      // # и ## → h2, ### → h3, #### → h4 (одна статья = один документ, h1 занят страницей)
      const level = heading[1].length <= 2 ? 2 : heading[1].length === 3 ? 3 : 4;
      blocks.push({ kind: 'heading', level: level as 2 | 3 | 4, text: heading[2].trim() });
      i++; continue;
    }

    if (/^---+$/.test(trimmed)) { flushParagraph(para); blocks.push({ kind: 'hr' }); i++; continue; }

    if (trimmed.startsWith('> ') || trimmed === '>') {
      flushParagraph(para);
      const quote: string[] = [];
      while (i < lines.length && (lines[i].trim().startsWith('> ') || lines[i].trim() === '>')) {
        quote.push(lines[i].trim().replace(/^>\s?/, ''));
        i++;
      }
      blocks.push({ kind: 'quote', lines: quote });
      continue;
    }

    if (/^[-*]\s+/.test(trimmed)) {
      flushParagraph(para);
      const items: string[] = [];
      while (i < lines.length && /^[-*]\s+/.test(lines[i].trim())) {
        items.push(lines[i].trim().replace(/^[-*]\s+/, ''));
        i++;
      }
      blocks.push({ kind: 'ul', items });
      continue;
    }

    if (/^\d+[.)]\s+/.test(trimmed)) {
      flushParagraph(para);
      const items: string[] = [];
      while (i < lines.length && /^\d+[.)]\s+/.test(lines[i].trim())) {
        items.push(lines[i].trim().replace(/^\d+[.)]\s+/, ''));
        i++;
      }
      blocks.push({ kind: 'ol', items });
      continue;
    }

    if (trimmed.startsWith('|') && trimmed.includes('|', 1)) {
      flushParagraph(para);
      const tableLines: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith('|')) {
        tableLines.push(lines[i].trim());
        i++;
      }
      const header = splitTableRow(tableLines[0]);
      const bodyLines = tableLines.slice(1).filter(l => !isTableSeparator(l));
      blocks.push({ kind: 'table', header, rows: bodyLines.map(splitTableRow) });
      continue;
    }

    para.push(trimmed);
    i++;
  }
  flushParagraph(para);
  return blocks;
}

/** Инлайн-контент: формулы + лёгкий markdown через MathFormula. */
function Inline({ text }: { text: string }) {
  return <MathFormula formula={text} inline />;
}

export function RichText({ content, className = '' }: { content: string; className?: string }) {
  const blocks = parseBlocks(content);

  return (
    <div className={`leading-relaxed ${className}`}>
      {blocks.map((b, idx) => {
        switch (b.kind) {
          case 'heading': {
            if (b.level === 2) {
              return (
                <h2 key={idx} className="text-xl sm:text-2xl font-bold tracking-tight mt-7 mb-3 first:mt-0">
                  <Inline text={b.text} />
                </h2>
              );
            }
            if (b.level === 3) {
              return (
                <h3 key={idx} className="text-lg sm:text-xl font-semibold tracking-tight mt-6 mb-2.5 first:mt-0">
                  <Inline text={b.text} />
                </h3>
              );
            }
            return (
              <h4 key={idx} className="text-base sm:text-lg font-semibold mt-5 mb-2 first:mt-0">
                <Inline text={b.text} />
              </h4>
            );
          }
          case 'paragraph':
            return (
              <p key={idx} className="my-3 first:mt-0">
                <Inline text={b.text} />
              </p>
            );
          case 'quote':
            return (
              <blockquote
                key={idx}
                className="my-4 rounded-r-xl border-l-4 border-primary/50 bg-primary/[0.06] px-4 py-3"
              >
                {b.lines.map((l, j) => (
                  <p key={j} className="my-1 first:mt-0 last:mb-0">
                    <Inline text={l} />
                  </p>
                ))}
              </blockquote>
            );
          case 'ul':
            return (
              <ul key={idx} className="my-3 space-y-1.5 pl-1">
                {b.items.map((item, j) => (
                  <li key={j} className="flex items-start gap-2.5">
                    <span className="mt-[0.55em] w-1.5 h-1.5 rounded-full bg-primary/70 shrink-0" />
                    <span className="min-w-0"><Inline text={item} /></span>
                  </li>
                ))}
              </ul>
            );
          case 'ol':
            return (
              <ol key={idx} className="my-3 space-y-1.5 pl-1">
                {b.items.map((item, j) => (
                  <li key={j} className="flex items-start gap-2.5">
                    <span className="mt-px w-6 h-6 rounded-md bg-primary/10 text-primary text-xs font-bold flex items-center justify-center shrink-0">
                      {j + 1}
                    </span>
                    <span className="min-w-0 pt-0.5"><Inline text={item} /></span>
                  </li>
                ))}
              </ol>
            );
          case 'table':
            return (
              <div key={idx} className="my-4 overflow-x-auto rounded-xl border">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-muted/60">
                      {b.header.map((h, j) => (
                        <th key={j} className="px-3 py-2 text-left font-semibold border-b">
                          <Inline text={h} />
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {b.rows.map((row, rIdx) => (
                      <tr key={rIdx} className="border-b last:border-b-0 even:bg-muted/20">
                        {row.map((cell, cIdx) => (
                          <td key={cIdx} className="px-3 py-2 align-top">
                            <Inline text={cell} />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          case 'hr':
            return <hr key={idx} className="my-6 border-border" />;
          default:
            return <Fragment key={idx} />;
        }
      })}
    </div>
  );
}

export default RichText;
