import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logAudit } from '@/lib/audit';

export const dynamic = 'force-dynamic';

// POST /api/admin/subjects — create a subject
export async function POST(req: NextRequest) {
  try {
    const b = await req.json();
    if (!b.slug || !b.name) return NextResponse.json({ error: 'slug и name обязательны' }, { status: 400 });
    const subject = await prisma.subject.create({
      data: {
        slug: String(b.slug).trim(),
        name: b.name,
        nameShort: b.nameShort ?? b.name,
        description: b.description ?? null,
        icon: b.icon ?? 'BookOpen',
        color: b.color ?? 'hsl(217 91% 55%)',
        gradient: b.gradient ?? null,
        order: Number(b.order) || 0,
        isActive: b.isActive ?? true,
      },
    });
    await logAudit(req, { action: 'CREATE', entity: 'subject', entityId: subject.id, summary: `Создан предмет «${subject.name}»`, newValue: subject });
    return NextResponse.json(subject, { status: 201 });
  } catch (error: unknown) {
    if ((error as { code?: string }).code === 'P2002') {
      return NextResponse.json({ error: 'Предмет с таким slug уже существует' }, { status: 409 });
    }
    console.error('Create subject error:', error);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}
