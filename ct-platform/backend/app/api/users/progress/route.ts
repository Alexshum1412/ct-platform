import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// DELETE /api/users/progress — полный сброс учебного прогресса пользователя.
//
// Очищает: ответы (UserProgress), достижения (UserAchievement) и обнуляет
// геймификацию (xp / level / streak / lastStudyDate) — после этого статистика
// пересчитывается с нуля и задания можно решать заново.
//
// НЕ затрагивает: аккаунт, подписку (plan), подтверждение email (emailVerified),
// баланс игр (GameBalance), избранное, дневной лимит (DailyProgress — это
// freemium-логика, а не «прогресс»). История экзаменов также сохраняется.
export async function DELETE(req: NextRequest) {
  try {
    const userId = req.headers.get('x-user-id');
    if (!userId) return NextResponse.json({ error: 'Требуется авторизация' }, { status: 401 });

    const [progress, achievements] = await prisma.$transaction([
      prisma.userProgress.deleteMany({ where: { userId } }),
      prisma.userAchievement.deleteMany({ where: { userId } }),
      prisma.user.update({
        where: { id: userId },
        data: { xp: 0, level: 1, streakDays: 0, lastStudyDate: null },
      }),
    ]);

    return NextResponse.json({
      success: true,
      deletedAnswers: progress.count,
      deletedAchievements: achievements.count,
    });
  } catch (error) {
    console.error('Reset progress error:', error);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}
