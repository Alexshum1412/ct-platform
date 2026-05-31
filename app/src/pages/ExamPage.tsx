import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, AlertTriangle, PanelLeftClose, PanelLeftOpen, Maximize2, Minimize2, BookOpen, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { MathFormula } from '@/components/ui/MathFormula';
import { ExamTimer } from '@/components/exam/ExamTimer';
import { getSubjectBySlug, fetchQuestionsBySubjectId, fetchExamConfigBySubjectId } from '@/data/subjects';
import { examApi } from '@/lib/api/client';
import { useAppStore } from '@/store/useAppStore';
import type { ExamConfig, Question } from '@/types';

export function ExamPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const {
    token,
    focusMode,
    setFocusMode,
    examSidebarCollapsed,
    setExamSidebarCollapsed,
  } = useAppStore();

  const subject = slug ? getSubjectBySlug(slug) : undefined;
  const [examConfig, setExamConfig] = useState<ExamConfig | null>(null);
  const [allQuestions, setAllQuestions] = useState<Question[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const attemptIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!subject) return;
    setIsLoading(true);
    setLoadError(null);
    void Promise.all([fetchExamConfigBySubjectId(subject.id), fetchQuestionsBySubjectId(subject.id)])
      .then(([config, questions]) => {
        setExamConfig(config);
        setAllQuestions(questions);
      })
      .catch(() => setLoadError('Не удалось загрузить данные экзамена'))
      .finally(() => setIsLoading(false));
  }, [subject]);

  const [examQuestions, setExamQuestions] = useState<Question[]>([]);
  const [isStarted, setIsStarted] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);

  // Initialize exam
  useEffect(() => {
    if (examConfig && allQuestions.length > 0) {
      // Select random questions for exam
      const shuffled = [...allQuestions].sort(() => Math.random() - 0.5);
      const selected = shuffled.slice(0, examConfig.totalQuestions);
      setExamQuestions(selected);
      setTimeRemaining(examConfig.durationMinutes * 60);
    }
  }, [examConfig, allQuestions]);

  // Timer
  useEffect(() => {
    if (!isStarted || isFinished || isPaused) return;

    const timer = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) {
          setIsFinished(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isStarted, isFinished, isPaused]);

  const [examLimitError, setExamLimitError] = useState<string | null>(null);

  const handleStart = async () => {
    setExamLimitError(null);
    if (token && subject) {
      const result = await examApi.start(subject.id, token);
      if (result.error) {
        if ((result as { code?: string }).code === 'EXAM_LIMIT_REACHED' || result.error.includes('лимит') || result.error.includes('Бесплатный')) {
          setExamLimitError(result.error);
          return;
        }
      }
      if (result.data) {
        attemptIdRef.current = (result.data as { attemptId: string }).attemptId ?? null;
      }
    }
    setIsStarted(true);
  };

  const handleAnswer = (questionId: string, answer: string) => {
    setAnswers(prev => ({ ...prev, [questionId]: answer }));
  };

  const [testScore, setTestScore] = useState<number | null>(null);

  const handleFinish = async () => {
    setIsFinished(true);
    if (token && attemptIdRef.current) {
      setIsSaving(true);
      const result = await examApi.submit(attemptIdRef.current, answers, token).catch(() => null);
      if (result?.data) {
        const data = result.data as { testScore?: number };
        if (data.testScore !== undefined) setTestScore(data.testScore);
      }
      setIsSaving(false);
    }
  };

  const handleTogglePause = () => setIsPaused(prev => !prev);

  // Focus mode lifecycle: clear it on unmount and whenever the exam ends,
  // so the global header is never hidden on the start/results screens.
  useEffect(() => () => setFocusMode(false), [setFocusMode]);
  useEffect(() => { if (isFinished) setFocusMode(false); }, [isFinished, setFocusMode]);

  // Keyboard: Esc exits Focus mode; ←/→ move between questions.
  useEffect(() => {
    if (!focusMode) return;
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      const typing = !!el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable);
      if (e.key === 'Escape') { setFocusMode(false); return; }
      if (typing) return;
      if (e.key === 'ArrowRight') setCurrentQuestionIndex(prev => Math.min(prev + 1, examQuestions.length - 1));
      if (e.key === 'ArrowLeft') setCurrentQuestionIndex(prev => Math.max(prev - 1, 0));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [focusMode, examQuestions.length, setFocusMode]);

  const calculateResults = () => {
    let correct = 0;
    examQuestions.forEach(q => {
      const userAnswer = answers[q.id];
      const ca = Array.isArray(q.correctAnswer) ? q.correctAnswer[0] : q.correctAnswer;
      if (userAnswer?.trim().toLowerCase() === ca?.trim().toLowerCase()) correct++;
    });
    return {
      score: correct,
      correct,
      total: examQuestions.length,
      percentage: examQuestions.length > 0 ? Math.round((correct / examQuestions.length) * 100) : 0,
    };
  };

  if (isLoading && subject) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Загрузка экзамена...</p>
        </div>
      </div>
    );
  }

  if (!subject || !examConfig || loadError) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">{loadError || 'Экзамен не найден'}</h1>
          <Button onClick={() => navigate('/')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            На главную
          </Button>
        </div>
      </div>
    );
  }

  // Start Screen
  if (!isStarted) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-xl w-full">
          <CardContent className="p-8 sm:p-10 text-center">
            <div
              className="w-20 h-20 rounded-2xl mx-auto mb-6 flex items-center justify-center text-white"
              style={{ background: subject.color }}
            >
              <span className="text-3xl font-bold">{subject.nameShort}</span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-bold mb-2">{subject.name}</h1>
            <p className="text-muted-foreground mb-8 text-lg">Пробный экзамен</p>

            <div className="grid grid-cols-3 gap-4 mb-8">
              <div className="p-4 bg-muted rounded-xl">
                <p className="text-2xl font-bold tabular-nums">{examConfig.durationMinutes}</p>
                <p className="text-xs text-muted-foreground">минут</p>
              </div>
              <div className="p-4 bg-muted rounded-xl">
                <p className="text-2xl font-bold tabular-nums">{examConfig.totalQuestions}</p>
                <p className="text-xs text-muted-foreground">вопросов</p>
              </div>
              <div className="p-4 bg-muted rounded-xl">
                <p className="text-2xl font-bold tabular-nums">{examConfig.passingScore}</p>
                <p className="text-xs text-muted-foreground">проходной</p>
              </div>
            </div>

            <div className="bg-amber-50 dark:bg-amber-900/20 p-4 rounded-xl mb-8 text-left">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <div className="text-sm text-amber-800 dark:text-amber-400">
                  <p className="font-medium mb-1">Важно:</p>
                  <ul className="list-disc list-inside space-y-1">
                    <li>Экзамен можно поставить на паузу</li>
                    <li>Ответы можно изменить до завершения</li>
                    <li>Не забудьте проверить все вопросы</li>
                  </ul>
                </div>
              </div>
            </div>

            {examLimitError && (
              <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-xl mb-6 text-left">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-medium text-red-700 dark:text-red-400 mb-1">Достигнут дневной лимит</p>
                    <p className="text-red-600 dark:text-red-400/80">{examLimitError}</p>
                  </div>
                </div>
              </div>
            )}

            <div className="flex gap-4">
              <Button
                variant="outline"
                size="lg"
                className="flex-1"
                onClick={() => navigate(`/subject/${slug}`)}
              >
                Отмена
              </Button>
              <Button
                className="flex-1"
                size="lg"
                onClick={handleStart}
                style={{ background: subject.color }}
              >
                Начать экзамен
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Results Screen
  if (isFinished) {
    const results = calculateResults();
    const passed = results.score >= examConfig.passingScore;
    const wrongQuestions = examQuestions.filter(q => {
      const ua = answers[q.id];
      const ca = Array.isArray(q.correctAnswer) ? q.correctAnswer[0] : q.correctAnswer;
      return ua && ua !== ca;
    });

    return (
      <div className="min-h-screen bg-background">
        <div className="container py-8 max-w-3xl">
          {/* Score Card */}
          <Card className="mb-6">
            <CardContent className="p-6 sm:p-8 text-center">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', duration: 0.5 }}
                className={`w-24 h-24 rounded-full mx-auto mb-4 flex items-center justify-center text-white text-3xl font-bold tabular-nums ${passed ? 'bg-green-500' : 'bg-red-500'}`}
              >
                {results.percentage}%
              </motion.div>
              <h1 className="text-2xl font-bold mb-1">{passed ? 'Экзамен сдан!' : 'Экзамен не сдан'}</h1>
              <p className="text-muted-foreground mb-6">
                {passed ? 'Отличная работа! Продолжайте в том же духе.' : 'Не расстраивайтесь! Изучите ошибки ниже и продолжайте.'}
              </p>

              <div className="grid grid-cols-3 gap-3 mb-4">
                <div className="p-4 bg-muted rounded-xl">
                  <p className="text-2xl font-bold text-green-600 tabular-nums">{results.correct}</p>
                  <p className="text-xs text-muted-foreground">верно</p>
                </div>
                <div className="p-4 bg-muted rounded-xl">
                  <p className="text-2xl font-bold text-red-500 tabular-nums">{results.total - results.correct}</p>
                  <p className="text-xs text-muted-foreground">неверно</p>
                </div>
                <div className="p-4 bg-muted rounded-xl">
                  <p className="text-2xl font-bold tabular-nums">{results.score}/{results.total}</p>
                  <p className="text-xs text-muted-foreground">первичных</p>
                </div>
              </div>

              {testScore !== null && (
                <div className="p-4 rounded-xl bg-primary/10 border border-primary/20 mb-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Тестовый балл (шкала ЦТ):</span>
                    <span className={`text-3xl font-bold tabular-nums ${testScore >= 70 ? 'text-green-600' : testScore >= 50 ? 'text-amber-600' : 'text-red-600'}`}>
                      {testScore}
                    </span>
                  </div>
                </div>
              )}

              {isSaving && <p className="text-sm text-muted-foreground mb-4">Сохранение...</p>}

              <div className="flex gap-3">
                <Button variant="outline" size="lg" className="flex-1" onClick={() => navigate(`/subject/${slug}`)}>
                  К предмету
                </Button>
                <Button size="lg" className="flex-1" onClick={() => navigate(`/exam/${slug}`)} style={{ background: subject.color }}>
                  Пройти ещё раз
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Review Section */}
          {wrongQuestions.length > 0 && (
            <div>
              <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
                <h2 className="text-xl font-bold">📝 Разбор ошибок ({wrongQuestions.length})</h2>
                <Button
                  size="sm"
                  onClick={() => navigate(`/practice/${slug}?ids=${wrongQuestions.map(q => q.id).join(',')}`)}
                  className="gap-1.5"
                >
                  <Play className="w-3.5 h-3.5" />Тренировать только ошибки
                </Button>
              </div>
              <div className="space-y-3">
                {wrongQuestions.map((q, i) => {
                  const ua = answers[q.id];
                  const ca = Array.isArray(q.correctAnswer) ? q.correctAnswer[0] : q.correctAnswer;
                  const userAnswerText = q.options?.find(o => o.id === ua)?.text ?? ua;
                  const correctAnswerText = q.options?.find(o => o.id === ca)?.text ?? ca;
                  return (
                    <motion.div
                      key={q.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.04 }}
                    >
                      <Card>
                        <CardContent className="p-5">
                          <div className="flex items-start gap-3 mb-3">
                            <div className="w-8 h-8 rounded-full bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 font-bold flex items-center justify-center shrink-0 text-sm">
                              {i + 1}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-base font-medium mb-3">
                                <MathFormula formula={q.content} />
                              </div>
                              <div className="space-y-2">
                                <div className="flex items-start gap-2 text-sm p-3 rounded-lg bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/30">
                                  <span className="text-red-600 font-semibold shrink-0">✗</span>
                                  <div>
                                    <p className="text-xs text-muted-foreground mb-0.5">Ваш ответ:</p>
                                    <p>{userAnswerText ? <MathFormula formula={userAnswerText} inline /> : '(не отвечено)'}</p>
                                  </div>
                                </div>
                                <div className="flex items-start gap-2 text-sm p-3 rounded-lg bg-green-50 dark:bg-green-900/10 border border-green-100 dark:border-green-900/30">
                                  <span className="text-green-600 font-semibold shrink-0">✓</span>
                                  <div>
                                    <p className="text-xs text-muted-foreground mb-0.5">Правильный ответ:</p>
                                    <p><MathFormula formula={correctAnswerText} inline /></p>
                                  </div>
                                </div>
                                {q.explanation && (
                                  <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/30 text-sm">
                                    <p className="text-xs text-amber-700 dark:text-amber-400 font-medium mb-1">💡 Объяснение:</p>
                                    <MathFormula formula={q.explanation} />
                                  </div>
                                )}
                              </div>
                              {/* Quick links: revise theory or re-solve this exact question */}
                              <div className="flex flex-wrap gap-2 mt-3">
                                {q.topicId && (
                                  <Button size="sm" variant="outline" className="gap-1.5" onClick={() => navigate(`/theory/${slug}/${q.topicId}`)}>
                                    <BookOpen className="w-3.5 h-3.5" /> Теория по теме
                                  </Button>
                                )}
                                <Button size="sm" variant="ghost" className="gap-1.5" onClick={() => navigate(`/practice/${slug}?ids=${q.id}`)}>
                                  <Play className="w-3.5 h-3.5" /> Решить заново
                                </Button>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Exam Screen
  const currentQuestion = examQuestions[currentQuestionIndex];
  const durationSeconds = examConfig.durationMinutes * 60;

  // Shared question card — identical in normal and Focus layouts.
  const examQuestionCard = currentQuestion ? (
    <AnimatePresence mode="wait">
      <motion.div
        key={currentQuestion.id}
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -20 }}
        transition={{ duration: 0.3 }}
      >
        <Card>
          <CardContent className="p-6 sm:p-8">
            <div className="mb-6">
              <span className="text-sm text-muted-foreground tabular-nums">
                Вопрос {currentQuestionIndex + 1} из {examQuestions.length}
              </span>
              <div className="mt-2">
                <MathFormula formula={currentQuestion.content} className="text-xl sm:text-2xl font-medium leading-relaxed" />
              </div>
            </div>

            {/* Options */}
            {currentQuestion.options && (
              <div className="space-y-3">
                {currentQuestion.options.map((option) => (
                  <button
                    key={option.id}
                    onClick={() => handleAnswer(currentQuestion.id, option.id)}
                    className={`w-full flex items-center gap-3 p-4 sm:p-5 rounded-xl border-2 text-left text-base transition-all ${
                      answers[currentQuestion.id] === option.id
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/30 hover:bg-muted/50'
                    }`}
                  >
                    <span className="inline-flex items-center justify-center w-9 h-9 rounded-lg bg-muted font-semibold text-sm shrink-0">
                      {option.id.toUpperCase()}
                    </span>
                    <span className="flex-1">
                      <MathFormula formula={option.text} inline />
                    </span>
                  </button>
                ))}
              </div>
            )}

            {/* Text Input */}
            {currentQuestion.type === 'TEXT_INPUT' && (
              <input
                type="text"
                value={answers[currentQuestion.id] || ''}
                onChange={(e) => handleAnswer(currentQuestion.id, e.target.value)}
                placeholder="Введите ответ..."
                className="w-full px-4 py-3.5 rounded-xl border-2 border-border bg-background text-base focus:border-primary focus:outline-none transition-colors"
              />
            )}
          </CardContent>
        </Card>
      </motion.div>
    </AnimatePresence>
  ) : null;

  const examNav = (
    <div className="flex items-center justify-between gap-3 mt-6">
      <Button
        variant="outline"
        size="lg"
        onClick={() => setCurrentQuestionIndex(prev => prev - 1)}
        disabled={currentQuestionIndex === 0}
      >
        ← Предыдущий
      </Button>
      <span className="hidden sm:inline text-sm text-muted-foreground tabular-nums">
        {currentQuestionIndex + 1} / {examQuestions.length}
      </span>
      <Button
        variant="outline"
        size="lg"
        onClick={() => setCurrentQuestionIndex(prev => prev + 1)}
        disabled={currentQuestionIndex === examQuestions.length - 1}
      >
        Следующий →
      </Button>
    </div>
  );

  // ============================ FOCUS MODE ============================
  // Distraction-free exam: only the timer, the question & the answers.
  if (focusMode) {
    return (
      <div className="min-h-screen bg-background">
        <div className="sticky top-0 z-40 bg-background/85 backdrop-blur-md border-b border-border/60">
          <div className="mx-auto w-full max-w-3xl px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: subject.color }} />
              <span className="font-semibold truncate">{subject.name}</span>
              <span className="hidden sm:inline text-sm text-muted-foreground">· Экзамен</span>
            </div>
            <Button variant="outline" size="sm" className="gap-2 shrink-0" onClick={() => setFocusMode(false)}>
              <Minimize2 className="w-4 h-4" />
              <span className="hidden sm:inline">Выйти из фокуса</span>
              <kbd className="hidden md:inline ml-1 text-[10px] px-1.5 py-0.5 rounded border border-border bg-muted font-sans">Esc</kbd>
            </Button>
          </div>
        </div>
        <main className="mx-auto w-full max-w-3xl px-4 sm:px-6 py-6 space-y-6">
          <ExamTimer
            durationSeconds={durationSeconds}
            timeRemaining={timeRemaining}
            isPaused={isPaused}
            onTogglePause={handleTogglePause}
            onFinish={handleFinish}
          />
          {examQuestionCard}
          {examNav}
        </main>
      </div>
    );
  }

  // ============================ NORMAL MODE ============================
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/85 backdrop-blur-md border-b border-border">
        <div className="container py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate(`/subject/${slug}`)}
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div className="min-w-0">
                <h1 className="text-xl sm:text-2xl font-bold truncate">{subject.name}</h1>
                <p className="text-sm text-muted-foreground">Пробный экзамен</p>
              </div>
            </div>

            <div className="flex items-center gap-2 sm:gap-3 shrink-0">
              <div className="hidden lg:flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setExamSidebarCollapsed(!examSidebarCollapsed)}
                  title={examSidebarCollapsed ? 'Показать навигатор' : 'Скрыть навигатор'}
                >
                  {examSidebarCollapsed ? <PanelLeftOpen className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  onClick={() => setFocusMode(true)}
                  title="Фокус-режим — только таймер и задание"
                >
                  <Maximize2 className="w-4 h-4" />
                  Фокус
                </Button>
              </div>

              <ExamTimer
                durationSeconds={durationSeconds}
                timeRemaining={timeRemaining}
                isPaused={isPaused}
                onTogglePause={handleTogglePause}
                onFinish={handleFinish}
              />
            </div>
          </div>
        </div>
      </header>

      <main className="container py-8">
        <div className={`grid grid-cols-1 gap-6 lg:gap-8 ${examSidebarCollapsed ? 'lg:grid-cols-1' : 'lg:grid-cols-4'}`}>
          {/* Question Navigator. Collapsible on desktop; on mobile it always
              stacks into view (so a persisted collapse can't hide it there). */}
          {(
            <motion.aside
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              className={`${examSidebarCollapsed ? 'lg:hidden' : 'lg:col-span-1'}`}
            >
              <Card>
                <CardContent className="p-4">
                  <p className="font-medium mb-4">Навигация</p>
                  <div className="grid grid-cols-5 gap-2">
                    {examQuestions.map((q, i) => {
                      const isAnswered = !!answers[q.id];
                      const isCurrent = i === currentQuestionIndex;

                      return (
                        <button
                          key={q.id}
                          onClick={() => setCurrentQuestionIndex(i)}
                          className={`aspect-square rounded-lg text-sm font-medium transition-all ${
                            isCurrent
                              ? 'bg-primary text-white'
                              : isAnswered
                              ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                              : 'bg-muted hover:bg-muted/80'
                          }`}
                        >
                          {i + 1}
                        </button>
                      );
                    })}
                  </div>

                  <div className="mt-4 pt-4 border-t border-border">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Отвечено:</span>
                      <span className="font-medium tabular-nums">
                        {Object.keys(answers).length} из {examQuestions.length}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.aside>
          )}

          {/* Question — full width when navigator collapsed */}
          <div className={examSidebarCollapsed ? 'w-full max-w-4xl mx-auto' : 'lg:col-span-3'}>
            {examQuestionCard}
            {examNav}
          </div>
        </div>
      </main>
    </div>
  );
}

// Named export for lazy loading
export default ExamPage;
