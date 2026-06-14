/**
 * Страница теории по предмету
 * 
 * Показывает теоретические материалы, формулы и примеры
 * 
 * Ссылки на API:
 * - GET /api/subjects/:slug/topics - список тем
 * - GET /api/topics/:topicId/theory - теория по теме
 */

import { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowLeft, 
  BookOpen, 
  Calculator, 
  ChevronRight, 
  ChevronDown,
  Lightbulb,
  Play,
  CheckCircle,
  Copy,
  AlertTriangle,
  Target,
  Sparkles
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { getSubjectBySlug, fetchTopicsBySubjectId, fetchTheoryByTopicId, fetchSubtopicsByTopicId } from '@/data/subjects';
import { MathFormula } from '@/components/ui/MathFormula';
import { RichText } from '@/components/ui/RichText';
import { TheoryArticleSkeleton, CardRowsSkeleton } from '@/components/Skeletons';
import type { Theory, Formula, Example, Topic } from '@/types';

interface SubtopicLite { id: string; name: string; questionsCount: number; }

// Formula component with copy button
function FormulaBlock({ formula }: { formula: Formula }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(formula.formula);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="p-4 bg-muted/50 rounded-xl border border-border">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <p className="text-sm text-muted-foreground mb-1">{formula.name}</p>
          <p className="text-lg font-mono bg-background px-4 py-2 rounded-lg border">
            {formula.formula}
          </p>
          {formula.description && (
            <p className="text-sm text-muted-foreground mt-2">{formula.description}</p>
          )}
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleCopy}
          className="shrink-0"
        >
          {copied ? <CheckCircle className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
        </Button>
      </div>
    </div>
  );
}

// Example component
function ExampleBlock({ example, index }: { example: Example; index: number }) {
  const [showSolution, setShowSolution] = useState(false);

  return (
    <div className="p-4 border border-border rounded-xl">
      <div className="flex items-center gap-2 mb-3">
        <Badge variant="secondary">Пример {index + 1}</Badge>
      </div>
      <p className="font-medium mb-4">{example.problem}</p>
      
      <Button
        variant="outline"
        size="sm"
        onClick={() => setShowSolution(!showSolution)}
        className="mb-2"
      >
        <Lightbulb className="w-4 h-4 mr-2" />
        {showSolution ? 'Скрыть решение' : 'Показать решение'}
      </Button>
      
      <AnimatePresence>
        {showSolution && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-4 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg"
          >
            <p className="font-medium text-green-800 dark:text-green-400 mb-2">Решение:</p>
            <p className="text-green-700 dark:text-green-500 whitespace-pre-wrap font-mono text-sm">
              {example.solution}
            </p>
            {example.explanation && (
              <p className="mt-3 text-sm text-green-600 dark:text-green-400">
                {example.explanation}
              </p>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Theory Card component
function TheoryCard({ theory, subjectColor, onPractice, onPracticeSubtopic }: { theory: Theory; subjectColor: string; onPractice?: () => void; onPracticeSubtopic?: () => void }) {
  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-4">
        <div className="flex items-center gap-3 mb-2">
          <div 
            className="w-10 h-10 rounded-lg flex items-center justify-center text-white"
            style={{ background: subjectColor }}
          >
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <CardTitle className="text-xl sm:text-2xl">{theory.title}</CardTitle>
            <div className="flex flex-wrap gap-1 mt-1">
              {theory.tags.map(tag => (
                <Badge key={tag} variant="secondary" className="text-xs">{tag}</Badge>
              ))}
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Краткий вывод */}
        {theory.summary && (
          <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 flex gap-3">
            <Sparkles className="w-5 h-5 text-primary shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-primary mb-1">Кратко о теме</p>
              <div className="text-base leading-relaxed"><MathFormula formula={theory.summary} /></div>
            </div>
          </div>
        )}

        {/* Content: markdown (заголовки/списки/цитаты) + KaTeX */}
        <RichText content={theory.content} className="text-base sm:text-[1.06rem]" />

        {/* Formulas */}
        {theory.formulas && theory.formulas.length > 0 && (
          <div className="space-y-3">
            <h4 className="font-semibold flex items-center gap-2">
              <Calculator className="w-5 h-5" />
              Формулы
            </h4>
            <div className="space-y-3">
              {theory.formulas.map(formula => (
                <FormulaBlock key={formula.id} formula={formula} />
              ))}
            </div>
          </div>
        )}

        {/* Examples */}
        {theory.examples && theory.examples.length > 0 && (
          <div className="space-y-3">
            <h4 className="font-semibold flex items-center gap-2">
              <Lightbulb className="w-5 h-5" />
              Примеры
            </h4>
            <div className="space-y-4">
              {theory.examples.map((example, index) => (
                <ExampleBlock key={example.id} example={example} index={index} />
              ))}
            </div>
          </div>
        )}

        {/* Типичные ошибки */}
        {theory.commonMistakes && theory.commonMistakes.length > 0 && (
          <div className="rounded-xl border border-red-200 dark:border-red-900/40 bg-red-50 dark:bg-red-950/20 p-4">
            <h4 className="font-semibold flex items-center gap-2 text-red-700 dark:text-red-400 mb-2">
              <AlertTriangle className="w-5 h-5" />Типичные ошибки
            </h4>
            <ul className="space-y-2">
              {theory.commonMistakes.map((m, i) => (
                <li key={i} className="flex gap-2 text-sm sm:text-base"><span className="text-red-500 shrink-0">✗</span><span><MathFormula formula={m} inline /></span></li>
              ))}
            </ul>
          </div>
        )}

        {/* Экзаменационные ловушки */}
        {theory.examTraps && theory.examTraps.length > 0 && (
          <div className="rounded-xl border border-amber-200 dark:border-amber-900/40 bg-amber-50 dark:bg-amber-950/20 p-4">
            <h4 className="font-semibold flex items-center gap-2 text-amber-700 dark:text-amber-400 mb-2">
              <Target className="w-5 h-5" />Ловушки на экзамене
            </h4>
            <ul className="space-y-2">
              {theory.examTraps.map((t, i) => (
                <li key={i} className="flex gap-2 text-sm sm:text-base"><span className="text-amber-500 shrink-0">⚠</span><span><MathFormula formula={t} inline /></span></li>
              ))}
            </ul>
          </div>
        )}

        {/* Practice Buttons — отдельно по подтеме и по всей теме (без путаницы) */}
        <div className="pt-4 border-t border-border space-y-2">
          {onPracticeSubtopic && (
            <Button
              className="w-full text-white"
              style={{ background: subjectColor }}
              onClick={onPracticeSubtopic}
            >
              <Play className="w-4 h-4 mr-2" />
              Практика по подтеме «{theory.title}»
            </Button>
          )}
          <Button
            variant={onPracticeSubtopic ? 'outline' : 'default'}
            className="w-full"
            style={onPracticeSubtopic ? undefined : { background: subjectColor }}
            onClick={onPractice}
          >
            <Play className="w-4 h-4 mr-2" />
            Практиковать всю тему
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export function TheoryPage() {
  const { slug, topicId } = useParams<{ slug: string; topicId?: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  // Подтема, к которой нужно прокрутить (из кнопки «перейти к теории» в задании).
  const [pendingScroll, setPendingScroll] = useState<string | null>(searchParams.get('subtopic'));
  const [highlightSub, setHighlightSub] = useState<string | null>(null);

  // Получаем предмет
  const subject = slug ? getSubjectBySlug(slug) : undefined;
  
  // ---------------------------------------------------
  // СОСТОЯНИЕ
  // ---------------------------------------------------
  
  const [topics, setTopics] = useState<Topic[]>([]);
  const [theoryItems, setTheoryItems] = useState<Theory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [subtopicsByTopic, setSubtopicsByTopic] = useState<Record<string, SubtopicLite[]>>({});

  const [selectedTopic, setSelectedTopic] = useState<string | null>(topicId || null);
  const [expandedTopics, setExpandedTopics] = useState<Set<string>>(new Set());

  // ---------------------------------------------------
  // ЗАГРУЗКА ДАННЫХ
  // ---------------------------------------------------
  
  useEffect(() => {
    const loadData = async () => {
      if (!subject) return;
      
      setIsLoading(true);
      
      const topicsData = await fetchTopicsBySubjectId(subject.id);
      setTopics(topicsData);

      if (topicId) {
        const theoryData = await fetchTheoryByTopicId(topicId);
        setTheoryItems(theoryData);
        setSelectedTopic(topicId);
      } else if (topicsData.length > 0) {
        // Auto-load first topic theory
        const first = topicsData[0];
        setSelectedTopic(first.id);
        const theoryData = await fetchTheoryByTopicId(first.id);
        setTheoryItems(theoryData);
      }

      setIsLoading(false);
    };
    
    loadData();
  }, [subject, topicId]);

  // ---------------------------------------------------
  // ОБРАБОТЧИКИ
  // ---------------------------------------------------
  
  const toggleTopic = async (id: string) => {
    const newExpanded = new Set(expandedTopics);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
      // Lazy-load subtopics
      if (!subtopicsByTopic[id]) {
        const subs = await fetchSubtopicsByTopicId(id);
        setSubtopicsByTopic(prev => ({
          ...prev,
          [id]: subs.map(s => ({ id: s.id, name: s.name, questionsCount: s.questionsCount })),
        }));
      }
    }
    setExpandedTopics(newExpanded);
  };

  const handleTopicClick = (topic: Topic) => {
    setSelectedTopic(topic.id);
    void fetchTheoryByTopicId(topic.id).then(setTheoryItems);
    void toggleTopic(topic.id);
  };

  // Клик по подтеме в боковом меню → прокрутка к её теории (НЕ сразу в практику).
  const goToSubtopicTheory = async (topicOfSub: string, subId: string) => {
    if (selectedTopic !== topicOfSub) {
      setSelectedTopic(topicOfSub);
      const theory = await fetchTheoryByTopicId(topicOfSub);
      setTheoryItems(theory);
    }
    setPendingScroll(subId);
  };

  // Если URL-параметр ?subtopic= меняется без размонтирования (переход с другого
  // задания, пока мы уже на странице теории) — заново ставим цель прокрутки.
  const subParam = searchParams.get('subtopic');
  useEffect(() => {
    if (subParam) setPendingScroll(subParam);
  }, [subParam, topicId]);

  // После загрузки теории прокручиваем к нужной подтеме и подсвечиваем её.
  useEffect(() => {
    if (!pendingScroll || isLoading || theoryItems.length === 0) return;
    const target = pendingScroll;
    const t = setTimeout(() => {
      const el = document.getElementById(`theory-sub-${target}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        setHighlightSub(target);
        setTimeout(() => setHighlightSub((h) => (h === target ? null : h)), 2200);
      }
      setPendingScroll(null);
    }, 150);
    return () => clearTimeout(t);
  }, [pendingScroll, isLoading, theoryItems]);

  // ---------------------------------------------------
  // РЕНДЕР
  // ---------------------------------------------------
  
  if (!subject) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">Предмет не найден</h1>
          <Button onClick={() => navigate('/')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            На главную
          </Button>
        </div>
      </div>
    );
  }
  
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container py-8">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            <div className="lg:col-span-1"><CardRowsSkeleton rows={8} /></div>
            <div className="lg:col-span-3 space-y-6">
              <TheoryArticleSkeleton />
              <TheoryArticleSkeleton />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-16 z-40 bg-background/95 backdrop-blur-md border-b border-border">
        <div className="container py-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate(`/subject/${slug}`)}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <button onClick={() => navigate('/')} className="text-left hover:opacity-70 transition-opacity">
              <h1 className="text-xl font-bold flex items-center gap-1">
                {subject.name}
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </h1>
              <p className="text-sm text-muted-foreground">Теория и формулы</p>
            </button>
          </div>
        </div>
      </header>

      <main className="container py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar - Topics */}
          <div className="lg:col-span-1">
            <Card className="sticky top-40">
              <CardHeader>
                <CardTitle className="text-base">Темы</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <nav className="space-y-1 max-h-[70vh] overflow-y-auto">
                  {topics.map((topic: Topic) => {
                    const subs = subtopicsByTopic[topic.id] ?? [];
                    return (
                      <div key={topic.id}>
                        <button
                          onClick={() => handleTopicClick(topic)}
                          className={`w-full flex items-center justify-between px-4 py-2.5 text-left transition-colors ${
                            selectedTopic === topic.id ? 'bg-primary/10 text-primary' : 'hover:bg-muted'
                          }`}
                        >
                          <span className="text-sm font-medium truncate">{topic.name}</span>
                          <ChevronDown
                            className={`w-4 h-4 shrink-0 transition-transform ${expandedTopics.has(topic.id) ? 'rotate-180' : ''}`}
                          />
                        </button>

                        <AnimatePresence>
                          {expandedTopics.has(topic.id) && subs.length > 0 && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              className="overflow-hidden"
                            >
                              <div className="pl-3 pr-2 pb-2 space-y-0.5">
                                {subs.map(sub => (
                                  <div
                                    key={sub.id}
                                    className="group w-full flex items-center justify-between gap-1 px-2 py-1 text-xs rounded-lg hover:bg-muted transition-colors"
                                  >
                                    <button
                                      onClick={() => void goToSubtopicTheory(topic.id, sub.id)}
                                      className="flex items-center gap-1.5 min-w-0 flex-1 text-left text-muted-foreground hover:text-foreground py-0.5"
                                      title="Открыть теорию по подтеме"
                                    >
                                      <ChevronRight className="w-3 h-3 shrink-0" />
                                      <span className="truncate">{sub.name}</span>
                                    </button>
                                    {sub.questionsCount > 0 && (
                                      <button
                                        onClick={() => navigate(`/practice/${slug}?subtopic=${sub.id}`)}
                                        className="shrink-0 inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] text-primary opacity-60 hover:opacity-100 hover:bg-primary/10 transition-all"
                                        title="Перейти к практике по подтеме"
                                      >
                                        <Play className="w-2.5 h-2.5" />{sub.questionsCount}
                                      </button>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    );
                  })}
                </nav>
              </CardContent>
            </Card>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3 space-y-6">
            {theoryItems.length > 0 ? (
              theoryItems.map((theory: Theory, index: number) => (
                <motion.div
                  key={theory.id}
                  id={theory.subtopicId ? `theory-sub-${theory.subtopicId}` : undefined}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(index, 6) * 0.08 }}
                  className={`scroll-mt-40 rounded-2xl transition-shadow ${
                    highlightSub && highlightSub === theory.subtopicId ? 'ring-2 ring-primary ring-offset-2 ring-offset-background' : ''
                  }`}
                >
                  <TheoryCard
                    theory={theory}
                    subjectColor={subject.color}
                    onPractice={() => navigate(`/practice/${slug}${selectedTopic ? `?topic=${selectedTopic}` : ''}`)}
                    onPracticeSubtopic={theory.subtopicId ? () => navigate(`/practice/${slug}?subtopic=${theory.subtopicId}`) : undefined}
                  />
                </motion.div>
              ))
            ) : (
              <Card className="p-12 text-center">
                <BookOpen className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-medium mb-2">Теория в разработке</h3>
                <p className="text-muted-foreground">
                  Материалы по этой теме скоро появятся
                </p>
              </Card>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

// Named export for lazy loading
export default TheoryPage;
