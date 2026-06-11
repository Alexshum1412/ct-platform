/**
 * Архив олимпиадных задач: группировка по годам и этапам, с разрезом по
 * предметам. Клик ведёт в каталог с предзаполненными фильтрами.
 */
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Archive, ArrowLeft, ChevronRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { olympiadApi, subjectsApi, type OlympiadArchiveYear } from '@/lib/api/client';
import { LevelBadge } from '@/components/olympiad/shared';

interface SubjectOption { id: string; slug: string; name: string }

export function OlympiadArchivePage() {
  const navigate = useNavigate();
  const [years, setYears] = useState<OlympiadArchiveYear[]>([]);
  const [subjects, setSubjects] = useState<SubjectOption[]>([]);
  const [subject, setSubject] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    subjectsApi.getAll().then(r => {
      const list = (r.data as { subjects?: SubjectOption[] } | SubjectOption[] | undefined);
      const arr = Array.isArray(list) ? list : list?.subjects ?? [];
      setSubjects(arr.map(s => ({ id: s.id, slug: s.slug, name: s.name })));
    });
  }, []);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    olympiadApi.getArchive(subject || undefined).then(r => {
      if (!alive) return;
      if (r.data) setYears(r.data.years);
      setLoading(false);
    });
    return () => { alive = false; };
  }, [subject]);

  return (
    <div className="container py-8 space-y-6 max-w-4xl">
      <div className="flex items-center gap-3 flex-wrap">
        <Button asChild variant="ghost" size="sm"><Link to="/olympiad"><ArrowLeft className="w-4 h-4 mr-1" />Олимпиады</Link></Button>
        <h1 className="text-2xl md:text-3xl font-extrabold flex items-center gap-2">
          <Archive className="w-6 h-6 text-primary" /> Архив по годам и этапам
        </h1>
      </div>

      <select value={subject} onChange={e => setSubject(e.target.value)}
        className="h-10 rounded-lg border border-input bg-background px-3 text-sm w-full sm:w-72">
        <option value="">Все предметы</option>
        {subjects.map(s => <option key={s.id} value={s.slug}>{s.name}</option>)}
      </select>

      {loading ? (
        <div className="space-y-4">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-40 rounded-xl" />)}</div>
      ) : years.length === 0 ? (
        <Card><CardContent className="p-10 text-center text-muted-foreground">
          В архиве пока нет задач по выбранному предмету.
        </CardContent></Card>
      ) : (
        years.map(({ year, levels }) => (
          <Card key={year}>
            <CardHeader className="pb-3"><CardTitle className="text-xl">Сезон {year}</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {levels.map(({ level, total, subjects: levelSubjects }) => (
                <div key={level}>
                  <div className="flex items-center gap-2 mb-2">
                    <LevelBadge level={level} />
                    <span className="text-sm text-muted-foreground">{total} задач</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {levelSubjects.map(({ subject: s, count }) => (
                      <button
                        key={s.id}
                        onClick={() => navigate(`/olympiad/tasks?subject=${s.slug}&level=${level}&year=${year}`)}
                        className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm hover:bg-muted hover:border-primary/40 transition-colors min-h-[2.25rem]"
                      >
                        <span className="w-2 h-2 rounded-full" style={{ background: s.color ?? 'hsl(var(--primary))' }} />
                        {s.name} <span className="text-muted-foreground">({count})</span>
                        <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}
