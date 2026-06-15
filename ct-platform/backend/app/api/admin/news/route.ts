import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { logAudit } from '@/lib/audit';

export const dynamic = 'force-dynamic';

const schema = z.object({
  title: z.string().trim().min(1).max(250),
  excerpt: z.string().trim().max(500).optional().nullable(),
  content: z.string().trim().min(1).max(50000),
  imageUrl: z.string().max(2_000_000).optional().nullable(),
  category: z.enum(['PERMANENT', 'NEWS', 'UPDATE']).optional(),
  published: z.boolean().optional(),
  pinned: z.boolean().optional(),
});

// GET /api/admin/news — все статьи (только ADMIN).
export async function GET(req: NextRequest) {
  if (req.headers.get('x-user-role') !== 'ADMIN') return NextResponse.json({ error: 'Доступ запрещён' }, { status: 403 });
  try {
    const items = await prisma.newsArticle.findMany({ orderBy: [{ pinned: 'desc' }, { createdAt: 'desc' }] });
    return NextResponse.json({ items });
  } catch (e) {
    console.error('Admin news list error:', e);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}

// POST /api/admin/news — создать статью.
export async function POST(req: NextRequest) {
  if (req.headers.get('x-user-role') !== 'ADMIN') return NextResponse.json({ error: 'Доступ запрещён' }, { status: 403 });
  try {
    const parsed = schema.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) return NextResponse.json({ error: 'Validation error', details: parsed.error.flatten() }, { status: 400 });
    const d = parsed.data;
    const created = await prisma.newsArticle.create({
      data: {
        title: d.title, excerpt: d.excerpt ?? null, content: d.content, imageUrl: d.imageUrl ?? null,
        category: d.category ?? 'NEWS', published: d.published ?? true, pinned: d.pinned ?? false,
      },
    });
    await logAudit(req, { action: 'CREATE', entity: 'news', entityId: created.id, summary: `Создана новость «${created.title}»`, newValue: created });
    return NextResponse.json(created, { status: 201 });
  } catch (e) {
    console.error('Admin news create error:', e);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}
