import { prisma } from '@/lib/prisma';

/**
 * Эффективный план пользователя с учётом срока подписки.
 *
 * Раньше `user.plan` выставлялся при покупке и НИКОГДА не понижался — Premium
 * оставался навсегда после окончания endDate. Теперь все freemium-проверки
 * берут план через эту функцию:
 *  - plan === 'FREE' → FREE (без лишних запросов);
 *  - plan !== 'FREE' и есть активная подписка с endDate в прошлом → лениво
 *    деактивируем её и понижаем пользователя до FREE;
 *  - plan !== 'FREE' и подписок нет вовсе → считаем план выданным вручную
 *    (например, админу) и НЕ трогаем.
 */
export async function getEffectivePlan(userId: string): Promise<{ plan: string; isPremium: boolean } | null> {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { plan: true } });
  if (!user) return null;
  if (user.plan === 'FREE') return { plan: 'FREE', isPremium: false };

  const sub = await prisma.subscription.findFirst({
    where: { userId, isActive: true },
    orderBy: { startDate: 'desc' },
    select: { id: true, endDate: true },
  });

  if (sub && sub.endDate < new Date()) {
    // Подписка истекла — понижаем (лениво, при первом обращении после истечения).
    await prisma.$transaction([
      prisma.subscription.update({ where: { id: sub.id }, data: { isActive: false } }),
      prisma.user.update({ where: { id: userId }, data: { plan: 'FREE' } }),
    ]);
    return { plan: 'FREE', isPremium: false };
  }

  return { plan: user.plan, isPremium: true };
}
