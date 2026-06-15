/**
 * «Командный кликер» — общая для всех пользователей кнопка в самом низу сайта.
 *
 * Все нажатия суммируются на backend (модель GlobalCounter, эндпоинты
 * GET/POST /api/clicks). Локально клики оптимистично увеличивают счётчик и
 * пачкой отправляются на сервер; раз в несколько секунд значение
 * подтягивается заново — получается realtime-подобное поведение без
 * websocket'ов (что не ломает serverless-архитектуру Render/Vercel).
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { MousePointerClick, Users } from 'lucide-react';
import { clicksApi } from '@/lib/api/client';
import { useAppStore } from '@/store/useAppStore';
import { ClickLeaderboard } from '@/components/ClickLeaderboard';

const FLUSH_MS = 900;   // как часто отправлять накопленные клики
const POLL_MS = 4000;   // как часто подтягивать общий счётчик
const MAX_PER_FLUSH = 50; // совпадает с лимитом backend, чтобы не терять клики

/** Следующая «круглая» цель для полоски прогресса (10, 50, 100, 500, 1k, 5k, …). */
function nextMilestone(n: number): number {
  const steps = [10, 50, 100, 250, 500, 1000, 2500, 5000, 10000, 25000, 50000, 100000];
  for (const s of steps) if (n < s) return s;
  return Math.ceil((n + 1) / 100000) * 100000;
}

export function GlobalClickCounter() {
  const [serverTotal, setServerTotal] = useState<number | null>(null);
  const [pending, setPending] = useState(0);
  const [bump, setBump] = useState(0);
  const [throttled, setThrottled] = useState(false);
  const pendingRef = useRef(0);
  const flushing = useRef(false);
  const throttleTimer = useRef<number | null>(null);
  // Токен в ref, чтобы flush оставался стабильным, но всегда слал актуальный токен
  // (авторизованные клики засчитываются персонально в рейтинг кликеров).
  const token = useAppStore((s) => s.token);
  const tokenRef = useRef(token);
  useEffect(() => { tokenRef.current = token; }, [token]);

  useEffect(() => { pendingRef.current = pending; }, [pending]);

  const flush = useCallback(async () => {
    if (flushing.current) return;
    const n = Math.min(pendingRef.current, MAX_PER_FLUSH); // не больше лимита backend за раз
    if (n <= 0) return;
    flushing.current = true;
    const res = await clicksApi.add(n, tokenRef.current);
    flushing.current = false;
    if (res) {
      // 200 или 429(throttled): в обоих случаях вычитаем отправленное —
      // лишние при троттлинге клики просто не засчитываются (анти-накрутка).
      setServerTotal((t) => Math.max(t ?? 0, res.total));
      setPending((p) => Math.max(0, p - n));
      if (res.throttled) {
        setThrottled(true);
        if (throttleTimer.current) window.clearTimeout(throttleTimer.current);
        throttleTimer.current = window.setTimeout(() => setThrottled(false), 2500);
      }
    }
    // res === null → сеть/сервер недоступны: pending не трогаем, повторим позже.
  }, []);

  // Первичная загрузка + опрос «вживую»
  useEffect(() => {
    let alive = true;
    void clicksApi.get().then((r) => { if (alive && r) setServerTotal((t) => Math.max(t ?? 0, r.total)); });
    const poll = setInterval(() => {
      void clicksApi.get().then((r) => { if (alive && r) setServerTotal((t) => Math.max(t ?? 0, r.total)); });
    }, POLL_MS);
    const flusher = setInterval(() => { void flush(); }, FLUSH_MS);
    return () => {
      alive = false;
      clearInterval(poll);
      clearInterval(flusher);
      if (throttleTimer.current) window.clearTimeout(throttleTimer.current);
      // Финальная попытка отправить остаток (fire-and-forget)
      if (pendingRef.current > 0) void clicksApi.add(Math.min(pendingRef.current, MAX_PER_FLUSH), tokenRef.current);
    };
  }, [flush]);

  const handleClick = () => {
    setPending((p) => p + 1);
    setBump((b) => b + 1);
  };

  const displayed = (serverTotal ?? 0) + pending;
  const goal = nextMilestone(displayed);
  const goalPct = Math.min(100, Math.round((displayed / goal) * 100));

  return (
    <section className="border-t border-border bg-gradient-to-b from-muted/30 to-background">
      <div className="container py-10">
        <div className="max-w-xl mx-auto text-center">
          <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-medium mb-4">
            <Users className="w-3.5 h-3.5" />Командная активность
          </span>
          <h3 className="text-xl sm:text-2xl font-bold tracking-tight mb-1">Общий счётчик нажатий</h3>
          <p className="text-sm text-muted-foreground mb-6">
            Это маленькая командная игра: нажатия <strong>всех посетителей</strong> суммируются в один общий счётчик.
            Внесите свой клик в общее дело!
          </p>

          {/* Счётчик */}
          <div className="mb-5">
            <motion.div
              key={displayed}
              initial={{ scale: 0.92, opacity: 0.6 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 320, damping: 18 }}
              className="text-4xl sm:text-5xl font-extrabold tabular-nums bg-gradient-to-br from-primary to-primary/70 bg-clip-text text-transparent"
            >
              {displayed.toLocaleString('ru-RU')}
            </motion.div>
            <p className="text-xs text-muted-foreground mt-1">нажатий за всё время</p>
          </div>

          {/* Прогресс до следующей цели */}
          <div className="mb-6 max-w-sm mx-auto">
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1.5">
              <span>Цель команды</span>
              <span className="font-semibold text-foreground tabular-nums">{displayed.toLocaleString('ru-RU')} / {goal.toLocaleString('ru-RU')}</span>
            </div>
            <div className="h-2.5 rounded-full bg-muted overflow-hidden">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-primary to-primary/70"
                initial={false}
                animate={{ width: `${goalPct}%` }}
                transition={{ type: 'spring', stiffness: 120, damping: 20 }}
              />
            </div>
          </div>

          {/* Кнопка */}
          <motion.button
            type="button"
            onClick={handleClick}
            whileTap={{ scale: 0.94 }}
            className="group relative inline-flex items-center gap-2.5 px-8 py-4 rounded-2xl bg-primary text-primary-foreground font-bold text-lg shadow-md hover:bg-primary/90 hover:shadow-lg transition-all active:scale-[0.98]"
          >
            <MousePointerClick className="w-6 h-6 transition-transform group-hover:-rotate-12" />
            Нажать!
            {pending > 0 && (
              <motion.span
                key={bump}
                initial={{ opacity: 0, y: 0, scale: 0.8 }}
                animate={{ opacity: 0, y: -28, scale: 1.2 }}
                transition={{ duration: 0.7 }}
                className="absolute -top-1 right-3 text-primary font-extrabold pointer-events-none"
              >
                +1
              </motion.span>
            )}
          </motion.button>

          <p className="text-xs text-muted-foreground mt-4 h-4">
            {throttled
              ? <span className="text-amber-600 dark:text-amber-400">Не так быстро 🙂 засчитываем по-честному</span>
              : 'Счётчик хранится на сервере и обновляется в реальном времени для всех.'}
          </p>
        </div>

        {/* Рейтинг кликеров (персональный, по периодам) */}
        <ClickLeaderboard />
      </div>
    </section>
  );
}

export default GlobalClickCounter;
