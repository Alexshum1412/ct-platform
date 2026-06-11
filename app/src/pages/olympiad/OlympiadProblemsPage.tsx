/**
 * Каталог олимпиадных задач с фильтрами: предмет, уровень этапа, тема, год,
 * поиск, скрытие решённых. Фильтры синхронизированы с URL (deep-links из
 * архива и хаба: /olympiad/tasks?subject=math&level=REGION&year=2024).
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, Eye, Filter, Search, Trophy } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { useAppStore } from '@/store/useAppStore';
import { olympiadApi, subjectsApi, type OlympiadCard } from '@/lib/api/client';
import { LevelBadge } from '@/components/olympiad/shared';
import { LEVEL_META, LEVEL_ORDER } from '@/components/olympiad/levels';

interface SubjectOption { id: string; slug: string; name: string }

const PAGE_SIZE = 30;

export function OlympiadProblemsPage() {
  const token = useAppStore((s) => s.token);
  const [searchParams, setSearchParams] = useSearchParams();

  const subject = searchParams.get('subject') ?? '';
  const level = searchParams.get('level') ?? '';
  const topic = searchParams.get('topic') ?? '';
  const year = searchParams.get('year') ?? '';

  const [subjects, setSubjects] = useState<SubjectOption[]>([]);
  const [problems, setProblems] = useState<OlympiadCard[]>([]);
  const [total, setTotal] = useState(0);
  const [facets, setFacets] = useState<{ topics: string[]; years: number[] }>({ topics: [], years: [] });
  const [search, setSearch] = useState('');
  const [hideSolved, setHideSolved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [offset, setOffset] = useState(0);

  const setParams = useCallback((patch: Record<string, string>) => {
    const next = new URLSearchParams(searchParams);
    for (const [key, value] of Object.entries(patch)) {
      if (value) next.set(key, value); else next.delete(key);
    }
    setSearchParams(next, { replace: true });
    setOffset(0);
  }, [searchParams, setSearchParams]);
  const setParam = useCallback((key: string, value: string) => setParams({ [key]: value }), [setParams]);

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
    const t = setTimeout(async () => {
      const r = await olympiadApi.getProblems({
        subjectId: subject || undefined,
        level: level || undefined,
        topic: topic || undefined,
        year: year ? Number(year) : undefined,
        q: search || undefined,
        limit: PAGE_SIZE,
        offset,
      }, token ?? undefined);
      if (!alive) return;
      if (r.data) {
        setProblems(prev => offset > 0 ? [...prev, ...r.data!.problems] : r.data!.problems);
        setTotal(r.data.total);
        setFacets(r.data.facets);
      }
      setLoading(false);
    }, search ? 350 : 0);
    return () => { alive = false; clearTimeout(t); };
  }, [subject, level, topic, year, search, offset, token]);

  const visible = useMemo(
    () => hideSolved ? problems.filter(p => !p.my?.solved) : problems,
    [problems, hideSolved],
  );

  const filtersActive = !!(subject || level || topic || year || search);

  return (
    <div className="container py-8 space-y-6">
      <div className="flex items-center gap-3 flex-wrap">
        <Button asChild variant="ghost" size="sm"><Link to="/olympiad"><ArrowLeft className="w-4 h-4 mr-1" />Олимпиады</Link></Button>
        <h1 className="text-2xl md:text-3xl font-extrabold flex items-center gap-2">
          <Trophy className="w-6 h-6 text-amber-500" /> Задачи
        </h1>
        <span className="text-sm text-muted-foreground">{total} в подборке</span>
      </div>

      {/* Фильтры */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center gap-2 text-sm font-semibold"><Filter className="w-4 h-4" /> Фильтры</div>

          {/* Уровни — чипы */}
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant={!level ? 'secondary' : 'outline'} onClick={() => setParam('level', '')}>Все этапы</Button>
            {LEVEL_ORDER.map(l => (
              <Button key={l} size="sm" variant={level === l ? 'secondary' : 'outline'} onClick={() => setParam('level', level === l ? '' : l)}>
                {LEVEL_META[l].short}
              </Button>
            ))}
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-2">
            <select value={subject} onChange={e => setParams({ subject: e.target.value, topic: '' })}
              className="h-10 rounded-lg border border-input bg-background px-3 text-sm">
              <option value="">Все предметы</option>
              {subjects.map(s => <option key={s.id} value={s.slug}>{s.name}</option>)}
            </select>
            <select value={topic} onChange={e => setParam('topic', e.target.value)}
              className="h-10 rounded-lg border border-input bg-background px-3 text-sm">
              <option value="">Все темы</option>
              {facets.topics.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            <select value={year} onChange={e => setParam('year', e.target.value)}
              className="h-10 rounded-lg border border-input bg-background px-3 text-sm">
              <option value="">Все годы</option>
              {facets.years.map(y => <option key={y} value={String(y)}>{y}</option>)}
            </select>
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input value={search} onChange={e => { setSearch(e.target.value); setOffset(0); }} placeholder="Поиск задач…" className="pl-9 h-10" />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {token && (
              <Button size="sm" variant="ghost" onClick={() => setHideSolved(v => !v)}>
                {hideSolved ? '👁 Показывать решённые' : '🙈 Скрывать решённые'}
              </Button>
            )}
            {filtersActive && (
              <Button size="sm" variant="ghost" onClick={() => { setSearchParams({}, { replace: true }); setSearch(''); setOffset(0); }}>
                Сбросить фильтры
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Список */}
      {loading && offset === 0 ? (
        <div className="space-y-3">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}</div>
      ) : visible.length === 0 ? (
        <Card><CardContent className="p-10 text-center text-muted-foreground">
          {hideSolved && problems.length > 0
            ? 'Все задачи в этой подборке решены — снимите фильтр или выберите другой этап.'
            : 'Задач по выбранным фильтрам не найдено. Попробуйте сбросить фильтры.'}
        </CardContent></Card>
      ) : (
        <div className="space-y-3">
          {visible.map(p => (
            <Link key={p.id} to={`/olympiad/problem/${p.id}`} className="block">
              <Card className={`hover:shadow-md hover:border-primary/40 transition-all ${p.my?.solved ? 'opacity-80' : ''}`}>
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <LevelBadge level={p.level} short />
                      {p.topic && <span className="text-xs text-muted-foreground">{p.topic}</span>}
                      {p.year && <span className="text-xs text-muted-foreground">· {p.year}</span>}
                    </div>
                    <p className="font-semibold mt-1 truncate">{p.title}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {p.my?.solved && <CheckCircle2 className="w-5 h-5 text-emerald-500" aria-label="Решена" />}
                    {p.my?.revealed && !p.my.solved && <Eye className="w-5 h-5 text-muted-foreground" aria-label="Разбор открыт" />}
                    <span className="text-sm font-bold text-amber-600 dark:text-amber-400 whitespace-nowrap">+{p.points}</span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
          {problems.length < total && (
            <div className="text-center pt-2">
              <Button variant="outline" disabled={loading} onClick={() => setOffset(problems.length)}>
                {loading ? 'Загрузка…' : `Показать ещё (${total - problems.length})`}
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
