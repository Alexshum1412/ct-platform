import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { logAudit } from '@/lib/audit';
import { generateUniqueCode, normalizeCode } from '@/lib/referral';
import type { Prisma } from '@prisma/client';

export const dynamic = 'force-dynamic';

const createSchema = z.object({
  code: z.string().trim().max(40).optional(),
  label: z.string().trim().max(120).optional(),
  type: z.enum(['USER', 'BLOGGER']).optional(),
  discountPct: z.number().int().min(0).max(100).optional(),
  active: z.boolean().optional(),
});

function clampInt(v: string | null, def: number, min: number, max: number): number {
  const n = parseInt(v ?? '', 10);
  if (Number.isNaN(n)) return def;
  return Math.max(min, Math.min(max, n));
}

// GET /api/admin/referrals — список кодов с фильтрами, сортировкой, пагинацией, фасетами.
export async function GET(req: NextRequest) {
  try {
    if (req.headers.get('x-user-role') !== 'ADMIN') {
      return NextResponse.json({ error: 'Доступ запрещён' }, { status: 403 });
    }
    const { searchParams } = new URL(req.url);
    const q = (searchParams.get('q') || '').trim();
    const type = searchParams.get('type'); // USER | BLOGGER | null
    const active = searchParams.get('active'); // 'true' | 'false' | null
    const sort = searchParams.get('sort') || 'new';
    const limit = clampInt(searchParams.get('limit'), 50, 1, 200);
    const offset = clampInt(searchParams.get('offset'), 0, 0, 100000);

    const where: Prisma.ReferralCodeWhereInput = {};
    if (type === 'USER' || type === 'BLOGGER') where.type = type;
    if (active === 'true') where.active = true;
    if (active === 'false') where.active = false;
    if (q) {
      where.OR = [
        { code: { contains: q, mode: 'insensitive' } },
        { label: { contains: q, mode: 'insensitive' } },
        { owner: { is: { email: { contains: q, mode: 'insensitive' } } } },
        { owner: { is: { name: { contains: q, mode: 'insensitive' } } } },
      ];
    }

    const orderBy: Prisma.ReferralCodeOrderByWithRelationInput =
      sort === 'signups' ? { signups: 'desc' }
      : sort === 'conversions' ? { conversions: 'desc' }
      : sort === 'revenue' ? { revenue: 'desc' }
      : sort === 'clicks' ? { clicks: 'desc' }
      : { createdAt: 'desc' };

    const [total, items, byType, totals] = await Promise.all([
      prisma.referralCode.count({ where }),
      prisma.referralCode.findMany({
        where, orderBy, take: limit, skip: offset,
        include: { owner: { select: { id: true, name: true, email: true } } },
      }),
      prisma.referralCode.groupBy({ by: ['type'], _count: { id: true } }),
      prisma.referralCode.aggregate({
        _sum: { clicks: true, signups: true, conversions: true, revenue: true },
      }),
    ]);

    return NextResponse.json({
      total,
      items: items.map((c) => ({
        id: c.id,
        code: c.code,
        type: c.type,
        label: c.label,
        discountPct: c.discountPct,
        active: c.active,
        clicks: c.clicks,
        signups: c.signups,
        conversions: c.conversions,
        revenue: c.revenue,
        owner: c.owner,
        createdAt: c.createdAt,
      })),
      facets: {
        type: Object.fromEntries(byType.map((t) => [t.type, t._count.id])),
      },
      totals: {
        clicks: totals._sum.clicks ?? 0,
        signups: totals._sum.signups ?? 0,
        conversions: totals._sum.conversions ?? 0,
        revenue: totals._sum.revenue ?? 0,
      },
    });
  } catch (e) {
    console.error('Admin referrals list error:', e);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}

// POST /api/admin/referrals — создать код (обычно партнёрский для блогера).
export async function POST(req: NextRequest) {
  try {
    if (req.headers.get('x-user-role') !== 'ADMIN') {
      return NextResponse.json({ error: 'Доступ запрещён' }, { status: 403 });
    }
    const body = await req.json().catch(() => ({}));
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation error', details: parsed.error.flatten() }, { status: 400 });
    }

    let code = normalizeCode(parsed.data.code || '');
    if (code) {
      if (!/^[A-Z0-9_-]{3,40}$/.test(code)) {
        return NextResponse.json({ error: 'Код: 3–40 символов A–Z, 0–9, дефис/подчёркивание' }, { status: 400 });
      }
      const exists = await prisma.referralCode.findUnique({ where: { code } });
      if (exists) return NextResponse.json({ error: 'Такой код уже существует' }, { status: 409 });
    } else {
      code = await generateUniqueCode();
    }

    const created = await prisma.referralCode.create({
      data: {
        code,
        type: parsed.data.type || 'BLOGGER',
        label: parsed.data.label || null,
        discountPct: parsed.data.discountPct ?? 15,
        active: parsed.data.active ?? true,
      },
    });

    await logAudit(req, {
      action: 'CREATE', entity: 'referralCode', entityId: created.id,
      summary: `Создан реферальный код «${created.code}»`, newValue: created,
    });

    return NextResponse.json(created, { status: 201 });
  } catch (e) {
    console.error('Admin referral create error:', e);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}
