import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const schema = z.object({
  questionId: z.string().min(1),
  answer: z.string().min(1),
  timeSpent: z.number().int().min(0),
});

const FREE_DAILY_LIMIT = 20;

export async function POST(req: NextRequest) {
  try {
    const userId = req.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json({ error: 'Требуется авторизация' }, { status: 401 });
    }

    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation error', details: parsed.error.flatten() }, { status: 400 });
    }

    // Check user plan
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { plan: true } });
    if (!user) return NextResponse.json({ error: 'Пользователь не найден' }, { status: 404 });

    // Freemium gating: free users limited to 10 questions/day
    if (user.plan === 'FREE') {
      const today = new Date().toISOString().split('T')[0];
      const daily = await prisma.dailyProgress.findUnique({ where: { userId_date: { userId, date: today } } });

      if (daily && daily.count >= FREE_DAILY_LIMIT) {
        return NextResponse.json({
          error: 'Дневной лимит исчерпан',
          code: 'DAILY_LIMIT_REACHED',
          limit: FREE_DAILY_LIMIT,
          resetAt: new Date(new Date().setHours(24, 0, 0, 0)).toISOString(),
        }, { status: 402 });
      }
    }

    const question = await prisma.question.findUnique({ where: { id: parsed.data.questionId } });
    if (!question) return NextResponse.json({ error: 'Задание не найдено' }, { status: 404 });

    const prevAttempts = await prisma.userProgress.count({ where: { userId, questionId: parsed.data.questionId } });
    const isCorrect = parsed.data.answer === question.correctAnswer;
    const xpGain = isCorrect && prevAttempts === 0 ? 10 : 0;

    const [progress] = await prisma.$transaction([
      prisma.userProgress.create({
        data: {
          userId,
          questionId: parsed.data.questionId,
          userAnswer: parsed.data.answer,
          timeSpent: parsed.data.timeSpent,
          isCorrect,
          attemptNumber: prevAttempts + 1,
        },
      }),
      ...(xpGain > 0 ? [prisma.user.update({ where: { id: userId }, data: { xp: { increment: xpGain } } })] : []),
    ]);

    // Update daily progress counter
    if (user.plan === 'FREE') {
      const today = new Date().toISOString().split('T')[0];
      await prisma.dailyProgress.upsert({
        where: { userId_date: { userId, date: today } },
        update: { count: { increment: 1 } },
        create: { userId, date: today, count: 1 },
      });
    }

    // Get updated daily count
    const today = new Date().toISOString().split('T')[0];
    const daily = await prisma.dailyProgress.findUnique({ where: { userId_date: { userId, date: today } } });
    const dailyCount = daily?.count ?? (user.plan === 'FREE' ? 1 : null);

    return NextResponse.json({
      progress,
      isCorrect,
      xpGain,
      dailyCount: user.plan === 'FREE' ? dailyCount : null,
      dailyLimit: user.plan === 'FREE' ? FREE_DAILY_LIMIT : null,
    }, { status: 201 });
  } catch (error) {
    console.error('Create progress error:', error);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}
