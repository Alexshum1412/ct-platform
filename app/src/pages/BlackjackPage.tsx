/**
 * «Блэкджек» — секретная демо-мини-игра (ссылка в подвале после «Достижения»).
 *
 * ВАЖНО: только виртуальная валюта — БРИЛЛИАНТЫ 💎 (отдельная от рулетки).
 * Никаких реальных денег и платежей. Баланс сохраняется между сессиями
 * (GameBalance на сервере), рекорд (peak) формирует рейтинг «Зал славы».
 * Кнопка «Сбросить баланс» работает только при нулевом балансе; дневной лимит
 * сброса проверяется на backend (Free — 1/день, Premium — без ограничений).
 *
 * Полноценная логика: раздача, hit / stand / double, подсчёт очков (туз 1/11),
 * блэкджек 3:2, правила, таблица шансов и подсказки, история последних рук.
 */
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Gem, ArrowLeft, Sparkles, RotateCcw, Lock, Crown, ChevronDown, BookOpen, Percent,
  History, Play, Plus, Hand, ChevronsUp, Info, Wallet,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAppStore } from '@/store/useAppStore';
import { gamesApi } from '@/lib/api/client';
import { GameGate } from '@/components/GameGate';
import { GameLeaderboard } from '@/components/game/GameLeaderboard';

const START_BALANCE = 100;
const CHIPS = [1, 5, 10, 25];
const SUITS = ['♠', '♥', '♦', '♣'] as const;
const RANKS = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'] as const;

interface PlayingCard { rank: string; suit: string; value: number }
type Outcome = 'blackjack' | 'win' | 'push' | 'lose';
type Phase = 'betting' | 'player' | 'done';

function buildDeck(): PlayingCard[] {
  const deck: PlayingCard[] = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      const value = rank === 'A' ? 11 : ['J', 'Q', 'K'].includes(rank) ? 10 : parseInt(rank, 10);
      deck.push({ rank, suit, value });
    }
  }
  return deck;
}

function shuffle(deck: PlayingCard[]): PlayingCard[] {
  const d = [...deck];
  for (let i = d.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [d[i], d[j]] = [d[j], d[i]];
  }
  return d;
}

/** Сумма очков руки с автоматическим понижением тузов (11 → 1). */
function handScore(cards: PlayingCard[]): number {
  let total = 0;
  let aces = 0;
  for (const c of cards) {
    total += c.value;
    if (c.rank === 'A') aces++;
  }
  while (total > 21 && aces > 0) { total -= 10; aces--; }
  return total;
}

const isBlackjack = (cards: PlayingCard[]) => cards.length === 2 && handScore(cards) === 21;

const OUTCOME_LABEL: Record<Outcome, { text: string; cls: string }> = {
  blackjack: { text: 'Блэкджек! 3:2', cls: 'text-amber-500' },
  win: { text: 'Вы выиграли', cls: 'text-emerald-500' },
  push: { text: 'Ничья (возврат ставки)', cls: 'text-muted-foreground' },
  lose: { text: 'Вы проиграли', cls: 'text-red-500' },
};

// Приблизительные шансы (стандартный блэкджек, дилер стоит на 17)
const BUST_ON_HIT = [
  { total: '12', chance: '31%' }, { total: '13', chance: '39%' }, { total: '14', chance: '56%' },
  { total: '15', chance: '58%' }, { total: '16', chance: '62%' }, { total: '17', chance: '69%' },
];
const DEALER_BUST = [
  { up: '2', chance: '35%' }, { up: '3', chance: '37%' }, { up: '4', chance: '40%' },
  { up: '5', chance: '42%' }, { up: '6', chance: '42%' }, { up: '7', chance: '26%' },
  { up: '10', chance: '23%' }, { up: 'A', chance: '17%' },
];

/** Карта (рубашкой вниз или вверх). */
function CardView({ card, hidden, delay = 0 }: { card?: PlayingCard; hidden?: boolean; delay?: number }) {
  const red = card && (card.suit === '♥' || card.suit === '♦');
  return (
    <motion.div
      initial={{ opacity: 0, y: -14, rotateY: 90 }}
      animate={{ opacity: 1, y: 0, rotateY: 0 }}
      transition={{ duration: 0.3, delay }}
      className="shrink-0"
    >
      {hidden || !card ? (
        <div className="w-12 h-[4.5rem] sm:w-14 sm:h-20 rounded-lg bg-gradient-to-br from-indigo-500 to-indigo-700 border-2 border-white/40 shadow-md flex items-center justify-center">
          <div className="w-7 h-12 rounded border border-white/40" />
        </div>
      ) : (
        <div className={`w-12 h-[4.5rem] sm:w-14 sm:h-20 rounded-lg bg-white border border-zinc-300 shadow-md flex flex-col items-center justify-center ${red ? 'text-red-600' : 'text-zinc-900'}`}>
          <span className="text-lg font-bold leading-none">{card.rank}</span>
          <span className="text-xl leading-none">{card.suit}</span>
        </div>
      )}
    </motion.div>
  );
}

// Человекочитаемое время следующего доступного сброса.
function formatResetTime(iso: string | null): string {
  if (!iso) return 'завтра';
  return new Date(iso).toLocaleString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

function BlackjackGame() {
  const { token } = useAppStore();
  const [balance, setBalance] = useState(START_BALANCE);
  const [bet, setBet] = useState(CHIPS[1]);
  const [roundBet, setRoundBet] = useState(0);
  const [deck, setDeck] = useState<PlayingCard[]>([]);
  const [player, setPlayer] = useState<PlayingCard[]>([]);
  const [dealer, setDealer] = useState<PlayingCard[]>([]);
  const [holeHidden, setHoleHidden] = useState(true);
  const [phase, setPhase] = useState<Phase>('betting');
  const [result, setResult] = useState<{ outcome: Outcome; delta: number } | null>(null);
  const [history, setHistory] = useState<Array<{ outcome: Outcome; wager: number; delta: number }>>([]);
  const [flash, setFlash] = useState<{ text: string; positive: boolean } | null>(null);
  const [showHelp, setShowHelp] = useState(false);

  const [resetting, setResetting] = useState(false);
  const [resetInfo, setResetInfo] = useState<{ remaining: number | null; isPremium: boolean; nextResetAt: string | null } | null>(null);
  const [loaded, setLoaded] = useState(false);
  const lastSavedRef = useRef<number | null>(null);

  // Загружаем сохранённый баланс (постоянный, между сессиями) + статус сброса.
  const loadBalance = useCallback(async () => {
    if (!token) { setResetInfo(null); setLoaded(true); return; }
    const r = await gamesApi.getBalance('blackjack', token);
    if (r.data) {
      setBalance(r.data.balance);
      lastSavedRef.current = r.data.balance;
      setResetInfo({ remaining: r.data.reset.remaining, isPremium: r.data.reset.isPremium, nextResetAt: r.data.reset.nextResetAt });
    }
    setLoaded(true);
  }, [token]);
  useEffect(() => { void loadBalance(); }, [loadBalance]);

  // Сохраняем баланс на сервере между раундами (не во время хода игрока),
  // чтобы он пережил перезагрузку и новые сессии.
  useEffect(() => {
    if (!loaded || !token || phase === 'player') return;
    if (lastSavedRef.current === balance) return;
    lastSavedRef.current = balance;
    void gamesApi.saveBalance('blackjack', balance, token);
  }, [balance, phase, loaded, token]);

  const playerScore = useMemo(() => handScore(player), [player]);
  const dealerScore = useMemo(() => handScore(holeHidden ? dealer.slice(0, 1) : dealer), [dealer, holeHidden]);

  // ---- Выбор ставки (номинал / процент / all-in) с защитой значений ----
  const pickBet = (amount: number) => {
    if (phase !== 'betting') return;
    setBet(Math.max(1, Math.min(balance, Math.floor(amount) || 1)));
  };
  const pickPercent = (pct: number) => {
    if (phase !== 'betting' || balance < 1) return;
    const amt = pct >= 1 ? balance : Math.max(1, Math.floor(balance * pct));
    setBet(Math.max(1, Math.min(balance, amt)));
  };

  const settle = useCallback((outcome: Outcome, wager: number) => {
    const ret = outcome === 'blackjack' ? Math.floor(wager * 2.5) : outcome === 'win' ? wager * 2 : outcome === 'push' ? wager : 0;
    setBalance((b) => b + ret);
    const delta = ret - wager;
    setResult({ outcome, delta });
    setHistory((h) => [{ outcome, wager, delta }, ...h].slice(0, 12));
    setPhase('done');
  }, []);

  // Доигрывание дилера (берёт до 17) + сравнение
  const finishRound = useCallback((playerCards: PlayingCard[], currentDeck: PlayingCard[], wager: number) => {
    const d = [...currentDeck];
    const dh = [...dealer];
    while (handScore(dh) < 17 && d.length > 0) dh.push(d.shift()!);
    setDealer(dh);
    setDeck(d);
    setHoleHidden(false);

    const p = handScore(playerCards);
    const dl = handScore(dh);
    let outcome: Outcome;
    if (dl > 21 || p > dl) outcome = 'win';
    else if (p < dl) outcome = 'lose';
    else outcome = 'push';
    settle(outcome, wager);
  }, [dealer, settle]);

  const deal = () => {
    if (phase !== 'betting') return;
    if (balance < 1) { setFlash({ text: 'Недостаточно бриллиантов — сбросьте баланс', positive: false }); return; }
    const b = Math.max(1, Math.min(bet, balance));
    if (b < 1) { setFlash({ text: 'Некорректная ставка', positive: false }); return; }
    setFlash(null);
    setBalance((x) => x - b);
    setRoundBet(b);

    const d = shuffle(buildDeck());
    const p = [d.shift()!, d.shift()!];
    const dl = [d.shift()!, d.shift()!];
    setPlayer(p);
    setDealer(dl);
    setDeck(d);
    setHoleHidden(true);
    setResult(null);

    const pBJ = isBlackjack(p);
    const dBJ = isBlackjack(dl);
    if (pBJ || dBJ) {
      setHoleHidden(false);
      if (pBJ && dBJ) settle('push', b);
      else if (pBJ) settle('blackjack', b);
      else settle('lose', b);
    } else {
      setPhase('player');
    }
  };

  const hit = () => {
    if (phase !== 'player' || deck.length === 0) return;
    const d = [...deck];
    const card = d.shift()!;
    const np = [...player, card];
    setPlayer(np);
    setDeck(d);
    if (handScore(np) > 21) {
      setHoleHidden(false);
      settle('lose', roundBet);
    }
  };

  const stand = () => {
    if (phase !== 'player') return;
    finishRound(player, deck, roundBet);
  };

  const double = () => {
    if (phase !== 'player' || player.length !== 2) return;
    if (balance < roundBet) { setFlash({ text: 'Недостаточно бриллиантов для дубля', positive: false }); return; }
    setFlash(null);
    setBalance((b) => b - roundBet);
    const wager = roundBet * 2;
    setRoundBet(wager);
    const d = [...deck];
    const card = d.shift()!;
    const np = [...player, card];
    setPlayer(np);
    setDeck(d);
    if (handScore(np) > 21) {
      setHoleHidden(false);
      settle('lose', wager);
    } else {
      finishRound(np, d, wager);
    }
  };

  const newRound = () => {
    setPhase('betting');
    setPlayer([]);
    setDealer([]);
    setDeck([]);
    setResult(null);
    setHoleHidden(true);
  };

  const resetBalance = async () => {
    if (resetting || phase === 'player') return;
    if (balance > 0) { setFlash({ text: 'Сброс доступен только при нулевом балансе', positive: false }); return; }
    if (!token) { setFlash({ text: 'Войдите в аккаунт, чтобы сбросить баланс', positive: false }); return; }
    setResetting(true);
    const res = await gamesApi.reset('blackjack', token);
    setResetting(false);
    if (res.data?.allowed) {
      const nb = res.data.balance ?? START_BALANCE;
      setBalance(nb);
      lastSavedRef.current = nb; // сервер уже сохранил баланс при сбросе
      setResetInfo({ remaining: res.data.remaining, isPremium: res.data.isPremium, nextResetAt: res.data.nextResetAt });
      setFlash({ text: 'Баланс пополнен до 100 💎', positive: true });
    } else {
      setFlash({ text: res.error || 'Сброс на сегодня недоступен', positive: false });
      void loadBalance();
    }
  };

  const canDouble = phase === 'player' && player.length === 2 && balance >= roundBet;
  const hint: string | null =
    phase !== 'player' ? null
      : playerScore <= 11 ? 'Бусту нет — можно смело брать.'
        : playerScore >= 17 ? 'Высокий счёт — обычно стоит остановиться.'
          : 'Сложный момент: берите против 7+ у дилера, стойте против 2–6.';

  const cell = (label: ReactNode, sub?: ReactNode) => (
    <div className="rounded-xl bg-muted/60 px-3 py-2.5">
      <span className="block text-xs text-muted-foreground mb-0.5">{label}</span>
      <span className="text-2xl font-bold tabular-nums">{sub}</span>
    </div>
  );

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-primary/5 via-background to-background">
      <div className="pointer-events-none absolute -top-24 -right-24 w-[28rem] h-[28rem] rounded-full bg-primary/10 blur-3xl opacity-60" />
      <div className="pointer-events-none absolute top-1/3 -left-24 w-80 h-80 rounded-full bg-sky-400/10 blur-3xl opacity-50" />
      <div className="pointer-events-none absolute inset-0 bg-grid-faint" />

      <div className="relative container py-8 sm:py-10 max-w-6xl">
        {/* Шапка */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="flex items-center gap-3 mb-6">
          <Button asChild variant="ghost" size="icon" title="На главную">
            <Link to="/"><ArrowLeft className="w-5 h-5" /></Link>
          </Button>
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-sky-400 to-indigo-600 flex items-center justify-center shadow-md shrink-0">
            <Gem className="w-6 h-6 text-white" />
          </div>
          <div className="min-w-0">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight leading-tight">Блэкджек 21</h1>
            <p className="text-sm text-muted-foreground">Секретная мини-игра CT-Platform</p>
          </div>
          <span className="ml-auto hidden sm:inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium">
            <Sparkles className="w-4 h-4" />Демо · бриллианты
          </span>
        </motion.div>

        {/* Дисклеймер */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.05 }}
          className="mb-6 rounded-2xl border border-sky-300/50 dark:border-sky-500/30 bg-sky-50 dark:bg-sky-950/20 px-4 py-3.5 flex gap-3 items-start">
          <div className="w-8 h-8 rounded-lg bg-sky-400/20 flex items-center justify-center shrink-0">
            <Info className="w-4 h-4 text-sky-600 dark:text-sky-400" />
          </div>
          <p className="text-sm text-sky-800 dark:text-sky-200/90 leading-relaxed">
            <strong>Это демо-игра на виртуальные бриллианты 💎.</strong> Без реальных денег, ставок и валюты.
            Валюта отдельная от рулетки. Баланс сохраняется между сессиями.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-[360px_1fr] gap-6">
          {/* Левая колонка: баланс, ставка, сброс, история */}
          <div className="space-y-4">
            <Card>
              <CardContent className="p-5 space-y-4">
                {/* Баланс + ставка */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded-xl bg-sky-400/10 border border-sky-300/40 dark:border-sky-500/30 px-3 py-2.5">
                    <span className="flex items-center gap-1.5 text-xs text-muted-foreground mb-0.5"><Gem className="w-3.5 h-3.5 text-sky-500" />Бриллианты</span>
                    <span className="text-2xl font-bold tabular-nums text-sky-600 dark:text-sky-400">{balance}</span>
                  </div>
                  {cell(<span className="flex items-center gap-1.5"><Wallet className="w-3.5 h-3.5" />Ставка</span>, bet)}
                </div>

                {/* Номинал ставки */}
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">Номинал ставки</p>
                  <div className="grid grid-cols-4 gap-2">
                    {CHIPS.map((c) => (
                      <button key={c} onClick={() => pickBet(c)} disabled={phase !== 'betting'}
                        className={`h-11 rounded-full font-bold text-sm transition-all disabled:opacity-60 ${bet === c
                          ? 'bg-gradient-to-br from-sky-400 to-indigo-500 text-white ring-2 ring-sky-500 ring-offset-2 ring-offset-card scale-105 shadow-md'
                          : 'bg-muted hover:bg-muted/70 text-foreground border border-border'}`}>
                        {c}
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground pt-1">Процент от банка</p>
                  <div className="grid grid-cols-4 gap-2">
                    {[0.1, 0.25, 0.5].map((p) => (
                      <button key={p} onClick={() => pickPercent(p)} disabled={phase !== 'betting' || balance < 1}
                        className="h-10 rounded-lg text-sm font-semibold bg-muted hover:bg-muted/70 border border-border disabled:opacity-60">
                        {Math.round(p * 100)}%
                      </button>
                    ))}
                    <button onClick={() => pickPercent(1)} disabled={phase !== 'betting' || balance < 1}
                      className="h-10 rounded-lg text-sm font-bold bg-gradient-to-br from-rose-500 to-red-600 text-white hover:opacity-90 disabled:opacity-60">
                      All-in
                    </button>
                  </div>
                </div>

                {/* Сброс баланса */}
                <div className="pt-1">
                  <Button onClick={resetBalance} variant="outline" disabled={resetting || balance > 0 || phase === 'player'} className="w-full gap-1.5"
                    title={balance > 0 ? 'Доступно только при нулевом балансе' : undefined}>
                    {balance > 0 ? <Lock className="w-4 h-4" /> : <RotateCcw className="w-4 h-4" />}
                    {resetting ? 'Сброс…' : `Сбросить баланс до ${START_BALANCE}`}
                  </Button>
                  <p className="text-[11px] text-center text-muted-foreground mt-2 flex items-center justify-center gap-1">
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

                <AnimatePresence>
                  {flash && (
                    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                      className={`text-center text-sm rounded-lg px-3 py-2 ${flash.positive ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400' : 'bg-red-500/15 text-red-600 dark:text-red-400'}`}>
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
                  <History className="w-4 h-4 text-primary" />История рук
                  {history.length > 0 && <span className="ml-auto text-xs font-normal text-muted-foreground">последние {history.length}</span>}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {history.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Пока пусто — сыграйте первую руку.</p>
                ) : (
                  <div className="space-y-1.5">
                    {history.map((h, i) => (
                      <div key={i} className="flex items-center justify-between text-sm border-b border-border/40 pb-1.5 last:border-0">
                        <span className={OUTCOME_LABEL[h.outcome].cls}>{OUTCOME_LABEL[h.outcome].text}</span>
                        <span className={`font-semibold tabular-nums ${h.delta > 0 ? 'text-emerald-500' : h.delta < 0 ? 'text-red-500' : 'text-muted-foreground'}`}>
                          {h.delta > 0 ? `+${h.delta}` : h.delta}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

          </div>

          {/* Правая колонка: стол + действия + скрываемая помощь */}
          <div className="space-y-6">
            <Card>
              <CardContent className="p-5">
                {/* Зелёное сукно */}
                <div className="rounded-2xl bg-emerald-600/[0.06] ring-1 ring-emerald-600/15 p-4 sm:p-6 space-y-5">
                  {/* Дилер */}
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-sm font-semibold text-muted-foreground">Дилер</span>
                      <span className="text-sm font-bold tabular-nums">{dealer.length > 0 ? (holeHidden ? `${dealerScore}+` : dealerScore) : '—'}</span>
                    </div>
                    <div className="flex gap-2 min-h-[5rem]">
                      {dealer.length === 0
                        ? <div className="text-sm text-muted-foreground self-center">Карты появятся после раздачи</div>
                        : dealer.map((c, i) => <CardView key={i} card={c} hidden={i === 1 && holeHidden} delay={i * 0.08} />)}
                    </div>
                  </div>

                  {/* Результат */}
                  <div className="text-center h-7 flex items-center justify-center">
                    <AnimatePresence mode="wait">
                      {result && (
                        <motion.span key={result.outcome + result.delta} initial={{ opacity: 0, scale: 0.85 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
                          className={`font-bold ${OUTCOME_LABEL[result.outcome].cls}`}>
                          {OUTCOME_LABEL[result.outcome].text} · {result.delta > 0 ? `+${result.delta}` : result.delta} 💎
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Игрок */}
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-sm font-semibold">Вы</span>
                      <span className={`text-sm font-bold tabular-nums ${playerScore > 21 ? 'text-red-500' : playerScore === 21 ? 'text-emerald-500' : ''}`}>
                        {player.length > 0 ? playerScore : '—'}
                      </span>
                      {phase === 'player' && <span className="text-xs text-muted-foreground ml-auto">ставка {roundBet} 💎</span>}
                    </div>
                    <div className="flex gap-2 min-h-[5rem]">
                      {player.length === 0
                        ? <div className="text-sm text-muted-foreground self-center">Сделайте ставку и нажмите «Раздать»</div>
                        : player.map((c, i) => <CardView key={i} card={c} delay={i * 0.08} />)}
                    </div>
                  </div>
                </div>

                {/* Подсказка во время игры */}
                {hint && (
                  <p className="text-xs text-muted-foreground mt-3 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-500" />{hint}
                  </p>
                )}

                {/* Действия */}
                <div className="mt-4">
                  {phase === 'betting' && (
                    <Button
                      onClick={deal}
                      size="lg"
                      disabled={balance < 1}
                      className="w-full h-12 text-base gap-2 btn-shine bg-gradient-to-r from-sky-500 to-indigo-600 text-white shadow-lg shadow-sky-500/25 hover:opacity-95"
                    >
                      <Play className="w-5 h-5" />Раздать ({Math.min(bet, balance)} 💎)
                    </Button>
                  )}
                  {phase === 'player' && (
                    <div className="grid grid-cols-3 gap-2">
                      <Button onClick={hit} size="lg" className="h-12 gap-1.5"><Plus className="w-4 h-4" />Ещё</Button>
                      <Button onClick={stand} size="lg" variant="outline" className="h-12 gap-1.5"><Hand className="w-4 h-4" />Хватит</Button>
                      <Button onClick={double} size="lg" variant="outline" disabled={!canDouble} className="h-12 gap-1.5" title={canDouble ? 'Удвоить ставку и взять одну карту' : 'Дубль доступен на первых двух картах при достаточном балансе'}>
                        <ChevronsUp className="w-4 h-4" />Дубль
                      </Button>
                    </div>
                  )}
                  {phase === 'done' && (
                    <Button onClick={newRound} size="lg" className="w-full h-12 text-base gap-2">
                      <RotateCcw className="w-5 h-5" />Новая раздача
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Скрываемые правила/шансы/подсказки */}
            <div>
              <button onClick={() => setShowHelp((v) => !v)}
                className="w-full flex items-center justify-between gap-2 px-4 py-3 rounded-xl border border-border bg-card hover:bg-muted/50 transition-colors">
                <span className="flex items-center gap-2 font-semibold text-sm"><BookOpen className="w-4 h-4 text-primary" />Правила, шансы и подсказки</span>
                <ChevronDown className={`w-5 h-5 text-muted-foreground transition-transform ${showHelp ? 'rotate-180' : ''}`} />
              </button>
              <AnimatePresence initial={false}>
                {showHelp && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25 }} className="overflow-hidden">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
                      {/* Правила */}
                      <Card>
                        <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><BookOpen className="w-4 h-4 text-primary" />Правила</CardTitle></CardHeader>
                        <CardContent className="text-sm space-y-2 text-muted-foreground">
                          <p>Цель — набрать больше очков, чем у дилера, но не более 21.</p>
                          <p>Карты 2–10 — по номиналу, J/Q/K — 10, туз — 11 или 1 (автоматически).</p>
                          <p><strong className="text-foreground">Ещё</strong> — взять карту, <strong className="text-foreground">Хватит</strong> — остановиться, <strong className="text-foreground">Дубль</strong> — удвоить ставку и взять ровно одну карту.</p>
                          <p>Дилер обязан брать до 17 и затем остановиться. Перебор (&gt;21) — поражение.</p>
                          <p>Блэкджек (21 с первых двух карт) платит <strong className="text-foreground">3:2</strong>, обычная победа — 1:1, ничья — возврат ставки.</p>
                        </CardContent>
                      </Card>

                      {/* Шансы + подсказки */}
                      <Card>
                        <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Percent className="w-4 h-4 text-primary" />Шансы и базовая стратегия</CardTitle></CardHeader>
                        <CardContent className="text-sm space-y-3">
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <p className="text-xs font-semibold mb-1">Перебор, если взять</p>
                              <table className="w-full text-xs">
                                <tbody>
                                  {BUST_ON_HIT.map((r) => (
                                    <tr key={r.total}><td className="py-0.5 text-muted-foreground">с {r.total}</td><td className="py-0.5 text-right font-medium tabular-nums">{r.chance}</td></tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                            <div>
                              <p className="text-xs font-semibold mb-1">Перебор дилера (карта)</p>
                              <table className="w-full text-xs">
                                <tbody>
                                  {DEALER_BUST.map((r) => (
                                    <tr key={r.up}><td className="py-0.5 text-muted-foreground">{r.up}</td><td className="py-0.5 text-right font-medium tabular-nums">{r.chance}</td></tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                          <div className="text-xs text-muted-foreground border-t border-border pt-2 space-y-1">
                            <p className="text-foreground font-medium">Подсказки:</p>
                            <p>• 11 и меньше — всегда берите.</p>
                            <p>• 12–16 — берите против 7+ у дилера, стойте против 2–6.</p>
                            <p>• 17 и больше — стойте. Дубль хорош на 10–11.</p>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Зал славы — крупный рейтинг по рекорду / в эфире (full-width под игрой) */}
          <div className="mt-8">
            <GameLeaderboard game="blackjack" currency="💎" accent="from-cyan-500/30" />
          </div>
        </div>
      </div>
    </div>
  );
}

// Доступ к игре ограничен: гость → регистрация; Free → после 5 заданий; Premium → всегда.
export function BlackjackPage() {
  return (
    <GameGate game="Блэкджек">
      <BlackjackGame />
    </GameGate>
  );
}

export default BlackjackPage;
