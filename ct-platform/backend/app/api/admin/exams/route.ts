import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// GET /api/admin/exams — all exams (admin). Optional ?subjectId=
export async function GET(req: NextRequest) {
  try {
    const subjectId = new URL(req.url).searchParams.get('subjectId') || undefined;
    const exams = await prisma.exam.findMany({
      where: subjectId ? { subjectId } : undefined,
      orderBy: [{ subjectId: 'asc' }, { order: 'asc' }],
    });
    return NextResponse.json(exams.map((e) => ({
      ...e,
      questionIds: (() => { try { return JSON.parse(e.questionIds); } catch { return []; } })(),
    })));
  } catch (error) {
    console.error('Admin list exams error:', error);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}

// POST /api/admin/exams — create an exam
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body.subjectId || !body.title) {
      return NextResponse.json({ error: 'subjectId и title обязательны' }, { status: 400 });
    }
    const exam = await prisma.exam.create({
      data: {
        subjectId: body.subjectId,
        title: body.title,
        description: body.description ?? null,
        durationMinutes: Number(body.durationMinutes) || 120,
        passingScore: Number(body.passingScore) || 0,
        questionIds: JSON.stringify(Array.isArray(body.questionIds) ? body.questionIds : []),
        isActive: body.isActive ?? true,
        order: Number(body.order) || 0,
        createdBy: req.headers.get('x-user-id'),
      },
    });
    return NextResponse.json(exam, { status: 201 });
  } catch (error) {
    console.error('Admin create exam error:', error);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}
