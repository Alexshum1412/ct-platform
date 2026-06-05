/**
 * Одноразовая (идемпотентная) миграция данных:
 *
 *  1) ФОРМУЛЫ В ПОДСКАЗКАХ. Генераторы сохраняли подсказки как
 *     explanation/solution с вырезанными разделителями `$...$`
 *     (`.replace(/\$/g,'')`), из-за чего LaTeX вроде `\cdot`, `\frac`, `\sqrt`
 *     отображался «сырым» текстом. Здесь мы аккуратно ВОЗВРАЩАЕМ `$`: подсказку
 *     заменяем только если она в точности равна explanation/solution без `$`
 *     (то есть была авторесгенерирована) — рукописные подсказки не трогаем.
 *
 *  2) СЛОЖНОСТЬ. По требованию все существующие задания переводятся на
 *     минимальный уровень сложности (difficulty = 1).
 *
 * Запуск:  node prisma/fix-hints-difficulty.js
 *          node prisma/fix-hints-difficulty.js --dry    (только показать, без записи)
 */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const DRY = process.argv.includes('--dry');
const stripDollar = (s) => (s || '').replace(/\$/g, '');

function fixHintArray(arr, source) {
  // Возвращаем массив-подсказку с $, если он был получен вырезанием $ из source.
  if (!Array.isArray(arr) || arr.length !== 1 || !source) return { arr, changed: false };
  if (arr[0] === source) return { arr, changed: false };            // уже с $
  if (arr[0] === stripDollar(source) && source.includes('$')) {
    return { arr: [source], changed: true };                        // вернуть $
  }
  return { arr, changed: false };
}

async function fixHints() {
  const rows = await prisma.question.findMany({
    where: { NOT: [{ hints: null }, { hints: '' }] },
    select: { id: true, hints: true, explanation: true, solution: true },
  });

  let scanned = 0, fixed = 0;
  for (const q of rows) {
    scanned++;
    let parsed;
    try { parsed = JSON.parse(q.hints); } catch { continue; }
    if (!parsed || typeof parsed !== 'object') continue;

    let changed = false;
    const small = fixHintArray(parsed.small, q.explanation);
    if (small.changed) { parsed.small = small.arr; changed = true; }
    const detailed = fixHintArray(parsed.detailed, q.solution || q.explanation);
    if (detailed.changed) { parsed.detailed = detailed.arr; changed = true; }

    if (changed) {
      fixed++;
      if (!DRY) {
        await prisma.question.update({ where: { id: q.id }, data: { hints: JSON.stringify(parsed) } });
      }
    }
  }
  console.log(`[hints] scanned ${scanned} | ${DRY ? 'would fix' : 'fixed'} ${fixed}`);
}

async function setMinDifficulty() {
  const before = await prisma.question.groupBy({ by: ['difficulty'], _count: { _all: true } });
  const nonMin = before.filter((b) => b.difficulty !== 1).reduce((n, b) => n + b._count._all, 0);
  console.log('[difficulty] distribution before:', before.map((b) => `${b.difficulty}:${b._count._all}`).join(' '));
  if (!DRY) {
    const res = await prisma.question.updateMany({ where: { difficulty: { not: 1 } }, data: { difficulty: 1 } });
    console.log(`[difficulty] set ${res.count} questions to difficulty=1`);
  } else {
    console.log(`[difficulty] would set ${nonMin} questions to difficulty=1`);
  }
}

(async () => {
  console.log(DRY ? '— DRY RUN (no writes) —' : '— APPLYING —');
  await fixHints();
  await setMinDifficulty();
  await prisma.$disconnect();
})().catch((e) => { console.error(e); process.exit(1); });
