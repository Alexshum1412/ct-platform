import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Clock, FileText, Award, Play, ClipboardList } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { getSubjectBySlug, fetchExamsBySubjectId, type ExamSummary } from '@/data/subjects';
import { CardRowsSkeleton } from '@/components/Skeletons';

/** Список пробных экзаменов по предмету. Пользователь выбирает конкретный экзамен. */
export function ExamListPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const subject = slug ? getSubjectBySlug(slug) : undefined;
  const [exams, setExams] = useState<ExamSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!subject) return;
    setIsLoading(true);
    void fetchExamsBySubjectId(subject.id).then(setExams).finally(() => setIsLoading(false));
  }, [subject]);

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
      <header className="sticky top-0 z-40 bg-background/85 backdrop-blur-md border-b border-border">
        <div className="container py-4">
          <div className="flex items-center gap-3 min-w-0">
            <Button variant="ghost" size="icon" onClick={() => navigate(`/subject/${slug}`)} title="К предмету">
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white shrink-0" style={{ background: subject.color }}>
              <ClipboardList className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h1 className="text-xl sm:text-2xl font-bold truncate">{subject.name}</h1>
              <p className="text-sm text-muted-foreground">Пробные экзамены</p>
            </div>
          </div>
        </div>
      </header>

      <main className="container py-8 max-w-4xl">
        <p className="text-muted-foreground mb-6">
          Выберите пробный экзамен. Каждый экзамен — это подготовленный набор заданий в формате ЦТ/ЦЭ с таймером и тестовым баллом.
        </p>

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
                <Card className="h-full overflow-hidden transition-shadow hover:shadow-lg">
                  <div className="h-1.5 w-full" style={{ background: subject.color }} />
                  <CardContent className="p-5 flex flex-col h-full">
                    <h3 className="text-lg font-bold mb-1">{e.title}</h3>
                    {e.description && <p className="text-sm text-muted-foreground mb-4">{e.description}</p>}
                    <div className="flex flex-wrap gap-4 text-sm text-muted-foreground mb-5 mt-auto">
                      <span className="flex items-center gap-1.5"><FileText className="w-4 h-4" />{e.questionCount} заданий</span>
                      <span className="flex items-center gap-1.5"><Clock className="w-4 h-4" />{e.durationMinutes} мин</span>
                      {e.passingScore > 0 && <span className="flex items-center gap-1.5"><Award className="w-4 h-4" />проходной {e.passingScore}</span>}
                    </div>
                    <Button
                      className="w-full gap-2 text-white"
                      style={{ background: subject.color }}
                      onClick={() => navigate(`/exam/${slug}/${e.id}`)}
                    >
                      <Play className="w-4 h-4" />Начать экзамен
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
