/* eslint-disable */
// Data-consistency fixes for CT-Platform. Idempotent. Run: node prisma/fix-data.js
const path = require('path');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({ datasources: { db: { url: `file:${path.join(__dirname, 'dev.db')}` } } });

async function main() {
  // 1) Open-answer questions (TEXT_INPUT) must be Part B, not Part A.
  //    The РИКЗ/ЦТ format: Part A = выбор ответа, Part B = открытый ответ.
  const fixedPart = await prisma.question.updateMany({
    where: { type: 'TEXT_INPUT', part: 'A' },
    data: { part: 'B' },
  });
  console.log(`[1] TEXT_INPUT questions moved A → B: ${fixedPart.count}`);

  // 2) Re-sync denormalized Subject counters from real rows (keeps cards honest).
  const subjects = await prisma.subject.findMany();
  for (const s of subjects) {
    const questionsCount = await prisma.question.count({ where: { subjectId: s.id, status: 'ACTIVE' } });
    const topicsCount = await prisma.topic.count({ where: { subjectId: s.id } });
    if (s.questionsCount !== questionsCount || s.topicsCount !== topicsCount) {
      await prisma.subject.update({ where: { id: s.id }, data: { questionsCount, topicsCount } });
      console.log(`[2] resynced ${s.slug}: Q ${s.questionsCount}->${questionsCount}, T ${s.topicsCount}->${topicsCount}`);
    }
  }
  console.log('[2] Subject counters re-synced.');

  console.log('\nDONE.');
}
main().catch(e => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
