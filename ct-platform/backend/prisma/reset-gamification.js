/**
 * reset-gamification.js — обнуляет геймификационные параметры ВСЕХ пользователей
 * (xp=0, level=1, streakDays=0, lastStudyDate=null). По запросу: чистый старт
 * рейтинга по опыту с корректным начислением вперёд.
 *
 * НЕ трогает UserProgress — поэтому рейтинги по точности/объёму/серии/мастерству
 * (считаются из истории ответов) остаются корректными и наполненными.
 *
 * Запуск: node prisma/reset-gamification.js [--dry]
 */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const DRY = process.argv.includes('--dry');

async function main() {
  const before = await prisma.user.findMany({
    select: { id: true, email: true, xp: true, level: true, streakDays: true },
    orderBy: { xp: 'desc' },
  });
  console.log(`Пользователей: ${before.length}`);
  console.log('До сброса (топ по xp):');
  before.slice(0, 10).forEach((u) => console.log(`  ${u.email}: xp=${u.xp} level=${u.level} streak=${u.streakDays}`));

  if (DRY) { console.log('\n[DRY] изменения не применены'); return; }

  const res = await prisma.user.updateMany({
    data: { xp: 0, level: 1, streakDays: 0, lastStudyDate: null },
  });
  console.log(`\n✓ Сброшено пользователей: ${res.count} (xp=0, level=1, streakDays=0, lastStudyDate=null)`);
  console.log('UserProgress НЕ тронут — метрики точности/объёма/серии/мастерства сохранены.');
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
