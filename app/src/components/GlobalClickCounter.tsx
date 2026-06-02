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

const FLUSH_MS = 900;   // как часто отправлять накопленные клики
const POLL_MS = 4000;   // как часто подтягивать общий счётчик
const MAX_PER_FLUSH = 50; // совпадает с лимитом backend, чтобы не терять клики

export function GlobalClickCounter() {
  const [serverTotal, setServerTotal] = useState<number | null>(null);
  const [pending, setPending] = useState(0);
  const [bump, setBump] = useState(0);
  const pendingRef = useRef(0);
  const flushing = useRef(false);

  useEffect(() => { pendingRef.current = pending; }, [pending]);

  const flush = useCallback(async () => {
    if (flushing.current) return;
    const n = Math.min(pendingRef.current, MAX_PER_FLUSH); // не больше лимита backend за раз
    if (n <= 0) return;
    flushing.current = true;
    const res = await clicksApi.add(n);
    flushing.current = false;
    if (res.data) {
      setServerTotal(res.data.total);
      setPending((p) => Math.max(0, p - n)); // вычитаем ровно отправленное; остаток уйдёт следующим тиком
    }
  }, []);

  // Первичная загрузка + опрос «вживую»
  useEffect(() => {
    let alive = true;
    void clicksApi.get().then((r) => { if (alive && r.data) setServerTotal((t) => Math.max(t ?? 0, r.data!.total)); });
    const poll = setInterval(() => {
      void clicksApi.get().then((r) => { if (alive && r.data) setServerTotal((t) => Math.max(t ?? 0, r.data!.total)); });
    }, POLL_MS);
    const flusher = setInterval(() => { void flush(); }, FLUSH_MS);
    return () => {
      alive = false;
      clearInterval(poll);
      clearInterval(flusher);
      // Финальная попытка отправить остаток (fire-and-forget)
      if (pendingRef.current > 0) void clicksApi.add(pendingRef.current);
    };
  }, [flush]);

  const handleClick = () => {
    setPending((p) => p + 1);
    setBump((b) => b + 1);
  };

  const displayed = (serverTotal ?? 0) + pending;

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

          <p className="text-xs text-muted-foreground mt-4">
            Счётчик хранится на сервере и обновляется в реальном времени для всех.
          </p>
        </div>
      </div>
    </section>
  );
}

export default GlobalClickCounter;
