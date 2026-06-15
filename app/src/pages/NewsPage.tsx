import { useEffect, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Newspaper, Pin, ArrowLeft, Calendar, Megaphone, Sparkles, Info } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/PageHeader';
import { RichText } from '@/components/ui/RichText';
import { CardRowsSkeleton } from '@/components/Skeletons';
import { newsApi, type NewsArticle, type NewsCategory } from '@/lib/api/client';

const CAT_META: Record<NewsCategory, { label: string; cls: string; icon: typeof Info }> = {
  PERMANENT: { label: 'Полезное', cls: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300', icon: Info },
  NEWS: { label: 'Новости', cls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300', icon: Megaphone },
  UPDATE: { label: 'Обновления', cls: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300', icon: Sparkles },
};
const FILTERS: { id: NewsCategory | 'ALL'; label: string }[] = [
  { id: 'ALL', label: 'Всё' },
  { id: 'PERMANENT', label: 'Постоянная информация' },
  { id: 'NEWS', label: 'Новости и слухи' },
  { id: 'UPDATE', label: 'Обновления сайта' },
];
const fmtDate = (s: string) => new Date(s).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });

// ====================== Лента ======================
export function NewsFeedPage() {
  const [filter, setFilter] = useState<NewsCategory | 'ALL'>('ALL');
  const [items, setItems] = useState<NewsArticle[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void newsApi.list(filter).then((r) => { if (!cancelled) { setItems(r.data?.items ?? []); setLoading(false); } });
    return () => { cancelled = true; };
  }, [filter]);

  return (
    <div className="min-h-screen bg-background">
      <div className="container py-8">
        <PageHeader
          icon={Newspaper}
          title="Новостная лента"
          subtitle="Полезная информация об экзаменах, новости и обновления платформы"
          accent="from-sky-500 to-indigo-500"
        />

        <div className="flex flex-wrap justify-center gap-2 mb-8">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                filter === f.id ? 'bg-primary text-white shadow-md' : 'bg-muted hover:bg-muted/70 text-muted-foreground hover:text-foreground'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {loading ? (
          <CardRowsSkeleton rows={4} />
        ) : items.length === 0 ? (
          <Card><CardContent className="p-12 text-center text-muted-foreground">
            <Newspaper className="w-12 h-12 mx-auto mb-3 opacity-30" />Пока нет публикаций в этой категории.
          </CardContent></Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 max-w-6xl mx-auto">
            {items.map((a, i) => {
              const meta = CAT_META[a.category] ?? CAT_META.NEWS;
              return (
                <motion.div key={a.id} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i, 9) * 0.05 }}>
                  <Link to={`/news/${a.id}`}>
                    <Card className="h-full overflow-hidden card-lift">
                      {a.imageUrl && (
                        <img src={a.imageUrl} alt="" loading="lazy" className="w-full h-40 object-cover" />
                      )}
                      <CardContent className="p-5">
                        <div className="flex items-center gap-2 mb-2">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${meta.cls}`}>
                            <meta.icon className="w-3 h-3" />{meta.label}
                          </span>
                          {a.pinned && <Pin className="w-3.5 h-3.5 text-amber-500" />}
                        </div>
                        <h3 className="font-bold text-lg leading-snug mb-1.5 line-clamp-2">{a.title}</h3>
                        {a.excerpt && <p className="text-sm text-muted-foreground line-clamp-3">{a.excerpt}</p>}
                        <p className="text-xs text-muted-foreground mt-3 flex items-center gap-1"><Calendar className="w-3 h-3" />{fmtDate(a.createdAt)}</p>
                      </CardContent>
                    </Card>
                  </Link>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ====================== Статья ======================
export function NewsArticlePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [article, setArticle] = useState<NewsArticle | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    void newsApi.get(id).then((r) => {
      if (r.data) setArticle(r.data); else setNotFound(true);
    }).finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return <div className="container py-8 max-w-3xl"><CardRowsSkeleton rows={3} /></div>;
  }
  if (notFound || !article) {
    return (
      <div className="container py-16 text-center">
        <h1 className="text-2xl font-bold mb-3">Статья не найдена</h1>
        <Button onClick={() => navigate('/news')}><ArrowLeft className="w-4 h-4 mr-2" />К ленте новостей</Button>
      </div>
    );
  }
  const meta = CAT_META[article.category] ?? CAT_META.NEWS;
  return (
    <div className="min-h-screen bg-background">
      <article className="container py-8 max-w-3xl">
        <button onClick={() => navigate('/news')} className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors mb-5">
          <ArrowLeft className="w-4 h-4" />К ленте новостей
        </button>
        <div className="flex items-center gap-2 mb-3">
          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${meta.cls}`}>
            <meta.icon className="w-3.5 h-3.5" />{meta.label}
          </span>
          <span className="text-xs text-muted-foreground flex items-center gap-1"><Calendar className="w-3 h-3" />{fmtDate(article.createdAt)}</span>
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight mb-4">{article.title}</h1>
        {article.imageUrl && <img src={article.imageUrl} alt="" className="w-full rounded-2xl border border-border mb-6 object-cover max-h-96" />}
        <RichText content={article.content} className="text-base sm:text-[1.06rem]" />
      </article>
    </div>
  );
}

export default NewsFeedPage;
