import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { BookOpen, Play, ChevronDown, ListChecks, CircleAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { MathFormula } from '@/components/ui/MathFormula';

export interface ExamReviewItem {
  questionId: string;
  content: string;
  imageUrl?: string | null;
  options?: { id: string; text: string }[] | null;
  part?: string | null;
  topicId?: string | null;
  subtopicId?: string | null;
  userAnswer: string;
  correctAnswer: string;
  isCorrect: boolean;
  explanation?: string | null;
  solution?: string | null;
}

const resolveImg = (url: string) =>
  /^(https?:|data:)/.test(url) ? url : `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}${url}`;

/** Полный разбор экзамена: каждое задание с ответом пользователя, верным
 *  ответом, объяснением и пошаговым решением. Используется и на экране
 *  результатов, и при просмотре прошлой попытки из истории. */
export function ExamReview({ items, slug }: { items: ExamReviewItem[]; slug?: string }) {
  const navigate = useNavigate();
  const [filter, setFilter] = useState<'all' | 'wrong'>('all');

  const wrongCount = useMemo(() => items.filter((r) => !r.isCorrect).length, [items]);
  const shown = filter === 'wrong' ? items.filter((r) => !r.isCorrect) : items;

  return (
    <div>
      <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <ListChecks className="w-5 h-5 text-primary" />Разбор заданий
        </h2>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="inline-flex rounded-lg border border-border p-0.5 text-sm">
            <button
              onClick={() => setFilter('all')}
              className={`px-3 py-1 rounded-md font-medium transition-colors ${filter === 'all' ? 'bg-primary text-white' : 'text-muted-foreground hover:text-foreground'}`}
            >
              Все ({items.length})
            </button>
            <button
              onClick={() => setFilter('wrong')}
              className={`px-3 py-1 rounded-md font-medium transition-colors ${filter === 'wrong' ? 'bg-primary text-white' : 'text-muted-foreground hover:text-foreground'}`}
            >
              Ошибки ({wrongCount})
            </button>
          </div>
          {slug && wrongCount > 0 && (
            <Button
              size="sm"
              onClick={() => navigate(`/practice/${slug}?ids=${items.filter((r) => !r.isCorrect).map((r) => r.questionId).join(',')}`)}
              className="gap-1.5"
            >
              <Play className="w-3.5 h-3.5" />Тренировать ошибки
            </Button>
          )}
        </div>
      </div>

      <div className="space-y-3">
        {shown.map((r, i) => (
          <motion.div key={r.questionId} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i, 12) * 0.03 }}>
            <ReviewCard item={r} index={items.indexOf(r)} slug={slug} navigate={navigate} />
          </motion.div>
        ))}
      </div>
    </div>
  );
}

function ReviewCard({
  item, index, slug, navigate,
}: {
  item: ExamReviewItem;
  index: number;
  slug?: string;
  navigate: ReturnType<typeof useNavigate>;
}) {
  // Решение по умолчанию раскрыто у неверных, свёрнуто у верных.
  const [openSolution, setOpenSolution] = useState(!item.isCorrect);

  const userText = item.options?.find((o) => o.id === item.userAnswer)?.text ?? item.userAnswer;
  const correctText = item.options?.find((o) => o.id === item.correctAnswer)?.text ?? item.correctAnswer;
  const hasSolution = !!(item.solution && item.solution.trim());

  return (
    <Card className={item.isCorrect ? 'border-green-200 dark:border-green-900/40' : 'border-red-200 dark:border-red-900/40'}>
      <CardContent className="p-5">
        <div className="flex items-start gap-3">
          <div className={`w-8 h-8 rounded-full font-bold flex items-center justify-center shrink-0 text-sm ${
            item.isCorrect
              ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400'
              : 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400'
          }`}>
            {index + 1}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <span className={`text-xs font-semibold ${item.isCorrect ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                {item.isCorrect ? '✓ Верно' : '✗ Неверно'}
              </span>
              {item.part && <span className="text-[11px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">Часть {item.part}</span>}
            </div>

            <div className="text-base font-medium mb-3">
              <MathFormula formula={item.content} />
              {item.imageUrl && (
                <img
                  src={resolveImg(item.imageUrl)}
                  alt="Иллюстрация к заданию"
                  loading="lazy"
                  className="mt-2 w-full max-h-56 object-contain rounded-lg border border-border bg-muted/30"
                />
              )}
            </div>

            <div className="space-y-2">
              {!item.isCorrect && (
                <div className="flex items-start gap-2 text-sm p-3 rounded-lg bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/30">
                  <span className="text-red-600 font-semibold shrink-0">✗</span>
                  <div>
                    <p className="text-xs text-muted-foreground mb-0.5">Ваш ответ:</p>
                    <p>{userText ? <MathFormula formula={userText} inline /> : '(не отвечено)'}</p>
                  </div>
                </div>
              )}
              <div className="flex items-start gap-2 text-sm p-3 rounded-lg bg-green-50 dark:bg-green-900/10 border border-green-100 dark:border-green-900/30">
                <span className="text-green-600 font-semibold shrink-0">✓</span>
                <div>
                  <p className="text-xs text-muted-foreground mb-0.5">Правильный ответ:</p>
                  <p><MathFormula formula={correctText} inline /></p>
                </div>
              </div>

              {item.explanation && (
                <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/30 text-sm">
                  <p className="text-xs text-amber-700 dark:text-amber-400 font-medium mb-1">💡 Кратко:</p>
                  <MathFormula formula={item.explanation} />
                </div>
              )}

              {/* Пошаговое решение */}
              {hasSolution ? (
                <div className="rounded-lg border border-border overflow-hidden">
                  <button
                    onClick={() => setOpenSolution((o) => !o)}
                    className="w-full flex items-center justify-between gap-2 px-3 py-2.5 text-sm font-medium hover:bg-muted/50 transition-colors"
                  >
                    <span className="flex items-center gap-1.5"><ListChecks className="w-4 h-4 text-primary" />Пошаговое решение</span>
                    <ChevronDown className={`w-4 h-4 transition-transform ${openSolution ? 'rotate-180' : ''}`} />
                  </button>
                  {openSolution && (
                    <div className="px-3 pb-3 pt-1 text-sm border-t border-border bg-muted/20">
                      <MathFormula formula={item.solution!} />
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-start gap-2 text-xs text-muted-foreground p-2.5 rounded-lg bg-muted/40">
                  <CircleAlert className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                  Подробного решения нет. Нажмите «Решить заново» — там доступны подсказки по шагам.
                </div>
              )}
            </div>

            {/* Ссылки */}
            <div className="flex flex-wrap gap-2 mt-3">
              {slug && item.topicId && (
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1.5"
                  onClick={() => navigate(`/theory/${slug}/${item.topicId}${item.subtopicId ? `?subtopic=${item.subtopicId}` : ''}`)}
                >
                  <BookOpen className="w-3.5 h-3.5" /> Теория по теме
                </Button>
              )}
              {slug && (
                <Button size="sm" variant="ghost" className="gap-1.5" onClick={() => navigate(`/practice/${slug}?ids=${item.questionId}`)}>
                  <Play className="w-3.5 h-3.5" /> Решить заново
                </Button>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default ExamReview;
