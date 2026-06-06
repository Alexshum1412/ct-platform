/**
 * MembersOnly — обёртка для страниц, доступных только зарегистрированным
 * пользователям с подтверждённым email (теория и т.п.).
 *
 *  • Гость → экран регистрации/входа.
 *  • Вошёл, но email не подтверждён → экран подтверждения.
 *  • Иначе → содержимое страницы.
 *
 * Без логики Premium/5-заданий (в отличие от GameGate) — нужен только аккаунт.
 * Вёрстка адаптивная (мобайл-френдли): container + max-w, крупные кнопки.
 */
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Lock, ArrowLeft, UserPlus, MailCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useAppStore } from '@/store/useAppStore';

function Shell({ children }: { children: ReactNode }) {
  return (
    <div className="relative min-h-[70vh] overflow-hidden bg-gradient-to-br from-primary/5 via-background to-background">
      <div className="pointer-events-none absolute -top-24 -right-24 w-[28rem] h-[28rem] rounded-full bg-primary/10 blur-3xl opacity-60" />
      <div className="relative container py-10 sm:py-12 max-w-lg">
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

export function MembersOnly({ feature = 'Этот раздел', children }: { feature?: string; children: ReactNode }) {
  const user = useAppStore((s) => s.user);
  const token = useAppStore((s) => s.token);
  const signedIn = !!user || !!token;

  // Гость — стена регистрации.
  if (!signedIn) {
    return (
      <Shell>
        <Card>
          <CardContent className="p-6 sm:p-8 text-center">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <Lock className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-xl sm:text-2xl font-bold mb-2">Только для участников</h1>
            <p className="text-muted-foreground mb-6">
              {feature} доступен зарегистрированным пользователям. Создайте бесплатный
              аккаунт, чтобы открыть теорию, практику и экзамены.
            </p>
            <Button asChild size="lg" className="w-full gap-2">
              <Link to="/register"><UserPlus className="w-4 h-4" />Зарегистрироваться</Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="w-full gap-2 mt-2">
              <Link to="/login">Войти</Link>
            </Button>
          </CardContent>
        </Card>
      </Shell>
    );
  }

  // Вошёл, но email не подтверждён.
  if (user && !user.emailVerified) {
    return (
      <Shell>
        <Card>
          <CardContent className="p-6 sm:p-8 text-center">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <MailCheck className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-xl sm:text-2xl font-bold mb-2">Подтвердите email</h1>
            <p className="text-muted-foreground mb-6">
              {feature} откроется после подтверждения почты. Введите код, который мы
              отправили на ваш email.
            </p>
            <Button asChild size="lg" className="w-full gap-2">
              <Link to="/verify-email"><MailCheck className="w-4 h-4" />Ввести код</Link>
            </Button>
          </CardContent>
        </Card>
      </Shell>
    );
  }

  return <>{children}</>;
}

export default MembersOnly;
