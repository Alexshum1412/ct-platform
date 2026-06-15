import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { logAudit } from '@/lib/audit';

export const dynamic = 'force-dynamic';

const schema = z.object({
  title: z.string().trim().min(1).max(250).optional(),
  excerpt: z.string().trim().max(500).optional().nullable(),
  content: z.string().trim().min(1).max(50000).optional(),
  imageUrl: z.string().max(2_000_000).optional().nullable(),
  category: z.enum(['PERMANENT', 'NEWS', 'UPDATE']).optional(),
  published: z.boolean().optional(),
  pinned: z.boolean().optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  if (req.headers.get('x-user-role') !== 'ADMIN') return NextResponse.json({ error: 'Доступ запрещён' }, { status: 403 });
  try {
    const parsed = schema.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) return NextResponse.json({ error: 'Validation error', details: parsed.error.flatten() }, { status: 400 });
    const before = await prisma.newsArticle.findUnique({ where: { id: params.id } });
    if (!before) return NextResponse.json({ error: 'Статья не найдена' }, { status: 404 });
    const d = parsed.data;
    const data: Record<string, unknown> = {};
    for (const k of ['title', 'excerpt', 'content', 'imageUrl', 'category', 'published', 'pinned'] as const) {
      if (d[k] !== undefined) data[k] = d[k];
    }
    const updated = await prisma.newsArticle.update({ where: { id: params.id }, data });
    await logAudit(req, { action: 'UPDATE', entity: 'news', entityId: updated.id, summary: `Изменена новость «${updated.title}»`, oldValue: before, newValue: updated });
    return NextResponse.json(updated);
  } catch (e) {
    console.error('Admin news update error:', e);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  if (req.headers.get('x-user-role') !== 'ADMIN') return NextResponse.json({ error: 'Доступ запрещён' }, { status: 403 });
  try {
    const before = await prisma.newsArticle.findUnique({ where: { id: params.id } });
    if (!before) return NextResponse.json({ error: 'Статья не найдена' }, { status: 404 });
    await prisma.newsArticle.delete({ where: { id: params.id } });
    await logAudit(req, { action: 'DELETE', entity: 'news', entityId: params.id, summary: `Удалена новость «${before.title}»`, oldValue: before });
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error('Admin news delete error:', e);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}
