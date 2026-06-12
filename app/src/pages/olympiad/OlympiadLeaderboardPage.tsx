/**
 * Рейтинг олимпиадников — отдельный от общего рейтинга платформы.
 * Очки начисляются один раз за задачу (антинакрутка на сервере).
 */
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Medal, Trophy } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAppStore } from '@/store/useAppStore';
import { olympiadApi } from '@/lib/api/client';

interface Row { rank: number; userId: string; name: string; image: string | null; level: number; points: number; solved: number }

const medal = (rank: number) => rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : null;

export function OlympiadLeaderboardPage() {
  const token = useAppStore((s) => s.token);
  const user = useAppStore((s) => s.user);
  const [rows, setRows] = useState<Row[]>([]);
  const [me, setMe] = useState<{ rank: number; points: number; solved: number } | null>(null);
  const [totalParticipants, setTotalParticipants] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    olympiadApi.getLeaderboard(token ?? undefined).then(r => {
      if (!alive) return;
      if (r.data) { setRows(r.data.leaderboard); setMe(r.data.me); setTotalParticipants(r.data.totalParticipants); }
      setLoading(false);
    });
    return () => { alive = false; };
  }, [token]);

  return (
    <div className="container py-8 space-y-6 max-w-3xl">
      <PageHeader
        icon={Trophy}
        title="Рейтинг олимпиадников"
        subtitle={`Отдельный от общего рейтинга. Очки даются один раз за задачу: школьный — 10, районный — 20, областной — 35, республиканский — 50.${totalParticipants > 0 ? ` Участников: ${totalParticipants}.` : ''}`}
        accent="from-amber-500 to-orange-600"
        back={{ to: '/olympiad', label: 'Олимпиады' }}
        className="mb-0"
      />

      {me && (
        <Card className="border-primary/40 bg-primary/5">
          <CardContent className="p-4 flex items-center gap-3">
            <Medal className="w-6 h-6 text-primary" />
            <p className="font-semibold">Ваше место: #{me.rank}</p>
            <p className="text-sm text-muted-foreground ml-auto">{me.points} очков · {me.solved} задач</p>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <div className="space-y-2">{Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)}</div>
      ) : rows.length === 0 ? (
        <Card><CardContent className="p-10 text-center">
          <p className="text-muted-foreground mb-4">Рейтинг пока пуст — станьте первым олимпиадником платформы!</p>
          <Button asChild><Link to="/olympiad/tasks">Решить первую задачу</Link></Button>
        </CardContent></Card>
      ) : (
        <div className="space-y-2">
          {rows.map(r => {
            const isMe = user?.id === r.userId;
            return (
              <Card key={r.userId} className={isMe ? 'border-primary/50 bg-primary/5' : ''}>
                <CardContent className="p-3 md:p-4 flex items-center gap-3">
                  <span className="w-9 text-center font-bold text-lg shrink-0">{medal(r.rank) ?? r.rank}</span>
                  <Avatar className="w-9 h-9 shrink-0">
                    {r.image && <AvatarImage src={r.image} alt="" />}
                    <AvatarFallback>{(r.name || 'А').slice(0, 1).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold truncate">{r.name}{isMe && <span className="text-primary text-sm font-normal"> (вы)</span>}</p>
                    <p className="text-xs text-muted-foreground">{r.solved} задач решено</p>
                  </div>
                  <p className="font-bold text-amber-600 dark:text-amber-400 whitespace-nowrap">{r.points}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
