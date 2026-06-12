import { useEffect, useState, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Star, Filter, BookOpen, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { MathFormula } from '@/components/ui/MathFormula';
import { PageHeader } from '@/components/PageHeader';
import { useAppStore } from '@/store/useAppStore';
import { apiClient } from '@/lib/api/client';
import type { Question } from '@/types';

interface FavoriteQuestion extends Question {
  subject?: { name: string; color: string; slug: string };
}

export function FavoritesPage() {
  const navigate = useNavigate();
  const { user, token, removeFavorite } = useAppStore();
  const [questions, setQuestions] = useState<FavoriteQuestion[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadFavorites = useCallback(async () => {
    if (!token) { setIsLoading(false); return; }
    const res = await apiClient('/users/favorites', { token });
    if (res.data) {
      const favs = res.data as Array<{ questionId: string }>;
      // Load full question data
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

  const handleRemove = async (questionId: string) => {
    await removeFavorite(questionId);
    setQuestions(prev => prev.filter(q => q.id !== questionId));
  };

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

  return (
    <div className="min-h-screen bg-background">
      <main className="container py-8 max-w-3xl">
        <PageHeader
          icon={Star}
          title="Избранные задания"
          subtitle={isLoading ? 'Загружаем подборку…' : `${questions.length} заданий в вашей коллекции — возвращайтесь к ним в любой момент.`}
          accent="from-amber-400 to-amber-600"
        />
        {isLoading ? (
          <div className="space-y-4">{[1,2,3].map(i => <Skeleton key={i} className="h-32 rounded-xl" />)}</div>
        ) : questions.length === 0 ? (
          <div className="text-center py-16">
            <Star className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-20" />
            <h2 className="text-xl font-semibold mb-2">Нет избранных заданий</h2>
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
            {questions.map((q, i) => (
              <motion.div key={q.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                <Card className="overflow-hidden hover:shadow-md transition-shadow">
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between gap-4 mb-3">
                      <div className="flex flex-wrap gap-2">
                        <Badge variant="outline" className="text-xs font-mono">#{q.externalId ?? q.id.slice(-6)}</Badge>
                        {q.section && <Badge variant="secondary" className="text-xs">{q.section}</Badge>}
                        <Badge className={`text-xs ${difficultyColor[q.difficulty]}`}>{difficultyLabel[q.difficulty]}</Badge>
                        {q.part && <Badge variant="outline" className="text-xs">Часть {q.part}</Badge>}
                        {q.source && <Badge variant="outline" className="text-xs text-muted-foreground">{q.source}</Badge>}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Button variant="ghost" size="icon" className="w-8 h-8 text-destructive hover:text-destructive" onClick={() => handleRemove(q.id)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                        <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                      </div>
                    </div>
                    <MathFormula formula={q.content} className="text-base mb-4" />
                    {q.tags && q.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mb-4">
                        {q.tags.map(tag => <Badge key={tag} variant="secondary" className="text-xs">{tag}</Badge>)}
                      </div>
                    )}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span>{q.timesSolved} решений</span>
                        <span>{q.timesSolved > 0 ? Math.round((q.timesCorrect / q.timesSolved) * 100) : 0}% верно</span>
                      </div>
                      <Link to={`/practice/${q.subjectId}?question=${q.id}`}>
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
      </main>
    </div>
  );
}

export default FavoritesPage;
