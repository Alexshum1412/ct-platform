import crypto from 'crypto';
import { prisma } from '@/lib/prisma';
import { hashPassword } from '@/lib/auth';
import { sendEmail, getVerificationEmail, getPasswordResetEmail } from '@/lib/email';

// Параметры одноразовых кодов (подтверждение email / сброс пароля).
export const CODE_TTL_MIN = 15;        // срок жизни кода
export const MAX_ATTEMPTS = 5;         // попыток ввода до требования переотправки
export const RESEND_COOLDOWN_SEC = 60; // не чаще одного письма в минуту

export type CodePurpose = 'EMAIL_VERIFY' | 'PASSWORD_RESET';

/** 6-значный код (с ведущими нулями), на основе криптослучайности. */
export function generateCode(): string {
  return String(crypto.randomInt(0, 1_000_000)).padStart(6, '0');
}

/**
 * Создаёт новый одноразовый код (подтверждение email или сброс пароля):
 * инвалидирует прежние активные коды этого назначения, сохраняет ТОЛЬКО bcrypt-хэш
 * нового кода с TTL и отправляет письмо соответствующего типа.
 *
 * Возвращает devCode ТОЛЬКО когда SMTP не настроен (process.env.SMTP_USER пуст) —
 * это нужно для локальной разработки/тестов, чтобы код можно было ввести без почты.
 * В продакшене (с настроенным SMTP) devCode всегда undefined.
 */
export async function issueVerificationCode(
  userId: string,
  email: string,
  name: string | null,
  purpose: CodePurpose = 'EMAIL_VERIFY',
): Promise<{ devCode?: string; expiresAt: Date }> {
  const code = generateCode();
  const codeHash = await hashPassword(code);
  const expiresAt = new Date(Date.now() + CODE_TTL_MIN * 60 * 1000);

  // Одноразовость/чистота: убираем прежние неиспользованные коды того же назначения.
  await prisma.verificationCode.deleteMany({
    where: { userId, purpose, consumedAt: null },
  });
  await prisma.verificationCode.create({
    data: { userId, codeHash, purpose, expiresAt },
  });

  const { subject, html } = purpose === 'PASSWORD_RESET'
    ? getPasswordResetEmail(name || 'Ученик', code)
    : getVerificationEmail(name || 'Ученик', code);
  // Сбой SMTP не должен ронять регистрацию/сброс пароля 500-кой: код уже сохранён,
  // пользователь сможет нажать «Отправить повторно» (или попросить новый код).
  try {
    await sendEmail({ to: email, subject, html });
  } catch (e) {
    console.error(`[verify] email send failed (${purpose}) for ${email}:`, e);
  }

  const devMode = !process.env.SMTP_USER;
  if (devMode) {
    // Видно в логах backend — удобно при отсутствии реальной почты.
    console.log(`[verify] DEV ${purpose} code for ${email}: ${code}`);
  }
  return { devCode: devMode ? code : undefined, expiresAt };
}
