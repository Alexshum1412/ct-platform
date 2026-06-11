import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { FREE_DAILY_EXAMS } from '@/lib/limits';
import { getEffectivePlan } from '@/lib/plan';

export const dynamic = 'force-dynamic';

const schema = z.object({
  subjectId: z.string().min(1), // принимаем cuid ИЛИ slug (фронт шлёт slug из статического каталога)
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

    // Резолвим предмет по id ИЛИ slug и храним КАНОНИЧЕСКИЙ cuid — раньше в
    // ExamAttempt.subjectId попадал slug ('math'), из-за чего история экзаменов
    // показывала «Неизвестный предмет», а конвертация балла теряла предмет.
    const subject = await prisma.subject.findFirst({
      where: { OR: [{ id: parsed.data.subjectId }, { slug: parsed.data.subjectId }] },
      select: { id: true },
    });
    if (!subject) {
      return NextResponse.json({ error: 'Предмет не найден' }, { status: 404 });
    }

    // Если указан конкретный экзамен — он должен существовать, быть активным
    // и принадлежать этому предмету.
    let examId: string | null = null;
    if (parsed.data.examId) {
      const exam = await prisma.exam.findUnique({
        where: { id: parsed.data.examId },
        select: { id: true, subjectId: true, isActive: true },
      });
      if (!exam || !exam.isActive || exam.subjectId !== subject.id) {
        return NextResponse.json({ error: 'Экзамен не найден' }, { status: 404 });
      }
      examId = exam.id;
    }

    // Daily exam limit for FREE users (по эффективному плану — с учётом
    // истечения подписки).
    const planInfo = await getEffectivePlan(userId);
    if (!planInfo) return NextResponse.json({ error: 'Не найдено' }, { status: 404 });

    if (!planInfo.isPremium) {
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
        subjectId: subject.id,
        examId,
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
