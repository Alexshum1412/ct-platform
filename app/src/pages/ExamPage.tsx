import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, AlertTriangle, PanelLeftClose, PanelLeftOpen, Maximize2, Minimize2, Play, Pause, Flag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { MathFormula } from '@/components/ui/MathFormula';
import { ExamTimer } from '@/components/exam/ExamTimer';
import { ExamReview, type ExamReviewItem } from '@/components/exam/ExamReview';
import { ReportModal } from '@/components/question/ReportModal';
import { getSubjectBySlug, fetchExamById, type ExamDetail } from '@/data/subjects';
import { examApi } from '@/lib/api/client';
import { useAppStore } from '@/store/useAppStore';
import type { ExamConfig, Question } from '@/types';

// Ответ POST /api/exam/submit — серверный разбор (включая правильные ответы,
// которые в выдаче экзамена намеренно отсутствуют до сдачи).
interface ExamSubmitResult {
  score: number;
  maxScore: number;
  percentage: number;
  testScore?: number;
  totalTime?: number;
  results: Array<{
    questionId: string;
    isCorrect: boolean;
    userAnswer: string;
    correctAnswer: string;
    explanation: string;
    solution: string | null;
  }>;
}

export function ExamPage() {
  const { slug, examId } = useParams<{ slug: string; examId?: string }>();
  const navigate = useNavigate();
  const {
    token,
    focusMode,
    setFocusMode,
    examSidebarCollapsed,
    setExamSidebarCollapsed,
    requireAuth,
  } = useAppStore();

  const subject = slug ? getSubjectBySlug(slug) : undefined;
  const [examConfig, setExamConfig] = useState<ExamConfig | null>(null);
  const [examTitle, setExamTitle] = useState<string>('Пробный экзамен');
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const attemptIdRef = useRef<string | null>(null);

  const [examQuestions, setExamQuestions] = useState<Question[]>([]);
  const [isStarted, setIsStarted] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);

  const [examLimitError, setExamLimitError] = useState<string | null>(null);
  // Жалоба на задание прямо во время экзамена.
  const [reportQuestionId, setReportQuestionId] = useState<string | null>(null);
  // Результаты сдачи приходят С СЕРВЕРА: правильных ответов в выдаче экзамена
  // больше нет (закрыта возможность подсмотреть их в Network во время экзамена).
  const [serverResults, setServerResults] = useState<ExamSubmitResult | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  // true, когда сервер закрыл попытку (время вышло/уже сдана) — повтор бессмыслен.
  const [submitFatal, setSubmitFatal] = useState(false);
  const finishingRef = useRef(false);
  // Снимок ответов для submit (ref, чтобы автозавершение по таймеру не
  // пересоздавало интервал на каждый введённый ответ).
  const answersRef = useRef<Record<string, string>>({});
  useEffect(() => { answersRef.current = answers; }, [answers]);

  // Load the specific exam chosen on the exam list page.
  useEffect(() => {
    if (!examId) return;
    setIsLoading(true);
    setLoadError(null);
    void fetchExamById(examId)
      .then((exam: ExamDetail | null) => {
        if (!exam) { setLoadError('Экзамен не найден'); return; }
        setExamTitle(exam.title);
        setExamConfig({
          id: exam.id,
          subjectId: exam.subjectId,
          durationMinutes: exam.durationMinutes,
          totalQuestions: exam.questions.length,
          passingScore: exam.passingScore,
          structure: [],
        } as unknown as ExamConfig);
        setExamQuestions(exam.questions);
        setTimeRemaining(exam.durationMinutes * 60);
      })
      .catch(() => setLoadError('Не удалось загрузить экзамен'))
      .finally(() => setIsLoading(false));
  }, [examId]);

  const handleStart = async () => {
    // Экзамен — только для зарегистрированных с подтверждённым email
    // (защита и от прямого перехода по ссылке).
    if (!requireAuth('Войдите или зарегистрируйтесь, чтобы проходить пробные экзамены.')) return;
    if (!token || !subject) return;
    setExamLimitError(null);

    const result = await examApi.start(subject.id, token, examId);
    // Fail-closed: без успешно созданной попытки экзамен НЕ начинается — иначе
    // при любой ошибке (лимит/сеть/верификация) он шёл «вхолостую» без записи.
    if (result.error || !result.data) {
      setExamLimitError(result.error || 'Не удалось начать экзамен. Попробуйте ещё раз.');
      return;
    }
    const attemptId = (result.data as { attemptId?: string }).attemptId;
    if (!attemptId) {
      setExamLimitError('Не удалось начать экзамен. Попробуйте ещё раз.');
      return;
    }
    attemptIdRef.current = attemptId;
    finishingRef.current = false;
    setIsStarted(true);
  };

  const handleAnswer = (questionId: string, answer: string) => {
    setAnswers(prev => ({ ...prev, [questionId]: answer }));
  };

  const submitAttempt = useCallback(async () => {
    if (!token || !attemptIdRef.current) {
      setSubmitError('Сессия экзамена не найдена. Войдите заново и начните экзамен ещё раз.');
      return;
    }
    setIsSaving(true);
    setSubmitError(null);
    const result = await examApi.submit(attemptIdRef.current, answersRef.current, token).catch(() => null);
    setIsSaving(false);
    if (result?.data && typeof (result.data as ExamSubmitResult).score === 'number') {
      setServerResults(result.data as ExamSubmitResult);
    } else {
      // Просроченная/уже сданная попытка закрыта на сервере — повтор не поможет.
      const code = (result as { code?: string } | null)?.code;
      setSubmitFatal(code === 'EXAM_TIME_EXPIRED' || code === 'ALREADY_SUBMITTED');
      setSubmitError(result?.error || 'Не удалось отправить результаты. Проверьте соединение и повторите.');
    }
  }, [token]);

  // Идемпотентное завершение (кнопка «Завершить», истечение таймера).
  const handleFinish = useCallback(async () => {
    if (finishingRef.current) return;
    finishingRef.current = true;
    setIsFinished(true);
    await submitAttempt();
  }, [submitAttempt]);

  // Timer — на нуле экзамен ЗАВЕРШАЕТСЯ С ОТПРАВКОЙ (раньше просто
  // выставлялся isFinished и попытка никогда не сохранялась).
  useEffect(() => {
    if (!isStarted || isFinished || isPaused) return;

    const timer = setInterval(() => {
      setTimeRemaining(prev => (prev <= 1 ? 0 : prev - 1));
    }, 1000);

    return () => clearInterval(timer);
  }, [isStarted, isFinished, isPaused]);

  useEffect(() => {
    if (isStarted && !isFinished && timeRemaining === 0) void handleFinish();
  }, [isStarted, isFinished, timeRemaining, handleFinish]);

  const handleTogglePause = () => setIsPaused(prev => !prev);

  // Restart the same exam from its start screen.
  const restartExam = () => {
    setAnswers({});
    setCurrentQuestionIndex(0);
    setIsFinished(false);
    setIsPaused(false);
    setServerResults(null);
    setSubmitError(null);
    attemptIdRef.current = null;
    finishingRef.current = false;
    if (examConfig) setTimeRemaining(examConfig.durationMinutes * 60);
    setIsStarted(false);
  };

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
              className="inline-flex max-w-full items-center justify-center mb-6 px-6 h-16 rounded-2xl text-white text-xl sm:text-2xl font-bold"
              style={{ background: subject.color }}
            >
              <span className="truncate">{subject.name}</span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-bold mb-2">{examTitle}</h1>
            <p className="text-muted-foreground mb-8 text-lg">{subject.name} · пробный экзамен</p>

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
                onClick={() => navigate(`/exam/${slug}`)}
              >
                К экзаменам
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

  // Results Screen — данные приходят с сервера (submit); пока их нет,
  // показываем «отправка…» или ошибку с повтором.
  if (isFinished) {
    if (!serverResults) {
      return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
          <Card className="max-w-xl w-full">
            <CardContent className="p-8 sm:p-10 text-center">
              {isSaving ? (
                <>
                  <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                  <h1 className="text-xl font-bold mb-1">Проверяем ваши ответы…</h1>
                  <p className="text-muted-foreground">Отправляем результаты на сервер.</p>
                </>
              ) : (
                <>
                  <AlertTriangle className="w-10 h-10 text-amber-500 mx-auto mb-4" />
                  <h1 className="text-xl font-bold mb-2">
                    {submitFatal ? 'Попытка не засчитана' : 'Не удалось отправить результаты'}
                  </h1>
                  <p className="text-muted-foreground mb-6">
                    {submitError || 'Произошла ошибка.'}
                    {!submitFatal && ' Ваши ответы сохранены в этой вкладке — попробуйте ещё раз.'}
                  </p>
                  <div className="flex gap-3">
                    <Button variant="outline" size="lg" className="flex-1" onClick={() => navigate(`/exam/${slug}`)}>
                      К экзаменам
                    </Button>
                    {!submitFatal && (
                      <Button size="lg" className="flex-1" onClick={() => void submitAttempt()} style={{ background: subject.color }}>
                        Повторить отправку
                      </Button>
                    )}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      );
    }

    const passed = serverResults.score >= examConfig.passingScore;
    const questionById = new Map(examQuestions.map(q => [q.id, q]));
    const testScore = serverResults.testScore ?? null;
    // Полный разбор: серверные результаты + контент заданий (для решений/теории).
    const reviewItems: ExamReviewItem[] = serverResults.results.map(r => {
      const q = questionById.get(r.questionId);
      return {
        questionId: r.questionId,
        content: q?.content ?? '',
        imageUrl: q?.imageUrl ?? null,
        options: q?.options ?? null,
        part: q?.part ?? null,
        topicId: q?.topicId ?? null,
        subtopicId: q?.subtopicId ?? null,
        userAnswer: r.userAnswer,
        correctAnswer: r.correctAnswer,
        isCorrect: r.isCorrect,
        explanation: r.explanation,
        solution: r.solution,
      };
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
                {serverResults.percentage}%
              </motion.div>
              <h1 className="text-2xl font-bold mb-1">{passed ? 'Экзамен сдан!' : 'Экзамен не сдан'}</h1>
              <p className="text-muted-foreground mb-6">
                {passed ? 'Отличная работа! Продолжайте в том же духе.' : 'Не расстраивайтесь! Изучите ошибки ниже и продолжайте.'}
              </p>

              <div className="grid grid-cols-3 gap-3 mb-4">
                <div className="p-4 bg-muted rounded-xl">
                  <p className="text-2xl font-bold text-green-600 tabular-nums">{serverResults.score}</p>
                  <p className="text-xs text-muted-foreground">верно</p>
                </div>
                <div className="p-4 bg-muted rounded-xl">
                  <p className="text-2xl font-bold text-red-500 tabular-nums">{serverResults.maxScore - serverResults.score}</p>
                  <p className="text-xs text-muted-foreground">неверно</p>
                </div>
                <div className="p-4 bg-muted rounded-xl">
                  <p className="text-2xl font-bold tabular-nums">{serverResults.score}/{serverResults.maxScore}</p>
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

              <div className="flex gap-3">
                <Button variant="outline" size="lg" className="flex-1" onClick={() => navigate(`/exam/${slug}`)}>
                  К экзаменам
                </Button>
                <Button size="lg" className="flex-1" onClick={restartExam} style={{ background: subject.color }}>
                  Пройти ещё раз
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-3">
                Результат и ваши ответы сохранены — их можно пересмотреть в профиле, раздел «История экзаменов».
              </p>
            </CardContent>
          </Card>

          {/* Полный разбор — все задания с пошаговыми решениями */}
          <ExamReview items={reviewItems} slug={slug} />
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
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm text-muted-foreground tabular-nums">
                  Вопрос {currentQuestionIndex + 1} из {examQuestions.length}
                </span>
                <button
                  type="button"
                  onClick={() => setReportQuestionId(currentQuestion.id)}
                  className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-red-500 transition-colors shrink-0"
                  title="Пожаловаться на задание"
                >
                  <Flag className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Пожаловаться</span>
                </button>
              </div>
              <div className="mt-2">
                <MathFormula formula={currentQuestion.content} className="text-xl sm:text-2xl font-medium leading-relaxed" />
              </div>
              {currentQuestion.imageUrl && (
                <div className="mt-4 rounded-xl overflow-hidden border border-border bg-muted/30">
                  <img
                    src={/^(https?:|data:)/.test(currentQuestion.imageUrl) ? currentQuestion.imageUrl : `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}${currentQuestion.imageUrl}`}
                    alt="Иллюстрация к заданию"
                    loading="lazy"
                    className="w-full max-h-72 object-contain"
                  />
                </div>
              )}
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

  // When paused: hide the question (so it can't be answered) and show a clear resume CTA.
  const pausedCard = (
    <Card>
      <CardContent className="p-10 sm:p-14 text-center flex flex-col items-center">
        <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
          <Pause className="w-8 h-8 text-muted-foreground" />
        </div>
        <h2 className="text-2xl font-bold mb-2">Экзамен на паузе</h2>
        <p className="text-muted-foreground mb-6 max-w-sm">Таймер остановлен, задания скрыты. Нажмите «Продолжить», чтобы вернуться к экзамену.</p>
        <Button size="lg" className="gap-2 text-white" style={{ background: subject.color }} onClick={handleTogglePause}>
          <Play className="w-5 h-5" />Продолжить экзамен
        </Button>
      </CardContent>
    </Card>
  );

  const reportModal = (
    <ReportModal
      questionId={reportQuestionId ?? ''}
      isOpen={!!reportQuestionId}
      onClose={() => setReportQuestionId(null)}
    />
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
          {isPaused ? pausedCard : <>{examQuestionCard}{examNav}</>}
        </main>
        {reportModal}
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
                onClick={() => navigate(`/exam/${slug}`)}
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div className="min-w-0">
                <h1 className="text-xl sm:text-2xl font-bold truncate">{subject.name}</h1>
                <p className="text-sm text-muted-foreground truncate">{examTitle}</p>
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
            {isPaused ? pausedCard : <>{examQuestionCard}{examNav}</>}
          </div>
        </div>
      </main>
      {reportModal}
    </div>
  );
}

// Named export for lazy loading
export default ExamPage;
