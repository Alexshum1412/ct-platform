import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logAudit } from '@/lib/audit';

export const dynamic = 'force-dynamic';

const ROLES = ['USER', 'MODERATOR', 'ADMIN'] as const;

// PATCH /api/admin/users/:id — смена роли пользователя (только ADMIN).
// Менять собственную роль нельзя — защита от случайного самозапирания.
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const actorRole = req.headers.get('x-user-role');
    if (actorRole !== 'ADMIN') return NextResponse.json({ error: 'Доступ запрещён' }, { status: 403 });

    const actorId = req.headers.get('x-user-id');
    if (actorId === params.id) {
      return NextResponse.json({ error: 'Нельзя менять собственную роль' }, { status: 400 });
    }

    const b = await req.json();
    const role = String(b.role ?? '');
    if (!ROLES.includes(role as typeof ROLES[number])) {
      return NextResponse.json({ error: 'Недопустимая роль' }, { status: 400 });
    }

    const before = await prisma.user.findUnique({ where: { id: params.id }, select: { id: true, email: true, role: true } });
    if (!before) return NextResponse.json({ error: 'Пользователь не найден' }, { status: 404 });

    const user = await prisma.user.update({
      where: { id: params.id },
      data: { role },
      select: { id: true, email: true, role: true },
    });

    await logAudit(req, {
      action: 'UPDATE', entity: 'user', entityId: user.id,
      summary: `Роль ${user.email}: ${before.role} → ${user.role}`,
      oldValue: { role: before.role }, newValue: { role: user.role },
    });
    return NextResponse.json(user);
  } catch (error) {
    console.error('Admin update user error:', error);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}
