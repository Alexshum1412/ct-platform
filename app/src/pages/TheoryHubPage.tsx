import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  BookOpen, Search, Filter, Star, Play, ChevronRight, RotateCcw,
  PanelLeftClose, PanelLeftOpen, X, GraduationCap, AlertTriangle, Target, Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MathFormula } from '@/components/ui/MathFormula';
import { RichText } from '@/components/ui/RichText';
import { apiClient } from '@/lib/api/client';
import { useAppStore } from '@/store/useAppStore';
import { subjects as staticSubjects } from '@/data/subjects';

interface TheoryItem {
  id: string;
  title: string;
  content: string;
  summary?: string | null;
  commonMistakes?: string[] | null;
  examTraps?: string[] | null;
  tags: string[];
  subjectId: string;
  topicId: string | null;
  subtopicId: string | null;
  order: number;
  subjectName: string | null;
  subjectSlug: string | null;
  subjectColor: string | null;
  topicName: string | null;
  subtopicName: string | null;
  topicQuestionCount: number;
  subtopicQuestionCount: number;
}

// Strip KaTeX delimiters + light markdown for a clean collapsed excerpt (no KaTeX cost).
function toExcerpt(s: string, len = 260): string {
  const plain = (s || '')
    .replace(/\${1,2}([^$]*)\${1,2}/g, '$1')
    .replace(/[#*_>`]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  return plain.length > len ? plain.slice(0, len).trimEnd() + '…' : plain;
}

// Theory tags were auto-generated and are often a truncated copy of the title
// ("Натуральные числа. НОД, НОК. п…"). Show only genuinely useful, clean chips.
function cleanTags(tags: string[], title: string): string[] {
  const tl = (title || '').toLowerCase().trim();
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of tags || []) {
    const tag = (raw || '').trim();
    if (!tag || tag.length > 30) continue;
    const low = tag.toLowerCase();
    if (low.length > 10 && tl.startsWith(low.slice(0, Math.min(low.length, 22)))) continue; // truncated-title noise
    if (seen.has(low)) continue;
    seen.add(low);
    out.push(tag.charAt(0).toUpperCase() + tag.slice(1));
  }
  return out.slice(0, 6);
}

const PAGE = 24;

export function TheoryHubPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { favoriteTheory, toggleFavoriteTheory } = useAppStore();

  const [items, setItems] = useState<TheoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [search, setSearch] = useState(searchParams.get('q') ?? searchParams.get('tag') ?? '');
  const [selectedSubject, setSelectedSubject] = useState<string>(searchParams.get('subject') ?? 'all');
  const [selectedTopic, setSelectedTopic] = useState<string>('all');
  const [selectedSubtopic, setSelectedSubtopic] = useState<string>('all');
  const [onlyFavorites, setOnlyFavorites] = useState(false);
  const [filtersCollapsed, setFiltersCollapsed] = useState(false);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [visible, setVisible] = useState(PAGE);

  useEffect(() => {
    setIsLoading(true);
    void apiClient('/theory?limit=2000').then(res => {
      if (res.data) setItems((res.data as { items: TheoryItem[] }).items ?? []);
      setIsLoading(false);
    });
  }, []);

  // Static order for subjects so the filter reads naturally.
  const subjectOrder = useMemo(() => new Map(staticSubjects.map((s, i) => [s.id, i])), []);

  // Filter option lists derived from loaded data.
  const subjectOptions = useMemo(() => {
    const map = new Map<string, { id: string; name: string; color: string | null }>();
    for (const t of items) if (!map.has(t.subjectId)) map.set(t.subjectId, { id: t.subjectId, name: t.subjectName ?? t.subjectId, color: t.subjectColor });
    return [...map.values()].sort((a, b) => (subjectOrder.get(a.id) ?? 99) - (subjectOrder.get(b.id) ?? 99));
  }, [items, subjectOrder]);

  const topicOptions = useMemo(() => {
    const pool = selectedSubject === 'all' ? items : items.filter(t => t.subjectId === selectedSubject);
    const map = new Map<string, string>();
    for (const t of pool) if (t.topicId && !map.has(t.topicId)) map.set(t.topicId, t.topicName ?? t.topicId);
    return [...map.entries()].map(([id, name]) => ({ id, name }));
  }, [items, selectedSubject]);

  const subtopicOptions = useMemo(() => {
    if (selectedTopic === 'all') return [];
    const map = new Map<string, string>();
    for (const t of items) if (t.topicId === selectedTopic && t.subtopicId && !map.has(t.subtopicId)) map.set(t.subtopicId, t.subtopicName ?? t.subtopicId);
    return [...map.entries()].map(([id, name]) => ({ id, name }));
  }, [items, selectedTopic]);

  // Apply filters.
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter(t => {
      if (selectedSubject !== 'all' && t.subjectId !== selectedSubject) return false;
      if (selectedTopic !== 'all' && t.topicId !== selectedTopic) return false;
      if (selectedSubtopic !== 'all' && t.subtopicId !== selectedSubtopic) return false;
      if (onlyFavorites && !favoriteTheory.includes(t.id)) return false;
      if (q) {
        const hay = (t.title + ' ' + t.content + ' ' + t.tags.join(' ')).toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [items, search, selectedSubject, selectedTopic, selectedSubtopic, onlyFavorites, favoriteTheory]);

  // Reset paging when filters change.
  useEffect(() => { setVisible(PAGE); }, [search, selectedSubject, selectedTopic, selectedSubtopic, onlyFavorites]);

  const resetFilters = () => {
    setSearch(''); setSelectedSubject('all'); setSelectedTopic('all'); setSelectedSubtopic('all'); setOnlyFavorites(false);
  };

  const toggleExpand = (id: string) => setExpanded(prev => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });

  const openPractice = (t: TheoryItem) => {
    const slug = t.subjectSlug ?? t.subjectId;
    if (t.subtopicQuestionCount > 0 && t.subtopicId) navigate(`/practice/${slug}?subtopic=${t.subtopicId}`);
    else if (t.topicQuestionCount > 0 && t.topicId) navigate(`/practice/${slug}?topic=${t.topicId}`);
  };

  const shown = filtered.slice(0, visible);
  const activeFilters = (selectedSubject !== 'all') || (selectedTopic !== 'all') || (selectedSubtopic !== 'all') || onlyFavorites || !!search.trim();

  return (
    <div className="min-h-screen bg-background">
      {/* Hero header */}
      <div className="relative overflow-hidden border-b border-border">
        <div className="absolute -top-24 -right-20 w-96 h-96 rounded-full bg-primary/15 blur-[80px] pointer-events-none" />
        <div className="absolute -bottom-32 left-1/4 w-80 h-80 rounded-full bg-violet-500/10 blur-[80px] pointer-events-none" />
        <div className="absolute inset-0 bg-grid-faint pointer-events-none" />
        <div className="relative container py-8 lg:py-10">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary to-violet-600 shadow-lg shadow-primary/25 text-white flex items-center justify-center">
              <GraduationCap className="w-7 h-7" />
            </div>
            <div>
              <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">Теория</h1>
              <p className="text-muted-foreground text-base sm:text-lg">
                Вся теория по всем предметам в одном месте — учитесь и сразу переходите к практике
              </p>
            </div>
          </div>

          {/* Big search */}
          <div className="relative max-w-2xl mt-5">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Поиск по теории: формула, правило, тема…"
              className="w-full pl-12 pr-10 py-3.5 rounded-2xl border-2 border-border bg-background text-base focus:border-primary focus:outline-none transition-colors"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-lg hover:bg-muted text-muted-foreground" title="Очистить">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      <main className="container py-8">
        <div className={`grid grid-cols-1 gap-6 lg:gap-8 ${filtersCollapsed ? 'lg:grid-cols-1' : 'lg:grid-cols-4'}`}>
          {/* Filters */}
          {(
            <aside className={`space-y-6 ${filtersCollapsed ? 'lg:hidden' : 'lg:col-span-1'}`}>
              <Card>
                <CardHeader className="flex-row items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Filter className="w-4 h-4" /> Фильтры
                  </CardTitle>
                  <button
                    onClick={() => setFiltersCollapsed(true)}
                    className="hidden lg:inline-flex p-1.5 rounded-lg hover:bg-muted text-muted-foreground"
                    title="Скрыть фильтры"
                  >
                    <PanelLeftClose className="w-4 h-4" />
                  </button>
                </CardHeader>
                <CardContent className="space-y-4">
                  <button
                    onClick={() => setOnlyFavorites(v => !v)}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg border-2 transition-all ${
                      onlyFavorites
                        ? 'border-amber-400 bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400'
                        : 'border-border hover:border-amber-300'
                    }`}
                  >
                    <span className="text-sm font-medium flex items-center gap-1.5">⭐ Избранная теория</span>
                    <span className="text-xs">{favoriteTheory.length}</span>
                  </button>

                  <div>
                    <label className="text-sm font-medium mb-2 block">Предмет</label>
                    <select
                      value={selectedSubject}
                      onChange={(e) => { setSelectedSubject(e.target.value); setSelectedTopic('all'); setSelectedSubtopic('all'); }}
                      className="w-full px-3 py-2.5 rounded-lg border border-border bg-background text-sm"
                    >
                      <option value="all">Все предметы</option>
                      {subjectOptions.map(s => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>
                  </div>

                  {topicOptions.length > 0 && (
                    <div>
                      <label className="text-sm font-medium mb-2 block">Тема</label>
                      <select
                        value={selectedTopic}
                        onChange={(e) => { setSelectedTopic(e.target.value); setSelectedSubtopic('all'); }}
                        className="w-full px-3 py-2.5 rounded-lg border border-border bg-background text-sm"
                      >
                        <option value="all">Все темы</option>
                        {topicOptions.map(t => (
                          <option key={t.id} value={t.id}>{t.name}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  {selectedTopic !== 'all' && subtopicOptions.length > 0 && (
                    <div>
                      <label className="text-sm font-medium mb-2 block">Подтема</label>
                      <select
                        value={selectedSubtopic}
                        onChange={(e) => setSelectedSubtopic(e.target.value)}
                        className="w-full px-3 py-2.5 rounded-lg border border-border bg-background text-sm"
                      >
                        <option value="all">Все подтемы ({subtopicOptions.length})</option>
                        {subtopicOptions.map(s => (
                          <option key={s.id} value={s.id}>{s.name}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  {activeFilters && (
                    <Button variant="outline" className="w-full gap-2" onClick={resetFilters}>
                      <RotateCcw className="w-4 h-4" /> Сбросить фильтры
                    </Button>
                  )}
                </CardContent>
              </Card>
            </aside>
          )}

          {/* Catalog */}
          <div className={filtersCollapsed ? 'w-full max-w-4xl mx-auto' : 'lg:col-span-3'}>
            <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
              <p className="text-sm text-muted-foreground">
                {isLoading ? 'Загрузка теории…' : `Найдено ${filtered.length} ${filtered.length === 1 ? 'статья' : 'статей'}`}
              </p>
              {filtersCollapsed && (
                <Button variant="ghost" size="sm" className="hidden lg:inline-flex gap-2 text-muted-foreground" onClick={() => setFiltersCollapsed(false)}>
                  <PanelLeftOpen className="w-4 h-4" /> Показать фильтры
                </Button>
              )}
            </div>

            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3, 4].map(i => <div key={i} className="h-40 rounded-2xl bg-muted/40 animate-pulse" />)}
              </div>
            ) : filtered.length === 0 ? (
              <Card className="p-12 text-center">
                <BookOpen className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-30" />
                <h2 className="text-lg font-semibold mb-2">Ничего не найдено</h2>
                <p className="text-muted-foreground mb-4">
                  {onlyFavorites ? 'Вы ещё не добавили теорию в избранное' : 'Попробуйте изменить фильтры или поисковый запрос'}
                </p>
                {activeFilters && <Button variant="outline" onClick={resetFilters}>Сбросить фильтры</Button>}
              </Card>
            ) : (
              <div className="space-y-4">
                {shown.map((t, i) => {
                  const isOpen = expanded.has(t.id);
                  const isFav = favoriteTheory.includes(t.id);
                  const canPractice = t.subtopicQuestionCount > 0 || t.topicQuestionCount > 0;
                  const practiceCount = t.subtopicQuestionCount > 0 ? t.subtopicQuestionCount : t.topicQuestionCount;
                  const tags = cleanTags(t.tags, t.title);
                  return (
                    <motion.div
                      key={t.id}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.25, delay: Math.min(i, 8) * 0.03 }}
                    >
                      <Card className="overflow-hidden">
                        <CardContent className="p-5 sm:p-6">
                          {/* Breadcrumb + favorite */}
                          <div className="flex items-start justify-between gap-3 mb-2">
                            <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground flex-wrap min-w-0">
                              <span className="inline-flex items-center gap-1.5 font-medium" style={{ color: t.subjectColor ?? undefined }}>
                                <span className="w-2.5 h-2.5 rounded-full" style={{ background: t.subjectColor ?? 'currentColor' }} />
                                {t.subjectName}
                              </span>
                              {t.topicName && (<><ChevronRight className="w-3.5 h-3.5 shrink-0" /><span className="truncate">{t.topicName}</span></>)}
                              {t.subtopicName && t.subtopicName !== t.topicName && (<><ChevronRight className="w-3.5 h-3.5 shrink-0" /><span className="truncate">{t.subtopicName}</span></>)}
                            </div>
                            <button
                              onClick={() => toggleFavoriteTheory(t.id)}
                              className="p-2 -mr-2 -mt-1 rounded-lg hover:bg-muted transition-colors shrink-0"
                              title={isFav ? 'Убрать из избранного' : 'В избранное'}
                            >
                              <Star className={`w-5 h-5 transition-colors ${isFav ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground'}`} />
                            </button>
                          </div>

                          {/* Title */}
                          <h3 className="text-xl sm:text-2xl font-bold tracking-tight mb-3">{t.title}</h3>

                          {/* Body */}
                          {isOpen ? (
                            <div className="space-y-4">
                              {t.summary && (
                                <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 flex gap-2.5">
                                  <Sparkles className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                                  <div className="text-sm sm:text-base"><span className="font-semibold text-primary">Кратко: </span><MathFormula formula={t.summary} inline /></div>
                                </div>
                              )}
                              <RichText content={t.content} className="text-base" />
                              {t.commonMistakes && t.commonMistakes.length > 0 && (
                                <div className="rounded-xl border border-red-200 dark:border-red-900/40 bg-red-50 dark:bg-red-950/20 p-3">
                                  <p className="font-semibold flex items-center gap-1.5 text-red-700 dark:text-red-400 mb-1.5 text-sm"><AlertTriangle className="w-4 h-4" />Типичные ошибки</p>
                                  <ul className="space-y-1">{t.commonMistakes.map((m, k) => (<li key={k} className="flex gap-1.5 text-sm"><span className="text-red-500 shrink-0">✗</span><span><MathFormula formula={m} inline /></span></li>))}</ul>
                                </div>
                              )}
                              {t.examTraps && t.examTraps.length > 0 && (
                                <div className="rounded-xl border border-amber-200 dark:border-amber-900/40 bg-amber-50 dark:bg-amber-950/20 p-3">
                                  <p className="font-semibold flex items-center gap-1.5 text-amber-700 dark:text-amber-400 mb-1.5 text-sm"><Target className="w-4 h-4" />Ловушки на экзамене</p>
                                  <ul className="space-y-1">{t.examTraps.map((m, k) => (<li key={k} className="flex gap-1.5 text-sm"><span className="text-amber-500 shrink-0">⚠</span><span><MathFormula formula={m} inline /></span></li>))}</ul>
                                </div>
                              )}
                            </div>
                          ) : (
                            <p className="text-muted-foreground leading-relaxed">{toExcerpt(t.content)}</p>
                          )}

                          {/* Tags */}
                          {tags.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 mt-3">
                              {tags.map(tag => (
                                <Badge
                                  key={tag}
                                  variant="secondary"
                                  className="text-xs cursor-pointer hover:bg-primary/15 hover:text-primary transition-colors"
                                  onClick={() => setSearch(tag)}
                                >
                                  {tag}
                                </Badge>
                              ))}
                            </div>
                          )}

                          {/* Actions */}
                          <div className="flex items-center gap-2 mt-4 pt-4 border-t border-border flex-wrap">
                            <Button variant="outline" size="sm" onClick={() => toggleExpand(t.id)} className="gap-1.5">
                              <BookOpen className="w-4 h-4" />
                              {isOpen ? 'Свернуть' : 'Читать полностью'}
                            </Button>
                            {canPractice && (
                              <Button size="sm" className="gap-1.5" onClick={() => openPractice(t)}>
                                <Play className="w-4 h-4" />
                                Практика ({practiceCount})
                              </Button>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  );
                })}

                {visible < filtered.length && (
                  <div className="text-center pt-2">
                    <Button variant="outline" size="lg" onClick={() => setVisible(v => v + PAGE)}>
                      Показать ещё ({filtered.length - visible})
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

export default TheoryHubPage;
