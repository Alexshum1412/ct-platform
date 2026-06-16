/**
 * PublicProfilePage — публичная карточка профиля (/u/:id). Открывается по клику
 * на пользователя в рейтингах. Показывает прогресс, достижения, вклад в пиксель-арт
 * и позволяет ставить лайк/дизлайк. Приватные данные (email и т.п.) не отдаются.
 */
import { useCallback, useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ThumbsUp, ThumbsDown, Flame, Star, Trophy, Palette, Target, CheckCircle2, Crown, Shield, ArrowLeft, Loader2 } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { useAppStore } from '@/store/useAppStore';
import { publicProfileApi, type PublicProfile } from '@/lib/api/client';

const initials = (n: string | null) => (n || '??').split(' ').map((s) => s[0]).join('').slice(0, 2).toUpperCase();

export function PublicProfilePage() {
  const { id = '' } = useParams();
  const token = useAppStore((s) => s.token);
  const requireAuth = useAppStore((s) => s.requireAuth);

  const [data, setData] = useState<PublicProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reacting, setReacting] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    void publicProfileApi.get(id, token).then((r) => {
      if (r.data) { setData(r.data); setError(null); }
      else setError(r.error || 'Профиль не найден');
    }).finally(() => setLoading(false));
  }, [id, token]);
  useEffect(load, [load]);

  const react = (value: 1 | -1) => {
    if (!requireAuth('Войдите, чтобы оценивать профили.')) return;
    if (!token || reacting || !data) return;
    setReacting(true);
    const next = data.reactions.mine === value ? 0 : value; // повторное нажатие — снять
    void publicProfileApi.react(id, next, token).then((r) => {
      if (r.data) setData({ ...data, reactions: { ...data.reactions, ...r.data, isSelf: data.reactions.isSelf } });
    }).finally(() => setReacting(false));
  };

  if (loading && !data) {
    return <div className="container py-20 flex items-center justify-center text-muted-foreground"><Loader2 className="w-6 h-6 animate-spin mr-2" />Загрузка профиля…</div>;
  }
  if (error || !data) {
    return (
      <div className="container py-20 text-center">
        <p className="text-muted-foreground mb-4">{error || 'Профиль не найден'}</p>
        <Link to="/leaderboard" className="inline-flex items-center gap-2 h-10 px-5 rounded-lg border bg-background font-semibold hover:bg-muted transition-colors">
          <ArrowLeft className="w-4 h-4" /> К рейтингу
        </Link>
      </div>
    );
  }

  const { user, stats, reactions } = data;
  const joined = new Date(user.createdAt).toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' });

  return (
    <div className="container py-8 md:py-10 max-w-3xl">
      <Link to="/leaderboard" className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors mb-4">
        <ArrowLeft className="w-4 h-4" /> К рейтингу
      </Link>

      {/* Шапка профиля */}
      <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} className="relative overflow-hidden rounded-3xl border bg-card/60 p-6 md:p-8">
        <div className="absolute -top-20 -right-16 w-72 h-72 rounded-full bg-primary/15 blur-[70px] pointer-events-none" />
        <div className="absolute inset-0 bg-grid-faint pointer-events-none" />
        <div className="relative flex flex-col sm:flex-row sm:items-center gap-5">
          <Avatar className="w-20 h-20 sm:w-24 sm:h-24 shrink-0 ring-4 ring-background shadow-lg">
            {user.image && <AvatarImage src={user.image} className="object-cover" />}
            <AvatarFallback className="bg-gradient-to-br from-primary to-violet-600 text-white text-2xl font-bold">{initials(user.name)}</AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight truncate">{user.name || 'Пользователь'}</h1>
              {user.isPremium && <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 text-xs font-semibold"><Crown className="w-3 h-3" />Premium</span>}
              {user.isStaff && <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-semibold"><Shield className="w-3 h-3" />Команда</span>}
            </div>
            <p className="text-muted-foreground mt-1 text-sm flex flex-wrap items-center gap-x-3 gap-y-1">
              <span>На платформе с {joined}</span>
              {user.city && <span>· {user.city}</span>}
              {user.grade ? <span>· {user.grade} класс</span> : null}
            </p>
            <div className="flex items-center gap-3 mt-3 text-sm">
              <span className="inline-flex items-center gap-1 font-semibold"><Star className="w-4 h-4 text-violet-500" />Ур. {user.level}</span>
              <span className="inline-flex items-center gap-1 text-muted-foreground">{user.xp.toLocaleString('ru-RU')} XP</span>
              {user.streakDays > 0 && <span className="inline-flex items-center gap-1 text-orange-500 font-semibold"><Flame className="w-4 h-4" />{user.streakDays} дн.</span>}
            </div>
          </div>
        </div>

        {/* Лайки / дизлайки */}
        <div className="relative mt-6 flex items-center gap-3">
          <Button
            onClick={() => react(1)}
            disabled={reacting || reactions.isSelf}
            variant={reactions.mine === 1 ? 'default' : 'outline'}
            className={`gap-2 ${reactions.mine === 1 ? 'bg-emerald-600 hover:bg-emerald-700' : ''}`}
          >
            <ThumbsUp className="w-4 h-4" />{reactions.likes}
          </Button>
          <Button
            onClick={() => react(-1)}
            disabled={reacting || reactions.isSelf}
            variant={reactions.mine === -1 ? 'default' : 'outline'}
            className={`gap-2 ${reactions.mine === -1 ? 'bg-rose-600 hover:bg-rose-700' : ''}`}
          >
            <ThumbsDown className="w-4 h-4" />{reactions.dislikes}
          </Button>
          {reactions.isSelf && <span className="text-xs text-muted-foreground">Это ваш профиль</span>}
        </div>
      </motion.div>

      {/* Статистика */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
        <StatCard icon={CheckCircle2} accent="text-emerald-500" value={stats.solvedTotal.toLocaleString('ru-RU')} label="Решено заданий" />
        <StatCard icon={Target} accent="text-blue-500" value={`${stats.accuracy}%`} label="Точность" />
        <StatCard icon={Trophy} accent="text-amber-500" value={String(stats.achievements)} label="Достижений" />
        <StatCard icon={Palette} accent="text-fuchsia-500" value={stats.pixels.toLocaleString('ru-RU')} label="Пикселей" />
      </div>

      <p className="text-center text-xs text-muted-foreground mt-6">
        Хотите так же? <Link to="/practice/math" className="underline hover:text-foreground">Начните решать задания</Link>.
      </p>
    </div>
  );
}

function StatCard({ icon: Icon, accent, value, label }: { icon: React.ComponentType<{ className?: string }>; accent: string; value: string; label: string }) {
  return (
    <div className="rounded-2xl border bg-card/60 p-4 text-center shadow-sm">
      <Icon className={`w-5 h-5 mx-auto mb-1.5 ${accent}`} />
      <p className="text-2xl font-extrabold tabular-nums">{value}</p>
      <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
    </div>
  );
}

export default PublicProfilePage;
