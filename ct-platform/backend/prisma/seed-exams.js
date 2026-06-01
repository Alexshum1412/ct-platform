/* eslint-disable */
// Seed example human-style exams per subject (curated question sets), so the
// per-subject exams page has content. Idempotent: refreshes createdBy='seed' exams.
// Admin-created exams (createdBy != 'seed') are never touched. Run: node prisma/seed-exams.js
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  await prisma.exam.deleteMany({ where: { createdBy: 'seed' } });
  const subjects = await prisma.subject.findMany({ orderBy: { order: 'asc' } });
  let created = 0;
  for (const s of subjects) {
    const qs = await prisma.question.findMany({
      where: { subjectId: s.id, status: 'ACTIVE' },
      select: { id: true }, orderBy: { createdAt: 'asc' },
    });
    if (qs.length < 5) continue;
    const ids = qs.map((q) => q.id);
    const defs = [
      { title: 'Пробный экзамен №1', take: Math.min(ids.length, 20), offset: 0, order: 1 },
      { title: 'Быстрый тест', take: Math.min(ids.length, 10), offset: 0, order: 2 },
    ];
    if (ids.length >= 30) {
      defs.push({ title: 'Пробный экзамен №2', take: 20, offset: Math.min(ids.length - 20, 20), order: 3 });
    }
    for (const d of defs) {
      const qids = ids.slice(d.offset, d.offset + d.take);
      await prisma.exam.create({
        data: {
          subjectId: s.id,
          title: d.title,
          description: `${qids.length} заданий · ${Math.max(20, qids.length * 3)} минут · формат ЦТ/ЦЭ`,
          durationMinutes: Math.max(20, qids.length * 3),
          passingScore: Math.ceil(qids.length * 0.4),
          questionIds: JSON.stringify(qids),
          isActive: true, order: d.order, createdBy: 'seed',
        },
      });
      created++;
    }
  }
  console.log('Exams created:', created);
  await prisma.$disconnect();
})().catch((e) => { console.error(e); process.exit(1); });
