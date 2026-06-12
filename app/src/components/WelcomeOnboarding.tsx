/**
 * Онбординг для нового посетителя: один раз (localStorage-флаг), только для
 * гостей. Три шага — Практика / Экзамены / Олимпиады — с переходом к делу или
 * регистрации. Лёгкий, закрывается в один тап, не появляется повторно.
 */
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Target, ClipboardList, Trophy, ArrowRight, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAppStore } from '@/store/useAppStore';

const STORAGE_KEY = 'ct-onboarding-done';

const STEPS = [
  {
    icon: Target,
    accent: 'from-primary to-indigo-500',
    title: 'Практика по программе РИКЗ',
    text: 'Тысячи заданий с мгновенной проверкой, подсказками и разборами. Фильтры по темам, частям А/Б и уровню.',
  },
  {
    icon: ClipboardList,
    accent: 'from-violet-500 to-fuchsia-500',
    title: 'Пробные экзамены как настоящие',
    text: 'Формат реального ЦТ/ЦЭ: таймер, структура варианта и тестовый балл по официальной шкале.',
  },
  {
    icon: Trophy,
    accent: 'from-amber-500 to-orange-500',
    title: 'Олимпиады и рейтинги',
    text: 'Задачи всех этапов республиканской олимпиады с разборами, достижения и отдельный рейтинг олимпиадников.',
  },
] as const;

export function WelcomeOnboarding() {
  const isAuthenticated = useAppStore((s) => s.isAuthenticated);
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (isAuthenticated) return;
    try {
      if (localStorage.getItem(STORAGE_KEY)) return;
    } catch { return; }
    const t = setTimeout(() => setOpen(true), 1600);
    return () => clearTimeout(t);
  }, [isAuthenticated]);

  const dismiss = () => {
    setOpen(false);
    try { localStorage.setItem(STORAGE_KEY, '1'); } catch { /* ignore */ }
  };

  const finish = () => {
    dismiss();
    navigate('/register');
  };

  if (!open) return null;
  const current = STEPS[step];
  const Icon = current.icon;
  const last = step === STEPS.length - 1;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center bg-black/55 backdrop-blur-sm p-0 sm:p-4"
        onClick={dismiss}
        role="dialog"
        aria-modal="true"
        aria-label="Знакомство с платформой"
      >
        <motion.div
          initial={{ opacity: 0, y: 48, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 24 }}
          transition={{ type: 'spring', stiffness: 320, damping: 30 }}
          className="relative w-full sm:max-w-md bg-card border border-border rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Акцентная шапка с градиентом шага */}
          <div className={`relative h-28 bg-gradient-to-br ${current.accent}`}>
            <div className="absolute inset-0 opacity-20"
              style={{ backgroundImage: 'radial-gradient(circle at 75% 20%, white 0, transparent 45%)' }} />
            <button
              onClick={dismiss}
              aria-label="Закрыть"
              className="absolute top-3 right-3 w-9 h-9 rounded-full bg-black/20 hover:bg-black/30 text-white flex items-center justify-center transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
            <div className="absolute -bottom-7 left-6 w-14 h-14 rounded-2xl bg-card border border-border shadow-lg flex items-center justify-center">
              <Icon className="w-7 h-7 text-primary" />
            </div>
          </div>

          <div className="px-6 pt-10 pb-6">
            <AnimatePresence mode="wait">
              <motion.div
                key={step}
                initial={{ opacity: 0, x: 14 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -14 }}
                transition={{ duration: 0.18 }}
              >
                <h3 className="text-xl font-extrabold mb-2">{current.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed min-h-[3.5rem]">{current.text}</p>
              </motion.div>
            </AnimatePresence>

            {/* Прогресс-точки */}
            <div className="flex items-center gap-1.5 mt-5 mb-5" aria-hidden>
              {STEPS.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setStep(i)}
                  className={`h-1.5 rounded-full transition-all duration-300 cursor-pointer ${
                    i === step ? 'w-7 bg-primary' : 'w-2.5 bg-muted-foreground/25 hover:bg-muted-foreground/40'
                  }`}
                />
              ))}
            </div>

            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={dismiss} className="text-muted-foreground">
                Пропустить
              </Button>
              <Button
                className="ml-auto btn-shine gap-1.5"
                onClick={() => (last ? finish() : setStep(step + 1))}
              >
                {last ? 'Создать аккаунт' : 'Далее'}
                <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
