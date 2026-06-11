/**
 * Страница олимпиадной задачи: условие, ввод ответа (серверная проверка),
 * прогрессивные подсказки, «сдаться» → разбор, начисление очков и достижений.
 * Ответ и разбор приходят с сервера ТОЛЬКО после решения/раскрытия.
 */
import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Award, CheckCircle2, Eye, Lightbulb, Send, XCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useAppStore } from '@/store/useAppStore';
import { olympiadApi, type OlympiadMyState, type OlympiadProblemFull, type UnlockedAchievement } from '@/lib/api/client';
import { LevelBadge, OlympiadContent } from '@/components/olympiad/shared';

export function OlympiadProblemPage() {
  const { id = '' } = useParams();
  const token = useAppStore((s) => s.token);
  const requireAuth = useAppStore((s) => s.requireAuth);

  const [problem, setProblem] = useState<OlympiadProblemFull | null>(null);
  const [my, setMy] = useState<OlympiadMyState | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [answer, setAnswer] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null);
  const [earned, setEarned] = useState<number | null>(null);
  const [unlocked, setUnlocked] = useState<UnlockedAchievement[]>([]);
  const [hintsShown, setHintsShown] = useState(0);
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    olympiadApi.getProblem(id, token ?? undefined).then(r => {
      if (!alive) return;
      if (r.data) { setProblem(r.data.problem); setMy(r.data.my); }
      else setNotFound(true);
      setLoading(false);
    });
    return () => { alive = false; };
  }, [id, token]);

  const solved = !!my?.solved;
  const revealed = !!my?.revealed;
  const showSolution = (solved || revealed) && !!problem?.solution;

  const handleSubmit = async () => {
    if (!problem || submitting) return;
    if (!requireAuth('Зарегистрируйтесь, чтобы решать олимпиадные задачи и зарабатывать очки')) return;
    if (!token || !answer.trim()) return;
    setSubmitting(true);
    setError('');
    const r = await olympiadApi.submitAnswer(problem.id, answer, token);
    setSubmitting(false);
    if (r.error) {
      setError(r.code === 'EMAIL_NOT_VERIFIED' ? 'Подтвердите email, чтобы решать задачи.' : r.error);
      return;
    }
    if (!r.data) return;
    if (r.data.correct) {
      setFeedback('correct');
      if (r.data.problem) setProblem(r.data.problem);
      setMy(prev => ({ solved: true, revealed: prev?.revealed ?? false, tries: (prev?.tries ?? 0) + 1, pointsEarned: r.data!.pointsEarned ?? 0 }));
      if (!r.data.alreadySolved) {
        setEarned(r.data.pointsEarned ?? 0);
        setUnlocked(r.data.unlockedAchievements ?? []);
      }
    } else {
      setFeedback('wrong');
      setMy(prev => ({ solved: false, revealed: prev?.revealed ?? false, tries: r.data!.tries ?? (prev?.tries ?? 0) + 1 }));
      setTimeout(() => { setFeedback(f => f === 'wrong' ? null : f); inputRef.current?.focus(); }, 1600);
    }
  };

  const handleReveal = async () => {
    if (!problem) return;
    if (!requireAuth('Зарегистрируйтесь, чтобы открывать разборы задач')) return;
    if (!token) return;
    const r = await olympiadApi.revealSolution(problem.id, token);
    if (r.error) {
      setError(r.code === 'EMAIL_NOT_VERIFIED' ? 'Подтвердите email, чтобы открывать разборы.' : r.error);
      return;
    }
    if (r.data) { setProblem(r.data.problem); setMy(r.data.my); }
  };

  if (loading) {
    return (
      <div className="container py-8 max-w-3xl space-y-4">
        <Skeleton className="h-8 w-48" /><Skeleton className="h-40 rounded-xl" /><Skeleton className="h-24 rounded-xl" />
      </div>
    );
  }
  if (notFound || !problem) {
    return (
      <div className="container py-16 text-center">
        <p className="text-lg font-semibold mb-2">Задача не найдена</p>
        <Button asChild variant="outline"><Link to="/olympiad/tasks">К списку задач</Link></Button>
      </div>
    );
  }

  return (
    <div className="container py-8 max-w-3xl space-y-5">
      <div className="flex items-center gap-2 flex-wrap">
        <Button asChild variant="ghost" size="sm"><Link to="/olympiad/tasks"><ArrowLeft className="w-4 h-4 mr-1" />Задачи</Link></Button>
        <LevelBadge level={problem.level} />
        {problem.topic && <span className="text-sm text-muted-foreground">{problem.topic}</span>}
        {problem.year && <span className="text-sm text-muted-foreground">· {problem.year}</span>}
        <span className="ml-auto text-sm font-bold text-amber-600 dark:text-amber-400">+{problem.points} очков</span>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-xl md:text-2xl">{problem.title}</CardTitle>
        </CardHeader>
        <CardContent>
          <OlympiadContent text={problem.content} />
        </CardContent>
      </Card>

      {/* Подсказки */}
      {problem.hints.length > 0 && !showSolution && (
        <Card>
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <span className="flex items-center gap-2 text-sm font-semibold"><Lightbulb className="w-4 h-4 text-amber-500" /> Подсказки</span>
              {hintsShown < problem.hints.length && (
                <Button size="sm" variant="outline" onClick={() => setHintsShown(n => n + 1)}>
                  Показать подсказку {hintsShown + 1} из {problem.hints.length}
                </Button>
              )}
            </div>
            <AnimatePresence>
              {problem.hints.slice(0, hintsShown).map((h, i) => (
                <motion.div key={i} initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                  className="rounded-lg bg-amber-500/10 border border-amber-500/20 px-3 py-2 text-sm">
                  <OlympiadContent text={h} />
                </motion.div>
              ))}
            </AnimatePresence>
          </CardContent>
        </Card>
      )}

      {/* Ответ */}
      {!solved ? (
        <Card className={feedback === 'wrong' ? 'border-red-500/50' : ''}>
          <CardContent className="p-4 space-y-3">
            <p className="text-sm font-semibold">Ваш ответ</p>
            <div className="flex gap-2">
              <Input
                ref={inputRef}
                value={answer}
                onChange={e => setAnswer(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleSubmit(); }}
                placeholder="Введите ответ…"
                className="h-11 text-base"
                disabled={submitting}
              />
              <Button onClick={handleSubmit} disabled={submitting || !answer.trim()} className="h-11 px-5">
                <Send className="w-4 h-4 mr-1.5" />{submitting ? 'Проверка…' : 'Проверить'}
              </Button>
            </div>
            {feedback === 'wrong' && (
              <p className="flex items-center gap-1.5 text-sm text-red-600 dark:text-red-400 font-medium">
                <XCircle className="w-4 h-4" /> Неверно. Попробуйте ещё раз{my?.tries ? ` (попытка ${my.tries})` : ''}.
              </p>
            )}
            {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
            {revealed && (
              <p className="text-xs text-muted-foreground">Разбор уже открыт — решение этой задачи очков не принесёт.</p>
            )}
            {!revealed && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="ghost" size="sm" className="text-muted-foreground">
                    <Eye className="w-4 h-4 mr-1.5" />Сдаться и посмотреть разбор
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Открыть разбор?</AlertDialogTitle>
                    <AlertDialogDescription>
                      После просмотра разбора задача перестанет приносить очки ({problem.points}). Подсказки кончились — может, ещё одна попытка?
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Продолжить решать</AlertDialogCancel>
                    <AlertDialogAction onClick={handleReveal}>Открыть разбор</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </CardContent>
        </Card>
      ) : (
        <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }}>
          <Card className="border-emerald-500/40 bg-emerald-500/5">
            <CardContent className="p-4">
              <p className="flex items-center gap-2 font-semibold text-emerald-700 dark:text-emerald-400">
                <CheckCircle2 className="w-5 h-5" /> Решено!
                {earned !== null && earned > 0 && <span className="text-amber-600 dark:text-amber-400">+{earned} очков</span>}
                {earned === 0 && <span className="text-muted-foreground text-sm font-normal">(без очков — разбор был открыт)</span>}
              </p>
              {problem.answer && <p className="text-sm mt-1 text-muted-foreground">Правильный ответ: <span className="font-mono font-semibold text-foreground">{problem.answer}</span></p>}
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Новые достижения */}
      <AnimatePresence>
        {unlocked.map(a => (
          <motion.div key={a.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <Card className="border-amber-500/40 bg-amber-500/5">
              <CardContent className="p-4 flex items-center gap-3">
                <span className="text-3xl">{a.icon}</span>
                <div>
                  <p className="font-bold flex items-center gap-1.5"><Award className="w-4 h-4 text-amber-500" /> Достижение: {a.name}</p>
                  <p className="text-sm text-muted-foreground">{a.description} · +{a.xp} XP</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </AnimatePresence>

      {/* Разбор */}
      {showSolution && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Lightbulb className="w-5 h-5 text-amber-500" /> Пошаговый разбор
            </CardTitle>
          </CardHeader>
          <CardContent>
            <OlympiadContent text={problem.solution ?? ''} />
            {problem.source && <p className="text-xs text-muted-foreground mt-4">{problem.source}</p>}
          </CardContent>
        </Card>
      )}

      <div className="flex justify-between">
        <Button asChild variant="outline"><Link to="/olympiad/tasks">К списку задач</Link></Button>
        {(solved || revealed) && (
          <Button asChild><Link to={`/olympiad/tasks${problem.subject ? `?subject=${problem.subject.slug}` : ''}`}>Следующая задача</Link></Button>
        )}
      </div>
    </div>
  );
}
