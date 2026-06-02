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
import { Fragment, useMemo, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Coins, RotateCcw, Play, Eraser, Undo2, Info, BookOpen, Percent, ArrowLeft, Sparkles,
  Dices, History, Wallet,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

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

export function RoulettePage() {
  const [balance, setBalance] = useState(START_BALANCE);
  const [chip, setChip] = useState(CHIPS[1]);
  const [bets, setBets] = useState<Record<string, number>>({});
  // история постановок (id ставки + точный номинал фишки) для кнопки «Отменить»
  const [stack, setStack] = useState<Array<{ id: string; amount: number }>>([]);
  const [spinning, setSpinning] = useState(false);
  const [angle, setAngle] = useState(0);
  const [result, setResult] = useState<number | null>(null);
  const [history, setHistory] = useState<number[]>([]);
  const [flash, setFlash] = useState<{ text: string; positive: boolean } | null>(null);

  const totalBet = useMemo(() => Object.values(bets).reduce((a, b) => a + b, 0), [bets]);

  const wheelGradient = useMemo(() => {
    const stops = WHEEL.map((n, i) => {
      const c = colorOf(n) === 'green' ? '#059669' : colorOf(n) === 'red' ? '#dc2626' : '#27272a';
      return `${c} ${(i * SEG).toFixed(3)}deg ${((i + 1) * SEG).toFixed(3)}deg`;
    });
    return `conic-gradient(from 0deg, ${stops.join(', ')})`;
  }, []);

  const placeChip = (id: string) => {
    if (spinning) return;
    if (chip > balance) { setFlash({ text: 'Недостаточно монет для ставки', positive: false }); return; }
    setBalance((b) => b - chip);
    setBets((prev) => ({ ...prev, [id]: (prev[id] ?? 0) + chip }));
    setStack((s) => [...s, { id, amount: chip }]);
    setFlash(null);
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

  const resetBalance = () => {
    if (spinning) return;
    setBalance(START_BALANCE);
    setBets({});
    setStack([]);
    setFlash({ text: 'Баланс сброшен до 100 монет', positive: true });
  };

  const settle = (number: number) => {
    let payout = 0;
    for (const [id, amt] of Object.entries(bets)) {
      const def = describeBet(id);
      if (def.covers(number)) payout += amt * (def.payout + 1); // возврат ставки + выигрыш
    }
    setBalance((b) => b + payout);
    const net = payout - totalBet;
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

    const number = WHEEL[Math.floor(Math.random() * WHEEL.length)];
    const idx = WHEEL.indexOf(number);
    // Доводим ЦЕНТР выигрышного кармана под указатель сверху (0°), чтобы цвет совпал
    const targetResidue = ((-(idx * SEG + SEG / 2)) % 360 + 360) % 360;
    const fullSpins = 6;
    const delta = fullSpins * 360 + ((targetResidue - (angle % 360)) + 360) % 360;
    setAngle((a) => a + delta);

    // Длительность совпадает с CSS-переходом ниже (4.2s)
    window.setTimeout(() => settle(number), 4300);
  };

  // Удобный шорткат, чтобы не повторять общие пропсы на каждой клетке
  const cell = (id: string, className: string, children: ReactNode, title?: string) => (
    <BetCell id={id} className={className} title={title} amount={bets[id]} disabled={spinning} onPlace={placeChip}>
      {children}
    </BetCell>
  );

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-primary/5 via-background to-background">
      {/* Мягкое фоновое свечение в стиле главной страницы */}
      <div className="pointer-events-none absolute -top-24 -right-24 w-[28rem] h-[28rem] rounded-full bg-primary/10 blur-3xl opacity-60" />
      <div className="pointer-events-none absolute top-1/3 -left-24 w-80 h-80 rounded-full bg-amber-400/10 blur-3xl opacity-50" />

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
          <span className="ml-auto hidden sm:inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium">
            <Sparkles className="w-4 h-4" />Демо · виртуальные монеты
          </span>
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
            и без какой-либо валюты или платёжной системы. Баланс — условные «золотые монеты», которые
            при обновлении страницы снова станут равны {START_BALANCE}. Игра создана только для развлечения.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-[360px_1fr] gap-6">
          {/* Левая колонка: колесо + баланс + управление */}
          <div className="space-y-4">
            <Card>
              <CardContent className="p-5 flex flex-col items-center">
                {/* Колесо */}
                <div className="relative w-60 h-60 sm:w-64 sm:h-64">
                  {/* Свечение под колесом */}
                  <div className={`absolute -inset-2 rounded-full bg-gradient-to-br from-amber-300/30 to-primary/20 blur-xl transition-opacity duration-500 ${spinning ? 'opacity-90' : 'opacity-50'}`} />
                  {/* Указатель сверху */}
                  <div className="absolute left-1/2 -translate-x-1/2 -top-1.5 z-20 drop-shadow"
                    style={{ width: 0, height: 0, borderLeft: '11px solid transparent', borderRight: '11px solid transparent', borderTop: '18px solid #f59e0b' }} />
                  {/* Вращающийся диск */}
                  <div
                    className="absolute inset-0 rounded-full border-[6px] border-amber-400/80 shadow-[0_10px_30px_rgb(0,0,0,0.18)]"
                    style={{ background: wheelGradient, transform: `rotate(${angle}deg)`, transition: spinning ? 'transform 4.2s cubic-bezier(0.16, 0.84, 0.16, 1)' : 'none' }}
                  />
                  {/* Глянцевый блик (не вращается) */}
                  <div className="absolute inset-0 rounded-full bg-gradient-to-b from-white/20 via-transparent to-black/10 pointer-events-none" />
                  {/* Втулка с результатом (не вращается) */}
                  <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
                    <div className="w-24 h-24 rounded-full bg-card border-4 border-amber-400/70 flex flex-col items-center justify-center shadow-lg ring-1 ring-border">
                      <AnimatePresence mode="wait">
                        <motion.span
                          key={result ?? 'idle'}
                          initial={{ scale: 0.6, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className={`text-3xl font-extrabold ${result == null ? 'text-muted-foreground' : colorOf(result) === 'red' ? 'text-red-500' : colorOf(result) === 'green' ? 'text-emerald-500' : 'text-foreground'}`}
                        >
                          {spinning ? '…' : result ?? '—'}
                        </motion.span>
                      </AnimatePresence>
                      <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                        {result == null || spinning ? 'спин' : colorOf(result) === 'green' ? 'зеро' : colorOf(result) === 'red' ? 'красное' : 'чёрное'}
                      </span>
                    </div>
                  </div>
                </div>

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

                {/* Фишки */}
                <div className="mt-4 w-full">
                  <p className="text-xs text-muted-foreground mb-2">Номинал фишки</p>
                  <div className="grid grid-cols-4 gap-2">
                    {CHIPS.map((c) => (
                      <button
                        key={c}
                        onClick={() => setChip(c)}
                        disabled={spinning}
                        className={`h-12 rounded-full font-bold text-sm transition-all disabled:opacity-60 ${chip === c
                          ? 'bg-gradient-to-br from-amber-400 to-amber-500 text-amber-950 ring-2 ring-amber-500 ring-offset-2 ring-offset-card scale-105 shadow-md'
                          : 'bg-muted hover:bg-muted/70 text-foreground border border-border'}`}
                      >
                        {c}
                      </button>
                    ))}
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
                  <Button onClick={resetBalance} variant="ghost" disabled={spinning} className="w-full gap-1.5 text-muted-foreground"><RotateCcw className="w-4 h-4" />Сбросить баланс до {START_BALANCE}</Button>
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
          </div>
        </div>
      </div>
    </div>
  );
}

export default RoulettePage;
