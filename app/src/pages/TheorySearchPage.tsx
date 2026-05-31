import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, BookOpen, Search, Tag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { MathFormula } from '@/components/ui/MathFormula';
import { apiClient } from '@/lib/api/client';
import type { Theory } from '@/types';

export function TheorySearchPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const tag = params.get('tag') ?? '';

  const [results, setResults] = useState<Theory[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(true);
    void apiClient(`/theory/search?tag=${encodeURIComponent(tag)}`).then(res => {
      if (res.data) setResults((res.data as { items: Theory[] }).items ?? []);
      setIsLoading(false);
    });
  }, [tag]);

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 bg-background/90 backdrop-blur-md border-b">
        <div className="container py-4 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex items-center gap-2">
            <Search className="w-5 h-5 text-muted-foreground" />
            <h1 className="text-xl font-bold">Теория по тегу</h1>
            {tag && <Badge variant="secondary" className="gap-1"><Tag className="w-3 h-3" />{tag}</Badge>}
          </div>
        </div>
      </header>

      <main className="container py-8 max-w-3xl">
        {isLoading ? (
          <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-28 rounded-xl" />)}</div>
        ) : results.length === 0 ? (
          <Card className="p-12 text-center">
            <BookOpen className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-30" />
            <h2 className="text-lg font-semibold mb-2">Теория не найдена</h2>
            <p className="text-muted-foreground mb-4">
              {tag ? `По тегу «${tag}» пока нет теоретических статей` : 'Введите поисковый запрос'}
            </p>
            <Button onClick={() => navigate('/')}>На главную</Button>
          </Card>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">Найдено {results.length} статей</p>
            {results.map((t, i) => (
              <motion.div key={t.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                <Link to={`/theory/${t.subjectId}/${t.topicId ?? ''}`}>
                  <Card className="hover:shadow-md transition-shadow cursor-pointer">
                    <CardContent className="p-5">
                      <div className="flex items-start gap-3 mb-2">
                        <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                          <BookOpen className="w-5 h-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold mb-1">{t.title}</h3>
                          <div className="text-sm text-muted-foreground line-clamp-3">
                            <MathFormula formula={t.content.substring(0, 200) + '...'} inline />
                          </div>
                        </div>
                      </div>
                      {t.tags && t.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-3 pl-13">
                          {t.tags.slice(0, 5).map(tg => (
                            <Badge key={tg} variant="outline" className="text-xs">{tg}</Badge>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </Link>
              </motion.div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

export default TheorySearchPage;
