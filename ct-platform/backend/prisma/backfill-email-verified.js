/**
 * Одноразовый backfill: помечает все СУЩЕСТВУЮЩИЕ аккаунты как подтверждённые
 * (emailVerified = now), чтобы введение обязательной верификации email не
 * заблокировало текущих пользователей (admin, demo и ранее зарегистрированных).
 * Новые регистрации проходят верификацию обычным порядком.
 *
 * Идемпотентно: трогает только пользователей с emailVerified = null.
 * Запуск: node prisma/backfill-email-verified.js
 */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  const res = await prisma.user.updateMany({
    where: { emailVerified: null },
    data: { emailVerified: new Date() },
  });
  const total = await prisma.user.count();
  console.log(`Marked ${res.count} existing user(s) as email-verified (of ${total} total).`);
  await prisma.$disconnect();
})().catch((e) => { console.error(e); process.exit(1); });
