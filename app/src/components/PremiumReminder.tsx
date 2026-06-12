/**
 * PremiumReminder — постоянное ненавязчивое напоминание бесплатным пользователям
 * оформить Premium.
 *
 * Показывается только авторизованным пользователям с планом FREE. Всплывает
 * периодически (первый раз вскоре после загрузки, затем каждые несколько минут),
 * сам прячется через некоторое время и снова появляется позже. Кнопка ведёт на
 * страницу оплаты /payment. Скрыт в фокус-режиме.
 */
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Crown, X, Sparkles } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';

const FIRST_DELAY_MS = 25_000;       // первый показ — через 25 c
const REPEAT_EVERY_MS = 150_000;     // затем каждые 2.5 минуты
const VISIBLE_MS = 16_000;           // держится на экране 16 c
// Явное закрытие крестиком глушит напоминание на сутки — иначе оно
// возвращалось каждые 2,5 минуты и ощущалось «незакрываемым».
const SNOOZE_KEY = 'ct-premium-reminder-snooze-until';
const SNOOZE_MS = 24 * 60 * 60 * 1000;

const isSnoozed = () => {
  const until = Number(localStorage.getItem(SNOOZE_KEY) ?? 0);
  return Number.isFinite(until) && Date.now() < until;
};

const messages = [
  'Бесплатный план ограничен. С Premium — задания без лимитов и уровни IV–V.',
  'Готовься без ограничений: полная аналитика и симулятор ЦТ ждут в Premium.',
  'Снимите дневной лимит заданий — оформите Premium от 15 BYN/мес.',
  'Premium открывает все игры, экзамены и расширенную статистику.',
];

export function PremiumReminder() {
  const user = useAppStore((s) => s.user);
  const focusMode = useAppStore((s) => s.focusMode);
  // Напоминаем о Premium только подтверждённым бесплатным пользователям
  // (неподтверждённым сначала показываем баннер подтверждения email).
  const isFree = !!user && user.plan === 'FREE' && !!user.emailVerified;

  const [open, setOpen] = useState(false);
  const [msgIndex, setMsgIndex] = useState(0);
  const hideTimer = useRef<number | null>(null);

  useEffect(() => {
    if (!isFree) { setOpen(false); return; }

    const show = () => {
      if (isSnoozed()) return;
      setMsgIndex((i) => (i + 1) % messages.length);
      setOpen(true);
      if (hideTimer.current) window.clearTimeout(hideTimer.current);
      hideTimer.current = window.setTimeout(() => setOpen(false), VISIBLE_MS);
    };

    const first = window.setTimeout(show, FIRST_DELAY_MS);
    const repeat = window.setInterval(show, REPEAT_EVERY_MS);
    return () => {
      window.clearTimeout(first);
      window.clearInterval(repeat);
      if (hideTimer.current) window.clearTimeout(hideTimer.current);
    };
  }, [isFree]);

  if (!isFree || focusMode) return null;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0, y: 24, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 24, scale: 0.96 }}
          transition={{ type: 'spring', stiffness: 260, damping: 22 }}
          className="fixed left-3 bottom-20 lg:bottom-6 z-40 w-[min(22rem,calc(100vw-5rem))]"
        >
          <div className="relative overflow-hidden rounded-2xl border border-amber-300/60 dark:border-amber-500/30 bg-background shadow-xl">
            <div className="absolute inset-0 bg-gradient-to-br from-amber-400/10 via-transparent to-orange-500/10 pointer-events-none" />
            <button
              onClick={() => {
                localStorage.setItem(SNOOZE_KEY, String(Date.now() + SNOOZE_MS));
                setOpen(false);
              }}
              className="absolute top-1.5 right-1.5 p-2 rounded-full hover:bg-muted transition-colors"
              aria-label="Скрыть на сутки"
              title="Скрыть на сутки"
            >
              <X className="w-5 h-5 text-muted-foreground" />
            </button>
            <div className="relative p-4 pr-9">
              <div className="flex items-center gap-2 mb-1.5">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shrink-0">
                  <Crown className="w-4 h-4 text-white" />
                </div>
                <span className="font-semibold text-sm">CT-Platform Premium</span>
              </div>
              <p className="text-sm text-muted-foreground mb-3 leading-snug">{messages[msgIndex]}</p>
              <Link
                to="/payment"
                onClick={() => setOpen(false)}
                className="inline-flex items-center justify-center gap-1.5 w-full h-9 rounded-lg bg-gradient-to-r from-amber-400 to-orange-500 text-white text-sm font-semibold hover:from-amber-500 hover:to-orange-600 transition-colors"
              >
                <Sparkles className="w-4 h-4" />
                Оформить Premium
              </Link>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default PremiumReminder;
