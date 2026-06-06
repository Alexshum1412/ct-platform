import crypto from 'crypto';
import { prisma } from '@/lib/prisma';
import { hashPassword } from '@/lib/auth';
import { sendEmail, getVerificationEmail } from '@/lib/email';

// Параметры кода подтверждения email.
export const CODE_TTL_MIN = 15;        // срок жизни кода
export const MAX_ATTEMPTS = 5;         // попыток ввода до требования переотправки
export const RESEND_COOLDOWN_SEC = 60; // не чаще одного письма в минуту

/** 6-значный код (с ведущими нулями), на основе криптослучайности. */
export function generateCode(): string {
  return String(crypto.randomInt(0, 1_000_000)).padStart(6, '0');
}

/**
 * Создаёт новый код подтверждения: инвалидирует прежние активные коды
 * пользователя, сохраняет ТОЛЬКО bcrypt-хэш нового кода с TTL и отправляет письмо.
 *
 * Возвращает devCode ТОЛЬКО когда SMTP не настроен (process.env.SMTP_USER пуст) —
 * это нужно для локальной разработки/тестов, чтобы код можно было ввести без почты.
 * В продакшене (с настроенным SMTP) devCode всегда undefined.
 */
export async function issueVerificationCode(
  userId: string,
  email: string,
  name: string | null,
): Promise<{ devCode?: string; expiresAt: Date }> {
  const code = generateCode();
  const codeHash = await hashPassword(code);
  const expiresAt = new Date(Date.now() + CODE_TTL_MIN * 60 * 1000);

  // Одноразовость/чистота: убираем прежние неиспользованные коды этого пользователя.
  await prisma.verificationCode.deleteMany({
    where: { userId, purpose: 'EMAIL_VERIFY', consumedAt: null },
  });
  await prisma.verificationCode.create({
    data: { userId, codeHash, purpose: 'EMAIL_VERIFY', expiresAt },
  });

  const { subject, html } = getVerificationEmail(name || 'Ученик', code);
  await sendEmail({ to: email, subject, html });

  const devMode = !process.env.SMTP_USER;
  if (devMode) {
    // Видно в логах backend — удобно при отсутствии реальной почты.
    console.log(`[verify] DEV verification code for ${email}: ${code}`);
  }
  return { devCode: devMode ? code : undefined, expiresAt };
}
