import { useCallback, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Trophy, Medal, Crown, RefreshCw, Radio } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAppStore } from '@/store/useAppStore';
import { gamesApi, type GameLeaderboard as LB } from '@/lib/api/client';

const initials = (n: string) => n.split(' ').map((s) => s[0]).join('').slice(0, 2).toUpperCase();
const LIVE_POLL_MS = 5000;

/**
 * Крупный рейтинг мини-игры (full-width под игрой). Два режима:
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
    <div className="rounded-3xl border border-white/10 bg-gradient-to-b from-slate-900 to-slate-950 shadow-2xl overflow-hidden">
      {/* Шапка */}
      <div className={`px-5 sm:px-7 py-5 bg-gradient-to-r ${accent} to-transparent`}>
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h3 className="font-extrabold text-white text-xl sm:text-2xl flex items-center gap-2.5">
              <Trophy className="w-7 h-7 text-amber-300 shrink-0" />Зал славы
            </h3>
            <p className="text-white/60 text-sm mt-0.5">Лучшие игроки {game === 'blackjack' ? 'блэкджека' : 'рулетки'}</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="inline-flex rounded-xl bg-black/30 p-1 text-sm">
              <button
                onClick={() => setMetric('peak')}
                className={`px-4 py-1.5 rounded-lg font-semibold transition-colors ${metric === 'peak' ? 'bg-white/90 text-zinc-900' : 'text-white/70 hover:text-white'}`}
              >
                Рекорд
              </button>
              <button
                onClick={() => setMetric('balance')}
                className={`px-4 py-1.5 rounded-lg font-semibold transition-colors inline-flex items-center gap-1.5 ${metric === 'balance' ? 'bg-white/90 text-zinc-900' : 'text-white/70 hover:text-white'}`}
              >
                {metric === 'balance' && <span className="relative flex h-2 w-2"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" /><span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" /></span>}
                <Radio className="w-3.5 h-3.5" />В эфире
              </button>
            </div>
            <button onClick={() => load(true)} className="text-white/70 hover:text-white transition-colors p-1" title="Обновить">
              <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Список */}
      <div className="p-4 sm:p-5">
        {loading && !data ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">{[0, 1, 2, 3, 4, 5].map((i) => <div key={i} className="h-14 rounded-xl bg-white/5 animate-pulse" />)}</div>
        ) : rows.length === 0 ? (
          <p className="py-12 text-center text-white/50">
            Пока никто не побил стартовый банк. Сыграйте и станьте первым в зале славы! 🏆
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {rows.map((r, i) => {
              const isMe = me && me.rank != null && r.rank === me.rank;
              return (
                <motion.div
                  key={r.userId}
                  layout
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(i, 12) * 0.03 }}
                  className={`flex items-center gap-3 min-w-0 px-3.5 py-2.5 rounded-2xl border transition-colors ${
                    r.rank === 1
                      ? 'bg-amber-400/10 border-amber-400/30'
                      : isMe ? 'bg-white/10 border-white/25' : 'bg-white/[0.04] border-white/10 hover:bg-white/[0.07]'
                  }`}
                >
                  <div className="w-7 shrink-0 flex items-center justify-center">
                    {r.rank === 1 ? <Crown className="w-6 h-6 text-amber-400" />
                      : r.rank <= 3 ? <Medal className={`w-5 h-5 ${r.rank === 2 ? 'text-gray-300' : 'text-amber-700'}`} />
                      : <span className="text-base font-bold text-white/40 tabular-nums">{r.rank}</span>}
                  </div>
                  <Avatar className="w-10 h-10 shrink-0">
                    {r.avatar && <AvatarImage src={r.avatar} className="object-cover" />}
                    <AvatarFallback className="bg-white/10 text-white text-sm font-bold">{initials(r.name)}</AvatarFallback>
                  </Avatar>
                  <span className="flex-1 min-w-0 truncate font-semibold text-white/90">{r.name}{isMe && <span className="text-white/50 font-normal"> · вы</span>}</span>
                  <span className="shrink-0 font-extrabold text-white text-base sm:text-lg tabular-nums">{valueOf(r).toLocaleString('ru-RU')}</span>
                </motion.div>
              );
            })}
          </div>
        )}

        {me && (
          <div className="mt-4 pt-4 border-t border-white/10 flex items-center justify-between gap-3">
            <span className="text-white/60 min-w-0 truncate">{metric === 'balance' ? 'Ваш текущий баланс' : 'Ваш рекорд'}</span>
            <span className="flex items-center gap-2.5 shrink-0">
              {me.rank && <span className="text-white/50 text-sm whitespace-nowrap">#{me.rank} из {me.total}</span>}
              <span className="font-extrabold text-white text-lg sm:text-xl tabular-nums">{(metric === 'balance' ? me.balance : me.peak).toLocaleString('ru-RU')}</span>
              <span className="text-white/50">{currency}</span>
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

export default GameLeaderboard;
