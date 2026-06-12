import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Clock, FileText, Award, Play, ClipboardList, CheckCircle2, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { getSubjectBySlug, fetchExamsBySubjectId, type ExamSummary } from '@/data/subjects';
import { CardRowsSkeleton } from '@/components/Skeletons';
import { useAppStore } from '@/store/useAppStore';
import { examApi } from '@/lib/api/client';

/** Список пробных экзаменов по предмету. Пользователь выбирает конкретный экзамен. */
export function ExamListPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const requireAuth = useAppStore((s) => s.requireAuth);
  const token = useAppStore((s) => s.token);
  // Запуск экзамена — только для зарегистрированных. Гостю показываем окно регистрации.
  const startExam = (examId: string) => {
    if (!requireAuth('Войдите или зарегистрируйтесь, чтобы проходить пробные экзамены.')) return;
    navigate(`/exam/${slug}/${examId}`);
  };
  const subject = slug ? getSubjectBySlug(slug) : undefined;
  const [exams, setExams] = useState<ExamSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  // ID экзаменов, уже решённых пользователем (для пометки «решён ранее»).
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!subject) return;
    setIsLoading(true);
    void fetchExamsBySubjectId(subject.id).then(setExams).finally(() => setIsLoading(false));
  }, [subject]);

  useEffect(() => {
    if (!subject || !token) return;
    void examApi.getCompleted(token, subject.id).then(r => {
      if (r.data?.examIds) setCompletedIds(new Set(r.data.examIds));
    });
  }, [subject, token]);

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

  return (
    <div className="min-h-screen bg-background">
      <main className="container py-8 max-w-4xl">
        {/* Hero — единый язык внутренних страниц (аврора + сетка + плитка) */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
          className="relative overflow-hidden rounded-3xl border bg-card/60 mb-8"
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
                  {!isLoading && exams.length > 0 && <> Доступно: {exams.length}.</>}
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
          <div className="grid gap-4 sm:grid-cols-2">
            {exams.map((e, i) => (
              <motion.div
                key={e.id}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, delay: Math.min(i, 6) * 0.05 }}
              >
                <Card className="h-full overflow-hidden card-lift">
                  <div className="h-1.5 w-full" style={{ background: subject.color }} />
                  <CardContent className="p-5 flex flex-col h-full">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <h3 className="text-lg font-bold">{e.title}</h3>
                      {completedIds.has(e.id) && (
                        <span className="shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 text-xs font-medium">
                          <CheckCircle2 className="w-3.5 h-3.5" />Решён
                        </span>
                      )}
                    </div>
                    {e.description && <p className="text-sm text-muted-foreground mb-4">{e.description}</p>}
                    <div className="flex flex-wrap gap-4 text-sm text-muted-foreground mb-5 mt-auto">
                      <span className="flex items-center gap-1.5"><FileText className="w-4 h-4" />{e.questionCount} заданий</span>
                      <span className="flex items-center gap-1.5"><Clock className="w-4 h-4" />{e.durationMinutes} мин</span>
                      {e.passingScore > 0 && <span className="flex items-center gap-1.5"><Award className="w-4 h-4" />проходной {e.passingScore}</span>}
                    </div>
                    <Button
                      className="w-full gap-2 text-white"
                      style={{ background: subject.color }}
                      onClick={() => startExam(e.id)}
                    >
                      {completedIds.has(e.id)
                        ? <><RotateCcw className="w-4 h-4" />Пройти заново</>
                        : <><Play className="w-4 h-4" />Начать экзамен</>}
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

export default ExamListPage;
