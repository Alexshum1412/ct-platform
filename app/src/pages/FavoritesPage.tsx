/**
 * Избранное: ВСЁ, что отложил пользователь — задания практики и статьи теории.
 * Вкладки с счётчиками, фильтр по предмету, сортировка; быстрый переход к
 * решению/чтению и удаление из избранного.
 */
import { useEffect, useState, useCallback, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Star, Filter, BookOpen, Trash2, ChevronRight, ListChecks } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MathFormula } from '@/components/ui/MathFormula';
import { useAppStore } from '@/store/useAppStore';
import { apiClient } from '@/lib/api/client';
import { PageHeader } from '@/components/PageHeader';
import type { Question } from '@/types';

interface FavoriteQuestion extends Question {
  subject?: { name: string; color: string; slug: string };
}

interface TheoryListItem {
  id: string;
  title: string;
  summary?: string | null;
  content: string;
  subjectId: string;
  subjectName: string | null;
  subjectColor: string | null;
  topicId: string | null;
  topicName: string | null;
}

type QuestionSort = 'recent' | 'hard' | 'easy';

export function FavoritesPage() {
  const navigate = useNavigate();
  const { user, token, removeFavorite, favoriteTheory, toggleFavoriteTheory } = useAppStore();
  const [questions, setQuestions] = useState<FavoriteQuestion[]>([]);
  const [theoryItems, setTheoryItems] = useState<TheoryListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [theoryLoading, setTheoryLoading] = useState(true);

  // Фильтры/сортировка
  const [subjectFilter, setSubjectFilter] = useState('all');
  const [sort, setSort] = useState<QuestionSort>('recent');

  const loadFavorites = useCallback(async () => {
    if (!token) { setIsLoading(false); return; }
    const res = await apiClient('/users/favorites', { token });
    if (res.data) {
      const favs = res.data as Array<{ questionId: string }>;
      const loaded: FavoriteQuestion[] = [];
      await Promise.all(favs.map(async f => {
        const qRes = await apiClient(`/questions/${f.questionId}`);
        if (qRes.data) loaded.push(qRes.data as FavoriteQuestion);
      }));
      setQuestions(loaded);
    }
    setIsLoading(false);
  }, [token]);

  useEffect(() => { void loadFavorites(); }, [loadFavorites]);

  // Теория: тянем каталог один раз и фильтруем по локальному избранному.
  useEffect(() => {
    if (favoriteTheory.length === 0) { setTheoryItems([]); setTheoryLoading(false); return; }
    setTheoryLoading(true);
    void apiClient('/theory?limit=2000').then(res => {
      if (res.data) {
        const all = ((res.data as { items: TheoryListItem[] }).items ?? []);
        const favSet = new Set(favoriteTheory);
        setTheoryItems(all.filter(t => favSet.has(t.id)));
      }
      setTheoryLoading(false);
    });
  }, [favoriteTheory]);

  const handleRemoveQuestion = async (questionId: string) => {
    await removeFavorite(questionId);
    setQuestions(prev => prev.filter(q => q.id !== questionId));
  };

  // Доступные предметы из обоих списков — для общего фильтра
  const subjectOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const q of questions) if (q.subject?.slug) map.set(q.subject.slug, q.subject.name);
    for (const t of theoryItems) if (t.subjectId) map.set(t.subjectId, t.subjectName ?? t.subjectId);
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [questions, theoryItems]);

  const visibleQuestions = useMemo(() => {
    let list = subjectFilter === 'all' ? questions : questions.filter(q => q.subject?.slug === subjectFilter);
    if (sort === 'hard') list = [...list].sort((a, b) => b.difficulty - a.difficulty);
    if (sort === 'easy') list = [...list].sort((a, b) => a.difficulty - b.difficulty);
    // 'recent' — порядок API (последние добавленные первыми)
    return list;
  }, [questions, subjectFilter, sort]);

  const visibleTheory = useMemo(
    () => subjectFilter === 'all' ? theoryItems : theoryItems.filter(t => t.subjectId === subjectFilter),
    [theoryItems, subjectFilter],
  );

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="p-8 text-center max-w-sm">
          <Star className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground mb-4">Войдите, чтобы видеть избранное</p>
          <Button onClick={() => navigate('/login')}>Войти</Button>
        </Card>
      </div>
    );
  }

  const difficultyLabel: Record<number, string> = { 1: 'Лёгкий', 2: 'Средний', 3: 'Сложный', 4: 'Очень сложный', 5: 'Эксперт' };
  const difficultyColor: Record<number, string> = {
    1: 'bg-green-100 text-green-700', 2: 'bg-blue-100 text-blue-700',
    3: 'bg-yellow-100 text-yellow-700', 4: 'bg-orange-100 text-orange-700', 5: 'bg-red-100 text-red-700',
  };

  const totalCount = questions.length + theoryItems.length;

  return (
    <div className="min-h-screen bg-background">
      <main className="container py-8 max-w-3xl">
        <PageHeader
          icon={Star}
          title="Избранное"
          subtitle={isLoading ? 'Загружаем подборку…' : `${totalCount} материалов в вашей коллекции — задания и теория в одном месте.`}
          accent="from-amber-400 to-amber-600"
        />

        {/* Общие фильтры */}
        <div className="flex flex-wrap items-center gap-2 mb-6">
          <select
            value={subjectFilter}
            onChange={e => setSubjectFilter(e.target.value)}
            className="h-10 rounded-lg border border-input bg-background px-3 text-sm"
          >
            <option value="all">Все предметы</option>
            {subjectOptions.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <select
            value={sort}
            onChange={e => setSort(e.target.value as QuestionSort)}
            className="h-10 rounded-lg border border-input bg-background px-3 text-sm"
            title="Сортировка заданий"
          >
            <option value="recent">Сначала новые</option>
            <option value="hard">Сначала сложные</option>
            <option value="easy">Сначала лёгкие</option>
          </select>
          {subjectFilter !== 'all' && (
            <Button variant="ghost" size="sm" onClick={() => setSubjectFilter('all')}>Сбросить</Button>
          )}
        </div>

        <Tabs defaultValue="questions">
          <TabsList className="mb-6 h-auto flex-wrap justify-start gap-1">
            <TabsTrigger value="questions" className="gap-2">
              <ListChecks className="w-4 h-4" />Задания
              <Badge variant="secondary" className="text-xs">{visibleQuestions.length}</Badge>
            </TabsTrigger>
            <TabsTrigger value="theory" className="gap-2">
              <BookOpen className="w-4 h-4" />Теория
              <Badge variant="secondary" className="text-xs">{visibleTheory.length}</Badge>
            </TabsTrigger>
          </TabsList>

          {/* ---- Задания ---- */}
          <TabsContent value="questions">
            {isLoading ? (
              <div className="space-y-4">{[1, 2, 3].map(i => <Skeleton key={i} className="h-32 rounded-xl" />)}</div>
            ) : visibleQuestions.length === 0 ? (
              <div className="text-center py-16">
                <Star className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-20" />
                <h2 className="text-xl font-semibold mb-2">
                  {questions.length === 0 ? 'Нет избранных заданий' : 'Нет заданий по фильтру'}
                </h2>
                <p className="text-muted-foreground mb-6">
                  Нажмите ⭐ на карточке задания, чтобы добавить его в избранное
                </p>
                <Button onClick={() => navigate('/')}>
                  <BookOpen className="w-4 h-4 mr-2" />
                  Найти задания
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {visibleQuestions.map((q, i) => (
                  <motion.div key={q.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i, 8) * 0.05 }}>
                    <Card className="overflow-hidden hover:shadow-md transition-shadow">
                      <CardContent className="p-5">
                        <div className="flex items-start justify-between gap-4 mb-3">
                          <div className="flex flex-wrap gap-2">
                            <Badge variant="outline" className="text-xs font-mono">#{q.externalId ?? q.id.slice(-6)}</Badge>
                            {q.subject?.name && <Badge className="text-xs" style={{ background: q.subject.color }}>{q.subject.name}</Badge>}
                            {q.section && <Badge variant="secondary" className="text-xs">{q.section}</Badge>}
                            <Badge className={`text-xs ${difficultyColor[q.difficulty]}`}>{difficultyLabel[q.difficulty]}</Badge>
                            {q.part && <Badge variant="outline" className="text-xs">Часть {q.part}</Badge>}
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <Button variant="ghost" size="icon" className="w-8 h-8 text-destructive hover:text-destructive" title="Убрать из избранного" onClick={() => handleRemoveQuestion(q.id)}>
                              <Trash2 className="w-4 h-4" />
                            </Button>
                            <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                          </div>
                        </div>
                        <MathFormula formula={q.content} className="text-base mb-4" />
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3 text-xs text-muted-foreground">
                            <span>{q.timesSolved} решений</span>
                            <span>{q.timesSolved > 0 ? Math.round((q.timesCorrect / q.timesSolved) * 100) : 0}% верно</span>
                          </div>
                          <Link to={`/practice/${q.subject?.slug ?? q.subjectId}?question=${q.id}`}>
                            <Button size="sm" variant="outline" className="gap-1.5">
                              <Filter className="w-3 h-3" />
                              Решить
                            </Button>
                          </Link>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            )}
          </TabsContent>

          {/* ---- Теория ---- */}
          <TabsContent value="theory">
            {theoryLoading ? (
              <div className="space-y-4">{[1, 2].map(i => <Skeleton key={i} className="h-28 rounded-xl" />)}</div>
            ) : visibleTheory.length === 0 ? (
              <div className="text-center py-16">
                <BookOpen className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-20" />
                <h2 className="text-xl font-semibold mb-2">
                  {theoryItems.length === 0 ? 'Нет избранной теории' : 'Нет статей по фильтру'}
                </h2>
                <p className="text-muted-foreground mb-6">
                  Нажмите ⭐ на статье в каталоге теории, чтобы сохранить её здесь
                </p>
                <Button onClick={() => navigate('/theory')}>
                  <BookOpen className="w-4 h-4 mr-2" />
                  Открыть теорию
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {visibleTheory.map((t, i) => (
                  <motion.div key={t.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i, 8) * 0.05 }}>
                    <Card className="overflow-hidden hover:shadow-md transition-shadow">
                      <CardContent className="p-5">
                        <div className="flex items-start justify-between gap-3 mb-2">
                          <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap min-w-0">
                            <span className="inline-flex items-center gap-1.5 font-medium" style={{ color: t.subjectColor ?? undefined }}>
                              <span className="w-2.5 h-2.5 rounded-full" style={{ background: t.subjectColor ?? 'currentColor' }} />
                              {t.subjectName}
                            </span>
                            {t.topicName && (<><ChevronRight className="w-3.5 h-3.5 shrink-0" /><span className="truncate">{t.topicName}</span></>)}
                          </div>
                          <button
                            onClick={() => toggleFavoriteTheory(t.id)}
                            className="p-2 -mr-2 -mt-1 rounded-lg hover:bg-muted transition-colors shrink-0"
                            title="Убрать из избранного"
                          >
                            <Star className="w-5 h-5 fill-amber-400 text-amber-400" />
                          </button>
                        </div>
                        <h3 className="text-lg font-bold mb-1.5">{t.title}</h3>
                        <div className="text-sm text-muted-foreground line-clamp-2 mb-4">
                          <MathFormula formula={(t.summary || t.content).slice(0, 180)} inline />
                        </div>
                        <Link to={`/theory/${t.subjectId}/${t.topicId ?? ''}`}>
                          <Button size="sm" variant="outline" className="gap-1.5">
                            <BookOpen className="w-3 h-3" />
                            Читать
                          </Button>
                        </Link>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

export default FavoritesPage;
