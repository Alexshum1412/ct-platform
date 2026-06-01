/* eslint-disable */
// Normalize all existing questions to the minimum difficulty (level 1).
// Idempotent. Writes to the DB in .env (Neon). Run: node prisma/set-min-difficulty.js
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
(async () => {
  const r = await prisma.question.updateMany({ data: { difficulty: 1 } });
  // keep denormalized subject counters consistent (difficulty change doesn't affect counts, but re-sync defensively)
  console.log('Questions normalized to difficulty=1:', r.count);
  await prisma.$disconnect();
})().catch((e) => { console.error(e); process.exit(1); });
