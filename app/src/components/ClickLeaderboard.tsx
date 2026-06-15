import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { MousePointerClick, Medal, Crown } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAppStore } from '@/store/useAppStore';
import { clicksApi, type ClickPeriod, type ClickLeaderboard as LB } from '@/lib/api/client';

const PERIODS: { id: ClickPeriod; label: string }[] = [
  { id: 'day', label: 'День' },
  { id: 'week', label: 'Неделя' },
  { id: 'month', label: 'Месяц' },
  { id: 'year', label: 'Год' },
  { id: 'all', label: 'Всё время' },
];
const initials = (n: string) => n.split(' ').map((s) => s[0]).join('').slice(0, 2).toUpperCase();
const rankColor = (r: number) => (r === 1 ? 'text-amber-500' : r === 2 ? 'text-gray-400' : r === 3 ? 'text-amber-700' : 'text-muted-foreground');

/** Рейтинг кликеров (персональные клики) — у общего счётчика внизу страницы. */
export function ClickLeaderboard() {
  const { isAuthenticated, token } = useAppStore();
  const [period, setPeriod] = useState<ClickPeriod>('all');
  const [data, setData] = useState<LB | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void clicksApi.leaderboard(period, token).then((r) => {
      if (!cancelled) { setData(r.data ?? null); setLoading(false); }
    });
    return () => { cancelled = true; };
  }, [period, token]);

  const rows = data?.leaderboard ?? [];
  const me = data?.me ?? null;

  return (
    <div className="max-w-xl mx-auto mt-10">
      <div className="text-center mb-4">
        <h4 className="text-lg font-bold flex items-center justify-center gap-2">
          <MousePointerClick className="w-5 h-5 text-primary" />Рейтинг кликеров
        </h4>
        <p className="text-xs text-muted-foreground mt-0.5">Кто внёс больше всех нажатий — за день, неделю, месяц, год и всё время</p>
      </div>

      {/* Период */}
      <div className="flex justify-center mb-4">
        <div className="inline-flex flex-wrap justify-center rounded-full border bg-muted/40 p-1">
          {PERIODS.map((p) => (
            <button
              key={p.id}
              onClick={() => setPeriod(p.id)}
              className={`px-3.5 py-1.5 rounded-full text-sm font-medium transition-colors ${
                period === p.id ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading && !data ? (
            <div className="p-4 space-y-2">{[0, 1, 2, 3].map((i) => <div key={i} className="h-12 rounded-xl bg-muted animate-pulse" />)}</div>
          ) : rows.length === 0 ? (
            <p className="p-8 text-center text-sm text-muted-foreground">
              Пока нет данных за этот период. Жмите кнопку выше — и попадёте в рейтинг!
            </p>
          ) : (
            <div className="divide-y divide-border">
              {rows.map((r, i) => (
                <motion.div
                  key={r.userId}
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: Math.min(i, 10) * 0.03 }}
                  className={`flex items-center gap-3 px-4 py-2.5 ${me && me.rank != null && r.rank === me.rank ? 'bg-primary/5' : ''}`}
                >
                  <div className="w-7 flex justify-center shrink-0">
                    {r.rank === 1 ? <Crown className={`w-5 h-5 ${rankColor(1)}`} />
                      : r.rank <= 3 ? <Medal className={`w-4 h-4 ${rankColor(r.rank)}`} />
                      : <span className="font-bold text-muted-foreground text-sm">{r.rank}</span>}
                  </div>
                  <Avatar className="w-9 h-9 shrink-0">
                    {r.avatar && <AvatarImage src={r.avatar} className="object-cover" />}
                    <AvatarFallback className="bg-primary/10 text-primary font-semibold text-xs">{initials(r.name)}</AvatarFallback>
                  </Avatar>
                  <span className="flex-1 min-w-0 truncate font-medium">{r.name}</span>
                  <span className="shrink-0 font-bold text-primary tabular-nums">{r.clicks.toLocaleString('ru-RU')}</span>
                </motion.div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Моя позиция / приглашение */}
      {isAuthenticated ? (
        me && (
          <p className="text-center text-xs text-muted-foreground mt-3">
            {me.rank
              ? <>Ваше место: <span className="font-semibold text-foreground">#{me.rank}</span> · {me.clicks.toLocaleString('ru-RU')} нажатий за период</>
              : 'Жмите кнопку выше, чтобы попасть в рейтинг за этот период'}
          </p>
        )
      ) : (
        <p className="text-center text-xs text-muted-foreground mt-3">
          <Link to="/register" className="text-primary hover:underline font-medium">Зарегистрируйтесь</Link>, чтобы ваши клики считались в рейтинге
        </p>
      )}
    </div>
  );
}

export default ClickLeaderboard;
