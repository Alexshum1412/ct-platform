import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { getEffectivePlan } from '@/lib/plan';
import { applyDiscount, recordReferralConversion } from '@/lib/referral';

export const dynamic = 'force-dynamic';

// Тарифы (в будущем сюда подключится платёжная система). Цены в BYN.
const PLANS = {
  monthly: { label: 'Premium · месяц', days: 30, price: 15 },
  yearly: { label: 'Premium · год', days: 365, price: 99 },
} as const;

const schema = z.object({
  plan: z.enum(['monthly', 'yearly']),
  // Зарезервировано под реальную оплату (токен платёжной системы и т.п.)
  paymentToken: z.string().optional(),
});

// GET /api/subscription — текущая активная подписка пользователя (с временем покупки)
export async function GET(req: NextRequest) {
  try {
    const userId = req.headers.get('x-user-id');
    if (!userId) return NextResponse.json({ error: 'Требуется авторизация' }, { status: 401 });

    // Эффективный план: если подписка истекла, здесь же лениво понижаем до FREE.
    const planInfo = await getEffectivePlan(userId);
    const sub = await prisma.subscription.findFirst({
      where: { userId, isActive: true },
      orderBy: { startDate: 'desc' },
    });

    return NextResponse.json({
      plan: planInfo?.plan ?? 'FREE',
      isPremium: !!planInfo && planInfo.isPremium,
      subscription: sub, // содержит startDate = время покупки, endDate, paymentId
    });
  } catch (error) {
    console.error('Get subscription error:', error);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}

// POST /api/subscription — «покупка» подписки.
// Платёжная система пока не подключена: создаём запись подписки с ОТМЕТКОЙ ВРЕМЕНИ
// покупки (startDate) и активируем Premium. Когда появится платёжный провайдер,
// его подтверждение нужно проверять здесь перед активацией.
export async function POST(req: NextRequest) {
  try {
    const userId = req.headers.get('x-user-id');
    if (!userId) return NextResponse.json({ error: 'Требуется авторизация' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation error', details: parsed.error.flatten() }, { status: 400 });
    }

    // БЕЗОПАСНОСТЬ: платёжный провайдер ещё не подключён, поэтому этот эндпоинт
    // активирует Premium «в демо-режиме» без реальной оплаты. В ПРОДАКШЕНЕ это
    // открыло бы бесплатный Premium всем. Поэтому демо-активация разрешена только
    // вне production или при явном флаге ALLOW_DEMO_PREMIUM=true. Когда появится
    // реальная оплата — проверяйте здесь подтверждение платежа и снимите гейт.
    const demoAllowed = process.env.ALLOW_DEMO_PREMIUM === 'true' || process.env.NODE_ENV !== 'production';
    if (!demoAllowed) {
      return NextResponse.json(
        { error: 'Онлайн-оплата ещё не подключена. Напишите в поддержку, чтобы оформить Premium.', code: 'PAYMENT_NOT_CONFIGURED' },
        { status: 503 },
      );
    }

    const planDef = PLANS[parsed.data.plan];
    const tier = parsed.data.plan === 'yearly' ? 'PREMIUM_YEARLY' : 'PREMIUM_MONTHLY';
    const now = new Date(); // ← время покупки
    const endDate = new Date(now.getTime() + planDef.days * 24 * 60 * 60 * 1000);

    // Реферальная скидка (одноразовая, на первую покупку). Считаем серверно —
    // нельзя доверять цене с клиента.
    const me = await prisma.user.findUnique({
      where: { id: userId },
      select: { referralDiscount: true },
    });
    const discountPct = me?.referralDiscount ?? 0;
    const amount = applyDiscount(planDef.price, discountPct);

    // Завершаем прежние активные подписки, чтобы активной была одна.
    await prisma.subscription.updateMany({
      where: { userId, isActive: true },
      data: { isActive: false },
    });

    const [subscription] = await prisma.$transaction([
      prisma.subscription.create({
        data: {
          userId,
          plan: tier,
          startDate: now,
          endDate,
          isActive: true,
          autoRenew: true,
          amount,
          // Заглушка идентификатора платежа — заменится реальным id транзакции.
          paymentId: `demo-${now.getTime()}`,
        },
      }),
      // Скидка одноразовая: после покупки обнуляем.
      prisma.user.update({ where: { id: userId }, data: { plan: tier, referralDiscount: 0 } }),
    ]);

    // Фиксируем конверсию реферала (не критично — не валим оплату).
    try {
      await recordReferralConversion(userId, amount);
    } catch (e) {
      console.error('Referral conversion failed:', e);
    }

    return NextResponse.json({
      success: true,
      plan: tier,
      purchasedAt: now.toISOString(),
      amount,
      discountPct,
      subscription,
    }, { status: 201 });
  } catch (error) {
    console.error('Create subscription error:', error);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}
