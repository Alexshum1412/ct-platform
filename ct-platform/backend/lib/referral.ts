import { prisma } from '@/lib/prisma';

// Символы без двусмысленных (0/O, 1/I/L) — коды читаемы и легко передаются.
const CHARSET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

export function randomCode(len = 7): string {
  let s = '';
  for (let i = 0; i < len; i++) s += CHARSET[Math.floor(Math.random() * CHARSET.length)];
  return s;
}

export function normalizeCode(raw: string): string {
  return (raw || '').trim().toUpperCase().replace(/\s+/g, '');
}

/** Скидочная цена с учётом процента (округление до копеек). */
export function applyDiscount(price: number, discountPct: number): number {
  const d = Math.max(0, Math.min(100, discountPct || 0));
  return Math.round(price * (1 - d / 100) * 100) / 100;
}

/** Генерирует уникальный (проверенный по БД) реферальный код. */
export async function generateUniqueCode(len = 7): Promise<string> {
  for (let attempt = 0; attempt < 8; attempt++) {
    const code = randomCode(len);
    const existing = await prisma.referralCode.findUnique({ where: { code } });
    if (!existing) return code;
  }
  return randomCode(len + 2);
}

/** Личный код пользователя (создаёт при первом обращении). */
export async function getOrCreateUserCode(userId: string) {
  const existing = await prisma.referralCode.findFirst({
    where: { ownerId: userId, type: 'USER' },
  });
  if (existing) return existing;
  const code = await generateUniqueCode();
  return prisma.referralCode.create({
    data: { code, type: 'USER', ownerId: userId, discountPct: 15 },
  });
}

/**
 * Привязывает регистрацию к реферальному коду.
 * Защита от накрутки: нельзя пригласить себя; один реферал на пользователя
 * (Referral.userId @unique); код должен быть активен.
 * Возвращает применённую скидку или null, если код не сработал.
 */
export async function attributeSignup(
  rawCode: string,
  userId: string,
): Promise<{ discountPct: number } | null> {
  const code = normalizeCode(rawCode);
  if (!code) return null;

  const refCode = await prisma.referralCode.findUnique({ where: { code } });
  if (!refCode || !refCode.active) return null;
  if (refCode.ownerId === userId) return null; // самореферал запрещён

  const already = await prisma.referral.findUnique({ where: { userId } });
  if (already) return null; // повторное применение запрещено

  try {
    await prisma.$transaction([
      prisma.referral.create({
        data: {
          codeId: refCode.id,
          code: refCode.code,
          userId,
          status: 'SIGNED_UP',
          discountPct: refCode.discountPct,
        },
      }),
      prisma.referralCode.update({
        where: { id: refCode.id },
        data: { signups: { increment: 1 } },
      }),
      prisma.user.update({
        where: { id: userId },
        data: { referredByCode: refCode.code, referralDiscount: refCode.discountPct },
      }),
    ]);
    // Награда пригласившему: +1000 в каждую мини-игру (только у личных кодов с владельцем).
    if (refCode.ownerId) {
      try { await grantSignupReward(refCode.ownerId); } catch (e) { console.error('Signup reward failed:', e); }
    }
    return { discountPct: refCode.discountPct };
  } catch {
    // уникальный конфликт (гонка) либо иная ошибка — реферал не критичен
    return null;
  }
}

export const SIGNUP_GAME_REWARD = 1000;       // валюты в каждую игру за приглашение
export const PREMIUM_REWARD_THRESHOLD = 5;    // оплат по коду для бесплатного месяца

/** +1000 в баланс каждой мини-игры пригласившему (рекорд тоже растёт). */
async function grantSignupReward(ownerId: string): Promise<void> {
  for (const game of ['roulette', 'blackjack']) {
    const row = await prisma.gameBalance.upsert({
      where: { userId_game: { userId: ownerId, game } },
      create: { userId: ownerId, game, balance: 100 + SIGNUP_GAME_REWARD, peak: 100 + SIGNUP_GAME_REWARD },
      update: { balance: { increment: SIGNUP_GAME_REWARD } },
    });
    if (row.balance > row.peak) {
      await prisma.gameBalance.update({ where: { userId_game: { userId: ownerId, game } }, data: { peak: row.balance } });
    }
  }
}

/** Бесплатный месяц Premium (продлевает активную подписку, если она есть). */
async function grantFreeMonth(userId: string): Promise<void> {
  const now = new Date();
  const active = await prisma.subscription.findFirst({ where: { userId, isActive: true }, orderBy: { endDate: 'desc' } });
  const base = active && active.endDate > now ? active.endDate : now;
  const endDate = new Date(base.getTime() + 30 * 24 * 60 * 60 * 1000);
  await prisma.subscription.updateMany({ where: { userId, isActive: true }, data: { isActive: false } });
  await prisma.subscription.create({
    data: { userId, plan: 'PREMIUM_MONTHLY', startDate: now, endDate, isActive: true, autoRenew: false, amount: 0, paymentId: 'referral-reward' },
  });
  await prisma.user.update({ where: { id: userId }, data: { plan: 'PREMIUM_MONTHLY' } });
}

/**
 * Фиксирует конверсию (оплату) приглашённого пользователя.
 * Идемпотентна: повторная оплата того же пользователя не задваивает статистику.
 * Не бросает — вызывать в try/catch, чтобы не ронять оплату.
 */
export async function recordReferralConversion(userId: string, amount: number): Promise<void> {
  const referral = await prisma.referral.findUnique({ where: { userId } });
  if (!referral || referral.status === 'CONVERTED') return;
  await prisma.$transaction([
    prisma.referral.update({
      where: { id: referral.id },
      data: { status: 'CONVERTED', amount, convertedAt: new Date() },
    }),
    prisma.referralCode.update({
      where: { id: referral.codeId },
      data: { conversions: { increment: 1 }, revenue: { increment: amount } },
    }),
  ]);

  // 5 оплат по коду → бесплатный месяц Premium владельцу кода (однократно).
  const code = await prisma.referralCode.findUnique({ where: { id: referral.codeId } });
  if (code && code.ownerId && !code.premiumRewarded && code.conversions >= PREMIUM_REWARD_THRESHOLD) {
    // Атомарный guard: переводим флаг false→true одним updateMany, чтобы не выдать дважды.
    const reserved = await prisma.referralCode.updateMany({
      where: { id: code.id, premiumRewarded: false },
      data: { premiumRewarded: true },
    });
    if (reserved.count > 0) {
      try { await grantFreeMonth(code.ownerId); }
      catch (e) {
        console.error('Free-month reward failed:', e);
        // откатываем флаг, чтобы попытаться снова при следующей конверсии
        await prisma.referralCode.updateMany({ where: { id: code.id }, data: { premiumRewarded: false } }).catch(() => {});
      }
    }
  }
}

/** Регистрирует переход по реферальной ссылке (для статистики). Тихо игнорирует ошибки. */
export async function trackClick(rawCode: string): Promise<boolean> {
  const code = normalizeCode(rawCode);
  if (!code) return false;
  try {
    const res = await prisma.referralCode.updateMany({
      where: { code, active: true },
      data: { clicks: { increment: 1 } },
    });
    return res.count > 0;
  } catch {
    return false;
  }
}
