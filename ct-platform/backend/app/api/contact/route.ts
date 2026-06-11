import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { contactLimiter, checkRateLimit } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

const ALLOWED_SUBJECTS = new Set(['bug', 'technical', 'suggestion', 'premium', 'data-request', 'other']);

// POST /api/contact — store a message from the public contact form.
export async function POST(req: NextRequest) {
  try {
    // Антиспам: форма публичная и пишет в БД — ограничиваем 5 сообщений/час с IP.
    const ip = (req.headers.get('x-forwarded-for') || 'unknown').split(',')[0].trim();
    const rl = await checkRateLimit(contactLimiter, `contact:${ip}`);
    if (!rl.allowed) {
      return NextResponse.json(
        { error: 'Слишком много сообщений. Попробуйте позже.' },
        { status: 429 }
      );
    }

    const b = await req.json();
    const name = String(b.name ?? '').trim();
    const email = String(b.email ?? '').trim();
    const subject = String(b.subject ?? '').trim();
    const message = String(b.message ?? '').trim();

    if (!name || !email || !subject || !message) {
      return NextResponse.json({ error: 'Заполните все обязательные поля' }, { status: 400 });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'Некорректный email' }, { status: 400 });
    }
    if (name.length > 200 || email.length > 200 || message.length > 5000) {
      return NextResponse.json({ error: 'Превышена допустимая длина' }, { status: 400 });
    }

    const created = await prisma.contactMessage.create({
      data: {
        name,
        email,
        subject: ALLOWED_SUBJECTS.has(subject) ? subject : 'other',
        message,
        userId: req.headers.get('x-user-id') || null,
      },
    });
    return NextResponse.json({ success: true, id: created.id }, { status: 201 });
  } catch (error) {
    console.error('Contact submit error:', error);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}
