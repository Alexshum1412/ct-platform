/**
 * Теория повышенного уровня: каталог статей с фильтрами + страница статьи.
 * Раздел членский (роуты обёрнуты в MembersOnly в App.tsx), как и базовая теория.
 */
import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, BookOpen, GraduationCap, Search } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { olympiadApi, subjectsApi, type OlympiadTheoryCard } from '@/lib/api/client';
import { LevelBadge, OlympiadContent } from '@/components/olympiad/shared';

interface SubjectOption { id: string; slug: string; name: string }

export function OlympiadTheoryPage() {
  const [articles, setArticles] = useState<OlympiadTheoryCard[]>([]);
  const [subjects, setSubjects] = useState<SubjectOption[]>([]);
  const [subject, setSubject] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    subjectsApi.getAll().then(r => {
      const list = (r.data as { subjects?: SubjectOption[] } | SubjectOption[] | undefined);
      const arr = Array.isArray(list) ? list : list?.subjects ?? [];
      setSubjects(arr.map(s => ({ id: s.id, slug: s.slug, name: s.name })));
    });
  }, []);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    const t = setTimeout(async () => {
      const r = await olympiadApi.getTheory({ subjectId: subject || undefined, q: search || undefined });
      if (!alive) return;
      if (r.data) setArticles(r.data.articles);
      setLoading(false);
    }, search ? 350 : 0);
    return () => { alive = false; clearTimeout(t); };
  }, [subject, search]);

  return (
    <div className="container py-8 space-y-6 max-w-4xl">
      <div className="flex items-center gap-3 flex-wrap">
        <Button asChild variant="ghost" size="sm"><Link to="/olympiad"><ArrowLeft className="w-4 h-4 mr-1" />Олимпиады</Link></Button>
        <h1 className="text-2xl md:text-3xl font-extrabold flex items-center gap-2">
          <GraduationCap className="w-6 h-6 text-primary" /> Теория повышенного уровня
        </h1>
      </div>

      <div className="grid sm:grid-cols-2 gap-2">
        <select value={subject} onChange={e => setSubject(e.target.value)}
          className="h-10 rounded-lg border border-input bg-background px-3 text-sm">
          <option value="">Все предметы</option>
          {subjects.map(s => <option key={s.id} value={s.slug}>{s.name}</option>)}
        </select>
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Поиск статей…" className="pl-9 h-10" />
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}</div>
      ) : articles.length === 0 ? (
        <Card><CardContent className="p-10 text-center text-muted-foreground">
          Статей по выбранным фильтрам не найдено.
        </CardContent></Card>
      ) : (
        <div className="space-y-3">
          {articles.map(a => (
            <Link key={a.id} to={`/olympiad/theory/${a.id}`} className="block">
              <Card className="hover:shadow-md hover:border-primary/40 transition-all">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <LevelBadge level={a.level} short />
                    <span className="text-xs text-muted-foreground">{a.subject?.name}{a.topic ? ` · ${a.topic}` : ''}</span>
                  </div>
                  <p className="font-semibold">{a.title}</p>
                  <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{a.preview}…</p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

export function OlympiadTheoryArticlePage() {
  const { id = '' } = useParams();
  const [article, setArticle] = useState<(OlympiadTheoryCard & { content: string }) | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    olympiadApi.getTheoryArticle(id).then(r => {
      if (!alive) return;
      if (r.data) setArticle(r.data.article);
      setLoading(false);
    });
    return () => { alive = false; };
  }, [id]);

  if (loading) {
    return <div className="container py-8 max-w-3xl space-y-4"><Skeleton className="h-8 w-64" /><Skeleton className="h-96 rounded-xl" /></div>;
  }
  if (!article) {
    return (
      <div className="container py-16 text-center">
        <p className="text-lg font-semibold mb-2">Статья не найдена</p>
        <Button asChild variant="outline"><Link to="/olympiad/theory">К каталогу теории</Link></Button>
      </div>
    );
  }

  return (
    <div className="container py-8 max-w-3xl space-y-5">
      <div className="flex items-center gap-2 flex-wrap">
        <Button asChild variant="ghost" size="sm"><Link to="/olympiad/theory"><ArrowLeft className="w-4 h-4 mr-1" />Теория PRO</Link></Button>
        <LevelBadge level={article.level} />
        <span className="text-sm text-muted-foreground">{article.subject?.name}</span>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-xl md:text-2xl flex items-start gap-2">
            <BookOpen className="w-6 h-6 text-primary shrink-0 mt-0.5" /> {article.title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <OlympiadContent text={article.content} className="text-[0.97rem]" />
        </CardContent>
      </Card>
      {article.subject && (
        <Button asChild variant="outline">
          <Link to={`/olympiad/tasks?subject=${article.subject.slug}`}>Решать задачи по предмету «{article.subject.name}»</Link>
        </Button>
      )}
    </div>
  );
}
