/**
 * rebuild-exam-diversity.js — устраняет «однотипные» задания внутри пробных
 * экзаменов. Каждый сгенерированный экзамен (createdBy exam-generator /
 * exam-generator2) пересобирается так, чтобы ВСЕ его задания были из РАЗНЫХ
 * генераторов (подтем), сохраняя разбивку Часть A / Часть B.
 *
 * Сигнатура генератора = externalId без последнего «-<i>» (EXM-<subtopic> /
 * EXX-<subtopic>). Детерминирован по exam.id (повторный запуск стабилен).
 * Перед изменением делает бэкап текущих questionIds в data/.
 *
 * Запуск: node prisma/rebuild-exam-diversity.js [--dry]
 */
const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();
const DRY = process.argv.includes('--dry');

const sigOf = (ext) => (ext || '').split('-').slice(0, -1).join('-');

function hash(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function shuffle(arr, rng) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const PREFIXES = { 'exam-generator': ['EXM'], 'exam-generator2': ['EXM', 'EXX'] };

async function main() {
  const math = await prisma.subject.findFirst({ where: { slug: 'math' }, select: { id: true } });
  if (!math) throw new Error('math subject not found');

  const exams = await prisma.exam.findMany({
    where: { OR: [{ createdBy: 'exam-generator' }, { createdBy: 'exam-generator2' }] },
    select: { id: true, title: true, createdBy: true, questionIds: true, order: true },
    orderBy: [{ createdBy: 'asc' }, { order: 'asc' }],
  });

  // Пул заданий по префиксам, сгруппированный по part+sig.
  async function poolFor(prefixes) {
    const pool = { A: new Map(), B: new Map() };
    for (const prefix of prefixes) {
      const qs = await prisma.question.findMany({
        where: { subjectId: math.id, status: 'ACTIVE', externalId: { startsWith: prefix + '-' } },
        select: { id: true, externalId: true, part: true },
      });
      for (const q of qs) {
        const bucket = q.part === 'A' ? pool.A : pool.B;
        const sig = sigOf(q.externalId);
        if (!bucket.has(sig)) bucket.set(sig, []);
        bucket.get(sig).push({ id: q.id, ext: q.externalId });
      }
    }
    // стабильная сортировка инстансов внутри сигнатуры
    for (const m of [pool.A, pool.B]) for (const arr of m.values()) arr.sort((a, b) => hash(a.id) - hash(b.id));
    return pool;
  }

  // Текущие части заданий (для сохранения разбивки A/B экзамена).
  const allCurrentIds = [...new Set(exams.flatMap((e) => { try { return JSON.parse(e.questionIds); } catch { return []; } }))];
  const curParts = new Map(
    (await prisma.question.findMany({ where: { id: { in: allCurrentIds } }, select: { id: true, part: true } }))
      .map((q) => [q.id, q.part]),
  );

  const backup = [];
  const report = [];

  for (const exam of exams) {
    let ids = [];
    try { ids = JSON.parse(exam.questionIds); } catch { ids = []; }
    backup.push({ id: exam.id, title: exam.title, questionIds: ids });

    const countA = ids.filter((id) => curParts.get(id) === 'A').length || 10;
    const countB = ids.length - countA || 20;

    const pool = await poolFor(PREFIXES[exam.createdBy] || ['EXM']);
    const rng = mulberry32(hash(exam.id));

    // Глобальная уникальность сигнатур: одна подтема даёт не больше одного
    // задания на весь экзамен (Часть A и Часть B не пересекаются по генератору).
    const usedSigs = new Set();
    const pick = (bucket, n) => {
      const sigs = shuffle([...bucket.keys()], rng).filter((s) => !usedSigs.has(s)).slice(0, n);
      sigs.forEach((s) => usedSigs.add(s));
      return sigs.map((sig) => {
        const inst = bucket.get(sig);
        return inst[hash(exam.id + '|' + sig) % inst.length].id;
      });
    };

    const pickedA = pick(pool.A, countA);
    const pickedB = pick(pool.B, countB);
    const newIds = [...pickedA, ...pickedB];

    // Контроль: все из разных генераторов?
    const newSigs = new Set(newIds.map((id) => {
      // восстановим sig через ext: ищем в пуле
      for (const m of [pool.A, pool.B]) for (const [sig, arr] of m) if (arr.some((x) => x.id === id)) return sig;
      return id;
    }));
    const changed = newIds.length === ids.length && newIds.some((id, i) => id !== ids[i]);

    report.push({ title: exam.title, total: newIds.length, distinct: newSigs.size, changed });

    if (!DRY) {
      await prisma.exam.update({ where: { id: exam.id }, data: { questionIds: JSON.stringify(newIds) } });
    }
  }

  if (!DRY) {
    const dir = path.join(__dirname, '..', '..', '..', 'data');
    try { fs.mkdirSync(dir, { recursive: true }); } catch { /* */ }
    const file = path.join(dir, 'exams-diversity-backup.json');
    // НЕ перезаписываем существующий бэкап: при повторном запуске в нём уже
    // лежат пересобранные наборы, и оригинал (точку отката) можно потерять.
    if (fs.existsSync(file)) {
      console.log('Backup already exists, keeping original:', file);
    } else {
      fs.writeFileSync(file, JSON.stringify(backup, null, 2));
      console.log('Backup written:', file);
    }
  }

  console.log(DRY ? '\n=== DRY RUN ===' : '\n=== UPDATED ===');
  for (const r of report) console.log(`  [${r.distinct}/${r.total} distinct] ${r.changed ? '✓changed' : '=same'}  ${r.title}`);
  const bad = report.filter((r) => r.distinct < r.total);
  console.log(bad.length === 0 ? '\nAll exams now use 100% distinct generators.' : `\n⚠ ${bad.length} exams still have repeats (pool too small).`);
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
