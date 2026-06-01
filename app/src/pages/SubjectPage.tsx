import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, BookOpen, Target, Clock, TrendingUp,
  ChevronRight, GraduationCap, Play, Book, ChevronDown, ArrowRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

import {
  getSubjectBySlug,
  fetchTopicsBySubjectId,
  fetchExamConfigBySubjectId,
  fetchSubjectStats,
  fetchSubtopicsByTopicId,
} from '@/data/subjects';
import { useAppStore } from '@/store/useAppStore';
import { useEffect, useState } from 'react';
import { CardRowsSkeleton } from '@/components/Skeletons';
import type { ExamConfig, Topic } from '@/types';

interface Subtopic {
  id: string; topicId: string; name: string; description?: string; order: number; questionsCount: number;
}

export function SubjectPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { setCurrentSubject } = useAppStore();
  
  const subject = slug ? getSubjectBySlug(slug) : undefined;
  const [topics, setTopics] = useState<Topic[]>([]);
  const [examConfig, setExamConfig] = useState<ExamConfig | null>(null);
  const [stats, setStats] = useState(subject?.stats);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedTopics, setExpandedTopics] = useState<Set<string>>(new Set());
  const [subtopicsMap, setSubtopicsMap] = useState<Record<string, Subtopic[]>>({});

  useEffect(() => {
    if (!subject) return;
    setIsLoading(true);
    void Promise.all([
      fetchTopicsBySubjectId(subject.id),
      fetchExamConfigBySubjectId(subject.id),
      fetchSubjectStats(subject.id),
    ]).then(([topicsData, examConfigData, statsData]) => {
      setTopics(topicsData);
      setExamConfig(examConfigData);
      setStats(statsData);
    }).finally(() => setIsLoading(false));
  }, [subject]);
  
  useEffect(() => {
    if (subject) {
      setCurrentSubject(subject);
    }
  }, [subject, setCurrentSubject]);
  
  if (!subject) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">Предмет не найден</h1>
          <p className="text-muted-foreground mb-4">
            К сожалению, такого предмета не существует
          </p>
          <Button onClick={() => navigate('/')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            На главную
          </Button>
        </div>
      </div>
    );
  }
  
  const Icon = subject.icon === 'BookOpen' ? BookOpen : Book;
  
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="container py-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/')}
              className="shrink-0"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex items-center gap-3">
              <div 
                className="w-10 h-10 rounded-xl flex items-center justify-center text-white"
                style={{ background: subject.color }}
              >
                <Icon className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-xl font-bold">{subject.name}</h1>
                <p className="text-sm text-muted-foreground">
                  Подготовка к ЦТ и ЦЭ
                </p>
              </div>
            </div>
          </div>
        </div>
      </header>
      
      <main className="container py-8">
        {/* Stats — compact, informational only (not actions) */}
        <div className="grid grid-cols-3 gap-2 sm:gap-4 mb-6 sm:mb-8">
          <StatCard
            icon={BookOpen}
            value={stats?.questionsCount ?? subject.stats.questionsCount}
            label="Заданий"
            color={subject.color}
          />
          <StatCard
            icon={Target}
            value={stats?.topicsCount ?? subject.stats.topicsCount}
            label="Тем"
            color={subject.color}
          />
          <StatCard
            icon={TrendingUp}
            value={examConfig?.durationMinutes ?? 120}
            label="Минут"
            color={subject.color}
          />
        </div>
        
        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Actions */}
          <div className="lg:col-span-2 space-y-6">
            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Начать подготовку</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Практика — основное действие (заливка цветом предмета) */}
                <motion.button
                  whileHover={{ y: -3 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => navigate(`/practice/${subject.slug}`)}
                  className="group relative overflow-hidden rounded-2xl p-6 text-left text-white shadow-md transition-shadow hover:shadow-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  style={{ background: subject.color }}
                >
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
                      <Target className="w-6 h-6" />
                    </div>
                    <ArrowRight className="w-5 h-5 ml-auto opacity-80 transition-transform group-hover:translate-x-1" />
                  </div>
                  <p className="text-lg font-bold">Практика</p>
                  <p className="text-sm text-white/85">Задания по темам, подсказки и разбор решений</p>
                </motion.button>

                {/* Пробный экзамен — обведён цветом предмета */}
                <motion.button
                  whileHover={{ y: -3 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => navigate(`/exam/${subject.slug}`)}
                  className="group relative overflow-hidden rounded-2xl p-6 text-left bg-card border-2 transition-all hover:shadow-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  style={{ borderColor: subject.color }}
                >
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center text-white" style={{ background: subject.color }}>
                      <Clock className="w-6 h-6" />
                    </div>
                    <ArrowRight className="w-5 h-5 ml-auto transition-transform group-hover:translate-x-1" style={{ color: subject.color }} />
                  </div>
                  <p className="text-lg font-bold">Пробный экзамен</p>
                  <p className="text-sm text-muted-foreground">{examConfig?.durationMinutes || 120} минут · формат ЦТ/ЦЭ</p>
                </motion.button>
              </CardContent>
            </Card>
            
            {/* Topics */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <GraduationCap className="w-5 h-5" />
                  Темы для изучения
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {isLoading ? (
                  <CardRowsSkeleton rows={6} />
                ) : topics.length > 0 ? (
                  topics.map((topic, index) => {
                    const isExpanded = expandedTopics.has(topic.id);
                    const subs = subtopicsMap[topic.id] ?? [];
                    return (
                      <motion.div
                        key={topic.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="border border-border rounded-xl overflow-hidden"
                      >
                        <button
                          type="button"
                          onClick={async () => {
                            const next = new Set(expandedTopics);
                            if (isExpanded) next.delete(topic.id);
                            else {
                              next.add(topic.id);
                              if (!subtopicsMap[topic.id]) {
                                const subData = await fetchSubtopicsByTopicId(topic.id);
                                setSubtopicsMap(prev => ({ ...prev, [topic.id]: subData }));
                              }
                            }
                            setExpandedTopics(next);
                          }}
                          className="w-full p-4 hover:bg-muted/50 transition-all text-left"
                        >
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-2 min-w-0 flex-1">
                              <ChevronDown
                                className={`w-4 h-4 text-muted-foreground shrink-0 transition-transform ${isExpanded ? '' : '-rotate-90'}`}
                              />
                              <h4 className="font-medium truncate">{topic.name}</h4>
                              {(topic.questionsCount ?? 0) > 0 && (
                                <Badge variant="outline" className="text-[10px] shrink-0">{topic.questionsCount}</Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={(e) => { e.stopPropagation(); navigate(`/theory/${subject.slug}/${topic.id}`); }}
                              >
                                <Book className="w-3 h-3 mr-1" />Теория
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={(e) => { e.stopPropagation(); navigate(`/practice/${subject.slug}?topic=${topic.id}`); }}
                              >
                                <Play className="w-3 h-3 mr-1" />Практика
                              </Button>
                            </div>
                          </div>
                          {topic.description && (
                            <p className="text-sm text-muted-foreground pl-6 truncate">{topic.description}</p>
                          )}
                        </button>

                        <AnimatePresence>
                          {isExpanded && subs.length > 0 && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              className="overflow-hidden border-t border-border bg-muted/20"
                            >
                              <div className="p-3 space-y-1">
                                {subs.map(sub => (
                                  <button
                                    key={sub.id}
                                    type="button"
                                    onClick={() => navigate(sub.questionsCount > 0
                                      ? `/practice/${subject.slug}?subtopic=${sub.id}`
                                      : `/practice/${subject.slug}?topic=${topic.id}`)}
                                    className="w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg hover:bg-muted/60 transition-colors text-sm text-left"
                                  >
                                    <span className="truncate">{sub.name}</span>
                                    <div className="flex items-center gap-2 shrink-0">
                                      <span className="text-xs text-muted-foreground">{sub.questionsCount} зад.</span>
                                      <ChevronRight className="w-3 h-3 text-muted-foreground" />
                                    </div>
                                  </button>
                                ))}
                              </div>
                            </motion.div>
                          )}
                          {isExpanded && subs.length === 0 && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              className="overflow-hidden border-t border-border"
                            >
                              <div className="p-3 text-xs text-center text-muted-foreground">
                                Под-темы для этого раздела пока не добавлены
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </motion.div>
                    );
                  })
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <GraduationCap className="w-10 h-10 mx-auto mb-3 opacity-30" />
                    <p className="font-medium">Темы пока в разработке</p>
                    <p className="text-sm mt-1">Скоро здесь появятся материалы по предмету</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
          
          {/* Right Column - Info */}
          <div className="space-y-6">
            {/* Exam Info */}
            {examConfig && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">О экзамене</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Длительность</span>
                    <span className="font-medium">{examConfig.durationMinutes} мин</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Вопросов</span>
                    <span className="font-medium">{examConfig.totalQuestions}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Проходной балл</span>
                    <span className="font-medium">{examConfig.passingScore}</span>
                  </div>
                  
                  <div className="pt-4 border-t border-border">
                    <p className="text-sm font-medium mb-3">Структура:</p>
                    {examConfig.structure.map((part, i) => (
                      <div key={i} className="flex items-center gap-2 text-sm mb-2">
                        <Badge variant="outline" className="text-xs">
                          {part.type}
                        </Badge>
                        <span className="text-muted-foreground">
                          {part.count} заданий × {part.points} балл
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
            
            {/* Блок «Недавние задания» удалён — лишний, отвлекал от навигации */}
          </div>
        </div>
      </main>
    </div>
  );
}

// Named export для lazy loading
export default SubjectPage;

interface StatCardProps {
  icon: React.ComponentType<{ className?: string }>;
  value: string | number;
  label: string;
  color: string;
}

function StatCard({ icon: Icon, value, label, color }: StatCardProps) {
  // Compact, non-interactive info tile: small on mobile (3 across, doesn't fill the
  // screen), a bit larger on desktop. Deliberately not a clickable-looking Card.
  return (
    <div className="flex flex-col items-center gap-1.5 rounded-xl border border-border bg-card px-2 py-3 text-center sm:flex-row sm:gap-3 sm:px-4 sm:py-4 sm:text-left">
      <div
        className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center text-white shrink-0"
        style={{ background: color }}
      >
        <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
      </div>
      <div className="min-w-0">
        <p className="text-base sm:text-2xl font-bold leading-tight tabular-nums">{value}</p>
        <p className="text-[11px] sm:text-sm text-muted-foreground leading-tight">{label}</p>
      </div>
    </div>
  );
}
