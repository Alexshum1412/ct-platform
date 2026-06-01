// Read-only production data-integrity audit against the configured DATABASE_URL (Neon).
// Run: node prisma/audit-integrity.js
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

function parseArr(s) {
  if (!s) return [];
  try { const v = JSON.parse(s); return Array.isArray(v) ? v : []; } catch { return []; }
}
const norm = (s) => (s || '').trim().toLowerCase().replace(/\s+/g, ' ');

async function main() {
  // Sequential + narrow selects — Neon's pooled free tier drops the connection on
  // large cumulative payloads (full question/theory rows), so fetch only what we check.
  const subjects = await prisma.subject.findMany({ select: { id: true, slug: true, questionsCount: true, topicsCount: true } });
  const topics = await prisma.topic.findMany({ select: { id: true, subjectId: true } });
  const subtopics = await prisma.subtopic.findMany({ select: { id: true, topicId: true } });
  const questions = await prisma.question.findMany({ select: { id: true, status: true, content: true, explanation: true, subjectId: true, topicId: true, subtopicId: true, type: true, options: true, correctAnswer: true } });
  const theory = await prisma.theory.findMany({ select: { id: true, status: true, subjectId: true, topicId: true, content: true } });
  const exams = await prisma.exam.findMany({ select: { id: true, title: true, questionIds: true } });
  const subjectIds = new Set(subjects.map(s => s.id));
  const topicIds = new Set(topics.map(t => t.id));
  const subtopicIds = new Set(subtopics.map(s => s.id));
  const qIds = new Set(questions.map(q => q.id));

  let emptyContent = 0, emptyExplanation = 0, orphanSubject = 0, danglingTopic = 0, danglingSubtopic = 0;
  let choiceNoOptions = 0, correctNotInOptions = 0, dupOptionIds = 0, textInputWithOptions = 0;
  const choiceProblems = [];

  const active = questions.filter(q => q.status === 'ACTIVE');
  for (const q of active) {
    if (!q.content || !q.content.trim()) emptyContent++;
    if (!q.explanation || !q.explanation.trim()) emptyExplanation++;
    if (!subjectIds.has(q.subjectId)) orphanSubject++;
    if (q.topicId && !topicIds.has(q.topicId)) danglingTopic++;
    if (q.subtopicId && !subtopicIds.has(q.subtopicId)) danglingSubtopic++;

    if (q.type === 'SINGLE_CHOICE' || q.type === 'MULTIPLE_CHOICE') {
      const opts = parseArr(q.options);
      if (opts.length === 0) { choiceNoOptions++; if (choiceProblems.length < 40) choiceProblems.push(`${q.id} NO-OPTIONS [${q.type}]`); continue; }
      const ids = opts.map(o => String(o.id));
      const idSet = new Set(ids);
      if (idSet.size !== ids.length) dupOptionIds++;
      let correctIds = [String(q.correctAnswer)];
      try { const c = JSON.parse(q.correctAnswer); if (Array.isArray(c)) correctIds = c.map(String); } catch { /* plain string */ }
      const allIn = correctIds.every(c => idSet.has(c));
      if (!allIn) { correctNotInOptions++; if (choiceProblems.length < 40) choiceProblems.push(`${q.id} correct='${q.correctAnswer}' ids=[${ids.join(',')}]`); }
    } else if (q.type === 'TEXT_INPUT') {
      if (parseArr(q.options).length > 0) textInputWithOptions++;
    }
  }

  // duplicate active content
  const byContent = {};
  for (const q of active) { const k = norm(q.content); if (k) (byContent[k] = byContent[k] || []).push(q.id); }
  const dups = Object.entries(byContent).filter(([, v]) => v.length > 1);

  // theory integrity
  let theoryOrphanSubject = 0, theoryDanglingTopic = 0, theoryEmpty = 0;
  for (const t of theory.filter(t => t.status === 'ACTIVE')) {
    if (!subjectIds.has(t.subjectId)) theoryOrphanSubject++;
    if (t.topicId && !topicIds.has(t.topicId)) theoryDanglingTopic++;
    if (!t.content || !t.content.trim()) theoryEmpty++;
  }

  // exams referencing missing/empty questions
  const examIssues = [];
  for (const e of exams) {
    const ids = parseArr(e.questionIds);
    if (ids.length === 0) { examIssues.push(`"${e.title}" EMPTY (0 questions)`); continue; }
    const missing = ids.filter(id => !qIds.has(id));
    if (missing.length) examIssues.push(`"${e.title}" ${missing.length}/${ids.length} missing`);
  }

  // subject counters
  const counterMismatch = [];
  for (const s of subjects) {
    const actualQ = active.filter(q => q.subjectId === s.id).length;
    const actualT = topics.filter(t => t.subjectId === s.id).length;
    if ((s.questionsCount ?? 0) !== actualQ) counterMismatch.push(`${s.slug}: questionsCount stored=${s.questionsCount} actual=${actualQ}`);
    if ((s.topicsCount ?? 0) !== actualT) counterMismatch.push(`${s.slug}: topicsCount stored=${s.topicsCount} actual=${actualT}`);
  }

  console.log('=== DATA INTEGRITY AUDIT (Neon) ===');
  console.log(`subjects=${subjects.length} topics=${topics.length} subtopics=${subtopics.length} questions=${questions.length} (active=${active.length}) theory=${theory.length} exams=${exams.length}`);
  console.log('\n--- QUESTIONS ---');
  console.log({ emptyContent, emptyExplanation, orphanSubject, danglingTopic, danglingSubtopic, choiceNoOptions, correctNotInOptions, dupOptionIds, textInputWithOptions });
  if (choiceProblems.length) console.log('  problem samples:\n   ' + choiceProblems.join('\n   '));
  console.log(`  duplicate content groups=${dups.length} (rows=${dups.reduce((a, [, v]) => a + v.length, 0)})`);
  if (dups.length) console.log('   ' + dups.slice(0, 8).map(([k, v]) => `${v.length}x "${k.slice(0, 60)}"`).join('\n   '));
  console.log('\n--- THEORY ---');
  console.log({ theoryOrphanSubject, theoryDanglingTopic, theoryEmpty });
  console.log('\n--- EXAMS ---');
  console.log(`bad/empty exams=${examIssues.length}`);
  if (examIssues.length) console.log('   ' + examIssues.slice(0, 15).join('\n   '));
  console.log('\n--- COUNTERS ---');
  console.log(`mismatches=${counterMismatch.length}`);
  if (counterMismatch.length) console.log('   ' + counterMismatch.join('\n   '));
  console.log('\n=== END AUDIT ===');
}
main().catch(e => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
