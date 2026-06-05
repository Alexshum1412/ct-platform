import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

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

    const sub = await prisma.subscription.findFirst({
      where: { userId, isActive: true },
      orderBy: { startDate: 'desc' },
    });
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { plan: true } });

    return NextResponse.json({
      plan: user?.plan ?? 'FREE',
      isPremium: !!user && user.plan !== 'FREE',
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

    const planDef = PLANS[parsed.data.plan];
    const tier = parsed.data.plan === 'yearly' ? 'PREMIUM_YEARLY' : 'PREMIUM_MONTHLY';
    const now = new Date(); // ← время покупки
    const endDate = new Date(now.getTime() + planDef.days * 24 * 60 * 60 * 1000);

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
          // Заглушка идентификатора платежа — заменится реальным id транзакции.
          paymentId: `demo-${now.getTime()}`,
        },
      }),
      prisma.user.update({ where: { id: userId }, data: { plan: tier } }),
    ]);

    return NextResponse.json({
      success: true,
      plan: tier,
      purchasedAt: now.toISOString(),
      subscription,
    }, { status: 201 });
  } catch (error) {
    console.error('Create subscription error:', error);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}
