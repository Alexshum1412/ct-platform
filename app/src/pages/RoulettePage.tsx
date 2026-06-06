/**
 * «Рулетка» — секретная демо-страница с классической европейской рулеткой.
 *
 * ВАЖНО: это исключительно виртуальная мини-игра. Никаких реальных денег,
 * никакой связи с платёжной системой и никакой настоящей валюты. Баланс —
 * условные золотые монеты, которые при перезагрузке страницы сбрасываются до 100
 * (баланс хранится только в состоянии компонента и НЕ сохраняется нигде).
 *
 * Реализовано полностью на клиенте: ставки (число / цвет / чёт-нечёт / диапазон /
 * дюжина / колонка), вращение колеса, определение выигрыша, расчёт выплат,
 * история спинов, правила, таблица вероятностей и подсказки.
 */
import { Fragment, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Coins, RotateCcw, Play, Eraser, Undo2, Info, BookOpen, Percent, ArrowLeft, Sparkles,
  Dices, History, Wallet, ChevronDown, Crown, Lock, Maximize2, Minimize2, X, Volume2, VolumeX,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAppStore } from '@/store/useAppStore';
import { gamesApi } from '@/lib/api/client';
import { GameGate } from '@/components/GameGate';
import { isMuted, toggleMuted, primeAudio, playSpin, playWin, playLose } from '@/lib/sound';

// Европейское колесо (один зеро). Порядок карманов по часовой стрелке.
const WHEEL = [
  0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23,
  10, 5, 24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26,
];
const RED = new Set([1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36]);
const SEG = 360 / WHEEL.length;
const START_BALANCE = 100;
const CHIPS = [1, 5, 10, 25];

type Color = 'red' | 'black' | 'green';
const colorOf = (n: number): Color => (n === 0 ? 'green' : RED.has(n) ? 'red' : 'black');

// Таблица для верстки числового поля (как на реальном столе)
const ROWS: number[][] = [
  [3, 6, 9, 12, 15, 18, 21, 24, 27, 30, 33, 36], // верх — колонка 3 (n%3===0)
  [2, 5, 8, 11, 14, 17, 20, 23, 26, 29, 32, 35], // середина — колонка 2 (n%3===2)
  [1, 4, 7, 10, 13, 16, 19, 22, 25, 28, 31, 34], // низ — колонка 1 (n%3===1)
];

interface BetDef { label: string; payout: number; covers: (n: number) => boolean }

/** Разбирает id ставки в описание (множитель выплаты + предикат выигрыша). */
function describeBet(id: string): BetDef {
  if (id.startsWith('straight:')) {
    const n = parseInt(id.slice(9), 10);
    return { label: `Число ${n}`, payout: 35, covers: (x) => x === n };
  }
  switch (id) {
    case 'red': return { label: 'Красное', payout: 1, covers: (x) => RED.has(x) };
    case 'black': return { label: 'Чёрное', payout: 1, covers: (x) => x !== 0 && !RED.has(x) };
    case 'even': return { label: 'Чётное', payout: 1, covers: (x) => x !== 0 && x % 2 === 0 };
    case 'odd': return { label: 'Нечётное', payout: 1, covers: (x) => x % 2 === 1 };
    case 'low': return { label: '1–18', payout: 1, covers: (x) => x >= 1 && x <= 18 };
    case 'high': return { label: '19–36', payout: 1, covers: (x) => x >= 19 && x <= 36 };
    case 'dozen:1': return { label: '1-я дюжина (1–12)', payout: 2, covers: (x) => x >= 1 && x <= 12 };
    case 'dozen:2': return { label: '2-я дюжина (13–24)', payout: 2, covers: (x) => x >= 13 && x <= 24 };
    case 'dozen:3': return { label: '3-я дюжина (25–36)', payout: 2, covers: (x) => x >= 25 && x <= 36 };
    case 'column:1': return { label: 'Колонка 1', payout: 2, covers: (x) => x !== 0 && x % 3 === 1 };
    case 'column:2': return { label: 'Колонка 2', payout: 2, covers: (x) => x !== 0 && x % 3 === 2 };
    case 'column:3': return { label: 'Колонка 3', payout: 2, covers: (x) => x !== 0 && x % 3 === 0 };
    default: return { label: id, payout: 0, covers: () => false };
  }
}

const ODDS_TABLE = [
  { name: 'Прямая ставка (1 число)', cover: '1 из 37', payout: '35 : 1', chance: '2.70%' },
  { name: 'Дюжина (12 чисел)', cover: '12 из 37', payout: '2 : 1', chance: '32.43%' },
  { name: 'Колонка (12 чисел)', cover: '12 из 37', payout: '2 : 1', chance: '32.43%' },
  { name: 'Красное / Чёрное', cover: '18 из 37', payout: '1 : 1', chance: '48.65%' },
  { name: 'Чёт / Нечёт', cover: '18 из 37', payout: '1 : 1', chance: '48.65%' },
  { name: '1–18 / 19–36', cover: '18 из 37', payout: '1 : 1', chance: '48.65%' },
];

// Человекочитаемое время следующего доступного сброса.
function formatResetTime(iso: string | null): string {
  if (!iso) return 'завтра';
  return new Date(iso).toLocaleString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

const cellColorCls = (n: number) =>
  n === 0 ? 'bg-emerald-600 hover:bg-emerald-500'
    : RED.has(n) ? 'bg-red-600 hover:bg-red-500'
      : 'bg-zinc-800 hover:bg-zinc-700';

/** Клетка-ставка: кнопка + значок поставленной суммы. Объявлена в модуле (не в render). */
function BetCell({
  id, className, children, title, amount, disabled, onPlace,
}: {
  id: string;
  className?: string;
  children: ReactNode;
  title?: string;
  amount?: number;
  disabled?: boolean;
  onPlace: (id: string) => void;
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={() => onPlace(id)}
      disabled={disabled}
      className={`relative flex items-center justify-center select-none transition-colors disabled:opacity-70 ${className ?? ''}`}
    >
      {children}
      {amount ? (
        <span className="absolute -top-1.5 -right-1.5 min-w-5 h-5 px-1 rounded-full bg-amber-400 text-amber-950 text-[10px] font-bold flex items-center justify-center ring-2 ring-background shadow">
          {amount}
        </span>
      ) : null}
    </button>
  );
}

function RouletteGame() {
  const [balance, setBalance] = useState(START_BALANCE);
  const [chip, setChip] = useState(CHIPS[1]);
  const [muted, setMuted] = useState(isMuted());
  const [bets, setBets] = useState<Record<string, number>>({});
  // история постановок (id ставки + точный номинал фишки) для кнопки «Отменить»
  const [stack, setStack] = useState<Array<{ id: string; amount: number }>>([]);
  const [spinning, setSpinning] = useState(false);
  const [angle, setAngle] = useState(0);
  const [result, setResult] = useState<number | null>(null);
  const [history, setHistory] = useState<number[]>([]);
  const [flash, setFlash] = useState<{ text: string; positive: boolean } | null>(null);

  const { token } = useAppStore();
  const [showHelp, setShowHelp] = useState(false);
  const [zoom, setZoom] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [resetInfo, setResetInfo] = useState<{ remaining: number | null; isPremium: boolean; nextResetAt: string | null } | null>(null);
  const [loaded, setLoaded] = useState(false);
  const lastSavedRef = useRef<number | null>(null);

  // В увеличенном режиме крутим медленнее — удобнее наблюдать за остановкой стрелки.
  const spinSec = zoom ? 6.8 : 4.2;

  // Загружаем сохранённый баланс (постоянный, между сессиями) + статус сброса.
  const loadBalance = useCallback(async () => {
    if (!token) { setResetInfo(null); setLoaded(true); return; }
    const r = await gamesApi.getBalance('roulette', token);
    if (r.data) {
      setBalance(r.data.balance);
      lastSavedRef.current = r.data.balance;
      setResetInfo({ remaining: r.data.reset.remaining, isPremium: r.data.reset.isPremium, nextResetAt: r.data.reset.nextResetAt });
    }
    setLoaded(true);
  }, [token]);
  useEffect(() => { void loadBalance(); }, [loadBalance]);

  const totalBet = useMemo(() => Object.values(bets).reduce((a, b) => a + b, 0), [bets]);

  // Сохраняем баланс на сервере в «чистом» состоянии (нет ставок и не крутится),
  // чтобы он пережил перезагрузку и новые сессии.
  useEffect(() => {
    if (!loaded || !token || spinning || totalBet !== 0) return;
    if (lastSavedRef.current === balance) return;
    lastSavedRef.current = balance;
    void gamesApi.saveBalance('roulette', balance, token);
  }, [balance, spinning, totalBet, loaded, token]);

  const wheelGradient = useMemo(() => {
    const stops = WHEEL.map((n, i) => {
      const c = colorOf(n) === 'green' ? '#059669' : colorOf(n) === 'red' ? '#dc2626' : '#27272a';
      return `${c} ${(i * SEG).toFixed(3)}deg ${((i + 1) * SEG).toFixed(3)}deg`;
    });
    return `conic-gradient(from 0deg, ${stops.join(', ')})`;
  }, []);

  const placeChip = (id: string) => {
    if (spinning) return;
    const amount = Math.max(1, Math.min(chip, balance)); // защита от некорректных значений
    if (balance < 1 || chip < 1) { setFlash({ text: 'Недостаточно монет для ставки', positive: false }); return; }
    if (chip > balance) { setFlash({ text: 'Недостаточно монет для ставки', positive: false }); return; }
    setBalance((b) => b - amount);
    setBets((prev) => ({ ...prev, [id]: (prev[id] ?? 0) + amount }));
    setStack((s) => [...s, { id, amount }]);
    setFlash(null);
  };

  // Ставка процентом от всех накоплений / All-in (pct=1) — задаёт номинал фишки
  const setChipPercent = (pct: number) => {
    if (spinning) return;
    if (balance < 1) { setFlash({ text: 'Недостаточно монет', positive: false }); return; }
    const amt = pct >= 1 ? balance : Math.max(1, Math.floor(balance * pct));
    setChip(Math.max(1, Math.min(balance, amt)));
  };

  const undo = () => {
    if (spinning || stack.length === 0) return;
    const last = stack[stack.length - 1];
    setStack((s) => s.slice(0, -1));
    setBets((prev) => {
      const cur = prev[last.id] ?? 0;
      const nextVal = cur - last.amount;
      const next = { ...prev };
      if (nextVal <= 0) delete next[last.id]; else next[last.id] = nextVal;
      return next;
    });
    setBalance((b) => b + last.amount);
  };

  const clearBets = () => {
    if (spinning) return;
    setBalance((b) => b + totalBet);
    setBets({});
    setStack([]);
  };

  // Сброс баланса: только при нулевом балансе; дневной лимит проверяется на backend
  // (не-Premium — 1 раз в день, Premium — без ограничений).
  const resetBalance = async () => {
    if (spinning || resetting) return;
    if (balance > 0) { setFlash({ text: 'Сброс доступен только при нулевом балансе', positive: false }); return; }
    if (!token) { setFlash({ text: 'Войдите в аккаунт, чтобы сбросить баланс', positive: false }); return; }
    setResetting(true);
    const res = await gamesApi.reset('roulette', token);
    setResetting(false);
    if (res.data?.allowed) {
      const nb = res.data.balance ?? START_BALANCE;
      setBalance(nb);
      lastSavedRef.current = nb; // сервер уже сохранил баланс при сбросе
      setBets({});
      setStack([]);
      setResetInfo({ remaining: res.data.remaining, isPremium: res.data.isPremium, nextResetAt: res.data.nextResetAt });
      setFlash({ text: 'Баланс пополнен до 100 монет 🎉', positive: true });
    } else {
      setFlash({ text: res.error || 'Сброс на сегодня недоступен', positive: false });
      void loadBalance();
    }
  };

  const handleToggleMute = () => {
    const m = toggleMuted();
    setMuted(m);
    if (!m) primeAudio(); // включили звук — сразу «будим» аудиоконтекст
  };

  const settle = (number: number) => {
    let payout = 0;
    for (const [id, amt] of Object.entries(bets)) {
      const def = describeBet(id);
      if (def.covers(number)) payout += amt * (def.payout + 1); // возврат ставки + выигрыш
    }
    setBalance((b) => b + payout);
    const net = payout - totalBet;
    if (payout > 0) playWin(); else playLose();
    setHistory((h) => [number, ...h].slice(0, 18));
    setResult(number);
    setBets({});
    setStack([]);
    setSpinning(false);
    setFlash(
      payout > 0
        ? { text: `Выпало ${number} (${colorOf(number) === 'green' ? 'зеро' : colorOf(number) === 'red' ? 'красное' : 'чёрное'}). Выигрыш +${payout} монет${net > 0 ? ` (чистыми +${net})` : ''}`, positive: true }
        : { text: `Выпало ${number} (${colorOf(number) === 'green' ? 'зеро' : colorOf(number) === 'red' ? 'красное' : 'чёрное'}). Увы, ставка не сыграла (−${totalBet})`, positive: false },
    );
  };

  const spin = () => {
    if (spinning || totalBet === 0) {
      if (totalBet === 0) setFlash({ text: 'Сначала сделайте ставку', positive: false });
      return;
    }
    setSpinning(true);
    setResult(null);
    setFlash(null);
    // Звук вращения (замедляющиеся тики). primeAudio() «будит» аудио по жесту.
    primeAudio();
    playSpin(spinSec);

    const number = WHEEL[Math.floor(Math.random() * WHEEL.length)];
    const idx = WHEEL.indexOf(number);
    // Доводим ЦЕНТР выигрышного кармана под указатель сверху (0°), чтобы цвет совпал
    const targetResidue = ((-(idx * SEG + SEG / 2)) % 360 + 360) % 360;
    const fullSpins = 6;
    const delta = fullSpins * 360 + ((targetResidue - (angle % 360)) + 360) % 360;
    setAngle((a) => a + delta);

    // Длительность совпадает с CSS-переходом (spinSec); +0.2с буфер на отрисовку
    window.setTimeout(() => settle(number), spinSec * 1000 + 200);
  };

  // Удобный шорткат, чтобы не повторять общие пропсы на каждой клетке
  const cell = (id: string, className: string, children: ReactNode, title?: string) => (
    <BetCell id={id} className={className} title={title} amount={bets[id]} disabled={spinning} onPlace={placeChip}>
      {children}
    </BetCell>
  );

  // Колесо как переиспользуемый рендер: size — диаметр в px, showNumbers — рисовать
  // цифры по ободу (вращаются вместе с диском, выигрышное число встаёт ровно под
  // указатель). Используется и в обычном виде, и в увеличенном оверлее.
  const renderWheel = (size: number, showNumbers: boolean) => {
    const hub = Math.round(size * 0.34);
    const numR = size * 0.40; // радиус, на котором стоят цифры
    const numFs = Math.max(9, Math.round(size * 0.044));
    const label = result == null || spinning ? 'спин' : colorOf(result) === 'green' ? 'зеро' : colorOf(result) === 'red' ? 'красное' : 'чёрное';
    return (
      <div className="relative" style={{ width: size, height: size }}>
        <div className={`absolute -inset-2 rounded-full bg-gradient-to-br from-amber-300/30 to-primary/20 blur-xl transition-opacity duration-500 ${spinning ? 'opacity-90' : 'opacity-50'}`} />
        {/* Указатель сверху */}
        <div className="absolute left-1/2 -translate-x-1/2 -top-1.5 z-20 drop-shadow"
          style={{ width: 0, height: 0, borderLeft: '11px solid transparent', borderRight: '11px solid transparent', borderTop: '18px solid #f59e0b' }} />
        {/* Вращающийся диск + цифры */}
        <div
          className="absolute inset-0 rounded-full border-[6px] border-amber-400/80 shadow-[0_10px_30px_rgb(0,0,0,0.18)]"
          style={{ background: wheelGradient, transform: `rotate(${angle}deg)`, transition: spinning ? `transform ${spinSec}s cubic-bezier(0.16, 0.84, 0.16, 1)` : 'none' }}
        >
          {showNumbers && WHEEL.map((n, i) => {
            const a = i * SEG + SEG / 2;
            return (
              <span
                key={i}
                className="absolute left-1/2 top-1/2 font-bold text-white leading-none"
                style={{ fontSize: numFs, transform: `translate(-50%, -50%) rotate(${a}deg) translateY(-${numR}px)`, textShadow: '0 1px 2px rgba(0,0,0,.6)' }}
              >
                {n}
              </span>
            );
          })}
        </div>
        {/* Глянцевый блик */}
        <div className="absolute inset-0 rounded-full bg-gradient-to-b from-white/20 via-transparent to-black/10 pointer-events-none" />
        {/* Втулка с результатом */}
        <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
          <div className="rounded-full bg-card border-4 border-amber-400/70 flex flex-col items-center justify-center shadow-lg ring-1 ring-border" style={{ width: hub, height: hub }}>
            <AnimatePresence mode="wait">
              <motion.span
                key={result ?? 'idle'}
                initial={{ scale: 0.6, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ opacity: 0 }}
                className={`font-extrabold ${result == null ? 'text-muted-foreground' : colorOf(result) === 'red' ? 'text-red-500' : colorOf(result) === 'green' ? 'text-emerald-500' : 'text-foreground'}`}
                style={{ fontSize: Math.round(hub * 0.36) }}
              >
                {spinning ? '…' : result ?? '—'}
              </motion.span>
            </AnimatePresence>
            <span className="uppercase tracking-wide text-muted-foreground" style={{ fontSize: Math.max(9, Math.round(hub * 0.12)) }}>{label}</span>
          </div>
        </div>
      </div>
    );
  };

  // Размер увеличенного колеса — крупно, но влезает в любой экран.
  const zoomSize = Math.min(380, Math.max(240, (typeof window !== 'undefined' ? window.innerWidth : 360) - 120));

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-primary/5 via-background to-background">
      {/* Мягкое фоновое свечение в стиле главной страницы */}
      <div className="pointer-events-none absolute -top-24 -right-24 w-[28rem] h-[28rem] rounded-full bg-primary/10 blur-3xl opacity-60" />
      <div className="pointer-events-none absolute top-1/3 -left-24 w-80 h-80 rounded-full bg-amber-400/10 blur-3xl opacity-50" />

      {/* Увеличенное колесо (оверлей для наблюдения) */}
      <AnimatePresence>
        {zoom && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[90] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
            onClick={() => { if (!spinning) setZoom(false); }}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 260, damping: 24 }}
              className="relative bg-card border border-border rounded-2xl shadow-2xl p-6 sm:p-8 flex flex-col items-center max-w-[94vw]"
              onClick={(e) => e.stopPropagation()}
            >
              <button onClick={() => setZoom(false)} disabled={spinning} className="absolute top-3 right-3 p-2 rounded-lg hover:bg-muted disabled:opacity-50" title="Закрыть">
                <X className="w-5 h-5" />
              </button>
              <h3 className="text-lg font-bold mb-0.5">Колесо крупным планом</h3>
              <p className="text-sm text-muted-foreground mb-5">Медленное вращение — следите, где остановится стрелка</p>
              {renderWheel(zoomSize, true)}
              <div className="mt-7 flex items-center gap-3">
                <Button onClick={spin} disabled={spinning || totalBet === 0} size="lg" className="gap-2">
                  <Play className="w-5 h-5" />{spinning ? 'Крутится…' : 'Крутить'}
                </Button>
                <Button onClick={() => setZoom(false)} variant="outline" size="lg" disabled={spinning} className="gap-2">
                  <Minimize2 className="w-4 h-4" />Обычный вид
                </Button>
              </div>
              {totalBet === 0 && <p className="text-xs text-muted-foreground mt-3">Сделайте ставку на поле, чтобы крутить</p>}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="relative container py-8 sm:py-10 max-w-6xl">
        {/* Назад + заголовок */}
        <motion.div
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
          className="flex items-center gap-3 mb-6"
        >
          <Button asChild variant="ghost" size="icon" title="На главную">
            <Link to="/"><ArrowLeft className="w-5 h-5" /></Link>
          </Button>
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-md shrink-0">
            <Dices className="w-6 h-6 text-white" />
          </div>
          <div className="min-w-0">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight leading-tight">Европейская рулетка</h1>
            <p className="text-sm text-muted-foreground">Секретная мини-игра CT-Platform</p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={handleToggleMute}
              title={muted ? 'Включить звук' : 'Выключить звук'}
              aria-label={muted ? 'Включить звук' : 'Выключить звук'}
            >
              {muted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
            </Button>
            <span className="hidden sm:inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium">
              <Sparkles className="w-4 h-4" />Демо · виртуальные монеты
            </span>
          </div>
        </motion.div>

        {/* Дисклеймер */}
        <motion.div
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.05 }}
          className="mb-6 rounded-2xl border border-amber-300/50 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-950/20 px-4 py-3.5 flex gap-3 items-start"
        >
          <div className="w-8 h-8 rounded-lg bg-amber-400/20 flex items-center justify-center shrink-0">
            <Info className="w-4 h-4 text-amber-600 dark:text-amber-400" />
          </div>
          <p className="text-sm text-amber-800 dark:text-amber-200/90 leading-relaxed">
            <strong>Это демонстрация на виртуальные монеты.</strong> Без реальных ставок, без настоящих денег
            и без какой-либо валюты или платёжной системы. Баланс — условные «золотые монеты»,
            он сохраняется между сессиями. Игра создана только для развлечения.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-[360px_1fr] gap-6">
          {/* Левая колонка: колесо + баланс + управление */}
          <div className="space-y-4">
            <Card>
              <CardContent className="p-5 flex flex-col items-center">
                {/* Колесо (обычный вид) */}
                {renderWheel(248, false)}

                {/* Кнопка увеличения колеса */}
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-4 gap-1.5"
                  onClick={() => setZoom(true)}
                  disabled={spinning}
                  title="Увеличить колесо для наблюдения"
                >
                  <Maximize2 className="w-4 h-4" />Увеличить колесо
                </Button>

                {/* Баланс + ставки */}
                <div className="mt-5 w-full grid grid-cols-2 gap-2">
                  <div className="rounded-xl bg-amber-400/10 border border-amber-300/40 dark:border-amber-500/30 px-3 py-2.5">
                    <span className="flex items-center gap-1.5 text-xs text-muted-foreground mb-0.5"><Wallet className="w-3.5 h-3.5 text-amber-500" />Баланс</span>
                    <span className="text-2xl font-bold tabular-nums text-amber-600 dark:text-amber-400">{balance}</span>
                  </div>
                  <div className="rounded-xl bg-muted/60 px-3 py-2.5">
                    <span className="flex items-center gap-1.5 text-xs text-muted-foreground mb-0.5"><Coins className="w-3.5 h-3.5" />В ставках</span>
                    <span className="text-2xl font-bold tabular-nums">{totalBet}</span>
                  </div>
                </div>

                {/* Фишки + ставка процентом */}
                <div className="mt-4 w-full space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-muted-foreground">Номинал фишки</p>
                    <p className="text-xs font-semibold tabular-nums">текущая: {chip}</p>
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    {CHIPS.map((c) => (
                      <button
                        key={c}
                        onClick={() => setChip(c)}
                        disabled={spinning}
                        className={`h-11 rounded-full font-bold text-sm transition-all disabled:opacity-60 ${chip === c
                          ? 'bg-gradient-to-br from-amber-400 to-amber-500 text-amber-950 ring-2 ring-amber-500 ring-offset-2 ring-offset-card scale-105 shadow-md'
                          : 'bg-muted hover:bg-muted/70 text-foreground border border-border'}`}
                      >
                        {c}
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground pt-1">Процент от баланса</p>
                  <div className="grid grid-cols-4 gap-2">
                    {[0.1, 0.25, 0.5].map((p) => (
                      <button key={p} onClick={() => setChipPercent(p)} disabled={spinning || balance < 1}
                        className="h-10 rounded-lg text-sm font-semibold bg-muted hover:bg-muted/70 border border-border disabled:opacity-60">
                        {Math.round(p * 100)}%
                      </button>
                    ))}
                    <button onClick={() => setChipPercent(1)} disabled={spinning || balance < 1}
                      className="h-10 rounded-lg text-sm font-bold bg-gradient-to-br from-rose-500 to-red-600 text-white hover:opacity-90 disabled:opacity-60">
                      All-in
                    </button>
                  </div>
                </div>

                {/* Кнопки управления */}
                <div className="mt-4 w-full space-y-2">
                  <Button onClick={spin} disabled={spinning || totalBet === 0} size="lg" className="w-full h-12 text-base gap-2">
                    <Play className="w-5 h-5" />{spinning ? 'Колесо крутится…' : 'Крутить колесо'}
                  </Button>
                  <div className="grid grid-cols-2 gap-2">
                    <Button onClick={undo} variant="outline" disabled={spinning || stack.length === 0} className="gap-1.5"><Undo2 className="w-4 h-4" />Отменить</Button>
                    <Button onClick={clearBets} variant="outline" disabled={spinning || totalBet === 0} className="gap-1.5"><Eraser className="w-4 h-4" />Очистить</Button>
                  </div>
                  {/* Сброс баланса — только при нуле, дневной лимит на backend */}
                  <Button
                    onClick={resetBalance}
                    variant="outline"
                    disabled={spinning || resetting || balance > 0}
                    className="w-full gap-1.5"
                    title={balance > 0 ? 'Доступно только при нулевом балансе' : undefined}
                  >
                    {balance > 0 ? <Lock className="w-4 h-4" /> : <RotateCcw className="w-4 h-4" />}
                    {resetting ? 'Сброс…' : `Сбросить баланс до ${START_BALANCE}`}
                  </Button>
                  <p className="text-[11px] text-center text-muted-foreground flex items-center justify-center gap-1">
                    {resetInfo?.isPremium && <Crown className="w-3 h-3 text-amber-500" />}
                    {!token
                      ? 'Войдите, чтобы сохранять баланс между сессиями.'
                      : resetInfo?.isPremium
                        ? 'Premium: безлимитный сброс (при нулевом балансе).'
                        : resetInfo && resetInfo.remaining === 0
                          ? `Лимит сброса на сегодня исчерпан. Следующий — ${formatResetTime(resetInfo.nextResetAt)}.`
                          : `Сброс при нуле: осталось ${resetInfo ? resetInfo.remaining : '…'} сегодня · Free 1/день.`}
                  </p>
                </div>

                {/* Флеш-сообщение */}
                <AnimatePresence>
                  {flash && (
                    <motion.div
                      initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                      className={`mt-4 w-full text-center text-sm rounded-lg px-3 py-2 ${flash.positive ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400' : 'bg-red-500/15 text-red-600 dark:text-red-400'}`}
                    >
                      {flash.text}
                    </motion.div>
                  )}
                </AnimatePresence>
              </CardContent>
            </Card>

            {/* История */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <History className="w-4 h-4 text-primary" />История спинов
                  {history.length > 0 && <span className="ml-auto text-xs font-normal text-muted-foreground">последние {history.length}</span>}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {history.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Пока пусто — сделайте первый спин.</p>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {history.map((n, i) => (
                      <span key={i} className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shadow-sm ${colorOf(n) === 'green' ? 'bg-emerald-600' : colorOf(n) === 'red' ? 'bg-red-600' : 'bg-zinc-800'}`}>
                        {n}
                      </span>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Правая колонка: игровое поле + правила/шансы */}
          <div className="space-y-6">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2 flex-wrap">
                  <Coins className="w-4 h-4 text-amber-500" />Игровое поле
                  <span className="ml-auto inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium">
                    Фишка {chip} · кликните по ставке
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                <div className="min-w-[560px] rounded-2xl bg-emerald-600/[0.06] ring-1 ring-emerald-600/15 p-3">
                  {/* Числовое поле: 0 + 12 колонок + колонка 2:1 */}
                  <div className="grid grid-cols-[2.5rem_repeat(12,minmax(0,1fr))_2.75rem] grid-rows-3 gap-1">
                    {cell('straight:0', `row-span-3 rounded-lg text-white font-bold ${cellColorCls(0)}`, '0', 'Зеро — выплата 35:1')}
                    {ROWS.map((row, ri) => {
                      const columnId = `column:${ri === 0 ? 3 : ri === 1 ? 2 : 1}`;
                      return (
                        <Fragment key={ri}>
                          {row.map((n) => (
                            <Fragment key={n}>
                              {cell(`straight:${n}`, `h-10 rounded-md text-white text-sm font-semibold ${cellColorCls(n)}`, n, `Число ${n} — выплата 35:1`)}
                            </Fragment>
                          ))}
                          {cell(columnId, 'h-10 rounded-md bg-muted hover:bg-muted/70 text-xs font-semibold', '2:1', 'Колонка — выплата 2:1')}
                        </Fragment>
                      );
                    })}
                  </div>

                  {/* Дюжины */}
                  <div className="grid grid-cols-3 gap-1 mt-1">
                    {cell('dozen:1', 'h-10 rounded-lg bg-muted hover:bg-muted/70 text-sm font-semibold', '1-я дюжина (1–12)', '1-я дюжина — выплата 2:1')}
                    {cell('dozen:2', 'h-10 rounded-lg bg-muted hover:bg-muted/70 text-sm font-semibold', '2-я дюжина (13–24)', '2-я дюжина — выплата 2:1')}
                    {cell('dozen:3', 'h-10 rounded-lg bg-muted hover:bg-muted/70 text-sm font-semibold', '3-я дюжина (25–36)', '3-я дюжина — выплата 2:1')}
                  </div>

                  {/* Чётные деньги */}
                  <div className="grid grid-cols-6 gap-1 mt-1">
                    {cell('low', 'h-10 rounded-lg bg-muted hover:bg-muted/70 text-sm font-semibold', '1–18', 'Малые 1–18 — выплата 1:1')}
                    {cell('even', 'h-10 rounded-lg bg-muted hover:bg-muted/70 text-sm font-semibold', 'Чёт', 'Чётное — выплата 1:1')}
                    {cell('red', 'h-10 rounded-lg bg-red-600 hover:bg-red-500 text-white text-sm font-semibold', 'Красное', 'Красное — выплата 1:1')}
                    {cell('black', 'h-10 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-white text-sm font-semibold', 'Чёрное', 'Чёрное — выплата 1:1')}
                    {cell('odd', 'h-10 rounded-lg bg-muted hover:bg-muted/70 text-sm font-semibold', 'Нечёт', 'Нечётное — выплата 1:1')}
                    {cell('high', 'h-10 rounded-lg bg-muted hover:bg-muted/70 text-sm font-semibold', '19–36', 'Большие 19–36 — выплата 1:1')}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Скрываемые правила/шансы/теория — чтобы не загораживать поле во время игры */}
            <div>
              <button
                onClick={() => setShowHelp((v) => !v)}
                className="w-full flex items-center justify-between gap-2 px-4 py-3 rounded-xl border border-border bg-card hover:bg-muted/50 transition-colors"
              >
                <span className="flex items-center gap-2 font-semibold text-sm"><BookOpen className="w-4 h-4 text-primary" />Правила, шансы и теория</span>
                <ChevronDown className={`w-5 h-5 text-muted-foreground transition-transform ${showHelp ? 'rotate-180' : ''}`} />
              </button>
              <AnimatePresence initial={false}>
                {showHelp && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25 }} className="overflow-hidden"
                  >
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
              {/* Шансы */}
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Percent className="w-4 h-4 text-primary" />Вероятности и выплаты</CardTitle></CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-xs uppercase tracking-wide text-muted-foreground border-b border-border">
                          <th className="text-left py-1.5 pr-2">Ставка</th>
                          <th className="text-left py-1.5 px-2">Выплата</th>
                          <th className="text-right py-1.5 pl-2">Шанс</th>
                        </tr>
                      </thead>
                      <tbody>
                        {ODDS_TABLE.map((r) => (
                          <tr key={r.name} className="border-b border-border/50">
                            <td className="py-1.5 pr-2">{r.name}</td>
                            <td className="py-1.5 px-2 font-semibold">{r.payout}</td>
                            <td className="py-1.5 pl-2 text-right tabular-nums text-muted-foreground">{r.chance}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <p className="text-xs text-muted-foreground mt-3">
                    Один зеро (0) даёт преимущество казино ≈ 2.70%. Шанс = число выигрышных карманов ÷ 37.
                  </p>
                </CardContent>
              </Card>

              {/* Правила */}
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><BookOpen className="w-4 h-4 text-primary" />Правила и подсказки</CardTitle></CardHeader>
                <CardContent className="text-sm space-y-2 text-muted-foreground">
                  <p>1. Выберите номинал фишки, затем кликайте по полям, чтобы поставить. Каждый клик добавляет одну фишку.</p>
                  <p>2. Можно ставить на число (35:1), цвет, чёт/нечёт, диапазон 1–18 / 19–36 (1:1), дюжину или колонку (2:1).</p>
                  <p>3. Нажмите «Крутить». Когда колесо остановится, выплаты начислятся автоматически.</p>
                  <p>4. «Отменить» убирает последнюю фишку, «Сбросить ставки» возвращает все фишки на баланс.</p>
                  <p className="text-foreground"><Sparkles className="w-3.5 h-3.5 inline mr-1 text-amber-500" />Совет: ставки 1:1 выигрывают почти в половине случаев — хороши для долгой игры; ставки на число редки, но платят больше всего.</p>
                </CardContent>
              </Card>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Доступ к игре ограничен: гость → регистрация; Free → после 5 заданий; Premium → всегда.
export function RoulettePage() {
  return (
    <GameGate game="Европейская рулетка">
      <RouletteGame />
    </GameGate>
  );
}

export default RoulettePage;
