import { NextRequest, NextResponse } from 'next/server';
import { trackClick } from '@/lib/referral';

export const dynamic = 'force-dynamic';

// POST /api/referrals/track — регистрирует переход по реферальной ссылке (для статистики).
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const ok = await trackClick(body?.code || '');
    return NextResponse.json({ ok });
  } catch {
    return NextResponse.json({ ok: false });
  }
}
