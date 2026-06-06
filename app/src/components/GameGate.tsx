/**
 * GameGate — доступ к секретным мини-играм (рулетка / блэкджек).
 *
 * Правила:
 *  • Гость — нельзя: показываем «стену регистрации».
 *  • Бесплатный план — открывается после 5 решённых заданий (с прогрессом).
 *  • Premium — всё открыто всегда.
 *
 * Оборачивает содержимое страницы игры: либо показывает экран-замок, либо детей.
 */
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Lock, Crown, BookOpen, ArrowLeft, UserPlus, Sparkles, MailCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useAppStore } from '@/store/useAppStore';

export const REQUIRED_SOLVED = 5;

function GateShell({ children }: { children: ReactNode }) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-primary/5 via-background to-background">
      <div className="pointer-events-none absolute -top-24 -right-24 w-[28rem] h-[28rem] rounded-full bg-primary/10 blur-3xl opacity-60" />
      <div className="relative container py-12 max-w-lg">
        <Button asChild variant="ghost" size="sm" className="mb-6 gap-2">
          <Link to="/"><ArrowLeft className="w-4 h-4" />На главную</Link>
        </Button>
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
          {children}
        </motion.div>
      </div>
    </div>
  );
}

export function GameGate({ game, children }: { game: string; children: ReactNode }) {
  const user = useAppStore((s) => s.user);
  const token = useAppStore((s) => s.token);
  // Накопительный счётчик решённых заданий (переживает сброс прогресса), чтобы
  // разблокированные игры не блокировались снова после сброса.
  const solved = useAppStore((s) => s.gamesProgressCount);

  const signedIn = !!user || !!token;
  const isPremium = !!user && user.plan !== 'FREE';

  // Гость — стена регистрации.
  if (!signedIn) {
    return (
      <GateShell>
        <Card>
          <CardContent className="p-8 text-center">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <Lock className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-2xl font-bold mb-2">Только для участников</h1>
            <p className="text-muted-foreground mb-6">
              «{game}» — бонус для зарегистрированных пользователей. Создайте бесплатный
              аккаунт, чтобы получить доступ ко всем возможностям платформы.
            </p>
            <Button asChild size="lg" className="w-full gap-2">
              <Link to="/register"><UserPlus className="w-4 h-4" />Зарегистрироваться</Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="w-full gap-2 mt-2">
              <Link to="/login">Войти</Link>
            </Button>
          </CardContent>
        </Card>
      </GateShell>
    );
  }

  // Вошёл, но email не подтверждён — сначала подтверждение.
  if (user && !user.emailVerified) {
    return (
      <GateShell>
        <Card>
          <CardContent className="p-8 text-center">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <MailCheck className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-2xl font-bold mb-2">Подтвердите email</h1>
            <p className="text-muted-foreground mb-6">
              Мини-игра «{game}» откроется после подтверждения почты. Введите код,
              который мы отправили на ваш email.
            </p>
            <Button asChild size="lg" className="w-full gap-2">
              <Link to="/verify-email"><MailCheck className="w-4 h-4" />Ввести код</Link>
            </Button>
          </CardContent>
        </Card>
      </GateShell>
    );
  }

  // Бесплатный план — нужно решить 5 заданий.
  if (!isPremium && solved < REQUIRED_SOLVED) {
    const pct = Math.min(100, Math.round((solved / REQUIRED_SOLVED) * 100));
    return (
      <GateShell>
        <Card>
          <CardContent className="p-8 text-center">
            <div className="w-16 h-16 rounded-2xl bg-amber-400/15 flex items-center justify-center mx-auto mb-4">
              <Lock className="w-8 h-8 text-amber-500" />
            </div>
            <h1 className="text-2xl font-bold mb-2">Почти открыто!</h1>
            <p className="text-muted-foreground mb-5">
              Мини-игра «{game}» откроется после {REQUIRED_SOLVED} решённых заданий.
              Решено: <span className="font-semibold text-foreground">{solved}</span> из {REQUIRED_SOLVED}.
            </p>
            <Progress value={pct} className="h-2.5 mb-6" />
            <Button asChild size="lg" className="w-full gap-2">
              <Link to="/"><BookOpen className="w-4 h-4" />Решать задания</Link>
            </Button>
            <div className="mt-4 rounded-xl border border-amber-300/50 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-950/20 p-3 text-sm text-amber-800 dark:text-amber-200/90 flex items-center gap-2 justify-center">
              <Crown className="w-4 h-4 shrink-0" />
              <span>С Premium игры доступны сразу — <Link to="/payment" className="underline font-medium">оформить</Link></span>
            </div>
          </CardContent>
        </Card>
      </GateShell>
    );
  }

  // Доступ разрешён.
  return (
    <>
      {isPremium && (
        <div className="container max-w-6xl pt-4">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-400/15 text-amber-600 dark:text-amber-400 text-xs font-medium">
            <Sparkles className="w-3.5 h-3.5" />Premium · полный доступ
          </span>
        </div>
      )}
      {children}
    </>
  );
}

export default GameGate;
