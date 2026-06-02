/**
 * Ночная бегущая строка: с 00:00 до 06:00 раз в 20 минут ненавязчиво напоминает
 * отдохнуть. Появляется один раз за каждый 20-минутный интервал, плавно
 * проезжает и автоматически скрывается. Можно закрыть вручную.
 */
import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Moon, X } from 'lucide-react';

const MESSAGES = [
  'Мы ценим твоё усердие — но сейчас глубокая ночь. Здоровье важнее оценок: пора отдохнуть 🌙',
  'Знания закрепляются во сне. Ты молодец, что занимаешься, но мозгу нужен отдых — ложись спать 💙',
  'Глубокая ночь — лучшее время для сна, а не для задач. Побереги себя и возвращайся утром со свежими силами ✨',
  'Отличная работа сегодня! Но ночные бдения вредят памяти и здоровью. Сделай паузу и отдохни 😴',
];

const VISIBLE_MS = 15000; // сколько держать строку на экране
const CHECK_MS = 30000;   // как часто проверять время

/** Ключ текущего 20-минутного интервала, напр. "2026-06-02-2-1". */
function bucketKey(d: Date): string {
  return `${d.toISOString().slice(0, 10)}-${d.getHours()}-${Math.floor(d.getMinutes() / 20)}`;
}

function isNight(d: Date): boolean {
  const h = d.getHours();
  return h >= 0 && h < 6;
}

export function NightTicker() {
  const [message, setMessage] = useState<string | null>(null);
  const lastBucket = useRef<string | null>(null);
  const hideTimer = useRef<number | null>(null);

  useEffect(() => {
    const maybeShow = () => {
      const now = new Date();
      if (!isNight(now)) return;
      const key = bucketKey(now);
      if (lastBucket.current === key) return; // уже показывали в этом интервале
      lastBucket.current = key;
      // Сообщение зависит от часа — выглядит как «новое» каждый раз
      setMessage(MESSAGES[now.getHours() % MESSAGES.length]);
      if (hideTimer.current) window.clearTimeout(hideTimer.current);
      hideTimer.current = window.setTimeout(() => setMessage(null), VISIBLE_MS);
    };

    maybeShow(); // проверить сразу при загрузке
    const id = window.setInterval(maybeShow, CHECK_MS);
    return () => {
      window.clearInterval(id);
      if (hideTimer.current) window.clearTimeout(hideTimer.current);
    };
  }, []);

  const close = () => {
    if (hideTimer.current) window.clearTimeout(hideTimer.current);
    setMessage(null);
  };

  return (
    <AnimatePresence>
      {message && (
        <motion.div
          initial={{ y: 60, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 60, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 260, damping: 26 }}
          className="fixed inset-x-0 bottom-16 lg:bottom-0 z-40 pointer-events-none"
        >
          <div className="pointer-events-auto mx-auto max-w-5xl m-3 flex items-center gap-3 rounded-xl border border-indigo-300/40 dark:border-indigo-400/20 bg-indigo-950/90 text-indigo-50 backdrop-blur px-4 py-2.5 shadow-lg overflow-hidden">
            <Moon className="w-4 h-4 shrink-0 text-indigo-300" />
            {/* Бегущая строка */}
            <div className="relative flex-1 overflow-hidden h-5">
              <motion.div
                className="absolute whitespace-nowrap text-sm will-change-transform"
                initial={{ x: '100%' }}
                animate={{ x: '-100%' }}
                transition={{ duration: 18, ease: 'linear', repeat: Infinity }}
              >
                {message}
              </motion.div>
            </div>
            <button onClick={close} className="shrink-0 p-1 rounded-md hover:bg-white/10 transition-colors" title="Скрыть">
              <X className="w-4 h-4" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default NightTicker;
