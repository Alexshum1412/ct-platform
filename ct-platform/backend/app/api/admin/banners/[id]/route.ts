import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { logAudit } from '@/lib/audit';

export const dynamic = 'force-dynamic';

const schema = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  content: z.string().trim().min(1).max(5000).optional(),
  imageUrl: z.string().max(2_000_000).optional().nullable(),
  type: z.enum(['info', 'warning', 'maintenance', 'promo', 'success']).optional(),
  location: z.enum(['top', 'bottom', 'modal']).optional(),
  size: z.enum(['small', 'medium', 'large']).optional(),
  active: z.boolean().optional(),
  dismissible: z.boolean().optional(),
  startsAt: z.string().datetime().optional().nullable(),
  endsAt: z.string().datetime().optional().nullable(),
  linkUrl: z.string().trim().max(500).optional().nullable(),
  linkLabel: z.string().trim().max(80).optional().nullable(),
  priority: z.number().int().min(0).max(1000).optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  if (req.headers.get('x-user-role') !== 'ADMIN') return NextResponse.json({ error: 'Доступ запрещён' }, { status: 403 });
  try {
    const parsed = schema.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) return NextResponse.json({ error: 'Validation error', details: parsed.error.flatten() }, { status: 400 });
    const before = await prisma.banner.findUnique({ where: { id: params.id } });
    if (!before) return NextResponse.json({ error: 'Баннер не найден' }, { status: 404 });
    const d = parsed.data;
    const data: Record<string, unknown> = {};
    for (const k of ['title', 'content', 'imageUrl', 'type', 'location', 'size', 'active', 'dismissible', 'linkUrl', 'linkLabel', 'priority'] as const) {
      if (d[k] !== undefined) data[k] = d[k];
    }
    if (d.startsAt !== undefined) data.startsAt = d.startsAt ? new Date(d.startsAt) : null;
    if (d.endsAt !== undefined) data.endsAt = d.endsAt ? new Date(d.endsAt) : null;
    const updated = await prisma.banner.update({ where: { id: params.id }, data });
    await logAudit(req, { action: 'UPDATE', entity: 'banner', entityId: updated.id, summary: `Изменён баннер «${updated.title}»`, oldValue: before, newValue: updated });
    return NextResponse.json(updated);
  } catch (e) {
    console.error('Admin banner update error:', e);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  if (req.headers.get('x-user-role') !== 'ADMIN') return NextResponse.json({ error: 'Доступ запрещён' }, { status: 403 });
  try {
    const before = await prisma.banner.findUnique({ where: { id: params.id } });
    if (!before) return NextResponse.json({ error: 'Баннер не найден' }, { status: 404 });
    await prisma.banner.delete({ where: { id: params.id } });
    await logAudit(req, { action: 'DELETE', entity: 'banner', entityId: params.id, summary: `Удалён баннер «${before.title}»`, oldValue: before });
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error('Admin banner delete error:', e);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}
