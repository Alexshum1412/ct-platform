import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { updateProfileSchema } from '@/lib/validation';
import { getEffectivePlan } from '@/lib/plan';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const userId = req.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json({ error: 'Требуется авторизация' }, { status: 401 });
    }

    // Лениво понижает план в БД, если подписка истекла, — профиль всегда
    // показывает актуальный план.
    await getEffectivePlan(userId);

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        image: true,
        plan: true,
        emailVerified: true,
        city: true,
        school: true,
        grade: true,
        birthDate: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'Пользователь не найден' }, { status: 404 });
    }

    return NextResponse.json(user);
  } catch (error) {
    console.error('Get profile error:', error);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const userId = req.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json({ error: 'Требуется авторизация' }, { status: 401 });
    }

    const body = await req.json();
    const parsed = updateProfileSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation error', details: parsed.error.flatten() }, { status: 400 });
    }

    // Имя уникально: если меняют — проверяем, что не занято другим пользователем.
    if (parsed.data.name) {
      const taken = await prisma.user.findFirst({
        where: { name: { equals: parsed.data.name, mode: 'insensitive' }, id: { not: userId } },
        select: { id: true },
      });
      if (taken) {
        return NextResponse.json({ error: 'Это имя уже занято — выберите другое', code: 'NAME_TAKEN' }, { status: 409 });
      }
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: parsed.data,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        image: true,
        plan: true,
        emailVerified: true,
        city: true,
        school: true,
        grade: true,
        birthDate: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json(user);
  } catch (error) {
    console.error('Update profile error:', error);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}
