/**
 * Хаб «Олимпиадная подготовка» — точка входа в раздел.
 * Уровни этапов, предметы со счётчиками задач, мой прогресс, ссылки на
 * архив / теорию / рейтинг / рекомендации.
 */
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Trophy, BookOpen, Archive, Compass, ChevronRight, Medal, Target } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useAppStore } from '@/store/useAppStore';
import { olympiadApi, olympiadOverviewApi, type OlympiadOverview, type OlympiadProgress } from '@/lib/api/client';
import { LEVEL_META, LEVEL_ORDER } from '@/components/olympiad/levels';

export function OlympiadHubPage() {
  const token = useAppStore((s) => s.token);
  const isAuthenticated = useAppStore((s) => s.isAuthenticated);
  const [overview, setOverview] = useState<OlympiadOverview | null>(null);
  const [progress, setProgress] = useState<OlympiadProgress | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      const [ov, pr] = await Promise.all([
        olympiadOverviewApi.get(),
        isAuthenticated && token ? olympiadApi.getProgress(token) : Promise.resolve(null),
      ]);
      if (!alive) return;
      if (ov?.data) setOverview(ov.data);
      if (pr?.data) setProgress(pr.data);
      setLoading(false);
    })();
    return () => { alive = false; };
  }, [token, isAuthenticated]);

  const solvedBySubject = new Map(progress?.bySubject.map(r => [r.subject.id, r]) ?? []);

  return (
    <div className="container py-8 space-y-8">
      {/* Hero */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
        <div className="rounded-2xl border bg-gradient-to-br from-amber-500/10 via-background to-violet-500/10 p-6 md:p-10">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 rounded-xl bg-amber-500/15 flex items-center justify-center">
              <Trophy className="w-6 h-6 text-amber-600 dark:text-amber-400" />
            </div>
            <h1 className="text-2xl md:text-4xl font-extrabold">Олимпиадная подготовка</h1>
          </div>
          <p className="text-muted-foreground max-w-2xl md:text-lg">
            Задачи всех этапов республиканской олимпиады — от школьного до заключительного.
            Пошаговые разборы, теория повышенного уровня, отдельный рейтинг и достижения.
          </p>
          {progress && (
            <div className="mt-5 flex flex-wrap gap-x-6 gap-y-2 text-sm font-medium">
              <span className="inline-flex items-center gap-1.5"><Target className="w-4 h-4 text-primary" /> Решено: {progress.solved} из {progress.totalProblems}</span>
              <span className="inline-flex items-center gap-1.5"><Medal className="w-4 h-4 text-amber-500" /> Очки: {progress.points}</span>
            </div>
          )}
        </div>
      </motion.div>

      {/* Уровни этапов */}
      <section>
        <h2 className="text-xl font-bold mb-4">Уровни этапов</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
          {LEVEL_ORDER.map((level, i) => {
            const meta = LEVEL_META[level];
            const total = overview?.byLevel?.[level] ?? 0;
            const solved = progress?.byLevel?.[level]?.solved ?? 0;
            return (
              <motion.div key={level} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                <Link to={`/olympiad/tasks?level=${level}`} className="block h-full">
                  <Card className={`h-full border ${meta.bg} hover:shadow-md transition-shadow`}>
                    <CardContent className="p-4">
                      <p className={`font-bold ${meta.color}`}>{meta.short}</p>
                      <p className="text-xs text-muted-foreground mt-1">{meta.points} очков за задачу</p>
                      <p className="text-sm mt-2 font-medium">
                        {loading ? <Skeleton className="h-4 w-16" /> : (
                          isAuthenticated ? `${solved} / ${total} решено` : `${total} задач`
                        )}
                      </p>
                    </CardContent>
                  </Card>
                </Link>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* Быстрые ссылки */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        {[
          { to: '/olympiad/theory', icon: BookOpen, title: 'Теория PRO', desc: `${overview?.theoryCount ?? '—'} статей повышенного уровня` },
          { to: '/olympiad/archive', icon: Archive, title: 'Архив', desc: 'Задачи по годам и этапам' },
          { to: '/olympiad/rating', icon: Trophy, title: 'Рейтинг', desc: 'Таблица олимпиадников' },
          { to: '/olympiad/guide', icon: Compass, title: 'Как готовиться', desc: 'План для каждого этапа' },
        ].map(({ to, icon: Icon, title, desc }) => (
          <Link key={to} to={to} className="block">
            <Card className="h-full hover:shadow-md hover:border-primary/40 transition-all">
              <CardContent className="p-4">
                <Icon className="w-5 h-5 text-primary mb-2" />
                <p className="font-semibold">{title}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </section>

      {/* Предметы */}
      <section>
        <h2 className="text-xl font-bold mb-4">Предметы</h2>
        {loading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
            {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
            {(overview?.subjects ?? []).filter(s => s.total > 0).map(({ subject, total, byLevel }) => {
              const my = solvedBySubject.get(subject.id);
              return (
                <Link key={subject.id} to={`/olympiad/tasks?subject=${subject.slug}`} className="block">
                  <Card className="h-full hover:shadow-md hover:border-primary/40 transition-all">
                    <CardContent className="p-4 flex items-center gap-4">
                      <span className="w-3 h-10 rounded-full shrink-0" style={{ background: subject.color ?? 'hsl(var(--primary))' }} />
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold truncate">{subject.name}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {total} задач{my ? ` · решено ${my.solved}` : ''}
                          {my && my.points > 0 ? ` · ${my.points} очков` : ''}
                        </p>
                        <div className="flex gap-1 mt-1.5">
                          {LEVEL_ORDER.map(l => (byLevel[l] ?? 0) > 0 && (
                            <span key={l} className={`h-1.5 rounded-full ${LEVEL_META[l].bar}`} style={{ width: `${Math.max(10, ((byLevel[l] ?? 0) / total) * 100)}%` }} title={`${LEVEL_META[l].label}: ${byLevel[l]}`} />
                          ))}
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
