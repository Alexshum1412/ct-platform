/**
 * VerifyEmailPage (/verify-email) — ввод 6-значного кода подтверждения email.
 *
 * Доступна только авторизованному (но ещё не подтверждённому) пользователю.
 * При успехе получает новый JWT с verified:true и открывает доступ к функциям.
 * В dev-режиме (SMTP не настроен) код показывается в жёлтой плашке.
 */
import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { MailCheck, ShieldCheck, RefreshCw, ArrowLeft, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useAppStore } from '@/store/useAppStore';
import { authApi } from '@/lib/api/client';
import type { User } from '@/types';

const RESEND_COOLDOWN = 60;

export function VerifyEmailPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, token, setUser, setToken, addNotification } = useAppStore();

  const [code, setCode] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [devCode, setDevCode] = useState<string | undefined>((location.state as { devCode?: string } | null)?.devCode);
  const [cooldown, setCooldown] = useState(0);
  const tickRef = useRef<number | null>(null);

  // Гард: гость → на регистрацию; уже подтверждён → на главную.
  useEffect(() => {
    if (!token || !user) { navigate('/register', { replace: true }); return; }
    if (user.emailVerified) { navigate('/', { replace: true }); }
  }, [token, user, navigate]);

  // Таймер кулдауна повторной отправки.
  useEffect(() => {
    if (cooldown <= 0) return;
    tickRef.current = window.setInterval(() => setCooldown((c) => Math.max(0, c - 1)), 1000);
    return () => { if (tickRef.current) window.clearInterval(tickRef.current); };
  }, [cooldown]);

  // Стартовый кулдаун, если на страницу пришли сразу после регистрации с devCode.
  useEffect(() => { if (devCode) setCooldown(RESEND_COOLDOWN); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (!token || !user || user.emailVerified) return null;

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (code.length !== 6 || submitting) return;
    setSubmitting(true);
    setError(null);
    const res = await authApi.verifyEmail(code, token);
    setSubmitting(false);
    if (res.data?.success && res.data.token) {
      setToken(res.data.token);
      authApi.setToken(res.data.token);
      setUser(res.data.user as User);
      addNotification({ type: 'success', title: 'Email подтверждён!', message: 'Доступ открыт. Удачной подготовки!' });
      navigate('/', { replace: true });
    } else {
      setError(res.error || 'Не удалось подтвердить код');
      setCode('');
    }
  };

  const handleResend = async () => {
    if (cooldown > 0) return;
    setError(null);
    const res = await authApi.resendCode(token);
    if (res.data?.success) {
      setDevCode(res.data.devCode);
      setCooldown(RESEND_COOLDOWN);
      addNotification({ type: 'success', title: 'Код отправлен', message: 'Проверьте почту (и папку «Спам»).' });
    } else {
      setError(res.error || 'Не удалось отправить код');
    }
  };

  const handleLogout = () => {
    useAppStore.getState().logout();
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-muted/30 flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
        <Card>
          <CardContent className="p-8">
            <div className="text-center mb-6">
              <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <MailCheck className="w-7 h-7 text-primary" />
              </div>
              <h1 className="text-2xl font-bold mb-1">Подтвердите email</h1>
              <p className="text-sm text-muted-foreground">
                Мы отправили 6-значный код на<br />
                <span className="font-medium text-foreground">{user.email}</span>
              </p>
            </div>

            {devCode && (
              <div className="mb-4 rounded-xl border border-amber-300/60 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-950/20 p-3 text-center text-sm text-amber-800 dark:text-amber-200">
                Демо-режим (почта не настроена). Ваш код: <span className="font-mono font-bold tracking-widest text-base">{devCode}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <input
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                inputMode="numeric"
                autoComplete="one-time-code"
                autoFocus
                placeholder="______"
                className="w-full text-center text-2xl sm:text-3xl font-mono tracking-[0.4em] sm:tracking-[0.5em] py-3 rounded-xl border-2 border-border bg-background focus:border-primary focus:outline-none"
              />
              {error && <p className="text-sm text-red-500 text-center">{error}</p>}
              <Button type="submit" size="lg" className="w-full gap-2" disabled={code.length !== 6 || submitting}>
                <ShieldCheck className="w-4 h-4" />
                {submitting ? 'Проверяем…' : 'Подтвердить'}
              </Button>
            </form>

            <div className="mt-5 text-center text-sm">
              <button
                onClick={handleResend}
                disabled={cooldown > 0}
                className="inline-flex items-center gap-1.5 text-primary hover:underline disabled:text-muted-foreground disabled:no-underline"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                {cooldown > 0 ? `Отправить код снова через ${cooldown} с` : 'Отправить код снова'}
              </button>
            </div>

            <div className="mt-6 pt-5 border-t border-border flex items-center justify-between text-sm">
              <Link to="/" className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-foreground">
                <ArrowLeft className="w-4 h-4" />На главную
              </Link>
              <button onClick={handleLogout} className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-destructive">
                <LogOut className="w-4 h-4" />Выйти
              </button>
            </div>
          </CardContent>
        </Card>
        <p className="text-center text-xs text-muted-foreground mt-4">
          Код действует 15 минут. Не приходит письмо? Проверьте «Спам» или отправьте код снова.
        </p>
      </motion.div>
    </div>
  );
}

export default VerifyEmailPage;
