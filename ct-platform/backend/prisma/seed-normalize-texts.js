// Normalize question texts: fix missing spaces, collapse whitespace, clean punctuation
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

function normalize(text) {
  if (!text) return text;
  let s = text;

  // Preserve LaTeX content
  const formulas = [];
  s = s.replace(/\$\$[\s\S]*?\$\$/g, (m) => { formulas.push(m); return `__F${formulas.length - 1}__`; });
  s = s.replace(/\$[^$\n]+?\$/g, (m) => { formulas.push(m); return `__F${formulas.length - 1}__`; });

  // Fix missing space after punctuation: ",word" -> ", word"
  s = s.replace(/([,.;:!?])([A-Za-zА-Яа-яЁё])/g, '$1 $2');
  // Fix missing space after closing parens before letters: ")word" -> ") word"
  s = s.replace(/(\))([A-Za-zА-Яа-яЁё])/g, '$1 $2');
  // Fix missing space before opening parens: "word(" -> "word ("
  s = s.replace(/([A-Za-zА-Яа-яЁё])(\()/g, '$1 $2');
  // CamelCase / lowercase-uppercase boundary: добавить пробел "слОВО" -> sometimes ok, skip
  // Lowercase Cyrillic letter followed by uppercase (likely missing space)
  s = s.replace(/([а-яё])([А-ЯЁ])/g, '$1 $2');

  // Multiple spaces → one
  s = s.replace(/[ \t]+/g, ' ');
  // Multiple blank lines → max 2
  s = s.replace(/\n{3,}/g, '\n\n');

  // Restore formulas
  s = s.replace(/__F(\d+)__/g, (_, i) => formulas[parseInt(i, 10)] ?? '');

  return s.trim();
}

async function main() {
  console.log('🧹 Нормализация текстов заданий...');

  const questions = await prisma.question.findMany({
    select: { id: true, content: true, explanation: true, solution: true },
  });

  let updated = 0;
  for (const q of questions) {
    const newContent = normalize(q.content);
    const newExpl = normalize(q.explanation);
    const newSol = q.solution ? normalize(q.solution) : null;
    if (newContent !== q.content || newExpl !== q.explanation || newSol !== q.solution) {
      await prisma.question.update({
        where: { id: q.id },
        data: { content: newContent, explanation: newExpl, ...(q.solution ? { solution: newSol } : {}) },
      });
      updated++;
    }
  }

  console.log(`✅ Нормализовано ${updated} заданий`);

  // Also normalize theory
  const theory = await prisma.theory.findMany({ select: { id: true, content: true } });
  let thUpdated = 0;
  for (const t of theory) {
    const newC = normalize(t.content);
    if (newC !== t.content) {
      await prisma.theory.update({ where: { id: t.id }, data: { content: newC } });
      thUpdated++;
    }
  }
  console.log(`✅ Нормализовано ${thUpdated} статей теории`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
