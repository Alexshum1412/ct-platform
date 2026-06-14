import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { normalizeCode } from '@/lib/referral';

export const dynamic = 'force-dynamic';

// POST /api/referrals/validate — публичная проверка кода (для формы регистрации/оплаты).
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const code = normalizeCode(body?.code || '');
    if (!code) return NextResponse.json({ valid: false });

    const rc = await prisma.referralCode.findUnique({
      where: { code },
      select: { code: true, type: true, label: true, discountPct: true, active: true },
    });
    if (!rc || !rc.active) return NextResponse.json({ valid: false });

    return NextResponse.json({
      valid: true,
      code: rc.code,
      discountPct: rc.discountPct,
      type: rc.type,
      label: rc.label,
    });
  } catch (e) {
    console.error('Referral validate error:', e);
    return NextResponse.json({ valid: false });
  }
}
