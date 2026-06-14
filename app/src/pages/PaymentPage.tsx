/**
 * PaymentPage — страница оформления Premium-подписки (/payment).
 *
 * Платёжная система пока НЕ подключена: страница готова под интеграцию
 * (поля карты — заглушка). При оформлении вызывается POST /api/subscription,
 * который фиксирует ВРЕМЯ ПОКУПКИ (startDate) и активирует Premium.
 * Позже сюда подключится реальный провайдер (карта/ЕРИП/и т.п.).
 */
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Crown, Check, ArrowLeft, ShieldCheck, CreditCard, Sparkles, Lock, CheckCircle2, Info,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useAppStore } from '@/store/useAppStore';
import { subscriptionApi, referralApi } from '@/lib/api/client';

type Plan = 'monthly' | 'yearly';

const round2 = (n: number) => Math.round(n * 100) / 100;

const PLAN_INFO: Record<Plan, { title: string; price: number; per: string; note?: string }> = {
  monthly: { title: 'Месяц', price: 15, per: 'в месяц' },
  yearly: { title: 'Год', price: 99, per: 'в год', note: 'выгода 31%' },
};

const perks = [
  'Неограниченное решение заданий (без дневного лимита)',
  'Полная аналитика по разделам и уровням',
  'Доступ ко всем мини-играм без условий',
  'Симулятор ЦТ — полный вариант',
  'Значок 👑 в профиле и рейтинге',
];

export function PaymentPage() {
  const navigate = useNavigate();
  const { user, token, setUser } = useAppStore();
  const [plan, setPlan] = useState<Plan>('yearly');
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<{ purchasedAt: string } | null>(null);

  // Поля карты — визуальная заглушка под будущую платёжную систему.
  const [card, setCard] = useState('');
  const [exp, setExp] = useState('');
  const [cvc, setCvc] = useState('');

  const isPremium = !!user && user.plan !== 'FREE';
  const [sub, setSub] = useState<{ startDate: string; endDate: string } | null>(null);
  // Реферальная скидка на первую покупку (с сервера, не доверяем клиенту при оплате).
  const [discountPct, setDiscountPct] = useState(0);

  useEffect(() => {
    if (!token) return;
    void subscriptionApi.get(token).then((r) => {
      if (r.data?.subscription) setSub({ startDate: r.data.subscription.startDate, endDate: r.data.subscription.endDate });
    });
    void referralApi.me(token).then((r) => {
      if (r.data?.myDiscount) setDiscountPct(r.data.myDiscount);
    });
  }, [token]);

  const handlePay = async () => {
    if (!token) { navigate('/register'); return; }
    setProcessing(true);
    setError(null);
    const res = await subscriptionApi.purchase(plan, token);
    setProcessing(false);
    if (res.data?.success) {
      const tier = plan === 'yearly' ? 'PREMIUM_YEARLY' : 'PREMIUM_MONTHLY';
      if (user) setUser({ ...user, plan: tier });
      setDone({ purchasedAt: res.data.purchasedAt });
    } else {
      setError(res.error || 'Не удалось оформить подписку. Попробуйте ещё раз.');
    }
  };

  // ---- Гость ----
  if (!token) {
    return (
      <Shell>
        <Card>
          <CardContent className="p-8 text-center">
            <Crown className="w-12 h-12 mx-auto mb-4 text-amber-500" />
            <h1 className="text-2xl font-bold mb-2">Оформление Premium</h1>
            <p className="text-muted-foreground mb-6">Войдите или зарегистрируйтесь, чтобы оформить подписку.</p>
            <Button asChild size="lg" className="w-full">
              <Link to="/register">Зарегистрироваться</Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="w-full mt-2">
              <Link to="/login">Войти</Link>
            </Button>
          </CardContent>
        </Card>
      </Shell>
    );
  }

  // ---- Вошёл, но email не подтверждён ----
  if (user && !user.emailVerified) {
    return (
      <Shell>
        <Card>
          <CardContent className="p-8 text-center">
            <Crown className="w-12 h-12 mx-auto mb-4 text-amber-500" />
            <h1 className="text-2xl font-bold mb-2">Сначала подтвердите email</h1>
            <p className="text-muted-foreground mb-6">
              Оформить Premium можно после подтверждения почты. Введите код,
              отправленный на ваш email.
            </p>
            <Button asChild size="lg" className="w-full">
              <Link to="/verify-email">Ввести код подтверждения</Link>
            </Button>
          </CardContent>
        </Card>
      </Shell>
    );
  }

  // ---- Успешная покупка ----
  if (done) {
    return (
      <Shell>
        <Card className="border-green-400/60">
          <CardContent className="p-8 text-center">
            <motion.div initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
              className="w-16 h-16 rounded-2xl bg-green-500/15 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-9 h-9 text-green-600 dark:text-green-400" />
            </motion.div>
            <h1 className="text-2xl font-bold mb-1">Premium активирован! 🎉</h1>
            <p className="text-muted-foreground mb-2">Спасибо! Теперь вам доступны все возможности платформы.</p>
            <p className="text-sm text-muted-foreground mb-6">
              Время покупки: {new Date(done.purchasedAt).toLocaleString('ru-RU')}
            </p>
            <Button size="lg" className="w-full" onClick={() => navigate('/profile')}>В профиль</Button>
            <Button variant="outline" size="lg" className="w-full mt-2" onClick={() => navigate('/')}>На главную</Button>
          </CardContent>
        </Card>
      </Shell>
    );
  }

  // ---- Уже Premium ----
  if (isPremium) {
    return (
      <Shell>
        <Card className="border-amber-300 dark:border-amber-700">
          <CardContent className="p-8 text-center">
            <Crown className="w-12 h-12 mx-auto mb-4 text-amber-500" />
            <h1 className="text-2xl font-bold mb-1">У вас уже Premium</h1>
            <p className="text-muted-foreground mb-4">Спасибо за поддержку! Все функции открыты.</p>
            {sub && (
              <div className="text-sm text-muted-foreground rounded-xl bg-muted/50 p-4 mb-6 text-left space-y-1">
                <p>Дата покупки: <span className="font-medium text-foreground">{new Date(sub.startDate).toLocaleString('ru-RU')}</span></p>
                <p>Действует до: <span className="font-medium text-foreground">{new Date(sub.endDate).toLocaleDateString('ru-RU')}</span></p>
              </div>
            )}
            <Button size="lg" className="w-full" onClick={() => navigate('/profile')}>В профиль</Button>
          </CardContent>
        </Card>
      </Shell>
    );
  }

  // ---- Оформление ----
  const price = PLAN_INFO[plan].price;
  const finalPrice = discountPct > 0 ? round2(price * (1 - discountPct / 100)) : price;
  const saved = round2(price - finalPrice);
  return (
    <Shell>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Левая колонка — что входит */}
        <div>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shrink-0">
              <Crown className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold leading-tight">CT-Platform Premium</h1>
              <p className="text-sm text-muted-foreground">Готовься к ЦТ/ЦЭ без ограничений</p>
            </div>
          </div>
          <Card>
            <CardContent className="p-6 space-y-3">
              {perks.map((p) => (
                <div key={p} className="flex items-start gap-2.5">
                  <Check className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
                  <span className="text-sm">{p}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Правая колонка — выбор тарифа + оплата */}
        <div className="space-y-4">
          {/* Выбор тарифа */}
          <div className="grid grid-cols-2 gap-3">
            {(Object.keys(PLAN_INFO) as Plan[]).map((p) => {
              const info = PLAN_INFO[p];
              const active = plan === p;
              return (
                <button
                  key={p}
                  onClick={() => setPlan(p)}
                  className={`relative rounded-xl border-2 p-4 text-center transition-all ${
                    active ? 'border-amber-500 bg-amber-50 dark:bg-amber-950/20' : 'border-border hover:border-amber-300'
                  }`}
                >
                  {info.note && (
                    <span className="absolute -top-2 left-1/2 -translate-x-1/2 bg-amber-500 text-white text-[10px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap">
                      {info.note}
                    </span>
                  )}
                  <p className="text-sm text-muted-foreground">{info.title}</p>
                  <p className="text-2xl font-bold">{info.price} BYN</p>
                  <p className="text-xs text-muted-foreground">{info.per}</p>
                </button>
              );
            })}
          </div>

          {/* Платёжные данные (заглушка) */}
          <Card>
            <CardContent className="p-5 space-y-3">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <CreditCard className="w-4 h-4" />Данные карты
              </div>
              <input
                value={card}
                onChange={(e) => setCard(e.target.value)}
                inputMode="numeric"
                placeholder="0000 0000 0000 0000"
                className="w-full px-3 py-2.5 rounded-lg border border-border bg-background text-sm"
              />
              <div className="grid grid-cols-2 gap-3">
                <input value={exp} onChange={(e) => setExp(e.target.value)} placeholder="ММ/ГГ" className="w-full px-3 py-2.5 rounded-lg border border-border bg-background text-sm" />
                <input value={cvc} onChange={(e) => setCvc(e.target.value)} inputMode="numeric" placeholder="CVC" className="w-full px-3 py-2.5 rounded-lg border border-border bg-background text-sm" />
              </div>
              <div className="flex items-start gap-2 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900 p-3 text-xs text-blue-700 dark:text-blue-300">
                <Info className="w-4 h-4 shrink-0 mt-0.5" />
                <span>Приём оплаты скоро подключим. Сейчас оформление активирует Premium в демо-режиме и фиксирует время покупки.</span>
              </div>
            </CardContent>
          </Card>

          {discountPct > 0 && (
            <div className="rounded-xl border border-green-300 dark:border-green-800 bg-green-50 dark:bg-green-950/20 p-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-green-700 dark:text-green-400 mb-2">
                <Sparkles className="w-4 h-4" />Реферальная скидка −{discountPct}%
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-muted-foreground line-through text-sm">{price} BYN</span>
                <span className="text-2xl font-bold">{finalPrice} BYN</span>
                <span className="text-sm text-green-600 dark:text-green-400">экономия {saved} BYN</span>
              </div>
            </div>
          )}

          {error && (
            <div className="rounded-lg bg-red-500/10 text-red-600 dark:text-red-400 text-sm px-4 py-2.5">{error}</div>
          )}

          <Button
            size="lg"
            className="w-full bg-gradient-to-r from-amber-400 to-orange-500 hover:from-amber-500 hover:to-orange-600 text-white font-semibold gap-2"
            onClick={handlePay}
            disabled={processing}
          >
            {processing ? 'Обработка…' : <><Lock className="w-4 h-4" />Оплатить {finalPrice} BYN</>}
          </Button>
          <p className="text-xs text-center text-muted-foreground flex items-center justify-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5" />Безопасное оформление · отмена в любой момент
          </p>
        </div>
      </div>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-amber-400/5 via-background to-background">
      <div className="pointer-events-none absolute -top-24 -right-24 w-[28rem] h-[28rem] rounded-full bg-amber-400/10 blur-3xl opacity-60" />
      <div className="relative container py-10 max-w-3xl">
        <Button asChild variant="ghost" size="sm" className="mb-6 gap-2">
          <Link to="/"><ArrowLeft className="w-4 h-4" />Назад</Link>
        </Button>
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
          {children}
        </motion.div>
        <div className="mt-8 flex items-center justify-center gap-2 text-xs text-muted-foreground">
          <Sparkles className="w-3.5 h-3.5 text-amber-500" />
          Вопросы по оплате? <Link to="/contact" className="underline">Напишите нам</Link>
        </div>
      </div>
    </div>
  );
}

export default PaymentPage;
