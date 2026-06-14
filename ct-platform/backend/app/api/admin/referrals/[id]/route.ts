import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { logAudit } from '@/lib/audit';

export const dynamic = 'force-dynamic';

const patchSchema = z.object({
  label: z.string().trim().max(120).nullable().optional(),
  discountPct: z.number().int().min(0).max(100).optional(),
  active: z.boolean().optional(),
});

// GET /api/admin/referrals/:id — карточка кода со списком приглашённых.
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    if (req.headers.get('x-user-role') !== 'ADMIN') {
      return NextResponse.json({ error: 'Доступ запрещён' }, { status: 403 });
    }
    const code = await prisma.referralCode.findUnique({
      where: { id: params.id },
      include: { owner: { select: { id: true, name: true, email: true } } },
    });
    if (!code) return NextResponse.json({ error: 'Код не найден' }, { status: 404 });

    const referrals = await prisma.referral.findMany({
      where: { codeId: code.id },
      orderBy: { createdAt: 'desc' },
      take: 200,
      include: { user: { select: { id: true, name: true, email: true, plan: true } } },
    });

    return NextResponse.json({ code, referrals });
  } catch (e) {
    console.error('Admin referral detail error:', e);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}

// PATCH /api/admin/referrals/:id — изменить скидку/метку/активность.
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    if (req.headers.get('x-user-role') !== 'ADMIN') {
      return NextResponse.json({ error: 'Доступ запрещён' }, { status: 403 });
    }
    const body = await req.json().catch(() => ({}));
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation error', details: parsed.error.flatten() }, { status: 400 });
    }
    const before = await prisma.referralCode.findUnique({ where: { id: params.id } });
    if (!before) return NextResponse.json({ error: 'Код не найден' }, { status: 404 });

    const updated = await prisma.referralCode.update({
      where: { id: params.id },
      data: {
        ...(parsed.data.label !== undefined ? { label: parsed.data.label } : {}),
        ...(parsed.data.discountPct !== undefined ? { discountPct: parsed.data.discountPct } : {}),
        ...(parsed.data.active !== undefined ? { active: parsed.data.active } : {}),
      },
    });

    await logAudit(req, {
      action: 'UPDATE', entity: 'referralCode', entityId: updated.id,
      summary: `Изменён реферальный код «${updated.code}»`, oldValue: before, newValue: updated,
    });

    return NextResponse.json(updated);
  } catch (e) {
    console.error('Admin referral update error:', e);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}

// DELETE /api/admin/referrals/:id — удалить код (рефералы каскадно удаляются).
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    if (req.headers.get('x-user-role') !== 'ADMIN') {
      return NextResponse.json({ error: 'Доступ запрещён' }, { status: 403 });
    }
    const before = await prisma.referralCode.findUnique({ where: { id: params.id } });
    if (!before) return NextResponse.json({ error: 'Код не найден' }, { status: 404 });

    await prisma.referralCode.delete({ where: { id: params.id } });

    await logAudit(req, {
      action: 'DELETE', entity: 'referralCode', entityId: params.id,
      summary: `Удалён реферальный код «${before.code}»`, oldValue: before,
    });

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error('Admin referral delete error:', e);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}
