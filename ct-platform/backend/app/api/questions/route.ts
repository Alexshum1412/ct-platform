import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createQuestionSchema } from '@/lib/validation';
import { questionLimiter, checkRateLimit } from '@/lib/rate-limit';
import { formatQuestion, stringifyTags } from '@/lib/utils';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);

    const subjectId = searchParams.get('subjectId');
    const topicId = searchParams.get('topicId');
    const difficulty = searchParams.get('difficulty');
    const type = searchParams.get('type');
    const part = searchParams.get('part');
    const section = searchParams.get('section');
    const search = searchParams.get('search');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');

    const where: Record<string, unknown> = { status: 'ACTIVE' };

    if (subjectId) where.subjectId = subjectId;
    if (topicId) where.topicId = topicId;
    if (difficulty) where.difficulty = parseInt(difficulty);
    if (type) where.type = type;
    if (part) where.part = part;
    if (section) where.section = section;
    if (search) where.content = { contains: search };

    const [questions, total] = await Promise.all([
      prisma.question.findMany({
        where,
        take: limit,
        skip: offset,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.question.count({ where }),
    ]);

    return NextResponse.json({
      questions: questions.map(formatQuestion),
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
      },
    });
  } catch (error) {
    console.error('Get questions error:', error);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const userRole = req.headers.get('x-user-role');
    if (userRole !== 'ADMIN') {
      return NextResponse.json({ error: 'Доступ запрещён' }, { status: 403 });
    }

    const clientIp = req.headers.get('x-forwarded-for') || 'unknown';
    const rateLimit = await checkRateLimit(questionLimiter, `question:${clientIp}`);

    if (!rateLimit.allowed) {
      return NextResponse.json({ error: 'Слишком много запросов. Попробуйте позже.' }, { status: 429 });
    }

    const body = await req.json();

    const result = createQuestionSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json({ error: 'Validation error', details: result.error.flatten() }, { status: 400 });
    }

    const { tags, options, hints, images, ...rest } = result.data;

    const question = await prisma.question.create({
      data: {
        ...rest,
        tags: stringifyTags(tags),
        options: options ? JSON.stringify(options) : null,
        hints: hints ? JSON.stringify(hints) : null,
        images: images && images.length > 0 ? JSON.stringify(images) : null,
        status: 'ACTIVE',
      },
    });

    await prisma.subject.update({
      where: { id: result.data.subjectId },
      data: { questionsCount: { increment: 1 } },
    });

    return NextResponse.json({ message: 'Задание создано', question: formatQuestion(question) }, { status: 201 });
  } catch (error) {
    console.error('Create question error:', error);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}
