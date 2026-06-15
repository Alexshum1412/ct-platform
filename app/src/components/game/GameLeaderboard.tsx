import { useCallback, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Trophy, Medal, Crown, RefreshCw, Radio } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAppStore } from '@/store/useAppStore';
import { gamesApi, type GameLeaderboard as LB } from '@/lib/api/client';

const initials = (n: string) => n.split(' ').map((s) => s[0]).join('').slice(0, 2).toUpperCase();
const LIVE_POLL_MS = 5000;

/**
 * Рейтинг мини-игры. Два режима:
 *  - «Рекорд» (peak) — лучший достигнутый баланс за всё время;
 *  - «В эфире» (balance) — текущий баланс, обновляется каждые 5 с (прямой эфир).
 */
export function GameLeaderboard({
  game, currency, accent,
}: {
  game: 'roulette' | 'blackjack';
  currency: string;
  accent: string;
}) {
  const token = useAppStore((s) => s.token);
  const [metric, setMetric] = useState<'peak' | 'balance'>('peak');
  const [data, setData] = useState<LB | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback((spin = true) => {
    if (spin) setLoading(true);
    void gamesApi.leaderboard(game, metric, token)
      .then((r) => setData(r.data ?? null))
      .finally(() => setLoading(false));
  }, [game, metric, token]);

  useEffect(() => { load(true); }, [load]);

  // «В эфире» — тихий поллинг текущих балансов (без спиннера).
  useEffect(() => {
    if (metric !== 'balance') return;
    const id = setInterval(() => load(false), LIVE_POLL_MS);
    return () => clearInterval(id);
  }, [metric, load]);

  const rows = data?.leaderboard ?? [];
  const me = data?.me ?? null;
  const valueOf = (r: { peak: number; balance: number }) => (metric === 'balance' ? r.balance : r.peak);

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-xl overflow-hidden">
      <div className={`px-4 py-3 bg-gradient-to-r ${accent} to-transparent`}>
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-white flex items-center gap-2"><Trophy className="w-5 h-5" />Зал славы</h3>
          <button onClick={() => load(true)} className="text-white/70 hover:text-white transition-colors" title="Обновить">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
        {/* Переключатель режима */}
        <div className="mt-2.5 inline-flex rounded-lg bg-black/25 p-0.5 text-xs">
          <button
            onClick={() => setMetric('peak')}
            className={`px-3 py-1 rounded-md font-semibold transition-colors ${metric === 'peak' ? 'bg-white/90 text-zinc-900' : 'text-white/70 hover:text-white'}`}
          >
            Рекорд
          </button>
          <button
            onClick={() => setMetric('balance')}
            className={`px-3 py-1 rounded-md font-semibold transition-colors inline-flex items-center gap-1 ${metric === 'balance' ? 'bg-white/90 text-zinc-900' : 'text-white/70 hover:text-white'}`}
          >
            {metric === 'balance' && <span className="relative flex h-1.5 w-1.5"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" /><span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" /></span>}
            <Radio className="w-3 h-3" />В эфире
          </button>
        </div>
      </div>

      <div className="p-3">
        {loading && !data ? (
          <div className="space-y-2">{[0, 1, 2, 3].map((i) => <div key={i} className="h-11 rounded-xl bg-white/5 animate-pulse" />)}</div>
        ) : rows.length === 0 ? (
          <p className="py-8 text-center text-sm text-white/50">
            Пока никто не побил стартовый банк. Будьте первым в зале славы!
          </p>
        ) : (
          <div className="space-y-1">
            {rows.map((r, i) => (
              <motion.div
                key={r.userId}
                layout
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: Math.min(i, 10) * 0.03 }}
                className={`flex items-center gap-3 px-2.5 py-2 rounded-xl ${
                  me && me.rank != null && r.rank === me.rank ? 'bg-white/10 ring-1 ring-white/20' : 'hover:bg-white/5'
                }`}
              >
                <div className="w-6 text-center shrink-0">
                  {r.rank === 1 ? <Crown className="w-5 h-5 text-amber-400 mx-auto" />
                    : r.rank <= 3 ? <Medal className={`w-4 h-4 mx-auto ${r.rank === 2 ? 'text-gray-300' : 'text-amber-700'}`} />
                    : <span className="text-sm font-bold text-white/40">{r.rank}</span>}
                </div>
                <Avatar className="w-8 h-8 shrink-0">
                  {r.avatar && <AvatarImage src={r.avatar} className="object-cover" />}
                  <AvatarFallback className="bg-white/10 text-white text-xs font-semibold">{initials(r.name)}</AvatarFallback>
                </Avatar>
                <span className="flex-1 min-w-0 truncate text-sm font-medium text-white/90">{r.name}</span>
                <span className="shrink-0 font-bold text-white tabular-nums">{valueOf(r).toLocaleString('ru-RU')}</span>
              </motion.div>
            ))}
          </div>
        )}

        {me && (
          <div className="mt-3 pt-3 border-t border-white/10 flex items-center justify-between text-sm">
            <span className="text-white/60">{metric === 'balance' ? 'Ваш баланс' : 'Ваш рекорд'}</span>
            <span className="flex items-center gap-2">
              {me.rank && <span className="text-white/50">#{me.rank}</span>}
              <span className="font-bold text-white tabular-nums">{(metric === 'balance' ? me.balance : me.peak).toLocaleString('ru-RU')}</span>
              <span className="text-white/50">{currency}</span>
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

export default GameLeaderboard;
