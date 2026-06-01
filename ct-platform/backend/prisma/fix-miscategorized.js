// Detect (and with --apply, remove) generated GEN- questions whose CONTENT clearly
// belongs to a different subject than the one they were filed under — a result of the
// generator's over-greedy keyword matching (e.g. "...ом..." -> Ohm's law in Chemistry).
// High-precision classifier: only flags content with unambiguous cross-domain signals.
// Read-only unless: node prisma/fix-miscategorized.js --apply
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const APPLY = process.argv.includes('--apply');
const parseArr = (s) => { try { const v = JSON.parse(s); return Array.isArray(v) ? v : []; } catch { return []; } };

// High-precision domain signals — ONLY unambiguous multi-letter phrases.
// Deliberately avoids bare unit letters (В, А, Вт, Н, Ом) because they collide with
// common Russian words (e.g. "Вт" matches the start of "второй"). Precision > recall:
// this drives deletions, so a miss is safe but a false positive is not.
// NOTE: \w does NOT match Cyrillic in JS regex — use [а-яё]* for word endings.
// All tokens are domain-EXCLUSIVE phrases (precision over recall — this drives deletes).
const SIG = {
  chemistry: /\bмоль\b|молярн|массов[а-яё]*\s+дол|г\/моль|молярный\s+объём|при\s+н\.\s*у\./i,
  physics: /резистор|сопротивлен|сил[уа]\s+тока|свободно\s+пада|пружин|коэффициент\s+трения|импульс\s+тела|кинетическ[а-яё]*\s+энерг|потенциальн[а-яё]*\s+энерг|период\s+полураспада|удельн[а-яё]*\s+теплоёмк|вес\s+тела|мощность\s+тока|движется\s+равномерно|тело\s+движется|тело\s+начинает\s+движение|массой\s+\$[^$]*\$\s*кг/i,
  math: /Решите\s+уравнение|Вычислите:\s*\$\d|теорем[а-яё]*\s+виета|прогресси|производн|\\log|\\sqrt|\bНОД\b|\bНОК\b|пропорци|вписанн[а-яё]*\s+угол|центральн[а-яё]*\s+угол|смежн[а-яё]*\s+угол|сумма\s+углов|угл[а-яё]*\s+треугольника|третий\s+угол|гипотенуз|параболы|площадь\s+(прямоугольника|треугольника)|среднюю\s+линию|объём\s+(куба|прямоугольного)|сумм[ау]\s+корней|от\s+числа|наибольш[а-яё]*\s+корень|наименьш[а-яё]*\s+корень/i,
};
function classify(content) {
  const c = content || '';
  // Order matters least because signals are domain-exclusive, but check all and
  // require exactly-one strong match to stay high-precision.
  const hits = Object.entries(SIG).filter(([, re]) => re.test(c)).map(([k]) => k);
  return hits.length === 1 ? hits[0] : null; // ambiguous/none -> don't touch
}
const SLUG2DOMAIN = { math: 'math', physics: 'physics', chemistry: 'chemistry' };

async function main() {
  const subjects = await prisma.subject.findMany();
  const slugById = Object.fromEntries(subjects.map(s => [s.id, s.slug]));
  const gen = await prisma.question.findMany({ where: { externalId: { startsWith: 'GEN-' }, status: 'ACTIVE' } });

  const mismatches = [];
  const byMove = {};
  for (const q of gen) {
    const assigned = SLUG2DOMAIN[slugById[q.subjectId]];
    if (!assigned) continue; // GEN only exists in math/physics/chemistry anyway
    const trueDomain = classify(q.content);
    if (trueDomain && trueDomain !== assigned) {
      mismatches.push({ q, assigned, trueDomain });
      const key = `${assigned} -> ${trueDomain}`;
      byMove[key] = (byMove[key] || 0) + 1;
    }
  }

  console.log(`GEN questions: ${gen.length}`);
  console.log(`Miscategorized (clear cross-domain content): ${mismatches.length}`);
  console.log('By direction:', JSON.stringify(byMove, null, 0));
  console.log('\nSamples:');
  for (const m of mismatches.slice(0, 25)) {
    console.log(`  [${m.assigned}→${m.trueDomain}] ${m.q.content.slice(0, 70)}`);
  }

  if (!APPLY) { console.log(`\n[dry-run] re-run with --apply to remove the ${mismatches.length} miscategorized question(s).`); return; }

  console.log(`\n[apply] removing ${mismatches.length} miscategorized question(s)...`);
  for (const { q } of mismatches) {
    await prisma.$transaction(async (tx) => {
      await tx.userProgress.deleteMany({ where: { questionId: q.id } });
      await tx.favorite.deleteMany({ where: { questionId: q.id } });
      await tx.comment.deleteMany({ where: { questionId: q.id } });
      await tx.questionReport.deleteMany({ where: { questionId: q.id } });
      await tx.examQuestion.deleteMany({ where: { questionId: q.id } });
      await tx.question.delete({ where: { id: q.id } });
    });
  }
  // Re-point any exam.questionIds that referenced removed questions
  const removed = new Set(mismatches.map(m => m.q.id));
  const exams = await prisma.exam.findMany();
  for (const e of exams) {
    const ids = parseArr(e.questionIds);
    const next = ids.filter(id => !removed.has(id));
    if (next.length !== ids.length) await prisma.exam.update({ where: { id: e.id }, data: { questionIds: JSON.stringify(next) } });
  }
  // Resync counters
  for (const s of subjects) {
    const c = await prisma.question.count({ where: { subjectId: s.id, status: 'ACTIVE' } });
    if (c !== s.questionsCount) { await prisma.subject.update({ where: { id: s.id }, data: { questionsCount: c } }); console.log(`  counter ${s.slug}: ${s.questionsCount} -> ${c}`); }
  }
  console.log('[apply] done');
}
main().catch(e => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
