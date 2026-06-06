/**
 * Восстановление пароля — реальный двухшаговый флоу на одноразовом коде
 * (как подтверждение email): шаг 1 — ввод email и запрос кода; шаг 2 — ввод
 * кода + новый пароль. Работает и без SMTP (в dev-режиме код показывается).
 *
 * API: POST /api/auth/forgot-password, POST /api/auth/reset-password
 */
import { useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, ArrowLeft, CheckCircle, AlertCircle, Loader2, Lock, KeyRound } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { authApi } from '@/lib/api/client';

export function ForgotPasswordPage() {
  const [step, setStep] = useState<'email' | 'reset'>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [devCode, setDevCode] = useState<string | undefined>();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const passwordValid = password.length >= 8 && /[a-z]/.test(password) && /[A-Z]/.test(password) && /\d/.test(password);

  const requestCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setError('Введите корректный email'); return; }
    setIsLoading(true);
    const res = await authApi.forgotPassword(email);
    setIsLoading(false);
    if (res.error) { setError(res.error); return; }
    setDevCode(res.data?.devCode);
    setStep('reset');
  };

  const submitReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (code.length !== 6) { setError('Код состоит из 6 цифр'); return; }
    if (!passwordValid) { setError('Пароль: минимум 8 символов, заглавная и строчная буквы, цифра'); return; }
    if (password !== confirmPassword) { setError('Пароли не совпадают'); return; }
    setIsLoading(true);
    const res = await authApi.resetPassword(email, code, password);
    setIsLoading(false);
    if (res.data?.success) { setDone(true); return; }
    setError(res.error || 'Не удалось сбросить пароль');
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
        <Card>
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <Lock className="w-8 h-8 text-primary" />
            </div>
            <CardTitle className="text-2xl">Восстановление пароля</CardTitle>
            <CardDescription>
              {step === 'email'
                ? 'Введите email — пришлём код для сброса пароля'
                : `Код отправлен на ${email}. Введите его и новый пароль`}
            </CardDescription>
          </CardHeader>

          <CardContent>
            {devCode && !done && (
              <div className="mb-4 rounded-xl border border-amber-300/60 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-950/20 p-3 text-center text-sm text-amber-800 dark:text-amber-200">
                Демо-режим (почта не настроена). Ваш код: <span className="font-mono font-bold tracking-widest text-base">{devCode}</span>
              </div>
            )}

            <AnimatePresence mode="wait">
              {error && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="mb-4">
                  <Alert variant="destructive"><AlertCircle className="w-4 h-4" /><AlertDescription>{error}</AlertDescription></Alert>
                </motion.div>
              )}
            </AnimatePresence>

            {done ? (
              <div className="text-center space-y-4">
                <CheckCircle className="w-14 h-14 text-green-500 mx-auto" />
                <p className="text-muted-foreground">Пароль успешно изменён.</p>
                <Link to="/login"><Button className="w-full">Войти с новым паролем</Button></Link>
              </div>
            ) : step === 'email' ? (
              <form onSubmit={requestCode} className="space-y-4">
                <div className="space-y-2">
                  <label htmlFor="email" className="text-sm font-medium">Email</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <Input id="email" type="email" placeholder="your@email.com" value={email}
                      onChange={(e) => setEmail(e.target.value)} className="pl-10" disabled={isLoading} required />
                  </div>
                </div>
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Отправка…</> : 'Получить код'}
                </Button>
              </form>
            ) : (
              <form onSubmit={submitReset} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Код из письма</label>
                  <div className="relative">
                    <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <Input inputMode="numeric" placeholder="000000" value={code}
                      onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      className="pl-10 tracking-widest font-mono" disabled={isLoading} required />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Новый пароль</label>
                  <Input type="password" placeholder="Минимум 8 символов" value={password}
                    onChange={(e) => setPassword(e.target.value)} disabled={isLoading} required />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Повторите пароль</label>
                  <Input type="password" placeholder="Повторите пароль" value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)} disabled={isLoading} required />
                </div>
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Сохранение…</> : 'Сохранить новый пароль'}
                </Button>
                <button type="button" onClick={() => { setStep('email'); setError(null); }}
                  className="w-full text-sm text-muted-foreground hover:text-foreground">
                  Изменить email
                </button>
              </form>
            )}

            <div className="mt-6 text-center">
              <Link to="/login" className="inline-flex items-center text-sm text-primary hover:underline">
                <ArrowLeft className="w-4 h-4 mr-1" />Вернуться к входу
              </Link>
            </div>
          </CardContent>
        </Card>
        <p className="mt-6 text-center text-sm text-muted-foreground">
          Нужна помощь? <a href="mailto:support@ct-platform.by" className="text-primary hover:underline">Свяжитесь с поддержкой</a>
        </p>
      </motion.div>
    </div>
  );
}

// Старый флоу со ссылкой-токеном из письма больше не используется — единый
// маршрут восстановления теперь /forgot-password (код вводится на одной странице).
export function ResetPasswordPage() {
  return <Navigate to="/forgot-password" replace />;
}

export default ForgotPasswordPage;
