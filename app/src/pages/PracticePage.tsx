import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Filter, RotateCcw, Crown, ChevronRight, List, FileText, AlertTriangle, PanelLeftClose, PanelLeftOpen, Maximize2, Minimize2, Inbox, Flame, FilterX, PartyPopper } from 'lucide-react';
import { QuestionSkeleton } from '@/components/Skeletons';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { QuestionCard } from '@/components/question/QuestionCard';
import { PremiumModal } from '@/components/PremiumModal';
import { ReportModal } from '@/components/question/ReportModal';
import { getSubjectBySlug, fetchQuestionsBySubjectId, fetchTopicsBySubjectId, fetchSubtopicsByTopicId } from '@/data/subjects';
import { questionsApi, dailyApi, userApi } from '@/lib/api/client';
import { useAppStore } from '@/store/useAppStore';
import type { Question, Topic, DailyLimit } from '@/types';

export function PracticePage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const questionId = searchParams.get('question');
  const idsParam = searchParams.get('ids'); // error-retrain: practice only these question IDs

  const subject = slug ? getSubjectBySlug(slug) : undefined;
  const {
    token,
    focusMode,
    setFocusMode,
    practiceSidebarCollapsed,
    setPracticeSidebarCollapsed,
    clearLocalProgress,
    fetchUserStats,
    addNotification,
  } = useAppStore();
  const [resetting, setResetting] = useState(false);
  const questionStartTimeRef = useRef<number>(0);
  const [allQuestions, setAllQuestions] = useState<Question[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dailyLimit, setDailyLimit] = useState<DailyLimit | null>(null);
  const [showPremiumModal, setShowPremiumModal] = useState(false);
  const [reportQuestionId, setReportQuestionId] = useState<string | null>(null);
  const [practiceMode, setPracticeMode] = useState<'single' | 'feed'>(() => (localStorage.getItem('practice-mode') as 'single' | 'feed') || 'single');
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [onlyFavorites, setOnlyFavorites] = useState(false);
  const favorites = useAppStore(state => state.favorites);
  // Подписка на решённые задания — чтобы реактивно показать экран «всё решено».
  const solvedQuestions = useAppStore(state => state.solvedQuestions);

  const [filteredQuestions, setFilteredQuestions] = useState<Question[]>([]);
  useEffect(() => {
    questionStartTimeRef.current = Date.now();
  }, []);

  // Leaving practice should never trap the user in Focus mode on another page.
  useEffect(() => () => setFocusMode(false), [setFocusMode]);

  useEffect(() => {
    if (!token) return;
    void dailyApi.getStatus(token).then(res => {
      if (res.data) setDailyLimit(res.data as DailyLimit);
    });
  }, [token]);

  useEffect(() => {
    if (!subject) return;
    setIsLoading(true);
    // Fetch all questions for proper filtering (not paginated)
    void Promise.all([
      fetchQuestionsBySubjectId(subject.id, { limit: 500 }),
      fetchTopicsBySubjectId(subject.id),
    ])
      .then(([questionsData, topicsData]) => {
        setAllQuestions(questionsData);
        setFilteredQuestions(questionsData);
        setTopics(topicsData);
      })
      .finally(() => setIsLoading(false));
  }, [subject]);

  const [selectedTopic, setSelectedTopic] = useState<string>('all');
  const [selectedSubtopic, setSelectedSubtopic] = useState<string>('all');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'default' | 'newest' | 'difficulty-asc' | 'difficulty-desc'>('default');
  const [selectedPart, setSelectedPart] = useState<string>('all');
  const [selectedSection, setSelectedSection] = useState<string>('all');
  const [subtopics, setSubtopics] = useState<Array<{ id: string; name: string }>>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  // Лента подгружается порциями — иначе при сотнях заданий страница тормозит.
  const [feedCount, setFeedCount] = useState(10);
  const [answeredQuestions, setAnsweredQuestions] = useState<Set<string>>(new Set());
  const [correctAnswers, setCorrectAnswers] = useState<Set<string>>(new Set());
  // Серия правильных ответов подряд (в рамках сессии практики)
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  useEffect(() => { setBestStreak((b) => Math.max(b, streak)); }, [streak]);
  const handleResult = (correct: boolean) => setStreak((prev) => (correct ? prev + 1 : 0));

  // Apply URL filter parameters (topic, subtopic) on first load
  const initialTopicParam = searchParams.get('topic');
  const initialSubtopicParam = searchParams.get('subtopic');
  useEffect(() => {
    if (initialTopicParam && topics.some(t => t.id === initialTopicParam)) {
      setSelectedTopic(initialTopicParam);
    }
  }, [initialTopicParam, topics]);
  useEffect(() => {
    if (initialSubtopicParam) {
      // Need to find which topic this subtopic belongs to
      // It will be filtered correctly even if selectedTopic is 'all'
      setSelectedSubtopic(initialSubtopicParam);
    }
  }, [initialSubtopicParam]);

  // Derive unique sections from loaded questions
  const availableSections = [...new Set(allQuestions.map(q => q.section).filter(Boolean))] as string[];

  // Only offer topics/subtopics that actually contain questions, with live counts —
  // avoids dead-end filter options (the subject has theory-only topics too).
  const topicQCount: Record<string, number> = {};
  const subtopicQCount: Record<string, number> = {};
  for (const q of allQuestions) {
    if (q.topicId) topicQCount[q.topicId] = (topicQCount[q.topicId] || 0) + 1;
    if (q.subtopicId) subtopicQCount[q.subtopicId] = (subtopicQCount[q.subtopicId] || 0) + 1;
  }
  const topicsWithQuestions = topics.filter(t => (topicQCount[t.id] || 0) > 0);
  const subtopicsWithQuestions = subtopics.filter(s => (subtopicQCount[s.id] || 0) > 0);

  // Filter questions
  useEffect(() => {
    let filtered = [...allQuestions];
    // Error-retrain mode (from exam results) — restrict to the given question IDs.
    if (idsParam) {
      const idSet = new Set(idsParam.split(',').filter(Boolean));
      filtered = filtered.filter(q => idSet.has(q.id));
    }
    if (selectedTopic !== 'all') filtered = filtered.filter(q => q.topicId === selectedTopic);
    if (selectedSubtopic !== 'all') filtered = filtered.filter(q => q.subtopicId === selectedSubtopic);
    if (selectedDifficulty !== 'all') filtered = filtered.filter(q => q.difficulty === parseInt(selectedDifficulty));
    if (selectedPart !== 'all') filtered = filtered.filter(q => q.part === selectedPart);
    if (selectedSection !== 'all') filtered = filtered.filter(q => q.section === selectedSection);
    if (onlyFavorites) filtered = filtered.filter(q => favorites.includes(q.id));
    // Sorting
    if (sortBy === 'difficulty-asc') filtered.sort((a, b) => a.difficulty - b.difficulty);
    else if (sortBy === 'difficulty-desc') filtered.sort((a, b) => b.difficulty - a.difficulty);
    else if (sortBy === 'newest') filtered.sort((a, b) => {
      const da = new Date((a as { createdAt?: string }).createdAt || 0).getTime();
      const db = new Date((b as { createdAt?: string }).createdAt || 0).getTime();
      return db - da;
    });
    setFilteredQuestions(filtered);
    // If a question is deep-linked (?question=id), focus it within the filtered
    // list; otherwise start at the top. Done here (after filtering) so it isn't
    // clobbered by a separate effect, and so the index matches filteredQuestions.
    const focusIdx = questionId ? filtered.findIndex(q => q.id === questionId) : -1;
    setCurrentQuestionIndex(focusIdx >= 0 ? focusIdx : 0);
    setFeedCount(10); // новая выборка — начинаем ленту заново
  }, [selectedTopic, selectedSubtopic, selectedDifficulty, sortBy, selectedPart, selectedSection, onlyFavorites, favorites, allQuestions, idsParam, questionId]);

  // A deep-linked single question (?question=id) must show in single mode so the
  // focused index is actually visible. Don't persist — leave the saved preference.
  useEffect(() => { if (questionId) setPracticeMode('single'); }, [questionId]);

  // Load subtopics when topic changes
  useEffect(() => {
    if (selectedTopic === 'all') { setSubtopics([]); setSelectedSubtopic('all'); return; }
    void fetchSubtopicsByTopicId(selectedTopic).then(data => {
      setSubtopics(data.map(s => ({ id: s.id, name: s.name })));
    });
    setSelectedSubtopic('all');
  }, [selectedTopic]);

  const currentQuestion = filteredQuestions[currentQuestionIndex];

  // Сколько заданий из текущей выборки уже решено (по сохранённому прогрессу).
  const solvedIdSet = new Set(solvedQuestions.map((s) => s.questionId));
  const solvedInFilter = filteredQuestions.reduce((n, q) => n + (solvedIdSet.has(q.id) ? 1 : 0), 0);
  // Все задания выборки решены — показываем поздравительный экран вместо
  // бесконечного перерешивания последнего задания.
  const allSolved = filteredQuestions.length > 0 && solvedInFilter === filteredQuestions.length;

  // Принимает САМ отвеченный вопрос — в режиме «Лента» отвечают любую карточку,
  // а не текущую по индексу (иначе прогресс/сабмит писались бы не на тот вопрос).
  const handleAnswer = async (answer: string, question: Question) => {
    if (!question) return;

    const timeSpent = Math.round((Date.now() - questionStartTimeRef.current) / 1000);

    if (token) {
      const result = await questionsApi.submitAnswer(
        { questionId: question.id, answer, timeSpent },
        token
      );

      if (result.error?.includes('Дневной лимит') || (result as { error?: string; code?: string }).code === 'DAILY_LIMIT_REACHED') {
        setShowPremiumModal(true);
        return;
      }

      // Update daily limit in state
      const data = result.data as { dailyCount?: number; dailyLimit?: number; isCorrect?: boolean } | undefined;
      if (dailyLimit && data?.dailyCount !== undefined && data.dailyCount !== null) {
        setDailyLimit(prev => prev ? { ...prev, count: data.dailyCount!, remaining: Math.max(0, prev.limit - data.dailyCount!) } : prev);
      }
    }

    setAnsweredQuestions(prev => new Set(prev).add(question.id));
    if (answer === question.correctAnswer) {
      setCorrectAnswers(prev => new Set(prev).add(question.id));
    }
  };

  const handleNext = () => {
    if (currentQuestionIndex < filteredQuestions.length - 1) {
      questionStartTimeRef.current = Date.now();
      setCurrentQuestionIndex(prev => prev + 1);
    }
  };

  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      questionStartTimeRef.current = Date.now();
      setCurrentQuestionIndex(prev => prev - 1);
    }
  };

  // Полный сброс прогресса: чистим серверные ответы/достижения/геймификацию,
  // локальное состояние (решённые/серии) и обновляем статистику. После этого
  // задания снова можно решать (снимается блокировка «уже решено»).
  const handleReset = async () => {
    setResetting(true);
    if (token) {
      await userApi.resetProgress(token);
      void fetchUserStats();
    }
    clearLocalProgress();
    setAnsweredQuestions(new Set());
    setCorrectAnswers(new Set());
    setStreak(0);
    setBestStreak(0);
    setCurrentQuestionIndex(0);
    resetFilters();
    setShowResetConfirm(false);
    setResetting(false);
    addNotification({ type: 'success', title: 'Прогресс сброшен', message: 'Все ответы очищены — можно решать заново.' });
  };

  // Сброс только фильтров/сортировки — прогресс сессии не трогаем.
  const resetFilters = () => {
    setSelectedPart('all');
    setSelectedSection('all');
    setSelectedTopic('all');
    setSelectedSubtopic('all');
    setSelectedDifficulty('all');
    setSortBy('default');
    setOnlyFavorites(false);
  };

  // Активен ли хоть один фильтр (для подсветки кнопки «Сбросить фильтры»).
  const filtersActive =
    selectedPart !== 'all' || selectedSection !== 'all' || selectedTopic !== 'all' ||
    selectedSubtopic !== 'all' || selectedDifficulty !== 'all' || sortBy !== 'default' || onlyFavorites;

  const togglePracticeMode = (mode: 'single' | 'feed') => {
    setPracticeMode(mode);
    localStorage.setItem('practice-mode', mode);
  };

  // Keyboard shortcuts for Focus mode: Esc exits, ←/→ navigate (single mode).
  useEffect(() => {
    if (!focusMode) return;
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      const typing = !!el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable);
      if (e.key === 'Escape') { setFocusMode(false); return; }
      if (typing || practiceMode !== 'single') return;
      if (e.key === 'ArrowRight') {
        questionStartTimeRef.current = Date.now();
        setCurrentQuestionIndex(prev => Math.min(prev + 1, filteredQuestions.length - 1));
      }
      if (e.key === 'ArrowLeft') {
        questionStartTimeRef.current = Date.now();
        setCurrentQuestionIndex(prev => Math.max(prev - 1, 0));
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [focusMode, practiceMode, filteredQuestions.length, setFocusMode]);

  if (!subject) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">Предмет не найден</h1>
          <Button onClick={() => navigate('/')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            На главную
          </Button>
        </div>
      </div>
    );
  }

  const accuracy = answeredQuestions.size > 0
    ? Math.round((correctAnswers.size / answeredQuestions.size) * 100)
    : 0;

  // Поздравительный экран «всё решено» — показывается, когда все задания текущей
  // выборки пройдены (вместо возможности бесконечно перерешивать последнее).
  const completionBanner = !isLoading && allSolved ? (
    <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
      <Card className="border-green-400/60 bg-green-50 dark:bg-green-950/20">
        <CardContent className="p-6 text-center">
          <div className="w-14 h-14 rounded-2xl bg-green-500/15 flex items-center justify-center mx-auto mb-3">
            <PartyPopper className="w-7 h-7 text-green-600 dark:text-green-400" />
          </div>
          <h3 className="text-xl font-bold mb-1">Вы решили все задания! 🎉</h3>
          <p className="text-muted-foreground mb-4 max-w-md mx-auto">
            Все {filteredQuestions.length} {filteredQuestions.length === 1 ? 'задание' : 'заданий'} из выбранной
            подборки пройдены. Решённые задания повторно решать нельзя — {filtersActive
              ? 'сбросьте фильтры или выберите другую тему.'
              : 'выберите другой предмет или загляните в теорию.'}
          </p>
          <div className="flex flex-wrap gap-3 justify-center">
            {filtersActive && (
              <Button variant="default" className="gap-2" onClick={resetFilters}>
                <FilterX className="w-4 h-4" />Сбросить фильтры
              </Button>
            )}
            <Button variant="outline" onClick={() => navigate(`/subject/${slug}`)}>К предмету</Button>
            <Button variant="outline" onClick={() => navigate(`/theory/${slug}`)}>К теории</Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  ) : null;

  // Shared question renderer — identical content in normal and Focus layouts.
  const questionArea = isLoading ? (
    <div className="space-y-6">
      <QuestionSkeleton />
      {practiceMode === 'feed' && <QuestionSkeleton />}
    </div>
  ) : filteredQuestions.length === 0 ? (
    <Card className="p-12 text-center">
      <Inbox className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-30" />
      <h3 className="text-lg font-semibold mb-2">Заданий не нашлось</h3>
      <p className="text-muted-foreground mb-4 max-w-sm mx-auto">
        {onlyFavorites
          ? 'В избранном нет заданий из этого предмета. Добавляйте их через ⭐ на карточке задания.'
          : 'Нет заданий, соответствующих выбранным фильтрам. Попробуйте сбросить фильтры.'}
      </p>
      {onlyFavorites ? (
        <Button variant="outline" onClick={() => setOnlyFavorites(false)}>Показать все задания</Button>
      ) : (
        <Button variant="outline" onClick={resetFilters}>Сбросить фильтры</Button>
      )}
    </Card>
  ) : practiceMode === 'feed' ? (
    <div className="space-y-6">
      {filteredQuestions.slice(0, feedCount).map((q) => (
        <motion.div key={q.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <QuestionCard
            question={q}
            onAnswer={(a) => handleAnswer(a, q)}
            onResult={handleResult}
            onReport={() => setReportQuestionId(q.id)}
            onShowTheory={q.topicId ? () => navigate(`/theory/${slug}/${q.topicId}`) : undefined}
          />
        </motion.div>
      ))}
      {feedCount < filteredQuestions.length && (
        <Button
          variant="outline"
          size="lg"
          className="w-full"
          onClick={() => setFeedCount((c) => c + 10)}
        >
          Показать ещё ({filteredQuestions.length - feedCount})
        </Button>
      )}
    </div>
  ) : currentQuestion ? (
    <>
      <AnimatePresence mode="wait">
        <motion.div
          key={currentQuestion.id}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.3 }}
        >
          <QuestionCard
            question={currentQuestion}
            onAnswer={(a) => handleAnswer(a, currentQuestion)}
            onResult={handleResult}
            onNext={handleNext}
            onReport={() => setReportQuestionId(currentQuestion.id)}
            onShowTheory={currentQuestion.topicId ? () => navigate(`/theory/${slug}/${currentQuestion.topicId}`) : undefined}
          />
        </motion.div>
      </AnimatePresence>

      <div className="flex items-center justify-between gap-3 mt-6">
        <Button variant="outline" size="lg" onClick={handlePrevious} disabled={currentQuestionIndex === 0}>
          ← Предыдущее
        </Button>
        <span className="text-sm text-muted-foreground whitespace-nowrap tabular-nums">
          {currentQuestionIndex + 1} из {filteredQuestions.length}
        </span>
        <Button variant="outline" size="lg" onClick={handleNext} disabled={currentQuestionIndex === filteredQuestions.length - 1}>
          Следующее →
        </Button>
      </div>
    </>
  ) : null;

  // Modals are rendered in both layouts (daily-limit upsell can fire in Focus too).
  const modals = (
    <>
      <PremiumModal
        isOpen={showPremiumModal}
        onClose={() => setShowPremiumModal(false)}
        reason="daily_limit"
        dailyCount={dailyLimit?.count}
        dailyLimit={dailyLimit?.limit}
        resetAt={dailyLimit?.resetAt}
      />
      <ReportModal
        questionId={reportQuestionId ?? ''}
        isOpen={!!reportQuestionId}
        onClose={() => setReportQuestionId(null)}
      />
    </>
  );

  // ============================ FOCUS MODE ============================
  // Distraction-free workspace: only the question & answers. All chrome —
  // the global header, filters, navigator and stats — is hidden.
  if (focusMode) {
    return (
      <div className="min-h-screen bg-background">
        {modals}
        <div className="sticky top-0 z-40 bg-background/85 backdrop-blur-md border-b border-border/60">
          <div className="mx-auto w-full max-w-3xl px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
            <div className="flex items-center gap-2 min-w-0">
              <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: subject.color }} />
              <span className="font-semibold truncate">{subject.name}</span>
              <span className="hidden sm:inline text-sm text-muted-foreground">· Фокус-режим</span>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              {streak > 0 && (
                <span className="inline-flex items-center gap-1 text-sm font-semibold text-amber-500" title="Серия правильных ответов">
                  <Flame className="w-4 h-4 fill-amber-500" />{streak}
                </span>
              )}
              {token && dailyLimit && !dailyLimit.isPremium && (
                <span className="hidden sm:inline text-sm text-muted-foreground tabular-nums">
                  {dailyLimit.count}/{dailyLimit.limit} сегодня
                </span>
              )}
              <Button variant="outline" size="sm" className="gap-2" onClick={() => setFocusMode(false)}>
                <Minimize2 className="w-4 h-4" />
                <span className="hidden sm:inline">Выйти из фокуса</span>
                <kbd className="hidden md:inline ml-1 text-[10px] px-1.5 py-0.5 rounded border border-border bg-muted font-sans">Esc</kbd>
              </Button>
            </div>
          </div>
        </div>
        <main className="mx-auto w-full max-w-3xl px-4 sm:px-6 py-8 sm:py-10">
          {completionBanner}
          {questionArea}
        </main>
      </div>
    );
  }

  // ============================ NORMAL MODE ============================
  return (
    <div className="min-h-screen bg-background">
      {modals}

      {/* Reset Confirmation */}
      {showResetConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <Card className="max-w-md w-full">
            <CardContent className="p-6">
              <div className="flex gap-3 items-start mb-4">
                <div className="w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-5 h-5 text-destructive" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg mb-1">Сбросить весь прогресс?</h3>
                  <p className="text-sm text-muted-foreground">
                    Будут <strong>безвозвратно</strong> удалены все ваши ответы, статистика, достижения,
                    XP, уровень и серии — и на этом устройстве, и на сервере. После сброса задания можно
                    решать заново. Аккаунт, подписка и баланс игр не затрагиваются.
                  </p>
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <Button variant="outline" className="flex-1" onClick={() => setShowResetConfirm(false)} disabled={resetting}>
                  Отмена
                </Button>
                <Button variant="destructive" className="flex-1" onClick={handleReset} disabled={resetting}>
                  <RotateCcw className="w-4 h-4 mr-2" />{resetting ? 'Сброс…' : 'Да, сбросить'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/85 backdrop-blur-md border-b border-border">
        <div className="container py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <Button variant="ghost" size="icon" onClick={() => navigate(`/subject/${slug}`)} title="К предмету">
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <button
                onClick={() => navigate('/')}
                className="text-left hover:opacity-70 transition-opacity min-w-0"
                title="К списку предметов"
              >
                <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2 truncate">
                  {subject.name}
                  <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                </h1>
                <p className="text-sm text-muted-foreground">Режим практики</p>
              </button>
            </div>

            <div className="flex items-center gap-2 sm:gap-4 shrink-0">
              {/* Live stats */}
              <div className="hidden md:flex items-center gap-5">
                {/* Daily limit indicator */}
                {token && dailyLimit && !dailyLimit.isPremium && (
                  <div className="flex items-center gap-2">
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">Заданий сегодня</p>
                      <p className="text-sm font-semibold tabular-nums">{dailyLimit.count} / {dailyLimit.limit}</p>
                    </div>
                    <div className="w-16">
                      <Progress value={(dailyLimit.count / dailyLimit.limit) * 100} className="h-1.5" />
                    </div>
                    {(dailyLimit.remaining ?? 10) <= 3 && (
                      <Button size="sm" variant="outline" className="gap-1 text-amber-600 border-amber-300" onClick={() => setShowPremiumModal(true)}>
                        <Crown className="w-3 h-3" />
                        Premium
                      </Button>
                    )}
                  </div>
                )}
                {token && dailyLimit?.isPremium && (
                  <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 gap-1">
                    <Crown className="w-3 h-3" />
                    Premium
                  </Badge>
                )}
                <div className="text-center">
                  <p className="text-2xl font-bold leading-none tabular-nums">{answeredQuestions.size}</p>
                  <p className="text-xs text-muted-foreground mt-1">Решено</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-green-600 leading-none tabular-nums">{accuracy}%</p>
                  <p className="text-xs text-muted-foreground mt-1">Точность</p>
                </div>
                <div className="text-center">
                  <p className={`text-2xl font-bold leading-none tabular-nums flex items-center justify-center gap-0.5 ${streak > 0 ? 'text-amber-500' : 'text-muted-foreground'}`}>
                    <Flame className={`w-5 h-5 ${streak >= 3 ? 'fill-amber-500' : ''}`} />{streak}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">Серия</p>
                </div>
              </div>

              {/* Workspace controls */}
              <div className="hidden md:block w-px h-8 bg-border" />
              <Button
                variant="outline"
                size="sm"
                className="hidden lg:inline-flex gap-2"
                onClick={() => setPracticeSidebarCollapsed(!practiceSidebarCollapsed)}
                title={practiceSidebarCollapsed ? 'Показать панель фильтров' : 'Скрыть панель фильтров'}
              >
                {practiceSidebarCollapsed ? <PanelLeftOpen className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
                <span className="hidden xl:inline">{practiceSidebarCollapsed ? 'Фильтры' : 'Скрыть'}</span>
              </Button>
              <Button
                variant="default"
                size="sm"
                className="gap-2"
                onClick={() => setFocusMode(true)}
                title="Фокус-режим — только задание и ответы"
              >
                <Maximize2 className="w-4 h-4" />
                <span className="hidden sm:inline">Фокус</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container py-8">
        <div className={`grid grid-cols-1 gap-6 lg:gap-8 ${practiceSidebarCollapsed ? 'lg:grid-cols-1' : 'lg:grid-cols-4'}`}>
          {/* Sidebar — Filters & Navigator. Collapsible on desktop; on mobile it
              always stacks into view (so a persisted collapse can't hide it there). */}
          {(
            <motion.aside
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              className={`space-y-6 ${practiceSidebarCollapsed ? 'lg:hidden' : 'lg:col-span-1'}`}
            >
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Filter className="w-4 h-4" />
                    Фильтры
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Favorites Toggle */}
                  {token && (
                    <button
                      onClick={() => setOnlyFavorites(v => !v)}
                      className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg border-2 transition-all ${
                        onlyFavorites
                          ? 'border-amber-400 bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400'
                          : 'border-border hover:border-amber-300'
                      }`}
                    >
                      <span className="text-sm font-medium flex items-center gap-1.5">
                        ⭐ Только избранные
                      </span>
                      <span className="text-xs">{favorites.length}</span>
                    </button>
                  )}

                  {/* Part A/B Filter */}
                  <div>
                    <label className="text-sm font-medium mb-2 block">Часть теста</label>
                    <select value={selectedPart} onChange={(e) => setSelectedPart(e.target.value)} className="w-full px-3 py-2.5 rounded-lg border border-border bg-background text-sm">
                      <option value="all">Все части</option>
                      <option value="A">Часть А (выбор ответа)</option>
                      <option value="B">Часть Б (открытый ответ)</option>
                    </select>
                  </div>

                  {/* Section Filter */}
                  {availableSections.length > 0 && (
                    <div>
                      <label className="text-sm font-medium mb-2 block">Раздел</label>
                      <select value={selectedSection} onChange={(e) => setSelectedSection(e.target.value)} className="w-full px-3 py-2.5 rounded-lg border border-border bg-background text-sm">
                        <option value="all">Все разделы</option>
                        {availableSections.map(s => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div>
                    <label className="text-sm font-medium mb-2 block">Тема</label>
                    <select
                      value={selectedTopic}
                      onChange={(e) => setSelectedTopic(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-lg border border-border bg-background text-sm"
                    >
                      <option value="all">Все темы</option>
                      {topicsWithQuestions.map(topic => (
                        <option key={topic.id} value={topic.id}>{topic.name} ({topicQCount[topic.id]})</option>
                      ))}
                    </select>
                  </div>

                  {/* Subtopic Filter — only when topic chosen */}
                  {selectedTopic !== 'all' && subtopicsWithQuestions.length > 0 && (
                    <div>
                      <label className="text-sm font-medium mb-2 block">Подтема</label>
                      <select
                        value={selectedSubtopic}
                        onChange={(e) => setSelectedSubtopic(e.target.value)}
                        className="w-full px-3 py-2.5 rounded-lg border border-border bg-background text-sm"
                      >
                        <option value="all">Все подтемы ({subtopicsWithQuestions.length})</option>
                        {subtopicsWithQuestions.map(s => (
                          <option key={s.id} value={s.id}>{s.name} ({subtopicQCount[s.id]})</option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Difficulty Filter */}
                  <div>
                    <label className="text-sm font-medium mb-2 block">Сложность (уровень)</label>
                    <select
                      value={selectedDifficulty}
                      onChange={(e) => setSelectedDifficulty(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-lg border border-border bg-background text-sm"
                    >
                      <option value="all">Все уровни</option>
                      <option value="1">Уровень I (базовый)</option>
                      <option value="2">Уровень II</option>
                      <option value="3">Уровень III</option>
                      <option value="4">Уровень IV</option>
                      <option value="5">Уровень V (повышенный)</option>
                    </select>
                  </div>

                  {/* Sort */}
                  <div>
                    <label className="text-sm font-medium mb-2 block">Сортировка</label>
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                      className="w-full px-3 py-2.5 rounded-lg border border-border bg-background text-sm"
                    >
                      <option value="default">По умолчанию</option>
                      <option value="newest">Сначала новые</option>
                      <option value="difficulty-asc">Сложность ↑ (от лёгких)</option>
                      <option value="difficulty-desc">Сложность ↓ (от сложных)</option>
                    </select>
                  </div>

                  <Button
                    variant="outline"
                    className="w-full gap-2"
                    onClick={resetFilters}
                    disabled={!filtersActive}
                    title={filtersActive ? 'Сбросить все выбранные фильтры' : 'Фильтры не выбраны'}
                  >
                    <FilterX className="w-4 h-4" />
                    Сбросить все фильтры
                  </Button>

                  <Button
                    variant="outline"
                    className="w-full gap-2 text-destructive border-destructive/30 hover:bg-destructive/5"
                    onClick={() => setShowResetConfirm(true)}
                  >
                    <RotateCcw className="w-4 h-4" />
                    Сбросить прогресс
                  </Button>
                </CardContent>
              </Card>

              {/* Question Navigator */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Навигация</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-5 gap-2">
                    {filteredQuestions.map((q, i) => {
                      const isAnswered = answeredQuestions.has(q.id);
                      const isCorrect = correctAnswers.has(q.id);
                      const isCurrent = i === currentQuestionIndex;

                      return (
                        <button
                          key={q.id}
                          onClick={() => setCurrentQuestionIndex(i)}
                          className={`aspect-square rounded-lg text-sm font-medium transition-all ${
                            isCurrent
                              ? 'bg-primary text-white'
                              : isAnswered
                              ? isCorrect
                                ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                              : 'bg-muted hover:bg-muted/80'
                          }`}
                        >
                          {i + 1}
                        </button>
                      );
                    })}
                  </div>

                  <div className="flex items-center gap-4 mt-4 text-sm">
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-3 rounded bg-green-100 dark:bg-green-900/30" />
                      <span className="text-muted-foreground">Верно</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-3 rounded bg-red-100 dark:bg-red-900/30" />
                      <span className="text-muted-foreground">Неверно</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-3 rounded bg-muted" />
                      <span className="text-muted-foreground">Не решено</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.aside>
          )}

          {/* Main Content — full width when the panel is collapsed */}
          <div className={practiceSidebarCollapsed ? 'w-full max-w-4xl mx-auto' : 'lg:col-span-3'}>
            {/* Error-retrain banner (from exam results) */}
            {idsParam && (
              <div className="mb-4 flex items-center justify-between gap-3 rounded-xl border border-amber-300 dark:border-amber-700/60 bg-amber-50 dark:bg-amber-950/20 px-4 py-3">
                <span className="text-sm font-medium text-amber-800 dark:text-amber-300">
                  🎯 Работа над ошибками · {filteredQuestions.length} {filteredQuestions.length === 1 ? 'задание' : 'заданий'}
                </span>
                <Button variant="ghost" size="sm" onClick={() => navigate(`/practice/${slug}`)}>
                  Все задания
                </Button>
              </div>
            )}
            {/* Mode Switcher + show-filters affordance */}
            <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
              <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-2 p-1.5 bg-muted rounded-xl w-fit">
                <button
                  onClick={() => togglePracticeMode('single')}
                  className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-medium transition-all ${
                    practiceMode === 'single' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <FileText className="w-4 h-4" />
                  По одному
                </button>
                <button
                  onClick={() => togglePracticeMode('feed')}
                  className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-medium transition-all ${
                    practiceMode === 'feed' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <List className="w-4 h-4" />
                  Лента
                </button>
              </div>
                {streak > 0 && (
                  <motion.div
                    key={streak}
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 text-sm font-semibold"
                    title="Правильных ответов подряд"
                  >
                    <Flame className="w-4 h-4 fill-amber-500 text-amber-500" />
                    Серия {streak}{bestStreak > streak ? ` · рекорд ${bestStreak}` : ''}
                  </motion.div>
                )}
              </div>

              {practiceSidebarCollapsed && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="hidden lg:inline-flex gap-2 text-muted-foreground"
                  onClick={() => setPracticeSidebarCollapsed(false)}
                >
                  <PanelLeftOpen className="w-4 h-4" />
                  Показать фильтры
                </Button>
              )}
            </div>

            {completionBanner}
            {questionArea}
          </div>
        </div>
      </main>
    </div>
  );
}

// Named export for lazy loading
export default PracticePage;
