/* eslint-disable */
// Comprehensive data-consistency audit for CT-Platform.
// Read-only. Run: node prisma/audit.js
const path = require('path');
const { PrismaClient } = require('@prisma/client');
const dbPath = path.join(__dirname, 'dev.db');
const prisma = new PrismaClient({ datasources: { db: { url: `file:${dbPath}` } } });

const norm = (s) => (s || '').replace(/\s+/g, ' ').trim().toLowerCase();
function safeJson(s, fallback) { try { return JSON.parse(s); } catch { return fallback; } }

async function main() {
  const subjects = await prisma.subject.findMany({ orderBy: { order: 'asc' } });
  const topics = await prisma.topic.findMany();
  const subtopics = await prisma.subtopic.findMany();
  const questions = await prisma.question.findMany();
  const theory = await prisma.theory.findMany();

  const topicById = new Map(topics.map(t => [t.id, t]));
  const subById = new Map(subtopics.map(s => [s.id, s]));

  console.log('================ TOTALS ================');
  console.log(`Subjects: ${subjects.length} | Topics: ${topics.length} | Subtopics: ${subtopics.length} | Questions: ${questions.length} | Theory: ${theory.length}`);

  // ---- Per-subject stored vs actual counts ----
  console.log('\n================ PER-SUBJECT COUNTS (stored vs actual) ================');
  console.log('slug                 | storedQ | actualQ | storedT | actualT | theory | qNoTopic | qNoSub');
  for (const s of subjects) {
    const sq = questions.filter(q => q.subjectId === s.id);
    const st = topics.filter(t => t.subjectId === s.id);
    const sth = theory.filter(t => t.subjectId === s.id);
    const noTopic = sq.filter(q => !q.topicId).length;
    const noSub = sq.filter(q => !q.subtopicId).length;
    const mismatchQ = s.questionsCount !== sq.length ? ' <-Q!' : '';
    const mismatchT = s.topicsCount !== st.length ? ' <-T!' : '';
    console.log(
      `${s.slug.padEnd(20)} | ${String(s.questionsCount).padStart(7)} | ${String(sq.length).padStart(7)} | ${String(s.topicsCount).padStart(7)} | ${String(st.length).padStart(7)} | ${String(sth.length).padStart(6)} | ${String(noTopic).padStart(8)} | ${String(noSub).padStart(6)}${mismatchQ}${mismatchT}`
    );
  }

  // ---- Orphaned questions ----
  const qNoSubject = questions.filter(q => !q.subjectId);
  const qNoTopic = questions.filter(q => !q.topicId);
  const qNoSubtopic = questions.filter(q => !q.subtopicId);
  const qBadTopic = questions.filter(q => q.topicId && !topicById.has(q.topicId));
  const qBadSub = questions.filter(q => q.subtopicId && !subById.has(q.subtopicId));
  // topic belongs to a different subject than the question
  const qTopicWrongSubject = questions.filter(q => q.topicId && topicById.has(q.topicId) && topicById.get(q.topicId).subjectId !== q.subjectId);
  // subtopic belongs to a different topic than the question's topic
  const qSubWrongTopic = questions.filter(q => q.subtopicId && subById.has(q.subtopicId) && q.topicId && subById.get(q.subtopicId).topicId !== q.topicId);

  console.log('\n================ ORPHANED / MISLINKED QUESTIONS ================');
  console.log(`No subjectId:            ${qNoSubject.length}`);
  console.log(`No topicId:              ${qNoTopic.length}`);
  console.log(`No subtopicId:           ${qNoSubtopic.length}`);
  console.log(`topicId not found:       ${qBadTopic.length}`);
  console.log(`subtopicId not found:    ${qBadSub.length}`);
  console.log(`topic in wrong subject:  ${qTopicWrongSubject.length}`);
  console.log(`subtopic in wrong topic: ${qSubWrongTopic.length}`);
  if (qSubWrongTopic.length) console.log('  e.g.', qSubWrongTopic.slice(0,5).map(q => q.id));

  // ---- Duplicate questions (by normalized content within subject) ----
  const seen = new Map();
  const dups = [];
  for (const q of questions) {
    const key = q.subjectId + '::' + norm(q.content);
    if (seen.has(key)) dups.push({ id: q.id, of: seen.get(key) });
    else seen.set(key, q.id);
  }
  console.log('\n================ DUPLICATE QUESTIONS (same subject + content) ================');
  console.log(`Duplicates: ${dups.length}`);
  dups.slice(0, 10).forEach(d => console.log(`  ${d.id}  (dup of ${d.of})`));

  // ---- Empty topics / subtopics ----
  const qByTopic = {}, qBySub = {}, thByTopic = {};
  for (const q of questions) { if (q.topicId) qByTopic[q.topicId] = (qByTopic[q.topicId]||0)+1; if (q.subtopicId) qBySub[q.subtopicId] = (qBySub[q.subtopicId]||0)+1; }
  for (const t of theory) { if (t.topicId) thByTopic[t.topicId] = (thByTopic[t.topicId]||0)+1; }
  const emptyTopics = topics.filter(t => !(qByTopic[t.id] > 0));
  const emptySubs = subtopics.filter(s => !(qBySub[s.id] > 0));
  const topicsNoTheory = topics.filter(t => !(thByTopic[t.id] > 0));
  console.log('\n================ EMPTY / GAPS ================');
  console.log(`Empty topics (0 questions):     ${emptyTopics.length} / ${topics.length}`);
  console.log(`Empty subtopics (0 questions):  ${emptySubs.length} / ${subtopics.length}`);
  console.log(`Topics without theory:          ${topicsNoTheory.length} / ${topics.length}`);

  // ---- Theory linkage ----
  const thNoTopic = theory.filter(t => !t.topicId);
  const thBadTopic = theory.filter(t => t.topicId && !topicById.has(t.topicId));
  const thNoSubtopic = theory.filter(t => !t.subtopicId);
  console.log('\n================ THEORY LINKAGE ================');
  console.log(`Theory without topicId:    ${thNoTopic.length}`);
  console.log(`Theory bad topicId:        ${thBadTopic.length}`);
  console.log(`Theory without subtopicId: ${thNoSubtopic.length}`);

  // ---- Question text / content quality ----
  let leadTrail = 0, doubleSpace = 0, emptyExpl = 0, noOptions = 0, badOptionsJson = 0, correctNotInOptions = 0, emptyContent = 0, tagBad = 0;
  const samples = { leadTrail: [], correctNotInOptions: [], noOptions: [] };
  for (const q of questions) {
    if (!q.content || !q.content.trim()) emptyContent++;
    if (q.content && q.content !== q.content.trim()) { leadTrail++; if (samples.leadTrail.length<5) samples.leadTrail.push(q.id); }
    if (q.content && /  +/.test(q.content.replace(/\n/g,' '))) doubleSpace++;
    if (!q.explanation || !q.explanation.trim()) emptyExpl++;
    if (safeJson(q.tags, null) === null) tagBad++;
    if (q.type === 'SINGLE_CHOICE' || q.part === 'A') {
      const opts = safeJson(q.options, null);
      if (!Array.isArray(opts) || opts.length === 0) { noOptions++; if (samples.noOptions.length<5) samples.noOptions.push(q.id); }
      else {
        if (opts.some(o => o == null || typeof o !== 'object')) badOptionsJson++;
        const ids = opts.map(o => String(o.id));
        if (!ids.includes(String(q.correctAnswer))) { correctNotInOptions++; if (samples.correctNotInOptions.length<6) samples.correctNotInOptions.push({id:q.id, ca:q.correctAnswer, ids}); }
      }
    }
  }
  console.log('\n================ QUESTION CONTENT QUALITY ================');
  console.log(`Empty content:                 ${emptyContent}`);
  console.log(`Leading/trailing whitespace:   ${leadTrail}`);
  console.log(`Double spaces inside:          ${doubleSpace}`);
  console.log(`Empty explanation:             ${emptyExpl}`);
  console.log(`Bad tags JSON:                 ${tagBad}`);
  console.log(`Choice Qs with no options:     ${noOptions}`);
  console.log(`Bad options JSON shape:        ${badOptionsJson}`);
  console.log(`correctAnswer NOT in options:  ${correctNotInOptions}`);
  if (samples.correctNotInOptions.length) console.log('  e.g.', JSON.stringify(samples.correctNotInOptions.slice(0,4)));
  if (samples.noOptions.length) console.log('  noOptions e.g.', samples.noOptions);

  // ---- Theory content quality ----
  let thEmpty = 0, thShort = 0, thBadFormulas = 0, thBadExamples = 0;
  for (const t of theory) {
    if (!t.content || !t.content.trim()) thEmpty++;
    else if (t.content.trim().length < 120) thShort++;
    if (t.formulas && safeJson(t.formulas, null) === null) thBadFormulas++;
    if (t.examples && safeJson(t.examples, null) === null) thBadExamples++;
  }
  console.log('\n================ THEORY CONTENT QUALITY ================');
  console.log(`Empty theory content:    ${thEmpty}`);
  console.log(`Very short (<120 chars): ${thShort}`);
  console.log(`Bad formulas JSON:       ${thBadFormulas}`);
  console.log(`Bad examples JSON:       ${thBadExamples}`);

  console.log('\n================ AUDIT COMPLETE ================');
}

main().catch(e => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
