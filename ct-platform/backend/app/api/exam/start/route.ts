import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { FREE_DAILY_EXAMS } from '@/lib/limits';

export const dynamic = 'force-dynamic';

const schema = z.object({
  subjectId: z.string().min(1),
  examId: z.string().optional(), // конкретный пробный экзамен из списка
});

export async function POST(req: NextRequest) {
  try {
    const userId = req.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json({ error: 'Требуется авторизация' }, { status: 401 });
    }

    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation error' }, { status: 400 });
    }

    // Check user plan + daily exam limit for FREE users
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { plan: true } });
    if (!user) return NextResponse.json({ error: 'Не найдено' }, { status: 404 });

    if (user.plan === 'FREE') {
      const dayStart = new Date(); dayStart.setHours(0, 0, 0, 0);
      // Считаем ВСЕ начатые сегодня попытки (а не только завершённые) — иначе free
      // мог запустить несколько экзаменов до завершения и обойти лимит «1 в день».
      const todayExamsCount = await prisma.examAttempt.count({
        where: { userId, startedAt: { gte: dayStart } },
      });
      if (todayExamsCount >= FREE_DAILY_EXAMS) {
        return NextResponse.json({
          error: 'Бесплатный план позволяет 1 пробный экзамен в день. Подключите Premium для неограниченных экзаменов.',
          code: 'EXAM_LIMIT_REACHED',
          limit: FREE_DAILY_EXAMS,
          resetAt: new Date(new Date().setHours(24, 0, 0, 0)).toISOString(),
        }, { status: 402 });
      }
    }

    const attempt = await prisma.examAttempt.create({
      data: {
        userId,
        subjectId: parsed.data.subjectId,
        examId: parsed.data.examId ?? null,
        score: 0,
        maxScore: 0,
        percentage: 0,
        totalTime: 0,
        isCompleted: false,
      },
    });

    return NextResponse.json({ attemptId: attempt.id }, { status: 201 });
  } catch (error) {
    console.error('Start exam error:', error);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}
