import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { logAudit } from '@/lib/audit';

export const dynamic = 'force-dynamic';

const schema = z.object({
  title: z.string().trim().min(1).max(200),
  content: z.string().trim().min(1).max(5000),
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

// GET /api/admin/banners — все баннеры (только ADMIN).
export async function GET(req: NextRequest) {
  if (req.headers.get('x-user-role') !== 'ADMIN') return NextResponse.json({ error: 'Доступ запрещён' }, { status: 403 });
  try {
    const items = await prisma.banner.findMany({ orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }] });
    return NextResponse.json({ items });
  } catch (e) {
    console.error('Admin banners list error:', e);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}

// POST /api/admin/banners — создать баннер.
export async function POST(req: NextRequest) {
  if (req.headers.get('x-user-role') !== 'ADMIN') return NextResponse.json({ error: 'Доступ запрещён' }, { status: 403 });
  try {
    const parsed = schema.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) return NextResponse.json({ error: 'Validation error', details: parsed.error.flatten() }, { status: 400 });
    const d = parsed.data;
    const created = await prisma.banner.create({
      data: {
        title: d.title, content: d.content, imageUrl: d.imageUrl ?? null,
        type: d.type ?? 'info', location: d.location ?? 'top', size: d.size ?? 'medium',
        active: d.active ?? true, dismissible: d.dismissible ?? true,
        startsAt: d.startsAt ? new Date(d.startsAt) : null,
        endsAt: d.endsAt ? new Date(d.endsAt) : null,
        linkUrl: d.linkUrl ?? null, linkLabel: d.linkLabel ?? null, priority: d.priority ?? 0,
      },
    });
    await logAudit(req, { action: 'CREATE', entity: 'banner', entityId: created.id, summary: `Создан баннер «${created.title}»`, newValue: created });
    return NextResponse.json(created, { status: 201 });
  } catch (e) {
    console.error('Admin banner create error:', e);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}
