import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Trophy, Medal, Crown, RefreshCw } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAppStore } from '@/store/useAppStore';
import { gamesApi, type GameLeaderboard as LB } from '@/lib/api/client';

const initials = (n: string) => n.split(' ').map((s) => s[0]).join('').slice(0, 2).toUpperCase();

/** Рейтинг мини-игры по РЕКОРДУ (peak). Показывается на странице самой игры. */
export function GameLeaderboard({
  game, currency, accent,
}: {
  game: 'roulette' | 'blackjack';
  currency: string;     // «монет» / «💎»
  accent: string;       // tailwind from-…
}) {
  const token = useAppStore((s) => s.token);
  const [data, setData] = useState<LB | null>(null);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    void gamesApi.leaderboard(game, token).then((r) => setData(r.data ?? null)).finally(() => setLoading(false));
  };
  useEffect(load, [game, token]);

  const rows = data?.leaderboard ?? [];
  const me = data?.me ?? null;

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-xl overflow-hidden">
      <div className={`px-4 py-3 flex items-center justify-between bg-gradient-to-r ${accent} to-transparent`}>
        <h3 className="font-bold text-white flex items-center gap-2"><Trophy className="w-5 h-5" />Зал славы</h3>
        <button onClick={load} className="text-white/70 hover:text-white transition-colors" title="Обновить">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
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
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: Math.min(i, 10) * 0.04 }}
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
                <span className="shrink-0 font-bold text-white tabular-nums">{r.peak.toLocaleString('ru-RU')}</span>
              </motion.div>
            ))}
          </div>
        )}

        {/* Моя строка */}
        {me && (
          <div className="mt-3 pt-3 border-t border-white/10 flex items-center justify-between text-sm">
            <span className="text-white/60">Ваш рекорд</span>
            <span className="flex items-center gap-2">
              {me.rank && <span className="text-white/50">#{me.rank}</span>}
              <span className="font-bold text-white tabular-nums">{me.peak.toLocaleString('ru-RU')}</span>
              <span className="text-white/50">{currency}</span>
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

export default GameLeaderboard;
