import { prisma } from '@/lib/prisma';

/**
 * Создание in-app уведомления. Вторичная функция: сбой никогда не должен
 * ломать основную операцию (выдачу достижения, сабмит и т.п.).
 */
export async function createNotification(
  userId: string,
  data: { type: string; title: string; message: string; actionUrl?: string },
): Promise<void> {
  try {
    await prisma.notification.create({
      data: {
        userId,
        type: data.type,
        title: data.title.slice(0, 200),
        message: data.message.slice(0, 500),
        actionUrl: data.actionUrl ?? null,
      },
    });
  } catch (error) {
    console.error('createNotification error:', error);
  }
}
