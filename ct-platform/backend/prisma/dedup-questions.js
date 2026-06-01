// Inspect and (with --apply) safely remove exact-duplicate questions.
// Keeper = most-referenced (exam refs > progress > favorites), then oldest.
// Non-keepers are deleted only after their references are re-pointed to the keeper.
// Read-only unless run with: node prisma/dedup-questions.js --apply
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const APPLY = process.argv.includes('--apply');
const norm = (s) => (s || '').trim().toLowerCase().replace(/\s+/g, ' ');
const parseArr = (s) => { try { const v = JSON.parse(s); return Array.isArray(v) ? v : []; } catch { return []; } };

async function main() {
  const questions = await prisma.question.findMany({ where: { status: 'ACTIVE' } });
  const exams = await prisma.exam.findMany();
  const subjects = await prisma.subject.findMany();
  const subjSlug = Object.fromEntries(subjects.map(s => [s.id, s.slug]));

  // Only treat as duplicates WITHIN the same subject. Identical content across
  // different subjects (e.g. capital of Belarus in geography AND history) is legitimate.
  const groups = {};
  for (const q of questions) { const c = norm(q.content); if (c) { const k = q.subjectId + '|' + c; (groups[k] = groups[k] || []).push(q); } }
  const dupGroups = Object.entries(groups).filter(([, v]) => v.length > 1);

  console.log(`Found ${dupGroups.length} duplicate groups\n`);
  const toDelete = [];

  for (const [, copies] of dupGroups) {
    const enriched = [];
    for (const q of copies) {
      const [progress, favorites, reports, comments, examQ] = await Promise.all([
        prisma.userProgress.count({ where: { questionId: q.id } }),
        prisma.favorite.count({ where: { questionId: q.id } }),
        prisma.questionReport.count({ where: { questionId: q.id } }),
        prisma.comment.count({ where: { questionId: q.id } }),
        prisma.examQuestion.count({ where: { questionId: q.id } }),
      ]);
      const inExams = exams.filter(e => parseArr(e.questionIds).includes(q.id)).length;
      enriched.push({ q, progress, favorites, reports, comments, examQ, inExams,
        score: inExams * 1000 + progress * 100 + favorites * 10 + examQ * 5 + comments + reports });
    }
    // keeper = highest score, tie-break oldest
    enriched.sort((a, b) => b.score - a.score || new Date(a.q.createdAt) - new Date(b.q.createdAt));
    const keeper = enriched[0];
    const losers = enriched.slice(1);
    console.log(`"${keeper.q.content.slice(0, 55)}" [${subjSlug[keeper.q.subjectId]}]`);
    console.log(`  KEEP  ${keeper.q.id} ext=${keeper.q.externalId} src=${keeper.q.source} prog=${keeper.progress} fav=${keeper.favorites} exams=${keeper.inExams}`);
    for (const l of losers) {
      console.log(`  DROP  ${l.q.id} ext=${l.q.externalId} src=${l.q.source} prog=${l.progress} fav=${l.favorites} rep=${l.reports} com=${l.comments} examQ=${l.examQ} exams=${l.inExams}`);
      toDelete.push({ loser: l, keeperId: keeper.q.id });
    }
  }

  if (!APPLY) { console.log(`\n[dry-run] would remove ${toDelete.length} duplicate(s). Re-run with --apply`); return; }

  console.log(`\n[apply] removing ${toDelete.length} duplicate(s)...`);
  for (const { loser, keeperId } of toDelete) {
    const id = loser.q.id;
    await prisma.$transaction(async (tx) => {
      // Re-point exam questionIds from loser -> keeper (dedupe within each exam)
      for (const e of exams) {
        const ids = parseArr(e.questionIds);
        if (ids.includes(id)) {
          const next = [...new Set(ids.map(x => (x === id ? keeperId : x)))];
          await tx.exam.update({ where: { id: e.id }, data: { questionIds: JSON.stringify(next) } });
        }
      }
      // Move user-data references to the keeper, then delete remaining blockers
      await tx.userProgress.updateMany({ where: { questionId: id }, data: { questionId: keeperId } }).catch(() => {});
      await tx.favorite.deleteMany({ where: { questionId: id } });   // keeper may already be favorited; avoid unique clash
      await tx.comment.updateMany({ where: { questionId: id }, data: { questionId: keeperId } });
      await tx.questionReport.updateMany({ where: { questionId: id }, data: { questionId: keeperId } });
      await tx.examQuestion.updateMany({ where: { questionId: id }, data: { questionId: keeperId } });
      await tx.question.delete({ where: { id } });
    });
    console.log(`  removed ${id} (refs -> ${keeperId})`);
  }

  // Resync subject counters
  for (const s of subjects) {
    const c = await prisma.question.count({ where: { subjectId: s.id, status: 'ACTIVE' } });
    if (c !== s.questionsCount) { await prisma.subject.update({ where: { id: s.id }, data: { questionsCount: c } }); console.log(`  counter ${s.slug}: ${s.questionsCount} -> ${c}`); }
  }
  console.log('[apply] done');
}
main().catch(e => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
