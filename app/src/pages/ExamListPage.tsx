import { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowLeft, Clock, FileText, Award, Play, ClipboardList, CheckCircle2, RotateCcw,
  Search, SlidersHorizontal, X, LayoutGrid, Rows3,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { getSubjectBySlug, fetchExamsBySubjectId, type ExamSummary } from '@/data/subjects';
import { CardRowsSkeleton } from '@/components/Skeletons';
import { useAppStore } from '@/store/useAppStore';
import { examApi } from '@/lib/api/client';
import {
  enrichExam, sortExams, sizeLabel, SORT_OPTIONS,
  type EnrichedExam, type ExamSort,
} from '@/lib/examMeta';

type StatusFilter = 'all' | 'todo' | 'done';
type DurationFilter = 'all' | 'short' | 'medium' | 'long';

/** Список пробных экзаменов по предмету с фильтрами, поиском и сортировкой. */
export function ExamListPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const requireAuth = useAppStore((s) => s.requireAuth);
  const token = useAppStore((s) => s.token);

  const startExam = (examId: string) => {
    if (!requireAuth('Войдите или зарегистрируйтесь, чтобы проходить пробные экзамены.')) return;
    navigate(`/exam/${slug}/${examId}`);
  };

  const subject = slug ? getSubjectBySlug(slug) : undefined;
  const [exams, setExams] = useState<ExamSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set());

  // --- состояние фильтров ---
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<ExamSort>('new');
  const [tierFilter, setTierFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [durationFilter, setDurationFilter] = useState<DurationFilter>('all');
  const [grouped, setGrouped] = useState(true);

  useEffect(() => {
    if (!subject) return;
    setIsLoading(true);
    void fetchExamsBySubjectId(subject.id).then(setExams).finally(() => setIsLoading(false));
  }, [subject]);

  useEffect(() => {
    if (!subject || !token) return;
    void examApi.getCompleted(token, subject.id).then((r) => {
      if (r.data?.examIds) setCompletedIds(new Set(r.data.examIds));
    });
  }, [subject, token]);

  // Обогащаем экзамены производными полями (тир, корзина времени, решён ли).
  const enriched = useMemo(
    () => exams.map((e) => enrichExam(e, completedIds)),
    [exams, completedIds],
  );

  // Какие тиры реально присутствуют в данных (чтобы не показывать пустые чипы).
  const presentTiers = useMemo(() => {
    const map = new Map<string, EnrichedExam['tier']>();
    for (const e of enriched) if (!map.has(e.tier.key)) map.set(e.tier.key, e.tier);
    return [...map.values()].sort((a, b) => a.level - b.level);
  }, [enriched]);

  const hasDurationVariety = useMemo(
    () => new Set(enriched.map((e) => e.duration.key)).size > 1,
    [enriched],
  );

  const filtersActive =
    query.trim() !== '' || tierFilter !== 'all' || statusFilter !== 'all' || durationFilter !== 'all';

  const resetFilters = () => {
    setQuery('');
    setTierFilter('all');
    setStatusFilter('all');
    setDurationFilter('all');
  };

  // Применяем все фильтры + сортировку.
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = enriched.filter((e) => {
      if (q && !`${e.title} ${e.description ?? ''}`.toLowerCase().includes(q)) return false;
      if (tierFilter !== 'all' && e.tier.key !== tierFilter) return false;
      if (statusFilter === 'todo' && e.completed) return false;
      if (statusFilter === 'done' && !e.completed) return false;
      if (durationFilter !== 'all' && e.duration.key !== durationFilter) return false;
      return true;
    });
    return sortExams(list, sort);
  }, [enriched, query, tierFilter, statusFilter, durationFilter, sort]);

  // Группировка по тиру (визуальная группировка, чтобы экзамены не сливались).
  const groups = useMemo(() => {
    if (!grouped) return null;
    const map = new Map<string, { tier: EnrichedExam['tier']; items: EnrichedExam[] }>();
    for (const e of filtered) {
      const g = map.get(e.tier.key) ?? { tier: e.tier, items: [] };
      g.items.push(e);
      map.set(e.tier.key, g);
    }
    return [...map.values()].sort((a, b) => a.tier.level - b.tier.level);
  }, [filtered, grouped]);

  const doneCount = enriched.filter((e) => e.completed).length;

  if (!subject) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">Предмет не найден</h1>
          <Button onClick={() => navigate('/')}><ArrowLeft className="w-4 h-4 mr-2" />На главную</Button>
        </div>
      </div>
    );
  }

  const renderCard = (e: EnrichedExam, i: number) => (
    <motion.div
      key={e.id}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, delay: Math.min(i, 8) * 0.035 }}
    >
      <Card className="h-full overflow-hidden card-lift">
        <div className="h-1.5 w-full" style={{ background: e.tier.color }} />
        <CardContent className="p-5 flex flex-col h-full">
          <div className="flex items-start justify-between gap-2 mb-2">
            <div className="flex flex-wrap items-center gap-1.5">
              <span
                className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold text-white"
                style={{ background: e.tier.color }}
              >
                {e.tier.label}
              </span>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-muted text-muted-foreground">
                {sizeLabel(e.questionCount)}
              </span>
            </div>
            {e.completed && (
              <span className="shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 text-xs font-medium">
                <CheckCircle2 className="w-3.5 h-3.5" />Решён
              </span>
            )}
          </div>
          <h3 className="text-lg font-bold leading-snug">{e.title}</h3>
          {e.description && <p className="text-sm text-muted-foreground mt-1 mb-3 line-clamp-2">{e.description}</p>}
          <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-sm text-muted-foreground my-4 mt-auto">
            <span className="flex items-center gap-1.5"><FileText className="w-4 h-4" />{e.questionCount} заданий</span>
            <span className="flex items-center gap-1.5"><Clock className="w-4 h-4" />{e.durationMinutes} мин</span>
            {e.passingScore > 0 && (
              <span className="flex items-center gap-1.5"><Award className="w-4 h-4" />проходной {e.passingScore}</span>
            )}
          </div>
          <Button
            className="w-full gap-2 text-white"
            style={{ background: subject.color }}
            onClick={() => startExam(e.id)}
          >
            {e.completed
              ? <><RotateCcw className="w-4 h-4" />Пройти заново</>
              : <><Play className="w-4 h-4" />Начать экзамен</>}
          </Button>
        </CardContent>
      </Card>
    </motion.div>
  );

  return (
    <div className="min-h-screen bg-background">
      <main className="container py-8 max-w-5xl">
        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
          className="relative overflow-hidden rounded-3xl border bg-card/60 mb-6"
        >
          <div
            className="absolute -top-24 -right-16 w-80 h-80 rounded-full blur-[80px] opacity-20 pointer-events-none"
            style={{ background: subject.color }}
          />
          <div className="absolute inset-0 bg-grid-faint pointer-events-none" />
          <div className="relative px-6 py-7 md:px-9 md:py-9">
            <button
              type="button"
              onClick={() => navigate(`/subject/${slug}`)}
              className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors mb-4"
            >
              <ArrowLeft className="w-4 h-4" /> {subject.name}
            </button>
            <div className="flex flex-col sm:flex-row sm:items-center gap-5">
              <div
                className="w-14 h-14 rounded-2xl shadow-lg flex items-center justify-center text-white shrink-0"
                style={{ background: subject.color }}
              >
                <ClipboardList className="w-7 h-7" />
              </div>
              <div className="min-w-0 flex-1">
                <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">Пробные экзамены</h1>
                <p className="text-muted-foreground mt-1 max-w-2xl">
                  Подготовленные наборы заданий в формате ЦТ/ЦЭ с таймером и тестовым баллом.
                  {!isLoading && exams.length > 0 && (
                    <> Доступно: {exams.length}{doneCount > 0 && <>, решено: {doneCount}</>}.</>
                  )}
                </p>
              </div>
            </div>
          </div>
        </motion.div>

        {isLoading ? (
          <CardRowsSkeleton rows={4} />
        ) : exams.length === 0 ? (
          <Card className="p-12 text-center">
            <ClipboardList className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-30" />
            <h3 className="text-lg font-semibold mb-2">Экзамены пока не созданы</h3>
            <p className="text-muted-foreground mb-4 max-w-sm mx-auto">
              По этому предмету ещё нет готовых пробных экзаменов. Пока можно тренироваться в режиме практики.
            </p>
            <Button onClick={() => navigate(`/practice/${slug}`)} style={{ background: subject.color }}>
              Перейти к практике
            </Button>
          </Card>
        ) : (
          <>
            {/* Панель фильтров */}
            <Card className="mb-6">
              <CardContent className="p-4 sm:p-5 space-y-4">
                {/* Поиск + сортировка + переключатель группировки */}
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                    <Input
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder="Поиск по названию…"
                      className="pl-9"
                    />
                    {query && (
                      <button
                        type="button"
                        onClick={() => setQuery('')}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        aria-label="Очистить поиск"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  <Select value={sort} onValueChange={(v) => setSort(v as ExamSort)}>
                    <SelectTrigger className="sm:w-56">
                      <SlidersHorizontal className="w-4 h-4 mr-1 opacity-70" />
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SORT_OPTIONS.map((o) => (
                        <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    type="button"
                    variant="outline"
                    className="shrink-0"
                    onClick={() => setGrouped((g) => !g)}
                    title={grouped ? 'Показать одним списком' : 'Сгруппировать по уровню'}
                  >
                    {grouped ? <Rows3 className="w-4 h-4" /> : <LayoutGrid className="w-4 h-4" />}
                    <span className="hidden md:inline ml-1.5">{grouped ? 'Списком' : 'Группами'}</span>
                  </Button>
                </div>

                {/* Чипы фильтров */}
                <div className="flex flex-col gap-2.5">
                  {presentTiers.length > 1 && (
                    <ChipRow label="Уровень">
                      <Chip active={tierFilter === 'all'} onClick={() => setTierFilter('all')}>Все</Chip>
                      {presentTiers.map((t) => (
                        <Chip key={t.key} active={tierFilter === t.key} onClick={() => setTierFilter(t.key)} color={t.color}>
                          {t.label}
                        </Chip>
                      ))}
                    </ChipRow>
                  )}
                  <ChipRow label="Статус">
                    <Chip active={statusFilter === 'all'} onClick={() => setStatusFilter('all')}>Все</Chip>
                    <Chip active={statusFilter === 'todo'} onClick={() => setStatusFilter('todo')}>Не решённые</Chip>
                    <Chip active={statusFilter === 'done'} onClick={() => setStatusFilter('done')}>Решённые</Chip>
                  </ChipRow>
                  {hasDurationVariety && (
                    <ChipRow label="Время">
                      <Chip active={durationFilter === 'all'} onClick={() => setDurationFilter('all')}>Любое</Chip>
                      <Chip active={durationFilter === 'short'} onClick={() => setDurationFilter('short')}>до 1 ч</Chip>
                      <Chip active={durationFilter === 'medium'} onClick={() => setDurationFilter('medium')}>1–2,5 ч</Chip>
                      <Chip active={durationFilter === 'long'} onClick={() => setDurationFilter('long')}>более 2,5 ч</Chip>
                    </ChipRow>
                  )}
                </div>

                {/* Сводка + сброс */}
                <div className="flex items-center justify-between gap-3 pt-1 text-sm">
                  <span className="text-muted-foreground">
                    Найдено: <span className="font-semibold text-foreground">{filtered.length}</span> из {exams.length}
                  </span>
                  {filtersActive && (
                    <button
                      type="button"
                      onClick={resetFilters}
                      className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground font-medium"
                    >
                      <X className="w-3.5 h-3.5" />Сбросить фильтры
                    </button>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Результаты */}
            {filtered.length === 0 ? (
              <Card className="p-12 text-center">
                <Search className="w-10 h-10 mx-auto mb-3 text-muted-foreground opacity-30" />
                <h3 className="text-lg font-semibold mb-1">Ничего не найдено</h3>
                <p className="text-muted-foreground mb-4">Попробуйте изменить фильтры или поисковый запрос.</p>
                <Button variant="outline" onClick={resetFilters}>Сбросить фильтры</Button>
              </Card>
            ) : grouped && groups ? (
              <div className="space-y-8">
                {groups.map((g) => (
                  <section key={g.tier.key}>
                    <div className="flex items-center gap-2.5 mb-3">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ background: g.tier.color }} />
                      <h2 className="text-lg font-bold">{g.tier.label}</h2>
                      <span className="text-sm text-muted-foreground">· {g.items.length}</span>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                      {g.items.map((e, i) => renderCard(e, i))}
                    </div>
                  </section>
                ))}
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {filtered.map((e, i) => renderCard(e, i))}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}

/** Ряд чипов с подписью слева. */
function ChipRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="text-xs font-medium text-muted-foreground w-16 shrink-0">{label}</span>
      {children}
    </div>
  );
}

/** Кнопка-чип фильтра. */
function Chip({
  active, onClick, children, color,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  color?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-3 py-1 rounded-full text-sm font-medium border transition-colors ${
        active
          ? 'text-white border-transparent'
          : 'bg-background text-muted-foreground border-border hover:bg-muted hover:text-foreground'
      }`}
      style={active ? { background: color ?? 'hsl(var(--primary))' } : undefined}
    >
      {children}
    </button>
  );
}

export default ExamListPage;
