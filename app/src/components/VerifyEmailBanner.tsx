/**
 * VerifyEmailBanner — постоянная полоска вверху для вошедших, но НЕ подтвердивших
 * email пользователей. Напоминает подтвердить почту и ведёт на /verify-email.
 * Скрыта на самой странице подтверждения и в фокус-режиме.
 */
import { Link, useLocation } from 'react-router-dom';
import { MailWarning, ChevronRight } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';

export function VerifyEmailBanner() {
  const { pathname } = useLocation();
  const user = useAppStore((s) => s.user);
  const focusMode = useAppStore((s) => s.focusMode);

  const show = !!user && !user.emailVerified && !focusMode && pathname !== '/verify-email';
  if (!show) return null;

  return (
    <Link
      to="/verify-email"
      className="block bg-amber-500/95 text-amber-950 hover:bg-amber-500 transition-colors"
    >
      <div className="container py-2 flex items-center justify-center gap-2 text-sm font-medium text-center">
        <MailWarning className="w-4 h-4 shrink-0" />
        <span>Подтвердите email, чтобы открыть практику, экзамены и игры.</span>
        <span className="inline-flex items-center gap-0.5 underline underline-offset-2 shrink-0">
          Ввести код<ChevronRight className="w-3.5 h-3.5" />
        </span>
      </div>
    </Link>
  );
}

export default VerifyEmailBanner;
