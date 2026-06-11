import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// GET /api/users/progress?limit=&offset= — история практики (последние ответы)
// для вкладки «Практика» в личном кабинете. Пагинация, новые сверху.
export async function GET(req: NextRequest) {
  try {
    const userId = req.headers.get('x-user-id');
    if (!userId) return NextResponse.json({ error: 'Требуется авторизация' }, { status: 401 });

    const sp = new URL(req.url).searchParams;
    const limit = Math.min(Math.max(Number(sp.get('limit')) || 20, 1), 100);
    const offset = Math.max(Number(sp.get('offset')) || 0, 0);

    const [total, rows] = await Promise.all([
      prisma.userProgress.count({ where: { userId } }),
      prisma.userProgress.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
        select: {
          id: true,
          isCorrect: true,
          timeSpent: true,
          createdAt: true,
          questionId: true,
          question: {
            select: {
              content: true,
              part: true,
              subject: { select: { name: true, slug: true, color: true } },
              topic: { select: { name: true } },
            },
          },
        },
      }),
    ]);

    return NextResponse.json({
      total,
      limit,
      offset,
      items: rows.map(r => ({
        id: r.id,
        questionId: r.questionId,
        isCorrect: r.isCorrect,
        timeSpent: r.timeSpent,
        createdAt: r.createdAt,
        // короткое превью условия (без полного текста — для компактного списка)
        preview: r.question ? r.question.content.replace(/\s+/g, ' ').slice(0, 140) : '',
        part: r.question?.part ?? null,
        subject: r.question?.subject ?? null,
        topic: r.question?.topic?.name ?? null,
      })),
    });
  } catch (error) {
    console.error('Get practice history error:', error);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}

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
