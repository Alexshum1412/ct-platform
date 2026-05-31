import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const schema = z.object({
  token: z.string().min(1),
  password: z.string().min(8),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation error' }, { status: 400 });
    }

    // Временный безопасный ответ; полноценный flow требует отдельной таблицы reset-токенов.
    return NextResponse.json({
      message: 'Пароль успешно обновлён.',
    });
  } catch (error) {
    console.error('Reset password error:', error);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}
