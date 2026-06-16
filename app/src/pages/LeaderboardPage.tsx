/**
 * Лидерборд — рейтинги по нескольким метрикам:
 *  Мастерство (объём×точность), Опыт (XP), Решено, Точность, Серия.
 * Период: всё время / неделя / сезон (XP — всегда за всё время).
 * Данные: GET /api/leaderboard?metric=&period= (skill-метрики считаются из
 * истории ответов, поэтому корректны даже после сброса XP).
 */
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Trophy, Medal, Crown, Flame, Target, Zap, Gem, CheckCircle2, MapPin, Sparkles,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { PageHeader } from '@/components/PageHeader';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAppStore } from '@/store/useAppStore';
import { leaderboardApi, type LbMetric, type LbPeriod, type LbRow, type LbResponse } from '@/lib/api/client';

const METRICS: { id: LbMetric; name: string; icon: typeof Gem; unit?: string; hint: string }[] = [
  { id: 'mastery', name: 'Мастерство', icon: Gem, hint: 'Баланс объёма и точности: верных² / всего ответов' },
  { id: 'xp', name: 'Опыт', icon: Zap, unit: 'XP', hint: 'Очки за верные ответы (за всё время)' },
  { id: 'solved', name: 'Решено', icon: CheckCircle2, hint: 'Количество верных ответов' },
  { id: 'accuracy', name: 'Точность', icon: Target, unit: '%', hint: 'Доля верных ответов (мин. 10 решений)' },
  { id: 'streak', name: 'Серия', icon: Flame, hint: 'Макс. серия верных ответов подряд' },
];

const PERIODS: { id: LbPeriod; label: string }[] = [
  { id: 'all', label: 'Всё время' },
  { id: 'week', label: 'Неделя' },
  { id: 'season', label: 'Сезон' },
];

const initials = (name: string) => name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase();
const fmt = (metric: LbMetric, v: number) => (metric === 'accuracy' ? `${v}%` : v.toLocaleString('ru-RU'));

export function LeaderboardPage() {
  const { isAuthenticated, token } = useAppStore();
  const [metric, setMetric] = useState<LbMetric>('mastery');
  const [period, setPeriod] = useState<LbPeriod>('all');
  const [data, setData] = useState<LbResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    void leaderboardApi.list(metric, period, 50, token).then((r) => {
      if (!cancelled) { setData(r.data ?? null); setIsLoading(false); }
    });
    return () => { cancelled = true; };
  }, [metric, period, token]);

  const metricCfg = METRICS.find((m) => m.id === metric)!;
  const rows = data?.leaderboard ?? [];
  const me = data?.me ?? null;
  const top3 = rows.slice(0, 3);
  const rest = rows.slice(3);

  return (
    <div className="min-h-screen bg-background">
      <div className="container py-8">
        <PageHeader
          icon={Trophy}
          title="Лидерборд"
          subtitle="Соревнуйтесь по мастерству, опыту, точности и сериям — за всё время, неделю или сезон"
          accent="from-amber-500 to-orange-500"
        />

        {/* Выбор метрики */}
        <div className="flex flex-wrap justify-center gap-2 mb-4">
          {METRICS.map((m) => (
            <button
              key={m.id}
              onClick={() => setMetric(m.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                metric === m.id
                  ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-md shadow-amber-500/25 scale-[1.03]'
                  : 'bg-muted hover:bg-muted/70 text-muted-foreground hover:text-foreground'
              }`}
            >
              <m.icon className="w-4 h-4" />{m.name}
            </button>
          ))}
        </div>

        {/* Период (для XP скрыт — он за всё время) + подсказка по метрике */}
        <div className="flex flex-col items-center gap-2 mb-8">
          {metric !== 'xp' && (
            <div className="inline-flex rounded-full border bg-muted/40 p-1">
              {PERIODS.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setPeriod(p.id)}
                  className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                    period === p.id ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          )}
          <p className="text-xs text-muted-foreground flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />{metricCfg.hint}
          </p>
        </div>

        {/* Моя позиция */}
        {isAuthenticated && me && !isLoading && (
          <MyPositionCard me={me} metric={metric} />
        )}

        {isLoading ? (
          <div className="flex justify-center py-16">
            <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
          </div>
        ) : rows.length === 0 ? (
          <Card><CardContent className="p-12 text-center text-muted-foreground">
            <Trophy className="w-12 h-12 mx-auto mb-3 opacity-30" />
            {metric === 'xp'
              ? 'Пока никто не набрал опыт — решайте задания, чтобы открыть рейтинг!'
              : metric === 'accuracy'
                ? 'Пока нет участников с 10+ решёнными заданиями. Решайте, чтобы попасть в рейтинг точности!'
                : 'Пока нет данных за этот период. Решайте задания, чтобы попасть в рейтинг!'}
          </CardContent></Card>
        ) : (
          <>
            {/* Подиум топ-3 */}
            {top3.length === 3 && <Podium rows={top3} metric={metric} />}

            {/* Остальные */}
            <Card>
              <CardContent className="p-0 divide-y divide-border">
                {(top3.length === 3 ? rest : rows).map((row, i) => (
                  <Row key={row.userId} row={row} metric={metric} index={i} highlight={row.userId === me?.userId} />
                ))}
                {top3.length === 3 && rest.length === 0 && (
                  <div className="p-6 text-center text-sm text-muted-foreground">И это весь топ — займите место выше!</div>
                )}
              </CardContent>
            </Card>
          </>
        )}

        {!isAuthenticated && !isLoading && (
          <Card className="mt-8 border-primary/20 bg-primary/5">
            <CardContent className="p-6 flex items-center justify-between flex-wrap gap-4">
              <div>
                <h4 className="font-semibold">Хотите попасть в топ?</h4>
                <p className="text-sm text-muted-foreground">Зарегистрируйтесь, решайте задания и поднимайтесь в рейтинге.</p>
              </div>
              <Link to="/register" className="inline-flex items-center justify-center px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-medium">
                Зарегистрироваться
              </Link>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

function rankColor(rank: number) {
  if (rank === 1) return 'text-amber-500';
  if (rank === 2) return 'text-gray-400';
  if (rank === 3) return 'text-amber-700';
  return 'text-muted-foreground';
}

function Podium({ rows, metric }: { rows: LbRow[]; metric: LbMetric }) {
  // Порядок на подиуме: 2 — 1 — 3
  const order = [rows[1], rows[0], rows[2]];
  const heights = ['h-24', 'h-32', 'h-20'];
  const ringColors = ['ring-gray-300', 'ring-amber-400', 'ring-amber-700/60'];
  return (
    <div className="grid grid-cols-3 gap-3 sm:gap-6 items-end mb-6 max-w-2xl mx-auto">
      {order.map((row, i) => {
        if (!row) return <div key={i} />;
        const isFirst = i === 1;
        return (
          <motion.div
            key={row.userId}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="flex flex-col items-center"
          >
            <Link to={`/u/${row.userId}`} className="flex flex-col items-center hover:opacity-90 transition-opacity">
            <div className="relative mb-2">
              {isFirst && (
                <>
                  <motion.div
                    aria-hidden
                    className="absolute inset-0 rounded-full bg-amber-400/40 blur-xl"
                    animate={{ opacity: [0.4, 0.75, 0.4], scale: [1, 1.12, 1] }}
                    transition={{ duration: 2.4, repeat: Infinity }}
                  />
                  <Crown className="w-6 h-6 text-amber-500 absolute -top-5 left-1/2 -translate-x-1/2 drop-shadow" />
                </>
              )}
              <Avatar className={`relative ${isFirst ? 'w-20 h-20' : 'w-14 h-14'} ring-4 ${ringColors[i]}`}>
                {row.avatar && <AvatarImage src={row.avatar} className="object-cover" />}
                <AvatarFallback className="bg-primary/10 text-primary font-bold">{initials(row.name)}</AvatarFallback>
              </Avatar>
            </div>
            <p className="font-semibold text-sm text-center truncate max-w-full px-1">{row.name}</p>
            </Link>
            <p className={`text-lg font-extrabold ${rankColor(row.rank ?? 0)}`}>{fmt(metric, row.value)}</p>
            <div className={`w-full ${heights[i]} rounded-t-xl mt-2 flex items-start justify-center pt-2 ${
              isFirst ? 'bg-gradient-to-b from-amber-400/30 to-amber-400/5' : 'bg-gradient-to-b from-muted to-transparent'
            }`}>
              <span className={`text-2xl font-black ${rankColor(row.rank ?? 0)}`}>{row.rank}</span>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}

function Row({ row, metric, index, highlight }: { row: LbRow; metric: LbMetric; index: number; highlight?: boolean }) {
  const rank = row.rank ?? index + 1;
  return (
    <motion.div
      initial={{ opacity: 0, x: -16 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: Math.min(index, 12) * 0.03 }}
    >
    <Link
      to={`/u/${row.userId}`}
      className={`flex items-center gap-3 sm:gap-4 p-4 hover:bg-muted/50 transition-colors ${highlight ? 'bg-primary/5' : ''}`}
    >
      <div className="w-8 flex justify-center shrink-0">
        {rank <= 3
          ? <Medal className={`w-5 h-5 ${rankColor(rank)}`} />
          : <span className="font-bold text-muted-foreground text-sm">{rank}</span>}
      </div>
      <Avatar className="w-11 h-11 shrink-0">
        {row.avatar && <AvatarImage src={row.avatar} className="object-cover" />}
        <AvatarFallback className="bg-primary/10 text-primary font-semibold text-sm">{initials(row.name)}</AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h4 className="font-semibold truncate">{row.name}</h4>
          <span className="shrink-0 inline-flex items-center gap-0.5 text-[11px] font-medium px-1.5 py-0.5 rounded bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300">
            <Zap className="w-3 h-3" />{row.level}
          </span>
        </div>
        <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
          {row.city && <span className="flex items-center gap-0.5"><MapPin className="w-3 h-3" />{row.city}</span>}
          {metric !== 'solved' && <span>{row.solved} решено</span>}
          {metric !== 'accuracy' && row.total > 0 && <span>{row.accuracy}% точн.</span>}
          {metric !== 'streak' && row.maxStreak > 0 && <span className="flex items-center gap-0.5"><Flame className="w-3 h-3 text-orange-500" />{row.maxStreak}</span>}
        </div>
      </div>
      <div className="text-right shrink-0">
        <p className="text-lg font-extrabold text-primary tabular-nums">{fmt(metric, row.value)}</p>
        <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{METRICS.find((m) => m.id === metric)!.name}</p>
      </div>
    </Link>
    </motion.div>
  );
}

function MyPositionCard({ me, metric }: { me: NonNullable<LbResponse['me']>; metric: LbMetric }) {
  const stats = [
    { label: 'Опыт', value: `${me.xp} XP` },
    { label: 'Уровень', value: me.level },
    { label: 'Решено', value: me.solved },
    { label: 'Точность', value: `${me.accuracy}%` },
    { label: 'Серия', value: me.maxStreak },
    { label: 'Мастерство', value: me.mastery },
  ];
  return (
    <Card className="mb-6 border-primary/30 bg-gradient-to-br from-primary/[0.07] to-transparent">
      <CardContent className="p-5">
        <div className="flex items-center justify-between gap-4 mb-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-primary text-white flex items-center justify-center font-bold text-lg shrink-0">
              {me.rank ?? '—'}
            </div>
            <div>
              <h4 className="font-semibold">Ваша позиция</h4>
              <p className="text-sm text-muted-foreground">
                {me.eligible && me.rank
                  ? <>{me.rank} место из {me.outOf} · {fmt(metric, me.value)}</>
                  : metric === 'accuracy'
                    ? 'Решите минимум 10 заданий, чтобы попасть в рейтинг точности'
                    : 'Решайте задания, чтобы попасть в этот рейтинг'}
              </p>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
          {stats.map((s) => (
            <div key={s.label} className="rounded-xl bg-background/70 border border-border/60 p-2.5 text-center">
              <p className="font-bold tabular-nums">{s.value}</p>
              <p className="text-[10px] text-muted-foreground">{s.label}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export default LeaderboardPage;
