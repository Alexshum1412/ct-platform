import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logAudit } from '@/lib/audit';

export const dynamic = 'force-dynamic';

const ROLES = ['USER', 'MODERATOR', 'ADMIN'] as const;
const PLANS = ['FREE', 'PREMIUM_MONTHLY', 'PREMIUM_YEARLY'] as const;

// PATCH /api/admin/users/:id — смена роли ИЛИ плана (Premium) пользователя (только ADMIN).
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const actorRole = req.headers.get('x-user-role');
    if (actorRole !== 'ADMIN') return NextResponse.json({ error: 'Доступ запрещён' }, { status: 403 });

    const actorId = req.headers.get('x-user-id');
    const b = await req.json();
    const hasRole = b.role !== undefined;
    const hasPlan = b.plan !== undefined;
    if (!hasRole && !hasPlan) return NextResponse.json({ error: 'Укажите role или plan' }, { status: 400 });

    const before = await prisma.user.findUnique({ where: { id: params.id }, select: { id: true, email: true, role: true, plan: true } });
    if (!before) return NextResponse.json({ error: 'Пользователь не найден' }, { status: 404 });

    // --- Смена роли (свою роль менять нельзя) ---
    if (hasRole) {
      if (actorId === params.id) return NextResponse.json({ error: 'Нельзя менять собственную роль' }, { status: 400 });
      const role = String(b.role);
      if (!ROLES.includes(role as typeof ROLES[number])) return NextResponse.json({ error: 'Недопустимая роль' }, { status: 400 });
      const user = await prisma.user.update({ where: { id: params.id }, data: { role }, select: { id: true, email: true, role: true, plan: true } });
      await logAudit(req, {
        action: 'UPDATE', entity: 'user', entityId: user.id,
        summary: `Роль ${user.email}: ${before.role} → ${user.role}`,
        oldValue: { role: before.role }, newValue: { role: user.role },
      });
      return NextResponse.json(user);
    }

    // --- Выдача / снятие Premium ---
    const plan = String(b.plan);
    if (!PLANS.includes(plan as typeof PLANS[number])) return NextResponse.json({ error: 'Недопустимый план' }, { status: 400 });
    // Ручная выдача (plan≠FREE без подписок) сохраняется getEffectivePlan'ом.
    // При снятии деактивируем активные подписки, чтобы Premium не вернулся.
    if (plan === 'FREE') {
      await prisma.subscription.updateMany({ where: { userId: params.id, isActive: true }, data: { isActive: false } });
    }
    const user = await prisma.user.update({ where: { id: params.id }, data: { plan }, select: { id: true, email: true, role: true, plan: true } });
    await logAudit(req, {
      action: 'UPDATE', entity: 'user', entityId: user.id,
      summary: `План ${user.email}: ${before.plan} → ${user.plan} (админ)`,
      oldValue: { plan: before.plan }, newValue: { plan: user.plan },
    });
    return NextResponse.json(user);
  } catch (error) {
    console.error('Admin update user error:', error);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}
